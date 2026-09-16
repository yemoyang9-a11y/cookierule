// Service worker. Cookierule has no content scripts and no network traffic
// except the optional license check. The only job here is periodic license
// re-validation and keeping storage initialised.
import { loadState, updateState } from "./lib/storage.js";
import { validateLicense, needsRecheck } from "./lib/license.js";

const RECHECK_ALARM = "license-recheck";

chrome.runtime.onInstalled.addListener(async () => {
  await loadState();
  chrome.alarms.create(RECHECK_ALARM, { periodInMinutes: 60 * 24 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== RECHECK_ALARM) return;
  const state = await loadState();
  if (!needsRecheck(state.license)) return;
  try {
    const res = await validateLicense(state.license);
    await updateState((s) => {
      if (!s.license) return s;
      s.license.status = res.valid ? "active" : res.status || "invalid";
      s.license.validatedAt = Date.now();
      return s;
    });
  } catch {
    // Offline: keep the last known status; isPro() enforces the grace window.
  }
});
