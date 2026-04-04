import { describe, expect, it } from 'vitest';
import {
  isMainCharacterRelationScope,
  syncAllMainCharacterRelationBlocks,
} from './mainCharacterRelationSync.js';

function createNovel() {
  return {
    tabsConfig: [
      {
        id: 'nhan-vat',
        label: 'Nhan Vat',
        subTabs: [
          { id: 'nhan-vat-chinh', label: 'Nhan Vat Chinh', viewType: 'collection-track' },
          { id: 'dao-lu', label: 'Dao Lu', viewType: 'collection-track' },
          { id: 'than-nhan', label: 'Than Nhan', viewType: 'collection-track' },
          { id: 'huynh-de', label: 'Huynh De', viewType: 'collection-track' },
        ],
      },
    ],
    data: {
      'nhan-vat': {
        'nhan-vat-chinh': {
          overview: '',
          entities: [{ id: 'nvc-1', name: 'Lac Nam', info: 'Ghi chu tay nvc', dynamicData: {} }],
        },
        'dao-lu': {
          overview: '',
          entities: [
            {
              id: 'dl-1',
              name: 'Van Nhi',
              info: 'Ghi chu tay dao lu',
              dynamicData: { f_quan_he: 'Dao lu' },
            },
          ],
        },
        'than-nhan': {
          overview: '',
          entities: [{ id: 'tn-1', name: 'Lac Thien', info: '', dynamicData: {} }],
        },
        'huynh-de': {
          overview: '',
          entities: [{ id: 'hd-1', name: 'Thach Dau', info: '', dynamicData: {} }],
        },
      },
    },
  };
}

describe('mainCharacterRelationSync', () => {
  it('syncs main character with related tabs and preserves manual notes', () => {
    const novel = createNovel();

    const ok = syncAllMainCharacterRelationBlocks(novel);
    expect(ok).toBe(true);

    const main = novel.data['nhan-vat']['nhan-vat-chinh'].entities[0];
    const daoLu = novel.data['nhan-vat']['dao-lu'].entities[0];
    const thanNhan = novel.data['nhan-vat']['than-nhan'].entities[0];
    const huynhDe = novel.data['nhan-vat']['huynh-de'].entities[0];

    expect(main.info).toContain('Ghi chu tay nvc');
    expect(main.info).toContain('Nhân Vật Liên Quan (AUTO)');
    expect(main.info).toContain('[[Van Nhi]]');
    expect(main.info).toContain('Dao lu');
    expect(main.info).toContain('[[Lac Thien]]');
    expect(main.info).toContain('[[Thach Dau]]');
    expect(daoLu.info).toContain('Ghi chu tay dao lu');
    expect(daoLu.info).toContain('Nhân Vật Chính Liên Kết (AUTO)');
    expect(daoLu.info).toContain('[[Lac Nam]]');
    expect(daoLu.info).toContain('Quan hệ: Dao lu');
    expect(thanNhan.info).toContain('[[Lac Nam]]');
    expect(thanNhan.info).toContain('Quan hệ: Thân nhân');
    expect(huynhDe.info).toContain('[[Lac Nam]]');
    expect(huynhDe.info).toContain('Quan hệ: Huynh đệ');
    expect((main.info.match(/\(AUTO\)/g) || []).length).toBe(1);
    expect((daoLu.info.match(/\(AUTO\)/g) || []).length).toBe(1);
  });

  it('removes stale AUTO blocks when main character card is missing', () => {
    const novel = createNovel();
    expect(syncAllMainCharacterRelationBlocks(novel)).toBe(true);

    novel.data['nhan-vat']['nhan-vat-chinh'].entities = [];
    const ok = syncAllMainCharacterRelationBlocks(novel);
    expect(ok).toBe(true);

    const daoLu = novel.data['nhan-vat']['dao-lu'].entities[0];
    expect(daoLu.info).toContain('Ghi chu tay dao lu');
    expect(daoLu.info).not.toContain('Nhân Vật Chính Liên Kết (AUTO)');
    expect(daoLu.info).not.toContain('[[Lac Nam]]');
  });

  it('recognizes relation scope for nhan-vat tabs and custom labels', () => {
    expect(
      isMainCharacterRelationScope({
        activeTabLon: 'nhan-vat',
        activeTabNho: 'dao-lu',
        currentTabConfig: { id: 'dao-lu', label: 'Dao Lu', _parentLabel: 'Nhan Vat' },
      })
    ).toBe(true);

    expect(
      isMainCharacterRelationScope({
        activeTabLon: 'other',
        activeTabNho: 'than-nhan',
        currentTabConfig: { id: 'than-nhan', label: 'Than Nhan', _parentLabel: 'Nhan Vat' },
      })
    ).toBe(true);

    expect(
      isMainCharacterRelationScope({
        activeTabLon: 'the-luc',
        activeTabNho: 'gia-toc',
        currentTabConfig: { id: 'gia-toc', label: 'Gia Toc', _parentLabel: 'The Luc' },
      })
    ).toBe(false);
  });
});
