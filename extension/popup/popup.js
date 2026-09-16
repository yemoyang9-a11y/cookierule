import { listForUrl, setCookie, removeCookie, identity, originOf, currentTab, hasAllUrls, requestAllUrls } from "../lib/cookies.js";
import { loadState, updateState, toggleProtected, isProtected } from "../lib/storage.js";
import { parseImport, toCookierule, toCookieEditor, toNetscape } from "../lib/formats.js";
import { limits } from "../lib/license.js";
import { CONFIG } from "../lib/config.js";

const $ = (id) => document.getElementById(id);
const rows = $("rows");
const editor = $("editor");
const notice = $("notice");

let tab = null;
let origin = null;
let cookies = [];
let state = null;
let editing = null; // original cookie when editing, null when adding

function fmtExpiry(c) {
  if (c.session) return "Session";
  const d = new Date(c.expirationDate * 1000);
  if (isNaN(d)) return "?";
  return d.toISOString().slice(0, 16).replace("T", " ");
}

function flag(label, on, title) {
  return `<span class="flag ${on ? "on" : ""}" title="${title}">${label}</span>`;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function showNotice(html, actions = []) {
  notice.innerHTML = html;
  for (const a of actions) {
    const b = document.createElement("button");
    b.textContent = a.label;
    b.addEventListener("click", a.onClick);
    notice.appendChild(b);
  }
  notice.hidden = false;
}

function render() {
  const q = $("search").value.trim().toLowerCase();
  const list = q ? cookies.filter((c) => c.name.toLowerCase().includes(q) || c.value.toLowerCase().includes(q)) : cookies;
  rows.innerHTML = list.map((c, i) => {
    const key = identity(c);
    const prot = isProtected(state, key);
    const ss = c.sameSite === "no_restriction" ? "None" : c.sameSite === "unspecified" ? "" : c.sameSite[0].toUpperCase() + c.sameSite.slice(1);
    return `<tr data-i="${cookies.indexOf(c)}" class="${prot ? "protected" : ""}">
      <td class="c-prot"><span class="prot ${prot ? "on" : ""}" title="${prot ? "Protected: survives Delete all" : "Protect this cookie"}">🛡</span></td>
      <td class="name" title="${esc(c.name)}">${esc(c.name)}</td>
      <td class="value" title="Click to copy">${esc(c.value)}</td>
      <td class="c-domain" title="${esc(c.domain)}${c.hostOnly ? " (host only)" : ""}">${esc(c.domain)}</td>
      <td class="c-flags">${flag("S", c.secure, "Secure")}${flag("H", c.httpOnly, "HttpOnly")}${ss ? flag(ss, true, "SameSite") : ""}${c.partitionKey ? flag("P", true, "Partitioned (CHIPS)") : ""}</td>
      <td class="c-exp">${fmtExpiry(c)}</td>
      <td class="act"><button data-act="edit">Edit</button><button data-act="del" class="danger">✕</button></td>
    </tr>`;
  }).join("");
  $("empty").hidden = list.length > 0;
  $("count").textContent = `${cookies.length} cookie${cookies.length === 1 ? "" : "s"}${q ? ` (${list.length} shown)` : ""}`;
}

async function reload() {
  state = await loadState();
  tab = await currentTab();
  origin = tab?.url ? originOf(tab.url) : null;
  $("site").textContent = origin ? origin.host : "(no site)";
  if (!origin) {
    cookies = [];
    render();
    showNotice("Open a http(s) page to see its cookies.");
    return;
  }
  try {
    cookies = await listForUrl(tab.url);
    notice.hidden = true;
    // activeTab should grant this origin after the toolbar click. If the list
    // is empty and we hold no host permission at all, the grant did not cover
    // the cookies API on this browser: offer the optional permission instead.
    if (!cookies.length && !(await hasAllUrls())) {
      let hasOrigin = false;
      try { hasOrigin = await chrome.permissions.contains({ origins: [origin.url] }); } catch { /* ignore */ }
      if (!hasOrigin) showNotice("Cookierule needs permission to read this site's cookies.", [
        { label: "Allow all sites", onClick: async () => { if (await requestAllUrls()) reload(); } }
      ]);
    }
  } catch (e) {
    cookies = [];
    showNotice(`Could not read cookies: ${esc(e.message || e)}`);
  }
  render();
}

function openEditor(c) {
  editing = c || null;
  const f = editor.elements;
  f.name.value = c?.name || "";
  f.value.value = c?.value || "";
  f.domain.value = c?.domain || (origin ? origin.host : "");
  f.path.value = c?.path || "/";
  f.sameSite.value = c?.sameSite || "unspecified";
  f.secure.checked = c ? c.secure : origin?.url.startsWith("https");
  f.httpOnly.checked = c ? c.httpOnly : false;
  f.hostOnly.checked = c ? c.hostOnly : true;
  if (c && !c.session && c.expirationDate) {
    const d = new Date(c.expirationDate * 1000);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    f.expires.value = d.toISOString().slice(0, 16);
  } else f.expires.value = "";
  $("err").textContent = "";
  f.name.disabled = false;
  editor.hidden = false;
  f.name.focus();
}

function closeEditor() {
  editor.hidden = true;
  editing = null;
}

editor.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const f = editor.elements;
  const c = {
    name: f.name.value.trim(),
    value: f.value.value,
    domain: f.domain.value.trim() || (origin ? origin.host : ""),
    path: f.path.value.trim() || "/",
    sameSite: f.sameSite.value,
    secure: f.secure.checked,
    httpOnly: f.httpOnly.checked,
    hostOnly: f.hostOnly.checked,
    session: !f.expires.value,
    expirationDate: f.expires.value ? Math.floor(new Date(f.expires.value).getTime() / 1000) : null,
    storeId: editing?.storeId || null,
    partitionKey: editing?.partitionKey || null,
    firstPartyDomain: editing?.firstPartyDomain || null
  };
  if (c.sameSite === "no_restriction" && !c.secure) {
    $("err").textContent = "SameSite=None requires Secure.";
    return;
  }
  try {
    // Renaming or moving a cookie = remove old + set new.
    if (editing && identity(editing) !== identity(c)) await removeCookie(editing);
    await setCookie(c);
    closeEditor();
    await reload();
  } catch (e) {
    $("err").textContent = e.message || String(e);
  }
});

$("cancel").addEventListener("click", closeEditor);
$("add").addEventListener("click", () => openEditor(null));
$("refresh").addEventListener("click", reload);
$("search").addEventListener("input", render);
$("options").addEventListener("click", () => chrome.runtime.openOptionsPage());

rows.addEventListener("click", async (ev) => {
  const tr = ev.target.closest("tr");
  if (!tr) return;
  const c = cookies[Number(tr.dataset.i)];
  if (!c) return;
  if (ev.target.classList.contains("prot")) {
    state = await updateState((s) => toggleProtected(s, identity(c)));
    render();
    return;
  }
  if (ev.target.classList.contains("value")) {
    await navigator.clipboard.writeText(c.value);
    ev.target.title = "Copied";
    return;
  }
  const act = ev.target.dataset.act;
  if (act === "edit") openEditor(c);
  if (act === "del") {
    if (state.settings.confirmDelete && !confirm(`Delete cookie "${c.name}"?`)) return;
    await removeCookie(c);
    await reload();
  }
});

$("deleteAll").addEventListener("click", async () => {
  const victims = cookies.filter((c) => !isProtected(state, identity(c)));
  const kept = cookies.length - victims.length;
  if (!victims.length) return showNotice("Nothing to delete: every cookie here is protected.");
  if (!confirm(`Delete ${victims.length} cookie(s) for ${origin.host}?${kept ? ` ${kept} protected cookie(s) will be kept.` : ""}`)) return;
  for (const c of victims) await removeCookie(c);
  await reload();
});

// ---- Import / export ----
$("import").addEventListener("click", () => $("file").click());
$("file").addEventListener("change", async () => {
  const file = $("file").files[0];
  if (!file) return;
  const text = await file.text();
  $("file").value = "";
  let parsed;
  try { parsed = parseImport(text); } catch (e) { return showNotice(esc(e.message)); }
  const failures = [];
  for (const c of parsed.cookies) {
    try { await setCookie(c); } catch (e) { failures.push(`${c.name}: ${e.message}`); }
  }
  await reload();
  showNotice(`Imported ${parsed.cookies.length - failures.length} of ${parsed.cookies.length} cookies (${parsed.format}).${failures.length ? " Failed: " + esc(failures.slice(0, 3).join("; ")) : ""}`);
});

function download(name, text, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$("export").addEventListener("click", (ev) => {
  ev.stopPropagation();
  $("exportMenu").hidden = !$("exportMenu").hidden;
});
document.addEventListener("click", () => { $("exportMenu").hidden = true; });
$("exportMenu").addEventListener("click", (ev) => {
  const fmt = ev.target.closest("button")?.dataset.fmt;
  if (!fmt) return;
  const host = origin?.host || "cookies";
  const stamp = new Date().toISOString().slice(0, 10);
  if (fmt === "cookierule") download(`${host}-${stamp}.cookierule.json`, toCookierule(cookies, { site: host }));
  if (fmt === "cookie-editor") download(`${host}-${stamp}.json`, toCookieEditor(cookies));
  if (fmt === "netscape") {
    if (!limits(state.license).allowNetscapeExport) {
      return showNotice(`cookies.txt export is a Pro feature ($9 one-time; bundle with Headrule $15).`, [
        { label: "Get Pro", onClick: () => chrome.tabs.create({ url: CONFIG.buyUrl }) },
        { label: "Enter key", onClick: () => chrome.runtime.openOptionsPage() }
      ]);
    }
    download(`${host}-${stamp}.cookies.txt`, toNetscape(cookies), "text/plain");
  }
});

document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape" && !editor.hidden) closeEditor();
  if ((ev.ctrlKey || ev.metaKey) && ev.key === "f") { ev.preventDefault(); $("search").focus(); }
});

reload();
