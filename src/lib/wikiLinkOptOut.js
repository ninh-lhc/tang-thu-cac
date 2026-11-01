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
  return safeString(value)
    .replace(/\s+/g, ' ')
    .replace(/ ([,.;:!?])/g, '$1')
    .trim();
}

function escapeRegExp(value) {
  return safeString(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collapseSpaces(value) {
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

function listPlainAnchorHits(current, anchor) {
  const text = safeString(current);
  const anchorText = safeString(anchor).trim();
  if (!anchorText) return [];

  const parts = anchorText.split(/\s+/).filter(Boolean).map(escapeRegExp);
  if (parts.length === 0) return [];
  const matcher = new RegExp(parts.join('\\s+'), 'giu');
  const protectedRanges = collectProtectedWikiRanges(text);
  const hits = [];
  let match;
  while ((match = matcher.exec(text)) !== null) {
    if (match[0].length === 0) {
      matcher.lastIndex += 1;
      continue;
    }
    const start = match.index;
    const end = start + match[0].length;
    if (!isInsideProtectedRange(protectedRanges, start, end)) hits.push({ start, end });
  }
  return hits;
}

function findPlainAnchorWithContext(current, anchor, beforeCtx, afterCtx) {
  const text = safeString(current);
  for (const hit of listPlainAnchorHits(text, anchor)) {
    if (contextMatches(text, hit.start, hit.end, beforeCtx, afterCtx)) return hit;
  }
  return null;
}

/**
 * Opt-out ghi trên text A (editor lúc Ctrl+G) nhưng save so trên text B
 * (sau cleanup / đánh số lại list). Giữ đúng occurrence theo thứ tự, rồi
 * ghi lại before/after trên text B — không kéo dài context để né lệch.
 */
export function retargetWikiLinkOptOuts(beforeText, afterText, optOuts = []) {
  const before = safeString(beforeText);
  const after = safeString(afterText);
  if (!after) return [];
  if (before === after) return readWikiLinkOptOuts({ wikiLinkOptOuts: optOuts });

  const next = [];
  const used = new Set();
  for (const item of readWikiLinkOptOuts({ wikiLinkOptOuts: optOuts })) {
    const beforeHits = listPlainAnchorHits(before, item.anchor);
    const selected = findPlainAnchorWithContext(before, item.anchor, item.before, item.after);
    if (!selected) continue;
    const ordinal = beforeHits.findIndex((hit) => hit.start === selected.start && hit.end === selected.end);
    if (ordinal < 0) continue;
    const afterHits = listPlainAnchorHits(after, item.anchor);
    const dest = afterHits[ordinal];
    if (!dest) continue;
    const canon = collapseSpaces(after.slice(dest.start, dest.end));
    const key = `${ordinal}\x1f${canon}`;
    if (used.has(key)) continue;
    used.add(key);
    next.push({
      anchor: after.slice(dest.start, dest.end),
      before: after.slice(Math.max(0, dest.start - CONTEXT_LEN), dest.start),
      after: after.slice(dest.end, Math.min(after.length, dest.end + CONTEXT_LEN)),
    });
  }
  return next;
}

function resolveSaveOptOutInputs({
  preparedText = '',
  sourceText = null,
  wikiLinkOptOuts = [],
  preDetectedOptOuts = [],
}) {
  const storedBefore = readWikiLinkOptOuts({ wikiLinkOptOuts });
  const pending = Array.isArray(preDetectedOptOuts) ? preDetectedOptOuts : [];
  if (sourceText == null || safeString(sourceText) === safeString(preparedText)) {
    return { storedBefore, stored: storedBefore, pending };
  }
  return {
    storedBefore,
    stored: retargetWikiLinkOptOuts(sourceText, preparedText, storedBefore),
    pending: retargetWikiLinkOptOuts(sourceText, preparedText, pending),
  };
}

/** Chỉ nối một token tên ngay sau anchor (vd. «Hồng Lâu» + « Mộng»), không nuốt cả đoạn sau. */
function leadingOptOutContinuation(after) {
  const match = safeString(after).match(/^[ \t]+[\p{L}\p{N}][\p{L}\p{N}_'’-]*/u);
  return match ? match[0] : '';
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
    if (wrapped.startsWith('[[', wi) && prepared.startsWith('[[', pi)) {
      const wrappedClose = wrapped.indexOf(']]', wi + 2);
      const preparedClose = prepared.indexOf(']]', pi + 2);
      if (wrappedClose >= 0 && preparedClose >= 0) {
        const wrappedLink = wrapped.slice(wi, wrappedClose + 2);
        const preparedLink = prepared.slice(pi, preparedClose + 2);
        if (wrappedLink === preparedLink) {
          wi = wrappedClose + 2;
          pi = preparedClose + 2;
          continue;
        }
      }
    }
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

    if (!findPlainAnchorWithContext(current, anchor, before, after)) continue;

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
    return findPlainAnchorWithContext(current, item.anchor, item.before, item.after) != null;
  });
}

function resolveOptOutPlainRange(text, optOut) {
  const found = findPlainAnchorWithContext(text, optOut?.anchor, optOut?.before, optOut?.after);
  if (!found) return null;
  let { start, end } = found;
  const continuation = leadingOptOutContinuation(optOut?.after);
  const tail = safeString(text).slice(end);
  if (continuation && tail.toLowerCase().startsWith(continuation.toLowerCase())) {
    end += continuation.length;
  }
  return { start, end };
}

/**
 * Vị trí chữ thường còn bị opt-out trên đúng bản text gốc.
 * Renderer phải che các vùng này trước khi cắt dòng / cắt [[link]] lân cận,
 * vì mảnh còn lại không còn before/after để isWikiWrapOptedOut nhận ra.
 */
export function listWikiLinkOptOutRanges(text, optOuts = []) {
  const ranges = [];
  for (const item of readWikiLinkOptOuts({ wikiLinkOptOuts: optOuts })) {
    const range = resolveOptOutPlainRange(text, item);
    if (!range || range.end <= range.start) continue;
    ranges.push(range);
  }
  ranges.sort((a, b) => a.start - b.start || a.end - b.end);
  const merged = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range.start < last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ start: range.start, end: range.end });
    }
  }
  return merged;
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
    const plainHit = findPlainAnchorWithContext(prepared, anchor, before, after);
    if (!plainHit) continue;
    const plainSlice = prepared.slice(plainHit.start, plainHit.end);
    // Chỉ opt-out khi bề mặt chữ plain khác thẻ (vd. chữ thường) — không chặn lần nhắc
    // cùng tên chưa kịp bọc khi đoạn văn đã có chỗ [[...]] khác.
    if (matchesWikiNameSurface(collapseSpaces(anchor), collapseSpaces(plainSlice))) continue;
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
    const inner = safeString(match[1]);
    const anchor = inner.trim();
    const plainStart = plainIndexAtWrappedIndex(prepared, wrapped, wikiStart);
    const plainEnd = plainIndexAtWrappedIndex(prepared, wrapped, wikiEnd);
    let replacement = match[0];
    if (plainStart >= 0 && plainEnd > plainStart && anchor) {
      if (isWikiWrapOptedOut(prepared, plainStart, plainEnd, anchor, optOuts)) {
        const plainSlice = prepared.slice(plainStart, plainEnd);
        if (collapseSpaces(plainSlice) === collapseSpaces(anchor) || plainSlice === inner) {
          replacement = plainSlice;
        }
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
  sourceText = null,
  wikiLinkOptOuts = [],
  entityMap = [],
  autoWrapWikiLinksByEntityMapWithCount,
  autoWrapOnSave = false,
  preDetectedOptOuts = [],
  tierLabelSet = null,
}) {
  const { storedBefore, stored, pending } = resolveSaveOptOutInputs({
    preparedText,
    sourceText,
    wikiLinkOptOuts,
    preDetectedOptOuts,
  });
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
  const detected = mergeWikiLinkOptOuts(pending, fromPlain);
  const merged = pruneWikiLinkOptOuts(
    preparedText,
    mergeWikiLinkOptOuts(stored, detected)
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
    wikiLinkOptOuts: optOutsMatchingSavedText(preparedText, finalText, merged),
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
  sourceText = null,
  wikiLinkOptOuts = [],
  entityMap = [],
  autoWrapWikiLinksByEntityMapWithCount,
  autoWrapOnSave = false,
  preDetectedOptOuts = [],
  tierLabelSet = null,
}) {
  const { storedBefore, stored, pending } = resolveSaveOptOutInputs({
    preparedText,
    sourceText,
    wikiLinkOptOuts,
    preDetectedOptOuts,
  });
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
    if (!hasKnownWikiLinkOptOutsAtSave(stored, pending)) {
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
  const detected = mergeWikiLinkOptOuts(pending, fromPlain);
  const merged = pruneWikiLinkOptOuts(
    preparedText,
    mergeWikiLinkOptOuts(stored, detected)
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
    wikiLinkOptOuts: optOutsMatchingSavedText(preparedText, finalText, merged),
    detectedCount,
  };
}

/** Opt-out lưu kèm bản đã auto-wrap phải khớp chính bản đó, kể cả khi [[ ]] được chèn vào before/after. */
function optOutsMatchingSavedText(preparedText, finalText, optOuts) {
  if (safeString(preparedText) === safeString(finalText)) return optOuts;
  return retargetWikiLinkOptOuts(preparedText, finalText, optOuts);
}
