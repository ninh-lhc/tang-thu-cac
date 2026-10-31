import { describe, it, expect } from 'vitest';
import { canonicalShardJson, quickHash, shardRelPath } from '../shardIntegrity.js';
import {
  encodePathSegment,
  decodePathSegment,
  listShardKeysFromData,
  buildDiskManifest,
  buildShardWritePlan,
  getShardState,
  NOVEL_STORAGE_SHARDED,
  novelManifestBaseNameCandidates,
  parseManifestIdFromJsonText,
  readRawNovelPackageFromDir,
} from './novelDiskLayout.js';

function makeFile(text) {
  return { kind: 'file', getFile: async () => ({ text: async () => text }) };
}

function makeDir(children) {
  return {
    kind: 'directory',
    getFileHandle: async (name) => {
      const child = children[name];
      if (!child || child.kind !== 'file') throw new Error(`missing file ${name}`);
      return child;
    },
    getDirectoryHandle: async (name) => {
      const child = children[name];
      if (!child || child.kind !== 'directory') throw new Error(`missing dir ${name}`);
      return child;
    },
    async *entries() {
      for (const [name, handle] of Object.entries(children)) yield [name, handle];
    },
  };
}

function shardedNovelDir({ tab, shardCommit }) {
  const manifest = {
    id: 'n1',
    title: 'T',
    storageLayout: 'sharded',
    data: {},
    ...(shardCommit ? { shardCommit } : {}),
  };
  return makeDir({
    'T.json': makeFile(JSON.stringify(manifest)),
    data: makeDir({
      L: makeDir({ 'S.json': makeFile(canonicalShardJson(tab)) }),
    }),
  });
}

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
    expect(m.shardCommit).toBeUndefined();
    expect(nov.data.L).toBeDefined();
  });

  it('buildDiskManifest strips a stale shardCommit copied from memory', () => {
    const m = buildDiskManifest({
      id: 'n1',
      title: 'T',
      data: {},
      shardCommit: { generation: 4, shardHashes: { 'data/L/S.json': 'abcd' }, timestamp: 1 },
    });
    expect(m.shardCommit).toBeUndefined();
  });

  it('readRawNovelPackageFromDir marks a matching shardCommit as ok and keeps generation', async () => {
    const tab = { overview: 'ok' };
    const path = shardRelPath('L', 'S');
    const novelDir = shardedNovelDir({
      tab,
      shardCommit: {
        generation: 7,
        shardHashes: { [path]: quickHash(canonicalShardJson(tab)) },
        timestamp: 1,
      },
    });
    const parsed = await readRawNovelPackageFromDir(novelDir, 'T');
    expect(parsed.__integrityStatus).toBe('ok');
    expect(parsed.__integrityMismatches).toBeUndefined();
    expect(getShardState(novelDir).generation).toBe(7);
    expect(getShardState(novelDir).previousShardHashes[path]).toBe(quickHash(canonicalShardJson(tab)));
  });

  it('readRawNovelPackageFromDir treats a manifest without shardCommit as legacy', async () => {
    const novelDir = shardedNovelDir({ tab: { overview: 'old' } });
    const parsed = await readRawNovelPackageFromDir(novelDir, 'T');
    expect(parsed.__integrityStatus).toBe('legacy');
    expect(getShardState(novelDir).generation).toBe(0);
  });

  it('readRawNovelPackageFromDir reports torn when the shard hash does not match', async () => {
    const novelDir = shardedNovelDir({
      tab: { overview: 'new-on-disk' },
      shardCommit: {
        generation: 3,
        shardHashes: { [shardRelPath('L', 'S')]: 'deadbeef' },
        timestamp: 1,
      },
    });
    const parsed = await readRawNovelPackageFromDir(novelDir, 'T');
    expect(parsed.__integrityStatus).toBe('torn');
    expect(parsed.__integrityMismatches[0].issue).toBe('hash_mismatch');
    expect(getShardState(novelDir).generation).toBe(3);
  });

  it('readRawNovelPackageFromDir skips verify on a partial read but still keeps generation', async () => {
    const tab = { overview: 'part' };
    const novelDir = shardedNovelDir({
      tab,
      shardCommit: {
        generation: 9,
        shardHashes: { [shardRelPath('L', 'S')]: quickHash(canonicalShardJson(tab)) },
        timestamp: 1,
      },
    });
    const parsed = await readRawNovelPackageFromDir(novelDir, 'T', {
      shardKeys: [{ lonId: 'L', nhoId: 'S' }],
    });
    expect(parsed.__integrityStatus).toBe('skipped');
    expect(parsed.__partialData).toBe(true);
    expect(getShardState(novelDir).generation).toBe(9);
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

  it('entity edits change shard plan even when sharded disk manifest JSON is unchanged', () => {
    const baseNovel = {
      id: 'id1',
      title: 'Same Title',
      tabsConfig: [
        { id: 'L', label: 'Lon', subTabs: [{ id: 'S', label: 'Tab', viewType: 'collection-track' }] },
      ],
      data: {
        L: {
          S: { overview: '', entities: [{ id: 'e1', name: 'A' }] },
        },
      },
    };
    const edited = structuredClone(baseNovel);
    edited.data.L.S.entities[0].name = 'B';

    expect(JSON.stringify(buildDiskManifest(baseNovel), null, 2)).toBe(
      JSON.stringify(buildDiskManifest(edited), null, 2)
    );

    const hashes = new Map();
    const planBase = buildShardWritePlan(baseNovel.data, hashes);
    for (const w of planBase.writes) hashes.set(w.rel, w.jsonStr);
    const planAfterEdit = buildShardWritePlan(edited.data, hashes);
    expect(planAfterEdit.writes.length).toBe(1);
  });

  it('dirty key with changed memory produces write even when warm hash cache exists', () => {
    const prev = new Map([['L/A.json', JSON.stringify({ overview: 'old' }, null, 2)]]);
    const data = {
      L: {
        A: { overview: 'new' },
      },
    };
    const plan = buildShardWritePlan(data, prev, new Set(['L\x00A']));
    expect(plan.writes.length).toBe(1);
    expect(plan.writes[0].rel).toBe('L/A.json');
    expect(plan.writes[0].jsonStr).toContain('new');
  });

  it('skips stringify for shards that are not dirty when a previous hash exists', () => {
    const prev = new Map([
      ['L/A.json', JSON.stringify({ overview: 'old-a' }, null, 2)],
      ['L/B.json', JSON.stringify({ overview: 'old-b' }, null, 2)],
    ]);
    const data = {
      L: {
        A: { overview: 'new-a' },
        B: { overview: 'changed-but-not-dirty' },
      },
    };
    const plan = buildShardWritePlan(data, prev, new Set(['L\x00A']));
    expect(plan.writes.map((w) => w.rel)).toEqual(['L/A.json']);
    expect(plan.nextHashes.get('L/B.json')).toBe(prev.get('L/B.json'));
    expect(plan.writes[0].jsonStr).toContain('new-a');
  });

  it('stringifies every shard when dirtyKeys is omitted', () => {
    const prev = new Map([
      ['L/A.json', JSON.stringify({ overview: 'old-a' }, null, 2)],
      ['L/B.json', JSON.stringify({ overview: 'old-b' }, null, 2)],
    ]);
    const data = {
      L: {
        A: { overview: 'new-a' },
        B: { overview: 'new-b' },
      },
    };
    const plan = buildShardWritePlan(data, prev);
    expect(plan.writes.map((w) => w.rel).sort()).toEqual(['L/A.json', 'L/B.json']);
  });

  it('stringifies a new shard even when it is not in dirtyKeys', () => {
    const prev = new Map([['L/A.json', JSON.stringify({ overview: 'a' }, null, 2)]]);
    const data = {
      L: {
        A: { overview: 'a' },
        C: { overview: 'fresh' },
      },
    };
    const plan = buildShardWritePlan(data, prev, new Set(['L\x00A']));
    expect(plan.writes.map((w) => w.rel)).toEqual(['L/C.json']);
    expect(plan.nextHashes.get('L/A.json')).toBe(prev.get('L/A.json'));
  });

  it('with cold hash cache and one dirty shard only writes that shard', () => {
    const prev = new Map();
    const data = {
      L: {
        A: { overview: 'changed-a' },
        B: { overview: 'untouched-b' },
        C: { overview: 'untouched-c' },
      },
    };
    const plan = buildShardWritePlan(data, prev, new Set(['L\x00A']));
    expect(plan.writes.map((w) => w.rel)).toEqual(['L/A.json']);
    expect(plan.skipped).toBe(2);
  });

  it('reports skipped count when dirty filter skips cached shards', () => {
    const prev = new Map([
      ['L/A.json', JSON.stringify({ overview: 'old-a' }, null, 2)],
      ['L/B.json', JSON.stringify({ overview: 'old-b' }, null, 2)],
    ]);
    const data = {
      L: {
        A: { overview: 'new-a' },
        B: { overview: 'changed-but-not-dirty' },
      },
    };
    const plan = buildShardWritePlan(data, prev, new Set(['L\x00A']));
    expect(plan.writes.map((w) => w.rel)).toEqual(['L/A.json']);
    expect(plan.skipped).toBe(1);
  });
});
