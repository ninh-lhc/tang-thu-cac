import { describe, expect, it } from 'vitest';
import { normalizeSearchText } from './normalizeSearchText.js';

describe('normalizeSearchText', () => {
  it('normalizes Vietnamese diacritics, d/đ, and extra whitespace', () => {
    expect(normalizeSearchText('  Ti\u1EBFng   Vi\u1EC7t  ')).toBe('tieng viet');
    expect(normalizeSearchText('\u0110an \u0110i\u1EC1n')).toBe('dan dien');
  });
});
