/**
 * Cây thẻ con trong một entity: member.parentId + member.sortOrder.
 * parentId = id thẻ con cha (null = gốc). sortOrder = thứ tự hiện thị cùng cấp (nhỏ hơn = trên).
 * Dùng bởi AppEntityMembersPanel; khác mapEntityTree ở chỗ giữ thứ tự tay (không ép A→Z).
 */

function safeText(value) {
  if (value == null || value === 'null' || value === 'undefined') return '';
  return String(value).trim();
}

export function readMemberParentId(member) {
  const id = safeText(member?.parentId);
  return id || null;
}

export function setMemberParentId(member, parentId) {
  if (!member || typeof member !== 'object') return member;
  const next = safeText(parentId);
  if (!next) delete member.parentId;
  else member.parentId = next;
  return member;
}

export function readMemberSortOrder(member) {
  const n = Number(member?.sortOrder);
  if (!Number.isFinite(n)) return Number.MAX_SAFE_INTEGER;
  return n;
}

export function compareMembersBySortThenName(a, b) {
  const byOrder = readMemberSortOrder(a) - readMemberSortOrder(b);
  if (byOrder !== 0) return byOrder;
  const byName = safeText(a?.name).localeCompare(safeText(b?.name), 'vi', {
    sensitivity: 'base',
    numeric: true,
  });
  if (byName !== 0) return byName;
  return safeText(a?.id).localeCompare(safeText(b?.id), 'en');
}

export function sortMembersForTree(list) {
  return [...(Array.isArray(list) ? list : [])].sort(compareMembersBySortThenName);
}

/** Gán lại sortOrder 0..n-1 theo thứ tự hiện tại trong siblings. */
export function compactMemberSiblingOrders(siblings) {
  const list = Array.isArray(siblings) ? siblings : [];
  list.forEach((member, index) => {
    if (!member || typeof member !== 'object') return;
    member.sortOrder = index;
  });
  return list;
}

export function canMoveMember(members, nodeId, newParentId) {
  const id = safeText(nodeId);
  if (!id) return { ok: false, reason: 'missing-node' };
  const nextParent = safeText(newParentId) || null;
  if (nextParent === id) return { ok: false, reason: 'self' };

  const byId = new Map();
  (Array.isArray(members) ? members : []).forEach((mem) => {
    const memId = safeText(mem?.id);
    if (memId) byId.set(memId, mem);
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
      cursor = readMemberParentId(byId.get(cursor));
    }
  }
  return { ok: true, reason: '' };
}

/**
 * Đổi cha (hoặc về gốc). Chèn vào vị trí beforeId trong hàng anh em mới (null = cuối).
 */
export function applyMemberMove(members, nodeId, newParentId, { beforeId = null } = {}) {
  const check = canMoveMember(members, nodeId, newParentId);
  if (!check.ok) return { ok: false, reason: check.reason, member: null };

  const id = safeText(nodeId);
  const nextParent = safeText(newParentId) || null;
  const list = Array.isArray(members) ? members : [];
  const member = list.find((item) => safeText(item?.id) === id) || null;
  if (!member) return { ok: false, reason: 'node-not-found', member: null };

  setMemberParentId(member, nextParent);

  const siblings = sortMembersForTree(
    list.filter((item) => {
      const itemId = safeText(item?.id);
      if (!itemId || itemId === id) return false;
      return readMemberParentId(item) === nextParent;
    })
  );

  const before = safeText(beforeId) || null;
  const insertAt = before
    ? Math.max(0, siblings.findIndex((item) => safeText(item?.id) === before))
    : siblings.length;
  const ordered = [...siblings];
  if (before && insertAt >= 0) ordered.splice(insertAt, 0, member);
  else ordered.push(member);
  compactMemberSiblingOrders(ordered);

  return { ok: true, reason: '', member };
}

/** Đổi thứ tự trong cùng cấp: đưa node trước beforeId (null = cuối). */
export function reorderMemberAmongSiblings(members, nodeId, beforeId = null) {
  const id = safeText(nodeId);
  const list = Array.isArray(members) ? members : [];
  const member = list.find((item) => safeText(item?.id) === id) || null;
  if (!member) return { ok: false, reason: 'node-not-found' };

  const parentId = readMemberParentId(member);
  const siblings = sortMembersForTree(
    list.filter((item) => readMemberParentId(item) === parentId)
  );
  const without = siblings.filter((item) => safeText(item?.id) !== id);
  const before = safeText(beforeId) || null;
  const insertAt = before
    ? Math.max(0, without.findIndex((item) => safeText(item?.id) === before))
    : without.length;
  const ordered = [...without];
  if (before && insertAt >= 0) ordered.splice(insertAt, 0, member);
  else ordered.push(member);
  compactMemberSiblingOrders(ordered);
  return { ok: true, reason: '' };
}

/** Xóa cha → con lên cùng cấp với cha cũ, giữ thứ tự tương đối. */
export function reparentMemberChildrenOnDelete(members, deletedId) {
  const id = safeText(deletedId);
  if (!id || !Array.isArray(members)) return 0;
  const deleted = members.find((item) => safeText(item?.id) === id) || null;
  const newParent = deleted ? readMemberParentId(deleted) : null;
  let count = 0;
  const orphans = sortMembersForTree(
    members.filter((item) => readMemberParentId(item) === id)
  );
  orphans.forEach((child) => {
    setMemberParentId(child, newParent);
    count += 1;
  });
  if (count > 0) {
    const siblings = sortMembersForTree(
      members.filter((item) => {
        const itemId = safeText(item?.id);
        if (!itemId || itemId === id) return false;
        return readMemberParentId(item) === newParent;
      })
    );
    compactMemberSiblingOrders(siblings);
  }
  return count;
}

export function nextMemberSortOrder(members, parentId) {
  const pid = safeText(parentId) || null;
  const siblings = (Array.isArray(members) ? members : []).filter(
    (item) => readMemberParentId(item) === pid
  );
  if (siblings.length === 0) return 0;
  return Math.max(...siblings.map((item) => {
    const n = Number(item?.sortOrder);
    return Number.isFinite(n) ? n : -1;
  })) + 1;
}

/**
 * @returns {{ roots: object[], nodesById: Map, childrenByParentId: Map }}
 */
export function buildMemberForest(members) {
  const list = (Array.isArray(members) ? members : []).filter((mem) => safeText(mem?.id));
  const nodesById = new Map(list.map((mem) => [safeText(mem.id), mem]));
  const childrenByParentId = new Map();

  list.forEach((mem) => {
    const id = safeText(mem.id);
    let parentId = readMemberParentId(mem);
    if (parentId && !nodesById.has(parentId)) parentId = null;
    if (parentId === id) parentId = null;
    if (!parentId) return;
    if (!childrenByParentId.has(parentId)) childrenByParentId.set(parentId, []);
    childrenByParentId.get(parentId).push(mem);
  });

  childrenByParentId.forEach((children, key) => {
    childrenByParentId.set(key, sortMembersForTree(children));
  });

  const roots = sortMembersForTree(
    list.filter((mem) => {
      const parentId = readMemberParentId(mem);
      if (!parentId) return true;
      if (!nodesById.has(parentId)) return true;
      if (parentId === safeText(mem.id)) return true;
      return false;
    })
  );

  return { roots, nodesById, childrenByParentId };
}

export function getDirectMemberChildren(members, parentId) {
  const id = safeText(parentId);
  if (!id) return [];
  return sortMembersForTree(
    (Array.isArray(members) ? members : []).filter((mem) => readMemberParentId(mem) === id)
  );
}

export function flattenMemberForest(members) {
  const { roots, childrenByParentId } = buildMemberForest(members);
  const out = [];
  const walk = (node, depth) => {
    out.push({ member: node, depth });
    const id = safeText(node?.id);
    const children = childrenByParentId.get(id) || [];
    children.forEach((child) => walk(child, depth + 1));
  };
  roots.forEach((root) => walk(root, 0));
  return out;
}
