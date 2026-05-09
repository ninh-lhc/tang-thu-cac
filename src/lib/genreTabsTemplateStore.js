const STORAGE_KEY = 'ttc_genre_tabs_templates_v1';
let runtimeStoreGet = null;
let runtimeStoreSet = null;

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function cloneValue(value) {
  try {
    return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function sanitizeStore(store) {
  if (!store || typeof store !== 'object' || Array.isArray(store)) return {};
  const out = {};
  Object.entries(store).forEach(([key, value]) => {
    if (!key || !value || typeof value !== 'object') return;
    const tabsConfig = Array.isArray(value.tabsConfig) ? cloneValue(value.tabsConfig) : [];
    if (tabsConfig.length === 0) return;
    const genres = Array.isArray(value.genres)
      ? value.genres.map((x) => String(x || '').trim()).filter(Boolean)
      : String(key || '')
        .split('||')
        .map((x) => x.trim())
        .filter(Boolean);
    out[key] = {
      genres,
      tabsConfig,
      updatedAt: String(value.updatedAt || ''),
    };
  });
  return out;
}

function normalizeGenreLabel(value = '') {
  return String(value || '').trim();
}

export function buildGenreTemplateKey(genres = []) {
  const normalized = (Array.isArray(genres) ? genres : [genres])
    .map((item) => normalizeGenreLabel(item))
    .filter(Boolean);
  if (normalized.length === 0) return '';
  const deduped = Array.from(new Set(normalized));
  deduped.sort((a, b) => a.localeCompare(b, 'vi'));
  return deduped.join('||');
}

function readStore() {
  let runtimeStore = null;
  if (typeof runtimeStoreGet === 'function') {
    try {
      const external = runtimeStoreGet();
      if (external && typeof external === 'object') runtimeStore = sanitizeStore(external);
    } catch {
      /* fallback localStorage */
    }
  }
  if (runtimeStore && Object.keys(runtimeStore).length > 0) return runtimeStore;
  if (typeof localStorage === 'undefined') return runtimeStore || {};
  const localStore = sanitizeStore(safeJsonParse(localStorage.getItem(STORAGE_KEY) || '{}', {}));
  if (
    runtimeStore &&
    Object.keys(runtimeStore).length === 0 &&
    Object.keys(localStore).length > 0 &&
    typeof runtimeStoreSet === 'function'
  ) {
    try {
      runtimeStoreSet(localStore);
    } catch {
      /* ignore migration write failure */
    }
  }
  return Object.keys(localStore).length > 0 ? localStore : runtimeStore || {};
}

function writeStore(nextStore) {
  const sanitized = sanitizeStore(nextStore);
  if (typeof runtimeStoreSet === 'function') {
    try {
      runtimeStoreSet(sanitized);
    } catch {
      /* fallback localStorage only */
    }
  }
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
}

export function configureGenreTabsTemplateStore({ getStore, setStore } = {}) {
  runtimeStoreGet = typeof getStore === 'function' ? getStore : null;
  runtimeStoreSet = typeof setStore === 'function' ? setStore : null;
}

/** Gộp mẫu trong localStorage vào bản đã có trên index (ưu tiên bản `updatedAt` mới hơn). Dùng khi khởi động để đưa dữ liệu cũ domain-local vào index.json. */
export function mergeGenreTabsTemplatesFromLocalStorage(indexTemplates = {}) {
  const base = sanitizeStore(indexTemplates);
  if (typeof localStorage === 'undefined') return { next: base, changed: false };
  const local = sanitizeStore(safeJsonParse(localStorage.getItem(STORAGE_KEY) || '{}', {}));
  if (Object.keys(local).length === 0) return { next: base, changed: false };

  const next = { ...base };
  let changed = false;
  const ts = (rec) => String(rec?.updatedAt || '');

  Object.entries(local).forEach(([key, loc]) => {
    const cur = next[key];
    if (!cur) {
      next[key] = loc;
      changed = true;
      return;
    }
    if (ts(loc) > ts(cur)) {
      next[key] = loc;
      changed = true;
    }
  });

  return { next, changed };
}

export function saveGenreTabsTemplate(genres = [], tabsConfig = []) {
  const key = buildGenreTemplateKey(genres);
  if (!key || !Array.isArray(tabsConfig) || tabsConfig.length === 0) return false;
  const store = readStore();
  store[key] = {
    genres: key.split('||'),
    tabsConfig: cloneValue(tabsConfig),
    updatedAt: new Date().toISOString(),
  };
  writeStore(store);
  return true;
}

export function getGenreTabsTemplate(genres = []) {
  const key = buildGenreTemplateKey(genres);
  if (!key) return null;
  const store = readStore();
  const record = store[key];
  if (!record || !Array.isArray(record.tabsConfig) || record.tabsConfig.length === 0) return null;
  return {
    ...record,
    tabsConfig: cloneValue(record.tabsConfig),
  };
}

export function deleteGenreTabsTemplate(genres = []) {
  const key = buildGenreTemplateKey(genres);
  if (!key) return false;
  const store = readStore();
  if (!Object.prototype.hasOwnProperty.call(store, key)) return false;
  delete store[key];
  writeStore(store);
  return true;
}

