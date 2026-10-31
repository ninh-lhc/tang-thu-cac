/**
 * Ghi nhớ chỗ người dùng đã gỡ [[wiki]] — auto-wrap khi lưu sẽ không bọc lại cùng ngữ cảnh.
 */
import { matchesWikiNameSurface } from './wikiNameSurface.js';

const CONTEXT_LEN = 40;

function safeString(value) {
  if (value == null || value === 'null' || value === 'undefined') return '';
  return String(value);
}

export function normalizeWikiOptOutContext(value) {
  return safeString(value).replace(/\s+/g, ' ').trim();
}

export function buildWikiLinkOptOutKey(optOut) {
  const anchor = normalizeWikiOptOutContext(optOut?.anchor);
  const before = normalizeWikiOptOutContext(optOut?.before);
  const after = normalizeWikiOptOutContext(optOut?.after);
  return `${before}\x1f${anchor}\x1f${after}`;
}

export function countNewWikiLinkOptOuts(previous = [], merged = []) {
  const keys = new Set(readWikiLinkOptOuts({ wikiLinkOptOuts: previous }).map(buildWikiLinkOptOutKey));
  return readWikiLinkOptOuts({ wikiLinkOptOuts: merged }).filter((item) => !keys.has(buildWikiLinkOptOutKey(item)))
    .length;
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

export function mergeWikiLinkOptOuts(...lists) {
  const map = new Map();
  const flat = lists.flatMap((list) => {
    if (!Array.isArray(list)) return [];
    return list.every((item) => item && typeof item === 'object' && 'anchor' in item)
      ? list
      : readWikiLinkOptOuts({ wikiLinkOptOuts: list });
  });
  flat.forEach((item) => {
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

/** Vùng [[...]] sắp được gỡ: chọn cả link, chọn phần trong link, hoặc con trỏ trong link. */
export function resolveWikiUnwrapRange(text, selStart, selEnd) {
  const source = safeString(text);
  const start = Math.max(0, Math.min(Number(selStart) || 0, source.length));
  const end = Math.max(start, Math.min(Number(selEnd) || start, source.length));

  if (start < end) {
    const picked = source.slice(start, end);
    if (picked.startsWith('[[') && picked.endsWith(']]') && picked.length >= 4) {
      const anchor = safeString(picked.slice(2, -2)).trim();
      if (!anchor) return null;
      return { wikiStart: start, wikiEnd: end, anchor };
    }
  }

  const left = source.lastIndexOf('[[', start);
  const right = source.indexOf(']]', start);
  if (left === -1 || right === -1 || left >= right) return null;
  const linkEnd = right + 2;
  if (end > linkEnd || start < left) return null;
  if (start < end && (start < left + 2 || end > right)) return null;
  if (start === end && (start < left + 2 || start > right)) return null;
  const anchor = safeString(source.slice(left + 2, right)).trim();
  if (!anchor) return null;
  return { wikiStart: left, wikiEnd: linkEnd, anchor };
}

/** Bỏ opt-out trùng vùng chữ vừa được bọc lại bằng Ctrl+G. */
export function removeWikiLinkOptOutsOverlapping(optOuts, text, start, end) {
  const rangeStart = Math.max(0, Number(start) || 0);
  const rangeEnd = Math.max(rangeStart, Number(end) || 0);
  if (rangeEnd <= rangeStart) return readWikiLinkOptOuts({ wikiLinkOptOuts: optOuts });
  return readWikiLinkOptOuts({ wikiLinkOptOuts: optOuts }).filter((item) => {
    const range = resolveOptOutPlainRange(text, item);
    if (!range) return true;
    return !(rangeStart < range.end && rangeEnd > range.start);
  });
}

/** Opt-out ngay khi bấm «Gỡ Wiki Link» — không cần đợi lưu. */
export function buildWikiLinkOptOutFromUnwrap(text, selStart, selEnd) {
  const range = resolveWikiUnwrapRange(text, selStart, selEnd);
  if (!range?.anchor) return null;
  const { wikiStart, wikiEnd, anchor } = range;
  return {
    anchor,
    before: sourceSliceContextBefore(text, wikiStart),
    after: sourceSliceContextAfter(text, wikiEnd),
  };
}

function sourceSliceContextBefore(text, index) {
  return safeString(text).slice(Math.max(0, index - CONTEXT_LEN), index).slice(-CONTEXT_LEN);
}

function sourceSliceContextAfter(text, index) {
  return safeString(text).slice(index, Math.min(text.length, index + CONTEXT_LEN)).slice(0, CONTEXT_LEN);
}

/** Map index trên bản đã auto-wrap về index trên plain (chỉ chèn [[ ]], không đổi chữ). */
function plainIndexAtWrappedIndex(prepared, wrapped, wrappedIndex) {
  let pi = 0;
  let wi = 0;
  const target = Math.max(0, Number(wrappedIndex) || 0);
  while (wi < target && wi < wrapped.length && pi <= prepared.length) {
    if (wrapped.startsWith('[[', wi)) {
      const close = wrapped.indexOf(']]', wi + 2);
      if (close < 0) return -1;
      const inner = wrapped.slice(wi + 2, close);
      const anchor = inner.trim();
      if (!anchor) return -1;
      const lower = prepared.toLowerCase();
      const anchorLower = anchor.toLowerCase();
      let found = -1;
      for (let searchFrom = pi; searchFrom < prepared.length; searchFrom += 1) {
        const index = lower.indexOf(anchorLower, searchFrom);
        if (index < 0) break;
        if (index > pi + 2) break;
        const end = index + inner.length;
        const slice = prepared.slice(index, Math.min(prepared.length, end));
        if (matchesWikiNameSurface(anchor, slice) || slice === inner) {
          found = index + inner.length;
          break;
        }
        searchFrom = index;
      }
      if (found < 0) return -1;
      pi = found;
      wi = close + 2;
      continue;
    }
    if (prepared[pi] !== wrapped[wi]) return -1;
    pi += 1;
    wi += 1;
  }
  return pi;
}

/**
 * Opt-out đang hiệu lực: chỉ chỗ Ctrl+G đã gỡ (stored + pending).
 * Mất [[...]] do gõ/xóa/paste không tạo opt-out. Link được bọc lại thì prune bỏ opt-out cũ.
 */
export function resolveEffectiveWikiLinkOptOuts({
  stored = [],
  pending = [],
  draftText = '',
} = {}) {
  return pruneWikiLinkOptOuts(draftText, mergeWikiLinkOptOuts(stored, pending));
}

/**
 * So sánh bản lưu và bản nháp. Không dùng khi lưu: mất [[...]] do gõ thường không phải opt-out.
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
      before: sourceSliceContextBefore(previous, wikiStart),
      after: sourceSliceContextAfter(previous, wikiEnd),
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
export function detectWikiLinkOptOutsFromPlainText(
  preparedText,
  entityMap,
  autoWrapWikiLinksByEntityMapWithCount,
  prewrappedText = null
) {
  const prepared = safeString(preparedText);
  if (!prepared) return [];
  if (prewrappedText == null && typeof autoWrapWikiLinksByEntityMapWithCount !== 'function') return [];

  const wrapped =
    prewrappedText != null
      ? safeString(prewrappedText)
      : autoWrapWikiLinksByEntityMapWithCount(prepared, entityMap, { optOuts: [] }).text;
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
    const plainIndex = findPlainAnchorWithContext(prepared, anchor, before, after);
    if (plainIndex < 0) continue;
    const plainSlice = prepared.slice(plainIndex, plainIndex + anchor.length);
    // Chỉ opt-out khi bề mặt chữ plain khác thẻ (vd. chữ thường) — không chặn lần nhắc
    // cùng tên chưa kịp bọc khi đoạn văn đã có chỗ [[...]] khác.
    if (matchesWikiNameSurface(anchor, plainSlice)) continue;
    found.push({
      anchor,
      before: sourceSliceContextBefore(wrapped, wikiStart),
      after: sourceSliceContextAfter(wrapped, wikiEnd),
    });
  }
  return found;
}

/**
 * Gỡ [[...]] tại vị trí opt-out trên bản đã auto-wrap (không opt-out) — tương đương autoWrap(..., { optOuts }).
 */
export function applyMergedOptOutsToAutoWrappedText(preparedText, wrappedText, optOuts = []) {
  if (!Array.isArray(optOuts) || optOuts.length === 0) return safeString(wrappedText);
  const prepared = safeString(preparedText);
  const wrapped = safeString(wrappedText);
  if (!wrapped || !prepared) return wrapped;

  let out = '';
  let cursor = 0;
  const wikiRe = /\[\[([\s\S]*?)\]\]/g;
  let match;
  while ((match = wikiRe.exec(wrapped)) !== null) {
    const wikiStart = match.index;
    const wikiEnd = wikiStart + match[0].length;
    out += wrapped.slice(cursor, wikiStart);
    const anchor = safeString(match[1]).trim();
    const plainStart = plainIndexAtWrappedIndex(prepared, wrapped, wikiStart);
    const plainEnd = plainIndexAtWrappedIndex(prepared, wrapped, wikiEnd);
    let replacement = match[0];
    if (plainStart >= 0 && plainEnd > plainStart && anchor) {
      if (isWikiWrapOptedOut(prepared, plainStart, plainEnd, anchor, optOuts)) {
        replacement = prepared.slice(plainStart, plainEnd);
      }
    }
    out += replacement;
    cursor = wikiEnd;
  }
  out += wrapped.slice(cursor);
  return out;
}

export function applyWikiLinkOptOutsForSave({
  preparedText = '',
  wikiLinkOptOuts = [],
  entityMap = [],
  autoWrapWikiLinksByEntityMapWithCount,
  autoWrapOnSave = false,
  preDetectedOptOuts = [],
  tierLabelSet = null,
}) {
  const storedBefore = readWikiLinkOptOuts({ wikiLinkOptOuts });
  const wrapOpts = {
    tierLabelSet: tierLabelSet instanceof Set ? tierLabelSet : null,
  };
  let wrapNoOptOuts = null;
  const fromPlain =
    autoWrapOnSave && typeof autoWrapWikiLinksByEntityMapWithCount === 'function'
      ? (() => {
          wrapNoOptOuts = autoWrapWikiLinksByEntityMapWithCount(preparedText, entityMap, {
            ...wrapOpts,
            optOuts: [],
          });
          return detectWikiLinkOptOutsFromPlainText(
            preparedText,
            entityMap,
            autoWrapWikiLinksByEntityMapWithCount,
            wrapNoOptOuts.text
          );
        })()
      : [];
  const detected = mergeWikiLinkOptOuts(preDetectedOptOuts, fromPlain);
  const merged = pruneWikiLinkOptOuts(
    preparedText,
    mergeWikiLinkOptOuts(wikiLinkOptOuts, detected)
  );
  const detectedCount = countNewWikiLinkOptOuts(storedBefore, merged);
  if (!autoWrapOnSave || typeof autoWrapWikiLinksByEntityMapWithCount !== 'function') {
    return {
      text: preparedText,
      wikiLinkOptOuts: merged,
      detectedCount,
    };
  }
  let finalText;
  if (wrapNoOptOuts) {
    finalText =
      merged.length > 0
        ? applyMergedOptOutsToAutoWrappedText(preparedText, wrapNoOptOuts.text, merged)
        : wrapNoOptOuts.text;
  } else {
    finalText = autoWrapWikiLinksByEntityMapWithCount(preparedText, entityMap, {
      ...wrapOpts,
      optOuts: merged,
    }).text;
  }
  return {
    text: finalText,
    wikiLinkOptOuts: merged,
    detectedCount,
  };
}

async function resolveAutoWrapResult(maybePromise) {
  const result = await maybePromise;
  if (result && typeof result === 'object' && 'text' in result) return result;
  return { text: safeString(result), count: 0 };
}

function hasKnownWikiLinkOptOutsAtSave(storedBefore, preDetectedOptOuts) {
  return storedBefore.length > 0 || preDetectedOptOuts.length > 0;
}

/** Save path: auto-wrap có thể chạy async (Web Worker). Chỉ gọi wrap một lần (optOuts: []). */
export async function applyWikiLinkOptOutsForSaveAsync({
  preparedText = '',
  wikiLinkOptOuts = [],
  entityMap = [],
  autoWrapWikiLinksByEntityMapWithCount,
  autoWrapOnSave = false,
  preDetectedOptOuts = [],
  tierLabelSet = null,
}) {
  const storedBefore = readWikiLinkOptOuts({ wikiLinkOptOuts });
  const wrapOpts = {
    tierLabelSet: tierLabelSet instanceof Set ? tierLabelSet : null,
  };
  let wrapNoOptOuts = null;
  if (autoWrapOnSave && typeof autoWrapWikiLinksByEntityMapWithCount === 'function') {
    wrapNoOptOuts = await resolveAutoWrapResult(
      autoWrapWikiLinksByEntityMapWithCount(preparedText, entityMap, {
        ...wrapOpts,
        optOuts: [],
      })
    );
    if (!hasKnownWikiLinkOptOutsAtSave(storedBefore, preDetectedOptOuts)) {
      if (wrapNoOptOuts.text === preparedText) {
        return {
          text: preparedText,
          wikiLinkOptOuts: [],
          detectedCount: 0,
        };
      }
      const fromPlainOnly = detectWikiLinkOptOutsFromPlainText(
        preparedText,
        entityMap,
        null,
        wrapNoOptOuts.text
      );
      if (fromPlainOnly.length === 0) {
        return {
          text: wrapNoOptOuts.text,
          wikiLinkOptOuts: [],
          detectedCount: 0,
        };
      }
    }
  }
  let fromPlain = [];
  if (wrapNoOptOuts) {
    fromPlain = detectWikiLinkOptOutsFromPlainText(
      preparedText,
      entityMap,
      null,
      wrapNoOptOuts.text
    );
  }
  const detected = mergeWikiLinkOptOuts(preDetectedOptOuts, fromPlain);
  const merged = pruneWikiLinkOptOuts(
    preparedText,
    mergeWikiLinkOptOuts(wikiLinkOptOuts, detected)
  );
  const detectedCount = countNewWikiLinkOptOuts(storedBefore, merged);
  if (!autoWrapOnSave || !wrapNoOptOuts) {
    return {
      text: preparedText,
      wikiLinkOptOuts: merged,
      detectedCount,
    };
  }
  const finalText =
    merged.length > 0
      ? applyMergedOptOutsToAutoWrappedText(preparedText, wrapNoOptOuts.text, merged)
      : wrapNoOptOuts.text;
  return {
    text: finalText,
    wikiLinkOptOuts: merged,
    detectedCount,
  };
}
