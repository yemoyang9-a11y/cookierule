// Lemon Squeezy license handling (copied from Headrule; keep in sync). The License API is public (no API key),
// rate limited to 60 req/min, and only accepts keys from the matching store.
import { CONFIG } from "./config.js";

const DAY = 24 * 60 * 60 * 1000;

function form(params) {
  return new URLSearchParams(params).toString();
}

async function post(path, params) {
  const res = await fetch(`${CONFIG.lemonSqueezy.apiBase}/${path}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: form(params)
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON error body */ }
  if (!data) throw new Error(`License server returned ${res.status}`);
  return data;
}

function ownershipOk(meta) {
  const { storeId, productId } = CONFIG.lemonSqueezy;
  if (storeId && Number(meta?.store_id) !== Number(storeId)) return false;
  if (productId && Number(meta?.product_id) !== Number(productId)) return false;
  return true;
}

function instanceName() {
  const ua = navigator.userAgent || "";
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Browser";
  return `${CONFIG.productName} on ${os} ${Math.random().toString(36).slice(2, 8)}`;
}

export async function activateLicense(key) {
  const k = (key || "").trim();
  if (!k) throw new Error("Enter your license key");
  const data = await post("activate", { license_key: k, instance_name: instanceName() });
  if (!data.activated) throw new Error(data.error || "Activation failed");
  if (!ownershipOk(data.meta)) throw new Error("This key belongs to a different product");
  return {
    key: k,
    instanceId: data.instance?.id || null,
    status: data.license_key?.status || "active",
    email: data.meta?.customer_email || null,
    activatedAt: Date.now(),
    validatedAt: Date.now()
  };
}

export async function validateLicense(license) {
  const params = { license_key: license.key };
  if (license.instanceId) params.instance_id = license.instanceId;
  const data = await post("validate", params);
  return { valid: !!data.valid && ownershipOk(data.meta), status: data.license_key?.status || "unknown", error: data.error || null };
}

export async function deactivateLicense(license) {
  if (!license?.instanceId) return true;
  try {
    const data = await post("deactivate", { license_key: license.key, instance_id: license.instanceId });
    return !!data.deactivated;
  } catch {
    return false;
  }
}

// Pro is on when a license exists, its last known status is active, and it
// was validated within the offline grace window.
export function isPro(license) {
  if (!license || !license.key) return false;
  if (license.status !== "active") return false;
  const age = Date.now() - (license.validatedAt || 0);
  return age < CONFIG.licenseOfflineGraceDays * DAY;
}

export function needsRecheck(license) {
  if (!license || !license.key) return false;
  return Date.now() - (license.validatedAt || 0) > CONFIG.licenseRecheckDays * DAY;
}

export function limits(license) {
  const pro = isPro(license);
  return {
    pro,
    allowProfiles: pro || CONFIG.free.allowProfiles,
    allowSync: pro || CONFIG.free.allowSync,
    allowNetscapeExport: pro || CONFIG.free.allowNetscapeExport,
    allowAllSitesBulk: pro || CONFIG.free.allowAllSitesBulk
  };
}
