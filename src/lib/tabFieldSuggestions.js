/**
 * Trường hồ sơ tùy chỉnh + danh sách gợi ý nhập (theo tab nhỏ trong tabsConfig).
 * App.jsx và AppModalQuanLyTab dùng để chuẩn hoá trước khi ghi novel.
 */
import { WIKI_ALIAS_FIELD } from '../MasterEngines.js';
import { safeString } from '../MasterUtils.jsx';

export function linesToSuggestionArray(text) {
  return safeString(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function sanitizeFieldsTemplate(fields) {
  return (Array.isArray(fields) ? fields : [])
    .filter((f) => f && safeString(f.id).trim())
    .map((f) => ({
      id: safeString(f.id).trim(),
      label: safeString(f.label).trim() || safeString(f.id).trim(),
    }));
}

/** Luôn giữ f_alias (wiki) ở cuối danh sách trường. */
export function ensureWikiAliasInFieldsTemplate(fields) {
  const filtered = sanitizeFieldsTemplate(fields);
  if (filtered.some((f) => f.id === WIKI_ALIAS_FIELD.id)) return filtered;
  return [...filtered, { id: WIKI_ALIAS_FIELD.id, label: WIKI_ALIAS_FIELD.label }];
}

export function normalizeFieldSuggestionLists(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  Object.entries(raw).forEach(([key, value]) => {
    const k = safeString(key).trim();
    if (!k) return;
    let list = [];
    if (Array.isArray(value)) {
      list = value.map((item) => safeString(item).trim()).filter(Boolean);
    } else {
      list = linesToSuggestionArray(value);
    }
    if (list.length > 0) out[k] = list;
  });
  return out;
}

/** Xoá gợi ý của những fieldId không còn trong template. */
export function pruneFieldSuggestionLists(fieldSuggestionLists, fieldIds) {
  const allowed = new Set(fieldIds);
  const next = {};
  Object.entries(fieldSuggestionLists || {}).forEach(([key, value]) => {
    if (!allowed.has(key)) return;
    next[key] = Array.isArray(value) ? [...value] : value;
  });
  return normalizeFieldSuggestionLists(next);
}
