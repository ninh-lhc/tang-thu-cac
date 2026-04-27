/**
 * Lọc nội dung ghi chép thẻ «Danh sách» (AUTO) theo chuỗi tìm — giữ khối tiêu đề, chỉ giữ dòng có khớp.
 * Dùng `AppListCardInfoSearch.jsx` (Hồ sơ / tab collection).
 */
import { safeString } from './entityFieldValue.js';
import { normalizeSearchText } from './normalizeSearchText.js';

function isListCardStructuralLine(trimmed) {
  const t = safeString(trimmed).trim();
  if (!t) return true;
  if (t.startsWith('#') || t.startsWith('<!--')) return true;
  if (/^##\s*/u.test(t)) return true;
  if (/^-\s*T\u1ed5ng/u.test(t)) return true; // Tổng số thẻ
  return false;
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
