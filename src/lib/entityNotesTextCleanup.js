// ==========================================
// Dọn văn bản cho Ghi Chép Chi Tiết.
// Giữ heading/list/quote/divider ổn định, nhưng gộp lại các đoạn paste từ web
// bị ngắt dòng, thừa khoảng trắng hoặc dính ký tự khoảng trắng đặc biệt.
// ==========================================

import { isMarkdownTableRowLine } from './markdownTable.js';

const DIVIDER_RE = /^(?:-{3,}|\*{3,}|_{3,})$/;
const HEADING_RE = /^(#{1,3})\s+(.*)$/;
const BULLET_RE = /^(\s*[-*]\s+)(.*)$/;
const ORDERED_RE = /^(\s*\d+\.\s+)(.*)$/;
const QUOTE_RE = /^(\s*)(>\s+)(.*)$/;
const IMAGE_RE = /^!\[(.*?)\]\((.*?)\)$/;
/** Plain line after a list block should start a new paragraph, not merge into the last bullet. */
const PLAIN_BREAKS_FROM_LIST_RE = /^(?:#{1,6}\s|>\s|!\[|«|\[\[|\|)/;

const normalizeRawWhitespace = (value) =>
  String(value || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/\t/g, '  ');

const cleanInlineSpacing = (value) =>
  normalizeRawWhitespace(value)
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();

const classifyLine = (rawLine) => {
  const normalizedLine = normalizeRawWhitespace(rawLine).replace(/[ \t]+$/g, '');
  const trimmed = normalizedLine.trim();
  if (!trimmed) return { type: 'blank' };

  if (DIVIDER_RE.test(trimmed)) return { type: 'single', value: '---' };
  if (IMAGE_RE.test(trimmed)) return { type: 'single', value: trimmed };

  const leftTrimmed = normalizedLine.trimStart();
  const headingMatch = leftTrimmed.match(HEADING_RE);
  if (headingMatch) {
    return {
      type: 'single',
      value: `${headingMatch[1]} ${cleanInlineSpacing(headingMatch[2])}`,
    };
  }

  const bulletMatch = normalizedLine.match(BULLET_RE);
  if (bulletMatch) {
    const prefix = `${bulletMatch[1].replace(/\s+$/g, '')} `;
    return { type: 'bullet', value: `${prefix}${cleanInlineSpacing(bulletMatch[2])}`.trimEnd() };
  }

  const orderedMatch = normalizedLine.match(ORDERED_RE);
  if (orderedMatch) {
    const prefix = `${orderedMatch[1].replace(/\s+$/g, '')} `;
    return { type: 'ordered', value: `${prefix}${cleanInlineSpacing(orderedMatch[2])}`.trimEnd() };
  }

  const quoteMatch = normalizedLine.match(QUOTE_RE);
  if (quoteMatch) {
    const indent = quoteMatch[1].replace(/\s+$/g, '');
    return {
      type: 'quote',
      value: `${indent}${quoteMatch[2] || '> '}${cleanInlineSpacing(quoteMatch[3] || '')}`.trimEnd(),
    };
  }

  if (isMarkdownTableRowLine(normalizedLine)) {
    return { type: 'table', value: normalizedLine.replace(/[ \t]+$/g, '') };
  }

  return { type: 'plain', value: cleanInlineSpacing(trimmed) };
};

/** Khoảng cách giữa khối: giữ đúng mức người dùng đã có, không ép \\n\\n. */
function separatorForBlankRun(blankCount) {
  if (blankCount <= 0) return '\n';
  // Một dòng trống tương ứng với chuỗi `\n\n` giữa 2 block.
  // Giữ đúng mức người dùng đã có để không "nuốt" dòng trống quan trọng.
  return '\n\n';
}

export function cleanupEntityNotesText(value) {
  const src = normalizeRawWhitespace(value);
  if (!src.trim()) return '';

  const segments = [];
  const blanksBefore = [];
  let paragraphParts = [];
  let groupedLines = null;
  let pendingBlanks = 0;

  const pushSegment = (text) => {
    const trimmed = String(text || '').trim();
    if (!trimmed) return;
    blanksBefore.push(pendingBlanks);
    segments.push(trimmed);
    pendingBlanks = 0;
  };

  const flushParagraph = () => {
    if (paragraphParts.length === 0) return;
    pushSegment(paragraphParts.join(' '));
    paragraphParts = [];
  };

  const flushGroupedLines = () => {
    if (!groupedLines || groupedLines.lines.length === 0) {
      groupedLines = null;
      return;
    }
    pushSegment(groupedLines.lines.join('\n'));
    groupedLines = null;
  };

  const lines = src.split('\n');
  let inCodeFence = false;
  let codeFenceLines = [];

  for (let i = 0; i < lines.length; i += 1) {
    const normalizedLine = normalizeRawWhitespace(lines[i]).replace(/[ \t]+$/g, '');
    const trimmedFence = normalizedLine.trim();

    if (inCodeFence) {
      codeFenceLines.push(normalizedLine);
      if (trimmedFence.startsWith('```')) {
        inCodeFence = false;
        flushParagraph();
        flushGroupedLines();
        pushSegment(codeFenceLines.join('\n'));
        codeFenceLines = [];
      }
      continue;
    }

    if (trimmedFence.startsWith('```')) {
      flushParagraph();
      flushGroupedLines();
      inCodeFence = true;
      codeFenceLines = [normalizedLine];
      continue;
    }

    const current = classifyLine(lines[i]);

    if (current.type === 'blank') {
      flushParagraph();
      flushGroupedLines();
      pendingBlanks += 1;
      continue;
    }

    if (current.type === 'plain') {
      if (groupedLines && groupedLines.lines.length > 0) {
        if (PLAIN_BREAKS_FROM_LIST_RE.test(current.value)) {
          flushGroupedLines();
          paragraphParts.push(current.value);
        } else {
          groupedLines.lines[groupedLines.lines.length - 1] += ` ${current.value}`;
        }
      } else {
        paragraphParts.push(current.value);
      }
      continue;
    }

    flushParagraph();

    if (
      current.type === 'bullet' ||
      current.type === 'ordered' ||
      current.type === 'quote' ||
      current.type === 'table'
    ) {
      if (!groupedLines || groupedLines.type !== current.type) {
        flushGroupedLines();
        groupedLines = { type: current.type, lines: [] };
      }
      groupedLines.lines.push(current.value);
      continue;
    }

    flushGroupedLines();
    pushSegment(current.value);
  }

  flushParagraph();
  flushGroupedLines();
  if (inCodeFence && codeFenceLines.length > 0) {
    pushSegment(codeFenceLines.join('\n'));
  }

  if (segments.length === 0) return '';
  let out = segments[0];
  for (let i = 1; i < segments.length; i += 1) {
    out += separatorForBlankRun(blanksBefore[i] ?? 0) + segments[i];
  }
  return out.trim();
}
