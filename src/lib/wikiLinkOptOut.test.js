import { describe, expect, it } from 'vitest';
import {
  applyWikiLinkOptOutsForSave,
  detectWikiLinkOptOuts,
  isWikiWrapOptedOut,
  mergeWikiLinkOptOuts,
  pruneWikiLinkOptOuts,
} from './wikiLinkOptOut.js';
import { autoWrapWikiLinksByEntityMapWithCount } from './autoWrapWikiLinks.js';

describe('wikiLinkOptOut', () => {
  const map = [{ name: 'Hồng Lâu' }, { name: 'Hồng Lâu Mộng' }];

  it('detects when user removed a wiki link but kept plain text in context', () => {
    const saved = 'The gioi [[Hồng Lâu]] Mộng la mot he.';
    const draft = 'The gioi Hồng Lâu Mộng la mot he.';
    const detected = detectWikiLinkOptOuts(saved, draft);
    expect(detected).toHaveLength(1);
    expect(detected[0].anchor).toBe('Hồng Lâu');
  });

  it('does not auto-wrap an opted-out anchor at the same context on save', () => {
    const saved = 'The gioi [[Hồng Lâu]] Mộng.';
    const draft = 'The gioi Hồng Lâu Mộng.';
    const { text, wikiLinkOptOuts } = applyWikiLinkOptOutsForSave({
      savedInfo: saved,
      preparedText: draft,
      wikiLinkOptOuts: [],
      entityMap: map,
      autoWrapWikiLinksByEntityMapWithCount,
    });
    expect(text).toBe('The gioi Hồng Lâu Mộng.');
    expect(wikiLinkOptOuts).toHaveLength(1);
    const again = autoWrapWikiLinksByEntityMapWithCount(text, map, { optOuts: wikiLinkOptOuts });
    expect(again.text).toBe(text);
    expect(again.count).toBe(0);
  });

  it('still wraps other occurrences without the same opt-out context', () => {
    const optOuts = [
      {
        anchor: 'Hồng Lâu',
        before: 'the gioi ',
        after: ' Mộng',
      },
    ];
    const text = 'Vao [[Kiến trúc]] roi den Hồng Lâu Mộng.';
    const wrapped = autoWrapWikiLinksByEntityMapWithCount(text, [{ name: 'Kiến trúc' }], { optOuts });
    expect(wrapped.text).toContain('[[Kiến trúc]]');
  });

  it('prefers longer entity names when not opted out', () => {
    const text = 'Gap Hồng Lâu Mộng hom qua.';
    const wrapped = autoWrapWikiLinksByEntityMapWithCount(text, map);
    expect(wrapped.text).toBe('Gap [[Hồng Lâu Mộng]] hom qua.');
  });

  it('prunes opt-outs that no longer appear in the text', () => {
    const pruned = pruneWikiLinkOptOuts('Khong con gi.', [
      { anchor: 'Hồng Lâu', before: 'x', after: 'y' },
    ]);
    expect(pruned).toHaveLength(0);
  });

  it('merges duplicate opt-outs by context key', () => {
    const merged = mergeWikiLinkOptOuts(
      [{ anchor: 'A', before: '1', after: '2' }],
      [{ anchor: 'A', before: '1', after: '2' }]
    );
    expect(merged).toHaveLength(1);
  });

  it('isWikiWrapOptedOut blocks the full phrase when after-context extends the span', () => {
    const text = 'The gioi Hồng Lâu Mộng';
    const optOuts = [{ anchor: 'Hồng Lâu', before: 'The gioi ', after: ' Mộng' }];
    const shortStart = text.indexOf('Hồng Lâu');
    const shortEnd = shortStart + 'Hồng Lâu'.length;
    const longEnd = shortStart + 'Hồng Lâu Mộng'.length;
    expect(isWikiWrapOptedOut(text, shortStart, shortEnd, 'Hồng Lâu', optOuts)).toBe(true);
    expect(isWikiWrapOptedOut(text, shortStart, longEnd, 'Hồng Lâu Mộng', optOuts)).toBe(true);
    expect(
      isWikiWrapOptedOut(text, shortStart, shortEnd, 'Hồng Lâu', [
        { anchor: 'Hồng Lâu', before: 'khac ', after: ' het' },
      ])
    ).toBe(false);
  });
});
