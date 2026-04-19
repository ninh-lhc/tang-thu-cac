/**
 * Suy loại hình thế lực (Đế Quốc, Tông Môn, …) từ trường hồ sơ + ngữ cảnh tab.
 * Dùng chung theLucBanDoSync và collectionListCardSync (tránh import vòng).
 */
import { normalizeAsciiText } from './statusHierarchyParser.js';

function safeString(v) {
  if (v == null || v === 'null' || v === 'undefined') return '';
  return String(v);
}

function normalizeAscii(v) {
  return normalizeAsciiText(v);
}

export function classifyOrgType(rawType) {
  const n = normalizeAscii(rawType).replace(/[^a-z0-9]+/g, ' ');
  if (n.includes('de quoc') || n.includes('quoc gia') || n.includes('trieu')) return 'Đế Quốc';
  if (n.includes('chung toc')) return 'Chủng Tộc';
  if (n.includes('gia toc')) return 'Gia Tộc';
  if (n.includes('hoc vien')) return 'Học Viện';
  // «Cửu/Bát Cấp thế lực» chứa "the luc" nhưng là hạng cấp — không gán Tông Môn.
  if (/\bcap\b/.test(n) && /\bthe\s+luc\b/.test(n)) return 'Thế Lực Khác';
  if (n.includes('the luc khac')) return 'Thế Lực Khác';
  if (n.includes('tong mon') || n.includes('to chuc') || n.includes('the luc')) return 'Tông Môn';
  if (n.includes('thuong minh') || n.includes('thuong hoi')) return 'Thương Minh';
  return 'Thế Lực Khác';
}

/**
 * Từ id tab con (vd. de-quoc) suy bucket khi nhãn hiển thị không chứa từ khóa (vd. tab bản đồ).
 */
export function inferOrgTypeFromTabSlug(tabId = '') {
  const n = normalizeAscii(tabId).replace(/-/g, ' ').trim();
  if (!n) return '';
  if (/\bde\s+quoc\b/.test(n) || /\bquoc\s+gia\b/.test(n)) return 'Đế Quốc';
  if (/\bchung\s+toc\b/.test(n)) return 'Chủng Tộc';
  if (/\btong\s+mon\b/.test(n)) return 'Tông Môn';
  if (/\bgia\s+toc\b/.test(n)) return 'Gia Tộc';
  if (/\bhoc\s+vien\b/.test(n)) return 'Học Viện';
  if (/\bthuong\s+minh\b/.test(n) || /\bthuong\s+hoi\b/.test(n)) return 'Thương Minh';
  if (/\bthe\s+luc\s+khac\b/.test(n)) return 'Thế Lực Khác';
  return '';
}

export function inferOrgTypeFromContext({
  dynamicData,
  sourceNhoId = '',
  sourceNhoLabel = '',
  typeFieldValue = '',
} = {}) {
  const dyn = dynamicData && typeof dynamicData === 'object' ? dynamicData : {};
  const candidates = [
    typeFieldValue,
    dyn.f_loai_to_chuc,
    dyn.f_loai,
    dyn.f_to_chuc,
    dyn.f_title,
    sourceNhoLabel,
    sourceNhoId,
  ];
  for (const candidate of candidates) {
    const raw = safeString(candidate).trim();
    if (!raw) continue;
    const mapped = classifyOrgType(raw);
    if (mapped !== 'Thế Lực Khác') return mapped;
  }
  const fromSlug = inferOrgTypeFromTabSlug(sourceNhoId);
  if (fromSlug) return fromSlug;
  return 'Thế Lực Khác';
}
