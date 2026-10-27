/**
 * Chỉnh sửa bảng GFM — liệt kê/thay block, grid ↔ Markdown (không React).
 * Ai dùng: EntityNotesMarkdownTableEditModal, entity/milestone preview.
 */

import {
  formatMarkdownTableBlock,
  normalizeTableColumnCount,
  tryParseMarkdownTableBlock,
} from './markdownTable.js';

/** Ô bảng → text hiển thị trong textarea grid (<br> thành xuống dòng). */
export function tableCellToEditorText(cell) {
  return String(cell ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n');
}

/** Text từ grid → giá trị cell trước serialize (giữ newline cho formatMarkdownTableBlock). */
export function tableCellFromEditorText(text) {
  return String(text ?? '').replace(/\r\n?/g, '\n');
}

export function tableBlockToEditGrid(block) {
  if (!block) return null;
  const normalized = normalizeTableColumnCount(block.header, block.aligns, block.rows);
  return {
    header: normalized.header.map(tableCellToEditorText),
    aligns: [...normalized.aligns],
    rows: normalized.rows.map((row) => row.map(tableCellToEditorText)),
  };
}

export function editGridToTableBlock(grid) {
  if (!grid) return null;
  return {
    header: grid.header.map(tableCellFromEditorText),
    aligns: grid.aligns,
    rows: grid.rows.map((row) => row.map(tableCellFromEditorText)),
  };
}

export function editGridToMarkdown(grid) {
  const block = editGridToTableBlock(grid);
  return block ? formatMarkdownTableBlock(block) : '';
}

function splitLinesRespectingCodeFences(text) {
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
  return lines;
}

/** Liệt kê bảng GFM hợp lệ (bỏ qua code fence). */
export function listMarkdownTableBlocksInText(text) {
  const lines = splitLinesRespectingCodeFences(text);
  const out = [];
  let inCodeFence = false;
  let tableIndex = 0;

  for (let i = 0; i < lines.length; ) {
    const trimmed = lines[i].trim();
    if (!inCodeFence && trimmed.startsWith('```')) {
      inCodeFence = true;
      i += 1;
      continue;
    }
    if (inCodeFence) {
      if (trimmed.startsWith('```')) inCodeFence = false;
      i += 1;
      continue;
    }

    const block = tryParseMarkdownTableBlock(lines, i);
    if (block) {
      out.push({
        tableIndex,
        startLine: block.startLine,
        endLine: block.endLine,
        block,
      });
      tableIndex += 1;
      i = block.endLine;
      continue;
    }
    i += 1;
  }

  return out;
}

export function getMarkdownTableBlockByIndex(text, tableIndex) {
  const idx = Number(tableIndex);
  if (!Number.isFinite(idx) || idx < 0) return null;
  return listMarkdownTableBlocksInText(text).find((e) => e.tableIndex === idx) ?? null;
}

/** Thay đúng một khối bảng theo tableIndex (0-based). */
export function replaceMarkdownTableBlockByIndex(text, tableIndex, replacementMarkdown) {
  const entry = getMarkdownTableBlockByIndex(text, tableIndex);
  if (!entry) return String(text ?? '');

  const lines = splitLinesRespectingCodeFences(text);
  const before = lines.slice(0, entry.startLine);
  const after = lines.slice(entry.endLine);
  const insert = String(replacementMarkdown ?? '').replace(/\r\n?/g, '\n').split('\n');
  return [...before, ...insert, ...after].join('\n');
}

export function createEmptyEditGridRow(colCount) {
  return Array.from({ length: Math.max(1, colCount) }, () => '');
}

export function appendEditGridRow(grid) {
  const colCount = grid.header.length;
  return {
    ...grid,
    rows: [...grid.rows, createEmptyEditGridRow(colCount)],
  };
}

export function appendEditGridColumn(grid) {
  return {
    header: [...grid.header, ''],
    aligns: [...grid.aligns, 'left'],
    rows: grid.rows.map((row) => [...row, '']),
  };
}

export function removeEditGridRow(grid, rowIndex) {
  if (grid.rows.length <= 1) return grid;
  const ri = Number(rowIndex);
  if (!Number.isFinite(ri) || ri < 0 || ri >= grid.rows.length) return grid;
  return { ...grid, rows: grid.rows.filter((_, i) => i !== ri) };
}

export function removeEditGridColumn(grid, colIndex) {
  if (grid.header.length <= 1) return grid;
  const ci = Number(colIndex);
  if (!Number.isFinite(ci) || ci < 0 || ci >= grid.header.length) return grid;
  return {
    header: grid.header.filter((_, i) => i !== ci),
    aligns: grid.aligns.filter((_, i) => i !== ci),
    rows: grid.rows.map((row) => row.filter((_, i) => i !== ci)),
  };
}
