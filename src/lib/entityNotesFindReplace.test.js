import { describe, expect, it } from 'vitest';
import {
  countEntityNotesFindMatches,
  replaceEntityNotesText,
} from './entityNotesFindReplace.js';

describe('entityNotesFindReplace', () => {
  it('replaces every plain occurrence', () => {
    const text = 'Tần gia mạnh. Người Tần gia ít.';
    const result = replaceEntityNotesText(text, 'Tần gia', 'Lĩnh Nam Tần gia');
    expect(result.count).toBe(2);
    expect(result.text).toBe('Lĩnh Nam Tần gia mạnh. Người Lĩnh Nam Tần gia ít.');
  });

  it('replaces inside wiki brackets', () => {
    const text = '[[Tần gia]] và Tần gia khác.';
    const result = replaceEntityNotesText(text, 'Tần gia', 'Lĩnh Nam Tần gia');
    expect(result.count).toBe(2);
    expect(result.text).toBe('[[Lĩnh Nam Tần gia]] và Lĩnh Nam Tần gia khác.');
  });

  it('does not double-prefix already disambiguated names', () => {
    const text = 'Lĩnh Nam Tần gia và Tần gia còn lại.';
    const result = replaceEntityNotesText(text, 'Tần gia', 'Lĩnh Nam Tần gia');
    expect(result.count).toBe(1);
    expect(result.text).toBe('Lĩnh Nam Tần gia và Lĩnh Nam Tần gia còn lại.');
  });

  it('does not double-prefix inside wiki that already has full name', () => {
    const text = '[[Lĩnh Nam Tần gia]] gặp Tần gia.';
    const result = replaceEntityNotesText(text, 'Tần gia', 'Lĩnh Nam Tần gia');
    expect(result.count).toBe(1);
    expect(result.text).toBe('[[Lĩnh Nam Tần gia]] gặp Lĩnh Nam Tần gia.');
  });

  it('respects whole-word matching', () => {
    const text = 'Tần giax và Tần gia.';
    const result = replaceEntityNotesText(text, 'Tần gia', 'X', { wholeWord: true });
    expect(result.count).toBe(1);
    expect(result.text).toBe('Tần giax và X.');
  });

  it('can match case-insensitively', () => {
    const text = 'Tần Gia và tần gia.';
    const result = replaceEntityNotesText(text, 'tần gia', 'Lĩnh Nam Tần gia', {
      caseSensitive: false,
    });
    expect(result.count).toBe(2);
    expect(result.text).toBe('Lĩnh Nam Tần gia và Lĩnh Nam Tần gia.');
  });

  it('counts matches without mutating', () => {
    const text = 'Tần gia · Tần gia · Lĩnh Nam Tần gia';
    expect(
      countEntityNotesFindMatches(text, 'Tần gia', { replaceWith: 'Lĩnh Nam Tần gia' })
    ).toBe(2);
  });

  it('returns unchanged text when find is empty', () => {
    const text = 'abc';
    expect(replaceEntityNotesText(text, '', 'x')).toEqual({ text: 'abc', count: 0 });
  });

  it('wraps plain matches as wiki links', () => {
    const text = 'Tần gia mạnh. Người Tần gia ít.';
    const result = replaceEntityNotesText(text, 'Tần gia', '', { wrapMatched: true });
    expect(result.count).toBe(2);
    expect(result.text).toBe('[[Tần gia]] mạnh. Người [[Tần gia]] ít.');
  });

  it('does not double-wrap text already in wiki brackets', () => {
    const text = '[[Tần gia]] và Tần gia khác.';
    const result = replaceEntityNotesText(text, 'Tần gia', '', { wrapMatched: true });
    expect(result.count).toBe(1);
    expect(result.text).toBe('[[Tần gia]] và [[Tần gia]] khác.');
  });

  it('does not wrap partial matches inside an existing wiki link', () => {
    const text = '[[Tần gia]] và Tần gia.';
    const result = replaceEntityNotesText(text, 'Tần', '', { wrapMatched: true });
    expect(result.count).toBe(1);
    expect(result.text).toBe('[[Tần gia]] và [[Tần]] gia.');
  });

  it('wraps replacement text after replace', () => {
    const text = 'Tần gia gặp Tần gia.';
    const result = replaceEntityNotesText(text, 'Tần gia', 'Kim Phong Tế Vũ Lâu', {
      wrapReplacement: true,
    });
    expect(result.count).toBe(2);
    expect(result.text).toBe('[[Kim Phong Tế Vũ Lâu]] gặp [[Kim Phong Tế Vũ Lâu]].');
  });

  it('strips outer brackets when wrapping replacement label', () => {
    const text = 'Tần gia.';
    const result = replaceEntityNotesText(text, 'Tần gia', '[[Kim Phong Tế Vũ Lâu]]', {
      wrapReplacement: true,
    });
    expect(result.text).toBe('[[Kim Phong Tế Vũ Lâu]].');
  });

  it('replaces an existing wiki link with one wrapped replacement', () => {
    const text = '[[Tần gia]] gặp Tần gia.';
    const result = replaceEntityNotesText(text, 'Tần gia', 'Kim Phong Tế Vũ Lâu', {
      wrapReplacement: true,
    });
    expect(result.count).toBe(2);
    expect(result.text).toBe('[[Kim Phong Tế Vũ Lâu]] gặp [[Kim Phong Tế Vũ Lâu]].');
  });

  it('keeps one wiki layer when replacing a partial match inside a wiki link', () => {
    const text = '[[Tần gia]] gặp Tần gia.';
    const result = replaceEntityNotesText(text, 'Tần', 'Kim', {
      wrapReplacement: true,
    });
    expect(result.count).toBe(2);
    expect(result.text).toBe('[[Kim gia]] gặp [[Kim]] gia.');
  });
});
