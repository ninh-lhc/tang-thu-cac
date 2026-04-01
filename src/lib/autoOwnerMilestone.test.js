import { describe, expect, it } from 'vitest';
import {
  appendOwnerAcquisitionMilestone,
  parseOwnerTimelineHint,
  removeOwnerAcquisitionMilestonesByItem,
  syncAutoOwnerMilestonesItemRename,
} from './autoOwnerMilestone.js';

describe('autoOwnerMilestone', () => {
  it('parses owner hint from owner field', () => {
    const out = parseOwnerTimelineHint({
      dynamicData: { f_chu: 'Lạc Nam (26) ?' },
      fieldsTemplate: [{ id: 'f_chu', label: 'Chủ nhân' }],
      rawText: '',
    });
    expect(out).toEqual({ ownerName: 'Lạc Nam', chapter: 26, labelId: 'uncertain' });
  });

  it('parses owner hint from rawText line', () => {
    const out = parseOwnerTimelineHint({
      dynamicData: {},
      fieldsTemplate: [],
      rawText: 'Mô tả...\nNgười sở hữu: Lạc Nam (120) !!',
    });
    expect(out).toEqual({ ownerName: 'Lạc Nam', chapter: 120, labelId: 'critical' });
  });

  it('parses owner hint from "Chủ nhân" line', () => {
    const out = parseOwnerTimelineHint({
      dynamicData: {},
      fieldsTemplate: [],
      rawText: 'Ghi chú...\nChủ nhân: Lạc Nam (2) !!',
    });
    expect(out).toEqual({ ownerName: 'Lạc Nam', chapter: 2, labelId: 'critical' });
  });

  it('parses owner hint with wiki name wrapper', () => {
    const out = parseOwnerTimelineHint({
      dynamicData: {},
      fieldsTemplate: [],
      rawText: 'Người sở hữu: [[Lạc Nam]] (6) ?',
    });
    expect(out).toEqual({ ownerName: 'Lạc Nam', chapter: 6, labelId: 'uncertain' });
  });

  it('does not mutate manual milestone when adding auto-owner milestone', () => {
    const novel = {
      data: {
        'nhan-vat': {
          'nhan-vat-chinh': {
            entities: [{
              id: 'nv1',
              name: 'Lạc Nam',
              dynamicData: {},
              milestones: [{ id: 'ms1', chapter: 26, event: '[?] Đột phá' }],
            }],
          },
        },
      },
    };
    const ok = appendOwnerAcquisitionMilestone(novel, { ownerName: 'Lạc Nam', chapter: 26, labelId: 'important' }, 'Thiên Địa Công');
    expect(ok).toBe(true);
    const ms = novel.data['nhan-vat']['nhan-vat-chinh'].entities[0].milestones;
    expect(ms.length).toBe(2);
    expect(ms.find((m) => m.id === 'ms1')?.event).toBe('[?] Đột phá');
    const auto = ms.find((m) => String(m.id).startsWith('ms-auto-'));
    expect(auto?.event).toContain('[[Thiên Địa Công]]');
    expect(String(auto?.event).startsWith('[!]')).toBe(true);
  });

  it('finds owner even when character tab id is custom', () => {
    const novel = {
      tabsConfig: [
        { id: 'nhan-vat-custom', label: 'Nhân Vật', subTabs: [{ id: 'chinh', viewType: 'collection-track' }] },
      ],
      data: {
        'nhan-vat-custom': {
          chinh: {
            entities: [{
              id: 'nv1',
              name: 'Lạc Nam',
              dynamicData: {},
              milestones: [],
            }],
          },
        },
      },
    };
    const ok = appendOwnerAcquisitionMilestone(
      novel,
      { ownerName: '[[Lạc Nam]]', chapter: 6, labelId: 'uncertain' },
      { name: 'Thiên Nguyệt Trảm', entityId: 'cp-1' }
    );
    expect(ok).toBe(true);
    const ms = novel.data['nhan-vat-custom'].chinh.entities[0].milestones;
    expect(ms.length).toBe(1);
    expect(ms[0].event).toContain('[[Thiên Nguyệt Trảm]]');
  });

  it('upserts same item to new chapter instead of duplicating milestone', () => {
    const novel = {
      data: {
        'nhan-vat': {
          'nhan-vat-chinh': {
            entities: [{
              id: 'nv1',
              name: 'Lạc Nam',
              dynamicData: {},
              milestones: [{ id: 'ms1', chapter: 9, event: '[?] Nhận được [[demo]]', meta: { source: 'auto-owner', itemWiki: '[[demo]]', itemEntityId: 'i-demo' } }],
            }],
          },
        },
      },
    };
    const ok = appendOwnerAcquisitionMilestone(
      novel,
      { ownerName: 'Lạc Nam', chapter: 10, labelId: 'critical' },
      { name: 'demo', entityId: 'i-demo' }
    );
    expect(ok).toBe(true);
    const ms = novel.data['nhan-vat']['nhan-vat-chinh'].entities[0].milestones;
    expect(ms.length).toBe(1);
    expect(ms[0].chapter).toBe(10);
    expect(ms[0].event).toContain('[[demo]]');
    expect(ms[0].event.startsWith('[!!]')).toBe(true);
  });

  it('backfills legacy auto milestone with itemEntityId on touch', () => {
    const novel = {
      data: {
        'nhan-vat': {
          'nhan-vat-chinh': {
            entities: [{
              id: 'nv1',
              name: 'Lạc Nam',
              dynamicData: {},
              milestones: [{ id: 'ms-legacy', chapter: 9, event: '[?] Nhận được [[demo]]', meta: { source: 'auto-owner', itemWiki: '[[demo]]' } }],
            }],
          },
        },
      },
    };
    const ok = appendOwnerAcquisitionMilestone(
      novel,
      { ownerName: 'Lạc Nam', chapter: 10, labelId: 'important' },
      { name: 'demo', entityId: 'item-demo' }
    );
    expect(ok).toBe(true);
    const ms = novel.data['nhan-vat']['nhan-vat-chinh'].entities[0].milestones;
    expect(ms.length).toBe(1);
    expect(ms[0].meta?.itemEntityId).toBe('item-demo');
    expect(ms[0].chapter).toBe(10);
  });

  it('removes auto owner milestones by item when item deleted', () => {
    const novel = {
      data: {
        'nhan-vat': {
          'nhan-vat-chinh': {
            entities: [{
              id: 'nv1',
              name: 'Lạc Nam',
              dynamicData: {},
              milestones: [
                { id: 'ms1', chapter: 3, event: '[?] Nhận được [[demo]]', meta: { source: 'auto-owner', itemWiki: '[[demo]]' } },
                { id: 'ms2', chapter: 6, event: '[!] Đột phá · Nhận được [[demo]]', meta: { source: 'auto-owner', itemWiki: '[[demo]]', itemEntityId: 'i-demo' } },
                { id: 'ms-manual', chapter: 7, event: '[?] Nhận được [[demo]]', snapshot: {} },
                { id: 'ms3', chapter: 8, event: '[?] Nhận được [[khac]]' },
              ],
            }],
          },
        },
      },
    };
    const removed = removeOwnerAcquisitionMilestonesByItem(novel, { name: 'demo', entityId: 'i-demo' });
    expect(removed).toBe(1);
    const ms = novel.data['nhan-vat']['nhan-vat-chinh'].entities[0].milestones;
    expect(ms.length).toBe(4);
    expect(ms.some((m) => m.id === 'ms-manual' && String(m.event).includes('[[demo]]'))).toBe(true);
    expect(ms.some((m) => m.id === 'ms1' && String(m.event).includes('[[demo]]'))).toBe(true);
    expect(ms.some((m) => String(m.event).includes('[[khac]]'))).toBe(true);
  });

  it('does not remove auto milestones of different item id with same name', () => {
    const novel = {
      data: {
        'nhan-vat': {
          'nhan-vat-chinh': {
            entities: [{
              id: 'nv1',
              name: 'Lạc Nam',
              dynamicData: {},
              milestones: [
                { id: 'ms-a', chapter: 2, event: '[?] Nhận được [[demo]]', meta: { source: 'auto-owner', itemWiki: '[[demo]]', itemEntityId: 'item-a' } },
                { id: 'ms-b', chapter: 4, event: '[?] Nhận được [[demo]]', meta: { source: 'auto-owner', itemWiki: '[[demo]]', itemEntityId: 'item-b' } },
              ],
            }],
          },
        },
      },
    };
    const removed = removeOwnerAcquisitionMilestonesByItem(novel, { name: 'demo', entityId: 'item-a' });
    expect(removed).toBe(1);
    const ids = novel.data['nhan-vat']['nhan-vat-chinh'].entities[0].milestones.map((m) => m.id);
    expect(ids).toEqual(['ms-b']);
  });

  it('syncs auto milestone wiki text when item renamed by entity id', () => {
    const novel = {
      data: {
        'nhan-vat': {
          'nhan-vat-chinh': {
            entities: [{
              id: 'nv1',
              name: 'Lạc Nam',
              dynamicData: {},
              milestones: [
                { id: 'ms-a', chapter: 2, event: '[?] Nhận được [[demo cũ]]', meta: { source: 'auto-owner', itemWiki: '[[demo cũ]]', itemEntityId: 'item-a' } },
                { id: 'ms-b', chapter: 4, event: '[?] Nhận được [[demo cũ]]', meta: { source: 'auto-owner', itemWiki: '[[demo cũ]]', itemEntityId: 'item-b' } },
              ],
            }],
          },
        },
      },
    };
    const changed = syncAutoOwnerMilestonesItemRename(novel, {
      entityId: 'item-a',
      oldName: 'demo cũ',
      newName: 'demo mới',
    });
    expect(changed).toBe(1);
    const ms = novel.data['nhan-vat']['nhan-vat-chinh'].entities[0].milestones;
    expect(ms[0].event).toContain('[[demo mới]]');
    expect(ms[1].event).toContain('[[demo cũ]]');
  });
});

