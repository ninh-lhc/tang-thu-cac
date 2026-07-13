import { describe, expect, it } from 'vitest';
import { buildWikiLinkMatcher, splitTextByWikiMatcher } from './wikiLinkMatcher.js';
import { autoWrapWikiLinksByEntityMapWithCount } from './autoWrapWikiLinks.js';
import {
  buildStatusTierLabelSet,
  findHierarchyChainAround,
  shouldSkipWikiLinkInHierarchyContext,
  tokenizeHierarchyLineWithSpans,
} from './wikiHierarchyLinkGuard.js';

describe('wikiHierarchyLinkGuard', () => {
  it('tokenizeHierarchyLineWithSpans keeps absolute token positions', () => {
    const line = 'Tu Luyện - Bạch ngân - Sơ Kỳ';
    const tokens = tokenizeHierarchyLineWithSpans(line, 0, line.length);
    expect(tokens).toHaveLength(3);
    expect(tokens[1]).toMatchObject({ text: 'Bạch ngân', start: 11, end: 20 });
  });

  it('detects hierarchy chain around a tier token', () => {
    const text = 'Cảnh giới: Tu Luyện - Bạch ngân - Sơ Kỳ';
    const start = text.indexOf('Bạch ngân');
    const end = start + 'Bạch ngân'.length;
    const chain = findHierarchyChainAround(text, start, end);
    expect(chain?.tokenCount).toBe(3);
    expect(chain?.matchedToken?.text).toBe('Bạch ngân');
  });

  it('skips wiki match for tier label inside a 3-part hierarchy chain', () => {
    const tierLabelSet = new Set(['bach ngan', 'hoang kim']);
    const text = 'Hệ thống - Bạch ngân - Viên Mãn';
    const start = text.indexOf('Bạch ngân');
    const end = start + 'Bạch ngân'.length;
    expect(shouldSkipWikiLinkInHierarchyContext(text, start, end, { tierLabelSet })).toBe(true);
  });

  it('still allows wiki match for material mention in free prose', () => {
    const tierLabelSet = new Set(['bach ngan']);
    const text = 'Thu thập thêm Bạch ngân trong hang.';
    const start = text.indexOf('Bạch ngân');
    const end = start + 'Bạch ngân'.length;
    expect(shouldSkipWikiLinkInHierarchyContext(text, start, end, { tierLabelSet })).toBe(false);
  });

  it('buildStatusTierLabelSet collects f_status suggestion tokens', () => {
    const set = buildStatusTierLabelSet({
      tabsConfig: [
        {
          subTabs: [
            {
              fieldSuggestionLists: {
                f_status: ['Tu Luyện - Bạch ngân - Sơ Kỳ', 'Hoàng kim'],
              },
            },
          ],
        },
      ],
      data: {},
    });
    expect(set.has('bach ngan')).toBe(true);
    expect(set.has('hoang kim')).toBe(true);
    expect(set.has('tu luyen')).toBe(true);
  });

  it('matcher does not highlight material names used as hierarchy tiers', () => {
    const tierLabelSet = new Set(['bach ngan', 'hoang kim']);
    const matcher = buildWikiLinkMatcher([{ name: 'Bạch ngân' }, { name: 'Hoàng kim' }], { tierLabelSet });
    expect(splitTextByWikiMatcher('Tu Luyện - Bạch ngân - Hoàng kim - Sơ Kỳ', matcher)).toEqual([
      { text: 'Tu Luyện - Bạch ngân - Hoàng kim - Sơ Kỳ', isMatch: false },
    ]);
  });

  it('auto-wrap skips hierarchy tiers but wraps free prose mentions', () => {
    const tierLabelSet = new Set(['bach ngan']);
    const entityMap = [{ name: 'Bạch ngân', entityName: 'Bạch ngân' }];
    const hierarchy = autoWrapWikiLinksByEntityMapWithCount('Tu Luyện - Bạch ngân - Sơ Kỳ', entityMap, {
      tierLabelSet,
    });
    expect(hierarchy.text).toBe('Tu Luyện - Bạch ngân - Sơ Kỳ');
    expect(hierarchy.count).toBe(0);

    const prose = autoWrapWikiLinksByEntityMapWithCount('Cần thu thập Bạch ngân.', entityMap, { tierLabelSet });
    expect(prose.text).toBe('Cần thu thập [[Bạch ngân]].');
    expect(prose.count).toBe(1);
  });
});
