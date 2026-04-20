/**
 * Quy ước thứ tự mục lục cho thẻ Danh sách (AUTO):
 * — La Mã (I, II, …) = tầng lớn; số Ả Rập 1, 2 = mục nhỏ cấp 1; 1.1, 2.3 = cấp sâu hơn.
 * — Cùng mục thì so sánh theo tên (ở lớp gọi).
 */
import { normalizeAsciiText } from './statusHierarchyParser.js';

const ROM = 0;
const AR = 1;

function safeTrim(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Chuẩn hoá để so sánh chuỗi rỗng / tương đương. */
export function normalizeOutlineRaw(value) {
  return normalizeAsciiText(safeTrim(value));
}

function romanToInt(roman) {
  const s = String(roman || '')
    .trim()
    .toUpperCase();
  if (!s || !/^[IVXLCDM]+$/u.test(s)) return Number.NaN;
  const sym = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let n = 0;
  for (let i = 0; i < s.length; i += 1) {
    const v = sym[s[i]];
    const w = sym[s[i + 1]] || 0;
    if (w > v) n -= v;
    else n += v;
  }
  return n;
}

/**
 * Một segment: La Mã (I…) hoặc số nguyên dương.
 * Trả về mảng phẳng [kind, value, kind, value, …] để so sánh từng tầng.
 */
function segmentToPairs(segment) {
  const seg = safeTrim(segment);
  if (!seg) return null;
  if (/^[0-9]+$/u.test(seg)) return [AR, parseInt(seg, 10)];
  const ri = romanToInt(seg);
  if (Number.isFinite(ri) && ri > 0) return [ROM, ri];
  return null;
}

/**
 * Chuỗi mục lục → mảng số để so sánh lexicographic.
 * Hỗ trợ: "I", "II", "1", "2", "1.1", "I.1", "1.2.3"
 */
export function outlineToSortTuple(raw) {
  const s = safeTrim(raw);
  if (!s) return null;
  const parts = s
    .split('.')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const flat = [];
  for (const p of parts) {
    const pairs = segmentToPairs(p);
    if (!pairs) return null;
    flat.push(...pairs);
  }
  return flat;
}

function compareTuples(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const av = a[i];
    const bv = b[i];
    if (av === undefined && bv === undefined) return 0;
    if (av === undefined) return -1;
    if (bv === undefined) return 1;
    if (av !== bv) return av < bv ? -1 : 1;
  }
  return 0;
}

/**
 * So sánh hai chuỗi mục lục. Rỗng / không hợp lệ → xếp sau (khi gọi từ wrapper).
 */
export function compareOutlineStrings(aRaw, bRaw) {
  const a = outlineToSortTuple(aRaw);
  const b = outlineToSortTuple(bRaw);
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return compareTuples(a, b);
}

/** Id trường dynamicData mặc định (tab con có thể ghi đè autoListOutlineFieldId). */
export const DEFAULT_AUTO_LIST_OUTLINE_FIELD_ID = 'f_muc_luc_danh_sach';

export function resolveAutoListOutlineFieldId(tabConfig) {
  if (!tabConfig || typeof tabConfig !== 'object') return DEFAULT_AUTO_LIST_OUTLINE_FIELD_ID;
  const raw = tabConfig.autoListOutlineFieldId;
  if (raw === '__off__' || raw === '-') return '';
  const id = safeTrim(raw === undefined || raw === null ? '' : raw);
  return id || DEFAULT_AUTO_LIST_OUTLINE_FIELD_ID;
}

export function pickEntityOutlineValue(entity, fieldId) {
  const fid = safeTrim(fieldId);
  if (!fid) return '';
  const fromDyn = entity?.dynamicData && typeof entity.dynamicData === 'object' ? entity.dynamicData[fid] : '';
  const fromRoot = entity?.[fid];
  return safeTrim(fromDyn ?? fromRoot ?? '');
}
