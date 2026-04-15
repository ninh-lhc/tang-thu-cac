import { describe, it, expect } from 'vitest';
import {
  encodePathSegment,
  decodePathSegment,
  listShardKeysFromData,
  buildDiskManifest,
  buildShardWritePlan,
  NOVEL_STORAGE_SHARDED,
  novelManifestBaseNameCandidates,
  parseManifestIdFromJsonText,
} from './novelDiskLayout.js';

describe('novelDiskLayout', () => {
  it('encodePathSegment round-trips common ids', () => {
    const id = 'lon-1_sub-2';
    expect(decodePathSegment(encodePathSegment(id))).toBe(id);
  });

  it('listShardKeysFromData lists lon/nho pairs', () => {
    const keys = listShardKeysFromData({
      a: { x: {}, y: {} },
      b: { z: {} },
    });
    expect(keys).toEqual([
      { lonId: 'a', nhoId: 'x' },
      { lonId: 'a', nhoId: 'y' },
      { lonId: 'b', nhoId: 'z' },
    ]);
  });

  it('parseManifestIdFromJsonText reads id from manifest', () => {
    expect(parseManifestIdFromJsonText('{"id":"abc-1","title":"T"}')).toBe('abc-1');
    expect(parseManifestIdFromJsonText('{}')).toBe(null);
    expect(parseManifestIdFromJsonText('not json')).toBe(null);
  });

  it('novelManifestBaseNameCandidates dedupes folderName, title slug, id', () => {
    expect(
      novelManifestBaseNameCandidates({
        folderName: 'Alpha',
        title: 'Beta',
        id: 'uuid-1',
      })
    ).toEqual(['Alpha', 'Beta', 'uuid-1']);
    expect(
      novelManifestBaseNameCandidates({
        folderName: 'Same',
        title: 'Same',
        id: 'Same',
      })
    ).toEqual(['Same']);
  });

  it('buildDiskManifest clears data and sets sharded layout', () => {
    const nov = {
      id: 'n1',
      title: 'T',
      data: { L: { S: { overview: 'o', entities: [] } } },
      tabsConfig: [],
    };
    const m = buildDiskManifest(nov);
    expect(m.data).toEqual({});
    expect(m.storageLayout).toBe(NOVEL_STORAGE_SHARDED);
    expect(m.title).toBe('T');
    expect(nov.data.L).toBeDefined();
  });

  it('buildShardWritePlan marks only changed shards for write', () => {
    const prev = new Map([
      ['L/S.json', JSON.stringify({ overview: 'A' }, null, 2)],
      ['L/OLD.json', JSON.stringify({ overview: 'X' }, null, 2)],
    ]);
    const data = {
      L: {
        S: { overview: 'A' },
        N: { overview: 'B' },
      },
    };
    const plan = buildShardWritePlan(data, prev);
    expect(plan.writes.map((w) => w.rel)).toEqual(['L/N.json']);
    expect(plan.removed).toEqual(['L/OLD.json']);
  });
});
