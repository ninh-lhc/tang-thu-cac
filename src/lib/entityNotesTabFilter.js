// Mục đích: Gom giá trị duy nhất theo trường form trên tab + lọc markdown ghi chép theo mục.
// Ai dùng: AppEntityDetailNotes (đọc), App.jsx (useMemo buckets).
// Lưu ý: Đồng bộ đọc trường với entityCollectionQuery qua getEntityFieldValue.

import { getEntityFieldValue, safeString } from './entityFieldValue.js';
import { normalizeSearchText } from './normalizeSearchText.js';

const SECTION_HEADING_RE = /^\*\*(\d+)\.\s(.+?)\*\*$/;

function isListCardEntityName(ent) {
  return normalizeSearchText(safeString(ent?.name)).startsWith('danh sach');
}

function isHeadingLine(raw) {
  const normalized = safeString(raw);
  const leftTrimmed = normalized.trimStart();
  if (leftTrimmed.startsWith('### ')) return true;
  if (leftTrimmed.startsWith('## ')) return true;
  if (leftTrimmed.startsWith('# ')) return true;
  return SECTION_HEADING_RE.test(normalized.trim());
}

/**
 * @param {object[]} entities
 * @param {{ id: string, label?: string }[]} fields
 * @returns {{ id: string, label: string, values: string[] }[]}
 */
export function buildEntityNotesTabFieldBuckets(entities, fields) {
  const list = Array.isArray(entities) ? entities : [];
  const fieldList = Array.isArray(fields) ? fields : [];
  const buckets = [];
  for (const f of fieldList) {
    const id = safeString(f?.id).trim();
    if (!id) continue;
    const set = new Set();
    for (const ent of list) {
      if (!ent || ent.isTemplate || isListCardEntityName(ent)) continue;
      const raw = safeString(getEntityFieldValue(ent, id)).trim();
      if (raw) set.add(raw);
    }
    const values = [...set].sort((a, b) => a.localeCompare(b, 'vi'));
    if (values.length) {
      buckets.push({ id, label: safeString(f.label || id), values });
    }
  }
  return buckets;
}

/**
 * Lọc theo mục (tiêu đề # / ## / ### / **n. Tiêu đề**): giữ nguyên mục nếu đoạn chứa tất cả chuỗi cần tìm (đã chuẩn hoá).
 * @param {string} markdown
 * @param {{ searchQuery?: string, fieldValueFilters?: Record<string, string> }} opts
 */
export function filterEntityNotesMarkdown(markdown, opts = {}) {
  const text = safeString(markdown);
  const searchQuery = safeString(opts.searchQuery).trim();
  const fieldValueFilters = opts.fieldValueFilters && typeof opts.fieldValueFilters === 'object' ? opts.fieldValueFilters : {};
  const needles = [];
  if (searchQuery) needles.push(searchQuery);
  for (const v of Object.values(fieldValueFilters)) {
    const t = safeString(v).trim();
    if (t) needles.push(t);
  }
  if (needles.length === 0) {
    return { text, didFilter: false, emptyMatch: false };
  }
  const normNeedles = needles.map((n) => normalizeSearchText(n));

  const lines = text.split('\n');
  if (lines.length === 0) {
    return { text: '', didFilter: true, emptyMatch: true };
  }

  const boundaries = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (isHeadingLine(lines[i])) {
      if (boundaries.length === 0 && i > 0) boundaries.push(0);
      boundaries.push(i);
    }
  }
  if (boundaries.length === 0) boundaries.push(0);
  boundaries.push(lines.length);

  const keep = new Set();
  for (let k = 0; k < boundaries.length - 1; k += 1) {
    const a = boundaries[k];
    const b = boundaries[k + 1];
    const chunk = lines.slice(a, b).join('\n');
    const normChunk = normalizeSearchText(chunk);
    const ok = normNeedles.every((nn) => normChunk.includes(nn));
    if (ok) {
      for (let j = a; j < b; j += 1) keep.add(j);
    }
  }

  const outLines = lines.filter((_, idx) => keep.has(idx));
  const outText = outLines.join('\n');
  return {
    text: outText,
    didFilter: true,
    emptyMatch: outText.trim() === '',
  };
}

function splitMarkdownIntoSections(lines) {
  const arr = Array.isArray(lines) ? lines : [];
  const blocks = [];
  let cur = [];
  for (let i = 0; i < arr.length; i += 1) {
    const line = arr[i];
    if (cur.length > 0 && isHeadingLine(line)) {
      blocks.push(cur);
      cur = [line];
    } else {
      cur.push(line);
    }
  }
  if (cur.length) blocks.push(cur);
  return blocks;
}

function markdownSectionSortKey(block) {
  const b = Array.isArray(block) ? block : [];
  for (const line of b) {
    if (isHeadingLine(line)) return safeString(line).trim();
  }
  return safeString(b[0] || '').trim();
}

/** Sắp xếp các mục (khối tách bởi tiêu đề) sau khi lọc — A-Z / Z-A. */
export function sortMarkdownSectionsAfterFilter(text, sortMode) {
  const mode = safeString(sortMode);
  if (!mode || mode === 'none') return safeString(text);
  const raw = safeString(text);
  if (!raw.trim()) return raw;
  const lines = raw.split('\n');
  const blocks = splitMarkdownIntoSections(lines);
  if (blocks.length <= 1) return raw;
  const mult = mode === 'name_desc' ? -1 : 1;
  const sorted = [...blocks].sort((a, b) => {
    const ka = normalizeSearchText(markdownSectionSortKey(a));
    const kb = normalizeSearchText(markdownSectionSortKey(b));
    if (ka === kb) return 0;
    return mult * ka.localeCompare(kb, 'vi');
  });
  return sorted.map((b) => b.join('\n')).join('\n');
}
