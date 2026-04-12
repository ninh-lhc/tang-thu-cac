import { describe, expect, it } from 'vitest';
import {
  isBeyondRankLabel,
  parseRankNumber,
  parseStatusHierarchy,
  splitStatusHierarchyTokens,
} from './statusHierarchyParser.js';

describe('statusHierarchyParser', () => {
  it('splits hierarchy by delimiter but keeps hyphenated names intact', () => {
    expect(splitStatusHierarchyTokens('Gia Toc - Bat Cap the luc - Tay-Bac Chau - Tran-An')).toEqual([
      'Gia Toc',
      'Bat Cap the luc',
      'Tay-Bac Chau',
      'Tran-An',
    ]);
  });

  it('parses hierarchy with or without category token', () => {
    expect(parseStatusHierarchy('Gia Toc - Bat Cap the luc - Tay-Bac Chau')).toEqual({
      categoryLabel: 'Gia Toc',
      rankLabel: 'Bat Cap the luc',
      chain: ['Tay-Bac Chau'],
    });
    expect(parseStatusHierarchy('Bat Cap the luc - Tay-Bac Chau')).toEqual({
      categoryLabel: '',
      rankLabel: 'Bat Cap the luc',
      chain: ['Tay-Bac Chau'],
    });
  });

  it('parses rank number consistently for Tam and Tam accent variants', () => {
    expect(parseRankNumber('Tam Cap the luc')).toBe(3);
    expect(parseRankNumber('T\u00e1m C\u1ea5p th\u1ebf l\u1ef1c')).toBe(8);
    expect(parseRankNumber('Cap 12')).toBe(12);
  });

  it('parses advanced Vuong Ton De force ranks from strongest to weakest', () => {
    expect(parseRankNumber('Thiên Đế cấp thế lực')).toBe(1);
    expect(parseRankNumber('Địa Tôn cấp thế lực')).toBe(12);
    expect(parseRankNumber('Đại Vương cấp thế lực')).toBe(23);
    expect(parseRankNumber('Tôn giới')).toBeNaN();
  });

  it('detects beyond-rank label only for Bat with accent', () => {
    expect(isBeyondRankLabel('B\u1ea5t C\u1ea5p th\u1ebf l\u1ef1c')).toBe(true);
    expect(isBeyondRankLabel('Bat Cap the luc')).toBe(false);
  });
});
