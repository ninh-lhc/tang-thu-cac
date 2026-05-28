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

  it('does not wrap a shorter name inside a longer proper phrase', () => {
    const text = 'Thế giới Hồng Lâu Mộng.';
    const map = [{ name: 'Hồng Lâu' }];
    expect(autoWrapWikiLinksByEntityMap(text, map)).toBe(text);
  });

  it('wraps every mention when the same short name repeats', () => {
    const text = 'Cổ Minh Cổ Minh';
    const map = [{ name: 'Cổ Minh' }];
    expect(autoWrapWikiLinksByEntityMap(text, map)).toBe('[[Cổ Minh]] [[Cổ Minh]]');
    const twice = autoWrapWikiLinksByEntityMap('[[Cổ Minh]] [[Cổ Minh]]', map);
    expect(twice).toBe('[[Cổ Minh]] [[Cổ Minh]]');
  });

  it('still wraps long three-word names even when followed by uppercase next token', () => {
    const text = 'Diệp Thiên Dật Khẳng định đạo tâm bất diệt.';
    const map = [{ name: 'Diệp Thiên Dật' }];
    expect(autoWrapWikiLinksByEntityMap(text, map)).toBe('[[Diệp Thiên Dật]] Khẳng định đạo tâm bất diệt.');
  });

  it('does not skip wrapping when name variants could be ambiguous in lookup', () => {
    const text = 'Diệp Thiên Dật phải tiếp nhận thân phận này.';
    const map = [{ name: 'Diệp Thiên Dật' }, { name: 'Diệp Thiên dật' }];
    expect(autoWrapWikiLinksByEntityMap(text, map)).toBe('[[Diệp Thiên Dật]] phải tiếp nhận thân phận này.');
  });

  it('wraps all mentions in a long protagonist paragraph', () => {
    const text = [
      'Nam chinh la Diệp Thiên Dật (hay thuong goi la Diệp Thiên), mot thanh nien tu Trái Đất.',
      'Chu nhan ban dau cua co the ma Diệp Thiên Dật xuyen vao la mot thieu gia.',
      'Sau khi xuyen qua, Diệp Thiên Dật phai tiep nhan than phan nay.',
      'Diệp Thiên Dật la he thong thay doi ngau nhien moi tuan.',
    ].join('\n');
    const map = [{ name: 'Diệp Thiên Dật', entityName: 'Diệp Thiên Dật', dest: { entityId: 'mc-1' } }];
    const out = autoWrapWikiLinksByEntityMap(text, map);
    expect(out.match(/\[\[Diệp Thiên Dật\]\]/g)?.length).toBe(5);
  });

  it('wraps flexible whitespace and relaxed casing for long names', () => {
    const text = 'gap  diệp   thiên   dật  trong doan.';
    const map = [{ name: 'Diệp Thiên Dật' }];
    expect(autoWrapWikiLinksByEntityMap(text, map)).toContain('[[Diệp Thiên Dật]]');
  });
});
