// Import / export formats. Pure functions, no browser APIs, so they run in
// node tests. Every parser returns an array of normalized cookies (the same
// shape as lib/cookies.js `normalize`).
//
// Supported:
//   - Cookierule JSON      { "cookierule": 1, "cookies": [ ...normalized ] }
//   - Cookie-Editor JSON   [ { name, value, domain, hostOnly, path, secure,
//                              httpOnly, sameSite, session, expirationDate,
//                              storeId } ]  (sameSite: "no_restriction" |
//                              "lax" | "strict" | "unspecified" | "None" ...)
//   - EditThisCookie JSON  [ { domain, expirationDate, hostOnly, httpOnly,
//                              name, path, sameSite, secure, session, storeId,
//                              value, id } ]
//   - Netscape cookies.txt (# HTTP Cookie File / curl / wget / yt-dlp)

const SS_MAP = {
  no_restriction: "no_restriction", none: "no_restriction", "no restriction": "no_restriction",
  lax: "lax", strict: "strict", unspecified: "unspecified", "": "unspecified", null: "unspecified"
};

function sameSite(v) {
  if (v == null) return "unspecified";
  return SS_MAP[String(v).toLowerCase()] || "unspecified";
}

function fromGeneric(c) {
  const session = c.session === true || c.expirationDate == null;
  const domain = String(c.domain || "");
  return {
    name: String(c.name ?? ""),
    value: String(c.value ?? ""),
    domain,
    hostOnly: typeof c.hostOnly === "boolean" ? c.hostOnly : !domain.startsWith("."),
    path: c.path || "/",
    secure: !!c.secure,
    httpOnly: !!c.httpOnly,
    sameSite: sameSite(c.sameSite),
    session,
    expirationDate: session ? null : Number(c.expirationDate),
    storeId: c.storeId ?? null,
    partitionKey: c.partitionKey ?? null,
    firstPartyDomain: c.firstPartyDomain ?? null
  };
}

export function detectFormat(text) {
  const t = text.trim();
  if (!t) return null;
  if (t.startsWith("{") || t.startsWith("[")) {
    let data;
    try { data = JSON.parse(t); } catch { return null; }
    if (data && typeof data === "object" && !Array.isArray(data) && data.cookierule) return "cookierule";
    if (Array.isArray(data)) {
      if (data.length === 0) return "cookie-editor";
      const s = data[0];
      if (s && typeof s === "object" && "id" in s && "session" in s) return "editthiscookie";
      return "cookie-editor";
    }
    return null;
  }
  if (/^#\s*(HTTP Cookie File|Netscape HTTP Cookie File)/i.test(t) || /^\S+\t(TRUE|FALSE)\t\S*\t(TRUE|FALSE)\t\d+\t/m.test(t)) return "netscape";
  return null;
}

export function parseNetscape(text) {
  const out = [];
  for (const raw of text.split(/\r?\n/)) {
    let line = raw;
    let httpOnly = false;
    if (line.startsWith("#HttpOnly_")) { httpOnly = true; line = line.slice("#HttpOnly_".length); }
    else if (!line.trim() || line.startsWith("#")) continue;
    const f = line.split("\t");
    if (f.length < 7) continue;
    const [domain, includeSub, path, secure, expires, name, ...rest] = f;
    const value = rest.join("\t");
    const exp = Number(expires);
    const session = !exp;
    out.push({
      name, value, domain,
      hostOnly: String(includeSub).toUpperCase() !== "TRUE",
      path: path || "/",
      secure: String(secure).toUpperCase() === "TRUE",
      httpOnly,
      sameSite: "unspecified",
      session,
      expirationDate: session ? null : exp,
      storeId: null, partitionKey: null, firstPartyDomain: null
    });
  }
  return out;
}

export function parseImport(text) {
  const fmt = detectFormat(text);
  if (!fmt) throw new Error("Unrecognised file. Expected Cookierule, Cookie-Editor or EditThisCookie JSON, or a Netscape cookies.txt.");
  if (fmt === "netscape") return { format: fmt, cookies: parseNetscape(text) };
  const data = JSON.parse(text);
  const list = fmt === "cookierule" ? data.cookies : data;
  if (!Array.isArray(list)) throw new Error("File has no cookie list.");
  const cookies = list.filter((c) => c && typeof c === "object" && c.name != null).map(fromGeneric);
  return { format: fmt, cookies };
}

export function toCookierule(cookies, meta = {}) {
  return JSON.stringify({ cookierule: 1, exportedAt: new Date().toISOString(), ...meta, cookies }, null, 2);
}

// Cookie-Editor compatible array (also readable by EditThisCookie importers).
export function toCookieEditor(cookies) {
  return JSON.stringify(cookies.map((c) => ({
    name: c.name, value: c.value, domain: c.domain, hostOnly: c.hostOnly, path: c.path,
    secure: c.secure, httpOnly: c.httpOnly, sameSite: c.sameSite, session: c.session,
    ...(c.session ? {} : { expirationDate: c.expirationDate }),
    storeId: c.storeId ?? "0"
  })), null, 2);
}

export function toNetscape(cookies) {
  const lines = ["# Netscape HTTP Cookie File", "# https://curl.se/docs/http-cookies.html", "# Exported by Cookierule", ""];
  for (const c of cookies) {
    const domain = c.hostOnly ? c.domain.replace(/^\./, "") : (c.domain.startsWith(".") ? c.domain : "." + c.domain);
    const includeSub = c.hostOnly ? "FALSE" : "TRUE";
    const exp = c.session || c.expirationDate == null ? 0 : Math.floor(c.expirationDate);
    const prefix = c.httpOnly ? "#HttpOnly_" : "";
    lines.push(`${prefix}${domain}\t${includeSub}\t${c.path || "/"}\t${c.secure ? "TRUE" : "FALSE"}\t${exp}\t${c.name}\t${c.value}`);
  }
  return lines.join("\n") + "\n";
}
