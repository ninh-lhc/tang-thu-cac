import { describe, it, expect } from 'vitest';
import { buildWikiLinkMatcher, splitTextByWikiMatcher } from './wikiLinkMatcher.js';

describe('wikiLinkMatcher', () => {
  it('dedupes exact duplicate surfaces but keeps distinct case variants', () => {
    const matcher = buildWikiLinkMatcher([
      { name: 'Tiểu Minh' },
      { name: 'Tiểu Minh' },
      { name: 'tiểu minh' },
      { name: 'Lão Vương' },
    ]);
    expect(matcher?.buckets?.get('t')?.length).toBe(2);
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

  it('does not match a lowercase phrase when the entity surface is title-cased', () => {
    const matcher = buildWikiLinkMatcher([{ name: 'Độ Kiếp' }]);
    expect(splitTextByWikiMatcher('hắn đang độ kiếp', matcher)).toEqual([
      { text: 'hắn đang độ kiếp', isMatch: false },
    ]);
  });

  it('still matches the title-cased surface for title-cased entities', () => {
    const matcher = buildWikiLinkMatcher([{ name: 'Độ Kiếp' }]);
    expect(splitTextByWikiMatcher('Chạm tới Độ Kiếp rồi', matcher)).toEqual([
      { text: 'Chạm tới ', isMatch: false },
      { text: 'Độ Kiếp', isMatch: true },
      { text: ' rồi', isMatch: false },
    ]);
  });

  it('does not match a shorter entity inside a longer proper phrase', () => {
    const matcher = buildWikiLinkMatcher([{ name: 'Hồng Lâu' }]);
    expect(splitTextByWikiMatcher('The gioi Hồng Lâu Mộng.', matcher)).toEqual([
      { text: 'The gioi Hồng Lâu Mộng.', isMatch: false },
    ]);
  });

  it('matches the full longer name when both are registered', () => {
    const matcher = buildWikiLinkMatcher([{ name: 'Hồng Lâu' }, { name: 'Hồng Lâu Mộng' }]);
    expect(splitTextByWikiMatcher('The gioi Hồng Lâu Mộng.', matcher)).toEqual([
      { text: 'The gioi ', isMatch: false },
      { text: 'Hồng Lâu Mộng', isMatch: true },
      { text: '.', isMatch: false },
    ]);
  });

  it('still links the entity when the next word is not title-case', () => {
    const matcher = buildWikiLinkMatcher([{ name: 'Hồng Lâu' }]);
    expect(splitTextByWikiMatcher('Gặp Hồng Lâu đã đến', matcher)).toEqual([
      { text: 'Gặp ', isMatch: false },
      { text: 'Hồng Lâu', isMatch: true },
      { text: ' đã đến', isMatch: false },
    ]);
  });

  it('skips matcher hits covered by wiki link opt-outs', () => {
    const matcher = buildWikiLinkMatcher([{ name: 'Hồng Lâu' }, { name: 'Hồng Lâu Mộng' }]);
    const optOuts = [{ anchor: 'Hồng Lâu', before: 'The gioi ', after: ' Mộng.' }];
    expect(splitTextByWikiMatcher('The gioi Hồng Lâu Mộng.', matcher, optOuts)).toEqual([
      { text: 'The gioi Hồng Lâu Mộng.', isMatch: false },
    ]);
  });
});
