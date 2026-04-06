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

  it('always pins list card first then sorts others by A-Z', () => {
    const index = buildEntitySearchIndexMap([e2, e1, listCard]);
    const out = applyEntityCollectionFilters([e2, e1, listCard], {
      entityFilterField: 'none',
      entityFilterValue: '',
      entitySearchQuery: '',
      entitySearchIndexById: index,
      entitySortMode: 'milestones',
    });
    expect(out.map((x) => x.id)).toEqual(['ls', 'a', 'b']);
  });
});
