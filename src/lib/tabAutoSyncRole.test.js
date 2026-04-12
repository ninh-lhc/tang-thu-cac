import { describe, expect, it } from 'vitest';
import { isAutoRelationScopeLonId } from './autoRelationDetailNote.js';
import { isCultivationRelationScope } from './cultivationRelationSync.js';
import { isMainCharacterRelationScope } from './mainCharacterRelationSync.js';
import { isMapCollectionScope } from './mapHierarchySync.js';
import {
  AUTO_SYNC_ROLE_CULTIVATION_REALM,
  AUTO_SYNC_ROLE_CULTIVATION_SYSTEM,
  AUTO_SYNC_ROLE_FORCE,
  AUTO_SYNC_ROLE_MAIN_CHARACTER,
  AUTO_SYNC_ROLE_MAP,
  AUTO_SYNC_ROLE_OFF,
  AUTO_SYNC_ROLE_CHARACTER_RELATED,
  hydrateTabsAutoSyncRoles,
} from './tabAutoSyncRole.js';
import { isForceCollectionScope } from './theLucBanDoSync.js';

describe('tabAutoSyncRole', () => {
  it('hydrates explicit auto roles from the default-style tab tree', () => {
    const tabs = [
      {
        id: 'nhan-vat',
        label: 'Nhân Vật',
        subTabs: [
          { id: 'nhan-vat-chinh', label: 'Nhân vật chính', viewType: 'collection-track' },
          { id: 'dao-lu', label: 'Đạo lữ', viewType: 'collection-track' },
        ],
      },
      {
        id: 'the-luc',
        label: 'Thế Lực',
        subTabs: [{ id: 'gia-toc', label: 'Gia tộc', viewType: 'collection-track' }],
      },
      {
        id: 'tai-nguyen',
        label: 'Tài Nguyên',
        subTabs: [{ id: 'dia-danh', label: 'Bản đồ / Bí cảnh', viewType: 'collection-track' }],
      },
      {
        id: 'tu-luyen',
        label: 'Tu luyện',
        subTabs: [
          { id: 'he-thong-tu-luyen', label: 'Hệ thống tu luyện', viewType: 'collection-track' },
          { id: 'canh-gioi', label: 'Cảnh giới', viewType: 'collection-track' },
        ],
      },
    ];

    const out = hydrateTabsAutoSyncRoles(tabs).tabsConfig;

    expect(out[0].subTabs[0].autoSyncRole).toBe(AUTO_SYNC_ROLE_MAIN_CHARACTER);
    expect(out[0].subTabs[1].autoSyncRole).toBe(AUTO_SYNC_ROLE_CHARACTER_RELATED);
    expect(out[1].subTabs[0].autoSyncRole).toBe(AUTO_SYNC_ROLE_FORCE);
    expect(out[2].subTabs[0].autoSyncRole).toBe(AUTO_SYNC_ROLE_MAP);
    expect(out[3].subTabs[0].autoSyncRole).toBe(AUTO_SYNC_ROLE_CULTIVATION_SYSTEM);
    expect(out[3].subTabs[1].autoSyncRole).toBe(AUTO_SYNC_ROLE_CULTIVATION_REALM);
  });

  it('lets explicit roles drive all auto scope detectors on custom tab names', () => {
    expect(
      isForceCollectionScope({
        activeTabLon: 'luc-luong-tuy-bien',
        activeTabNho: 'phe-so-7',
        currentTabConfig: { id: 'phe-so-7', label: 'Phe so 7', viewType: 'collection-track', autoSyncRole: AUTO_SYNC_ROLE_FORCE },
        parentLabel: 'Cây riêng',
      })
    ).toBe(true);

    expect(
      isMapCollectionScope({
        activeTabLon: 'the-gioi-rieng',
        activeTabNho: 'cum-1',
        currentTabConfig: { id: 'cum-1', label: 'Cum 1', viewType: 'collection-track', autoSyncRole: AUTO_SYNC_ROLE_MAP },
        parentLabel: 'Không liên quan',
      })
    ).toBe(true);

    expect(
      isCultivationRelationScope({
        activeTabLon: 'dao-lo-tren-may',
        activeTabNho: 'he-1',
        currentTabConfig: { id: 'he-1', label: 'He 1', viewType: 'collection-track', autoSyncRole: AUTO_SYNC_ROLE_CULTIVATION_SYSTEM },
      })
    ).toBe(true);

    expect(
      isCultivationRelationScope({
        activeTabLon: 'dao-lo-tren-may',
        activeTabNho: 'realm-1',
        currentTabConfig: { id: 'realm-1', label: 'Realm 1', viewType: 'collection-track', autoSyncRole: AUTO_SYNC_ROLE_CULTIVATION_REALM },
      })
    ).toBe(true);

    expect(
      isMainCharacterRelationScope({
        activeTabLon: 'dan-su',
        activeTabNho: 'hat-nhan',
        currentTabConfig: { id: 'hat-nhan', label: 'Hat nhan', viewType: 'collection-track', autoSyncRole: AUTO_SYNC_ROLE_MAIN_CHARACTER },
        parentLabel: 'Tùy chỉnh',
      })
    ).toBe(true);

    expect(
      isMainCharacterRelationScope({
        activeTabLon: 'dan-su',
        activeTabNho: 've-tinh',
        currentTabConfig: { id: 've-tinh', label: 'Ve tinh', viewType: 'collection-track', autoSyncRole: AUTO_SYNC_ROLE_CHARACTER_RELATED },
        parentLabel: 'Tùy chỉnh',
      })
    ).toBe(true);

    expect(
      isAutoRelationScopeLonId(
        'luc-luong-tuy-bien',
        'Cây riêng',
        { id: 'phe-so-7', label: 'Phe so 7', viewType: 'collection-track', autoSyncRole: AUTO_SYNC_ROLE_FORCE },
        'phe-so-7'
      )
    ).toBe(true);
  });

  it('allows explicit off to disable old name-based heuristics', () => {
    expect(
      isMapCollectionScope({
        activeTabLon: 'tai-nguyen',
        activeTabNho: 'dia-danh',
        currentTabConfig: { id: 'dia-danh', label: 'Bản đồ / Bí cảnh', viewType: 'collection-track', autoSyncRole: AUTO_SYNC_ROLE_OFF },
        parentLabel: 'Tài Nguyên',
      })
    ).toBe(false);
  });
});
