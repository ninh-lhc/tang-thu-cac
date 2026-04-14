const STORAGE_KEY = 'ttc_genre_tabs_templates_v1';

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
  if (typeof localStorage === 'undefined') return {};
  return safeJsonParse(localStorage.getItem(STORAGE_KEY) || '{}', {});
}

function writeStore(nextStore) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStore || {}));
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

