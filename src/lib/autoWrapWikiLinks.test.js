import { describe, expect, it } from 'vitest';
import { autoWrapWikiLinksByEntityMap, autoWrapWikiLinksByEntityMapWithCount } from './autoWrapWikiLinks.js';

describe('autoWrapWikiLinksByEntityMap', () => {
  it('wraps plain matching entity names', () => {
    const text = 'Nhan duoc vu khi Huyen Cap Cuc Pham.';
    const map = [{ name: 'Huyen Cap Cuc Pham' }];
    expect(autoWrapWikiLinksByEntityMap(text, map)).toBe('Nhan duoc vu khi [[Huyen Cap Cuc Pham]].');
  });

  it('does not wrap text already inside [[...]]', () => {
    const text = 'Da co [[Huyen Cap Cuc Pham]] roi.';
    const map = [{ name: 'Huyen Cap Cuc Pham' }];
    expect(autoWrapWikiLinksByEntityMap(text, map)).toBe(text);
  });

  it('prefers longer names first', () => {
    const text = 'Linh Gioi Chau xuat hien.';
    const map = [{ name: 'Linh Gioi' }, { name: 'Linh Gioi Chau' }];
    expect(autoWrapWikiLinksByEntityMap(text, map)).toBe('[[Linh Gioi Chau]] xuat hien.');
  });

  it('keeps word boundaries safe', () => {
    const text = 'linh gioi va alinh gioib';
    const map = [{ name: 'linh gioi' }];
    expect(autoWrapWikiLinksByEntityMap(text, map)).toBe('[[linh gioi]] va alinh gioib');
  });

  it('returns wrapped count for toast feedback', () => {
    const text = 'Linh Gioi Chau gap Linh Tu';
    const map = [{ name: 'Linh Gioi Chau' }, { name: 'Linh Tu' }];
    expect(autoWrapWikiLinksByEntityMapWithCount(text, map)).toEqual({
      text: '[[Linh Gioi Chau]] gap [[Linh Tu]]',
      count: 2,
    });
  });

  it('is idempotent when auto-wrap is applied repeatedly', () => {
    const text = 'Linh Gioi Chau gap Linh Tu';
    const map = [{ name: 'Linh Gioi Chau' }, { name: 'Linh Tu' }];
    const once = autoWrapWikiLinksByEntityMap(text, map);
    const twice = autoWrapWikiLinksByEntityMap(once, map);
    expect(once).toBe('[[Linh Gioi Chau]] gap [[Linh Tu]]');
    expect(twice).toBe(once);
  });

  it('does not auto-wrap a lowercase generic mention into a title-case proper noun card', () => {
    const text = 'he thong nay chi la mo ta chung.';
    const map = [{ name: 'He Thong', dest: { entityId: 'ba-chu-he-thong' } }];
    expect(autoWrapWikiLinksByEntityMap(text, map)).toBe(text);
  });

  it('still auto-wraps the generic system mention when a matching generic card exists', () => {
    const text = 'He thong nay chia thanh nhieu nhanh.';
    const map = [
      { name: 'He Thong', dest: { entityId: 'ba-chu-he-thong' } },
      { name: 'he thong', dest: { entityId: 'he-thong-khai-niem' } },
    ];
    expect(autoWrapWikiLinksByEntityMap(text, map)).toBe('[[He thong]] nay chia thanh nhieu nhanh.');
  });

  it('does not wrap a lowercase common phrase into a title-cased entity', () => {
    const text = 'Han sap do kiep them mot lan nua.';
    const map = [{ name: 'Do Kiep' }];
    expect(autoWrapWikiLinksByEntityMap(text, map)).toBe(text);
  });

  it('still wraps when the source text preserves the title-cased entity surface', () => {
    const text = 'Han da buoc vao Do Kiep.';
    const map = [{ name: 'Do Kiep' }];
    expect(autoWrapWikiLinksByEntityMap(text, map)).toBe('Han da buoc vao [[Do Kiep]].');
  });

  it('skips auto-wrap when opt-out matches anchor and context', () => {
    const text = 'The gioi Hồng Lâu Mộng.';
    const map = [{ name: 'Hồng Lâu' }, { name: 'Hồng Lâu Mộng' }];
    const optOuts = [{ anchor: 'Hồng Lâu', before: 'The gioi ', after: ' Mộng.' }];
    expect(autoWrapWikiLinksByEntityMap(text, map, { optOuts })).toBe(text);
  });
});
