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
export function tryParseMarkdownTableBlock(lines, startIndex) {
  if (!Array.isArray(lines) || startIndex < 0 || startIndex >= lines.length) return null;

  const headerLine = String(lines[startIndex] ?? '');
  if (!isMarkdownTableRowLine(headerLine) || isTableSeparatorRow(headerLine.trim())) return null;
  if (startIndex + 1 >= lines.length) return null;

  const sepLine = String(lines[startIndex + 1] ?? '');
  if (!isTableSeparatorRow(sepLine)) return null;

  const header = splitTableRowCells(headerLine);
  const aligns = parseTableSeparatorAlignments(sepLine);
  const rows = [];
  let idx = startIndex + 2;

  while (idx < lines.length) {
    const rowLine = String(lines[idx] ?? '');
    if (!rowLine.trim()) break;
    if (!isMarkdownTableRowLine(rowLine)) break;
    if (isTableSeparatorRow(rowLine.trim())) break;
    rows.push(splitTableRowCells(rowLine));
    idx += 1;
  }

  return {
    header,
    aligns,
    rows,
    startLine: startIndex,
    endLine: idx,
  };
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
