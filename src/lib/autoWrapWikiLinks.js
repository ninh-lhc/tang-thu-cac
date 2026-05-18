/**
 * Auto-wrap internal wiki links from existing entity names.
 * Only wraps text outside existing [[...]] ranges.
 * Longer names are matched first to avoid overlap.
 */
import { buildEntityNameLookup, resolveEntityLookup } from './entityWikiLookup.js';
import { isWikiWrapOptedOut } from './wikiLinkOptOut.js';
import { compareWikiNameSurfacePriority } from './wikiNameSurface.js';

const WORD_CHAR_RE = /[\p{L}\p{N}_]/u;

function isWordChar(ch) {
  if (!ch) return false;
  return WORD_CHAR_RE.test(ch);
}

function isBoundary(text, start, end) {
  const left = start > 0 ? text[start - 1] : '';
  const right = end < text.length ? text[end] : '';
  return !isWordChar(left) && !isWordChar(right);
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

function normalizeNames(entityMap) {
  const seen = new Set();
  const out = [];
  for (const item of entityMap || []) {
    const name = String(item?.name || '').trim();
    if (!name || name.length < 2) continue;
    if (seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out.sort(compareWikiNameSurfacePriority);
}

export function autoWrapWikiLinksByEntityMapWithCount(text, entityMap, options = {}) {
  if (typeof text !== 'string' || !text) return { text: String(text || ''), count: 0 };
  const names = normalizeNames(entityMap);
  if (names.length === 0) return { text, count: 0 };
  const lookup = buildEntityNameLookup(entityMap);
  const optOuts = Array.isArray(options?.optOuts) ? options.optOuts : [];

  const protectedRanges = collectProtectedRanges(text);
  const sourceLower = text.toLowerCase();
  const candidates = names.map((name) => ({ raw: name, lower: name.toLowerCase() }));
  const matches = [];

  let i = 0;
  while (i < text.length) {
    const inside = rangeContaining(protectedRanges, i);
    if (inside) {
      i = inside.end;
      continue;
    }

    let picked = null;
    for (const candidate of candidates) {
      if (!sourceLower.startsWith(candidate.lower, i)) continue;
      const end = i + candidate.raw.length;
      if (!isBoundary(text, i, end)) continue;
      if (!resolveEntityLookup(lookup, text.slice(i, end))) continue;
      if (isWikiWrapOptedOut(text, i, end, candidate.raw, optOuts)) continue;
      picked = { start: i, end };
      break;
    }

    if (!picked) {
      i += 1;
      continue;
    }
    matches.push(picked);
    i = picked.end;
  }

  if (matches.length === 0) return { text, count: 0 };

  let out = '';
  let cursor = 0;
  for (const range of matches) {
    out += text.slice(cursor, range.start);
    out += `[[${text.slice(range.start, range.end)}]]`;
    cursor = range.end;
  }
  out += text.slice(cursor);
  return { text: out, count: matches.length };
}

export function autoWrapWikiLinksByEntityMap(text, entityMap, options = {}) {
  const out = autoWrapWikiLinksByEntityMapWithCount(text, entityMap, options);
  return typeof out === 'string' ? out : out.text;
}
