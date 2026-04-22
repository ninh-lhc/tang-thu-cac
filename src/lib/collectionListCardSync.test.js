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
});

/*

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
            {
              id: 'list-map',
              name: 'Danh sach ha gioi',
              info: 'Ghi chú map',
              dynamicData: {},
              milestones: [],
            },
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
            {
              id: 'list-gift',
              name: 'Danh sach goi qua',
              info: 'Ghi chú quà',
              dynamicData: {},
              milestones: [],
            },
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
        {
          id: 'he-thong',
          label: 'Hệ thống',
          subTabs: [{ id: 'goi-qua', label: 'Gói Quà', viewType: 'collection-track' }],
        },
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
    const changed = syncAllCollectionListCards(novel);
    expect(changed).toBe(true);
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
    expect(info).toContain('[[Rương Đại Lễ]] - [[Lạc Nam]]');
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
});

import { describe, expect, it } from 'vitest';
import {
  ensureCollectionListCardsForNovel,
  syncAllCollectionListCards,
  syncAllCollectionListCardsDetailed,
} from './collectionListCardSync.js';
import { normalizeAsciiText } from './statusHierarchyParser.js';

function buildNovel() {
  return {
    tabsConfig: [
      {
        id: 'nhan-vat',
        label: 'Nhan vat',
        subTabs: [
          {
            id: 'nhan-vat-chinh',
            label: 'Nhan Vat Chinh',
            viewType: 'collection-track',
          },
        ],
      },
      {
        id: 'he-thong',
        label: 'He thong',
        subTabs: [
          {
            id: 'goi-qua',
            label: 'Goi Qua / Ruong',
            viewType: 'collection-track',
          },
        ],
      },
    ],
    data: {
      'nhan-vat': {
        'nhan-vat-chinh': {
          overview: '',
          entities: [
            {
              id: 'char-1',
              name: 'Lạc Nam',
              info: '',
              dynamicData: {},
              milestones: [],
            },
          ],
        },
      },
      'he-thong': {
        'goi-qua': {
          overview: '',
          entities: [
            {
              id: 'list-1',
              name: 'Danh sach goi qua',
              info: 'Ghi chu tay',
              dynamicData: {},
              milestones: [],
            },
            {
              id: 'gift-1',
              name: 'Le Bao Tan Thu',
              info: '',
              dynamicData: { f_cap: 'Huyen cap', f_chu: 'Lac Nam (37) ?' },
              milestones: [],
            },
            {
              id: 'gift-2',
              name: 'Ruong Dai Le',
              info: '',
              dynamicData: { f_cap: 'Dia cap' },
              milestones: [],
            },
          ],
        },
      },
    },
  };
}

describe('collectionListCardSync', () => {
  it('ensures each collection tab has a list card named by sub-tab label', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'he-thong',
          label: 'He thong',
          subTabs: [
            { id: 'goi-qua', label: 'Goi Qua', viewType: 'collection-track' },
          ],
        },
      ],
      data: {
        'he-thong': {
          'goi-qua': {
            overview: '',
            entities: [{ id: 'gift-1', name: 'Ruong Dai Le', info: '', dynamicData: {}, milestones: [] }],
          },
        },
      },
    };
    const changed = ensureCollectionListCardsForNovel(novel);
    expect(changed).toBe(true);
    expect(novel.data['he-thong']['goi-qua'].entities[0].name).toBe('Danh Sách Goi Qua');
  });

  it('can create missing tab buckets and list cards for a new novel', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'he-thong',
          label: 'He thong',
          subTabs: [
            { id: 'goi-qua', label: 'Goi Qua', viewType: 'collection-track' },
          ],
        },
      ],
      data: {},
    };
    const changed = ensureCollectionListCardsForNovel(novel, { createMissingTabBuckets: true });
    expect(changed).toBe(true);
    expect(Array.isArray(novel.data['he-thong']['goi-qua'].entities)).toBe(true);
    expect(novel.data['he-thong']['goi-qua'].entities[0].name).toBe('Danh Sách Goi Qua');
    expect(novel.tabsConfig[0].subTabs[0].autoSyncLevelConfig).toEqual({
      enabled: true,
      levels: {
        level_1_card: true,
        level_2_list: true,
        level_3_linked: false,
        level_4_timeline: false,
      },
    });
  });

  it('seeds default auto levels 1/2 when canonical list card exists', () => {
    const novel = buildNovel();
    novel.data['he-thong']['goi-qua'].entities[0].name = 'Danh Sách Goi Qua / Ruong';
    novel.tabsConfig[1].subTabs[0].autoSyncLevelConfig = undefined;

    const changed = syncAllCollectionListCards(novel);
    expect(changed).toBe(true);
    expect(novel.tabsConfig[1].subTabs[0].autoSyncLevelConfig).toEqual({
      enabled: true,
      levels: {
        level_1_card: true,
        level_2_list: true,
        level_3_linked: false,
        level_4_timeline: false,
      },
    });
  });

  it('writes an AUTO list block into list cards while preserving manual notes', () => {
    const novel = buildNovel();

    const changed = syncAllCollectionListCards(novel);
    const listCard = novel.data['he-thong']['goi-qua'].entities[0];

    expect(changed).toBe(true);
    expect(String(listCard.info || '')).toContain('Ghi chu tay');
    expect(String(listCard.info || '')).not.toMatch(/<!--\s*AUTO_COLLECTION_LIST/i);
    expect(String(listCard.info || '')).toContain('# Danh mục thẻ (AUTO)');
    expect(String(listCard.info || '')).toContain('- Tổng số thẻ: 2');
    expect(String(listCard.info || '')).toContain('1. [[Le Bao Tan Thu]] - [[Lạc Nam]]');
    expect(String(listCard.info || '')).toContain('1. [[Ruong Dai Le]]');
    expect(String(listCard.info || '')).toContain('## Dia cap (1)');
    expect(String(listCard.info || '')).toContain('## Huyen cap (1)');
  });

  it('refreshes the AUTO block when the underlying collection changes', () => {
    const novel = buildNovel();
    syncAllCollectionListCards(novel);

    novel.data['he-thong']['goi-qua'].entities = novel.data['he-thong']['goi-qua'].entities.filter(
      (entity) => entity.id === 'list-1'
    );

    const changed = syncAllCollectionListCards(novel);
    const listCard = novel.data['he-thong']['goi-qua'].entities[0];

    expect(changed).toBe(true);
    expect(String(listCard.info || '')).not.toContain('[[Le Bao Tan Thu]]');
    expect(String(listCard.info || '')).toContain('## Chưa phân loại (0)');
    expect(String(listCard.info || '')).toContain('Chưa có thẻ nào trong tab này.');
  });

  it('recreates canonical list card during sync if user deleted it', () => {
    const novel = buildNovel();
    novel.data['he-thong']['goi-qua'].entities = novel.data['he-thong']['goi-qua'].entities.filter(
      (entity) => !String(entity.name || '').toLowerCase().startsWith('danh sach')
    );

    const changed = syncAllCollectionListCards(novel);
    const listCard = novel.data['he-thong']['goi-qua'].entities.find((entity) => entity.name === 'Danh Sách Goi Qua / Ruong');

    expect(changed).toBe(true);
    expect(listCard).toBeTruthy();
    expect(String(listCard.info || '')).toContain('# Danh mục thẻ (AUTO)');
    expect(String(listCard.info || '')).toContain('- Tổng số thẻ: 2');
  });

  it('returns recreated tab metadata when list card is restored', () => {
    const novel = buildNovel();
    novel.data['he-thong']['goi-qua'].entities = novel.data['he-thong']['goi-qua'].entities.filter(
      (entity) => !String(entity.name || '').toLowerCase().startsWith('danh sach')
    );

    const result = syncAllCollectionListCardsDetailed(novel);

    expect(result.changed).toBe(true);
    expect(result.recreatedCount).toBeGreaterThanOrEqual(1);
    const restoredTab = result.recreatedTabs.find((tab) => tab.nhoId === 'goi-qua');
    expect(restoredTab).toMatchObject({
      lonId: 'he-thong',
      nhoId: 'goi-qua',
      nhoLabel: 'Goi Qua / Ruong',
    });
  });

  it('reads owner from detail note text when owner field is empty', () => {
    const novel = buildNovel();
    const gift = novel.data['he-thong']['goi-qua'].entities.find((entity) => entity.id === 'gift-2');
    gift.dynamicData = { f_cap: 'Dia cap' };
    gift.info = 'Ghi chú...\nLạc Nam (88) ?';

    syncAllCollectionListCards(novel);
    const listCard = novel.data['he-thong']['goi-qua'].entities[0];

    expect(String(listCard.info || '')).toContain('1. [[Ruong Dai Le]] - [[Lạc Nam]]');
  });

  it('links owner when owner field uses custom phai-style key', () => {
    const novel = buildNovel();
    const gift = novel.data['he-thong']['goi-qua'].entities.find((entity) => entity.id === 'gift-2');
    gift.dynamicData = { f_cap: 'Dia cap', f_mon_phai: 'Lac Nam' };

    syncAllCollectionListCards(novel);
    const listCard = novel.data['he-thong']['goi-qua'].entities[0];

    expect(String(listCard.info || '')).toContain('1. [[Ruong Dai Le]] - [[Lạc Nam]]');
  });

  it('migrates legacy HTML comment wrappers away on sync', () => {
    const novel = buildNovel();
    const listCard = novel.data['he-thong']['goi-qua'].entities[0];
    listCard.info =
      'Ghi chu\n\n<!-- AUTO_COLLECTION_LIST:START -->\n# Danh mục thẻ (AUTO)\n\n- Tổng số thẻ: 0\n\n## X (0)\n\n- x\n<!-- AUTO_COLLECTION_LIST:END -->';

    syncAllCollectionListCards(novel);

    expect(String(listCard.info || '')).not.toMatch(/<!--\s*AUTO_COLLECTION_LIST/i);
    expect(String(listCard.info || '')).toContain('Ghi chu');
    expect(String(listCard.info || '')).toContain('# Danh mục thẻ (AUTO)');
    expect(String(listCard.info || '')).toContain('- Tổng số thẻ: 2');
  });

  it('removes and keeps AUTO list blocks disabled when the tab is explicitly turned off', () => {
    const novel = buildNovel();
    novel.tabsConfig[1].subTabs[0].autoSyncRole = 'khong-tu-dong';
    const listCard = novel.data['he-thong']['goi-qua'].entities[0];
    listCard.info = 'Ghi chu tay\n\n# Danh mục thẻ (AUTO)\n\n- Tổng số thẻ: 2\n\n## Huyen cap (1)\n\n1. [[Le Bao Tan Thu]]';

    const changed = syncAllCollectionListCards(novel);

    expect(changed).toBe(true);
    expect(String(listCard.info || '')).toBe('Ghi chu tay');
    expect(String(listCard.info || '')).not.toContain('# Danh mục thẻ (AUTO)');
    expect(String(listCard.info || '')).not.toContain('[[Le Bao Tan Thu]]');
  });

  it('merges equivalent group labels and restarts numbering from 1 per group', () => {
    const novel = buildNovel();
    novel.data['he-thong']['goi-qua'].entities.push({
      id: 'gift-3',
      name: 'A item',
      info: '',
      dynamicData: { f_cap: 'huyen  cap' },
      milestones: [],
    });
    novel.data['he-thong']['goi-qua'].entities.push({
      id: 'gift-4',
      name: 'B item',
      info: '',
      dynamicData: { f_cap: 'Huyền Cấp' },
      milestones: [],
    });

    syncAllCollectionListCards(novel);
    const info = String(novel.data['he-thong']['goi-qua'].entities[0].info || '');
    const huyenCount = (info.match(/## .*huyen\s+cap.*\(3\)/i) || []).length;
    expect(huyenCount).toBe(1);
    expect(info).toContain('1. [[A item]]');
    expect(info).toContain('2. [[B item]]');
    expect(info).toContain('3. [[Le Bao Tan Thu]]');
  });

  it('orders tier groups by cap first, then pham', () => {
    const novel = buildNovel();
    const entities = novel.data['he-thong']['goi-qua'].entities;
    entities.push(
      { id: 'x1', name: 'A', info: '', dynamicData: { f_cap: 'Linh Cấp Thượng phẩm' }, milestones: [] },
      { id: 'x2', name: 'B', info: '', dynamicData: { f_cap: 'Địa Cấp Trung phẩm' }, milestones: [] },
      { id: 'x3', name: 'C', info: '', dynamicData: { f_cap: 'Địa Cấp Hạ phẩm' }, milestones: [] },
      { id: 'x4', name: 'D', info: '', dynamicData: { f_cap: 'Huyền Cấp Cực phẩm' }, milestones: [] },
      { id: 'x5', name: 'E', info: '', dynamicData: { f_cap: 'Thiên Cấp Cực phẩm' }, milestones: [] }
    );

    syncAllCollectionListCards(novel);
    const info = String(novel.data['he-thong']['goi-qua'].entities[0].info || '');
    const huyen = info.indexOf('## Huyền Cấp Cực phẩm (1)');
    const diaHa = info.indexOf('## Địa Cấp Hạ phẩm (1)');
    const diaTr = info.indexOf('## Địa Cấp Trung phẩm (1)');
    const thien = info.indexOf('## Thiên Cấp Cực phẩm (1)');
    const linh = info.indexOf('## Linh Cấp Thượng phẩm (1)');

    expect(huyen).toBeGreaterThan(-1);
    expect(diaHa).toBeGreaterThan(huyen);
    expect(diaTr).toBeGreaterThan(diaHa);
    expect(thien).toBeGreaterThan(diaTr);
    expect(linh).toBeGreaterThan(thien);
  });

  it('still applies cap/pham order when scope is not detected as tier', () => {
    const novel = buildNovel();
    novel.tabsConfig = [
      {
        id: 'khac',
        label: 'Mục Khác',
        subTabs: [{ id: 'tap-hop', label: 'Tap Hop', viewType: 'collection-track' }],
      },
    ];
    novel.data = {
      khac: {
        'tap-hop': {
          overview: '',
          entities: [
            { id: 'l0', name: 'Danh sach', info: '', dynamicData: {}, milestones: [] },
            { id: 'e1', name: 'A', info: '', dynamicData: { f_cap: 'Thiên Cấp Cực phẩm' }, milestones: [] },
            { id: 'e2', name: 'B', info: '', dynamicData: { f_cap: 'Địa Cấp Cực phẩm' }, milestones: [] },
            { id: 'e3', name: 'C', info: '', dynamicData: { f_cap: 'Huyền Cấp Cực phẩm' }, milestones: [] },
            { id: 'e4', name: 'D', info: '', dynamicData: { f_cap: 'Linh Cấp Cực phẩm' }, milestones: [] },
          ],
        },
      },
    };

    syncAllCollectionListCards(novel);
    const info = String(novel.data.khac['tap-hop'].entities[0].info || '');
    const huyen = info.indexOf('## Huyền Cấp Cực phẩm (1)');
    const dia = info.indexOf('## Địa Cấp Cực phẩm (1)');
    const thien = info.indexOf('## Thiên Cấp Cực phẩm (1)');
    const linh = info.indexOf('## Linh Cấp Cực phẩm (1)');
    expect(huyen).toBeGreaterThan(-1);
    expect(dia).toBeGreaterThan(huyen);
    expect(thien).toBeGreaterThan(dia);
    expect(linh).toBeGreaterThan(thien);
  });

  it('groups force list cards by leaf location and sorts advanced ranks before names', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'the-luc',
          label: 'Thế lực',
          subTabs: [{ id: 'tong-mon', label: 'Tông môn', viewType: 'collection-track' }],
        },
      ],
      data: {
        'the-luc': {
          'tong-mon': {
            overview: '',
            entities: [
              { id: 'list-1', name: 'Danh sach tong mon', info: '', dynamicData: {}, milestones: [] },
              {
                id: 'f-1',
                name: 'A Lang Điện',
                info: '',
                dynamicData: {
                  f_loai_to_chuc: 'Tông Môn',
                  f_he_cap_the_luc: 'Tiên Ma giới',
                  f_status: 'Địa Tôn cấp thế lực',
                  f_dia_ban: 'Tiên giới - Trung Tiên giới - Hoang Thú giới',
                },
                milestones: [],
              },
              {
                id: 'f-2',
                name: 'Z Bách Cung',
                info: '',
                dynamicData: {
                  f_loai_to_chuc: 'Tông Môn',
                  f_he_cap_the_luc: 'Tiên Ma giới',
                  f_status: 'Thiên Tôn cấp thế lực',
                  f_dia_ban: 'Tiên giới - Trung Tiên giới - Hoang Thú giới',
                },
                milestones: [],
              },
              {
                id: 'f-3',
                name: 'Thanh Vân Các',
                info: '',
                dynamicData: {
                  f_loai_to_chuc: 'Tông Môn',
                  f_he_cap_the_luc: 'Tiên Ma giới',
                  f_status: 'Thiên Vương cấp thế lực',
                  f_dia_ban: 'Tiên giới - Trung Tiên giới - Dạ Lang Tiên Tinh',
                },
                milestones: [],
              },
            ],
          },
        },
      },
    };

    syncAllCollectionListCards(novel);
    const info = String(novel.data['the-luc']['tong-mon'].entities[0].info || '');
    // Nhãn nhóm mới: <địa bàn parent> · <loại> · <cấp>. A Lang Điện và Z Bách Cung ở cùng «Tiên giới» parent.
    const idxZ = info.indexOf('1. [[Z Bách Cung]] - `Tông Môn`');
    const idxA = info.indexOf('1. [[A Lang Điện]] - `Tông Môn`');
    const idxThanh = info.indexOf('1. [[Thanh Vân Các]] - `Tông Môn`');
    expect(idxZ).toBeGreaterThan(-1);
    expect(idxA).toBeGreaterThan(-1);
    expect(idxThanh).toBeGreaterThan(-1);
    // Mỗi cấp bậc tách ở mục ### dưới ## địa·loại·hệ.
    expect(info).toMatch(/###[^\n]*Thiên Tôn cấp thế lực\s*\(1\)/u);
    expect(info).toMatch(/###[^\n]*Địa Tôn cấp thế lực\s*\(1\)/u);
    expect(info).toMatch(/###[^\n]*Thiên Vương cấp thế lực\s*\(1\)/u);
  });

  it('map list wiki-links territory heading, splits ranks under same địa bàn, and code-wraps org type', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'tai-nguyen',
          label: 'Tài nguyên',
          subTabs: [{ id: 'dia-danh', label: 'Bản đồ / Bí cảnh', viewType: 'collection-track' }],
        },
      ],
      data: {
        'tai-nguyen': {
          'dia-danh': {
            overview: '',
            entities: [
              { id: 'list-1', name: 'Danh Sách Bản đồ / Bí cảnh', info: '', dynamicData: {}, milestones: [] },
              {
                id: 'map-1',
                name: 'Băng Thiên Đại Lục',
                info: '',
                dynamicData: {},
                milestones: [],
              },
              {
                id: 'f-1',
                name: 'Băng Thiên Đế Quốc',
                info: '',
                dynamicData: {
                  f_loai_to_chuc: 'Đế Quốc',
                  f_status: 'Cửu Cấp thế lực',
                  f_dia_ban: 'Băng Thiên Đại Lục',
                },
                milestones: [],
              },
              {
                id: 'f-2',
                name: 'U Thiên Đế Quốc',
                info: '',
                dynamicData: {
                  f_loai_to_chuc: 'Đế Quốc',
                  f_status: 'Bát Cấp thế lực',
                  f_dia_ban: 'Băng Thiên Đại Lục',
                },
                milestones: [],
              },
            ],
          },
        },
      },
    };

    syncAllCollectionListCards(novel);
    const info = String(novel.data['tai-nguyen']['dia-danh'].entities[0].info || '');
    expect(info).toContain('- Tổng số thẻ: 2');
    expect(info).toContain('## [[Băng Thiên Đại Lục]] · Đế Quốc (2)');
    expect(info).toContain('### Bát Cấp thế lực (1)');
    expect(info).toContain('### Cửu Cấp thế lực (1)');
    expect(info).toContain('`Đế Quốc`');
    expect(info).toContain('[[Băng Thiên Đế Quốc]]');
    expect(info).toContain('[[U Thiên Đế Quốc]]');
  });

  it('AUTO xếp theo trường mục lục (I / 1 / 1.1) rồi mới theo tên trong cùng nhóm', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'he-thong',
          label: 'Hệ thống',
          subTabs: [
            {
              id: 'goi-qua',
              label: 'Gói quà',
              viewType: 'collection-track',
              autoListGroupStrategy: 'title',
            },
          ],
        },
      ],
      data: {
        'he-thong': {
          'goi-qua': {
            overview: '',
            entities: [
              { id: 'list-1', name: 'Danh Sách Gói Qua', info: '', dynamicData: {}, milestones: [] },
              {
                id: 'a',
                name: 'Zeta',
                info: '',
                dynamicData: { f_title: 'Nhóm A', f_muc_luc_danh_sach: 'II' },
                milestones: [],
              },
              {
                id: 'b',
                name: 'Alpha',
                info: '',
                dynamicData: { f_title: 'Nhóm A', f_muc_luc_danh_sach: 'I' },
                milestones: [],
              },
            ],
          },
        },
      },
    };

    syncAllCollectionListCards(novel);
    const info = String(novel.data['he-thong']['goi-qua'].entities[0].info || '');
    const alphaIdx = info.indexOf('[[Alpha]]');
    const zetaIdx = info.indexOf('[[Zeta]]');
    expect(alphaIdx).toBeGreaterThan(-1);
    expect(zetaIdx).toBeGreaterThan(-1);
    expect(alphaIdx).toBeLessThan(zetaIdx);
  });

  it('khi cùng mục lục thì ưu tiên sort theo dữ liệu field trong thẻ trước tên', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'he-thong',
          label: 'Hệ thống',
          subTabs: [
            {
              id: 'goi-qua',
              label: 'Gói quà',
              viewType: 'collection-track',
              autoListGroupStrategy: 'title',
              fieldsTemplate: [
                { id: 'f_title', label: 'Tên hiển thị' },
                { id: 'f_desc', label: 'Mô tả' },
                { id: 'f_muc_luc_danh_sach', label: 'Mục lục' },
              ],
            },
          ],
        },
      ],
      data: {
        'he-thong': {
          'goi-qua': {
            overview: '',
            entities: [
              { id: 'list-1', name: 'Danh Sách Gói Qua', info: '', dynamicData: {}, milestones: [] },
              {
                id: 'a',
                name: 'Alpha',
                info: '',
                dynamicData: { f_title: 'Zeta nhóm', f_muc_luc_danh_sach: 'I' },
                milestones: [],
              },
              {
                id: 'b',
                name: 'Zeta',
                info: '',
                dynamicData: { f_title: 'Beta nhóm', f_muc_luc_danh_sach: 'I' },
                milestones: [],
              },
            ],
          },
        },
      },
    };

    syncAllCollectionListCards(novel);
    const info = String(novel.data['he-thong']['goi-qua'].entities[0].info || '');
    const zetaIdx = info.indexOf('[[Zeta]]');
    const alphaIdx = info.indexOf('[[Alpha]]');
    expect(zetaIdx).toBeGreaterThan(-1);
    expect(alphaIdx).toBeGreaterThan(-1);
    expect(zetaIdx).toBeLessThan(alphaIdx);
  });

  it('map list: f_status dạng «Giới · Quy mô» dùng Quy mô cho ### (không rơi Chưa rõ cấp bậc)', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'tai-nguyen',
          label: 'Tài nguyên',
          subTabs: [{ id: 'dia-danh', label: 'Bản đồ / Bí cảnh', viewType: 'collection-track' }],
        },
      ],
      data: {
        'tai-nguyen': {
          'dia-danh': {
            overview: '',
            entities: [
              { id: 'list-1', name: 'Danh Sách Bản đồ / Bí cảnh', info: '', dynamicData: {}, milestones: [] },
              {
                id: 'm-1',
                name: 'Tây Châu',
                info: '',
                dynamicData: {
                  f_title: 'Nguyên Giới (đại Thế Giới)',
                  f_status: 'Nguyên Giới (đại Thế Giới) · Châu',
                  f_vi_tri: 'Việt Long Tinh',
                },
                milestones: [],
              },
            ],
          },
        },
      },
    };

    syncAllCollectionListCards(novel);
    const info = String(novel.data['tai-nguyen']['dia-danh'].entities[0].info || '');
    expect(info).toContain('### Châu (1)');
    expect(info).not.toMatch(/###\s*Chưa rõ cấp bậc/u);
  });

  it('map list: ẩn nhóm ## trùng tab hiện tại và nhóm con theo chuỗi trực thuộc', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'lon-map',
          label: 'Tài nguyên',
          subTabs: [{ id: 'dia-danh', label: 'Hạ Giới', viewType: 'collection-track' }],
        },
      ],
      data: {
        'lon-map': {
          'dia-danh': {
            overview: '',
            entities: [
              { id: 'list-1', name: 'Danh Sách Hạ Giới', info: '', dynamicData: {}, milestones: [] },
              {
                id: 'm-1',
                name: 'Băng Thiên Đại Lục',
                info: '',
                dynamicData: {
                  f_dia_ban: 'Hạ Giới',
                  f_vi_tri: 'Hạ Giới - Băng Ma Tinh',
                },
                milestones: [],
              },
              {
                id: 'm-2',
                name: 'Việt Long Thành',
                info: '',
                dynamicData: {
                  f_dia_ban: 'Hạ Giới',
                  f_vi_tri: 'Hạ Giới - Băng Ma Tinh - Băng Thiên Đại Lục',
                },
                milestones: [],
              },
            ],
          },
        },
      },
    };

    syncAllCollectionListCards(novel);
    const info = String(novel.data['lon-map']['dia-danh'].entities[0].info || '');
    expect(info).not.toContain('## Hạ Giới (');
    expect(info).toContain('## Băng Ma Tinh (2)');
    expect(info).toContain('### Băng Thiên Đại Lục (2)');
    expect(info).toContain('[[Băng Thiên Đại Lục]]');
    expect(info).toContain('[[Việt Long Thành]]');
    expect(info).not.toMatch(/^####/m);
  });

  it('sync dọn sạch info dù đã bị nhồi nhiều block AUTO chồng lên nhau', () => {
    const duplicatedBlock = [
      '# Danh mục thẻ (AUTO)',
      '',
      '- Tổng số thẻ: 1',
      '',
      '## Hạ Giới (1)',
      '',
      '1. [[Stale A]]',
      '',
      '# Danh mục thẻ (AUTO)',
      '',
      '- Tổng số thẻ: 1',
      '',
      '#### Stale B (1)',
      '',
      '1. [[Stale B]]',
    ].join('\n');
    const novel = {
      tabsConfig: [
        {
          id: 'lon-map',
          label: 'Tài nguyên',
          subTabs: [{ id: 'dia-danh', label: 'Hạ Giới', viewType: 'collection-track' }],
        },
      ],
      data: {
        'lon-map': {
          'dia-danh': {
            overview: '',
            entities: [
              { id: 'list-1', name: 'Danh Sách Hạ Giới', info: duplicatedBlock, dynamicData: {}, milestones: [] },
              {
                id: 'm-1',
                name: 'Băng Thiên Đại Lục',
                info: '',
                dynamicData: { f_vi_tri: 'Hạ Giới · Băng Ma Tinh' },
                milestones: [],
              },
            ],
          },
        },
      },
    };

    syncAllCollectionListCards(novel);
    const info = String(novel.data['lon-map']['dia-danh'].entities[0].info || '');
    const titleMatches = info.match(/^#\sDanh mục thẻ \(AUTO\)$/gm) || [];
    expect(titleMatches.length).toBe(1);
    expect(info).not.toContain('Stale A');
    expect(info).not.toContain('Stale B');
    expect(info).not.toMatch(/^####/m);
  });

  it('sync không lặp lại block AUTO khi info hiện tại còn heading #### legacy', () => {
    const legacyBlock = [
      '# Danh mục thẻ (AUTO)',
      '',
      '- Tổng số thẻ: 1',
      '',
      '## Cũ (1)',
      '',
      '#### Cũ phụ (1)',
      '',
      '1. [[Legacy Entity]]',
    ].join('\n');
    const novel = {
      tabsConfig: [
        {
          id: 'lon-map',
          label: 'Tài nguyên',
          subTabs: [{ id: 'dia-danh', label: 'Hạ Giới', viewType: 'collection-track' }],
        },
      ],
      data: {
        'lon-map': {
          'dia-danh': {
            overview: '',
            entities: [
              { id: 'list-1', name: 'Danh Sách Hạ Giới', info: legacyBlock, dynamicData: {}, milestones: [] },
              {
                id: 'm-1',
                name: 'Băng Thiên Đại Lục',
                info: '',
                dynamicData: { f_vi_tri: 'Hạ Giới · Băng Ma Tinh' },
                milestones: [],
              },
            ],
          },
        },
      },
    };

    syncAllCollectionListCards(novel);
    const info = String(novel.data['lon-map']['dia-danh'].entities[0].info || '');
    const titleMatches = info.match(/^#\sDanh mục thẻ \(AUTO\)$/gm) || [];
    expect(titleMatches.length).toBe(1);
    expect(info).not.toContain('## Cũ');
    expect(info).not.toContain('Cũ phụ');
    expect(info).not.toContain('Legacy Entity');
    expect(info).not.toMatch(/^####/m);
  });

  it('map list: dấu ·/- đều tách được chuỗi trực thuộc, tinh cầu ngang hàng làm nhóm riêng', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'lon-map',
          label: 'Tài nguyên',
          subTabs: [{ id: 'dia-danh', label: 'Hạ Giới', viewType: 'collection-track' }],
        },
      ],
      data: {
        'lon-map': {
          'dia-danh': {
            overview: '',
            entities: [
              { id: 'list-1', name: 'Danh Sách Hạ Giới', info: '', dynamicData: {}, milestones: [] },
              {
                id: 'm-1',
                name: 'Băng Thiên Đại Lục',
                info: '',
                dynamicData: { f_vi_tri: 'Hạ Giới · Băng Ma Tinh' },
                milestones: [],
              },
              {
                id: 'm-2',
                name: 'U Minh Thành',
                info: '',
                dynamicData: { f_vi_tri: 'Hạ Giới · Băng Ma Tinh · Băng Thiên Đại Lục' },
                milestones: [],
              },
              {
                id: 'm-3',
                name: 'Việt Long Tinh',
                info: '',
                dynamicData: { f_vi_tri: 'Hạ Giới' },
                milestones: [],
              },
            ],
          },
        },
      },
    };

    syncAllCollectionListCards(novel);
    const info = String(novel.data['lon-map']['dia-danh'].entities[0].info || '');
    expect(info).not.toContain('## Hạ Giới (');
    expect(info).toContain('## Băng Ma Tinh (2)');
    expect(info).toMatch(/^##\s+\[\[Việt Long Tinh\]\]\s*\(1\)/m);
    expect(info).toContain('### Băng Thiên Đại Lục (2)');
    expect(info).toContain('[[U Minh Thành]]');
    expect(info).not.toMatch(/^####/m);
  });

  it('map list: khi lẫn primary con + primary trùng scope, sẽ dồn về nhóm con thay vì tách thêm ## scope', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'lon-map',
          label: 'Tài nguyên',
          subTabs: [{ id: 'dia-danh', label: 'Hạ Giới', viewType: 'collection-track' }],
        },
      ],
      data: {
        'lon-map': {
          'dia-danh': {
            overview: '',
            entities: [
              { id: 'list-1', name: 'Danh Sách Hạ Giới', info: '', dynamicData: {}, milestones: [] },
              {
                id: 'm-1',
                name: 'Băng Thiên Đại Lục',
                info: '',
                dynamicData: {
                  f_dia_ban: 'Băng Ma Tinh',
                  f_vi_tri: 'Hạ Giới - Băng Ma Tinh',
                },
                milestones: [],
              },
              {
                id: 'm-2',
                name: 'Việt Long Tinh',
                info: '',
                dynamicData: {
                  f_dia_ban: 'Hạ Giới',
                  f_vi_tri: 'Hạ Giới - Băng Ma Tinh',
                },
                milestones: [],
              },
            ],
          },
        },
      },
    };

    syncAllCollectionListCards(novel);
    const info = String(novel.data['lon-map']['dia-danh'].entities[0].info || '');
    expect(info).not.toContain('## Hạ Giới (');
    expect(info).toContain('## Băng Ma Tinh (2)');
    expect(info).toMatch(/1\.\s+\[\[Băng Thiên Đại Lục\]\]/);
    expect(info).toMatch(/2\.\s+\[\[Việt Long Tinh\]\]/);
    expect(info).not.toMatch(/^####/m);
  });

  it('map list: trong tab Hạ Giới, dòng item không lặp lại hậu tố `Hạ Giới`', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'lon-map',
          label: 'Tài nguyên',
          subTabs: [{ id: 'dia-danh', label: 'Hạ Giới', viewType: 'collection-track' }],
        },
      ],
      data: {
        'lon-map': {
          'dia-danh': {
            overview: '',
            entities: [
              { id: 'list-1', name: 'Danh Sách Hạ Giới', info: '', dynamicData: {}, milestones: [] },
              {
                id: 'm-1',
                name: 'Băng Thiên Đại Lục',
                info: '',
                dynamicData: {
                  f_status: 'Hạ Giới',
                  f_vi_tri: 'Hạ Giới - Băng Ma Tinh',
                },
                milestones: [],
              },
            ],
          },
        },
      },
    };

    syncAllCollectionListCards(novel);
    const info = String(novel.data['lon-map']['dia-danh'].entities[0].info || '');
    expect(info).toContain('## Băng Ma Tinh (1)');
    expect(info).toMatch(/1\.\s+\[\[Băng Thiên Đại Lục\]\]/);
    expect(info).not.toContain('[[Băng Thiên Đại Lục]] - `Hạ Giới`');
  });

  it('map tab detected from id dia-danh even when label has no “bản đồ”; no false owner from f_loai_to_chuc', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'tai-nguyen',
          label: 'Tài nguyên',
          subTabs: [{ id: 'dia-danh', label: 'Maps', viewType: 'collection-track' }],
        },
      ],
      data: {
        'tai-nguyen': {
          'dia-danh': {
            overview: '',
            entities: [
              { id: 'list-1', name: 'Danh Sách Maps', info: '', dynamicData: {}, milestones: [] },
              {
                id: 'f-1',
                name: 'Băng Thiên Đế Quốc',
                info: '',
                dynamicData: {
                  f_loai_to_chuc: 'Đế Quốc',
                  f_status: 'Cửu Cấp thế lực',
                  f_dia_ban: 'Băng Thiên Đại Lục',
                },
                milestones: [],
              },
              {
                id: 'f-2',
                name: 'U Thiên Đế Quốc',
                info: '',
                dynamicData: {
                  f_loai_to_chuc: 'Đế Quốc',
                  f_status: 'Bát Cấp thế lực',
                  f_dia_ban: 'Băng Thiên Đại Lục',
                },
                milestones: [],
              },
            ],
          },
        },
      },
    };

    syncAllCollectionListCards(novel);
    const info = String(novel.data['tai-nguyen']['dia-danh'].entities[0].info || '');
    expect(info).toContain('## Băng Thiên Đại Lục · Đế Quốc (2)');
    expect(info).toContain('### Bát Cấp thế lực (1)');
    expect(info).toContain('### Cửu Cấp thế lực (1)');
    expect(info).toContain('`Đế Quốc`');
    expect(info).not.toContain('[[Đế Quốc]]');
  });

  it('map list still splits by rank when autoListGroupFieldOrder is only f_dia_ban', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'tai-nguyen',
          label: 'Tài nguyên',
          subTabs: [
            {
              id: 'dia-danh',
              label: 'Bản đồ / Bí cảnh',
              viewType: 'collection-track',
              autoListGroupFieldOrder: ['f_dia_ban'],
            },
          ],
        },
      ],
      data: {
        'tai-nguyen': {
          'dia-danh': {
            overview: '',
            entities: [
              { id: 'list-1', name: 'Danh Sách Bản đồ / Bí cảnh', info: '', dynamicData: {}, milestones: [] },
              {
                id: 'f-1',
                name: 'Băng Thiên Đế Quốc',
                info: '',
                dynamicData: {
                  f_loai_to_chuc: 'Đế Quốc',
                  f_status: 'Cửu Cấp thế lực',
                  f_dia_ban: 'Băng Thiên Đại Lục',
                },
                milestones: [],
              },
              {
                id: 'f-2',
                name: 'U Thiên Đế Quốc',
                info: '',
                dynamicData: {
                  f_loai_to_chuc: 'Đế Quốc',
                  f_status: 'Bát Cấp thế lực',
                  f_dia_ban: 'Băng Thiên Đại Lục',
                },
                milestones: [],
              },
            ],
          },
        },
      },
    };

    syncAllCollectionListCards(novel);
    const info = String(novel.data['tai-nguyen']['dia-danh'].entities[0].info || '');
    expect(info).toContain('## Băng Thiên Đại Lục · Đế Quốc (2)');
    expect(info).toContain('### Bát Cấp thế lực (1)');
    expect(info).toContain('### Cửu Cấp thế lực (1)');
  });

  it('tab Chủng Tộc (slug chung-toc) dùng cùng logic ## địa·loại·hệ + ### cấp như Đế quốc', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'custom-lon',
          label: 'Lon tùy chỉnh',
          subTabs: [{ id: 'chung-toc', label: 'Chủng Tộc', viewType: 'collection-track' }],
        },
      ],
      data: {
        'custom-lon': {
          'chung-toc': {
            overview: '',
            entities: [
              { id: 'list-1', name: 'Danh sách Chủng Tộc', info: '', dynamicData: {}, milestones: [] },
              {
                id: 'e1',
                name: 'Zeta Tộc',
                info: '',
                dynamicData: {
                  f_loai_to_chuc: 'Chủng Tộc',
                  f_dia_ban: 'Băng Thiên Đại Lục',
                  f_status: 'Bát Cấp thế lực',
                },
                milestones: [],
              },
              {
                id: 'e2',
                name: 'Alpha Tộc',
                info: '',
                dynamicData: {
                  f_loai_to_chuc: 'Chủng Tộc',
                  f_dia_ban: 'Băng Thiên Đại Lục',
                  f_status: 'Cửu Cấp thế lực',
                },
                milestones: [],
              },
            ],
          },
        },
      },
    };

    syncAllCollectionListCards(novel);
    const info = String(novel.data['custom-lon']['chung-toc'].entities[0].info || '');
    expect(info).toContain('## Băng Thiên Đại Lục · Chủng Tộc (2)');
    expect(info).toContain('### Bát Cấp thế lực (1)');
    expect(info).toContain('### Cửu Cấp thế lực (1)');
    const iAlpha = info.indexOf('[[Alpha Tộc]]');
    const iZeta = info.indexOf('[[Zeta Tộc]]');
    expect(iAlpha).toBeGreaterThan(-1);
    expect(iZeta).toBeGreaterThan(-1);
    expect(iAlpha).toBeLessThan(iZeta);
  });

  it('map list: cấp chỉ nằm trong f_title (không có f_status) — vẫn tách nhóm cửu/bát và hiển thị trong dòng', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'tai-nguyen',
          label: 'Tài nguyên',
          subTabs: [{ id: 'dia-danh', label: 'Bản đồ / Bí cảnh', viewType: 'collection-track' }],
        },
      ],
      data: {
        'tai-nguyen': {
          'dia-danh': {
            overview: '',
            entities: [
              { id: 'list-1', name: 'Danh Sách Bản đồ / Bí cảnh', info: '', dynamicData: {}, milestones: [] },
              {
                id: 'f-1',
                name: 'Băng Thiên Đế Quốc',
                info: '',
                dynamicData: {
                  f_loai_to_chuc: 'Đế Quốc',
                  f_title: 'Cửu Cấp thế lực',
                  f_dia_ban: 'Băng Thiên Đại Lục',
                },
                milestones: [],
              },
              {
                id: 'f-2',
                name: 'U Thiên Đế Quốc',
                info: '',
                dynamicData: {
                  f_loai_to_chuc: 'Đế Quốc',
                  f_title: 'Bát Cấp thế lực',
                  f_dia_ban: 'Băng Thiên Đại Lục',
                },
                milestones: [],
              },
            ],
          },
        },
      },
    };

    syncAllCollectionListCards(novel);
    const info = String(novel.data['tai-nguyen']['dia-danh'].entities[0].info || '');
    expect(info).toContain('## Băng Thiên Đại Lục · Đế Quốc (2)');
    expect(info).toContain('### Bát Cấp thế lực (1)');
    expect(info).toContain('### Cửu Cấp thế lực (1)');
    expect(info).toContain('`Cửu Cấp thế lực`');
    expect(info).toContain('`Bát Cấp thế lực`');
  });

  it('AUTO map: không nhầm f_title (chuỗi cấp) với loại hình; nhóm không thu gọn thành chỉ «Bát Cấp…»', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'tai-nguyen',
          label: 'Tài nguyên',
          subTabs: [{ id: 'dia-danh', label: 'Bản đồ / Bí cảnh', viewType: 'collection-track' }],
        },
      ],
      data: {
        'tai-nguyen': {
          'dia-danh': {
            overview: '',
            entities: [
              { id: 'list-1', name: 'Danh Sách Bản đồ / Bí cảnh', info: '', dynamicData: {}, milestones: [] },
              {
                id: 'f-bang',
                name: 'Băng Thiên Đế Quốc',
                info: '',
                dynamicData: {
                  f_title: 'Cửu Cấp thế lực',
                  f_status: 'Cửu Cấp thế lực',
                  f_dia_ban: 'Băng Thiên Đại Lục',
                },
                milestones: [],
              },
              {
                id: 'f-u-nguyen',
                name: 'U Nguyên Đế Quốc',
                info: '',
                dynamicData: {
                  f_title: 'Cửu Cấp thế lực',
                  f_status: 'Cửu Cấp thế lực',
                  f_dia_ban: 'U Nguyên Đại Lục',
                },
                milestones: [],
              },
              {
                id: 'f-u-thien',
                name: 'U Thiên Đế Quốc',
                info: '',
                dynamicData: {
                  f_title: 'Bát Cấp thế lực',
                  f_status: 'Bát Cấp thế lực',
                  f_dia_ban: 'U Nguyên Đại Lục',
                },
                milestones: [],
              },
            ],
          },
        },
      },
    };

    syncAllCollectionListCards(novel);
    const info = String(novel.data['tai-nguyen']['dia-danh'].entities[0].info || '');
    expect(info).toContain('`Đế Quốc`');
    expect(info.split('\n').some((line) => /^\s*##\s+Bát Cấp thế lực\s*\(\d+\)\s*$/.test(line))).toBe(false);
    expect(info).toContain('Băng Thiên Đại Lục · Đế Quốc');
    expect(info).toContain('U Nguyên Đại Lục · Đế Quốc');
  });

  it('AUTO đế quốc: cùng địa chỉ + loại — sort theo hệ cấp bậc (f_he_cap_the_luc) rồi tên', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'tai-nguyen',
          label: 'Tài nguyên',
          subTabs: [{ id: 'de-quoc', label: 'Đế Quốc', viewType: 'collection-track' }],
        },
      ],
      data: {
        'tai-nguyen': {
          'de-quoc': {
            overview: '',
            entities: [
              { id: 'list-1', name: 'Danh sách Đế Quốc', info: '', dynamicData: {}, milestones: [] },
              {
                id: 'z',
                name: 'Zeta Đế Quốc',
                info: '',
                dynamicData: {
                  f_loai_to_chuc: 'Đế Quốc',
                  f_dia_ban: 'Băng Thiên Đại Lục',
                  f_he_cap_the_luc: 'Tiên Ma giới',
                  f_status: 'Cửu Cấp thế lực',
                },
                milestones: [],
              },
              {
                id: 'a',
                name: 'Alpha Đế Quốc',
                info: '',
                dynamicData: {
                  f_loai_to_chuc: 'Đế Quốc',
                  f_dia_ban: 'Băng Thiên Đại Lục',
                  f_he_cap_the_luc: 'Hạ giới',
                  f_status: 'Cửu Cấp thế lực',
                },
                milestones: [],
              },
            ],
          },
        },
      },
    };

    syncAllCollectionListCards(novel);
    const info = String(novel.data['tai-nguyen']['de-quoc'].entities[0].info || '');
    const iAlpha = info.indexOf('[[Alpha Đế Quốc]]');
    const iZeta = info.indexOf('[[Zeta Đế Quốc]]');
    expect(iAlpha).toBeGreaterThan(-1);
    expect(iZeta).toBeGreaterThan(-1);
    expect(iAlpha).toBeLessThan(iZeta);
  });

  it('tab Đế Quốc dưới lon Tài nguyên không dùng tier (chỉ cấp) — có loại hình trong tiêu đề nhóm', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'tai-nguyen',
          label: 'Tài nguyên',
          subTabs: [{ id: 'de-quoc', label: 'Đế Quốc', viewType: 'collection-track' }],
        },
      ],
      data: {
        'tai-nguyen': {
          'de-quoc': {
            overview: '',
            entities: [
              { id: 'list-1', name: 'Danh sách Đế Quốc', info: '', dynamicData: {}, milestones: [] },
              {
                id: 'f-1',
                name: 'Băng Thiên Đế Quốc',
                info: '',
                dynamicData: { f_title: 'Đế Quốc', f_status: 'Cửu Cấp thế lực' },
                milestones: [],
              },
              {
                id: 'f-2',
                name: 'U Thiên Đế Quốc',
                info: '',
                dynamicData: { f_title: 'Đế Quốc', f_status: 'Bát Cấp thế lực' },
                milestones: [],
              },
            ],
          },
        },
      },
    };

    syncAllCollectionListCards(novel);
    const info = String(novel.data['tai-nguyen']['de-quoc'].entities[0].info || '');
    expect(info.split('\n').some((line) => /^\s*##\s+Cửu Cấp thế lực\s*\(\d+\)\s*$/.test(line))).toBe(false);
    expect(info.split('\n').some((line) => /^\s*##\s+Bát Cấp thế lực\s*\(\d+\)\s*$/.test(line))).toBe(false);
    expect(info).toContain('## Đế Quốc (2)');
    expect(info).toContain('### Cửu Cấp thế lực (1)');
    expect(info).toContain('### Bát Cấp thế lực (1)');
  });

  it('supports explicit list grouping strategy override per tab', () => {
    const novel = buildNovel();
    novel.tabsConfig[1].subTabs[0].autoListGroupStrategy = 'owner';
    novel.data['he-thong']['goi-qua'].entities[2].dynamicData = {
      ...novel.data['he-thong']['goi-qua'].entities[2].dynamicData,
      f_chu: 'Vân Y (12) ?',
    };
    syncAllCollectionListCards(novel);
    const info = String(novel.data['he-thong']['goi-qua'].entities[0].info || '');
    expect(info).toContain('## Lac Nam (37) ? (1)');
    expect(info).toContain('## Vân Y (12) ? (1)');
  });

  it('orders title groups by fieldSuggestionLists when strategy is title', () => {
    const novel = buildNovel();
    novel.tabsConfig[1].subTabs[0].autoListGroupStrategy = 'title';
    novel.tabsConfig[1].subTabs[0].fieldSuggestionLists = {
      f_title: ['Loại Z', 'Loại A', 'Loại M'],
    };
    novel.data['he-thong']['goi-qua'].entities = [
      {
        id: 'list-1',
        name: 'Danh sach goi qua',
        info: 'Ghi chu tay',
        dynamicData: {},
        milestones: [],
      },
      { id: 'g-a', name: 'Item A', info: '', dynamicData: { f_title: 'Loại A' }, milestones: [] },
      { id: 'g-z', name: 'Item Z', info: '', dynamicData: { f_title: 'Loại Z' }, milestones: [] },
      { id: 'g-m', name: 'Item M', info: '', dynamicData: { f_title: 'Loại M' }, milestones: [] },
    ];

    syncAllCollectionListCards(novel);
    const info = normalizeAsciiText(String(novel.data['he-thong']['goi-qua'].entities[0].info || ''));
    const iZ = info.indexOf('## loai z');
    const iA = info.indexOf('## loai a');
    const iM = info.indexOf('## loai m');
    expect(iZ).toBeGreaterThan(-1);
    expect(iA).toBeGreaterThan(iZ);
    expect(iM).toBeGreaterThan(iA);
  });

  it('supports custom rank order from field suggestion lists', () => {
    const novel = buildNovel();
    novel.tabsConfig[1].subTabs[0].autoListGroupStrategy = 'rank';
    novel.tabsConfig[1].subTabs[0].fieldSuggestionLists = {
      f_cap: ['Thần Cấp', 'Thiên Cấp', 'Địa Cấp', 'Huyền Cấp'],
    };
    novel.data['he-thong']['goi-qua'].entities.push(
      { id: 'r1', name: 'Item Than', info: '', dynamicData: { f_cap: 'Thần Cấp' }, milestones: [] },
      { id: 'r2', name: 'Item Thien', info: '', dynamicData: { f_cap: 'Thiên Cấp' }, milestones: [] },
      { id: 'r3', name: 'Item Dia', info: '', dynamicData: { f_cap: 'Địa Cấp' }, milestones: [] },
      { id: 'r4', name: 'Item Huyen', info: '', dynamicData: { f_cap: 'Huyền Cấp' }, milestones: [] }
    );

    syncAllCollectionListCards(novel);
    const info = normalizeAsciiText(String(novel.data['he-thong']['goi-qua'].entities[0].info || ''));
    const iThan = info.indexOf('## than cap');
    const iThien = info.indexOf('## thien cap');
    const iDia = info.indexOf('## dia cap');
    const iHuyen = info.indexOf('## huyen cap');

    expect(iThan).toBeGreaterThan(-1);
    expect(iThien).toBeGreaterThan(iThan);
    expect(iDia).toBeGreaterThan(iThien);
    expect(iHuyen).toBeGreaterThan(iDia);
  });

  it('uses listMergeOrder on fieldsTemplate to merge lists like explicit autoListGroupFieldOrder', () => {
    const novel = buildNovel();
    novel.tabsConfig[1].subTabs[0].autoListGroupStrategy = 'text';
    novel.tabsConfig[1].subTabs[0].fieldsTemplate = [
      { id: 'f_status', label: 'S', listMergeOrder: 1 },
      { id: 'f_title', label: 'T', listMergeOrder: 2 },
      { id: 'f_alias', label: 'Wiki' },
    ];
    novel.tabsConfig[1].subTabs[0].fieldSuggestionLists = {
      f_status: ['S2', 'S1'],
      f_title: ['T1'],
    };
    novel.data['he-thong']['goi-qua'].entities = [
      { id: 'list-1', name: 'Danh sach goi qua', info: '', dynamicData: {}, milestones: [] },
      { id: 'a', name: 'Item A', info: '', dynamicData: { f_status: 'S1' }, milestones: [] },
      { id: 'b', name: 'Item B', info: '', dynamicData: { f_status: 'S2' }, milestones: [] },
      { id: 'c', name: 'Item C', info: '', dynamicData: { f_title: 'T1' }, milestones: [] },
    ];

    syncAllCollectionListCards(novel);
    const info = normalizeAsciiText(String(novel.data['he-thong']['goi-qua'].entities[0].info || ''));
    const iS2 = info.indexOf('## s2');
    const iS1 = info.indexOf('## s1');
    const iT1 = info.indexOf('## t1');
    expect(iS2).toBeGreaterThan(-1);
    expect(iS1).toBeGreaterThan(iS2);
    expect(iT1).toBeGreaterThan(iS1);
  });

  it('uses autoListGroupFieldOrder to merge suggestion lists and pick group label', () => {
    const novel = buildNovel();
    novel.tabsConfig[1].subTabs[0].autoListGroupStrategy = 'text';
    novel.tabsConfig[1].subTabs[0].autoListGroupFieldOrder = ['f_status', 'f_title'];
    novel.tabsConfig[1].subTabs[0].fieldSuggestionLists = {
      f_status: ['S2', 'S1'],
      f_title: ['T1'],
    };
    novel.data['he-thong']['goi-qua'].entities = [
      { id: 'list-1', name: 'Danh sach goi qua', info: '', dynamicData: {}, milestones: [] },
      { id: 'a', name: 'Item A', info: '', dynamicData: { f_status: 'S1' }, milestones: [] },
      { id: 'b', name: 'Item B', info: '', dynamicData: { f_status: 'S2' }, milestones: [] },
      { id: 'c', name: 'Item C', info: '', dynamicData: { f_title: 'T1' }, milestones: [] },
    ];

    syncAllCollectionListCards(novel);
    const info = normalizeAsciiText(String(novel.data['he-thong']['goi-qua'].entities[0].info || ''));
    const iS2 = info.indexOf('## s2');
    const iS1 = info.indexOf('## s1');
    const iT1 = info.indexOf('## t1');
    expect(iS2).toBeGreaterThan(-1);
    expect(iS1).toBeGreaterThan(iS2);
    expect(iT1).toBeGreaterThan(iS1);
  });

  it('supports custom AUTO group order from tab config list', () => {
    const novel = buildNovel();
    novel.tabsConfig[1].subTabs[0].autoListGroupStrategy = 'owner';
    novel.tabsConfig[1].subTabs[0].autoListGroupOrder = ['Vân Y (12) ?', 'Lạc Nam (37) ?'];
    novel.data['he-thong']['goi-qua'].entities[2].dynamicData = {
      ...novel.data['he-thong']['goi-qua'].entities[2].dynamicData,
      f_chu: 'Vân Y (12) ?',
    };

    syncAllCollectionListCards(novel);
    const info = normalizeAsciiText(String(novel.data['he-thong']['goi-qua'].entities[0].info || ''));
    const idxVanY = info.indexOf('## van y (12) ? (1)');
    const idxLacNam = info.indexOf('## lac nam (37) ? (1)');

    expect(idxVanY).toBeGreaterThan(-1);
    expect(idxLacNam).toBeGreaterThan(idxVanY);
  });

  it('force_loai strategy groups by f_loai_to_chuc (đồng bộ ô Loại hình Thế lực)', () => {
    const novel = buildNovel();
    novel.tabsConfig.push({
      id: 'tai-nguyen',
      label: 'Tai nguyen',
      subTabs: [
        {
          id: 'de-quoc',
          label: 'De quoc The luc',
          viewType: 'collection-track',
          autoListGroupStrategy: 'force_loai',
        },
      ],
    });
    novel.data['tai-nguyen'] = {
      'de-quoc': {
        overview: '',
        entities: [
          { id: 'list-dq', name: 'Danh sach de quoc', info: '', dynamicData: {}, milestones: [] },
          { id: 'e1', name: 'Mot', info: '', dynamicData: { f_loai_to_chuc: 'Tông Môn' }, milestones: [] },
          { id: 'e2', name: 'Hai', info: '', dynamicData: { f_loai_to_chuc: 'Đế Quốc' }, milestones: [] },
        ],
      },
    };
    syncAllCollectionListCards(novel);
    const info = normalizeAsciiText(String(novel.data['tai-nguyen']['de-quoc'].entities[0].info || ''));
    expect(info).toContain('tong mon');
    expect(info).toContain('de quoc');
  });
});
*/
