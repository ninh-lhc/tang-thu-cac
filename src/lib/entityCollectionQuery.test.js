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
});
