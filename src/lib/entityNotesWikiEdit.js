// ==========================================
// Sửa [[wiki-link]] theo range — không replace toàn văn bản.
// Ai dùng: MasterUtils (toolbar), autocomplete ghi chép.
// ==========================================

import { resolveWikiUnwrapRange } from './wikiLinkOptOut.js';

export function replaceTextRange(text, start, end, replacement) {
  const source = String(text ?? '');
  const s = Math.max(0, Math.min(Number(start) || 0, source.length));
  const e = Math.max(s, Math.min(Number(end) || 0, source.length));
  const rep = String(replacement ?? '');
  return {
    newText: source.slice(0, s) + rep + source.slice(e),
    selStart: s,
    selEnd: s + rep.length,
  };
}

/** Liệt kê mọi [[...]] (bỏ qua khối ```). */
export function collectWikiLinkRanges(text, options = {}) {
  const skipCodeFences = options.skipCodeFences !== false;
  const source = String(text ?? '');
  const ranges = [];
  let inFence = false;
  let lineStart = 0;
  while (lineStart <= source.length) {
    const lineBreak = source.indexOf('\n', lineStart);
    const lineEnd = lineBreak === -1 ? source.length : lineBreak;
    const line = source.slice(lineStart, lineEnd);
    const trimmed = line.trimStart();
    if (skipCodeFences && trimmed.startsWith('```')) {
      inFence = !inFence;
    } else if (!inFence) {
      let j = 0;
      while (j < line.length) {
        const openRel = line.indexOf('[[', j);
        if (openRel === -1) break;
        const closeRel = line.indexOf(']]', openRel + 2);
        if (closeRel === -1) break;
        const absStart = lineStart + openRel;
        const absEnd = lineStart + closeRel + 2;
        ranges.push({
          start: absStart,
          end: absEnd,
          inner: source.slice(absStart + 2, absEnd - 2),
        });
        j = closeRel + 2;
      }
    }
    if (lineBreak === -1) break;
    lineStart = lineBreak + 1;
  }
  return ranges;
}

/** Một wiki-link duy nhất giao với [selStart, selEnd). */
export function findWikiLinkRangeContaining(text, selStart, selEnd) {
  const start = Math.max(0, Number(selStart) || 0);
  const end = Math.max(start, Number(selEnd) || start);
  const hits = collectWikiLinkRanges(text).filter((r) => start < r.end && end > r.start);
  if (hits.length !== 1) return null;
  return hits[0];
}

export function findWikiLinkRangeAtCaret(text, caret) {
  const source = String(text ?? '');
  const pos = Math.max(0, Math.min(Number(caret) || 0, source.length));
  const inside = findWikiLinkRangeContaining(source, pos, pos);
  if (inside) return inside;
  if (pos >= 2 && source.slice(pos - 2, pos) === ']]') {
    const end = pos;
    const start = source.lastIndexOf('[[', Math.max(0, end - 2));
    if (start >= 0 && end - start >= 4) {
      return { start, end, inner: source.slice(start + 2, end - 2) };
    }
  }
  return null;
}

/**
 * Gỡ [[...]] — chỉ thay đúng một link; không strip regex trên vùng chọn lẻ.
 */
export function unwrapWikiLinkSelection(text, selStart, selEnd) {
  const source = String(text ?? '');
  const start = Math.max(0, Math.min(Number(selStart) || 0, source.length));
  const end = Math.max(start, Math.min(Number(selEnd) || start, source.length));

  let range = null;
  if (start === end) {
    range = findWikiLinkRangeAtCaret(source, start);
  }
  if (!range) {
    const legacy = resolveWikiUnwrapRange(source, start, end);
    if (!legacy) {
      return { newText: source, selStart: start, selEnd: end, changed: false };
    }
    range =
      findWikiLinkRangeContaining(source, legacy.wikiStart, legacy.wikiEnd) ||
      { start: legacy.wikiStart, end: legacy.wikiEnd, inner: legacy.anchor };
  }

  if (start < end) {
    const picked = source.slice(start, end);
    if (picked.startsWith('[[') && picked.endsWith(']]') && picked.length >= 4) {
      const inner = picked.slice(2, -2);
      const out = replaceTextRange(source, start, end, inner);
      return {
        ...out,
        changed: true,
        unwrapStart: start,
        unwrapEnd: end,
      };
    }
    if (start !== range.start || end !== range.end) {
      if (start >= range.start && end <= range.end) {
        const inner = range.inner;
        const out = replaceTextRange(source, range.start, range.end, inner);
        const offsetInInner = Math.max(0, start - range.start - 2);
        const selLen = Math.max(0, Math.min(end, range.end - 2) - Math.max(start, range.start + 2));
        return {
          ...out,
          selStart: range.start + offsetInInner,
          selEnd: range.start + offsetInInner + selLen,
          changed: true,
          unwrapStart: range.start,
          unwrapEnd: range.end,
        };
      }
      return { newText: source, selStart: start, selEnd: end, changed: false };
    }
  }

  const inner = range.inner;
  const out = replaceTextRange(source, range.start, range.end, inner);
  const caretInInner = Math.max(0, Math.min(start - range.start - 2, inner.length));
  const caret = range.start + caretInInner;
  return {
    newText: out.newText,
    selStart: caret,
    selEnd: caret,
    changed: true,
    unwrapStart: range.start,
    unwrapEnd: range.end,
  };
}

/**
 * Bọc selection bằng [[...]]; không lồng; không bọc khi đã nằm trong link.
 */
export function wrapSelectionAsWikiLink(text, selStart, selEnd, options = {}) {
  const source = String(text ?? '');
  const start = Math.max(0, Math.min(Number(selStart) || 0, source.length));
  const end = Math.max(start, Math.min(Number(selEnd) || start, source.length));
  const maxPrefix = Number(options.maxPrefix) || 56;

  if (findWikiLinkRangeContaining(source, start, end) || findWikiLinkRangeAtCaret(source, start)) {
    return { newText: source, selStart: start, selEnd: end, changed: false };
  }

  if (start < end) {
    const inner = source.slice(start, end);
    const trimmed = inner.trim();
    if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
      return { newText: source, selStart: start, selEnd: end, changed: false };
    }
    const out = replaceTextRange(source, start, end, `[[${inner}]]`);
    return {
      newText: out.newText,
      selStart: start + 2,
      selEnd: start + 2 + inner.length,
      changed: true,
    };
  }

  const pos = start;
  if (findWikiLinkRangeAtCaret(source, pos)) {
    return { newText: source, selStart: pos, selEnd: pos, changed: false };
  }

  const lineStart = source.lastIndexOf('\n', Math.max(0, pos - 1)) + 1;
  let l = lineStart;
  let r = pos;
  while (r > l && /\s/.test(source[r - 1])) r -= 1;
  while (l < r && /\s/.test(source[l])) l += 1;
  if (r <= l) {
    const out = replaceTextRange(source, pos, pos, '[[]]');
    const caret = pos + 2;
    return { newText: out.newText, selStart: caret, selEnd: caret, changed: true };
  }
  let wrapL = l;
  let wrapR = r;
  if (r - l > maxPrefix) {
    let l2 = r;
    while (l2 > lineStart && !/\s/.test(source[l2 - 1])) l2 -= 1;
    while (l2 < r && /\s/.test(source[l2])) l2 += 1;
    if (l2 < r) {
      wrapL = l2;
      wrapR = r;
    }
  }
  const inner = source.slice(wrapL, wrapR);
  const out = replaceTextRange(source, wrapL, wrapR, `[[${inner}]]`);
  const caret = wrapL + 2 + inner.length + 2;
  return { newText: out.newText, selStart: caret, selEnd: caret, changed: true };
}

export function replaceWikiLinkTarget(text, selStart, selEnd, nextTarget) {
  const source = String(text ?? '');
  const start = Math.max(0, Math.min(Number(selStart) || 0, source.length));
  const end = Math.max(start, Math.min(Number(selEnd) || start, source.length));
  const range = findWikiLinkRangeContaining(source, start, end);
  if (!range) {
    return { newText: source, selStart: start, selEnd: end, changed: false };
  }
  const target = String(nextTarget ?? '').trim();
  const out = replaceTextRange(source, range.start + 2, range.end - 2, target);
  const caret = range.start + 2 + target.length;
  return {
    newText: out.newText,
    selStart: caret,
    selEnd: caret,
    changed: true,
  };
}

export function toggleWikiLinkSelection(text, selStart, selEnd) {
  const start = Math.max(0, Number(selStart) || 0);
  const end = Math.max(start, Number(selEnd) || start);
  const selectedInsideWiki =
    start < end &&
    String(text).slice(Math.max(0, start - 2), start) === '[[' &&
    String(text).slice(end, end + 2) === ']]';

  if (selectedInsideWiki) {
    const inner = String(text).slice(start, end);
    const out = replaceTextRange(text, start - 2, end + 2, inner);
    return {
      ...out,
      mode: 'unwrap',
      unwrapStart: start - 2,
      unwrapEnd: end + 2,
      changed: true,
    };
  }

  const unwrapped = unwrapWikiLinkSelection(text, start, end);
  if (unwrapped.changed) {
    return { ...unwrapped, mode: 'unwrap' };
  }

  const wrapped = wrapSelectionAsWikiLink(text, start, end);
  return { ...wrapped, mode: wrapped.changed ? 'wrap' : 'noop' };
}
