import { describe, expect, it } from 'vitest';
import { buildEntityLinkFingerprint } from './buildEntityLinkFingerprint.js';

function novel(entities) {
  return {
    tabsConfig: [
      {
        id: 'lon',
        label: 'Lon',
        subTabs: [{ id: 'nho', label: 'Nho' }],
      },
    ],
    data: {
      lon: {
        nho: {
          entities,
        },
      },
    },
  };
}

const baseEntity = () => ({
  id: 'e1',
  name: 'A Phi',
  info: 'ghi chu cu',
  milestones: [{ id: 'm1', title: 'moc' }],
  dynamicData: { f_alias: 'Phi Dao', f_status: 'Kim', f_vi_tri: 'Ha Gioi' },
  status: '',
  wikiRetiredAliases: ['Ten Cu'],
  members: [{ id: 'mem1', name: 'Con', alias: 'Be', role: 'de tu', status: 'song' }],
});

describe('buildEntityLinkFingerprint', () => {
  it('stays the same when only notes change', () => {
    const a = novel([baseEntity()]);
    const b = novel([{ ...baseEntity(), info: 'ghi chu moi', milestones: [] }]);
    expect(buildEntityLinkFingerprint(a)).toBe(buildEntityLinkFingerprint(b));
  });

  it('changes when the entity name changes', () => {
    const a = novel([baseEntity()]);
    const next = baseEntity();
    next.name = 'Bach Thien Vu';
    expect(buildEntityLinkFingerprint(novel([next]))).not.toBe(buildEntityLinkFingerprint(a));
  });

  it('changes when alias changes', () => {
    const a = novel([baseEntity()]);
    const next = baseEntity();
    next.dynamicData = { ...next.dynamicData, f_alias: 'Khac' };
    expect(buildEntityLinkFingerprint(novel([next]))).not.toBe(buildEntityLinkFingerprint(a));
  });

  it('changes when an entity is added or removed', () => {
    const a = novel([baseEntity()]);
    const extra = { ...baseEntity(), id: 'e2', name: 'B' };
    expect(buildEntityLinkFingerprint(novel([baseEntity(), extra]))).not.toBe(
      buildEntityLinkFingerprint(a),
    );
    expect(buildEntityLinkFingerprint(novel([]))).not.toBe(buildEntityLinkFingerprint(a));
  });

  it('changes when a member is added', () => {
    const a = novel([baseEntity()]);
    const next = baseEntity();
    next.members = [...next.members, { id: 'mem2', name: 'Them' }];
    expect(buildEntityLinkFingerprint(novel([next]))).not.toBe(buildEntityLinkFingerprint(a));
  });
});
