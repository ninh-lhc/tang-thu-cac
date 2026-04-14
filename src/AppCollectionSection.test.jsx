import { describe, expect, it } from 'vitest';
import {
  buildTimelineCurrentProfileView,
  buildTimelineCurrentNotesText,
} from './appCollectionTimelineProfile.js';

describe('buildTimelineCurrentProfileView', () => {
  it('builds the current detail view from timeline snapshots without mutating the source entity', () => {
    const entity = {
      id: 'entity-1',
      name: 'Lac Nam',
      avatar: 'avatar-goc.png',
      title: 'Pham nhan',
      status: 'Nhap mon',
      dynamicData: {
        f_alias: 'Tieu Nam',
        f_status: 'Nhap mon',
      },
      milestones: [
        {
          id: 'ms-1',
          chapter: 12,
          title: 'Nhap thanh',
          snapshot: {
            avatar: 'avatar-12.png',
            dynamicData: {
              f_status: 'Luyen Khi',
            },
          },
        },
        {
          id: 'ms-2',
          chapter: 27,
          title: 'Len thieu chu',
          snapshot: {
            dynamicData: {
              f_title: 'Thieu chu',
              f_alias: 'Lac thieu chu',
            },
          },
        },
      ],
    };

    const out = buildTimelineCurrentProfileView(entity);

    expect(out.hasTimelineCurrentView).toBe(true);
    expect(out.hasSnapshotOverlay).toBe(true);
    expect(out.latestMilestone?.id).toBe('ms-2');
    expect(out.entity).not.toBe(entity);
    expect(out.entity.dynamicData).not.toBe(entity.dynamicData);
    expect(out.entity.avatar).toBe('avatar-12.png');
    expect(out.entity.status).toBe('Luyen Khi');
    expect(out.entity.title).toBe('Thieu chu');
    expect(out.entity.dynamicData.f_alias).toBe('Lac thieu chu');
    expect(entity.avatar).toBe('avatar-goc.png');
    expect(entity.title).toBe('Pham nhan');
    expect(entity.dynamicData.f_alias).toBe('Tieu Nam');
  });

  it('still exposes the latest timeline view even when the newest milestone has no snapshot', () => {
    const entity = {
      id: 'entity-2',
      name: 'Thanh Son',
      avatar: '',
      dynamicData: {},
      milestones: [
        { id: 'ms-empty', chapter: 3, title: 'Gap co nhan', event: '[?] Ket giao dong minh', snapshot: { avatar: '', dynamicData: { f_status: '   ' } } },
      ],
    };

    const out = buildTimelineCurrentProfileView(entity);

    expect(out.hasTimelineCurrentView).toBe(true);
    expect(out.hasSnapshotOverlay).toBe(false);
    expect(out.latestMilestone?.id).toBe('ms-empty');
    expect(out.entity).toBe(entity);
  });

  it('formats the current notes text from the latest timeline milestone', () => {
    const entity = {
      id: 'entity-3',
      name: 'Thanh Son',
      info: 'Ghi chep goc',
      milestones: [
        { id: 'ms-1', chapter: 7, title: 'Nghiem luyen', event: '[!] Danh thang doi thu', snapshot: null },
      ],
    };

    const text = buildTimelineCurrentNotesText(entity);

    expect(text).toContain('## Dữ kiện timeline hiện tại');
    expect(text).toContain('**Mốc chương:** 7');
    expect(text).toContain('### Nghiem luyen');
    expect(text).toContain('Danh thang doi thu');
  });
});
