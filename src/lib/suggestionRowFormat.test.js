import { describe, it, expect } from 'vitest';
import {
  parseSuggestionRow,
  normalizeSuggestionRows,
  serializeSuggestionRows,
  countSuggestionRows,
  suggestionRowsToValues,
} from './suggestionRowFormat.js';

describe('suggestionRowFormat', () => {
  it('parses prefix|value format', () => {
    expect(parseSuggestionRow('I|Đại Khu')).toEqual({ prefix: 'I', value: 'Đại Khu' });
    expect(parseSuggestionRow('Đại Khu')).toEqual({ prefix: '', value: 'Đại Khu' });
    expect(parseSuggestionRow('')).toEqual({ prefix: '', value: '' });
    expect(parseSuggestionRow('  1.1 |  Tiểu Thiên Giới  ')).toEqual({
      prefix: '1.1',
      value: 'Tiểu Thiên Giới',
    });
  });

  it('normalizes list of strings into rows, dropping empty', () => {
    const rows = normalizeSuggestionRows(['I|Đại Khu', '', 'Trung Thiên Giới', '  |  ']);
    expect(rows).toEqual([
      { prefix: 'I', value: 'Đại Khu' },
      { prefix: '', value: 'Trung Thiên Giới' },
    ]);
  });

  it('serializes rows back to newline string in prefix|value format', () => {
    const s = serializeSuggestionRows([
      { prefix: 'I', value: 'Đại Khu' },
      { prefix: '', value: 'Trung Thiên Giới' },
      { prefix: '', value: '' },
      { prefix: '1.1', value: '' },
    ]);
    expect(s).toBe('I|Đại Khu\nTrung Thiên Giới\n1.1|');
  });

  it('counts only rows with content', () => {
    expect(
      countSuggestionRows([
        { prefix: '', value: '' },
        { prefix: 'I', value: '' },
        { prefix: '', value: 'A' },
      ])
    ).toBe(2);
  });

  it('extracts displayed values (without prefix) and dedupes', () => {
    expect(
      suggestionRowsToValues(['I|Đại Khu', 'Đại Khu', 'II|Trung Thiên Giới', '  |  '])
    ).toEqual(['Đại Khu', 'Trung Thiên Giới']);
  });
});
