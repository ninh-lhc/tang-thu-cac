/**
 * Tiện ích tương thích dữ liệu AUTO relation phiên bản cũ (legacy).
 *
 * Tách riêng khỏi autoRelationDetailNote để file chính chỉ tập trung vào
 * logic hiện tại; phần migrate/đọc block cũ được gom tại đây.
 */

import { normalizeAsciiText } from './statusHierarchyParser.js';

export const LEGACY_RELATED_TITLE = '## Liên kết liên quan (tự động)';

function escapeRegExp(text) {
  return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildLegacyRelatedBlockRegexGlobal(relatedEnd, legacyTitle = LEGACY_RELATED_TITLE) {
  const legacyBlockPattern = `${escapeRegExp(legacyTitle)}[\\s\\S]*?${escapeRegExp(relatedEnd)}`;
  return new RegExp(legacyBlockPattern, 'g');
}

export function isRelatedBlockTitleHeading(
  headingText,
  relatedTitle,
  legacyTitle = LEGACY_RELATED_TITLE
) {
  const normalized = normalizeAsciiText(headingText);
  const blockTitle = normalizeAsciiText(String(relatedTitle || '').replace(/^#+\s*/, ''));
  const legacyBlockTitle = normalizeAsciiText(String(legacyTitle || '').replace(/^#+\s*/, ''));
  return normalized === blockTitle || normalized === legacyBlockTitle;
}
