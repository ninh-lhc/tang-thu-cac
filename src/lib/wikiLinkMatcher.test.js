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

  it('skips matcher hits covered by wiki link opt-outs', () => {
    const matcher = buildWikiLinkMatcher([{ name: 'Hồng Lâu' }, { name: 'Hồng Lâu Mộng' }]);
    const optOuts = [{ anchor: 'Hồng Lâu', before: 'The gioi ', after: ' Mộng.' }];
    expect(splitTextByWikiMatcher('The gioi Hồng Lâu Mộng.', matcher, optOuts)).toEqual([
      { text: 'The gioi Hồng Lâu Mộng.', isMatch: false },
    ]);
  });
});
