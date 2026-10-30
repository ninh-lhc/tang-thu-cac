/**
 * Cập nhật novel theo một đường (root → data → lon → nho → entity).
 * Nhánh không nằm trên đường đi giữ nguyên reference.
 * lonId/nhoId/entityId không tồn tại, hoặc updater trả null/undefined/cùng reference: trả lại novel cũ.
 */
export function patchNovelData(novel, patch) {
  if (!novel || !patch?.lonId || typeof patch.updater !== 'function') return novel;
  const data = novel.data;
  if (!data || typeof data !== 'object' || !Object.prototype.hasOwnProperty.call(data, patch.lonId)) {
    return novel;
  }
  const lon = data[patch.lonId];
  if (lon == null || typeof lon !== 'object') return novel;

  const hasNho = patch.nhoId != null && patch.nhoId !== '';
  if (!hasNho) {
    const nextLon = patch.updater(lon);
    if (nextLon == null || nextLon === lon) return novel;
    return { ...novel, data: { ...data, [patch.lonId]: nextLon } };
  }

  if (!Object.prototype.hasOwnProperty.call(lon, patch.nhoId)) return novel;
  const nho = lon[patch.nhoId];
  const hasEntity = patch.entityId != null && patch.entityId !== '';
  if (!hasEntity) {
    const nextNho = patch.updater(nho);
    if (nextNho == null || nextNho === nho) return novel;
    return {
      ...novel,
      data: { ...data, [patch.lonId]: { ...lon, [patch.nhoId]: nextNho } },
    };
  }

  if (!nho || typeof nho !== 'object' || !Array.isArray(nho.entities)) return novel;
  const index = nho.entities.findIndex((ent) => ent && ent.id === patch.entityId);
  if (index < 0) return novel;
  const current = nho.entities[index];
  const nextEntity = patch.updater(current);
  if (nextEntity == null || nextEntity === current) return novel;
  const entities = nho.entities.slice();
  entities[index] = nextEntity;
  return {
    ...novel,
    data: {
      ...data,
      [patch.lonId]: { ...lon, [patch.nhoId]: { ...nho, entities } },
    },
  };
}

/**
 * Callback cũ: structuredClone + dirty toàn bộ.
 * Patch descriptor có lonId: structural sharing + dirty một shard.
 */
export function commitNovelUpdate(novel, input) {
  if (typeof input === 'function') {
    const next = structuredClone(novel);
    input(next);
    return { novel: next, dirty: 'all' };
  }
  if (input && typeof input === 'object' && input.lonId && typeof input.updater === 'function') {
    const next = patchNovelData(novel, input);
    if (next === novel) return { novel, dirty: 'none' };
    return {
      novel: next,
      dirty: { lonId: input.lonId, nhoId: input.nhoId || 'default' },
    };
  }
  return { novel, dirty: 'none' };
}

/**
 * Chờ syncNovel từ updateActiveNovelData (false | true | Promise).
 * Dùng trước toast “đã lưu” (F-002).
 */
export async function awaitNovelUpdateSync(outcome) {
  if (outcome === false) return { ok: false, reason: 'no_novel' };
  if (outcome === true) return { ok: true, reason: 'no_sync_needed' };
  if (outcome != null && typeof outcome.then === 'function') {
    try {
      const result = await outcome;
      if (result && typeof result === 'object') {
        return { ok: Boolean(result.ok), ...result };
      }
      return { ok: Boolean(result) };
    } catch (error) {
      return { ok: false, reason: 'sync_rejected', error };
    }
  }
  return { ok: true, reason: 'unknown_outcome' };
}

/** true khi updateActiveNovelData đã flush (hoặc không cần sync). */
export async function isNovelUpdatePersisted(outcome) {
  if (outcome === false) return false;
  const result = await awaitNovelUpdateSync(outcome);
  return Boolean(result.ok);
}

/** Chờ syncNovel trả về từ ref/direct call. */
export async function awaitSyncNovelResult(syncPromise) {
  if (!syncPromise || typeof syncPromise.then !== 'function') return true;
  try {
    const result = await syncPromise;
    return Boolean(result?.ok);
  } catch {
    return false;
  }
}
