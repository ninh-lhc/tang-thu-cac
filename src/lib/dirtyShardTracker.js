/**
 * Shard key "lonId\\0nhoId" đã sửa kể từ lần sync gần nhất.
 * snapshotDirtyShards + clearDirtyShardKeys sau khi ghi đĩa OK (F-001).
 * consumeDirtyShards giữ cho test / legacy — sync folder không consume trước write.
 */
let dirtyShards = new Set();

export function markShardDirty(lonId, nhoId) {
  if (lonId == null || nhoId == null) return;
  dirtyShards.add(`${lonId}\x00${nhoId}`);
}

/** Snapshot in-flight dirty keys — không xóa active set (edits trong lúc ghi vẫn giữ). */
export function snapshotDirtyShards() {
  return new Set(dirtyShards);
}

/** Xóa các key đã flush xuống đĩa thành công. */
export function clearDirtyShardKeys(keys) {
  if (!keys) return;
  for (const key of keys) {
    if (key != null && key !== '') dirtyShards.delete(key);
  }
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

export function hasAnyDirtyShards() {
  return dirtyShards.size > 0;
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
