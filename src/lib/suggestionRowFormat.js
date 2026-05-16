/**
 * suggestionRowFormat.js
 * Tiện ích chuyển đổi giữa danh sách gợi ý dạng chuỗi `prefix|value` (mỗi dòng 1 gợi ý)
 * và mảng { prefix, value } dùng trong UI row-based.
 *
 * Dùng chung cho:
 *  - `AppEntityTemplateFieldEditor.jsx` (khu «Trường thông tin» trong ModalEntity).
 *  - Pop-up «Chỉnh list gợi ý» ở đầu ModalEntity (Quy mô theo Giới diện / Đặc tính dùng chung).
 */
import { safeString } from '../MasterUtils.jsx';

export function parseSuggestionRow(line) {
  const raw = safeString(line).trim();
  if (!raw) return { prefix: '', value: '' };
  const pipeIdx = raw.indexOf('|');
  if (pipeIdx < 0) return { prefix: '', value: raw };
  const prefix = safeString(raw.slice(0, pipeIdx)).trim();
  const value = safeString(raw.slice(pipeIdx + 1)).trim();
  return { prefix, value };
}

export function normalizeSuggestionRows(list = []) {
  return (Array.isArray(list) ? list : [])
    .map((line) => parseSuggestionRow(line))
    .filter((row) => row.prefix || row.value);
}

export function serializeSuggestionRows(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      prefix: safeString(row?.prefix).trim(),
      value: safeString(row?.value).trim(),
    }))
    .filter((row) => row.prefix || row.value)
    .map((row) => (row.prefix ? `${row.prefix}|${row.value}` : row.value))
    .join('\n');
}

/** Đếm số dòng hữu ích sau khi serialize (dùng cho toast). */
export function countSuggestionRows(rows = []) {
  return (Array.isArray(rows) ? rows : []).filter(
    (row) => safeString(row?.prefix).trim() || safeString(row?.value).trim()
  ).length;
}

/** Đổi thứ tự một dòng trong mảng { prefix, value }; delta -1 = lên, +1 = xuống. */
export function moveSuggestionRowAt(rows = [], fromIdx, delta) {
  const list = Array.isArray(rows) ? [...rows] : [];
  const toIdx = fromIdx + delta;
  if (fromIdx < 0 || fromIdx >= list.length || toIdx < 0 || toIdx >= list.length) return list;
  const [item] = list.splice(fromIdx, 1);
  list.splice(toIdx, 0, item);
  return list;
}

/**
 * Chuyển list lưu trữ (mỗi dòng dạng `prefix|value` hoặc `value`) → mảng value thuần
 * để dùng làm option cho datalist / UI chọn nhanh. Giữ thứ tự ban đầu (đã được người
 * dùng sắp xếp bằng prefix khi nhập).
 */
export function suggestionRowsToValues(list = []) {
  const rows = normalizeSuggestionRows(list);
  const out = [];
  const seen = new Set();
  rows.forEach((row) => {
    const v = safeString(row.value).trim();
    if (!v || seen.has(v)) return;
    seen.add(v);
    out.push(v);
  });
  return out;
}
