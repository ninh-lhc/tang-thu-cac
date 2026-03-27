import { describe, it, expect } from 'vitest';
import { buildWikiLinkMatcher, splitTextByWikiMatcher } from './wikiLinkMatcher.js';

describe('wikiLinkMatcher', () => {
  it('builds matcher and dedupes names case-insensitively', () => {
    const matcher = buildWikiLinkMatcher([
      { name: 'Tiểu Minh' },
      { name: 'tiểu minh' },
      { name: 'Lão Vương' },
    ]);
    expect(matcher?.buckets?.get('t')?.length).toBe(1);
    expect(matcher?.buckets?.get('l')?.length).toBe(1);
  });

  it('splits text and prefers longest match first', () => {
    const matcher = buildWikiLinkMatcher([
      { name: 'Tiểu Minh' },
      { name: 'Tiểu' },
    ]);
    const parts = splitTextByWikiMatcher('Gặp Tiểu Minh hôm nay', matcher);
    expect(parts).toEqual([
      { text: 'Gặp ', isMatch: false },
      { text: 'Tiểu Minh', isMatch: true },
      { text: ' hôm nay', isMatch: false },
    ]);
  });

  it('returns full text when matcher is empty', () => {
    expect(splitTextByWikiMatcher('abc', null)).toEqual([{ text: 'abc', isMatch: false }]);
  });
});
