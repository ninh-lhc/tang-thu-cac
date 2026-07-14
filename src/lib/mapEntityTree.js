/**
 * Cây thư mục (cha/con) giữa các entity trong cùng tab sưu tập.
 * Nguồn sự thật: entity.mapParentId (id cha trực tiếp). null/'' = gốc hoặc chưa gắn.
 * Dùng bởi panel kéo thả, lọc list theo nhánh; tab Bản đồ còn mapHierarchySync (ưu tiên hơn f_vi_tri).
 */

import { normalizeAsciiText } from './statusHierarchyParser.js';

function safeText(value) {
  if (value == null || value === 'null' || value === 'undefined') return '';
  return String(value).trim();
}

function normalizeKey(value) {
  return normalizeAsciiText(safeText(value));
}

/** So sánh tên ổn định (vi): cùng cấp luôn xếp theo tên gọi. */
export function compareMapEntityNames(a, b) {
  const nameA = safeText(a?.name);
  const nameB = safeText(b?.name);
  const byLocale = nameA.localeCompare(nameB, 'vi', { sensitivity: 'base', numeric: true });
  if (byLocale !== 0) return byLocale;
  return safeText(a?.id).localeCompare(safeText(b?.id), 'en');
}

export function sortMapEntitiesByName(list) {
  return [...(Array.isArray(list) ? list : [])].sort(compareMapEntityNames);
}

/** Cùng cha trực tiếp (kể cả cùng là gốc / chưa gắn). */
export function areMapSiblings(entities, idA, idB) {
  const a = safeText(idA);
  const b = safeText(idB);
  if (!a || !b || a === b) return false;
  const list = Array.isArray(entities) ? entities : [];
  const entA = list.find((item) => safeText(item?.id) === a);
  const entB = list.find((item) => safeText(item?.id) === b);
  if (!entA || !entB) return false;
  return readMapParentId(entA) === readMapParentId(entB);
}

export function readMapParentId(entity) {
  const id = safeText(entity?.mapParentId);
  return id || null;
}

/** Tab đang có ít nhất một quan hệ cha–con (đã dùng cây thư mục). */
export function tabHasEntityTreeLinks(entities) {
  return (Array.isArray(entities) ? entities : []).some((ent) => Boolean(readMapParentId(ent)));
}

export function setMapParentId(entity, parentId) {
  if (!entity || typeof entity !== 'object') return entity;
  const next = safeText(parentId);
  if (!next) {
    delete entity.mapParentId;
  } else {
    entity.mapParentId = next;
  }
  return entity;
}

/**
 * Sync ngược chuỗi f_vi_tri = tên cha (1 tầng) để UI/AUTO cũ còn đọc được.
 * Không ghi đè đường dẫn nhiều tầng thủ công nếu không có cha id.
 */
export function syncMapParentPathField(entity, parentEntity) {
  if (!entity || typeof entity !== 'object') return;
  if (!entity.dynamicData || typeof entity.dynamicData !== 'object') {
    entity.dynamicData = {};
  }
  const parentName = safeText(parentEntity?.name);
  if (!parentName) {
    if (safeText(entity.dynamicData.f_vi_tri)) {
      delete entity.dynamicData.f_vi_tri;
    }
    return;
  }
  entity.dynamicData.f_vi_tri = parentName;
}

export function canMoveMapNode(entities, nodeId, newParentId) {
  const id = safeText(nodeId);
  if (!id) return { ok: false, reason: 'missing-node' };
  const nextParent = safeText(newParentId) || null;
  if (nextParent === id) return { ok: false, reason: 'self' };

  const byId = new Map();
  (Array.isArray(entities) ? entities : []).forEach((ent) => {
    const entId = safeText(ent?.id);
    if (entId) byId.set(entId, ent);
  });
  if (!byId.has(id)) return { ok: false, reason: 'node-not-found' };
  if (nextParent && !byId.has(nextParent)) return { ok: false, reason: 'parent-not-found' };

  if (nextParent) {
    let cursor = nextParent;
    const guard = new Set();
    while (cursor) {
      if (cursor === id) return { ok: false, reason: 'cycle' };
      if (guard.has(cursor)) break;
      guard.add(cursor);
      cursor = readMapParentId(byId.get(cursor));
    }
  }
  return { ok: true, reason: '' };
}

export function applyMapMove(entities, nodeId, newParentId, { syncPathField = true } = {}) {
  const check = canMoveMapNode(entities, nodeId, newParentId);
  if (!check.ok) return { ok: false, reason: check.reason, entity: null };

  const id = safeText(nodeId);
  const nextParent = safeText(newParentId) || null;
  const list = Array.isArray(entities) ? entities : [];
  const entity = list.find((item) => safeText(item?.id) === id) || null;
  if (!entity) return { ok: false, reason: 'node-not-found', entity: null };

  setMapParentId(entity, nextParent);
  if (syncPathField) {
    const parentEntity = nextParent
      ? list.find((item) => safeText(item?.id) === nextParent) || null
      : null;
    syncMapParentPathField(entity, parentEntity);
  }
  return { ok: true, reason: '', entity };
}

export function detachMapChildrenOnDelete(entities, deletedId) {
  const id = safeText(deletedId);
  if (!id || !Array.isArray(entities)) return 0;
  let count = 0;
  entities.forEach((ent) => {
    if (readMapParentId(ent) !== id) return;
    setMapParentId(ent, null);
    syncMapParentPathField(ent, null);
    count += 1;
  });
  return count;
}

/**
 * Suy mapParentId từ f_vi_tri khi chưa có id cha (migration nhẹ).
 * Token đầu trong đường dẫn khớp tên thẻ trong tab → gán làm cha.
 */
export function inferMapParentIdsFromViTri(entities) {
  if (!Array.isArray(entities)) return 0;
  const byName = new Map();
  entities.forEach((ent) => {
    const key = normalizeKey(ent?.name);
    const id = safeText(ent?.id);
    if (key && id && !byName.has(key)) byName.set(key, ent);
  });

  let changed = 0;
  entities.forEach((ent) => {
    if (readMapParentId(ent)) return;
    const path = safeText(ent?.dynamicData?.f_vi_tri);
    if (!path) return;
    const firstToken = path
      .replace(/[>→»|/\\]+/g, ' - ')
      .split(/\s*-\s*/)
      .map((part) => part.trim())
      .find(Boolean);
    if (!firstToken) return;
    const parent = byName.get(normalizeKey(firstToken));
    const parentId = safeText(parent?.id);
    if (!parentId || parentId === safeText(ent?.id)) return;
    if (!canMoveMapNode(entities, ent.id, parentId).ok) return;
    setMapParentId(ent, parentId);
    changed += 1;
  });
  return changed;
}

function sortEntitiesByName(a, b) {
  return compareMapEntityNames(a, b);
}

/**
 * @returns {{ roots: object[], unattached: object[], nodesById: Map, childrenByParentId: Map }}
 * roots = có mặt trong rừng (không có cha hợp lệ trong tab)
 * unattached = roots chưa từng được «xếp» — thực tế cùng roots; giữ alias rõ nghĩa cho UI
 * (UI dùng unattached = roots, children lấy từ childrenByParentId)
 */
export function buildMapForest(entities) {
  const list = (Array.isArray(entities) ? entities : []).filter((ent) => safeText(ent?.id));
  const nodesById = new Map(list.map((ent) => [safeText(ent.id), ent]));
  const childrenByParentId = new Map();

  list.forEach((ent) => {
    const id = safeText(ent.id);
    let parentId = readMapParentId(ent);
    if (parentId && !nodesById.has(parentId)) parentId = null;
    if (parentId === id) parentId = null;
    if (!parentId) return;
    if (!childrenByParentId.has(parentId)) childrenByParentId.set(parentId, []);
    childrenByParentId.get(parentId).push(ent);
  });

  childrenByParentId.forEach((children, key) => {
    childrenByParentId.set(key, sortMapEntitiesByName(children));
  });

  const roots = sortMapEntitiesByName(
    list.filter((ent) => {
      const parentId = readMapParentId(ent);
      if (!parentId) return true;
      if (!nodesById.has(parentId)) return true;
      if (parentId === safeText(ent.id)) return true;
      return false;
    })
  );

  return {
    roots,
    unattached: roots,
    nodesById,
    childrenByParentId,
  };
}

export function getDirectMapChildren(entities, parentId) {
  const id = safeText(parentId);
  if (!id) return [];
  return sortMapEntitiesByName(
    (Array.isArray(entities) ? entities : []).filter((ent) => readMapParentId(ent) === id)
  );
}

/** Tập id gồm root + mọi hậu duệ (BFS). */
export function getSubtreeIds(entities, rootId) {
  const id = safeText(rootId);
  if (!id) return new Set();
  const { childrenByParentId, nodesById } = buildMapForest(entities);
  if (!nodesById.has(id)) return new Set();

  const out = new Set([id]);
  const queue = [id];
  while (queue.length) {
    const current = queue.shift();
    const children = childrenByParentId.get(current) || [];
    children.forEach((child) => {
      const childId = safeText(child?.id);
      if (!childId || out.has(childId)) return;
      out.add(childId);
      queue.push(childId);
    });
  }
  return out;
}

export function filterEntitiesByMapBranch(entities, rootId) {
  const id = safeText(rootId);
  if (!id) return Array.isArray(entities) ? [...entities] : [];
  const allowed = getSubtreeIds(entities, id);
  return (Array.isArray(entities) ? entities : []).filter((ent) => allowed.has(safeText(ent?.id)));
}

/** Chỉ các thẻ gốc / chưa gắn (ẩn thẻ con khỏi list phẳng). */
export function filterMapTreeRootsOnly(entities) {
  const { roots } = buildMapForest(entities);
  return roots;
}

/** Chuỗi breadcrumb tên từ gốc → entity (không gồm chính nó nếu includeSelf=false). */
export function buildMapBreadcrumb(entities, entityId, { includeSelf = true } = {}) {
  const { nodesById } = buildMapForest(entities);
  const id = safeText(entityId);
  if (!id || !nodesById.has(id)) return [];

  const chain = [];
  let cursor = id;
  const guard = new Set();
  while (cursor && !guard.has(cursor)) {
    guard.add(cursor);
    const ent = nodesById.get(cursor);
    if (!ent) break;
    chain.push(ent);
    cursor = readMapParentId(ent);
    if (cursor && !nodesById.has(cursor)) break;
  }
  chain.reverse();
  if (!includeSelf && chain.length) chain.pop();
  return chain;
}

/** Gốc cao nhất của nhánh chứa entity (chính nó nếu đã là gốc / chưa gắn). */
export function getMapBranchRoot(entities, entityId) {
  const chain = buildMapBreadcrumb(entities, entityId, { includeSelf: true });
  return chain[0] || null;
}
