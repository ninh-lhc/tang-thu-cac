import { describe, expect, it } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import {
  convertHtmlTablesToMarkdown,
  prepareEntityNotesPasteText,
} from './entityNotesEditorPaste.js';
import {
  joinPhysicalLinesIntoLogicalTableRows,
  tryParseMarkdownTableBlock,
} from './markdownTable.js';
import { buildEntityNotesPreviewModel } from './renderEntityNotesMarkdown.jsx';
import { buildFullSixRowNotebookTablePaste } from './notebookTablePasteFixture.js';

function parseTableAt(text) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.trim().startsWith('|'));
  return tryParseMarkdownTableBlock(lines, start >= 0 ? start : 0);
}

function expectPreviewTable(text) {
  const model = buildEntityNotesPreviewModel(text, null, [], null, null, null, {});
  const { container } = render(React.createElement('div', null, model.blocks));
  expect(container.querySelector('.entity-notes-md-table')).not.toBeNull();
  expect(container.textContent).not.toMatch(/\|\s*:---/);
}

describe('entityNotesEditorPaste', () => {
  it('normalizes pasted GFM table and preserves wiki-links', () => {
    const plain = [
      '| Giai đoạn | Kỹ năng |',
      '|---|---|',
      '| Cấp 1–39 | [[Triệu Hồi Khô Lâu Chiến Sĩ]] |',
    ].join('\n');

    const out = prepareEntityNotesPasteText({ plain });
    const block = parseTableAt(out);
    expect(block).not.toBeNull();
    expect(block.rows[0][1].trim()).toBe('[[Triệu Hồi Khô Lâu Chiến Sĩ]]');
    expect(out.startsWith('| Giai đoạn | Kỹ năng |')).toBe(true);
  });

  it('handles mixed heading, list, and table', () => {
    const plain = [
      '# Tổng hợp kỹ năng',
      '',
      '- Ghi chú: [[Bách Khoa Tu Tiên]]',
      '',
      '| Giai đoạn | Kỹ năng |',
      '|---|---|',
      '| Cấp 1 | [[A]] |',
    ].join('\n');

    const out = prepareEntityNotesPasteText({ plain });
    expect(out).toContain('# Tổng hợp kỹ năng');
    expect(out).toContain('- Ghi chú: [[Bách Khoa Tu Tiên]]');
    const lineIndex = out.split('\n').findIndex((line) => line.startsWith('| Giai'));
    expect(tryParseMarkdownTableBlock(out.split('\n'), lineIndex)).not.toBeNull();
  });

  it('converts HTML table when plain text lacks markdown table', () => {
    const html = `
      <table>
        <tr><th>Giai đoạn</th><th>Kỹ năng</th></tr>
        <tr><td>Cấp 1</td><td>[[Triệu Hồi]]</td></tr>
      </table>`;
    const md = convertHtmlTablesToMarkdown(html);
    expect(md).toContain('[[Triệu Hồi]]');
    const out = prepareEntityNotesPasteText({ plain: ' ', html });
    expect(tryParseMarkdownTableBlock(out.split('\n'), 0)).not.toBeNull();
  });

  it('does not turn fenced markdown table into live table text outside fence', () => {
    const plain = ['```markdown', '| Tên | Mô tả |', '|---|---|', '| A | B |', '```'].join('\n');
    const out = prepareEntityNotesPasteText({ plain });
    expect(out).toBe(plain);
  });

  it('sanitizes br tags inside cells via table reformat on paste', () => {
    const plain = ['| A | B |', '|---|---|', '| line1<br>line2 | C |'].join('\n');
    const out = prepareEntityNotesPasteText({ plain });
    const block = parseTableAt(out);
    expect(block).not.toBeNull();
    expect(block.rows[0][0]).toMatch(/line1 line2/);
    expect(out).not.toContain('<br');
    expectPreviewTable(out);
  });

  it('parses 3-column table with literal <br> in cell', () => {
    const plain = [
      '| Giai đoạn | Cấp độ | Kỹ năng |',
      '|---|---|---|',
      '| Hắc Thiết | Cấp 1–9:<br>[[Triệu Hồi Khô Lâu Chiến Sĩ]] | Nội dung |',
    ].join('\n');
    const out = prepareEntityNotesPasteText({ plain });
    const block = parseTableAt(out);
    expect(block).not.toBeNull();
    expect(block.header.length).toBe(3);
    expect(block.rows).toHaveLength(1);
    expect(block.rows[0][1]).toContain('[[Triệu Hồi Khô Lâu Chiến Sĩ]]');
    expectPreviewTable(out);
  });

  it('joins newline inside cell into one logical row (NotebookLM plain text)', () => {
    const plain = [
      '| Giai đoạn | Cấp độ | Kỹ năng |',
      '|---|---|---|',
      '| Hắc Thiết | Cấp 1–9:',
      '[[Triệu Hồi Khô Lâu Chiến Sĩ]] | Nội dung |',
    ].join('\n');
    const out = prepareEntityNotesPasteText({ plain });
    const block = parseTableAt(out);
    expect(block).not.toBeNull();
    expect(block.header.length).toBe(3);
    expect(block.rows).toHaveLength(1);
    expect(block.rows[0][1]).toContain('[[Triệu Hồi Khô Lâu Chiến Sĩ]]');
    expectPreviewTable(out);
  });

  it('preview renders joined table without re-paste (render path uses same parser)', () => {
    const raw = [
      '| Giai đoạn | Cấp độ | Kỹ năng |',
      '|---|---|---|',
      '| Hắc Thiết | Cấp 1–9:',
      '[[Triệu Hồi Khô Lâu Chiến Sĩ]] | Nội dung |',
    ].join('\n');
    expectPreviewTable(raw);
  });

  it('normalizes full 6-row 5-column paste with br, newlines, wiki, and outside markdown', () => {
    const plain = buildFullSixRowNotebookTablePaste();
    const out = prepareEntityNotesPasteText({ plain });
    expect(out).toContain('# Bảng kỹ năng 🛡️');
    expect(out).toContain('- Nguồn: [[Bách Khoa Tu Tiên]]');
    const block = parseTableAt(out);
    expect(block).not.toBeNull();
    expect(block.header.length).toBe(6);
    expect(block.rows.length).toBe(6);
    expect(block.rows[0][1]).toContain('[[Triệu Hồi Khô Lâu Chiến Sĩ]]');
    expect(block.rows[1][4]).toContain('[[Cuồng Bạo Nhất Kích]]');
    expect(out).not.toContain('<br');
    expectPreviewTable(out);
    expectPreviewTable(plain);
  });

  it('parses 5-column realistic table with split rows and wiki links', () => {
    const plain = [
      '| Giai Đoạn / Phẩm Chất | Cấp Độ & Kỹ Năng | Ngoại Hình & Vũ Khí | Thuộc Tính Tứ Duy | Kỹ Năng Đơn Vị |',
      '| :--- | :--- | :--- | :--- | :--- |',
      '| **1. Cấp Hắc Thiết** | Cấp 1 – 9:',
      '[[Triệu Hồi Khô Lâu Chiến Sĩ]] | Khung xương xám | • 15 điểm [[Toàn Diện Cường Hóa]] | • ~500m<br>• sát thương |',
      '| **2. Cấp Thanh Đồng** | Cấp 10 – 19:',
      '[[Triệu Hồi Khô Lâu Chiến Sĩ]] | Khung xanh | • 3.000 điểm/hạng | • [[Cuồng Bạo Nhất Kích]] |',
    ].join('\n');
    const out = prepareEntityNotesPasteText({ plain });
    const block = parseTableAt(out);
    expect(block).not.toBeNull();
    expect(block.header.length).toBe(5);
    expect(block.rows.length).toBe(2);
    expect(block.rows[0][1]).toContain('[[Triệu Hồi Khô Lâu Chiến Sĩ]]');
    expect(block.rows[1][4]).toContain('[[Cuồng Bạo Nhất Kích]]');
    expectPreviewTable(out);
  });

  it('does not treat a single pipe as a markdown table', () => {
    const plain = 'Ghi chú: dùng A | B khi cần so sánh.';
    const out = prepareEntityNotesPasteText({ plain });
    expect(out).toBe(plain);
    expect(textContainsMarkdownTableSafe(out)).toBe(false);
  });

  it('falls back safely when row has too many columns after join', () => {
    const physical = [
      '| A | B |',
      '| C | D | E | F | G | H |',
    ];
    expect(joinPhysicalLinesIntoLogicalTableRows(physical, 2)).toBeNull();
  });
});

function textContainsMarkdownTableSafe(text) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    if (tryParseMarkdownTableBlock(lines, i)) return true;
  }
  return false;
}
