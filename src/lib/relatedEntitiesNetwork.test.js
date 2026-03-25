import { describe, it, expect } from 'vitest';
import {
  filterRelatedEntities,
  sortRelatedEntitiesForDisplay,
  groupByTabLabel,
  uniqueTabLabels,
  takeGroupedForDisplay,
} from './relatedEntitiesNetwork.js';

const sample = [
  { entity: { id: 'a', name: 'Alpha' }, tabLabel: 'Nhân vật', context: 'Ghi A' },
  { entity: { id: 'b', name: 'Beta' }, tabLabel: 'Địa danh', context: 'Ghi B' },
  { entity: { id: 'c', name: 'Gamma' }, tabLabel: 'Nhân vật', context: 'Đặc biệt' },
];

describe('relatedEntitiesNetwork', () => {
  it('filterRelatedEntities by tab and search (accent-insensitive)', () => {
    expect(filterRelatedEntities(sample, { tabKey: 'all', searchQuery: '' }).length).toBe(3);
    expect(filterRelatedEntities(sample, { tabKey: 'Nhân vật', searchQuery: '' }).length).toBe(2);
    const r = filterRelatedEntities(sample, { tabKey: 'all', searchQuery: 'beta' });
    expect(r.length).toBe(1);
    expect(r[0].entity.id).toBe('b');
  });

  it('sortRelatedEntitiesForDisplay sorts by tab then name', () => {
    const shuffled = [sample[2], sample[0], sample[1]];
    const s = sortRelatedEntitiesForDisplay(shuffled);
    expect(s.map((x) => x.entity.name)).toEqual(['Beta', 'Alpha', 'Gamma']);
  });

  it('groupByTabLabel and uniqueTabLabels', () => {
    const g = groupByTabLabel(sortRelatedEntitiesForDisplay(sample));
    expect(g.map((x) => x.tabLabel)).toEqual(['Địa danh', 'Nhân vật']);
    expect(uniqueTabLabels(sample).length).toBe(2);
  });

  it('takeGroupedForDisplay respects cap across groups', () => {
    const grouped = groupByTabLabel(sortRelatedEntitiesForDisplay(sample));
    const t = takeGroupedForDisplay(grouped, 2);
    expect(t.totalFiltered).toBe(3);
    expect(t.totalShown).toBe(2);
    expect(t.hasMore).toBe(true);
    expect(t.sections.length).toBe(2);
    expect(t.sections[0].items.length).toBe(1);
    expect(t.sections[1].items.length).toBe(1);
  });
});
