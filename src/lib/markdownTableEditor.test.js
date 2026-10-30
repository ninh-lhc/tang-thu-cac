import { describe, expect, it } from 'vitest';
import { formatMarkdownTableBlock, tryParseMarkdownTableBlock } from './markdownTable.js';
import {
  editGridToMarkdown,
  getMarkdownTableBlockByIndex,
  listMarkdownTableBlocksInText,
  replaceMarkdownTableBlockByIndex,
  tableBlockToEditGrid,
  tableCellFromEditorText,
  tableCellToEditorText,
} from './markdownTableEditor.js';
import { serializeTableCellForMarkdown } from './markdownTable.js';

describe('markdownTableEditor', () => {
  it('lists and replaces a single table among other markdown', () => {
    const doc = ['# Tiêu đề', '', '| A | B |', '|---|---|', '| 1 | 2 |', '', 'Đoạn giữa', '', '| X | Y |', '|---|---|', '| 9 | 8 |'].join(
      '\n',
    );
    const blocks = listMarkdownTableBlocksInText(doc);
    expect(blocks).toHaveLength(2);
    const replaced = replaceMarkdownTableBlockByIndex(
      doc,
      0,
      '| A | B |\n|---|---|\n| one | two |',
    );
    expect(replaced).toContain('# Tiêu đề');
    expect(replaced).toContain('| one | two |');
    expect(replaced).toContain('| X | Y |');
    expect(replaced).toContain('| 9 | 8 |');
    expect(replaced).not.toContain('| 1 | 2 |');
  });

  it('skips tables inside fenced code', () => {
    const doc = ['```', '| A | B |', '|---|---|', '```', '| T | U |', '|---|---|', '| 1 | 2 |'].join('\n');
    expect(listMarkdownTableBlocksInText(doc)).toHaveLength(1);
    expect(getMarkdownTableBlockByIndex(doc, 0)?.block.rows[0][0].trim()).toBe('1');
  });

  it('serializes multiline cells with br and keeps wiki-link', () => {
    const grid = tableBlockToEditGrid({
      header: ['Giai đoạn', 'Kỹ năng'],
      aligns: ['left', 'left'],
      rows: [['Hắc Thiết', '[[Triệu Hồi]]\nKhung xương\nĐại đao']],
    });
    const md = editGridToMarkdown(grid);
    expect(md).toContain('[[Triệu Hồi]]');
    expect(md).toMatch(/Khung xương<br>Đại đao/);
    expect(md).not.toContain('$$');
  });

  it('escapes unescaped pipes without double escape', () => {
    expect(serializeTableCellForMarkdown('100|200')).toBe('100\\|200');
    expect(serializeTableCellForMarkdown('100\\|200')).toBe('100\\|200');
  });

  it('preserves alignment on serialize', () => {
    const lines = ['| L | C | R |', '|:---|:---:|---:|', '| a | b | c |'];
    const block = tryParseMarkdownTableBlock(lines, 0);
    const md = formatMarkdownTableBlock(block);
    expect(md.split('\n')[1]).toBe('| --- | :---: | ---: |');
  });

  it('round-trips five columns with empty cells and bold', () => {
    const plain = [
      '| A | B | C | D | E |',
      '|---|---|---|---|---|',
      '| **1** | | x | [[W]] | z |',
    ].join('\n');
    const entry = getMarkdownTableBlockByIndex(plain, 0);
    const md = editGridToMarkdown(tableBlockToEditGrid(entry.block));
    const reparsed = tryParseMarkdownTableBlock(md.split('\n'), 0);
    expect(reparsed.rows[0][0]).toContain('**1**');
    expect(reparsed.rows[0][1].trim()).toBe('');
    expect(reparsed.rows[0][3]).toContain('[[W]]');
  });

  it('tableCellToEditorText converts br to newlines', () => {
    expect(tableCellToEditorText('a<br>b')).toBe('a\nb');
    expect(tableCellFromEditorText('a\nb')).toBe('a\nb');
  });

  it('does not treat malformed pipe-only line as editable table block', () => {
    const doc = 'So sánh A | B trong câu.';
    expect(listMarkdownTableBlocksInText(doc)).toHaveLength(0);
  });

  describe('roundtrip — wiki-link and inline-code pipe preservation (F-005/F-006)', () => {
    it('wiki-link [[Page|Display]] survives parse → serialize → reparse', () => {
      const md = [
        '| Name | Link |',
        '|------|------|',
        '| Alice | [[Nhân Vật|Tên Hiển Thị]] |',
      ].join('\n');

      const block1 = tryParseMarkdownTableBlock(md.split('\n'), 0);
      expect(block1).not.toBeNull();
      expect(block1.rows[0][1].trim()).toBe('[[Nhân Vật|Tên Hiển Thị]]');

      const serialized = formatMarkdownTableBlock(block1);
      const block2 = tryParseMarkdownTableBlock(serialized.split('\n'), 0);
      expect(block2).not.toBeNull();
      expect(block2.rows[0][1].trim()).toBe('[[Nhân Vật|Tên Hiển Thị]]');
    });

    it('inline code `a|b` survives roundtrip', () => {
      const md = ['| Code |', '|------|', '| `a|b` |'].join('\n');

      const block1 = tryParseMarkdownTableBlock(md.split('\n'), 0);
      expect(block1).not.toBeNull();
      expect(block1.rows[0][0].trim()).toBe('`a|b`');

      const serialized = formatMarkdownTableBlock(block1);
      const block2 = tryParseMarkdownTableBlock(serialized.split('\n'), 0);
      expect(block2).not.toBeNull();
      expect(block2.rows[0][0].trim()).toBe('`a|b`');
    });

    it('mixed wiki-link + code in multi-column roundtrip', () => {
      const md = ['| A | B |', '|---|---|', '| [[X|Y]] | `m|n` |'].join('\n');

      const block1 = tryParseMarkdownTableBlock(md.split('\n'), 0);
      expect(block1).not.toBeNull();
      expect(block1.rows[0]).toHaveLength(2);
      expect(block1.rows[0][0].trim()).toBe('[[X|Y]]');
      expect(block1.rows[0][1].trim()).toBe('`m|n`');

      const serialized = formatMarkdownTableBlock(block1);
      const block2 = tryParseMarkdownTableBlock(serialized.split('\n'), 0);
      expect(block2.rows[0][0].trim()).toBe('[[X|Y]]');
      expect(block2.rows[0][1].trim()).toBe('`m|n`');
    });

    it('escaped pipe roundtrip regression', () => {
      const md = ['| Data |', '|------|', '| 100\\|200 |'].join('\n');

      const block1 = tryParseMarkdownTableBlock(md.split('\n'), 0);
      expect(block1.rows[0][0].trim()).toBe('100|200');

      const serialized = formatMarkdownTableBlock(block1);
      expect(serialized).toContain('100\\|200');
    });
  });

  describe('serializeTableCellForMarkdown — selective pipe escaping', () => {
    it('does NOT escape pipe inside wiki-link', () => {
      expect(serializeTableCellForMarkdown('[[A|B]]')).toBe('[[A|B]]');
    });

    it('does NOT escape pipe inside inline code', () => {
      expect(serializeTableCellForMarkdown('`a|b`')).toBe('`a|b`');
    });

    it('mixed: escapes structural, preserves wiki + code', () => {
      expect(serializeTableCellForMarkdown('x|[[A|B]]|`c|d`|y')).toBe('x\\|[[A|B]]\\|`c|d`\\|y');
    });
  });
});
