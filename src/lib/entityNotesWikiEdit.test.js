import { describe, expect, it } from 'vitest';
import {
  collectWikiLinkRanges,
  replaceTextRange,
  toggleWikiLinkSelection,
  unwrapWikiLinkSelection,
  wrapSelectionAsWikiLink,
} from './entityNotesWikiEdit.js';

describe('entityNotesWikiEdit', () => {
  it('replaceTextRange only changes the targeted span', () => {
    const out = replaceTextRange('A [[Một]] B [[Hai]] C', 2, 9, 'Một');
    expect(out.newText).toBe('A Một B [[Hai]] C');
  });

  it('unwraps wiki at start, middle, and end', () => {
    expect(unwrapWikiLinkSelection('[[A]] tail', 0, 5).newText).toBe('A tail');
    expect(unwrapWikiLinkSelection('head [[B]] tail', 5, 10).newText).toBe('head B tail');
    expect(unwrapWikiLinkSelection('head [[C]]', 5, 10).newText).toBe('head C');
  });

  it('unwraps only the first link when two links exist', () => {
    const input = 'A [[Một]] B [[Hai]] C';
    const out = unwrapWikiLinkSelection(input, 2, 9);
    expect(out.newText).toBe('A Một B [[Hai]] C');
    expect(out.newText).not.toContain('B Hai C');
  });

  it('wraps selection without nested brackets', () => {
    const input = 'Triệu Hoán Không Gian';
    const out = wrapSelectionAsWikiLink(input, 0, input.length);
    expect(out.newText).toBe('[[Triệu Hoán Không Gian]]');
    expect(wrapSelectionAsWikiLink(out.newText, 0, out.newText.length).changed).toBe(false);
  });

  it('preserves Vietnamese, emoji, and newlines around links', () => {
    const input = 'Dòng 1 [[Việt Nam 🇻🇳]]\nDòng 2';
    const caret = input.indexOf('Việt');
    const out = unwrapWikiLinkSelection(input, caret, caret);
    expect(out.newText).toBe('Dòng 1 Việt Nam 🇻🇳\nDòng 2');
  });

  it('keeps markdown table pipes intact when unwrapping a cell link', () => {
    const input = '| [[Entity Mới]] | [[Entity Đã Có]] |';
    const out = unwrapWikiLinkSelection(input, 2, 16);
    expect(out.newText).toBe('| Entity Mới | [[Entity Đã Có]] |');
  });

  it('does not treat wiki-like text inside code fence as editable link', () => {
    const input = '```\n| [[A]] |\n```\n[[B]]';
    const ranges = collectWikiLinkRanges(input);
    expect(ranges).toHaveLength(1);
    expect(ranges[0].inner).toBe('B');
  });

  it('toggle unwrap then preserves surrounding punctuation', () => {
    const input = 'Đây là [[Triệu Hoán Không Gian]].';
    const caret = input.indexOf('Triệu');
    const out = toggleWikiLinkSelection(input, caret, caret);
    expect(out.newText).toBe('Đây là Triệu Hoán Không Gian.');
  });

  it('does nothing when unwrap is requested outside wiki', () => {
    const input = 'plain text';
    const out = unwrapWikiLinkSelection(input, 3, 3);
    expect(out.changed).toBe(false);
    expect(out.newText).toBe(input);
  });
});
