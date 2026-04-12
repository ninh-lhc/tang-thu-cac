import { describe, expect, it } from 'vitest';
import { syncAllAutoRelationNotesForNovel } from './autoRelationDetailNote.js';
import { syncAllCultivationRelationBlocks } from './cultivationRelationSync.js';
import { syncAllMainCharacterRelationBlocks } from './mainCharacterRelationSync.js';
import { syncAllMapHierarchyAutoBlocks } from './mapHierarchySync.js';
import {
  AUTO_SYNC_ROLE_CHARACTER_RELATED,
  AUTO_SYNC_ROLE_CULTIVATION_REALM,
  AUTO_SYNC_ROLE_CULTIVATION_SYSTEM,
  AUTO_SYNC_ROLE_FORCE,
  AUTO_SYNC_ROLE_MAIN_CHARACTER,
  AUTO_SYNC_ROLE_MAP,
} from './tabAutoSyncRole.js';
import { hydrateTabsAutoSyncConfigs } from './tabAutoSyncFieldMap.js';

describe('tabAutoSyncFieldMap', () => {
  it('hydrates default field maps for auto tabs', () => {
    const tabs = [
      {
        id: 'the-luc',
        label: 'The luc',
        subTabs: [{ id: 'gia-toc', label: 'Gia toc', viewType: 'collection-track' }],
      },
      {
        id: 'tai-nguyen',
        label: 'Tai nguyen',
        subTabs: [{ id: 'dia-danh', label: 'Dia danh', viewType: 'collection-track' }],
      },
      {
        id: 'tu-luyen',
        label: 'Tu luyen',
        subTabs: [
          { id: 'he-thong-tu-luyen', label: 'He thong', viewType: 'collection-track' },
          { id: 'canh-gioi', label: 'Canh gioi', viewType: 'collection-track' },
        ],
      },
      {
        id: 'nhan-vat',
        label: 'Nhan vat',
        subTabs: [
          { id: 'nhan-vat-chinh', label: 'Hat nhan', viewType: 'collection-track' },
          { id: 'dao-lu', label: 'Dong hanh', viewType: 'collection-track' },
        ],
      },
    ];

    const out = hydrateTabsAutoSyncConfigs(tabs).tabsConfig;

    expect(out[0].subTabs[0].autoSyncFieldMap).toMatchObject({
      status: 'f_status',
      location: 'f_dia_ban',
      type: 'f_title',
    });
    expect(out[1].subTabs[0].autoSyncFieldMap).toMatchObject({
      title: 'f_title',
      status: 'f_status',
      parent_path: 'f_vi_tri',
    });
    expect(out[2].subTabs[0].autoSyncFieldMap).toMatchObject({
      status: 'f_status',
      alias: 'f_alias',
    });
    expect(out[2].subTabs[1].autoSyncFieldMap).toMatchObject({
      status: 'f_status',
    });
    expect(out[3].subTabs[0].autoSyncFieldMap).toMatchObject({
      status: 'f_status',
    });
    expect(out[3].subTabs[1].autoSyncFieldMap).toMatchObject({
      relation: 'f_quan_he',
      status: 'f_status',
    });
  });

  it('syncs cultivation auto blocks with custom field ids', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'dao-lo',
          label: 'Dao lo',
          subTabs: [
            {
              id: 'he-rieng',
              label: 'He rieng',
              viewType: 'collection-track',
              autoSyncRole: AUTO_SYNC_ROLE_CULTIVATION_SYSTEM,
              autoSyncFieldMap: { status: 'f_he_cap', alias: 'f_he_alias' },
            },
            {
              id: 'realm-rieng',
              label: 'Realm rieng',
              viewType: 'collection-track',
              autoSyncRole: AUTO_SYNC_ROLE_CULTIVATION_REALM,
              autoSyncFieldMap: { status: 'f_realm_chain' },
            },
          ],
        },
      ],
      data: {
        'dao-lo': {
          'he-rieng': {
            entities: [
              {
                id: 'sys-1',
                name: 'Linh Canh',
                dynamicData: { f_he_alias: 'Linh Canh Bat Bo' },
                info: '',
              },
            ],
          },
          'realm-rieng': {
            entities: [
              {
                id: 'realm-1',
                name: 'De Nhat',
                dynamicData: { f_realm_chain: 'De Nhat - Linh Canh Bat Bo' },
                info: '',
              },
            ],
          },
        },
      },
    };

    const changed = syncAllCultivationRelationBlocks(novel);

    expect(changed).toBe(true);
    expect(novel.data['dao-lo']['realm-rieng'].entities[0].info).toContain('[[Linh Canh]]');
    expect(novel.data['dao-lo']['he-rieng'].entities[0].info).toContain('[[De Nhat - Linh Canh Bat Bo]]');
  });

  it('syncs main character relation blocks with custom relation fields', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'nhan-su',
          label: 'Nhan su',
          subTabs: [
            {
              id: 'hat-nhan',
              label: 'Hat nhan',
              viewType: 'collection-track',
              autoSyncRole: AUTO_SYNC_ROLE_MAIN_CHARACTER,
              autoSyncFieldMap: { status: 'f_hat_nhan_status' },
            },
            {
              id: 'dong-hanh',
              label: 'Dong hanh',
              viewType: 'collection-track',
              autoSyncRole: AUTO_SYNC_ROLE_CHARACTER_RELATED,
              autoSyncFieldMap: { relation: 'f_lien_ket', status: 'f_dong_hanh_status' },
            },
          ],
        },
      ],
      data: {
        'nhan-su': {
          'hat-nhan': {
            entities: [{ id: 'main-1', name: 'Han Lap', dynamicData: { f_hat_nhan_status: 'Kim Dan' }, info: '' }],
          },
          'dong-hanh': {
            entities: [
              {
                id: 'rel-1',
                name: 'Nam Cung Uyen',
                dynamicData: {
                  f_lien_ket: 'Dao lu',
                  f_dong_hanh_status: 'Nguyen Anh',
                },
                info: '',
              },
            ],
          },
        },
      },
    };

    const changed = syncAllMainCharacterRelationBlocks(novel);

    expect(changed).toBe(true);
    expect(novel.data['nhan-su']['dong-hanh'].entities[0].info).toContain('Quan hệ: Dao lu');
    expect(novel.data['nhan-su']['hat-nhan'].entities[0].info).toContain('Dao lu');
  });

  it('syncs map hierarchy blocks with custom title and parent-path fields', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'the-gioi-rieng',
          label: 'The gioi rieng',
          subTabs: [
            {
              id: 'ban-do-rieng',
              label: 'Ban do rieng',
              viewType: 'collection-track',
              autoSyncRole: AUTO_SYNC_ROLE_MAP,
              autoSyncFieldMap: {
                title: 'f_loai_dia_danh',
                status: 'f_quy_mo',
                parent_path: 'f_truc_thuoc',
              },
            },
          ],
        },
      ],
      data: {
        'the-gioi-rieng': {
          'ban-do-rieng': {
            entities: [
              {
                id: 'm1',
                name: 'Viet Long Tinh Cau',
                dynamicData: { f_loai_dia_danh: 'Tinh Cau' },
                info: '',
              },
              {
                id: 'm2',
                name: 'Bang Thien Dai Luc',
                dynamicData: {
                  f_loai_dia_danh: 'Dai Luc',
                  f_truc_thuoc: 'Viet Long Tinh Cau',
                },
                info: '',
              },
            ],
          },
        },
      },
    };

    const changed = syncAllMapHierarchyAutoBlocks(novel);

    expect(changed).toBe(true);
    expect(novel.data['the-gioi-rieng']['ban-do-rieng'].entities[1].info).toContain('[[Viet Long Tinh Cau]]');
    expect(novel.data['the-gioi-rieng']['ban-do-rieng'].entities[0].info).toContain('[[Bang Thien Dai Luc]]');
  });

  it('syncs auto relation notes from a custom force status field', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'luc-luong-rieng',
          label: 'Luc luong rieng',
          subTabs: [
            {
              id: 'phe-1',
              label: 'Phe 1',
              viewType: 'collection-track',
              autoSyncRole: AUTO_SYNC_ROLE_FORCE,
              autoSyncFieldMap: { status: 'f_chuoi_quan_he' },
            },
          ],
        },
        {
          id: 'ban-do-rieng',
          label: 'Ban do rieng',
          subTabs: [
            {
              id: 'cum-1',
              label: 'Cum 1',
              viewType: 'collection-track',
              autoSyncRole: AUTO_SYNC_ROLE_MAP,
            },
          ],
        },
      ],
      data: {
        'luc-luong-rieng': {
          'phe-1': {
            entities: [
              {
                id: 'force-1',
                name: 'Lac Gia',
                dynamicData: {
                  f_chuoi_quan_he: 'Gia Toc - Bat Cap The Luc - Huyet Gioi - Huyet Hoang Dia',
                },
                info: '',
              },
            ],
          },
        },
        'ban-do-rieng': {
          'cum-1': {
            entities: [
              { id: 'map-1', name: 'Huyet Gioi', dynamicData: {}, info: '' },
              { id: 'map-2', name: 'Huyet Hoang Dia', dynamicData: {}, info: '' },
            ],
          },
        },
      },
    };

    const changed = syncAllAutoRelationNotesForNovel(novel);

    expect(changed).toBe(true);
    expect(novel.data['luc-luong-rieng']['phe-1'].entities[0].info).toContain('[[Huyet Gioi]]');
    expect(novel.data['ban-do-rieng']['cum-1'].entities[1].info).toContain('[[Lac Gia]]');
  });
});
