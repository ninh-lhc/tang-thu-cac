/**
 * Tự bọc [[wiki]] theo tên thẻ đã có, không cần AI.
 * - Chỉ bọc phần chưa có [[...]]
 * - Ưu tiên tên dài hơn trước để giảm đè lấp
 */

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
  let m;
  while ((m = wikiRe.exec(text)) !== null) {
    ranges.push({ start: m.index, end: m.index + m[0].length });
  }
  return ranges.sort((a, b) => a.start - b.start);
}

function rangeContaining(ranges, pos) {
  let lo = 0;
  let hi = ranges.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const r = ranges[mid];
    if (pos < r.start) hi = mid - 1;
    else if (pos >= r.end) lo = mid + 1;
    else return r;
  }
  return null;
}

function normalizeNames(entityMap) {
  const seen = new Set();
  const out = [];
  for (const item of entityMap || []) {
    const n = String(item?.name || '').trim();
    if (!n || n.length < 2) continue;
    const k = n.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(n);
  }
  return out.sort((a, b) => b.length - a.length);
}

export function autoWrapWikiLinksByEntityMapWithCount(text, entityMap) {
  if (typeof text !== 'string' || !text) return { text: String(text || ''), count: 0 };
  const names = normalizeNames(entityMap);
  if (names.length === 0) return { text, count: 0 };

  const protectedRanges = collectProtectedRanges(text);
  const sourceLower = text.toLowerCase();
  const candidates = names.map((n) => ({ raw: n, lower: n.toLowerCase() }));
  const matches = [];

  let i = 0;
  while (i < text.length) {
    const inside = rangeContaining(protectedRanges, i);
    if (inside) {
      i = inside.end;
      continue;
    }

    let picked = null;
    for (const c of candidates) {
      if (!sourceLower.startsWith(c.lower, i)) continue;
      const end = i + c.raw.length;
      if (!isBoundary(text, i, end)) continue;
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
  for (const r of matches) {
    out += text.slice(cursor, r.start);
    out += '[[' + text.slice(r.start, r.end) + ']]';
    cursor = r.end;
  }
  out += text.slice(cursor);
  return { text: out, count: matches.length };
}

export function autoWrapWikiLinksByEntityMap(text, entityMap) {
  const out = autoWrapWikiLinksByEntityMapWithCount(text, entityMap);
  return typeof out === 'string' ? out : out.text;
}

