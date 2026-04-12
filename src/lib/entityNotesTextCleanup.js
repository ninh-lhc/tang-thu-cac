// ==========================================
// Dọn văn bản cho Ghi Chép Chi Tiết.
// Giữ heading/list/quote/divider ổn định, nhưng gộp lại các đoạn paste từ web
// bị ngắt dòng, thừa khoảng trắng hoặc dính ký tự khoảng trắng đặc biệt.
// ==========================================

const DIVIDER_RE = /^(?:-{3,}|\*{3,}|_{3,})$/;
const HEADING_RE = /^(#{1,3})\s+(.*)$/;
const BULLET_RE = /^(\s*[-*]\s+)(.*)$/;
const ORDERED_RE = /^(\s*\d+\.\s+)(.*)$/;
const QUOTE_RE = /^(\s*>\s+)(.*)$/;
const IMAGE_RE = /^!\[(.*?)\]\((.*?)\)$/;

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
    const prefix = `${quoteMatch[1].replace(/\s+$/g, '')} `;
    return { type: 'quote', value: `${prefix}${cleanInlineSpacing(quoteMatch[2])}`.trimEnd() };
  }

  return { type: 'plain', value: cleanInlineSpacing(trimmed) };
};

export function cleanupEntityNotesText(value) {
  const src = normalizeRawWhitespace(value);
  if (!src.trim()) return '';

  const segments = [];
  let paragraphParts = [];
  let groupedLines = null;

  const flushParagraph = () => {
    if (paragraphParts.length === 0) return;
    segments.push(paragraphParts.join(' '));
    paragraphParts = [];
  };

  const flushGroupedLines = () => {
    if (!groupedLines || groupedLines.lines.length === 0) {
      groupedLines = null;
      return;
    }
    segments.push(groupedLines.lines.join('\n'));
    groupedLines = null;
  };

  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const current = classifyLine(lines[i]);

    if (current.type === 'blank') {
      flushParagraph();
      flushGroupedLines();
      continue;
    }

    if (current.type === 'plain') {
      if (groupedLines && groupedLines.lines.length > 0) {
        groupedLines.lines[groupedLines.lines.length - 1] += ` ${current.value}`;
      } else {
        paragraphParts.push(current.value);
      }
      continue;
    }

    flushParagraph();

    if (current.type === 'bullet' || current.type === 'ordered' || current.type === 'quote') {
      if (!groupedLines || groupedLines.type !== current.type) {
        flushGroupedLines();
        groupedLines = { type: current.type, lines: [] };
      }
      groupedLines.lines.push(current.value);
      continue;
    }

    flushGroupedLines();
    segments.push(current.value);
  }

  flushParagraph();
  flushGroupedLines();

  return segments.join('\n\n').trim();
}
