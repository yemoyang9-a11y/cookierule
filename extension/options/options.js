import { loadState, saveState } from "../lib/storage.js";
import { activateLicense, deactivateLicense, validateLicense, limits } from "../lib/license.js";
import { hasAllUrls, requestAllUrls } from "../lib/cookies.js";
import { CONFIG } from "../lib/config.js";

const $ = (id) => document.getElementById(id);
let state = null;

function setMsg(el, text, ok = false) {
  el.textContent = text;
  el.className = `statusline${ok ? " ok" : ""}`;
}

async function render() {
  const lim = limits(state.license);
  $("version").textContent = `v${chrome.runtime.getManifest().version}`;
  $("buyLink").href = CONFIG.buyUrl;
  $("siteLink").href = CONFIG.siteUrl;
  $("privacyLink").href = `${CONFIG.siteUrl}privacy.html`;
  $("supportLink").href = `mailto:${CONFIG.supportEmail}`;
  $("licenseFree").hidden = lim.pro;
  $("licensePro").hidden = !lim.pro;
  if (lim.pro) setMsg($("licenseStatus"), `Pro active${state.license.email ? ` · ${state.license.email}` : ""}`, true);
  else if (state.license?.key) setMsg($("licenseStatus"), `License ${state.license.status}. Re-enter or contact support.`);
  else setMsg($("licenseStatus"), "Free plan");
  $("profilesPill").classList.toggle("off", lim.allowProfiles);
  $("confirmDelete").checked = state.settings.confirmDelete !== false;

  const all = await hasAllUrls();
  setMsg($("allUrlsStatus"), all ? "All sites: granted" : "All sites: not granted (current tab only)", all);
  $("grantAllUrls").hidden = all;
  $("revokeAllUrls").hidden = !all;

  $("protectedList").innerHTML = state.protectedKeys.length
    ? state.protectedKeys.map((k) => {
        const [name, domain, path] = k.split("|");
        return `<li><code>${name}</code> <span class="muted">${domain}${path}</span> <button data-key="${k}">Remove</button></li>`;
      }).join("")
    : `<li class="muted">None yet.</li>`;
}

$("activateBtn").addEventListener("click", async () => {
  const btn = $("activateBtn"), err = $("licenseError");
  err.hidden = true; btn.disabled = true; btn.textContent = "Activating…";
  try {
    state.license = await activateLicense($("licenseKey").value);
    await saveState(state);
    await render();
  } catch (e) {
    err.textContent = e.message || String(e); err.hidden = false;
  } finally { btn.disabled = false; btn.textContent = "Activate"; }
});

$("validateBtn").addEventListener("click", async () => {
  try {
    const res = await validateLicense(state.license);
    state.license.status = res.valid ? "active" : res.status || "invalid";
    state.license.validatedAt = Date.now();
    await saveState(state); await render();
  } catch (e) { setMsg($("licenseStatus"), `Check failed: ${e.message}`); }
});

$("deactivateBtn").addEventListener("click", async () => {
  await deactivateLicense(state.license);
  state.license = null;
  await saveState(state); await render();
});

$("grantAllUrls").addEventListener("click", async () => { await requestAllUrls(); await render(); });
$("revokeAllUrls").addEventListener("click", async () => {
  try { await chrome.permissions.remove({ origins: ["<all_urls>"] }); } catch { /* ignore */ }
  await render();
});

$("protectedList").addEventListener("click", async (ev) => {
  const key = ev.target.dataset.key;
  if (!key) return;
  state.protectedKeys = state.protectedKeys.filter((k) => k !== key);
  await saveState(state); await render();
});

$("confirmDelete").addEventListener("change", async () => {
  state.settings.confirmDelete = $("confirmDelete").checked;
  await saveState(state);
});

state = await loadState();
await render();
