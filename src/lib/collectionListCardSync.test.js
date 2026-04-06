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
    expect(String(listCard.info || '')).toContain('AUTO_COLLECTION_LIST');
    expect(String(listCard.info || '')).toContain('# Danh mục thẻ (AUTO)');
    expect(String(listCard.info || '')).toContain('- Tổng số thẻ: 2');
    expect(String(listCard.info || '')).toContain('[[Le Bao Tan Thu]]');
    expect(String(listCard.info || '')).toContain('[[Le Bao Tan Thu]] - Lạc Nam');
    expect(String(listCard.info || '')).toContain('[[Ruong Dai Le]]');
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

    expect(String(listCard.info || '')).toContain('[[Ruong Dai Le]] - Lạc Nam');
  });
});
