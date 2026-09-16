// E2E smoke test: loads the unpacked extension in Chromium and checks that it
// installs, initialises storage, and that the popup renders. Also takes raw
// screenshots with --shots.
//
// IMPORTANT limitation: Playwright cannot click the real toolbar icon, so the
// activeTab grant cannot be exercised here. The "does activeTab cover the
// cookies API" question (PLAN.md, week 1) must be checked by hand once:
// load the unpacked extension, open any https site, click the icon, and see
// whether cookies list without granting "all sites".
//
// Usage: node test/smoke.mjs [--shots]   (needs: npm i && npx playwright install chromium)
import { chromium } from "playwright";
import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXT = path.join(ROOT, "extension");
const SHOTS = process.argv.includes("--shots");

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
  console.log(`  ok - ${msg}`);
}

const server = http.createServer((req, res) => {
  res.setHeader("Set-Cookie", ["sid=abc123; Path=/; HttpOnly", "theme=dark; Path=/"]);
  res.setHeader("Content-Type", "text/html");
  res.end("<!doctype html><title>cookie test</title><h1>cookies set</h1>");
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "cookierule-"));
const context = await chromium.launchPersistentContext(userDataDir, {
  channel: "chromium", headless: true,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  viewport: { width: 1280, height: 800 }, deviceScaleFactor: SHOTS ? 3 : 1
});

try {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent("serviceworker", { timeout: 15000 });
  const extId = new URL(sw.url()).host;
  console.log(`extension loaded: ${extId}`);

  const site = await context.newPage();
  await site.goto(`${base}/`);

  const options = await context.newPage();
  await options.goto(`chrome-extension://${extId}/options/options.html`);
  await options.waitForTimeout(300);
  const st = await options.evaluate(async () => (await chrome.storage.local.get("state")).state);
  assert(st && Array.isArray(st.protectedKeys), "storage initialised with schema");

  // Without any host permission the cookies API must return nothing for the
  // test site (this is the boundary activeTab is expected to lift on click).
  const noPerm = await options.evaluate(async (u) => (await chrome.cookies.getAll({ url: u })).length, base);
  assert(noPerm === 0, "no host permission => no cookies visible (expected boundary)");

  const fmt = await options.evaluate(async () => {
    const m = await import(chrome.runtime.getURL("lib/formats.js"));
    return m.detectFormat('[{"name":"a","value":"1","domain":"x.com","id":1,"session":true}]');
  });
  assert(fmt === "editthiscookie", "format module loads inside the extension");

  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extId}/popup/popup.html`);
  await popup.waitForTimeout(500);
  const txt = await popup.textContent("body");
  assert(/Cookierule/.test(txt), "popup renders");

  if (SHOTS) {
    await popup.setViewportSize({ width: 720, height: 420 });
    await popup.screenshot({ path: path.join(ROOT, "store", "raw-popup.png") });
    await options.setViewportSize({ width: 900, height: 1000 });
    await options.screenshot({ path: path.join(ROOT, "store", "raw-options.png"), fullPage: true });
    console.log("raw screenshots written to store/");
  }
  console.log("\nALL CHECKS PASSED");
} finally {
  await context.close();
  server.close();
  fs.rmSync(userDataDir, { recursive: true, force: true });
}
