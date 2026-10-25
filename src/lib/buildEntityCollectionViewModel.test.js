import { describe, expect, it } from 'vitest';
import { buildEntityCollectionViewModel } from './buildEntityCollectionViewModel.js';
import { applyEntityCollectionFilters, buildEntitySearchIndexMap } from './entityCollectionQuery.js';
import { normalizeListViewConfig } from './listViewConfig.js';

const mk = (id, name, extra = {}) => ({
  id,
  name,
  dynamicData: {},
  milestones: [],
  ...extra,
});

describe('buildEntityCollectionViewModel', () => {
  const all = Array.from({ length: 31 }, (_, i) => mk(`e${i}`, `Entity ${i}`));

  it('computes allCount, filteredCount, pageCount and caps rows to pageSize', () => {
    const vm = buildEntityCollectionViewModel({
      allEntities: all,
      filteredEntities: all,
      columns: ['entity', 'displayString'],
      columnMetaById: new Map([['entity', { label: 'Thực thể' }]]),
      page: 1,
      pageSize: 12,
    });
    expect(vm.allCount).toBe(31);
    expect(vm.filteredCount).toBe(31);
    expect(vm.pageCount).toBe(3);
    expect(vm.rows).toHaveLength(12);
  });

  it('clamps page when beyond pageCount', () => {
    const vm = buildEntityCollectionViewModel({
      allEntities: all,
      filteredEntities: all,
      columns: ['entity'],
      page: 99,
      pageSize: 12,
    });
    expect(vm.page).toBe(3);
    expect(vm.rows.length).toBeLessThanOrEqual(7);
  });

  it('shares filtered list with entityCollectionQuery search', () => {
    const index = buildEntitySearchIndexMap(all);
    const filtered = applyEntityCollectionFilters(all, {
      entityFilterField: 'none',
      entityFilterValue: '',
      entitySearchQuery: 'Entity 1',
      entitySearchIndexById: index,
      entitySortMode: 'name_asc',
    });
    const vm = buildEntityCollectionViewModel({
      allEntities: all,
      filteredEntities: filtered,
      columns: ['entity'],
      page: 1,
      pageSize: 12,
    });
    expect(vm.allCount).toBe(31);
    expect(vm.filteredCount).toBe(11);
    expect(vm.rows.every((r) => r.entityName.includes('Entity 1'))).toBe(true);
  });

  it('defaults list config to list mode and safe columns', () => {
    const cfg = normalizeListViewConfig(null);
    expect(cfg.mode).toBe('list');
    expect(cfg.columns[0]).toBe('entity');
    expect(cfg.columns).toContain('displayString');
  });
});
