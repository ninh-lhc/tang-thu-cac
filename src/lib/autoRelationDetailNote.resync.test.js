import { describe, expect, it } from 'vitest';
import { syncAllAutoRelationNotesForNovel } from './autoRelationDetailNote.js';

function createNovel() {
  return {
    tabsConfig: [
      {
        id: 'tai-nguyen',
        label: 'Tai Nguyen',
        subTabs: [{ id: 'dia-danh', label: 'Ban do', viewType: 'collection-track' }],
      },
      {
        id: 'the-luc',
        label: 'The Luc',
        subTabs: [{ id: 'gia-toc', label: 'Gia Toc', viewType: 'collection-track' }],
      },
    ],
    data: {
      'tai-nguyen': {
        'dia-danh': {
          entities: [{ id: 'map-1', name: 'Man Hoang Dai Luc', info: '', dynamicData: {} }],
        },
      },
      'the-luc': {
        'gia-toc': {
          entities: [
            {
              id: 'force-1',
              name: 'Lac Gia',
              info: '',
              dynamicData: {
                f_status: 'Gia Toc - Bat Cap The Luc - Man Hoang Dai Luc - Viet Long Tinh Cau',
              },
            },
          ],
        },
      },
    },
  };
}

describe('syncAllAutoRelationNotesForNovel', () => {
  it('removes stale backlinks after a force entity is deleted', () => {
    const novel = createNovel();

    expect(syncAllAutoRelationNotesForNovel(novel)).toBe(true);
    expect(novel.data['tai-nguyen']['dia-danh'].entities[0].info).toContain('[[Lac Gia]]');

    novel.data['the-luc']['gia-toc'].entities = [];
    expect(syncAllAutoRelationNotesForNovel(novel)).toBe(true);
    expect(novel.data['tai-nguyen']['dia-danh'].entities[0].info).not.toContain('[[Lac Gia]]');
  });
});
