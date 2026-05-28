import { describe, expect, it } from 'vitest';
import {
  applyWikiLinkOptOutsForSave,
  buildWikiLinkOptOutFromUnwrap,
  countNewWikiLinkOptOuts,
  detectWikiLinkOptOuts,
  detectWikiLinkOptOutsFromPlainText,
  isWikiWrapOptedOut,
  mergeWikiLinkOptOuts,
  pruneWikiLinkOptOuts,
  resolveEffectiveWikiLinkOptOuts,
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
      autoWrapOnSave: true,
    });
    expect(text).toBe('The gioi Hồng Lâu Mộng.');
    expect(wikiLinkOptOuts.length).toBeGreaterThan(0);
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

  it('mergeWikiLinkOptOuts accepts more than two lists', () => {
    const merged = mergeWikiLinkOptOuts(
      [{ anchor: 'A', before: '1', after: '2' }],
      [{ anchor: 'B', before: '3', after: '4' }],
      [{ anchor: 'C', before: '5', after: '6' }]
    );
    expect(merged).toHaveLength(3);
  });

  it('does not opt-out same-surface plain mentions left unwrapped beside existing wiki links', () => {
    const prepared = '[[Diệp Thiên Dật]] gap Diệp Thiên Dật.';
    const diepMap = [{ name: 'Diệp Thiên Dật' }];
    const detected = detectWikiLinkOptOutsFromPlainText(
      prepared,
      diepMap,
      autoWrapWikiLinksByEntityMapWithCount
    );
    expect(detected).toHaveLength(0);
    const { text } = applyWikiLinkOptOutsForSave({
      savedInfo: prepared,
      preparedText: prepared,
      wikiLinkOptOuts: [],
      entityMap: diepMap,
      autoWrapWikiLinksByEntityMapWithCount,
      autoWrapOnSave: true,
    });
    expect(text).toBe('[[Diệp Thiên Dật]] gap [[Diệp Thiên Dật]].');
  });

  it('detects opt-out when plain surface differs from the card title (lowercase mention)', () => {
    const prepared = 'The gioi hong lau mong.';
    const titleMap = [{ name: 'Hồng Lâu Mộng' }];
    const detected = detectWikiLinkOptOutsFromPlainText(
      prepared,
      titleMap,
      autoWrapWikiLinksByEntityMapWithCount
    );
    expect(detected).toHaveLength(0);
    const { text } = applyWikiLinkOptOutsForSave({
      savedInfo: prepared,
      preparedText: prepared,
      wikiLinkOptOuts: [],
      entityMap: titleMap,
      autoWrapWikiLinksByEntityMapWithCount,
      autoWrapOnSave: true,
    });
    expect(text).toBe(prepared);
  });

  it('buildWikiLinkOptOutFromUnwrap captures context for toolbar unwrap', () => {
    const text = 'The gioi [[Hồng Lâu]] Mộng.';
    const wikiStart = text.indexOf('[[');
    const wikiEnd = text.indexOf(']]') + 2;
    const optOut = buildWikiLinkOptOutFromUnwrap(text, wikiStart, wikiEnd);
    expect(optOut?.anchor).toBe('Hồng Lâu');
    const wrapped = autoWrapWikiLinksByEntityMapWithCount('The gioi Hồng Lâu Mộng.', map, {
      optOuts: [optOut],
    });
    expect(wrapped.text).toBe('The gioi Hồng Lâu Mộng.');
  });

  it('resolveEffectiveWikiLinkOptOuts merges stored, pending, and draft diff', () => {
    const saved = 'The gioi [[Hồng Lâu]] Mộng la mot he.';
    const draft = 'The gioi Hồng Lâu Mộng la mot he.';
    const pending = [{ anchor: 'Kiến trúc', before: 'Vao ', after: ' roi' }];
    const effective = resolveEffectiveWikiLinkOptOuts({
      stored: [],
      pending,
      savedBaseline: saved,
      draftText: draft,
      entityMap: map,
    });
    expect(effective.some((o) => o.anchor === 'Hồng Lâu')).toBe(true);
    expect(effective.some((o) => o.anchor === 'Kiến trúc')).toBe(true);
  });

  it('countNewWikiLinkOptOuts ignores duplicates already stored', () => {
    const stored = [{ anchor: 'A', before: 'x', after: 'y' }];
    const merged = mergeWikiLinkOptOuts(stored, [{ anchor: 'A', before: 'x', after: 'y' }, { anchor: 'B', before: '1', after: '2' }]);
    expect(countNewWikiLinkOptOuts(stored, merged)).toBe(1);
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
