import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildGenreTemplateKey,
  deleteGenreTabsTemplate,
  getGenreTabsTemplate,
  mergeGenreTabsTemplatesFromLocalStorage,
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

  it('merge pulls missing templates from localStorage into index-shaped map', () => {
    const cfg = [{ id: 'root', subTabs: [] }];
    saveGenreTabsTemplate(['Tiên Hiệp'], cfg);
    const key = buildGenreTemplateKey(['Tiên Hiệp']);
    const { next, changed } = mergeGenreTabsTemplatesFromLocalStorage({});
    expect(changed).toBe(true);
    expect(next[key]?.tabsConfig).toEqual(cfg);
  });

  it('merge prefers newer updatedAt when both index and local have same key', () => {
    const key = buildGenreTemplateKey(['Tiên Hiệp']);
    localStorage.setItem(
      'ttc_genre_tabs_templates_v1',
      JSON.stringify({
        [key]: {
          genres: ['Tiên Hiệp'],
          tabsConfig: [{ id: 'old', subTabs: [] }],
          updatedAt: '2020-01-01T00:00:00.000Z',
        },
      })
    );
    const indexOlder = {
      [key]: {
        genres: ['Tiên Hiệp'],
        tabsConfig: [{ id: 'from-disk', subTabs: [] }],
        updatedAt: '2019-01-01T00:00:00.000Z',
      },
    };
    const { next, changed } = mergeGenreTabsTemplatesFromLocalStorage(indexOlder);
    expect(changed).toBe(true);
    expect(next[key]?.tabsConfig?.[0]?.id).toBe('old');
  });
});

