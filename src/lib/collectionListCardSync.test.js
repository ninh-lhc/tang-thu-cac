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
    expect(info).toContain('1. [[Thánh Thành]]');
    expect(info).toContain('2. [[Băng Thiên Đại Lục]]');
    expect(info).toContain('f_vi_tri');
    expect(info).toContain('Hạ Giới · Băng Tinh');
    expect(info).toContain('f_status');
    expect(info).toContain('Đại Lục');
    expect(info).not.toContain('### ');
  });

  it('AUTO detail line includes f_to_chuc and short f_desc (sortPrefix order)', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'lon',
          label: 'L',
          subTabs: [
            {
              id: 'n',
              label: 'Túc Địch',
              viewType: 'collection-track',
              fieldsTemplate: [
                { id: 'f_to_chuc', label: 'Tai Ách Bản Chất', sortPrefix: '1' },
                { id: 'f_vai_tro', label: 'Khởi Nguyên', sortPrefix: '2' },
                { id: 'f_desc', label: 'Cảnh Giới', sortPrefix: '3' },
                { id: 'f_cap', label: 'Tà Lực', sortPrefix: '4' },
                { id: 'f_alias', label: 'Wiki' },
              ],
            },
          ],
        },
      ],
      data: {
        lon: {
          n: {
            overview: '',
            entities: [
              { id: 'list', name: 'Danh sach n', info: '', dynamicData: {}, milestones: [] },
              {
                id: 'e1',
                name: 'Tam Phật Thủ',
                info: '',
                dynamicData: {
                  f_to_chuc: 'Hư Không Ma Vật',
                  f_vai_tro: 'Vô Tận Hư Không',
                  f_desc: 'Phàm Trần Chi Cảnh (Cấp 1 - 99)',
                  f_cap: 'Hư Không Đồng Hóa',
                },
                milestones: [],
              },
            ],
          },
        },
      },
    };
    syncAllCollectionListCards(novel);
    const info = String(novel.data.lon.n.entities[0].info || '');
    expect(info).toContain('Tai Ách Bản Chất');
    expect(info).toContain('Hư Không Ma Vật');
    expect(info).toContain('Khởi Nguyên');
    expect(info).toContain('Vô Tận Hư Không');
    expect(info).toContain('Cảnh Giới');
    expect(info).toContain('Phàm Trần Chi Cảnh (Cấp 1 - 99)');
    expect(info).toContain('Tà Lực');
    expect(info).toContain('Hư Không Đồng Hóa');
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
    expect(lines[0].includes('[[Alpha]]')).toBe(true);
    expect(lines[1].includes('[[Beta]]')).toBe(true);
    expect(lines[2].includes('[[Gamma]]')).toBe(true);
  });

  it('appends detail suffix from map fields', () => {
    const novel = buildNovel();
    syncAllCollectionListCards(novel);
    const info = String(novel.data['ban-do']['ha-gioi'].entities[0].info || '');
    expect(info).toContain(
      '[[Băng Thiên Đại Lục]] [color=#8ca0be]·[/color] [color=#93c5fd]f_vi_tri[/color] [color=#a8c0d8]-[/color] [color=#f8fafc]**Hạ Giới · Băng Tinh**[/color] [color=#8ca0be]·[/color] [color=#93c5fd]f_status[/color] [color=#a8c0d8]-[/color] [color=#f8fafc]**Đại Lục**[/color]'
    );
    expect(info).toContain(
      '[[Thánh Thành]] [color=#8ca0be]·[/color] [color=#93c5fd]f_vi_tri[/color] [color=#a8c0d8]-[/color] [color=#f8fafc]**Hạ Giới · Băng Thiên Đại Lục · Thánh Trì**[/color]'
    );
  });

  it('falls back to owner suffix when no detail bits', () => {
    const novel = buildNovel();
    syncAllCollectionListCards(novel);
    const info = String(novel.data['he-thong']['goi-qua'].entities[0].info || '');
    expect(info).toContain('[[Rương Đại Lễ]] [color=#8ca0be]·[/color] [color=#f8fafc]**Lạc Nam**[/color]');
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
      '[[Thiên Tinh Châu]] [color=#8ca0be]·[/color] [color=#93c5fd]Khu vực[/color] [color=#a8c0d8]-[/color] [color=#f8fafc]**Hạ Giới**[/color] [color=#8ca0be]·[/color] [color=#93c5fd]Phân tầng[/color] [color=#a8c0d8]-[/color] [color=#f8fafc]**Thiên phẩm**[/color]'
    );
    expect(info).not.toContain(
      '[[Thiên Tinh Châu]] [color=#8ca0be]·[/color] [color=#f8fafc]**Hạ Giới**[/color] [color=#8ca0be]·[/color] [color=#f8fafc]**Thiên phẩm**[/color] [color=#8ca0be]·[/color] [color=#f8fafc]**Lạc Nam**[/color]'
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
    expect(info).toContain('[[La Bàn Cổ]] [color=#8ca0be]·[/color] [color=#f8fafc]**Mộ Dung Tuyết**[/color]');
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
    expect(info).toContain(
      '[[Thực thể mẫu]] [color=#8ca0be]·[/color] [color=#93c5fd]A theo Số TT[/color] [color=#a8c0d8]-[/color] [color=#f8fafc]**Ác**[/color] [color=#8ca0be]·[/color] [color=#93c5fd]B trước theo mẫu[/color] [color=#a8c0d8]-[/color] [color=#f8fafc]**Bét**[/color]'
    );
  });

  it('includes f_chu in AUTO detail when configured in fieldsTemplate (not dropped as «owner» id)', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'tab',
          label: 'Tab',
          subTabs: [
            {
              id: 'nho',
              label: 'Con',
              viewType: 'collection-track',
              fieldsTemplate: [
                { id: 'f_status', label: 'Phẩm cấp', sortPrefix: 'I' },
                { id: 'f_title', label: 'Phân Loại', sortPrefix: 'II' },
                { id: 'f_chu', label: 'Nguồn Gốc', sortPrefix: 'III' },
              ],
            },
          ],
        },
      ],
      data: {
        tab: {
          nho: {
            overview: '',
            entities: [
              { id: 'list', name: 'Danh sach x', info: '', dynamicData: {}, milestones: [] },
              {
                id: 'ent',
                name: 'Item',
                info: '',
                dynamicData: {
                  f_status: 'Kim',
                  f_title: 'Loại A',
                  f_chu: 'Chiến Trường',
                },
                milestones: [],
              },
            ],
          },
        },
      },
    };
    syncAllCollectionListCards(novel);
    const info = String(novel.data.tab.nho.entities[0].info || '');
    expect(info).toContain('Phẩm cấp');
    expect(info).toContain('Kim');
    expect(info).toContain('Phân Loại');
    expect(info).toContain('Loại A');
    expect(info).toContain('Nguồn Gốc');
    expect(info).toContain('Chiến Trường');
  });

  it('AUTO suffix chỉ gồm trường đã gán Số TT, thứ tự 1→2→3 (bỏ trường không có Số TT)', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'tab-x',
          label: 'Tab X',
          subTabs: [
            {
              id: 'nho-y',
              label: 'Nhỏ Y',
              viewType: 'collection-track',
              fieldsTemplate: [
                { id: 'f_mo_ta', label: 'Bỏ qua' },
                { id: 'f_four', label: 'Không số' },
                { id: 'f_b', label: 'B', sortPrefix: '2' },
                { id: 'f_a', label: 'A', sortPrefix: '1' },
                { id: 'f_c', label: 'C', sortPrefix: '3' },
              ],
            },
          ],
        },
      ],
      data: {
        'tab-x': {
          'nho-y': {
            overview: '',
            entities: [
              { id: 'list-1', name: 'Danh sach x', info: '', dynamicData: {}, milestones: [] },
              {
                id: 'e-1',
                name: 'Thực thể X',
                info: '',
                dynamicData: { f_four: 'Dư', f_a: 'Một', f_b: 'Hai', f_c: 'Ba' },
                milestones: [],
              },
            ],
          },
        },
      },
    };
    syncAllCollectionListCards(novel);
    const info = String(novel.data['tab-x']['nho-y'].entities[0].info || '');
    expect(info).toContain('[[Thực thể X]]');
    expect(info).toContain('[color=#f8fafc]**Một**[/color]');
    expect(info).toContain('[color=#f8fafc]**Hai**[/color]');
    expect(info).toContain('[color=#f8fafc]**Ba**[/color]');
    expect(info).not.toContain('**Dư**');
    const line = info.split('\n').find((l) => /^\d+\./.test(l.trim()) && l.includes('Thực thể X'));
    expect(line).toBeDefined();
    const idxMột = line.indexOf('Một');
    const idxHai = line.indexOf('Hai');
    const idxBa = line.indexOf('Ba');
    expect(idxMột).toBeGreaterThan(0);
    expect(idxHai).toBeGreaterThan(idxMột);
    expect(idxBa).toBeGreaterThan(idxHai);
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
    expect(info).toContain('[[Rương Đại Lễ]] [color=#8ca0be]·[/color] [[Lạc Nam]]');
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
    expect(info).toContain('[color=#f8fafc]**Băng Xa**[/color]');
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
