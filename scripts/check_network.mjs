// Fails the build if any file outside lib/license.js uses fetch/XMLHttpRequest/
// WebSocket. "No network calls except the license check" is a selling point;
// this keeps it true mechanically.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const EXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "extension");
const bad = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(js|html)$/.test(e.name) && !p.endsWith(path.join("lib", "license.js"))) {
      const src = fs.readFileSync(p, "utf8");
      if (/\b(fetch|XMLHttpRequest|WebSocket|sendBeacon)\s*\(/.test(src)) bad.push(path.relative(EXT, p));
    }
  }
})(EXT);
if (bad.length) { console.error("Network call outside license.js:", bad.join(", ")); process.exit(1); }
console.log("ok - no network calls outside lib/license.js");
