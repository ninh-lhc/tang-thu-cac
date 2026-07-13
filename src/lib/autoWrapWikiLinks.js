/**
 * Auto-wrap internal wiki links from existing entity names / aliases.
 * Only wraps text outside existing [[...]] ranges.
 * Longer names are matched first to avoid overlap.
 * Giữ nguyên chữ đã khớp (alias hoặc tên chính) — không đổi sang tên chính thẻ.
 */
import { isWikiWrapOptedOut } from './wikiLinkOptOut.js';
import { shouldSkipWikiLinkInHierarchyContext } from './wikiHierarchyLinkGuard.js';
import {
  compareWikiNameSurfacePriority,
  isWikiNameWordBoundary,
  isWikiSurfacePrefixOfLongerProperPhrase,
  matchesWikiNameSurface,
  normalizeWikiNameSurface,
} from './wikiNameSurface.js';

function safeString(value) {
  if (value == null || value === 'null' || value === 'undefined') return '';
  return String(value);
}

function collapseSpaces(value) {
  return safeString(value).replace(/\s+/g, ' ').trim();
}

function normalizeForMatch(value) {
  return normalizeWikiNameSurface(collapseSpaces(value));
}

function tokenizeName(value) {
  return normalizeForMatch(value).split(' ').filter(Boolean);
}

function tokenizeNameLiteral(value) {
  return collapseSpaces(value).split(/\s+/).filter(Boolean);
}

function isUpperChar(ch) {
  return /\p{Lu}/u.test(ch || '');
}

function escapeRegExp(value) {
  return safeString(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collectProtectedRanges(text) {
  const ranges = [];
  const wikiRe = /\[\[[\s\S]*?\]\]/g;
  let match;
  while ((match = wikiRe.exec(text)) !== null) {
    ranges.push({ start: match.index, end: match.index + match[0].length });
  }
  return ranges.sort((a, b) => a.start - b.start);
}

function rangeContaining(ranges, pos) {
  let lo = 0;
  let hi = ranges.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const range = ranges[mid];
    if (pos < range.start) hi = mid - 1;
    else if (pos >= range.end) lo = mid + 1;
    else return range;
  }
  return null;
}

function rangesOverlap(a, b) {
  return a.start < b.end && b.start < a.end;
}

/** Khoảng trắng cùng dòng (không vượt \n) — tránh bọc tên xuyên dòng làm mất newline. */
function isSameLineSpace(ch) {
  return ch === ' ' || ch === '\t' || ch === '\f' || ch === '\v' || ch === '\u00a0';
}

/** Khớp cụm tên cho phép khoảng trắng linh hoạt giữa các từ. */
function findFlexibleNameSpan(text, start, matchText) {
  const source = safeString(text);
  const needle = collapseSpaces(matchText);
  if (!needle) return null;

  const tokens = tokenizeNameLiteral(needle);
  if (tokens.length === 0) return null;

  let cursor = start;
  while (cursor < source.length && isSameLineSpace(source[cursor])) cursor += 1;
  const spanStart = cursor;

  for (let t = 0; t < tokens.length; t += 1) {
    while (cursor < source.length && isSameLineSpace(source[cursor])) cursor += 1;
    const token = tokens[t];
    const slice = source.slice(cursor);
    const re = new RegExp(`^${escapeRegExp(token)}`, 'iu');
    const hit = re.exec(slice);
    if (!hit) return null;
    cursor += hit[0].length;
  }

  const spanEnd = cursor;
  if (!isWikiNameWordBoundary(source, spanStart, spanEnd)) return null;
  return { start: spanStart, end: spanEnd };
}

function countUpperTokensInLiteral(value) {
  return tokenizeNameLiteral(value).filter((token) => isUpperChar(token[0])).length;
}

/**
 * Tên 3+ từ: cho phép khớp không phân biệt hoa thường từng token.
 * Tên 1–2 từ: giữ rule surface chặt để tránh bọc cụm thường ngữ.
 */
function matchesWrapCandidate(candidateText, sourceSlice, variantsByLower) {
  const candidate = collapseSpaces(candidateText);
  const source = collapseSpaces(sourceSlice);
  if (!candidate || !source) return false;
  if (matchesWikiNameSurface(candidate, source)) return true;

  const candTokens = tokenizeName(candidate);
  const srcTokens = tokenizeName(source);
  if (candTokens.length !== srcTokens.length || candTokens.length === 0) return false;

  for (let i = 0; i < candTokens.length; i += 1) {
    if (candTokens[i].toLowerCase() !== srcTokens[i].toLowerCase()) return false;
  }

  const candUpper = countUpperTokensInLiteral(candidate);
  const srcUpper = countUpperTokensInLiteral(source);

  if (candTokens.length >= 3 && candUpper >= 2) {
    return true;
  }

  const lower = candidate.toLowerCase();
  const variants = variantsByLower.get(lower) || [];
  if (variants.length === 1 && candTokens.length >= 2) {
    if (candUpper === 0) return true;
    if (srcUpper === 0) return false;
    return matchesWikiNameSurface(candidate, source);
  }

  return false;
}

function buildWrapCandidates(entityMap) {
  const byLower = new Map();
  const byEntityId = new Map();

  const register = (rawName, meta = {}) => {
    const name = collapseSpaces(rawName);
    if (!name || name.length < 2) return;
    const lower = name.toLowerCase();
    const entityId = meta?.dest?.entityId || meta?.entityId || '';
    const canonical =
      collapseSpaces(meta?.entityName) ||
      collapseSpaces(meta?.name) ||
      name;

    if (!byLower.has(lower)) byLower.set(lower, []);
    const bucket = byLower.get(lower);
    const wrapAs = collapseSpaces(meta?.entityName) || collapseSpaces(meta?.name) || name;
    if (!bucket.some((item) => item.matchText === name && item.wrapAs === wrapAs && item.entityId === entityId)) {
      bucket.push({
        matchText: name,
        wrapAs,
        lower,
        entityId,
        tokenCount: tokenizeName(name).length,
      });
    }

    if (entityId) {
      const entityBucket = byEntityId.get(entityId) || {
        entityId,
        canonical: canonical || name,
        names: new Set(),
      };
      entityBucket.names.add(name);
      if (!entityBucket.canonical || name.length > entityBucket.canonical.length) {
        entityBucket.canonical = canonical || name;
      }
      byEntityId.set(entityId, entityBucket);
    }
  };

  for (const item of entityMap || []) {
    register(item?.name, item);
    if (item?.entityName && item.entityName !== item?.name) {
      register(item.entityName, item);
    }
  }

  const reservedLower = new Set(byLower.keys());

  for (const entity of byEntityId.values()) {
    const names = [...entity.names].sort((a, b) => b.length - a.length);
    const primary = names[0] || entity.canonical;
    const primaryTokens = tokenizeNameLiteral(primary);
    if (primaryTokens.length < 3) continue;

    for (let take = 2; take < primaryTokens.length; take += 1) {
      const prefix = primaryTokens.slice(0, take).join(' ');
      const prefixLower = prefix.toLowerCase();
      if (prefix.length < 4) continue;
      if (reservedLower.has(prefixLower)) continue;
      reservedLower.add(prefixLower);
      register(prefix, {
        name: prefix,
        entityName: entity.canonical,
        entityId: entity.entityId,
        dest: { entityId: entity.entityId },
      });
    }
  }

  const candidates = [];
  for (const variants of byLower.values()) {
    for (const variant of variants) {
      const entityMeta = variant.entityId ? byEntityId.get(variant.entityId) : null;
      candidates.push({
        ...variant,
        wrapAs: entityMeta?.canonical || variant.wrapAs,
      });
    }
  }

  candidates.sort((a, b) => {
    const lenDiff = b.matchText.length - a.matchText.length;
    if (lenDiff !== 0) return lenDiff;
    const tokenDiff = b.tokenCount - a.tokenCount;
    if (tokenDiff !== 0) return tokenDiff;
    return compareWikiNameSurfacePriority(b.matchText, a.matchText);
  });

  const allMatchTexts = candidates.map((item) => item.matchText);
  return { candidates, variantsByLower: byLower, allMatchTexts };
}

function pickMatchAt(text, start, candidates, variantsByLower, allMatchTexts, optOuts, tierLabelSet = null) {
  for (const candidate of candidates) {
    const span = findFlexibleNameSpan(text, start, candidate.matchText);
    if (!span) continue;

    const sourceSlice = text.slice(span.start, span.end);
    if (!matchesWrapCandidate(candidate.matchText, sourceSlice, variantsByLower)) continue;

    if (
      hasLongerRegisteredWikiNameAtFlexible(text, span.start, candidate.matchText, allMatchTexts, variantsByLower)
    ) {
      continue;
    }

    if (isWikiSurfacePrefixOfLongerProperPhrase(text, span.start, span.end, candidate.matchText, allMatchTexts)) {
      continue;
    }

    if (isWikiWrapOptedOut(text, span.start, span.end, candidate.matchText, optOuts)) continue;

    if (shouldSkipWikiLinkInHierarchyContext(text, span.start, span.end, { tierLabelSet })) {
      // Không thử ứng viên khác tại vị trí này — tránh khớp tên dài hơn xuyên token phân cấp.
      return { start: span.start, end: span.end, skip: true };
    }

    return {
      start: span.start,
      end: span.end,
      matchedText: sourceSlice,
    };
  }
  return null;
}

function hasLongerRegisteredWikiNameAtFlexible(text, start, matchedName, allNames, variantsByLower) {
  const source = safeString(text);
  const base = collapseSpaces(matchedName);
  if (!base) return false;

  for (const name of allNames || []) {
    const candidate = collapseSpaces(name);
    if (!candidate || candidate.length <= base.length) continue;
    const span = findFlexibleNameSpan(source, start, candidate);
    if (!span || span.start !== start) continue;
    const slice = source.slice(span.start, span.end);
    if (!matchesWrapCandidate(candidate, slice, variantsByLower)) continue;
    return true;
  }
  return false;
}

export function autoWrapWikiLinksByEntityMapWithCount(text, entityMap, options = {}) {
  if (typeof text !== 'string' || !text) return { text: String(text || ''), count: 0 };
  const { candidates, variantsByLower, allMatchTexts } = buildWrapCandidates(entityMap);
  if (candidates.length === 0) return { text, count: 0 };
  const optOuts = Array.isArray(options?.optOuts) ? options.optOuts : [];
  const tierLabelSet = options?.tierLabelSet instanceof Set ? options.tierLabelSet : null;

  const protectedRanges = collectProtectedRanges(text);
  const matches = [];

  let i = 0;
  while (i < text.length) {
    const inside = rangeContaining(protectedRanges, i);
    if (inside) {
      i = inside.end;
      continue;
    }

    const picked = pickMatchAt(text, i, candidates, variantsByLower, allMatchTexts, optOuts, tierLabelSet);
    if (!picked) {
      i += 1;
      continue;
    }
    if (picked.skip) {
      i = Math.max(i + 1, picked.end);
      continue;
    }

    const overlap = matches.some((range) => rangesOverlap(range, picked));
    if (!overlap) {
      matches.push(picked);
      i = Math.max(i + 1, picked.end);
    } else {
      i += 1;
    }
  }

  if (matches.length === 0) return { text, count: 0 };

  matches.sort((a, b) => a.start - b.start || b.end - a.end - (a.end - a.start));
  const merged = [];
  for (const match of matches) {
    const last = merged[merged.length - 1];
    if (!last || !rangesOverlap(last, match)) {
      merged.push(match);
      continue;
    }
    if (match.end - match.start > last.end - last.start) {
      merged[merged.length - 1] = match;
    }
  }

  let out = '';
  let cursor = 0;
  for (const range of merged) {
    out += text.slice(cursor, range.start);
    // Luôn giữ surface đã gõ (tên chính / biệt danh / wiki trống sau này tạo thẻ).
    const label = collapseSpaces(range.matchedText);
    if (label) out += `[[${label}]]`;
    cursor = range.end;
  }
  out += text.slice(cursor);
  return { text: out, count: merged.length };
}

export function autoWrapWikiLinksByEntityMap(text, entityMap, options = {}) {
  const out = autoWrapWikiLinksByEntityMapWithCount(text, entityMap, options);
  return typeof out === 'string' ? out : out.text;
}
