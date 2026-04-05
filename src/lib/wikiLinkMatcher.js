/**
 * Matcher nhẹ cho wiki-link trên văn bản thuần.
 * Tránh tạo regex alternation khổng lồ khi số lượng thực thể tăng cao.
 */

const normalizeName = (value) => String(value || '').trim().toLowerCase();
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

export const buildWikiLinkMatcher = (entityMap) => {
  if (!Array.isArray(entityMap) || entityMap.length === 0) return null;

  const seen = new Set();
  const buckets = new Map();

  for (const item of entityMap) {
    const normalized = normalizeName(item?.name);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    const firstChar = normalized[0];
    const bucket = buckets.get(firstChar) || [];
    bucket.push(normalized);
    buckets.set(firstChar, bucket);
  }

  if (buckets.size === 0) return null;

  for (const [, names] of buckets) {
    names.sort((a, b) => b.length - a.length);
  }

  return { buckets };
};

export const splitTextByWikiMatcher = (text, matcher) => {
  if (!text || typeof text !== 'string') return [{ text: String(text ?? ''), isMatch: false }];
  if (!matcher?.buckets || matcher.buckets.size === 0) return [{ text, isMatch: false }];

  const sourceLower = text.toLowerCase();
  const parts = [];
  let cursor = 0;
  let i = 0;

  while (i < text.length) {
    const bucket = matcher.buckets.get(sourceLower[i]);
    let matchedName = null;
    if (bucket) {
      for (const candidate of bucket) {
        if (sourceLower.startsWith(candidate, i) && isBoundary(text, i, i + candidate.length)) {
          matchedName = candidate;
          break;
        }
      }
    }

    if (!matchedName) {
      i += 1;
      continue;
    }

    if (i > cursor) {
      parts.push({ text: text.slice(cursor, i), isMatch: false });
    }
    parts.push({ text: text.slice(i, i + matchedName.length), isMatch: true });
    i += matchedName.length;
    cursor = i;
  }

  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), isMatch: false });
  }

  return parts.length > 0 ? parts : [{ text, isMatch: false }];
};
