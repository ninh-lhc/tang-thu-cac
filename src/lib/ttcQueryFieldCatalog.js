/**
 * Danh mục field hợp lệ cho TTC-Query (template + dữ liệu + field ảo).
 */
import { forEachNovelEntity } from './entityRename.js';
import { extractTtcDataFromEntityNote } from './ttcDataBlock.js';
import { TTC_VIRTUAL_FIELD_IDS, buildTtcVirtualFieldLabels, normalizeTtcTabsList } from './ttcQueryVirtualFields.js';
import { WIKI_ALIAS_FIELD } from '../MasterEngines.js';
import { normalizeSearchText } from './normalizeSearchText.js';

const LEGACY_ENTITY_FIELDS = ['f_status', 'f_title', 'f_desc', 'f_alias'];

export const TTC_SYSTEM_FIELD_LABELS = Object.freeze({
  f_alias: 'Tên gọi khác',
  f_status: 'Trạng thái',
  f_title: 'Tiêu đề',
  f_desc: 'Mô tả',
});

export function friendlyTtcFieldLabel(fieldId) {
  const body = String(fieldId || '')
    .replace(/^f_/, '')
    .replace(/[_-]+/g, ' ')
    .trim();
  if (!body) return String(fieldId || '');
  return body.replace(/\b\p{L}/gu, (ch) => ch.toLocaleUpperCase('vi'));
}

/**
 * Label hiển thị. Template tùy chỉnh thắng nhãn hệ thống.
 * Nhãn kho của f_alias được rút thành «Tên gọi khác».
 */
export function getTtcQueryFieldDisplayMeta(fieldId, context = {}) {
  const id = String(fieldId || '').trim();
  const templateLabel = String(context.templateLabel || '').trim();
  const virtual = buildTtcVirtualFieldLabels()[id];
  const system = TTC_SYSTEM_FIELD_LABELS[id];
  const stockAlias = templateLabel === WIKI_ALIAS_FIELD.label;
  let label = '';
  let source = context.source || 'dynamic';
  let fallback = false;
  if (virtual) {
    label = virtual;
    source = 'virtual';
  } else if (templateLabel && templateLabel !== id && !stockAlias) {
    label = templateLabel;
    source = context.source || 'template';
  } else if (system) {
    label = system;
    source = source === 'dynamic' ? 'system' : source;
  } else if (templateLabel) {
    label = templateLabel;
  } else {
    label = friendlyTtcFieldLabel(id);
    fallback = label !== id;
    source = context.source || 'dynamic';
  }
  return {
    id,
    label: label || id,
    type: context.type || 'text',
    source,
    scopeLabel: context.scopeLabel || '',
    fallback,
  };
}

export function collectTtcKnownFieldIds(activeNovelData, tabsConfig) {
  const ids = new Set(TTC_VIRTUAL_FIELD_IDS);
  LEGACY_ENTITY_FIELDS.forEach((f) => ids.add(f));

  const tabs = normalizeTtcTabsList(tabsConfig);
  if (tabs.length) {
    tabs.forEach((lon) => {
      (lon?.subTabs || []).forEach((nho) => {
        (nho?.fieldsTemplate || []).forEach((f) => {
          if (f?.id) ids.add(String(f.id).trim());
        });
      });
    });
  }

  forEachNovelEntity(activeNovelData, (ent) => {
    const dyn = ent?.dynamicData;
    if (dyn && typeof dyn === 'object') {
      Object.keys(dyn).forEach((key) => {
        if (key) ids.add(String(key).trim());
      });
    }
    Object.keys(extractTtcDataFromEntityNote(ent)).forEach((key) => {
      if (key) ids.add(String(key).trim());
    });
  });

  return ids;
}

export function isTtcKnownField(fieldId, knownIds) {
  const id = String(fieldId || '').trim();
  return id.length > 0 && knownIds.has(id);
}

/**
 * @returns {string | null} message lỗi kèm gợi ý field
 */
export function formatTtcUnknownFieldError(role, fieldId, knownIds, maxSuggest = 3) {
  const id = String(fieldId || '').trim();
  const suggestions = suggestTtcSimilarFields(id, knownIds, maxSuggest);
  const hint = suggestions.length ? ` Gợi ý: ${suggestions.join(', ')}.` : '';
  return `Field ${role} không tồn tại: ${id}.${hint}`;
}

export function suggestTtcSimilarFields(want, knownIds, max = 3) {
  const w = normalizeSearchText(want);
  if (!w) return [];
  const scored = [];
  knownIds.forEach((fieldId) => {
    const n = normalizeSearchText(fieldId);
    if (!n) return;
    let score = 0;
    if (n === w) score = 100;
    else if (n.startsWith(w) || w.startsWith(n)) score = 60;
    else if (n.includes(w) || w.includes(n)) score = 45;
    else {
      const dist = levenshtein(n, w);
      if (dist <= 2) score = 40 - dist * 10;
    }
    if (score > 0) scored.push({ fieldId, score });
  });
  scored.sort((a, b) => b.score - a.score || a.fieldId.localeCompare(b.fieldId));
  const out = [];
  for (const item of scored) {
    if (out.includes(item.fieldId)) continue;
    out.push(item.fieldId);
    if (out.length >= max) break;
  }
  return out;
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) row[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const tmp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[b.length];
}

export function validateTtcQueryFields(query, knownIds) {
  const errors = [];
  (query.where || []).forEach((cond) => {
    if (!isTtcKnownField(cond.field, knownIds)) {
      errors.push(formatTtcUnknownFieldError('WHERE', cond.field, knownIds));
    }
  });
  if (query.sort?.field && !isTtcKnownField(query.sort.field, knownIds)) {
    errors.push(formatTtcUnknownFieldError('SORT', query.sort.field, knownIds));
  }
  (query.select || []).forEach((fieldId) => {
    if (!isTtcKnownField(fieldId, knownIds)) {
      errors.push(formatTtcUnknownFieldError('SELECT', fieldId, knownIds));
    }
  });
  return errors;
}
