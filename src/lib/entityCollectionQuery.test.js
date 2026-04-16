import { describe, it, expect } from 'vitest';
import { buildEntitySearchIndexMap, applyEntityCollectionFilters } from './entityCollectionQuery.js';

const e1 = {
  id: 'a',
  name: 'Alpha Dragon',
  title: '',
  info: '',
  dynamicData: { f_realm: 'Kim Đan' },
  milestones: [],
};
const e2 = {
  id: 'b',
  name: 'Beta',
  title: '',
  info: '',
  dynamicData: { f_realm: 'Trúc Cơ' },
  milestones: [{ chapter: 1 }],
};
const listCard = {
  id: 'ls',
  name: 'Danh sách',
  title: '',
  info: '',
  dynamicData: {},
  milestones: [],
};

describe('entityCollectionQuery', () => {
  it('filter + search together: field filter narrows then search matches name', () => {
    const index = buildEntitySearchIndexMap([e1, e2]);
    const out = applyEntityCollectionFilters([e1, e2], {
      entityFilterField: 'f_realm',
      entityFilterValue: 'Kim',
      entitySearchQuery: 'dragon',
      entitySearchIndexById: index,
      entitySortMode: 'newest',
    });
    expect(out.map((x) => x.id)).toEqual(['a']);
  });

  it('search alone without filter returns both matching query', () => {
    const index = buildEntitySearchIndexMap([e1, e2]);
    const out = applyEntityCollectionFilters([e1, e2], {
      entityFilterField: 'none',
      entityFilterValue: '',
      entitySearchQuery: 'Beta',
      entitySearchIndexById: index,
      entitySortMode: 'name_asc',
    });
    expect(out.map((x) => x.id)).toEqual(['b']);
  });

  it('matches Vietnamese accents and d/đ in filter and search query', () => {
    const e3 = {
      id: 'c',
      name: '\u0110ao Tu',
      title: '',
      info: '\u0110\u1EC7 t\u1EED canh gi\u1EEF',
      dynamicData: { f_realm: '\u0110an \u0110i\u1EC1n' },
      milestones: [],
    };
    const index = buildEntitySearchIndexMap([e1, e2, e3]);

    const filtered = applyEntityCollectionFilters([e1, e2, e3], {
      entityFilterField: 'f_realm',
      entityFilterValue: 'dan dien',
      entitySearchQuery: 'de tu',
      entitySearchIndexById: index,
      entitySortMode: 'name_asc',
    });

    expect(filtered.map((x) => x.id)).toEqual(['c']);
  });

  it('always pins list card first then sorts others by A-Z', () => {
    const index = buildEntitySearchIndexMap([e2, e1, listCard]);
    const out = applyEntityCollectionFilters([e2, e1, listCard], {
      entityFilterField: 'none',
      entityFilterValue: '',
      entitySearchQuery: '',
      entitySearchIndexById: index,
      entitySortMode: 'milestones',
    });
    expect(out.map((x) => x.id)).toEqual(['ls', 'b', 'a']);
  });

  it('supports name_desc sort mode', () => {
    const index = buildEntitySearchIndexMap([e2, e1, listCard]);
    const out = applyEntityCollectionFilters([e2, e1, listCard], {
      entityFilterField: 'none',
      entityFilterValue: '',
      entitySearchQuery: '',
      entitySearchIndexById: index,
      entitySortMode: 'name_desc',
    });
    expect(out.map((x) => x.id)).toEqual(['ls', 'b', 'a']);
  });
});
