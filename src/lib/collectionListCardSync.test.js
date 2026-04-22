import { describe, expect, it } from 'vitest';
import {
  ensureCollectionListCardsForNovel,
  syncAllCollectionListCards,
  syncAllCollectionListCardsDetailed,
} from './collectionListCardSync.js';

function buildNovel() {
  return {
    tabsConfig: [
      {
        id: 'ban-do',
        label: 'Bản đồ',
        subTabs: [{ id: 'ha-gioi', label: 'Hạ Giới', viewType: 'collection-track' }],
      },
      {
        id: 'he-thong',
        label: 'Hệ thống',
        subTabs: [{ id: 'goi-qua', label: 'Gói Quà', viewType: 'collection-track' }],
      },
    ],
    data: {
      'ban-do': {
        'ha-gioi': {
          overview: '',
          entities: [
            { id: 'list-map', name: 'Danh sach ha gioi', info: 'Ghi chú map', dynamicData: {}, milestones: [] },
            {
              id: 'map-1',
              name: 'Băng Thiên Đại Lục',
              info: '',
              dynamicData: { f_vi_tri: 'Hạ Giới - Băng Tinh', f_status: 'Đại Lục' },
              milestones: [],
            },
            {
              id: 'map-2',
              name: 'Thánh Thành',
              info: '',
              dynamicData: { f_vi_tri: 'Hạ Giới - Băng Thiên Đại Lục - Thánh Trì' },
              milestones: [],
            },
          ],
        },
      },
      'he-thong': {
        'goi-qua': {
          overview: '',
          entities: [
            { id: 'list-gift', name: 'Danh sach goi qua', info: 'Ghi chú quà', dynamicData: {}, milestones: [] },
            {
              id: 'gift-1',
              name: 'Rương Đại Lễ',
              info: '',
              dynamicData: { f_owner: 'Lạc Nam' },
              milestones: [],
            },
          ],
        },
      },
    },
  };
}

describe('collectionListCardSync (flat mode)', () => {
  it('ensures each collection tab has a canonical list card', () => {
    const novel = {
      tabsConfig: [
        { id: 'he-thong', label: 'Hệ thống', subTabs: [{ id: 'goi-qua', label: 'Gói Quà', viewType: 'collection-track' }] },
      ],
      data: {
        'he-thong': {
          'goi-qua': {
            overview: '',
            entities: [{ id: 'gift-1', name: 'Rương Đại Lễ', info: '', dynamicData: {}, milestones: [] }],
          },
        },
      },
    };
    const changed = ensureCollectionListCardsForNovel(novel);
    expect(changed).toBe(true);
    expect(novel.data['he-thong']['goi-qua'].entities[0].name).toBe('Danh Sách Gói Quà');
  });

  it('writes AUTO block as a flat list and keeps manual notes', () => {
    const novel = buildNovel();
    syncAllCollectionListCards(novel);
    const info = String(novel.data['ban-do']['ha-gioi'].entities[0].info || '');
    expect(info).toContain('Ghi chú map');
    expect(info).toContain('# Danh mục thẻ (AUTO)');
    expect(info).toContain('## Danh sách (2)');
    expect(info).toContain('1. [[Băng Thiên Đại Lục]]');
    expect(info).toContain('2. [[Thánh Thành]]');
    expect(info).not.toContain('### ');
  });

  it('appends detail suffix from map fields', () => {
    const novel = buildNovel();
    syncAllCollectionListCards(novel);
    const info = String(novel.data['ban-do']['ha-gioi'].entities[0].info || '');
    expect(info).toContain('[[Băng Thiên Đại Lục]] - Hạ Giới - Băng Tinh - Đại Lục');
    expect(info).toContain('[[Thánh Thành]] - Hạ Giới - Băng Thiên Đại Lục - Thánh Trì');
  });

  it('falls back to owner suffix when no detail bits', () => {
    const novel = buildNovel();
    syncAllCollectionListCards(novel);
    const info = String(novel.data['he-thong']['goi-qua'].entities[0].info || '');
    expect(info).toContain('[[Rương Đại Lễ]] - Lạc Nam');
  });

  it('recreates list card and reports recreated tabs', () => {
    const novel = buildNovel();
    novel.data['ban-do']['ha-gioi'].entities = novel.data['ban-do']['ha-gioi'].entities.filter(
      (ent) => !String(ent.name || '').toLowerCase().includes('danh sach')
    );
    const result = syncAllCollectionListCardsDetailed(novel);
    expect(result.recreatedCount).toBe(1);
    expect(result.recreatedTabs[0]?.nhoId).toBe('ha-gioi');
    expect(novel.data['ban-do']['ha-gioi'].entities[0].name).toContain('Danh Sách');
  });

  it('uses tab fieldsTemplate order to pick detail suffix for non-map tabs', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'vat-pham',
          label: 'Vật phẩm',
          subTabs: [
            {
              id: 'linh-vat',
              label: 'Linh vật',
              viewType: 'collection-track',
              fieldsTemplate: [
                { id: 'f_custom_zone', label: 'Khu vực' },
                { id: 'f_custom_tier', label: 'Phân tầng' },
                { id: 'f_owner', label: 'Chủ sở hữu' },
              ],
            },
          ],
        },
      ],
      data: {
        'vat-pham': {
          'linh-vat': {
            overview: '',
            entities: [
              { id: 'list-1', name: 'Danh sach linh vat', info: '', dynamicData: {}, milestones: [] },
              {
                id: 'i-1',
                name: 'Thiên Tinh Châu',
                info: '',
                dynamicData: {
                  f_custom_zone: 'Hạ Giới',
                  f_custom_tier: 'Thiên phẩm',
                  f_owner: 'Lạc Nam',
                },
                milestones: [],
              },
            ],
          },
        },
      },
    };
    syncAllCollectionListCards(novel);
    const info = String(novel.data['vat-pham']['linh-vat'].entities[0].info || '');
    expect(info).toContain('[[Thiên Tinh Châu]] - Hạ Giới - Thiên phẩm');
    expect(info).not.toContain('[[Thiên Tinh Châu]] - Hạ Giới - Thiên phẩm - Lạc Nam');
  });

  it('falls back to owner suffix as plain text when no detail fields exist', () => {
    const novel = {
      tabsConfig: [
        { id: 'he-thong', label: 'Hệ thống', subTabs: [{ id: 'dao-cu', label: 'Đạo cụ', viewType: 'collection-track' }] },
      ],
      data: {
        'he-thong': {
          'dao-cu': {
            overview: '',
            entities: [
              { id: 'list-1', name: 'Danh sach dao cu', info: '', dynamicData: {}, milestones: [] },
              {
                id: 'tool-1',
                name: 'La Bàn Cổ',
                info: '',
                dynamicData: { f_owner: 'Mộ Dung Tuyết' },
                milestones: [],
              },
            ],
          },
        },
      },
    };
    syncAllCollectionListCards(novel);
    const info = String(novel.data['he-thong']['dao-cu'].entities[0].info || '');
    expect(info).toContain('[[La Bàn Cổ]] - Mộ Dung Tuyết');
    expect(info).not.toContain('[[La Bàn Cổ]] - [[Mộ Dung Tuyết]]');
  });

  it('keeps one flat list heading format across map and non-map tabs', () => {
    const novel = buildNovel();
    syncAllCollectionListCards(novel);
    const mapInfo = String(novel.data['ban-do']['ha-gioi'].entities[0].info || '');
    const otherInfo = String(novel.data['he-thong']['goi-qua'].entities[0].info || '');

    expect(mapInfo).toContain('## Danh sách (2)');
    expect(otherInfo).toContain('## Danh sách (1)');
    expect(mapInfo).not.toContain('### ');
    expect(otherInfo).not.toContain('### ');
  });
});
