import { describe, expect, it } from 'vitest';
import {
  isMapCollectionScope,
  syncAllMapHierarchyAutoBlocks,
  syncMapHierarchyAutoBlocks,
  syncMapHierarchyNameReferences,
} from './mapHierarchySync.js';
import { AUTO_SYNC_ENGINE_MAP_HIERARCHY } from './autoSyncEntityPrefs.js';
import { normalizeAsciiText } from './statusHierarchyParser.js';
import { AUTO_SYNC_ROLE_OFF } from './tabAutoSyncRole.js';

function createNovelWithMapEntities(entities) {
  return {
    tabsConfig: [
      {
        id: 'tai-nguyen',
        label: 'Tài Nguyên & Địa Danh',
        subTabs: [{ id: 'dia-danh', label: 'Bản đồ / Bí cảnh', viewType: 'collection-track' }],
      },
    ],
    data: {
      'tai-nguyen': {
        'dia-danh': {
          overview: '',
          entities,
        },
      },
    },
  };
}

function createNovelWithCustomMapTab(entities) {
  return {
    tabsConfig: [
      {
        id: 'tai-nguyen',
        label: 'Tai Nguyen',
        subTabs: [{ id: 'world-map-custom', label: 'Ban do the gioi', viewType: 'collection-track' }],
      },
    ],
    data: {
      'tai-nguyen': {
        'world-map-custom': {
          overview: '',
          entities,
        },
      },
    },
  };
}

function createNovelWithMultipleMapSubtabs() {
  return {
    tabsConfig: [
      {
        id: 'ban-do',
        label: 'Ban Do',
        subTabs: [
          { id: 'ha-gioi-tinh-cau', label: 'Ha Gioi Tinh Cau / Tieu The Gioi', viewType: 'collection-track' },
          { id: 'tien-ma-gioi', label: 'Tien Ma Gioi / Tieu Vu Tru', viewType: 'collection-track' },
        ],
      },
    ],
    data: {
      'ban-do': {
        'ha-gioi-tinh-cau': {
          overview: '',
          entities: [
            {
              id: 'hg-1',
              name: 'Man Hoang Dai Luc',
              info: '',
              dynamicData: { f_title: 'Dai Luc', f_vi_tri: 'Viet Long Tinh Cau' },
            },
          ],
        },
        'tien-ma-gioi': {
          overview: '',
          entities: [
            {
              id: 'tm-1',
              name: 'Huyet Hoang Dia',
              info: '',
              dynamicData: { f_title: 'Dia Danh', f_vi_tri: 'Huyet Gioi' },
            },
          ],
        },
      },
    },
  };
}

describe('mapHierarchySync', () => {
  it('creates parent maps and syncs direct child block', () => {
    const novel = createNovelWithMapEntities([
      {
        id: 'm1',
        name: 'Man Hoang Đại Lục',
        info: '',
        dynamicData: {
          f_title: 'Đại Lục',
          f_status: 'Tiểu Thế Giới',
          f_vi_tri: 'Việt Long Tinh Cầu',
        },
      },
    ]);

    const ok = syncMapHierarchyAutoBlocks(novel, { entityId: 'm1' });
    expect(ok).toBe(true);

    const mapEntities = novel.data['tai-nguyen']['dia-danh'].entities;
    const source = mapEntities.find((ent) => ent.name === 'Man Hoang Đại Lục');
    const parent = mapEntities.find((ent) => ent.name === 'Việt Long Tinh Cầu');

    expect(parent).toBeTruthy();
    expect(source.info).toContain('## Phân tầng bản đồ (AUTO)');
    expect(source.info).toContain('Trực thuộc: [[Việt Long Tinh Cầu]]');
    expect(parent.info).toContain('## Bản đồ trực thuộc');
    expect(parent.info).toContain('[[Man Hoang Đại Lục]] (Đại Lục · Tiểu Thế Giới)');
  });

  it('updates full ancestor tree when a parent map later gets a larger outer map', () => {
    const novel = createNovelWithMapEntities([
      {
        id: 'm1',
        name: 'Man Hoang Đại Lục',
        info: '',
        dynamicData: {
          f_title: 'Đại Lục',
          f_status: 'Tiểu Thế Giới',
          f_vi_tri: 'Việt Long Tinh Cầu',
        },
      },
      {
        id: 'm2',
        name: 'Việt Long Tinh Cầu',
        info: '',
        dynamicData: {
          f_title: 'Tinh Cầu',
          f_status: 'Tiểu Thế Giới',
          f_vi_tri: 'Hạ Giới Vị Diện',
        },
      },
    ]);

    const ok = syncAllMapHierarchyAutoBlocks(novel);
    expect(ok).toBe(true);

    const mapEntities = novel.data['tai-nguyen']['dia-danh'].entities;
    const source = mapEntities.find((ent) => ent.name === 'Man Hoang Đại Lục');
    const outer = mapEntities.find((ent) => ent.name === 'Hạ Giới Vị Diện');

    expect(source.info).toContain('Trực thuộc: [[Việt Long Tinh Cầu]]');
    expect(source.info).toContain('Ngoại tầng 1: [[Hạ Giới Vị Diện]]');
    expect(outer).toBeTruthy();
    expect(outer.info).toContain('[[Việt Long Tinh Cầu]] (Tinh Cầu · Tiểu Thế Giới)');
    expect(outer.info).toContain('  - [[Man Hoang Đại Lục]] (Đại Lục · Tiểu Thế Giới)');
  });

  it('detects custom map tabs and still resyncs the whole hierarchy', () => {
    expect(
      isMapCollectionScope({
        activeTabLon: 'tai-nguyen',
        activeTabNho: 'world-map-custom',
        currentTabConfig: { id: 'world-map-custom', label: 'Ban do the gioi', viewType: 'collection-track' },
        parentLabel: 'Tai Nguyen',
      })
    ).toBe(true);

    const novel = createNovelWithCustomMapTab([
      {
        id: 'm1',
        name: 'Man Hoang Dai Luc',
        info: '',
        dynamicData: {
          f_title: 'Dai Luc',
          f_vi_tri: 'Viet Long Tinh Cau',
        },
      },
    ]);

    const ok = syncAllMapHierarchyAutoBlocks(novel);
    expect(ok).toBe(true);

    const mapEntities = novel.data['tai-nguyen']['world-map-custom'].entities;
    const parent = mapEntities.find((ent) => ent.name === 'Viet Long Tinh Cau');
    const child = mapEntities.find((ent) => ent.id === 'm1');

    expect(parent).toBeTruthy();
    expect(child.info).toContain('[[Viet Long Tinh Cau]]');
    expect(parent.info).toContain('[[Man Hoang Dai Luc]]');
  });

  it('preserves manual info and removes stale child blocks after a move', () => {
    const novel = createNovelWithMapEntities([
      {
        id: 'm1',
        name: 'Man Hoang Đại Lục',
        info: 'Ghi chú tay địa đồ',
        dynamicData: {
          f_title: 'Đại Lục',
          f_status: 'Tiểu Thế Giới',
          f_vi_tri: 'Việt Long Tinh Cầu',
        },
      },
      {
        id: 'm2',
        name: 'Việt Long Tinh Cầu',
        info: 'Mô tả tay tinh cầu',
        dynamicData: { f_title: 'Tinh Cầu' },
      },
      {
        id: 'm3',
        name: 'Thiên Hà Tinh Cầu',
        info: '',
        dynamicData: { f_title: 'Tinh Cầu' },
      },
    ]);

    syncAllMapHierarchyAutoBlocks(novel);
    novel.data['tai-nguyen']['dia-danh'].entities.find((ent) => ent.id === 'm1').dynamicData.f_vi_tri = 'Thiên Hà Tinh Cầu';
    const ok = syncAllMapHierarchyAutoBlocks(novel);
    expect(ok).toBe(true);

    const mapEntities = novel.data['tai-nguyen']['dia-danh'].entities;
    const source = mapEntities.find((ent) => ent.id === 'm1');
    const oldParent = mapEntities.find((ent) => ent.id === 'm2');
    const newParent = mapEntities.find((ent) => ent.id === 'm3');

    expect(source.info).toContain('Ghi chú tay địa đồ');
    expect(source.info).toContain('Trực thuộc: [[Thiên Hà Tinh Cầu]]');
    expect(oldParent.info).toContain('Mô tả tay tinh cầu');
    expect(oldParent.info).not.toContain('[[Man Hoang Đại Lục]]');
    expect(newParent.info).toContain('[[Man Hoang Đại Lục]]');
  });

  it('renames parent references across the whole map tree before resync', () => {
    const novel = createNovelWithMapEntities([
      {
        id: 'm1',
        name: 'Man Hoang Đại Lục',
        info: '',
        dynamicData: {
          f_title: 'Đại Lục',
          f_vi_tri: 'Việt Long Tinh Cầu - Hạ Giới Vị Diện',
        },
      },
      {
        id: 'm2',
        name: 'Việt Long Tinh Cầu',
        info: '',
        dynamicData: { f_title: 'Tinh Cầu' },
      },
    ]);

    const touched = syncMapHierarchyNameReferences(novel, {
      entityId: 'm2',
      oldName: 'Việt Long Tinh Cầu',
      newName: 'Hạ Giới Tinh Cầu',
    });
    expect(touched).toBe(1);

    const child = novel.data['tai-nguyen']['dia-danh'].entities.find((ent) => ent.id === 'm1');
    expect(child.dynamicData.f_vi_tri).toBe('Hạ Giới Tinh Cầu - Hạ Giới Vị Diện');
  });

  it('syncs map hierarchy across all map subtabs under a Ban Do parent', () => {
    expect(
      isMapCollectionScope({
        activeTabLon: 'ban-do',
        activeTabNho: 'ha-gioi-tinh-cau',
        currentTabConfig: { id: 'ha-gioi-tinh-cau', label: 'Ha Gioi Tinh Cau / Tieu The Gioi', viewType: 'collection-track' },
        parentLabel: 'Ban Do',
      })
    ).toBe(true);

    const novel = createNovelWithMultipleMapSubtabs();
    const ok = syncAllMapHierarchyAutoBlocks(novel);
    expect(ok).toBe(true);

    const haGioiEntities = novel.data['ban-do']['ha-gioi-tinh-cau'].entities;
    const tienMaEntities = novel.data['ban-do']['tien-ma-gioi'].entities;
    const haGioiChild = haGioiEntities.find((ent) => ent.id === 'hg-1');
    const haGioiParent = haGioiEntities.find((ent) => ent.name === 'Viet Long Tinh Cau');
    const tienMaChild = tienMaEntities.find((ent) => ent.id === 'tm-1');
    const tienMaParent = tienMaEntities.find((ent) => ent.name === 'Huyet Gioi');

    expect(haGioiParent).toBeTruthy();
    expect(tienMaParent).toBeTruthy();
    expect(String(haGioiChild?.info || '')).toContain('## Phân tầng bản đồ (AUTO)');
    expect(String(tienMaChild?.info || '')).toContain('## Phân tầng bản đồ (AUTO)');
    expect(String(haGioiParent?.info || '')).toContain('## Bản đồ trực thuộc');
    expect(String(tienMaParent?.info || '')).toContain('## Bản đồ trực thuộc');
  });

  it('classifies "... Gioi" map names as Gioi level in AUTO meta', () => {
    const novel = createNovelWithMapEntities([
      {
        id: 'm-gioi',
        name: 'Huyet Gioi',
        info: '',
        dynamicData: {
          f_vi_tri: 'Tien Ma Vi Dien',
        },
      },
    ]);

    const ok = syncAllMapHierarchyAutoBlocks(novel);
    expect(ok).toBe(true);
    const source = novel.data['tai-nguyen']['dia-danh'].entities.find((ent) => ent.id === 'm-gioi');
    const normalizedInfo = normalizeAsciiText(String(source?.info || ''));
    expect(normalizedInfo).toContain('loai dia danh: gioi');
  });
  it('cleans stale map hierarchy AUTO blocks when the tab role is turned off', () => {
    const novel = createNovelWithMapEntities([
      {
        id: 'm1',
        name: 'Man Hoang Dai Luc',
        info: '',
        dynamicData: {
          f_title: 'Dai Luc',
          f_vi_tri: 'Viet Long Tinh Cau',
        },
      },
    ]);

    expect(syncAllMapHierarchyAutoBlocks(novel)).toBe(true);
    novel.tabsConfig[0].subTabs[0].autoSyncRole = AUTO_SYNC_ROLE_OFF;

    const ok = syncAllMapHierarchyAutoBlocks(novel);
    expect(ok).toBe(true);

    const mapEntities = novel.data['tai-nguyen']['dia-danh'].entities;
    expect(String(mapEntities.find((ent) => ent.id === 'm1')?.info || '')).not.toContain('## Phân tầng bản đồ (AUTO)');
    expect(String(mapEntities.find((ent) => ent.name === 'Viet Long Tinh Cau')?.info || '')).not.toContain('## Bản đồ trực thuộc');
  });

  it('keeps locked map entity blocks unchanged while the hierarchy around it moves on', () => {
    const novel = createNovelWithMapEntities([
      {
        id: 'm1',
        name: 'Man Hoang Dai Luc',
        info: '',
        dynamicData: {
          f_title: 'Dai Luc',
          f_vi_tri: 'Viet Long Tinh Cau',
        },
      },
      {
        id: 'm2',
        name: 'Viet Long Tinh Cau',
        info: '',
        dynamicData: { f_title: 'Tinh Cau' },
      },
      {
        id: 'm3',
        name: 'Thien Ha Tinh Cau',
        info: '',
        dynamicData: { f_title: 'Tinh Cau' },
      },
    ]);

    expect(syncAllMapHierarchyAutoBlocks(novel)).toBe(true);
    const child = novel.data['tai-nguyen']['dia-danh'].entities.find((ent) => ent.id === 'm1');
    const lockedSnapshot = String(child.info || '');
    child.autoSyncPrefs = { lockedEngines: [AUTO_SYNC_ENGINE_MAP_HIERARCHY] };
    child.dynamicData.f_vi_tri = 'Thien Ha Tinh Cau';

    const ok = syncAllMapHierarchyAutoBlocks(novel);
    expect(ok).toBe(true);

    expect(String(child.info || '')).toBe(lockedSnapshot);
    expect(String(novel.data['tai-nguyen']['dia-danh'].entities.find((ent) => ent.id === 'm3')?.info || '')).toContain('[[Man Hoang Dai Luc]]');
  });
});
