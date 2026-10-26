import { describe, expect, it } from 'vitest';
import {
  autoWrapWikiLinksByEntityMapWithCount,
  autoWrapWikiLinksByEntityMapWithCountCore,
} from './autoWrapWikiLinksCore.js';
import { autoWrapWikiLinksByEntityMapWithCount as syncFromFacade } from './autoWrapWikiLinks.js';

describe('autoWrapWikiLinksCore parity', () => {
  const map = [
    { name: 'Vo Gia', dest: { entityId: 'a' } },
    { name: 'Lam An', dest: { entityId: 'b' } },
    { name: 'Huyen Mon', dest: { entityId: 'c' } },
    { name: 'Linh Gioi' },
    { name: 'Linh Gioi Chau', dest: { entityId: 'd' } },
    { name: 'Thiện Đường', entityName: '5 Thế Lực Ban Đầu Khánh Thành', dest: { entityId: 'e' } },
    { name: '5 Thế Lực Ban Đầu Khánh Thành', dest: { entityId: 'e' } },
  ];

  function expectSameAsSync(text, entityMap, options = {}) {
    const sync = syncFromFacade(text, entityMap, options);
    expect(autoWrapWikiLinksByEntityMapWithCountCore(text, entityMap, options)).toEqual(sync);
    expect(autoWrapWikiLinksByEntityMapWithCount(text, entityMap, options)).toEqual(sync);
  }

  it('1 — no entity names in text', () => {
    expectSameAsSync('Doan van thuong khong co ten.', map);
  });

  it('2 — wraps three plain names', () => {
    expectSameAsSync('Gap Vo Gia, Lam An va Huyen Mon.', map);
  });

  it('3 — respects opt-out', () => {
    const optOuts = [{ anchor: 'Lam An', before: 'Gap ', after: ', ' }];
    expectSameAsSync('Gap Vo Gia, Lam An va Huyen Mon.', map, { optOuts });
  });

  it('4 — does not wrap inside existing wiki brackets', () => {
    expectSameAsSync('Da co [[Vo Gia]] roi.', [{ name: 'Vo Gia' }]);
  });

  it('5 — longer name wins over substring', () => {
    expectSameAsSync('Linh Gioi Chau xuat hien.', map);
  });

  it('6 — many entities same first-char bucket', () => {
    expectSameAsSync('Vo Gia gap Vo Thuong va Vo Dan.', [
      { name: 'Vo Gia' },
      { name: 'Vo Thuong' },
      { name: 'Vo Dan' },
    ]);
  });

  it('7 — entity alias via entityName', () => {
    expectSameAsSync('[[Thiện Đường]] va 5 Thế Lực Ban Đầu Khánh Thành.', map);
  });

  it('8 — text with newlines', () => {
    expectSameAsSync('Dong 1 Vo Gia\nDong 2 Lam An', map);
  });

  it('9 — match at start and end of sentence', () => {
    expectSameAsSync('Vo Gia o giua va cuoi Huyen Mon', map);
  });

  it('10 — skips plain inside existing wiki link', () => {
    expectSameAsSync('[[Vo Gia]] khong wrap lai ben trong.', [{ name: 'Vo Gia' }]);
  });
});
