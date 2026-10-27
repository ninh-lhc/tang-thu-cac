import { describe, expect, it } from 'vitest';
import {
  formatMarkdownTableBlock,
  isMarkdownTableRowLine,
  isTableSeparatorRow,
  normalizeMarkdownTableRowLine,
  normalizeTableColumnCount,
  parseTableSeparatorAlignments,
  joinPhysicalLinesIntoLogicalTableRows,
  replaceMarkdownTableBlocksInText,
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

  it('parses loose header rows without outer pipes (NotebookLM)', () => {
    const lines = [
      'Giai đoạn | Kỹ năng',
      '--- | ---',
      'Cấp 1 | [[Kỹ năng A]]',
    ];
    const block = tryParseMarkdownTableBlock(lines, 0);
    expect(block).not.toBeNull();
    expect(block.header.map((c) => c.trim())).toEqual(['Giai đoạn', 'Kỹ năng']);
    expect(block.rows[0][1].trim()).toBe('[[Kỹ năng A]]');
  });

  it('formatMarkdownTableBlock keeps wiki-links and alignment', () => {
    const lines = [
      '| Trái | Giữa | Phải |',
      '|---|:---:|---:|',
      '| A | B | C |',
    ];
    const block = tryParseMarkdownTableBlock(lines, 0);
    const md = formatMarkdownTableBlock(block);
    expect(md.split('\n')[1]).toBe('| --- | :---: | ---: |');
    expect(md.split('\n')[2]).toBe('| A | B | C |');
    const wikiMd = formatMarkdownTableBlock({
      header: ['Giai đoạn', 'Kỹ năng'],
      aligns: ['left', 'left'],
      rows: [['Cấp 1', '[[Triệu Hồi Khô Lâu Chiến Sĩ]]']],
    });
    expect(wikiMd).toContain('[[Triệu Hồi Khô Lâu Chiến Sĩ]]');
  });

  it('replaceMarkdownTableBlocksInText skips fenced code', () => {
    const input = ['```', '| A | B |', '|---|---|', '```', '| X | Y |', '|---|---|', '| 1 | 2 |'].join('\n');
    const out = replaceMarkdownTableBlocksInText(input);
    expect(out).toContain('```\n| A | B |');
    expect(out).toContain('| X | Y |');
    expect(out).toContain('| 1 | 2 |');
  });

  it('normalizeMarkdownTableRowLine adds border pipes', () => {
    expect(normalizeMarkdownTableRowLine('A | B')).toBe('| A | B |');
  });

  it('joinPhysicalLinesIntoLogicalTableRows merges newline split cell', () => {
    const physical = [
      '| Hắc Thiết | Cấp 1–9:',
      '[[Triệu Hồi Khô Lâu Chiến Sĩ]] | Nội dung |',
    ];
    const logical = joinPhysicalLinesIntoLogicalTableRows(physical, 3);
    expect(logical).toHaveLength(1);
    const block = tryParseMarkdownTableBlock(
      ['| A | B | C |', '|---|---|---|', ...logical],
      0,
    );
    expect(block?.rows[0][1]).toContain('[[Triệu Hồi Khô Lâu Chiến Sĩ]]');
  });
});
