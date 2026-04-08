import { describe, expect, it } from 'vitest';
import { syncAllCollectionListCards } from './collectionListCardSync.js';

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
});
