import { describe, expect, it } from 'vitest';
import { autoWrapWikiLinksByEntityMap, autoWrapWikiLinksByEntityMapWithCount } from './autoWrapWikiLinks.js';

describe('autoWrapWikiLinksByEntityMap', () => {
  it('wraps plain matching entity names', () => {
    const text = 'Nhận được vũ kỹ Huyền Cấp Cực Phẩm.';
    const map = [{ name: 'Huyền Cấp Cực Phẩm' }];
    expect(autoWrapWikiLinksByEntityMap(text, map)).toBe('Nhận được vũ kỹ [[Huyền Cấp Cực Phẩm]].');
  });

  it('does not wrap text already inside [[...]]', () => {
    const text = 'Đã có [[Huyền Cấp Cực Phẩm]] rồi.';
    const map = [{ name: 'Huyền Cấp Cực Phẩm' }];
    expect(autoWrapWikiLinksByEntityMap(text, map)).toBe(text);
  });

  it('prefers longer names first', () => {
    const text = 'Linh Giới Châu xuất hiện.';
    const map = [{ name: 'Linh Giới' }, { name: 'Linh Giới Châu' }];
    expect(autoWrapWikiLinksByEntityMap(text, map)).toBe('[[Linh Giới Châu]] xuất hiện.');
  });

  it('keeps word boundaries safe', () => {
    const text = 'linh giới và alinh giớib';
    const map = [{ name: 'linh giới' }];
    expect(autoWrapWikiLinksByEntityMap(text, map)).toBe('[[linh giới]] và alinh giớib');
  });

  it('returns wrapped count for toast feedback', () => {
    const text = 'Linh Giới Châu gặp Linh Tu';
    const map = [{ name: 'Linh Giới Châu' }, { name: 'Linh Tu' }];
    expect(autoWrapWikiLinksByEntityMapWithCount(text, map)).toEqual({
      text: '[[Linh Giới Châu]] gặp [[Linh Tu]]',
      count: 2,
    });
  });

  it('is idempotent when auto-wrap is applied repeatedly', () => {
    const text = 'Linh Giới Châu gặp Linh Tu';
    const map = [{ name: 'Linh Giới Châu' }, { name: 'Linh Tu' }];
    const once = autoWrapWikiLinksByEntityMap(text, map);
    const twice = autoWrapWikiLinksByEntityMap(once, map);
    expect(once).toBe('[[Linh Giới Châu]] gặp [[Linh Tu]]');
    expect(twice).toBe(once);
  });

  it('does not wrap a lowercase common phrase into a title-cased entity', () => {
    const text = 'Hắn sắp độ kiếp thêm một lần nữa.';
    const map = [{ name: 'Độ Kiếp' }];
    expect(autoWrapWikiLinksByEntityMap(text, map)).toBe(text);
  });

  it('still wraps when the source text preserves the title-cased entity surface', () => {
    const text = 'Hắn đã bước vào Độ Kiếp.';
    const map = [{ name: 'Độ Kiếp' }];
    expect(autoWrapWikiLinksByEntityMap(text, map)).toBe('Hắn đã bước vào [[Độ Kiếp]].');
  });
});

