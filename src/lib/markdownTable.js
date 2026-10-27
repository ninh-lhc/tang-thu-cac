// ==========================================
// GFM Markdown table — parse thuần (không React).
// Ai dùng: renderEntityNotesMarkdown, entityNotesTextCleanup.
// ==========================================

const SEPARATOR_CELL_RE = /^:?-{1,}:?$/;

/** Dòng có cấu trúc hàng bảng (có | không escape), không phải heading/quote/list. */
export function isMarkdownTableRowLine(rawLine) {
  const normalized = String(rawLine ?? '').replace(/\r\n?/g, '\n');
  const trimmed = normalized.trim();
  if (!trimmed || !trimmed.includes('|')) return false;
  const left = normalized.trimStart();
  if (left.startsWith('#') || left.startsWith('>') || /^[-*]\s/.test(left)) return false;
  if (/^!\[/.test(trimmed)) return false;
  if (trimmed.startsWith('```')) return false;

  const unescapedPipes = countUnescapedPipes(trimmed);
  if (unescapedPipes < 1) return false;

  if (trimmed.startsWith('|')) return true;
  if (isTableSeparatorRow(trimmed)) return true;
  return unescapedPipes >= 2;
}

function countUnescapedPipes(text) {
  let n = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '\\' && text[i + 1] === '|') {
      i += 1;
      continue;
    }
    if (text[i] === '|') n += 1;
  }
  return n;
}

/** Tách ô; hỗ trợ \\| trong cell. */
export function splitTableRowCells(line) {
  let s = String(line ?? '').trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);

  const cells = [];
  let buf = '';
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (ch === '\\' && s[i + 1] === '|') {
      buf += '|';
      i += 1;
      continue;
    }
    if (ch === '|') {
      cells.push(buf);
      buf = '';
      continue;
    }
    buf += ch;
  }
  cells.push(buf);
  return cells;
}

export function isTableSeparatorRow(line) {
  const cells = splitTableRowCells(line);
  if (cells.length === 0) return false;
  return cells.every((cell) => SEPARATOR_CELL_RE.test(String(cell).trim().replace(/\s/g, '')));
}

/** @returns {('left'|'center'|'right')[]} */
export function parseTableSeparatorAlignments(line) {
  return splitTableRowCells(line).map((cell) => {
    const c = String(cell).trim().replace(/\s/g, '');
    const left = c.startsWith(':');
    const right = c.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    return 'left';
  });
}

/**
 * Đọc khối bảng GFM: header + separator + body.
 * @returns {{ header: string[], aligns: string[], rows: string[][], startLine: number, endLine: number } | null}
 */
/** Thêm | đầu/cuối cho hàng bảng NotebookLM (thiếu viền). */
export function normalizeMarkdownTableRowLine(line) {
  const trimmed = String(line ?? '').replace(/\r\n?/g, '\n').trim();
  if (!trimmed.includes('|')) return trimmed;
  let s = trimmed;
  if (!s.startsWith('|')) s = `| ${s}`;
  if (!s.endsWith('|')) s = `${s} |`;
  return s;
}

function isLikelyTableHeaderBeforeSeparator(headerLine, sepLine) {
  const h = String(headerLine ?? '').trim();
  const s = String(sepLine ?? '').trim();
  if (!h || !s || h.startsWith('#') || h.startsWith('>')) return false;
  const sepOk =
    isTableSeparatorRow(s) || isTableSeparatorRow(normalizeMarkdownTableRowLine(s));
  if (!sepOk) return false;
  if (isTableSeparatorRow(h)) return false;
  return h.includes('|');
}

function normalizeTableRowForParse(line) {
  const raw = String(line ?? '');
  if (isMarkdownTableRowLine(raw)) return raw;
  const normalized = normalizeMarkdownTableRowLine(raw);
  return isMarkdownTableRowLine(normalized) ? normalized : raw;
}

function stripCarriageReturn(line) {
  return String(line ?? '').replace(/\r$/, '');
}

/** Dòng có thể là phần tiếp nối của hàng bảng (không phải heading/list/code). */
function isTableBodyContinuationLine(line) {
  const trimmed = stripCarriageReturn(line).trim();
  if (!trimmed) return false;
  const left = trimmed.trimStart();
  if (left.startsWith('#') || left.startsWith('>')) return false;
  if (/^[-*]\s/.test(left)) return false;
  if (left.startsWith('```')) return false;
  return true;
}

function mergeTableRowFragments(current, fragment) {
  const a = String(current ?? '').trimEnd();
  const b = String(fragment ?? '').trim();
  if (!a) return b;
  if (!b) return a;
  return `${a} ${b}`;
}

function rowCellCount(line) {
  const normalized = normalizeMarkdownTableRowLine(stripCarriageReturn(line));
  return splitTableRowCells(normalized).length;
}

/**
 * Gộp nhiều dòng vật lý thành hàng logic (NotebookLM hay tách <br> thành newline trong ô).
 * @returns {string[] | null} null nếu cấu trúc không chắc chắn — caller fallback.
 */
export function joinPhysicalLinesIntoLogicalTableRows(physicalLines, expectedColCount) {
  const expected = Math.max(1, Number(expectedColCount) || 1);
  if (!Array.isArray(physicalLines) || physicalLines.length === 0) return [];

  const logical = [];
  let current = null;

  const flush = () => {
    if (current != null && String(current).trim()) {
      logical.push(normalizeMarkdownTableRowLine(current));
    }
    current = null;
  };

  for (const rawLine of physicalLines) {
    const trimmed = stripCarriageReturn(rawLine).trim();
    if (!trimmed) break;
    if (isTableSeparatorRow(trimmed)) break;

    const startsWithPipe = trimmed.startsWith('|');

    if (current === null) {
      if (!startsWithPipe && countUnescapedPipes(trimmed) < 1) return null;
      current = startsWithPipe ? trimmed : normalizeMarkdownTableRowLine(trimmed);
      continue;
    }

    const complete = rowCellCount(current) >= expected;

    if (!complete || !startsWithPipe) {
      if (!isTableBodyContinuationLine(rawLine)) return null;
      current = mergeTableRowFragments(current, trimmed);
      continue;
    }

    flush();
    current = trimmed;
  }
  flush();

  for (const row of logical) {
    const n = rowCellCount(row);
    if (n > expected + 1) return null;
  }

  return logical;
}

function collectPhysicalTableBodyLines(lines, startIndex, expectedColCount) {
  const physical = [];
  let idx = startIndex;

  while (idx < lines.length) {
    const rowLine = stripCarriageReturn(lines[idx]);
    const trimmed = rowLine.trim();
    if (!trimmed) break;
    if (isTableSeparatorRow(trimmed)) break;

    if (physical.length === 0) {
      if (!isMarkdownTableRowLine(rowLine)) {
        const normalized = normalizeMarkdownTableRowLine(rowLine);
        if (!isMarkdownTableRowLine(normalized)) break;
      }
      physical.push(rowLine);
      idx += 1;
      continue;
    }

    if (isMarkdownTableRowLine(rowLine) || isTableBodyContinuationLine(rowLine)) {
      physical.push(rowLine);
      idx += 1;
      continue;
    }
    break;
  }

  return { physical, endLine: idx };
}

function parseTableBodyRowsStrict(lines, startIndex) {
  const rows = [];
  let idx = startIndex;
  while (idx < lines.length) {
    let rowLine = String(lines[idx] ?? '');
    if (!rowLine.trim()) break;
    if (isTableSeparatorRow(rowLine.trim())) break;
    if (!isMarkdownTableRowLine(rowLine)) {
      const normalized = normalizeMarkdownTableRowLine(rowLine);
      if (isMarkdownTableRowLine(normalized)) rowLine = normalized;
      else break;
    }
    rows.push(splitTableRowCells(rowLine));
    idx += 1;
  }
  return { rows, endLine: idx };
}

export function tryParseMarkdownTableBlock(lines, startIndex) {
  if (!Array.isArray(lines) || startIndex < 0 || startIndex >= lines.length) return null;
  if (startIndex + 1 >= lines.length) return null;

  let headerLine = String(lines[startIndex] ?? '');
  let sepLine = String(lines[startIndex + 1] ?? '');

  if (isTableSeparatorRow(headerLine.trim())) return null;

  if (!isMarkdownTableRowLine(headerLine)) {
    if (!isLikelyTableHeaderBeforeSeparator(headerLine, sepLine)) return null;
    headerLine = normalizeMarkdownTableRowLine(headerLine);
  }

  if (!isTableSeparatorRow(sepLine)) {
    const normSep = normalizeMarkdownTableRowLine(sepLine);
    if (!isTableSeparatorRow(normSep)) return null;
    sepLine = normSep;
  }

  const header = splitTableRowCells(headerLine);
  const aligns = parseTableSeparatorAlignments(sepLine);
  const expectedColCount = header.length;

  const { physical, endLine: bodyEnd } = collectPhysicalTableBodyLines(
    lines,
    startIndex + 2,
    expectedColCount,
  );

  let rows;
  let endLine = bodyEnd;

  const logical = joinPhysicalLinesIntoLogicalTableRows(physical, expectedColCount);
  if (logical !== null && logical.length > 0) {
    rows = logical.map((line) => splitTableRowCells(line));
  } else if (logical !== null && logical.length === 0) {
    rows = [];
  } else {
    const strict = parseTableBodyRowsStrict(lines, startIndex + 2);
    rows = strict.rows;
    endLine = strict.endLine;
  }

  return {
    header,
    aligns,
    rows,
    startLine: startIndex,
    endLine,
  };
}

function sanitizeTableCellContent(cell) {
  return String(cell ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\r\n?/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapePipeInTableCell(cell) {
  let out = '';
  const s = sanitizeTableCellContent(cell);
  for (let i = 0; i < s.length; i += 1) {
    if (s[i] === '\\' && s[i + 1] === '|') {
      out += '\\|';
      i += 1;
      continue;
    }
    if (s[i] === '|') {
      out += '\\|';
      continue;
    }
    out += s[i];
  }
  return out;
}

function alignmentToSeparatorCell(align) {
  if (align === 'center') return ':---:';
  if (align === 'right') return '---:';
  return '---';
}

/** Serialize khối bảng đã parse — cùng định dạng GFM mà preview/editor dùng. */
export function formatMarkdownTableBlock(block) {
  if (!block) return '';
  const normalized = normalizeTableColumnCount(block.header, block.aligns, block.rows);
  const rowLine = (cells) =>
    `| ${cells.map((c) => escapePipeInTableCell(c)).join(' | ')} |`;
  const sepLine = `| ${normalized.aligns.map(alignmentToSeparatorCell).join(' | ')} |`;
  return [rowLine(normalized.header), sepLine, ...normalized.rows.map(rowLine)].join('\n');
}

export function textContainsMarkdownTable(value) {
  const lines = String(value ?? '').replace(/\r\n?/g, '\n').split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    if (tryParseMarkdownTableBlock(lines, i)) return true;
  }
  return false;
}

/** Chuẩn hóa mọi khối bảng GFM hợp lệ; bỏ qua nội dung trong code fence. */
export function replaceMarkdownTableBlocksInText(value) {
  const src = String(value ?? '').replace(/\r\n?/g, '\n');
  if (!src.trim()) return src;

  const lines = src.split('\n');
  const out = [];
  let inCodeFence = false;
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (!inCodeFence && trimmed.startsWith('```')) {
      inCodeFence = true;
      out.push(lines[i]);
      i += 1;
      continue;
    }
    if (inCodeFence) {
      out.push(lines[i]);
      if (trimmed.startsWith('```')) inCodeFence = false;
      i += 1;
      continue;
    }

    const block = tryParseMarkdownTableBlock(lines, i);
    if (block) {
      out.push(...formatMarkdownTableBlock(block).split('\n'));
      i = block.endLine;
      continue;
    }

    out.push(lines[i]);
    i += 1;
  }

  return out.join('\n');
}

export function normalizeTableColumnCount(header, aligns, rows) {
  const colCount = Math.max(
    header.length,
    aligns.length,
    ...rows.map((r) => r.length),
    1,
  );
  const pad = (cells) => {
    const out = [...cells];
    while (out.length < colCount) out.push('');
    return out.slice(0, colCount);
  };
  return {
    colCount,
    header: pad(header),
    aligns: pad(aligns),
    rows: rows.map(pad),
  };
}
