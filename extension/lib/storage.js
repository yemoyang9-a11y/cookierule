// All state lives in chrome.storage.local. Pro users may mirror profiles into
// chrome.storage.sync (week 3; chunked because sync caps items at 8 KB).

export const SCHEMA_VERSION = 1;

const api = globalThis.browser?.storage ? globalThis.browser : globalThis.chrome;

export function uid(prefix = "p") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function defaultState() {
  return {
    version: SCHEMA_VERSION,
    // Protected cookies survive "delete all". Key = `${name}|${domain}|${path}`.
    protectedKeys: [],
    // Pro: named cookie sets per site. { id, name, site, cookies: [], updatedAt }
    profiles: [],
    settings: { syncEnabled: false, showFlags: true, confirmDelete: true },
    license: null
  };
}

export async function loadState() {
  const data = await api.storage.local.get("state");
  if (!data.state) {
    const state = defaultState();
    await api.storage.local.set({ state });
    return state;
  }
  return migrate(data.state);
}

export async function saveState(state) {
  await api.storage.local.set({ state });
}

export async function updateState(mutator) {
  const state = await loadState();
  const next = (await mutator(state)) || state;
  await saveState(next);
  return next;
}

function migrate(state) {
  const def = defaultState();
  if (!state.version) state.version = 1;
  if (!Array.isArray(state.protectedKeys)) state.protectedKeys = [];
  if (!Array.isArray(state.profiles)) state.profiles = [];
  state.settings = { ...def.settings, ...(state.settings || {}) };
  if (state.license === undefined) state.license = null;
  return state;
}

export function isProtected(state, key) {
  return state.protectedKeys.includes(key);
}

export function toggleProtected(state, key) {
  const i = state.protectedKeys.indexOf(key);
  if (i >= 0) state.protectedKeys.splice(i, 1);
  else state.protectedKeys.push(key);
  return state;
}
