import { describe, it, expect } from 'vitest';
import {
  encodePathSegment,
  decodePathSegment,
  listShardKeysFromData,
  buildDiskManifest,
  NOVEL_STORAGE_SHARDED,
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
});
