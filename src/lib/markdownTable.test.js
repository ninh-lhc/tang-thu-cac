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

  describe('splitTableRowCells — wiki-link and inline-code pipe protection (F-005/F-006)', () => {
    it('wiki-link [[Page|Display]] stays in one cell', () => {
      const cells = splitTableRowCells('| [[Nhân Vật|Tên Hiển Thị]] |');
      expect(cells).toHaveLength(1);
      expect(cells[0].trim()).toBe('[[Nhân Vật|Tên Hiển Thị]]');
    });

    it('wiki-link with pipe in multi-column row', () => {
      const cells = splitTableRowCells('| Alice | [[Nhân Vật|Tên Hiển Thị]] |');
      expect(cells.map((c) => c.trim())).toEqual(['Alice', '[[Nhân Vật|Tên Hiển Thị]]']);
    });

    it('multiple wiki-links with pipes in one cell', () => {
      const cells = splitTableRowCells('| [[A|B]] và [[C|D]] |');
      expect(cells).toHaveLength(1);
      expect(cells[0].trim()).toBe('[[A|B]] và [[C|D]]');
    });

    it('wiki-link without pipe is unaffected', () => {
      expect(splitTableRowCells('| [[Simple Link]] |')[0].trim()).toBe('[[Simple Link]]');
    });

    it('wiki-link with empty display [[Page|]]', () => {
      expect(splitTableRowCells('| [[Page|]] |')[0].trim()).toBe('[[Page|]]');
    });

    it('inline code `a|b` stays in one cell', () => {
      expect(splitTableRowCells('| `a|b|c` |')[0].trim()).toBe('`a|b|c`');
    });

    it('wiki-link and inline code in separate columns', () => {
      expect(splitTableRowCells('| [[X|Y]] | `m|n` |').map((c) => c.trim())).toEqual([
        '[[X|Y]]',
        '`m|n`',
      ]);
    });

    it('code containing wiki-link syntax `[[A|B]]`', () => {
      expect(splitTableRowCells('| `[[A|B]]` |')[0].trim()).toBe('`[[A|B]]`');
    });

    it('escaped pipe still works (regression)', () => {
      expect(splitTableRowCells('| a\\|b |')[0].trim()).toBe('a|b');
    });

    it('unclosed wiki-link: pipe after [[ is not split', () => {
      expect(splitTableRowCells('| [[Broken|Link |')[0].trim()).toBe('[[Broken|Link');
    });

    it('unclosed backtick: pipe after ` is not split', () => {
      expect(splitTableRowCells('| `broken|code |')[0].trim()).toBe('`broken|code');
    });
  });

  describe('table row pipe detection — wiki-link and inline-code protection', () => {
    it('recognizes bordered row with wiki display pipe as table line', () => {
      expect(isMarkdownTableRowLine('| [[A|B]] |')).toBe(true);
    });

    it('recognizes bordered row with inline code pipe as table line', () => {
      expect(isMarkdownTableRowLine('| `a|b` |')).toBe(true);
    });

    it('parses full block with wiki display pipe in cell', () => {
      const lines = [
        '| Name | Link |',
        '|------|------|',
        '| Alice | [[Nhân Vật|Tên Hiển Thị]] |',
      ];
      const block = tryParseMarkdownTableBlock(lines, 0);
      expect(block).not.toBeNull();
      expect(block.rows[0].map((c) => c.trim())).toEqual(['Alice', '[[Nhân Vật|Tên Hiển Thị]]']);
    });
  });
});
