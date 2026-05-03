/**
 * Chuỗi gộp «Thế lực» trong modal: Loại · Hệ cấp bậc · Cấp bậc · Địa chỉ (dấu ·).
 * Tách/ghép thống nhất để parse/sync không nhầm f_status với chỉ «cấp bậc».
 */
import { normalizeAsciiText, splitMapHierarchyTokens } from './statusHierarchyParser.js';

function safeString(v) {
  if (v == null || v === 'null' || v === 'undefined') return '';
  return String(v);
}

export function composeForceQuickDisplayLine(orgType = '', realmSystem = '', rankLabel = '', locationLine = '') {
  return [orgType, realmSystem, rankLabel, locationLine]
    .map((x) => safeString(x).trim())
    .filter(Boolean)
    .join(' · ');
}

/**
 * Lấy phần «cấp bậc» thuần từ chuỗi hiển thị đã ghép (không gồm loại / hệ / địa chỉ đã biết).
 */
export function extractForceQuickRankLabel(statusLine, orgType, realmSystem, locationLine) {
  const st = safeString(statusLine).trim();
  if (!st) return '';

  const tokens = splitMapHierarchyTokens(st);
  if (tokens.length === 0) return '';

  const orgK = orgType ? normalizeAsciiText(orgType) : '';
  const realmK = realmSystem ? normalizeAsciiText(realmSystem) : '';
  const locStr = safeString(locationLine).trim();
  const locTokens = locStr ? splitMapHierarchyTokens(locStr) : [];

  const rest = [...tokens];

  if (rest.length && orgK && normalizeAsciiText(rest[0]) === orgK) rest.shift();
  if (rest.length && realmK && normalizeAsciiText(rest[0]) === realmK) rest.shift();

  let locRemain = [...locTokens];
  while (rest.length && locRemain.length) {
    const lastRest = normalizeAsciiText(rest[rest.length - 1]);
    const lastLoc = normalizeAsciiText(locRemain[locRemain.length - 1]);
    if (lastRest === lastLoc) {
      rest.pop();
      locRemain.pop();
    } else break;
  }

  return rest.join(' · ');
}
