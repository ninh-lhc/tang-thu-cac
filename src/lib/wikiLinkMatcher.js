/**
 * Matcher nhẹ cho wiki-link trên văn bản thuần.
 * Tránh tạo regex alternation khổng lồ khi số lượng thực thể tăng cao.
 */

import { isWikiWrapOptedOut } from './wikiLinkOptOut.js';
import { shouldSkipWikiLinkInHierarchyContext } from './wikiHierarchyLinkGuard.js';
import {
  compareWikiNameSurfacePriority,
  hasLongerRegisteredWikiNameAt,
  isWikiNameWordBoundary,
  isWikiSurfacePrefixOfLongerProperPhrase,
  matchesWikiNameSurface,
} from './wikiNameSurface.js';

const normalizeName = (value) => String(value || '').trim().toLowerCase();

function collectAllNamesFromBuckets(buckets) {
  const names = [];
  for (const bucket of buckets.values()) {
    for (const entry of bucket) names.push(entry.raw);
  }
  return names.sort((a, b) => compareWikiNameSurfacePriority(a, b));
}

export const buildWikiLinkMatcher = (entityMap, options = {}) => {
  if (!Array.isArray(entityMap) || entityMap.length === 0) return null;

  const seen = new Set();
  const buckets = new Map();

  for (const item of entityMap) {
    const raw = String(item?.name || '').trim();
    const normalized = normalizeName(raw);
    if (!normalized || seen.has(raw)) continue;
    seen.add(raw);
    const firstChar = normalized[0];
    const bucket = buckets.get(firstChar) || [];
    bucket.push({ raw, lower: normalized });
    buckets.set(firstChar, bucket);
  }

  if (buckets.size === 0) return null;

  for (const [, names] of buckets) {
    names.sort((a, b) => compareWikiNameSurfacePriority(a.raw, b.raw));
  }

  const tierLabelSet = options.tierLabelSet instanceof Set ? options.tierLabelSet : null;
  return { buckets, allNames: collectAllNamesFromBuckets(buckets), tierLabelSet };
};

export const splitTextByWikiMatcher = (text, matcher, optOuts = []) => {
  if (!text || typeof text !== 'string') return [{ text: String(text ?? ''), isMatch: false }];
  if (!matcher?.buckets || matcher.buckets.size === 0) return [{ text, isMatch: false }];

  const sourceLower = text.toLowerCase();
  const allNames = matcher.allNames || collectAllNamesFromBuckets(matcher.buckets);
  const tierLabelSet = matcher.tierLabelSet || null;
  const parts = [];
  let cursor = 0;
  let i = 0;

  while (i < text.length) {
    const bucket = matcher.buckets.get(sourceLower[i]);
    let matchedName = null;
    if (bucket) {
      for (const candidate of bucket) {
        const end = i + candidate.raw.length;
        if (
          sourceLower.startsWith(candidate.lower, i) &&
          isWikiNameWordBoundary(text, i, end) &&
          matchesWikiNameSurface(candidate.raw, text.slice(i, end)) &&
          !hasLongerRegisteredWikiNameAt(text, i, candidate.raw, allNames) &&
          !isWikiSurfacePrefixOfLongerProperPhrase(text, i, end, candidate.raw) &&
          !isWikiWrapOptedOut(text, i, end, candidate.raw, optOuts) &&
          !shouldSkipWikiLinkInHierarchyContext(text, i, end, { tierLabelSet })
        ) {
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
    parts.push({ text: text.slice(i, i + matchedName.raw.length), isMatch: true });
    i += matchedName.raw.length;
    cursor = i;
  }

  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), isMatch: false });
  }

  return parts.length > 0 ? parts : [{ text, isMatch: false }];
};
