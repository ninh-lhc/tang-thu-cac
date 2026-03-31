import { describe, expect, it } from 'vitest';
import { appendOwnerAcquisitionMilestone, parseOwnerTimelineHint } from './autoOwnerMilestone.js';

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

  it('appends into existing chapter milestone', () => {
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
    expect(novel.data['nhan-vat']['nhan-vat-chinh'].entities[0].milestones[0].event).toContain('[[Thiên Địa Công]]');
    expect(novel.data['nhan-vat']['nhan-vat-chinh'].entities[0].milestones[0].event.startsWith('[!]')).toBe(true);
  });
});

