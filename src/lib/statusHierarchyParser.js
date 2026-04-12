/**
 * Shared parser for status hierarchy strings:
 * "Loai - Cap bac - Dia diem 1 - Dia diem 2 ..."
 * Used by auto relation note + the-luc/ban-do sync to avoid parser drift.
 */

function trimWikiToken(text) {
  return String(text || '')
    .replace(/\[\[|\]\]/g, '')
    .trim();
}

export function normalizeAsciiText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();
}

export function splitStatusHierarchyTokens(statusLine) {
  const src = String(statusLine || '');
  if (!src.trim()) return [];

  const tokens = [];
  let part = '';
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    const prev = i > 0 ? src[i - 1] : '';
    const next = i + 1 < src.length ? src[i + 1] : '';
    const isHyphenDelimiter = ch === '-' && (/\s/.test(prev) || /\s/.test(next));
    const isDashDelimiter = ch === '\u2014' || ch === '\u2013';
    if (isHyphenDelimiter || isDashDelimiter) {
      const trimmed = part.trim();
      if (trimmed) tokens.push(trimmed);
      part = '';
      continue;
    }
    part += ch;
  }

  const tail = part.trim();
  if (tail) tokens.push(tail);
  return tokens.map((s) => trimWikiToken(s)).filter(Boolean);
}

export function parseStatusHierarchy(statusLine) {
  const tokens = splitStatusHierarchyTokens(statusLine);
  if (tokens.length < 2) return null;

  let categoryLabel = '';
  let rankLabel = '';
  let chain = [];
  if (tokens.length >= 3) {
    categoryLabel = tokens[0];
    rankLabel = tokens[1];
    chain = tokens.slice(2);
  } else {
    rankLabel = tokens[0];
    chain = tokens.slice(1);
  }
  if (chain.length === 0) return null;
  return { categoryLabel, rankLabel, chain };
}

export function isBeyondRankLabel(rankText) {
  const raw = String(rankText || '').toLowerCase();
  return /\bb\u1ea5t\s*c\u1ea5p\b/u.test(raw);
}

export function parseRankNumber(rankText) {
  const raw = String(rankText || '').toLowerCase();
  const normalized = normalizeAsciiText(rankText);
  const advancedForceRanks = [
    { pattern: /\bthien\s*de\b/, value: 1 },
    { pattern: /\bdia\s*de\b/, value: 2 },
    { pattern: /\bdai\s*de\b/, value: 3 },
    { pattern: /\bde\s*gia\b/, value: 4 },
    { pattern: /\bthien\s*ton\b/, value: 11 },
    { pattern: /\bdia\s*ton\b/, value: 12 },
    { pattern: /\bdai\s*ton\b/, value: 13 },
    { pattern: /\bton\s*gia\b/, value: 14 },
    { pattern: /\bthien\s*vuong\b/, value: 21 },
    { pattern: /\bdia\s*vuong\b/, value: 22 },
    { pattern: /\bdai\s*vuong\b/, value: 23 },
    { pattern: /\bvuong\s*gia\b/, value: 24 },
  ];
  const advancedMatch = advancedForceRanks.find((item) => item.pattern.test(normalized));
  if (advancedMatch) return advancedMatch.value;

  const mNum = normalized.match(/(\d{1,3})/);
  if (mNum) return parseInt(mNum[1], 10);

  // Keep "Bat Cap" unaccented mapped to 8 to avoid accidental rank inflation.
  if (/\bbat\b/.test(normalized) || /\bt\u00e1m\b/u.test(raw)) return 8;
  if (/\b(tam|ba)\b/.test(normalized)) return 3;
  if (/\b(that|bay)\b/.test(normalized)) return 7;
  if (/\b(luc|sau)\b/.test(normalized)) return 6;
  if (/\b(ngu|nam)\b/.test(normalized)) return 5;
  if (/\b(tu|bon)\b/.test(normalized)) return 4;
  if (/\b(nhi|hai)\b/.test(normalized)) return 2;
  if (/\b(nhat|mot)\b/.test(normalized)) return 1;
  if (/\b(cuu|chin)\b/.test(normalized)) return 9;
  if (/\b(thap|muoi)\b/.test(normalized)) return 10;
  return Number.NaN;
}
