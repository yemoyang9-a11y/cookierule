// Build dist/cookierule-<version>-{chrome,edge,firefox}.zip from extension/.
// Chrome and Edge share one package. Firefox gets a patched manifest:
// background.scripts instead of service_worker, gecko id, no minimum_chrome_version.
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXT = path.join(ROOT, "extension");
const DIST = path.join(ROOT, "dist");
const manifest = JSON.parse(fs.readFileSync(path.join(EXT, "manifest.json"), "utf8"));
fs.mkdirSync(DIST, { recursive: true });

function zip(srcDir, out) {
  if (fs.existsSync(out)) fs.unlinkSync(out);
  execSync(`cd "${srcDir}" && zip -qr "${out}" . -x ".*" -x "__MACOSX/*"`, { stdio: "inherit" });
  console.log(`built ${path.relative(ROOT, out)} (${(fs.statSync(out).size / 1024).toFixed(1)} KB)`);
}

// Chrome + Edge
for (const target of ["chrome", "edge"]) zip(EXT, path.join(DIST, `cookierule-${manifest.version}-${target}.zip`));

// Firefox
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cookierule-ff-"));
fs.cpSync(EXT, tmp, { recursive: true });
const ff = { ...manifest };
delete ff.minimum_chrome_version;
ff.background = { scripts: ["background.js"], type: "module" };
ff.browser_specific_settings = { gecko: { id: "cookierule@headrule.com", strict_min_version: "128.0" } };
fs.writeFileSync(path.join(tmp, "manifest.json"), JSON.stringify(ff, null, 2));
zip(tmp, path.join(DIST, `cookierule-${manifest.version}-firefox.zip`));
fs.rmSync(tmp, { recursive: true, force: true });
