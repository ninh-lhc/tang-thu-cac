/**
 * Shard key "lonId\\0nhoId" đã sửa kể từ lần sync gần nhất.
 * consumeDirtyShards xóa tập để lần sync sau không stringify lại shard sạch.
 */
let dirtyShards = new Set();

export function markShardDirty(lonId, nhoId) {
  if (lonId == null || nhoId == null) return;
  dirtyShards.add(`${lonId}\x00${nhoId}`);
}

export function consumeDirtyShards() {
  const snapshot = dirtyShards;
  dirtyShards = new Set();
  return snapshot;
}

/** Đưa lại snapshot dirty sau khi ghi đĩa thất bại — merge vào Set hiện tại, không replace. */
export function restoreDirtyShards(keys) {
  if (!keys) return;
  for (const key of keys) {
    if (key != null && key !== '') dirtyShards.add(key);
  }
}

export function isShardDirty(lonId, nhoId) {
  return dirtyShards.has(`${lonId}\x00${nhoId}`);
}

export function markAllShardsDirty(data) {
  if (!data || typeof data !== 'object') return;
  for (const lonId of Object.keys(data)) {
    const inner = data[lonId];
    if (!inner || typeof inner !== 'object') continue;
    for (const nhoId of Object.keys(inner)) {
      markShardDirty(lonId, nhoId);
    }
  }
}
