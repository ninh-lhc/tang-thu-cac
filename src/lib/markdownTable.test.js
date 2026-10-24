import { describe, expect, it } from 'vitest';
import {
  isMarkdownTableRowLine,
  isTableSeparatorRow,
  normalizeTableColumnCount,
  parseTableSeparatorAlignments,
  splitTableRowCells,
  tryParseMarkdownTableBlock,
} from './markdownTable.js';

describe('markdownTable', () => {
  it('parses basic table (a)', () => {
    const lines = ['| A | B |', '|---|---|', '| 1 | 2 |'];
    const block = tryParseMarkdownTableBlock(lines, 0);
    expect(block).not.toBeNull();
    expect(block.header.map((c) => c.trim())).toEqual(['A', 'B']);
    expect(block.rows[0].map((c) => c.trim())).toEqual(['1', '2']);
  });

  it('parses alignment row (b, c)', () => {
    expect(parseTableSeparatorAlignments('|:---|:---:|---:|')).toEqual(['left', 'center', 'right']);
    const lines = [
      '| Trái | Giữa | Phải |',
      '|---|:---:|---:|',
      '| A | B | C |',
    ];
    const block = tryParseMarkdownTableBlock(lines, 0);
    expect(block.aligns).toEqual(['left', 'center', 'right']);
  });

  it('parses escaped pipe in cell (d)', () => {
    const cells = splitTableRowCells('| A \\| B |');
    expect(cells.length).toBe(1);
    expect(cells[0].trim()).toBe('A | B');
  });

  it('does not treat separator-only as data header', () => {
    expect(isTableSeparatorRow('|---|')).toBe(true);
    expect(tryParseMarkdownTableBlock(['|---|', '| A |'], 0)).toBeNull();
  });

  it('parses multiple tables (f)', () => {
    const lines = [
      '| A | B |',
      '|---|---|',
      '| 1 | 2 |',
      '',
      '| X | Y |',
      '|---|---|',
      '| 3 | 4 |',
    ];
    const t1 = tryParseMarkdownTableBlock(lines, 0);
    expect(t1.endLine).toBe(3);
    const t2 = tryParseMarkdownTableBlock(lines, 4);
    expect(t2).not.toBeNull();
    expect(t2.rows[0].map((c) => c.trim())).toEqual(['3', '4']);
  });

  it('recognizes wiki-link table rows (g)', () => {
    const lines = [
      '| Nhân vật | Cảnh giới |',
      '|---|---|',
      '| [[Tô Thần]] | [[Luyện Khí]] |',
    ];
    const block = tryParseMarkdownTableBlock(lines, 0);
    expect(block.rows[0][0].trim()).toBe('[[Tô Thần]]');
    expect(block.rows[0][1].trim()).toBe('[[Luyện Khí]]');
  });

  it('isMarkdownTableRowLine rejects headings', () => {
    expect(isMarkdownTableRowLine('# not | table')).toBe(false);
  });

  it('normalizes ragged rows and empty cells', () => {
    const lines = ['| A | B | C |', '|---|---|---|', '| 1 |  | 3 |', '| only |'];
    const block = tryParseMarkdownTableBlock(lines, 0);
    expect(block.rows.length).toBe(2);
    const norm = normalizeTableColumnCount(block.header, block.aligns, block.rows);
    expect(norm.colCount).toBe(3);
    expect(norm.rows[0].map((c) => c.trim())).toEqual(['1', '', '3']);
    expect(norm.rows[1].map((c) => c.trim())).toEqual(['only', '', '']);
  });
});
