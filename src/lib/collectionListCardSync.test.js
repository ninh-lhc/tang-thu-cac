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

  it('sorts AUTO lines by number of path segments, then by card name (vi)', () => {
    const novel = {
      tabsConfig: [
        { id: 't', label: 'T', subTabs: [{ id: 'n', label: 'N', viewType: 'collection-track' }] },
      ],
      data: {
        t: {
          n: {
            overview: '',
            entities: [
              { id: 'list', name: 'Danh sach n', info: '', dynamicData: {}, milestones: [] },
              { id: 'long', name: 'Gamma', info: '', dynamicData: { f_vi_tri: 'P - Q - R - S' }, milestones: [] },
              { id: 'mid', name: 'Alpha', info: '', dynamicData: { f_vi_tri: 'X - Y - Z' }, milestones: [] },
              { id: 'short', name: 'Beta', info: '', dynamicData: { f_vi_tri: 'A - B' }, milestones: [] },
            ],
          },
        },
      },
    };
    syncAllCollectionListCards(novel);
    const info = String(novel.data.t.n.entities[0].info || '');
    const lines = info.split('\n').filter((l) => /^\d+\./.test(l.trim()));
    expect(lines[0].includes('[[Beta]]')).toBe(true);
    expect(lines[1].includes('[[Alpha]]')).toBe(true);
    expect(lines[2].includes('[[Gamma]]')).toBe(true);
  });

  it('appends detail suffix from map fields', () => {
    const novel = buildNovel();
    syncAllCollectionListCards(novel);
    const info = String(novel.data['ban-do']['ha-gioi'].entities[0].info || '');
    expect(info).toContain(
      '[[Băng Thiên Đại Lục]] [color=#94a3b8]**·**[/color] [color=#e2e8f0]**Hạ Giới**[/color] [color=#94a3b8]**·**[/color] [color=#e2e8f0]**Băng Tinh**[/color] [color=#94a3b8]**·**[/color] [color=#e2e8f0]**Đại Lục**[/color]'
    );
    expect(info).toContain(
      '[[Thánh Thành]] [color=#94a3b8]**·**[/color] [color=#e2e8f0]**Hạ Giới**[/color] [color=#94a3b8]**·**[/color] [[Băng Thiên Đại Lục]] [color=#94a3b8]**·**[/color] [color=#e2e8f0]**Thánh Trì**[/color]'
    );
  });

  it('falls back to owner suffix when no detail bits', () => {
    const novel = buildNovel();
    syncAllCollectionListCards(novel);
    const info = String(novel.data['he-thong']['goi-qua'].entities[0].info || '');
    expect(info).toContain('[[Rương Đại Lễ]] [color=#94a3b8]**·**[/color] [color=#e2e8f0]**Lạc Nam**[/color]');
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

  it('does not recreate list card when AUTO level 2 is disabled', () => {
    const novel = buildNovel();
    novel.tabsConfig[0].subTabs[0].autoSyncLevelConfig = {
      enabled: true,
      levels: {
        level_1_card: true,
        level_2_list: false,
        level_3_linked: false,
        level_4_timeline: false,
      },
    };
    novel.data['ban-do']['ha-gioi'].entities = novel.data['ban-do']['ha-gioi'].entities.filter(
      (ent) => !String(ent.name || '').toLowerCase().includes('danh sach')
    );

    const result = syncAllCollectionListCardsDetailed(novel);
    expect(result.recreatedCount).toBe(0);
    expect(novel.data['ban-do']['ha-gioi'].entities.some((ent) => /danh sach/i.test(String(ent.name || '')))).toBe(false);
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
    expect(info).toContain(
      '[[Thiên Tinh Châu]] [color=#94a3b8]**·**[/color] [color=#e2e8f0]**Hạ Giới**[/color] [color=#94a3b8]**·**[/color] [color=#e2e8f0]**Thiên phẩm**[/color]'
    );
    expect(info).not.toContain(
      '[[Thiên Tinh Châu]] [color=#94a3b8]**·**[/color] [color=#e2e8f0]**Hạ Giới**[/color] [color=#94a3b8]**·**[/color] [color=#e2e8f0]**Thiên phẩm**[/color] [color=#94a3b8]**·**[/color] [color=#e2e8f0]**Lạc Nam**[/color]'
    );
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
    expect(info).toContain('[[La Bàn Cổ]] [color=#94a3b8]**·**[/color] [color=#e2e8f0]**Mộ Dung Tuyết**[/color]');
    expect(info).not.toContain('[[La Bàn Cổ]] - [[Mộ Dung Tuyết]]');
  });

  it('orders detail suffix on list card by field sortPrefix (I before II) when using fieldsTemplate', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'test-tab',
          label: 'Thử',
          subTabs: [
            {
              id: 'nho-1',
              label: 'Nhỏ 1',
              viewType: 'collection-track',
              fieldsTemplate: [
                { id: 'f_mo_ta', label: 'Bỏ qua' },
                { id: 'f_b_field', label: 'B trước theo mẫu', sortPrefix: 'II' },
                { id: 'f_a_field', label: 'A theo Số TT', sortPrefix: 'I' },
              ],
            },
          ],
        },
      ],
      data: {
        'test-tab': {
          'nho-1': {
            overview: '',
            entities: [
              { id: 'list-1', name: 'Danh sach thu', info: '', dynamicData: {}, milestones: [] },
              {
                id: 'e-1',
                name: 'Thực thể mẫu',
                info: '',
                dynamicData: { f_b_field: 'Bét', f_a_field: 'Ác' },
                milestones: [],
              },
            ],
          },
        },
      },
    };
    syncAllCollectionListCards(novel);
    const info = String(novel.data['test-tab']['nho-1'].entities[0].info || '');
    expect(info).toContain('[[Thực thể mẫu]] [color=#94a3b8]**·**[/color] [color=#e2e8f0]**Ác**[/color] [color=#94a3b8]**·**[/color] [color=#e2e8f0]**Bét**[/color]');
  });

  it('dedupes f_status path segments that overlap f_vi_tri in AUTO (fieldsTemplate)', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'ban-do',
          label: 'Bản đồ',
          subTabs: [
            {
              id: 'ha-gioi',
              label: 'Hạ Giới',
              viewType: 'collection-track',
              fieldsTemplate: [
                { id: 'f_title', label: 'Giới', sortPrefix: 'I' },
                { id: 'f_he_gioi_ban_do', label: 'Quy mô', sortPrefix: 'II' },
                { id: 'f_vi_tri', label: 'Trực thuộc', sortPrefix: 'III' },
                { id: 'f_status', label: 'Chuỗi', sortPrefix: 'IV' },
              ],
            },
          ],
        },
      ],
      data: {
        'ban-do': {
          'ha-gioi': {
            overview: '',
            entities: [
              { id: 'list-map', name: 'Danh sach ha gioi', info: '', dynamicData: {}, milestones: [] },
              {
                id: 'e1',
                name: 'Thánh Thành',
                info: '',
                dynamicData: {
                  f_title: 'Hạ Giới',
                  f_he_gioi_ban_do: 'Thành Trì',
                  f_vi_tri: 'Việt Long Tinh > Băng Thiên Đại Lục',
                  f_status: 'Hạ Giới · Thành Trì · Việt Long Tinh > Băng Thiên Đại Lục',
                },
                milestones: [],
              },
            ],
          },
        },
      },
    };
    syncAllCollectionListCards(novel);
    const info = String(novel.data['ban-do']['ha-gioi'].entities[0].info || '');
    const line = info
      .split('\n')
      .find((l) => /^\d+\./.test(l.trim()) && l.includes('[[Thánh Thành]]'));
    expect(line).toBeDefined();
    const vlt = (line.match(/Việt Long Tinh/g) || []).length;
    expect(vlt).toBe(1);
  });

  it('wraps a path segment as [[…]] when it matches another entity name in the novel', () => {
    const novel = buildNovel();
    novel.data['he-thong']['goi-qua'].entities.push({
      id: 'person-ln',
      name: 'Lạc Nam',
      info: '',
      dynamicData: {},
      milestones: [],
    });
    syncAllCollectionListCards(novel);
    const info = String(novel.data['he-thong']['goi-qua'].entities[0].info || '');
    expect(info).toContain('[[Rương Đại Lễ]] [color=#94a3b8]**·**[/color] [[Lạc Nam]]');
  });

  it('outputs [[…]] for a bit only if the same text was inside [[…]] in a detail field', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'ban-do',
          label: 'Bản đồ',
          subTabs: [
            {
              id: 't1',
              label: 'Test',
              viewType: 'collection-track',
              fieldsTemplate: [{ id: 'f_vi_tri', label: 'Vị trí', sortPrefix: 'I' }],
            },
          ],
        },
      ],
      data: {
        'ban-do': {
          t1: {
            overview: '',
            entities: [
              { id: 'list-1', name: 'Danh sach test', info: '', dynamicData: {}, milestones: [] },
              {
                id: 'e1',
                name: 'Diem A',
                info: '',
                dynamicData: { f_vi_tri: '[[Việt Long Tinh]] - Băng Xa' },
                milestones: [],
              },
            ],
          },
        },
      },
    };
    syncAllCollectionListCards(novel);
    const info = String(novel.data['ban-do']['t1'].entities[0].info || '');
    expect(info).toContain('[[Việt Long Tinh]]');
    expect(info).toContain('[color=#e2e8f0]**Băng Xa**[/color]');
    expect(info).not.toContain('[[Băng Xa]]');
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
