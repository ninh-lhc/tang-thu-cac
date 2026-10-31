/**
 * Phát hiện manifest/shard lệch sau crash giữa chừng (F-003).
 * Hash không phải checksum mật mã — chỉ để biết file shard khác lúc ghi.
 * Ai gọi: novelDiskLayout.js (đọc), useAppPersistence.js (ghi).
 */

export function quickHash(str) {
  let h = 0x811c9dc5;
  const s = String(str ?? '');
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function shardRelPath(lonId, nhoId) {
  return `data/${encodeURIComponent(String(lonId))}/${encodeURIComponent(String(nhoId))}.json`;
}

export function canonicalShardJson(value) {
  return JSON.stringify(value, null, 2);
}

function listShardEntries(data) {
  const out = [];
  if (!data || typeof data !== 'object') return out;
  for (const lonId of Object.keys(data)) {
    const inner = data[lonId];
    if (!inner || typeof inner !== 'object' || Array.isArray(inner)) continue;
    for (const nhoId of Object.keys(inner)) {
      out.push({ lonId, nhoId, value: inner[nhoId] });
    }
  }
  return out;
}

/**
 * Hash các shard vừa ghi, giữ hash cũ cho shard không nằm trong writes.
 * @param {Array<{ relativePath: string, jsonString: string }>} writes
 * @param {Record<string, string>} [previousShardHashes]
 */
export function computeShardHashes(writes, previousShardHashes = {}) {
  const next = { ...(previousShardHashes || {}) };
  for (const w of writes || []) {
    if (!w?.relativePath) continue;
    next[w.relativePath] = quickHash(String(w.jsonString ?? ''));
  }
  return next;
}

/** Hash đủ mọi shard còn trong data. Shard đã xóa không còn trong kết quả. */
export function sealShardHashes(data, writes = [], previousShardHashes = {}) {
  const written = computeShardHashes(writes, {});
  const next = {};
  for (const { lonId, nhoId, value } of listShardEntries(data)) {
    const path = shardRelPath(lonId, nhoId);
    if (written[path]) next[path] = written[path];
    else if (previousShardHashes && previousShardHashes[path]) next[path] = previousShardHashes[path];
    else next[path] = quickHash(canonicalShardJson(value));
  }
  return next;
}

export function buildShardCommit(data, options = {}) {
  const generation = Number(options.generation);
  return {
    generation: Number.isFinite(generation) && generation > 0 ? generation : 1,
    shardHashes: sealShardHashes(data, options.writes || [], options.previousShardHashes || {}),
    timestamp: Number(options.timestamp) || Date.now(),
  };
}

function findShardValue(loadedShards, path, shardKeyToPath) {
  for (const { lonId, nhoId, value } of listShardEntries(loadedShards)) {
    if (shardKeyToPath(lonId, nhoId) === path) return value;
  }
  return undefined;
}

/**
 * @returns {{ status: 'ok'|'torn'|'legacy', mismatches: Array }}
 */
export function verifyShardIntegrity(shardCommit, loadedShards, shardKeyToPath = shardRelPath) {
  if (!shardCommit || typeof shardCommit !== 'object' || Array.isArray(shardCommit)) {
    return { status: 'legacy', mismatches: [] };
  }
  const hashes = shardCommit.shardHashes;
  if (!hashes || typeof hashes !== 'object' || Array.isArray(hashes)) {
    return { status: 'legacy', mismatches: [] };
  }
  const mismatches = [];
  for (const [path, expectedHash] of Object.entries(hashes)) {
    const shard = findShardValue(loadedShards, path, shardKeyToPath);
    if (shard === undefined) {
      mismatches.push({ path, issue: 'missing' });
      continue;
    }
    const actual = quickHash(canonicalShardJson(shard));
    if (actual !== expectedHash) {
      mismatches.push({ path, issue: 'hash_mismatch', expected: expectedHash, actual });
    }
  }
  for (const { lonId, nhoId } of listShardEntries(loadedShards)) {
    const path = shardKeyToPath(lonId, nhoId);
    if (!Object.prototype.hasOwnProperty.call(hashes, path)) {
      mismatches.push({ path, issue: 'orphan' });
    }
  }
  return { status: mismatches.length > 0 ? 'torn' : 'ok', mismatches };
}
