import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildGenreTemplateKey,
  deleteGenreTabsTemplate,
  getGenreTabsTemplate,
  saveGenreTabsTemplate,
} from './genreTabsTemplateStore.js';

describe('genreTabsTemplateStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('builds stable key regardless of genre order', () => {
    const keyA = buildGenreTemplateKey(['Hệ Thống', 'Tiên Hiệp']);
    const keyB = buildGenreTemplateKey(['Tiên Hiệp', 'Hệ Thống']);
    expect(keyA).toBe(keyB);
  });

  it('saves and loads template by genre set', () => {
    const tabsConfig = [{ id: 'a', subTabs: [] }];
    const ok = saveGenreTabsTemplate(['Tiên Hiệp', 'Hệ Thống'], tabsConfig);
    expect(ok).toBe(true);

    const loaded = getGenreTabsTemplate(['Hệ Thống', 'Tiên Hiệp']);
    expect(loaded?.tabsConfig).toEqual(tabsConfig);
    expect(loaded?.genres).toEqual(['Hệ Thống', 'Tiên Hiệp']);
  });

  it('preserves per-tab AUTO group rules in saved template', () => {
    const tabsConfig = [
      {
        id: 'he-thong',
        label: 'Hệ thống',
        subTabs: [
          {
            id: 'goi-qua',
            label: 'Gói quà',
            viewType: 'collection-track',
            autoListGroupStrategy: 'rank',
            autoListGroupOrder: ['Thần Cấp', 'Thiên Cấp', 'Địa Cấp'],
          },
        ],
      },
    ];
    saveGenreTabsTemplate(['Hệ Thống'], tabsConfig);

    const loaded = getGenreTabsTemplate(['Hệ Thống']);
    expect(loaded?.tabsConfig?.[0]?.subTabs?.[0]?.autoListGroupStrategy).toBe('rank');
    expect(loaded?.tabsConfig?.[0]?.subTabs?.[0]?.autoListGroupOrder).toEqual([
      'Thần Cấp',
      'Thiên Cấp',
      'Địa Cấp',
    ]);
  });

  it('deletes template by genre set', () => {
    saveGenreTabsTemplate(['Tiên Hiệp'], [{ id: 'x', subTabs: [] }]);
    expect(getGenreTabsTemplate(['Tiên Hiệp'])).toBeTruthy();
    expect(deleteGenreTabsTemplate(['Tiên Hiệp'])).toBe(true);
    expect(getGenreTabsTemplate(['Tiên Hiệp'])).toBeNull();
  });
});

