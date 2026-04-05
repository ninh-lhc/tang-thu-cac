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

  it('does not match entity names inside a longer word', () => {
    const matcher = buildWikiLinkMatcher([{ name: 'Linh' }]);
    expect(splitTextByWikiMatcher('LinhLuc rat manh', matcher)).toEqual([
      { text: 'LinhLuc rat manh', isMatch: false },
    ]);
  });

  it('still matches when surrounded by punctuation boundaries', () => {
    const matcher = buildWikiLinkMatcher([{ name: 'Linh' }]);
    expect(splitTextByWikiMatcher('(Linh), Linh!', matcher)).toEqual([
      { text: '(', isMatch: false },
      { text: 'Linh', isMatch: true },
      { text: '), ', isMatch: false },
      { text: 'Linh', isMatch: true },
      { text: '!', isMatch: false },
    ]);
  });
});
