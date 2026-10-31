/**
 * F-003: quickHash, shardCommit hashes, và verify tear/legacy.
 */
import { describe, expect, it } from 'vitest';
import {
  buildShardCommit,
  canonicalShardJson,
  computeShardHashes,
  quickHash,
  sealShardHashes,
  shardRelPath,
  verifyShardIntegrity,
} from './shardIntegrity.js';

describe('quickHash', () => {
  it('is deterministic', () => {
    expect(quickHash('alpha')).toBe(quickHash('alpha'));
  });

  it('changes when the input changes', () => {
    expect(quickHash('alpha')).not.toBe(quickHash('beta'));
    expect(quickHash('alpha')).not.toBe(quickHash('alph'));
  });

  it('returns a hash for an empty string', () => {
    expect(quickHash('')).toBe('811c9dc5');
  });

  it('hashes 100KB quickly', () => {
    const big = 'x'.repeat(100_000);
    const start = performance.now();
    const hash = quickHash(big);
    expect(performance.now() - start).toBeLessThan(10);
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe('computeShardHashes', () => {
  it('hashes each write', () => {
    const hashes = computeShardHashes([{ relativePath: 'data/L/S.json', jsonString: '{"a":1}' }]);
    expect(hashes['data/L/S.json']).toBe(quickHash('{"a":1}'));
  });

  it('keeps previous hashes and overrides writes', () => {
    const hashes = computeShardHashes(
      [{ relativePath: 'data/L/S.json', jsonString: 'new' }],
      { 'data/L/S.json': 'old', 'data/L/T.json': 'keep' }
    );
    expect(hashes['data/L/S.json']).toBe(quickHash('new'));
    expect(hashes['data/L/T.json']).toBe('keep');
  });

  it('copies previous hashes when there are no writes', () => {
    const prev = { 'data/L/S.json': 'abc' };
    const hashes = computeShardHashes([], prev);
    expect(hashes).toEqual(prev);
    expect(hashes).not.toBe(prev);
  });
});

describe('verifyShardIntegrity', () => {
  const tab = { overview: 'ok', entities: [] };
  const path = shardRelPath('L', 'S');
  const loaded = { L: { S: tab } };
  const goodCommit = {
    generation: 1,
    shardHashes: { [path]: quickHash(canonicalShardJson(tab)) },
    timestamp: 1,
  };

  it('accepts matching shards', () => {
    expect(verifyShardIntegrity(goodCommit, loaded)).toEqual({ status: 'ok', mismatches: [] });
  });

  it('reports a hash mismatch', () => {
    const result = verifyShardIntegrity(
      { ...goodCommit, shardHashes: { [path]: 'deadbeef' } },
      loaded
    );
    expect(result.status).toBe('torn');
    expect(result.mismatches).toEqual([
      { path, issue: 'hash_mismatch', expected: 'deadbeef', actual: quickHash(canonicalShardJson(tab)) },
    ]);
  });

  it('reports a missing shard', () => {
    const result = verifyShardIntegrity(goodCommit, {});
    expect(result.status).toBe('torn');
    expect(result.mismatches[0]).toMatchObject({ path, issue: 'missing' });
  });

  it('reports an orphan shard that is not in the commit', () => {
    const result = verifyShardIntegrity({ ...goodCommit, shardHashes: {} }, loaded);
    expect(result.status).toBe('torn');
    expect(result.mismatches).toEqual([{ path, issue: 'orphan' }]);
  });

  it('skips verify when shardCommit is missing', () => {
    expect(verifyShardIntegrity(null, loaded)).toEqual({ status: 'legacy', mismatches: [] });
    expect(verifyShardIntegrity(undefined, loaded)).toEqual({ status: 'legacy', mismatches: [] });
  });
});

describe('buildShardCommit', () => {
  it('hashes every shard still in data and drops removed ones', () => {
    const data = { L: { S: { overview: 'a' }, N: { overview: 'b' } } };
    const commit = buildShardCommit(data, { generation: 3, timestamp: 9, previousShardHashes: {} });
    expect(commit.generation).toBe(3);
    expect(commit.timestamp).toBe(9);
    expect(Object.keys(commit.shardHashes).sort()).toEqual([shardRelPath('L', 'N'), shardRelPath('L', 'S')].sort());
    expect(commit.shardHashes[shardRelPath('L', 'S')]).toBe(quickHash(canonicalShardJson(data.L.S)));
  });

  it('uses the write payload hash when that shard was just written', () => {
    const data = { L: { S: { overview: 'a' } } };
    const jsonString = canonicalShardJson(data.L.S);
    const hashes = sealShardHashes(
      data,
      [{ relativePath: shardRelPath('L', 'S'), jsonString }],
      {}
    );
    expect(hashes[shardRelPath('L', 'S')]).toBe(quickHash(jsonString));
  });
});
