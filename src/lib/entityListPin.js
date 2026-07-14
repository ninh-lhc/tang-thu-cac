/**
 * Ghim thẻ lên đầu danh sách sưu tập.
 * Thẻ «Danh sách» luôn đứng đầu (không cần ghim) → user chỉ còn tối đa 7 chỗ ghim.
 * Persist: entity.listPinRank (số > 0, chỉ dùng làm cờ ghim; thứ tự ghim theo tên A→Z).
 */

function safeText(value) {
  if (value == null || value === 'null' || value === 'undefined') return '';
  return String(value).trim();
}

function normalizeAscii(value) {
  return safeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export const ENTITY_LIST_PIN_MAX = 7;

export function isCatalogListCardEntity(entity) {
  return normalizeAscii(entity?.name).startsWith('danh sach');
}

export function readEntityListPinRank(entity) {
  const n = Number(entity?.listPinRank);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

export function isEntityListPinned(entity) {
  return readEntityListPinRank(entity) > 0;
}

export function countEntityListPins(entities) {
  return (Array.isArray(entities) ? entities : []).filter(
    (ent) => isEntityListPinned(ent) && !isCatalogListCardEntity(ent)
  ).length;
}

export function clearEntityListPin(entity) {
  if (!entity || typeof entity !== 'object') return entity;
  delete entity.listPinRank;
  return entity;
}

/**
 * Ghim thẻ. Mutate entity trong list.
 * @returns {{ ok: boolean, reason: string, rank: number }}
 */
export function pinEntityInList(entities, entityId) {
  const id = safeText(entityId);
  const list = Array.isArray(entities) ? entities : [];
  const target = list.find((ent) => safeText(ent?.id) === id);
  if (!target) return { ok: false, reason: 'not-found', rank: 0 };
  if (isCatalogListCardEntity(target)) {
    return { ok: false, reason: 'list-card', rank: 0 };
  }
  if (isEntityListPinned(target)) {
    return { ok: true, reason: 'already-pinned', rank: readEntityListPinRank(target) };
  }
  if (countEntityListPins(list) >= ENTITY_LIST_PIN_MAX) {
    return { ok: false, reason: 'limit', rank: 0 };
  }
  // Rank chỉ là cờ ghim; thứ tự hiển thị theo tên.
  target.listPinRank = 1;
  return { ok: true, reason: '', rank: 1 };
}

/**
 * Bỏ ghim.
 */
export function unpinEntityInList(entities, entityId) {
  const id = safeText(entityId);
  const list = Array.isArray(entities) ? entities : [];
  const target = list.find((ent) => safeText(ent?.id) === id);
  if (!target) return { ok: false, reason: 'not-found' };
  if (!isEntityListPinned(target)) return { ok: true, reason: 'already-unpinned' };
  clearEntityListPin(target);
  return { ok: true, reason: '' };
}

export function toggleEntityListPin(entities, entityId) {
  const id = safeText(entityId);
  const list = Array.isArray(entities) ? entities : [];
  const target = list.find((ent) => safeText(ent?.id) === id);
  if (!target) return { ok: false, reason: 'not-found', pinned: false, rank: 0 };
  if (isCatalogListCardEntity(target)) {
    return { ok: false, reason: 'list-card', pinned: false, rank: 0 };
  }
  if (isEntityListPinned(target)) {
    const result = unpinEntityInList(list, id);
    return { ...result, pinned: false, rank: 0 };
  }
  const result = pinEntityInList(list, id);
  return { ...result, pinned: result.ok, rank: result.rank || 0 };
}
