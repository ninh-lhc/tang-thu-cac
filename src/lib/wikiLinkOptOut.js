/**
 * Ghi nhớ chỗ người dùng đã gỡ [[wiki]] — auto-wrap khi lưu sẽ không bọc lại cùng ngữ cảnh.
 */
const CONTEXT_LEN = 40;

function safeString(value) {
  if (value == null || value === 'null' || value === 'undefined') return '';
  return String(value);
}

export function normalizeWikiOptOutContext(value) {
  return safeString(value).replace(/\s+/g, ' ').trim();
}

function buildWikiLinkOptOutKey(optOut) {
  const anchor = normalizeWikiOptOutContext(optOut?.anchor);
  const before = normalizeWikiOptOutContext(optOut?.before);
  const after = normalizeWikiOptOutContext(optOut?.after);
  return `${before}\x1f${anchor}\x1f${after}`;
}

export function readWikiLinkOptOuts(entity) {
  const list = entity?.wikiLinkOptOuts;
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => ({
      anchor: safeString(item?.anchor).trim(),
      before: safeString(item?.before).slice(-CONTEXT_LEN),
      after: safeString(item?.after).slice(0, CONTEXT_LEN),
    }))
    .filter((item) => item.anchor);
}

export function mergeWikiLinkOptOuts(existing = [], incoming = []) {
  const map = new Map();
  [...readWikiLinkOptOuts({ wikiLinkOptOuts: existing }), ...incoming].forEach((item) => {
    if (!item?.anchor) return;
    map.set(buildWikiLinkOptOutKey(item), {
      anchor: item.anchor,
      before: safeString(item.before).slice(-CONTEXT_LEN),
      after: safeString(item.after).slice(0, CONTEXT_LEN),
    });
  });
  return [...map.values()];
}

function collectProtectedWikiRanges(text) {
  const ranges = [];
  const wikiRe = /\[\[[\s\S]*?\]\]/g;
  let match;
  while ((match = wikiRe.exec(text)) !== null) {
    ranges.push({ start: match.index, end: match.index + match[0].length });
  }
  return ranges;
}

function isInsideProtectedRange(ranges, start, end) {
  return ranges.some((range) => start < range.end && end > range.start);
}

function contextMatches(text, start, end, beforeCtx, afterCtx) {
  const expectedBefore = normalizeWikiOptOutContext(beforeCtx);
  const expectedAfter = normalizeWikiOptOutContext(afterCtx);
  const sliceBefore = normalizeWikiOptOutContext(text.slice(Math.max(0, start - CONTEXT_LEN), start));
  const sliceAfter = normalizeWikiOptOutContext(text.slice(end, Math.min(text.length, end + CONTEXT_LEN)));

  if (expectedBefore) {
    const tail = expectedBefore.slice(-Math.min(18, expectedBefore.length));
    if (tail && !sliceBefore.endsWith(tail) && !sliceBefore.includes(tail)) return false;
  }
  if (expectedAfter) {
    const head = expectedAfter.slice(0, Math.min(18, expectedAfter.length));
    if (head && !sliceAfter.startsWith(head) && !sliceAfter.includes(head)) return false;
  }
  return true;
}

function findPlainAnchorWithContext(current, anchor, beforeCtx, afterCtx) {
  const text = safeString(current);
  const anchorText = safeString(anchor).trim();
  if (!anchorText) return -1;

  const protectedRanges = collectProtectedWikiRanges(text);
  const lower = text.toLowerCase();
  const anchorLower = anchorText.toLowerCase();
  let searchFrom = 0;

  while (searchFrom < text.length) {
    const index = lower.indexOf(anchorLower, searchFrom);
    if (index < 0) return -1;
    const end = index + anchorText.length;
    if (
      !isInsideProtectedRange(protectedRanges, index, end) &&
      contextMatches(text, index, end, beforeCtx, afterCtx)
    ) {
      return index;
    }
    searchFrom = index + 1;
  }
  return -1;
}

/**
 * Phát hiện [[anchor]] ở bản đã lưu mà bản nháp hiện để plain text cùng ngữ cảnh.
 */
export function detectWikiLinkOptOuts(previousText, currentText) {
  const previous = safeString(previousText);
  const current = safeString(currentText);
  if (!previous.includes('[[') || previous === current) return [];

  const found = [];
  const wikiRe = /\[\[([\s\S]*?)\]\]/g;
  let match;
  while ((match = wikiRe.exec(previous)) !== null) {
    const anchor = safeString(match[1]).trim();
    if (!anchor) continue;

    const wikiStart = match.index;
    const wikiEnd = wikiStart + match[0].length;
    const before = previous.slice(Math.max(0, wikiStart - CONTEXT_LEN), wikiStart);
    const after = previous.slice(wikiEnd, Math.min(previous.length, wikiEnd + CONTEXT_LEN));

    if (findPlainAnchorWithContext(current, anchor, before, after) < 0) continue;

    found.push({
      anchor,
      before: safeString(before).slice(-CONTEXT_LEN),
      after: safeString(after).slice(0, CONTEXT_LEN),
    });
  }
  return found;
}

export function pruneWikiLinkOptOuts(text, optOuts = []) {
  const current = safeString(text);
  if (!current) return [];
  return optOuts.filter((item) => {
    if (!item?.anchor) return false;
    return findPlainAnchorWithContext(current, item.anchor, item.before, item.after) >= 0;
  });
}

function resolveOptOutPlainRange(text, optOut) {
  const start = findPlainAnchorWithContext(text, optOut?.anchor, optOut?.before, optOut?.after);
  if (start < 0) return null;
  let end = start + safeString(optOut.anchor).trim().length;
  const afterPlain = safeString(optOut.after).replace(/^\s+/, '');
  if (afterPlain && safeString(text).slice(end).toLowerCase().startsWith(afterPlain.toLowerCase())) {
    end += afterPlain.length;
  }
  return { start, end };
}

export function isWikiWrapOptedOut(text, start, end, _anchor, optOuts = []) {
  if (!Array.isArray(optOuts) || optOuts.length === 0) return false;
  return optOuts.some((item) => {
    const range = resolveOptOutPlainRange(text, item);
    if (!range) return false;
    return start < range.end && end > range.start;
  });
}

/**
 * Người dùng để chữ thường nhưng auto-wrap/preview sẽ bọc — ghi nhớ luôn khi lưu.
 */
export function detectWikiLinkOptOutsFromPlainText(preparedText, entityMap, autoWrapWikiLinksByEntityMapWithCount) {
  const prepared = safeString(preparedText);
  if (!prepared || typeof autoWrapWikiLinksByEntityMapWithCount !== 'function') return [];

  const wrapped = autoWrapWikiLinksByEntityMapWithCount(prepared, entityMap, { optOuts: [] }).text;
  if (wrapped === prepared) return [];

  const found = [];
  const wikiRe = /\[\[([\s\S]*?)\]\]/g;
  let match;
  while ((match = wikiRe.exec(wrapped)) !== null) {
    const anchor = safeString(match[1]).trim();
    if (!anchor) continue;
    const wikiStart = match.index;
    const wikiEnd = wikiStart + match[0].length;
    const before = wrapped.slice(Math.max(0, wikiStart - CONTEXT_LEN), wikiStart);
    const after = wrapped.slice(wikiEnd, Math.min(wrapped.length, wikiEnd + CONTEXT_LEN));
    if (findPlainAnchorWithContext(prepared, anchor, before, after) < 0) continue;
    found.push({
      anchor,
      before: safeString(before).slice(-CONTEXT_LEN),
      after: safeString(after).slice(0, CONTEXT_LEN),
    });
  }
  return found;
}

export function applyWikiLinkOptOutsForSave({
  savedInfo = '',
  preparedText = '',
  wikiLinkOptOuts = [],
  entityMap = [],
  autoWrapWikiLinksByEntityMapWithCount,
}) {
  const detected = mergeWikiLinkOptOuts(
    detectWikiLinkOptOuts(savedInfo, preparedText),
    detectWikiLinkOptOutsFromPlainText(preparedText, entityMap, autoWrapWikiLinksByEntityMapWithCount)
  );
  const merged = pruneWikiLinkOptOuts(
    preparedText,
    mergeWikiLinkOptOuts(wikiLinkOptOuts, detected)
  );
  const wrapped = autoWrapWikiLinksByEntityMapWithCount(preparedText, entityMap, { optOuts: merged });
  return {
    text: wrapped.text,
    wikiLinkOptOuts: merged,
    detectedCount: detected.length,
  };
}
