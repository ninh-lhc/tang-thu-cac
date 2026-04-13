import { describe, expect, it } from 'vitest';
import { syncAllAutoRelationNotesForNovel } from './autoRelationDetailNote.js';
import { AUTO_SYNC_ENGINE_RELATION_NOTES } from './autoSyncEntityPrefs.js';

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

  it('keeps locked backlink blocks untouched when relation sync runs again', () => {
    const novel = createNovel();

    expect(syncAllAutoRelationNotesForNovel(novel)).toBe(true);
    const target = novel.data['tai-nguyen']['dia-danh'].entities[0];
    const lockedSnapshot = String(target.info || '');
    target.autoSyncPrefs = { lockedEngines: [AUTO_SYNC_ENGINE_RELATION_NOTES] };
    novel.data['the-luc']['gia-toc'].entities.push({
      id: 'force-2',
      name: 'Huyet Linh Tong',
      info: '',
      dynamicData: {
        f_status: 'Tong Mon - Cuu Cap The Luc - Man Hoang Dai Luc - Viet Long Tinh Cau',
      },
    });

    expect(syncAllAutoRelationNotesForNovel(novel)).toBe(true);
    expect(String(target.info || '')).toBe(lockedSnapshot);
  });
});
