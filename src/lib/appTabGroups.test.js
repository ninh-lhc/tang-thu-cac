import { describe, it, expect } from 'vitest';
import { buildTabGroups } from './appTabGroups.js';

describe('buildTabGroups', () => {
  it('đặt tong-quan một nhóm riêng', () => {
    const sorted = [
      { id: 'tong-quan', label: 'TQ', subTabs: [] },
      { id: 'a', label: 'A', subTabs: [], _group: 'Nhóm 1' },
    ];
    const g = buildTabGroups(sorted);
    expect(g[0].groupLabel).toBeNull();
    expect(g[0].tabs.map((t) => t.id)).toEqual(['tong-quan']);
  });
});
