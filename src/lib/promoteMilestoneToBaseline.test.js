import { describe, expect, it } from 'vitest';
import {
  buildBaselineNotesFromMilestone,
  hasBaselineArchiveAtChapterZero,
  promoteMilestoneToBaseline,
  readProfileBaselineMilestoneId,
} from './promoteMilestoneToBaseline.js';

function createEntity() {
  return {
    id: 'ent-1',
    name: 'Hong Lau',
    info: 'Mo ta giai doan 1',
    rawText: 'Mo ta giai doan 1',
    dynamicData: { f_status: 'Cap 1' },
    milestones: [],
  };
}

describe('promoteMilestoneToBaseline', () => {
  it('first promote: archives info to ch0 and keeps promoted milestone on timeline', () => {
    const entity = createEntity();
    entity.milestones = [
      {
        id: 'ms-100',
        chapter: 100,
        title: 'Hong Lau 2',
        event: 'Nang cap he thong',
        snapshot: { dynamicData: { f_status: 'Cap 2' } },
      },
    ];

    const result = promoteMilestoneToBaseline(entity, 'ms-100', {
      generateId: () => 'ms-archive-0',
    });

    expect(result.changed).toBe(true);
    expect(result.createdCh0Archive).toBe(true);
    expect(entity.info).toContain('Hong Lau 2');
    expect(entity.info).toContain('Nang cap he thong');
    expect(entity.dynamicData.f_status).toBe('Cap 2');
    expect(readProfileBaselineMilestoneId(entity)).toBe('ms-100');
    expect(entity.milestones.some((ms) => ms.id === 'ms-100')).toBe(true);
    expect(entity.milestones.filter((ms) => ms.chapter === 100)).toHaveLength(1);

    const archive = entity.milestones.find((ms) => ms.meta?.source === 'baseline-archive');
    expect(archive).toBeTruthy();
    expect(archive.chapter).toBe(0);
    expect(archive.event).toContain('Mo ta giai doan 1');
    expect(hasBaselineArchiveAtChapterZero(entity.milestones)).toBe(true);
  });

  it('second promote: only overwrites baseline, milestones unchanged count', () => {
    const entity = createEntity();
    entity.milestones = [
      {
        id: 'ms-100',
        chapter: 100,
        title: 'V1',
        event: 'Lan 1',
        snapshot: { dynamicData: { f_status: 'V1' } },
      },
      {
        id: 'ms-200',
        chapter: 200,
        title: 'V2',
        event: 'Lan 2',
        snapshot: { dynamicData: { f_status: 'V2' } },
      },
    ];
    promoteMilestoneToBaseline(entity, 'ms-100', { generateId: () => 'ms-a0' });
    const countAfterFirst = entity.milestones.length;
    const infoAfterFirst = entity.info;

    promoteMilestoneToBaseline(entity, 'ms-200', { generateId: () => 'ms-x' });

    expect(entity.info).toContain('Lan 2');
    expect(entity.info).not.toBe(infoAfterFirst);
    expect(readProfileBaselineMilestoneId(entity)).toBe('ms-200');
    expect(entity.milestones.some((ms) => ms.id === 'ms-100')).toBe(true);
    expect(entity.milestones.some((ms) => ms.id === 'ms-200')).toBe(true);
    expect(entity.milestones.length).toBe(countAfterFirst);
    expect(entity.milestones.filter((ms) => ms.meta?.source === 'baseline-archive')).toHaveLength(1);
    expect(entity.dynamicData.f_status).toBe('V2');
    expect(promoteMilestoneToBaseline(entity, 'ms-200', { generateId: () => 'ms-y' }).createdCh0Archive).toBe(
      false
    );
  });

  it('does not duplicate ch0 archive on repeat promote', () => {
    const entity = createEntity();
    entity.milestones = [
      { id: 'ms-50', chapter: 50, title: 'A', event: 'Body A', snapshot: {} },
      { id: 'ms-60', chapter: 60, title: 'B', event: 'Body B', snapshot: {} },
    ];
    promoteMilestoneToBaseline(entity, 'ms-50', { generateId: () => 'ms-ch0' });
    promoteMilestoneToBaseline(entity, 'ms-60', { generateId: () => 'ms-ch0-dup' });

    const ch0Archives = entity.milestones.filter(
      (ms) => ms.meta?.source === 'baseline-archive' && ms.chapter === 0
    );
    expect(ch0Archives).toHaveLength(1);
    expect(ch0Archives[0].id).toBe('ms-ch0');
  });

  it('buildBaselineNotesFromMilestone formats title and body', () => {
    const text = buildBaselineNotesFromMilestone({
      chapter: 50,
      title: 'Test',
      event: '[!] Su kien quan trong',
    });
    expect(text).toContain('## Test');
    expect(text).toContain('Su kien quan trong');
  });
});
