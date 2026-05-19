// ==========================================
// Chẩn đoán + sửa lỗi định dạng cho Ghi Chép Chi Tiết.
// Báo vị trí để nhảy tới editor, kèm fix nhanh cho các lỗi nhẹ phổ biến.
// ==========================================

import { cleanupEntityNotesText } from './entityNotesTextCleanup.js';
import { resolveEntityNotesCallout } from './entityNotesSemantics.js';

const INLINE_COLOR_OPEN_RE = /\[color=([^\]]+)\]/g;
const INLINE_COLOR_CLOSE_RE = /\[\/color\]/g;
const INLINE_COLOR_VALID_VALUE_RE = /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)$/;
const QUOTE_CALLOUT_RE = /^\s*>\s*\[!([A-Z_-]+)\](?:\s+(.*))?$/i;
const ORDERED_LINE_RE = /^(\s*)(\d+)\.\s+/;

const DEFAULT_COLOR = '#c084fc';

function countMatches(text, regex) {
  return [...String(text || '').matchAll(regex)].length;
}

function getLineAndColumn(src, index) {
  const safeIndex = Math.max(0, Math.min(Number(index) || 0, src.length));
  const before = src.slice(0, safeIndex);
  const line = before.split('\n').length;
  const column = safeIndex - before.lastIndexOf('\n');
  return { line, column };
}

function findLineStartIndex(src, lineNumber) {
  if (!Number.isFinite(lineNumber) || lineNumber <= 1) return 0;
  let cursor = 0;
  let line = 1;
  while (line < lineNumber && cursor < src.length) {
    const nextBreak = src.indexOf('\n', cursor);
    if (nextBreak === -1) break;
    cursor = nextBreak + 1;
    line += 1;
  }
  return cursor;
}

function makeDiagnostic(src, partial) {
  const start = Math.max(0, Math.min(Number(partial.start) || 0, src.length));
  const end = Math.max(start, Math.min(Number(partial.end) || start, src.length));
  const pos = getLineAndColumn(src, start);
  return {
    ...partial,
    start,
    end,
    line: partial.line ?? pos.line,
    column: partial.column ?? pos.column,
  };
}

function replaceRange(text, start, end, nextChunk) {
  return text.slice(0, start) + nextChunk + text.slice(end);
}

/** Che wiki link đã khép để đếm `**` / `~~` không bị nhiễu bởi nội dung trong `[[...]]`. */
function maskBalancedWikiLinks(text) {
  return String(text || '').replace(/\[\[[\s\S]*?\]\]/g, (match) => ' '.repeat(match.length));
}

function getLineRange(src, index) {
  const safe = Math.max(0, Math.min(Number(index) || 0, src.length));
  const start = src.lastIndexOf('\n', Math.max(0, safe - 1)) + 1;
  const nextBreak = src.indexOf('\n', safe);
  const end = nextBreak === -1 ? src.length : nextBreak;
  return { start, end };
}

function isIndexOnCaretLine(src, index, caretIndex) {
  if (!Number.isFinite(caretIndex)) return false;
  const line = getLineRange(src, caretIndex);
  return index >= line.start && index < line.end;
}

/** Đang gõ trên cùng dòng, sau marker mở — chưa cần báo lỗi khép. */
function shouldSuppressUnclosedOnCaretLine(src, markerStart, markerLength, caretIndex) {
  if (!Number.isFinite(caretIndex)) return false;
  const start = Math.max(0, Number(markerStart) || 0);
  if (!isIndexOnCaretLine(src, start, caretIndex)) return false;
  return caretIndex >= start + Math.max(1, Number(markerLength) || 1);
}

function findUnbalancedPairMarkers(src, marker) {
  const masked = maskBalancedWikiLinks(src);
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...masked.matchAll(new RegExp(`(?<!\\\\)${escaped}`, 'g'))];
}

function renumberOrderedLists(text) {
  const lines = String(text || '').split('\n');
  const nextExpectedByIndent = new Map();
  for (let index = 0; index < lines.length; index += 1) {
    const line = String(lines[index] || '');
    const match = line.match(ORDERED_LINE_RE);
    if (match) {
      const indent = match[1] || '';
      const indentSize = indent.length;
      const rest = line.slice(match[0].length);
      const expected = nextExpectedByIndent.get(indentSize) ?? 1;
      nextExpectedByIndent.forEach((_value, key) => {
        if (key > indentSize) nextExpectedByIndent.delete(key);
      });
      lines[index] = `${indent}${expected}. ${rest}`;
      nextExpectedByIndent.set(indentSize, expected + 1);
      continue;
    }
    if (line.trim()) nextExpectedByIndent.clear();
  }
  return lines.join('\n');
}

/** Khép marker trên từng dòng — tránh chèn `**` / `~~` ở cuối cả văn bản (hay gặp sau AI dàn khung). */
function fixUnbalancedPair(text, marker) {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?<!\\\\)${escaped}`, 'g');
  return String(text || '')
    .split('\n')
    .map((line) => {
      const masked = maskBalancedWikiLinks(line);
      const matches = [...masked.matchAll(re)];
      if (matches.length % 2 === 0) return line;
      return line + marker;
    })
    .join('\n');
}

function fixWikiBalancePerLine(text) {
  return String(text || '')
    .split('\n')
    .map((line) => {
      const openCount = countMatches(line, /\[\[/g);
      const closeCount = countMatches(line, /\]\]/g);
      if (openCount > closeCount) {
        return line + ']]'.repeat(openCount - closeCount);
      }
      if (closeCount > openCount) {
        let next = line;
        let remaining = closeCount - openCount;
        while (remaining > 0) {
          const lastClose = next.lastIndexOf(']]');
          if (lastClose === -1) break;
          next = replaceRange(next, lastClose, lastClose + 2, '');
          remaining -= 1;
        }
        return next;
      }
      return line;
    })
    .join('\n');
}

export function collectEntityNotesDiagnostics(text, options = {}) {
  const src = String(text || '');
  const { caretIndex = null, suppressTransientWhileTyping = false } = options || {};
  const warnings = [];

  const colonStarMatch = src.match(/\):\*(?!\*)/);
  if (colonStarMatch) {
    warnings.push(
      makeDiagnostic(src, {
        id: 'colon-star-typo',
        kind: 'colon-star-typo',
        label: 'Thiếu `**` sau dấu hai chấm (`):*` → `):**`).',
        start: colonStarMatch.index ?? 0,
        end: (colonStarMatch.index ?? 0) + colonStarMatch[0].length,
        fixable: true,
        fixLabel: 'Thêm `**`',
      })
    );
  }

  const boldMatches = findUnbalancedPairMarkers(src, '**');
  if (boldMatches.length % 2 !== 0) {
    const last = boldMatches.at(-1);
    const markerStart = last?.index ?? src.length;
    const suppress =
      suppressTransientWhileTyping &&
      shouldSuppressUnclosedOnCaretLine(src, markerStart, 2, caretIndex);
    if (!suppress) {
      warnings.push(
        makeDiagnostic(src, {
          id: 'bold-unclosed',
          kind: 'bold-unclosed',
          label: 'Có cặp `**` chưa khép.',
          start: markerStart,
          end: markerStart + 2,
          fixable: true,
          fixLabel: 'Khép `**`',
        })
      );
    }
  }

  const strikeMatches = findUnbalancedPairMarkers(src, '~~');
  if (strikeMatches.length % 2 !== 0) {
    const last = strikeMatches.at(-1);
    const markerStart = last?.index ?? src.length;
    const suppress =
      suppressTransientWhileTyping &&
      shouldSuppressUnclosedOnCaretLine(src, markerStart, 2, caretIndex);
    if (!suppress) {
      warnings.push(
        makeDiagnostic(src, {
          id: 'strike-unclosed',
          kind: 'strike-unclosed',
          label: 'Có cặp `~~` chưa khép.',
          start: markerStart,
          end: markerStart + 2,
          fixable: true,
          fixLabel: 'Khép `~~`',
        })
      );
    }
  }

  const wikiOpenCount = countMatches(src, /\[\[/g);
  const wikiCloseCount = countMatches(src, /\]\]/g);
  if (wikiOpenCount !== wikiCloseCount) {
    const lastOpen = src.lastIndexOf('[[');
    const lastClose = src.lastIndexOf(']]');
    const moreOpens = wikiOpenCount > wikiCloseCount;
    const markerStart = moreOpens ? Math.max(0, lastOpen) : Math.max(0, lastClose);
    const suppress =
      suppressTransientWhileTyping &&
      shouldSuppressUnclosedOnCaretLine(src, markerStart, 2, caretIndex);
    if (!suppress) {
      warnings.push(
        makeDiagnostic(src, {
          id: 'wiki-unclosed',
          kind: 'wiki-unclosed',
          label: 'Có wiki link `[[...]]` chưa khép đủ.',
          start: markerStart,
          end: markerStart + 2,
          fixable: true,
          fixLabel: 'Khép wiki',
        })
      );
    }
  }

  const colorOpenTags = [...src.matchAll(INLINE_COLOR_OPEN_RE)];
  const colorCloseCount = countMatches(src, INLINE_COLOR_CLOSE_RE);
  if (colorOpenTags.length !== colorCloseCount) {
    const lastOpen = colorOpenTags.at(-1);
    warnings.push(
      makeDiagnostic(src, {
        id: 'color-unclosed',
        kind: 'color-unclosed',
        label: 'Có thẻ `[color=...]` chưa đóng `[/color]`.',
        start: lastOpen?.index ?? src.length,
        end: (lastOpen?.index ?? src.length) + String(lastOpen?.[0] || '').length,
        fixable: true,
        fixLabel: 'Đóng màu',
      })
    );
  }

  const malformedColorMatch = src.match(/\[color(?!=[^\]]+\])/i);
  if (malformedColorMatch) {
    warnings.push(
      makeDiagnostic(src, {
        id: 'color-malformed',
        kind: 'color-malformed',
        label: 'Có cú pháp `[color]` chưa đúng định dạng.',
        start: malformedColorMatch.index ?? 0,
        end: (malformedColorMatch.index ?? 0) + malformedColorMatch[0].length,
        fixable: true,
        fixLabel: 'Sửa cú pháp màu',
      })
    );
  }

  const invalidColorTag = colorOpenTags.find((match) => !INLINE_COLOR_VALID_VALUE_RE.test(String(match[1] || '').trim()));
  if (invalidColorTag) {
    warnings.push(
      makeDiagnostic(src, {
        id: 'color-invalid-value',
        kind: 'color-invalid-value',
        label: 'Có màu chữ dùng giá trị không hợp lệ.',
        start: invalidColorTag.index ?? 0,
        end: (invalidColorTag.index ?? 0) + String(invalidColorTag[0] || '').length,
        fixable: true,
        fixLabel: 'Đặt lại màu',
      })
    );
  }

  const lines = src.split('\n');
  let previousOrderedByIndent = new Map();
  for (let index = 0; index < lines.length; index += 1) {
    const line = String(lines[index] || '');
    const trimmed = line.trim();
    const orderedMatch = line.match(ORDERED_LINE_RE);
    if (orderedMatch) {
      const indent = orderedMatch[1].length;
      const currentNumber = Number(orderedMatch[2]);
      const expected = previousOrderedByIndent.get(indent);
      if (Number.isFinite(expected) && expected !== currentNumber) {
        warnings.push(
          makeDiagnostic(src, {
            id: `ordered-gap-${index}`,
            kind: 'ordered-gap',
            label: `Danh sách số bị đứt mạch ở dòng ${index + 1}.`,
            start: findLineStartIndex(src, index + 1),
            end: findLineStartIndex(src, index + 1) + line.length,
            line: index + 1,
            fixable: true,
            fixLabel: 'Đánh số lại',
          })
        );
        break;
      }
      previousOrderedByIndent = new Map(
        [...previousOrderedByIndent.entries()].filter(([key]) => key <= indent)
      );
      previousOrderedByIndent.set(indent, currentNumber + 1);
      continue;
    }
    if (trimmed) previousOrderedByIndent.clear();
  }

  const blankLinesMatch = src.match(/\n{3,}/);
  if (blankLinesMatch) {
    warnings.push(
      makeDiagnostic(src, {
        id: 'blank-lines',
        kind: 'blank-lines',
        label: 'Có quá nhiều dòng trống liên tiếp.',
        start: blankLinesMatch.index ?? 0,
        end: (blankLinesMatch.index ?? 0) + blankLinesMatch[0].length,
        fixable: true,
        fixLabel: 'Gộp dòng trống',
      })
    );
  }

  const unsupportedCallout = lines.findIndex((line) => {
    const match = line.match(QUOTE_CALLOUT_RE);
    if (!match) return false;
    return !resolveEntityNotesCallout(match[1]);
  });
  if (unsupportedCallout >= 0) {
    const lineText = lines[unsupportedCallout] || '';
    warnings.push(
      makeDiagnostic(src, {
        id: 'callout-role',
        kind: 'callout-role',
        label: 'Có callout dùng role chưa hỗ trợ.',
        start: findLineStartIndex(src, unsupportedCallout + 1),
        end: findLineStartIndex(src, unsupportedCallout + 1) + lineText.length,
        line: unsupportedCallout + 1,
        fixable: true,
        fixLabel: 'Đổi thành NOTE',
      })
    );
  }

  return warnings;
}

export function applyEntityNotesDiagnosticFix(text, diagnostic) {
  const src = String(text || '');
  if (!diagnostic?.kind) return src;

  switch (diagnostic.kind) {
    case 'colon-star-typo':
      return src.replace(/\):\*(?!\*)/g, '):** ');
    case 'bold-unclosed':
      return fixUnbalancedPair(src, '**');
    case 'strike-unclosed':
      return fixUnbalancedPair(src, '~~');
    case 'wiki-unclosed':
      return fixWikiBalancePerLine(src);
    case 'color-unclosed':
      return `${src}[/color]`;
    case 'color-malformed':
      return src.replace(/\[color(?!=[^\]]+\])/i, `[color=${DEFAULT_COLOR}]`);
    case 'color-invalid-value':
      return src.replace(INLINE_COLOR_OPEN_RE, (full, rawColor) =>
        INLINE_COLOR_VALID_VALUE_RE.test(String(rawColor || '').trim()) ? full : `[color=${DEFAULT_COLOR}]`
      );
    case 'ordered-gap':
      return renumberOrderedLists(src);
    case 'blank-lines':
      return src.replace(/\n{3,}/g, '\n\n');
    case 'callout-role':
      return src.replace(/^\s*>\s*\[!([A-Z_-]+)\](?:\s+(.*))?$/im, (_full, _role, title) =>
        `> [!NOTE] ${String(title || '').trim() || 'Ghi chú'}`
      );
    default:
      return src;
  }
}

const MARKER_AUTO_FIX_KINDS = new Set([
  'bold-unclosed',
  'strike-unclosed',
  'wiki-unclosed',
  'color-unclosed',
  'color-malformed',
  'color-invalid-value',
  'colon-star-typo',
]);

function runFixableDiagnosticsLoop(text, { includeMarkerFixes = true } = {}) {
  let next = cleanupEntityNotesText(text);
  for (let round = 0; round < 8; round += 1) {
    const diagnostics = collectEntityNotesDiagnostics(next).filter(
      (item) => includeMarkerFixes || !MARKER_AUTO_FIX_KINDS.has(item.kind)
    );
    const fixable = diagnostics.find((item) => item.fixable);
    if (!fixable) break;
    const patched = applyEntityNotesDiagnosticFix(next, fixable);
    if (patched === next) break;
    next = patched;
  }
  return renumberOrderedLists(next).replace(/\n{3,}/g, '\n\n');
}

/** Làm sạch cấu trúc khi lưu / sau AI — không tự chèn `**`, `]]` (tránh hỏng chỉnh tay). */
export function fixEntityNotesStructureOnly(text) {
  return runFixableDiagnosticsLoop(text, { includeMarkerFixes: false });
}

/** Chuẩn bị trước khi lưu: mặc định chỉ sạch cấu trúc; không đụng marker trừ khi bật fixMarkers. */
export function prepareEntityNotesForSave(text, { fixMarkers = false } = {}) {
  return fixMarkers ? fixAllEntityNotesDiagnostics(text) : fixEntityNotesStructureOnly(text);
}

export function fixAllEntityNotesDiagnostics(text) {
  return runFixableDiagnosticsLoop(text, { includeMarkerFixes: true });
}
