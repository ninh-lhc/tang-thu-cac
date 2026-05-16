/**
 * Lọc nội dung ghi chép thẻ «Danh sách» (AUTO) theo chuỗi tìm — giữ khối tiêu đề, chỉ giữ dòng có khớp.
 * Dùng `AppListCardInfoSearch.jsx` (Hồ sơ / tab collection).
 */
import { safeString } from './entityFieldValue.js';
import { normalizeSearchText } from './normalizeSearchText.js';

export function isListCardStructuralLine(trimmed) {
  const t = safeString(trimmed).trim();
  if (!t) return true;
  if (t.startsWith('#') || t.startsWith('<!--')) return true;
  if (/^##\s*/u.test(t)) return true;
  if (/^-\s*T\u1ed5ng/u.test(t)) return true; // Tổng số thẻ
  return false;
}

/**
 * Lọc dòng danh mục AUTO: giữ dòng nội dung chỉ khi mỗi giá trị đã chọn (từ trường form) đều xuất hiện trên dòng.
 * @param {string} info
 * @param {Record<string, string>} fieldValueFilters
 * @returns {{ text: string, isFiltered: boolean, keptContentLines: number }}
 */
export function filterListCardInfoByFieldFilters(info, fieldValueFilters) {
  const raw = safeString(info);
  const needles = Object.values(fieldValueFilters || {})
    .map((v) => safeString(v).trim())
    .filter(Boolean)
    .map((v) => normalizeSearchText(v));
  if (needles.length === 0) {
    return { text: raw, isFiltered: false, keptContentLines: -1 };
  }
  const lines = raw.split('\n');
  const out = [];
  let keptContentLines = 0;
  for (const line of lines) {
    if (isListCardStructuralLine(line)) {
      out.push(line);
      continue;
    }
    const hay = normalizeSearchText(line);
    const ok = needles.every((n) => hay.includes(n));
    if (ok) {
      out.push(line);
      keptContentLines += 1;
    }
  }
  return { text: out.join('\n'), isFiltered: true, keptContentLines };
}

/**
 * @returns {{ text: string, matchCount: number | null, isFiltered: boolean }}
 */
export function filterListCardInfoBySearchQuery(info, query) {
  const raw = safeString(info);
  const q = normalizeSearchText(query);
  if (!q) {
    return { text: raw, matchCount: null, isFiltered: false };
  }
  const lines = raw.split('\n');
  const out = [];
  let matchCount = 0;
  for (const line of lines) {
    if (isListCardStructuralLine(line)) {
      out.push(line);
      continue;
    }
    if (normalizeSearchText(line).includes(q)) {
      out.push(line);
      matchCount += 1;
    }
  }
  return { text: out.join('\n'), matchCount, isFiltered: true };
}

/**
 * Giữ nguyên thứ tự dòng cấu trúc (tiêu đề, tổng số…), chỉ sắp xếp các dòng nội dung danh mục.
 * @param {'none'|'name_asc'|'name_desc'} sortMode
 */
export function sortListCardContentLinesPreservingStructure(text, sortMode) {
  const mode = safeString(sortMode);
  if (!mode || mode === 'none') return safeString(text);
  const raw = safeString(text);
  const lines = raw.split('\n');
  const mult = mode === 'name_desc' ? -1 : 1;
  const content = lines.filter((l) => !isListCardStructuralLine(l));
  const sorted = [...content].sort((a, b) => mult * a.localeCompare(b, 'vi'));
  let idx = 0;
  return lines.map((l) => (isListCardStructuralLine(l) ? l : sorted[idx++])).join('\n');
}
