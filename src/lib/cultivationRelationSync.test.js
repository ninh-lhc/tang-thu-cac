import { describe, expect, it } from 'vitest';
import { isCultivationRelationScope, syncAllCultivationRelationBlocks } from './cultivationRelationSync.js';
import { AUTO_SYNC_ENGINE_CULTIVATION } from './autoSyncEntityPrefs.js';
import { AUTO_SYNC_ROLE_OFF } from './tabAutoSyncRole.js';

function createNovel() {
  return {
    tabsConfig: [
      {
        id: 'tu-luyen',
        label: 'Tu Luyen',
        subTabs: [
          { id: 'he-thong-tu-luyen', label: 'He Thong Tu Luyen', viewType: 'collection-track' },
          { id: 'canh-gioi-tu-vi', label: 'Canh Gioi Tu Vi', viewType: 'collection-track' },
        ],
      },
    ],
    data: {
      'tu-luyen': {
        'he-thong-tu-luyen': {
          overview: '',
          entities: [
            {
              id: 'sys-linh',
              name: 'Linh Tu',
              info: 'Ghi chu tay he thong',
              dynamicData: { f_alias: 'Linh Canh, Linh Canh Bat Bo' },
            },
            {
              id: 'sys-the',
              name: 'The Tu',
              info: '',
              dynamicData: { f_alias: 'The Canh' },
            },
          ],
        },
        'canh-gioi-tu-vi': {
          overview: '',
          entities: [
            {
              id: 'realm-luyen-khi',
              name: 'Luyen Khi',
              info: 'Mo ta tay cap bac',
              dynamicData: { f_status: 'De Nhat - Linh Canh Bat Bo' },
            },
            {
              id: 'realm-truc-co',
              name: 'Truc Co',
              info: '',
              dynamicData: { f_status: 'De Nhi - The Canh' },
            },
          ],
        },
      },
    },
  };
}

describe('cultivationRelationSync', () => {
  it('recognizes both cultivation tab ids, including the canh-gioi fallback', () => {
    expect(
      isCultivationRelationScope({
        activeTabLon: 'tu-luyen',
        activeTabNho: 'he-thong-tu-luyen',
        currentTabConfig: { id: 'he-thong-tu-luyen', label: 'Hệ Thống Tu Luyện' },
      })
    ).toBe(true);
    expect(
      isCultivationRelationScope({
        activeTabLon: 'tu-luyen',
        activeTabNho: 'canh-gioi',
        currentTabConfig: { id: 'canh-gioi', label: 'Cảnh Giới' },
      })
    ).toBe(true);
    expect(
      isCultivationRelationScope({
        activeTabLon: 'tu-luyen',
        activeTabNho: 'cong-phap',
        currentTabConfig: { id: 'cong-phap', label: 'Công Pháp' },
      })
    ).toBe(false);
  });

  it('builds AUTO links for both system and realm sides', () => {
    const novel = createNovel();

    const ok = syncAllCultivationRelationBlocks(novel);
    expect(ok).toBe(true);

    const systemEntities = novel.data['tu-luyen']['he-thong-tu-luyen'].entities;
    const realmEntities = novel.data['tu-luyen']['canh-gioi-tu-vi'].entities;
    const linTu = systemEntities.find((ent) => ent.id === 'sys-linh');
    const theTu = systemEntities.find((ent) => ent.id === 'sys-the');
    const luyenKhi = realmEntities.find((ent) => ent.id === 'realm-luyen-khi');
    const trucCo = realmEntities.find((ent) => ent.id === 'realm-truc-co');

    expect(linTu.info).toContain('Ghi chu tay he thong');
    expect(linTu.info).toContain('Cảnh Giới Tu Vi Liên Quan (AUTO)');
    expect(linTu.info).toContain('1. [[Luyen Khi - Linh Canh Bat Bo]] · De Nhat');
    expect(theTu.info).toContain('1. [[Truc Co - The Canh]] · De Nhi');
    expect(luyenKhi.info).toContain('Mo ta tay cap bac');
    expect(luyenKhi.info).toContain('Hệ Thống Tu Luyện Liên Quan (AUTO)');
    expect(luyenKhi.info).toContain('[[Linh Tu]]');
    expect(luyenKhi.info).toContain('Khớp theo bí danh: Linh Canh Bat Bo');
    expect(luyenKhi.info).toContain('Thứ tự cảnh giới: De Nhat');
    expect(trucCo.info).toContain('[[The Tu]]');
    expect(trucCo.info).toContain('Thứ tự cảnh giới: De Nhi');
    expect((linTu.info.match(/\(AUTO\)/g) || []).length).toBe(1);
    expect((luyenKhi.info.match(/\(AUTO\)/g) || []).length).toBe(1);
  });

  it('removes stale AUTO blocks when the matching system disappears', () => {
    const novel = createNovel();

    expect(syncAllCultivationRelationBlocks(novel)).toBe(true);

    novel.data['tu-luyen']['he-thong-tu-luyen'].entities = [
      {
        id: 'sys-the',
        name: 'The Tu',
        info: '',
        dynamicData: { f_alias: 'The Canh' },
      },
    ];

    const ok = syncAllCultivationRelationBlocks(novel);
    expect(ok).toBe(true);

    const realmEntities = novel.data['tu-luyen']['canh-gioi-tu-vi'].entities;
    const luyenKhi = realmEntities.find((ent) => ent.id === 'realm-luyen-khi');
    expect(luyenKhi.info).toContain('Mo ta tay cap bac');
    expect(luyenKhi.info).not.toContain('Hệ Thống Tu Luyện Liên Quan (AUTO)');
    expect(luyenKhi.info).not.toContain('[[Linh Tu]]');
    const theTu = novel.data['tu-luyen']['he-thong-tu-luyen'].entities[0];
    expect(theTu.info).toContain('Cảnh Giới Tu Vi Liên Quan (AUTO)');
    expect(theTu.info).toContain('[[Truc Co - The Canh]]');
  });
  it('cleans stale cultivation AUTO blocks when both tabs are turned off', () => {
    const novel = createNovel();
    expect(syncAllCultivationRelationBlocks(novel)).toBe(true);

    novel.tabsConfig[0].subTabs[0].autoSyncRole = AUTO_SYNC_ROLE_OFF;
    novel.tabsConfig[0].subTabs[1].autoSyncRole = AUTO_SYNC_ROLE_OFF;

    const ok = syncAllCultivationRelationBlocks(novel);
    expect(ok).toBe(true);

    const systemInfo = String(novel.data['tu-luyen']['he-thong-tu-luyen'].entities[0].info || '');
    const realmInfo = String(novel.data['tu-luyen']['canh-gioi-tu-vi'].entities[0].info || '');
    expect(systemInfo).toContain('Ghi chu tay he thong');
    expect(systemInfo).not.toContain('(AUTO)');
    expect(realmInfo).toContain('Mo ta tay cap bac');
    expect(realmInfo).not.toContain('(AUTO)');
  });

  it('preserves locked system AUTO blocks while still syncing new realms', () => {
    const novel = createNovel();
    expect(syncAllCultivationRelationBlocks(novel)).toBe(true);

    const system = novel.data['tu-luyen']['he-thong-tu-luyen'].entities[0];
    const lockedSnapshot = String(system.info || '');
    system.autoSyncPrefs = { lockedEngines: [AUTO_SYNC_ENGINE_CULTIVATION] };
    novel.data['tu-luyen']['canh-gioi-tu-vi'].entities.push({
      id: 'realm-kim-dan',
      name: 'Kim Dan',
      info: '',
      dynamicData: { f_status: 'De Tam - Linh Canh' },
    });

    const ok = syncAllCultivationRelationBlocks(novel);
    expect(ok).toBe(true);

    expect(String(system.info || '')).toBe(lockedSnapshot);
    expect(String(novel.data['tu-luyen']['canh-gioi-tu-vi'].entities[2].info || '')).toContain('[[Linh Tu]]');
  });
});
