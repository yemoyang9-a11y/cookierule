// Thin wrapper over chrome.cookies / browser.cookies.
//
// Design notes
// - Chrome and Firefox both expose the API as `chrome.cookies` in MV3, but
//   Firefox adds `firstPartyDomain` / `partitionKey` semantics. We normalise
//   every cookie into a plain object (see `normalize`) so the UI and the
//   import/export code never touch browser-specific fields directly.
// - `chrome.cookies.set` needs a `url`; we rebuild it from the cookie's own
//   domain/path/secure so callers only pass the cookie object.
// - Host permission: reading cookies for a URL requires host permission for
//   that URL. `activeTab` grants it for the current tab after the user clicks
//   the toolbar icon, which is exactly when the popup opens. The "all sites"
//   features require the optional `<all_urls>` grant (see `hasAllUrls`).

const api = globalThis.browser?.cookies ? globalThis.browser : globalThis.chrome;
export const IS_FIREFOX = typeof globalThis.browser !== "undefined" && /Firefox/.test(navigator.userAgent || "");

export const SAME_SITE = ["no_restriction", "lax", "strict", "unspecified"];

export function normalize(c) {
  return {
    name: c.name,
    value: c.value ?? "",
    domain: c.domain ?? "",
    hostOnly: !!c.hostOnly,
    path: c.path || "/",
    secure: !!c.secure,
    httpOnly: !!c.httpOnly,
    sameSite: c.sameSite || "unspecified",
    session: !!c.session,
    // seconds since epoch, or null for session cookies
    expirationDate: c.session || c.expirationDate == null ? null : Number(c.expirationDate),
    storeId: c.storeId ?? null,
    partitionKey: c.partitionKey ?? null,
    firstPartyDomain: c.firstPartyDomain ?? null
  };
}

export function cookieUrl(c) {
  const host = (c.domain || "").replace(/^\./, "");
  const proto = c.secure ? "https" : "http";
  return `${proto}://${host}${c.path || "/"}`;
}

export function originOf(url) {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return null;
    return { host: u.hostname, url: `${u.protocol}//${u.host}/` };
  } catch {
    return null;
  }
}

// Base query shared by getAll calls. In Firefox with first-party isolation
// enabled, getAll requires firstPartyDomain; passing null means "all".
function baseQuery(extra = {}) {
  const q = { ...extra };
  if (IS_FIREFOX) q.firstPartyDomain = null;
  return q;
}

export async function listForUrl(url) {
  const cookies = await api.cookies.getAll(baseQuery({ url }));
  // Partitioned (CHIPS) cookies are not returned unless partitionKey is set.
  let partitioned = [];
  try {
    const o = originOf(url);
    if (o) partitioned = await api.cookies.getAll(baseQuery({ url, partitionKey: { topLevelSite: `https://${o.host}` } }));
  } catch { /* older browsers */ }
  const seen = new Set();
  const out = [];
  for (const c of [...cookies, ...partitioned]) {
    const key = `${c.name}|${c.domain}|${c.path}|${JSON.stringify(c.partitionKey || null)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalize(c));
  }
  return out.sort((a, b) => a.name.localeCompare(b.name) || a.domain.localeCompare(b.domain));
}

export async function listAll() {
  const cookies = await api.cookies.getAll(baseQuery({}));
  return cookies.map(normalize);
}

export async function setCookie(c) {
  const details = {
    url: cookieUrl(c),
    name: c.name,
    value: c.value ?? "",
    path: c.path || "/",
    secure: !!c.secure,
    httpOnly: !!c.httpOnly
  };
  // hostOnly cookies must NOT pass `domain` (Chrome would prefix a dot).
  if (!c.hostOnly && c.domain) details.domain = c.domain;
  if (c.sameSite && c.sameSite !== "unspecified") details.sameSite = c.sameSite;
  if (c.expirationDate != null && !c.session) details.expirationDate = Math.floor(Number(c.expirationDate));
  if (c.storeId) details.storeId = c.storeId;
  if (c.partitionKey) details.partitionKey = c.partitionKey;
  if (IS_FIREFOX && c.firstPartyDomain) details.firstPartyDomain = c.firstPartyDomain;
  const res = await api.cookies.set(details);
  if (!res) throw new Error(api.runtime?.lastError?.message || `Could not set cookie "${c.name}"`);
  return normalize(res);
}

export async function removeCookie(c) {
  const details = { url: cookieUrl(c), name: c.name };
  if (c.storeId) details.storeId = c.storeId;
  if (c.partitionKey) details.partitionKey = c.partitionKey;
  if (IS_FIREFOX && c.firstPartyDomain) details.firstPartyDomain = c.firstPartyDomain;
  return api.cookies.remove(details);
}

export function identity(c) {
  return `${c.name}|${c.domain}|${c.path}`;
}

export async function hasAllUrls() {
  try {
    return await api.permissions.contains({ origins: ["<all_urls>"] });
  } catch {
    return false;
  }
}

export async function requestAllUrls() {
  return api.permissions.request({ origins: ["<all_urls>"] });
}

export async function currentTab() {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}
