import { describe, expect, it } from 'vitest';
import {
  ensureCollectionListCardsForNovel,
  hasCollectionListAutoBlock,
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
              dynamicData: { f_vi_tri: 'Hạ Giới - Băng Thiên Đại Lục - Thánh Trì', f_status: 'Hạ Giới · Thành Trì' },
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
    expect(info).toContain('[[Thánh Thành]]');
    expect(info).toContain('[[Băng Thiên Đại Lục]]');
    expect(info).toContain('Đại Lục');
    expect(info).toContain('Hạ Giới · Thành Trì');
    expect(info).not.toContain('f_vi_tri');
    expect(info).not.toContain('### ');
  });

  it('uses raw f_status display line as-is (no field label / no path dedupe)', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'he-thong',
          label: 'Hệ thống',
          subTabs: [
            {
              id: 'canh-gioi',
              label: 'Cảnh giới',
              viewType: 'collection-track',
              fieldsTemplate: [
                { id: 'f_title', label: 'Giới', sortPrefix: 'I' },
                { id: 'f_status', label: 'Chuỗi hiển thị', sortPrefix: 'II' },
              ],
            },
          ],
        },
      ],
      data: {
        'he-thong': {
          'canh-gioi': {
            overview: '',
            entities: [
              { id: 'list', name: 'Danh sach canh gioi', info: '', dynamicData: {}, milestones: [] },
              {
                id: 'e1',
                name: 'Võ Đạo',
                info: '',
                dynamicData: {
                  f_title: 'Hạ Giới',
                  f_status: 'Hạ Giới',
                },
                milestones: [],
              },
            ],
          },
        },
      },
    };
    syncAllCollectionListCards(novel);
    const info = String(novel.data['he-thong']['canh-gioi'].entities[0].info || '');
    expect(info).toContain(
      '[[Võ Đạo]] [color=#8ca0be]·[/color] [color=#f8fafc]**Hạ Giới**[/color]'
    );
    expect(info).not.toContain('f_status');
    expect(info).not.toContain('Chuỗi hiển thị');
  });

  it('preserves full multi-segment display string without splitting', () => {
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
              {
                id: 'e1',
                name: 'Võ Đạo',
                info: '',
                dynamicData: { f_status: 'Tu Luyện - Bạch ngân - Sơ Kỳ' },
                milestones: [],
              },
            ],
          },
        },
      },
    };
    syncAllCollectionListCards(novel);
    const info = String(novel.data.t.n.entities[0].info || '');
    expect(info).toContain('[color=#f8fafc]**Tu Luyện - Bạch ngân - Sơ Kỳ**[/color]');
  });

  it('falls back to owner suffix when no display line', () => {
    const novel = buildNovel();
    syncAllCollectionListCards(novel);
    const info = String(novel.data['he-thong']['goi-qua'].entities[0].info || '');
    expect(info).toContain('[[Rương Đại Lễ]] [color=#8ca0be]·[/color] [color=#f8fafc]**Lạc Nam**[/color]');
  });

  it('keeps existing modern AUTO block unchanged on later sync', () => {
    const novel = buildNovel();
    const listCard = novel.data['ban-do']['ha-gioi'].entities[0];
    listCard.info =
      'Ghi chú map\n\n# Danh mục thẻ (AUTO)\n\n- Tổng số thẻ: 1\n\n## Danh sách (1)\n\n1. [[OLD KEEP]]';
    expect(hasCollectionListAutoBlock(listCard.info)).toBe(true);

    syncAllCollectionListCards(novel);
    const info = String(listCard.info || '');
    expect(info).toContain('[[OLD KEEP]]');
    expect(info).not.toContain('[[Băng Thiên Đại Lục]]');
    expect(info).not.toContain('[[Thánh Thành]]');
  });

  it('migrates legacy HTML AUTO markers once into modern block', () => {
    const novel = buildNovel();
    const listCard = novel.data['ban-do']['ha-gioi'].entities[0];
    listCard.info =
      'Ghi chú map\n\n<!-- AUTO_COLLECTION_LIST:START -->\n# Danh mục thẻ (AUTO)\n\n- Tổng số thẻ: 0\n<!-- AUTO_COLLECTION_LIST:END -->';
    expect(hasCollectionListAutoBlock(listCard.info)).toBe(false);

    syncAllCollectionListCards(novel);
    const info = String(listCard.info || '');
    expect(info).not.toMatch(/<!--\s*AUTO_COLLECTION_LIST/i);
    expect(info).toContain('# Danh mục thẻ (AUTO)');
    expect(info).toContain('[[Băng Thiên Đại Lục]]');
  });

  it('writes AUTO once when list card has no AUTO block yet', () => {
    const novel = buildNovel();
    const listCard = novel.data['ban-do']['ha-gioi'].entities[0];
    listCard.info = 'Chỉ ghi chú tay';
    expect(hasCollectionListAutoBlock(listCard.info)).toBe(false);

    syncAllCollectionListCards(novel);
    const info = String(listCard.info || '');
    expect(info).toContain('Chỉ ghi chú tay');
    expect(info).toContain('# Danh mục thẻ (AUTO)');
    expect(info).toContain('[[Băng Thiên Đại Lục]]');
    expect(hasCollectionListAutoBlock(info)).toBe(true);

    // sync lần 2 không đổi nội dung dù entity đổi
    novel.data['ban-do']['ha-gioi'].entities[1].dynamicData.f_status = 'ĐÃ ĐỔI';
    const before = info;
    syncAllCollectionListCards(novel);
    expect(String(listCard.info || '')).toBe(before);
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
    expect(novel.data['ban-do']['ha-gioi'].entities.some((ent) => /danh sach/i.test(String(ent.name || '')))).toBe(
      false
    );
  });

  it('falls back to owner suffix as plain text when no display line exists', () => {
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

  it('wraps owner as [[…]] when it matches another entity name in the novel', () => {
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

  it('sorts by name when display presence is equal', () => {
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
              { id: 'long', name: 'Gamma', info: '', dynamicData: { f_status: 'A' }, milestones: [] },
              { id: 'mid', name: 'Alpha', info: '', dynamicData: { f_status: 'B' }, milestones: [] },
              { id: 'short', name: 'Beta', info: '', dynamicData: { f_status: 'C' }, milestones: [] },
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
});
