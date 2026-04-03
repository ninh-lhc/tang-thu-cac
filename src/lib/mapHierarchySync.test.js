import { describe, expect, it } from 'vitest';
import {
  isMapCollectionScope,
  syncAllMapHierarchyAutoBlocks,
  syncMapHierarchyAutoBlocks,
  syncMapHierarchyNameReferences,
} from './mapHierarchySync.js';

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
    expect(source.info).toContain('AUTO_MAP_HIERARCHY_META');
    expect(source.info).toContain('Trực thuộc: [[Việt Long Tinh Cầu]]');
    expect(parent.info).toContain('AUTO_MAP_CHILDREN_LIST');
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
});
