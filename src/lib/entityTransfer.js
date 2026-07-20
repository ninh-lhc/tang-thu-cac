// Di chuyển thẻ thật giữa các tab sưu tập và nâng một nhánh thẻ con thành thẻ thật.
// App.jsx gọi các hàm này bên trong updateActiveNovelData; test kiểm tra bảo toàn dữ liệu/cây.
// Chuyển khác tab sẽ tháo quan hệ mapParentId vì cây thư mục chỉ có nghĩa trong cùng tab.

function text(value) {
  if (value == null || value === 'null' || value === 'undefined') return '';
  return String(value).trim();
}

function getCollection(novel, lonId, nhoId, { create = false } = {}) {
  const lon = text(lonId);
  const nho = text(nhoId) || 'default';
  if (!lon) return null;
  if (!novel.data) {
    if (!create) return null;
    novel.data = {};
  }
  if (!novel.data[lon]) {
    if (!create) return null;
    novel.data[lon] = {};
  }
  let tabData = novel.data[lon][nho];
  if ((!tabData || typeof tabData === 'string') && create) {
    tabData = { overview: '', entities: [] };
    novel.data[lon][nho] = tabData;
  }
  if (!Array.isArray(tabData?.entities)) {
    if (!create || !tabData) return null;
    tabData.entities = [];
  }
  return tabData;
}

export function moveEntityAcrossCollectionTabs(novel, source, destination, entityId) {
  const id = text(entityId);
  const sameTab = text(source?.lonId) === text(destination?.lonId)
    && (text(source?.nhoId) || 'default') === (text(destination?.nhoId) || 'default');
  if (!id || sameTab) return { ok: false, reason: sameTab ? 'same-tab' : 'invalid' };
  const sourceTab = getCollection(novel, source?.lonId, source?.nhoId);
  const targetTab = getCollection(novel, destination?.lonId, destination?.nhoId, { create: true });
  if (!sourceTab || !targetTab) return { ok: false, reason: 'missing-tab' };
  const index = sourceTab.entities.findIndex((entity) => text(entity?.id) === id);
  if (index < 0) return { ok: false, reason: 'not-found' };
  if (targetTab.entities.some((entity) => text(entity?.id) === id)) {
    return { ok: false, reason: 'duplicate-id' };
  }

  const [entity] = sourceTab.entities.splice(index, 1);
  delete entity.mapParentId;
  sourceTab.entities.forEach((candidate) => {
    if (text(candidate?.mapParentId) === id) delete candidate.mapParentId;
  });
  targetTab.entities.push(entity);
  return { ok: true, entity, entityId: id };
}

function collectMemberBranch(members, rootId) {
  const ids = new Set([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    members.forEach((member) => {
      const id = text(member?.id);
      if (id && !ids.has(id) && ids.has(text(member?.parentId))) {
        ids.add(id);
        changed = true;
      }
    });
  }
  return ids;
}

export function promoteEntityMemberToCollectionCard(
  novel,
  source,
  destination,
  parentEntityId,
  memberId,
  { generateId } = {}
) {
  const parentId = text(parentEntityId);
  const rootId = text(memberId);
  const sourceTab = getCollection(novel, source?.lonId, source?.nhoId);
  const targetTab = getCollection(novel, destination?.lonId, destination?.nhoId, { create: true });
  if (!sourceTab || !targetTab || !parentId || !rootId) return { ok: false, reason: 'invalid' };
  const parent = sourceTab.entities.find((entity) => text(entity?.id) === parentId);
  if (!parent || !Array.isArray(parent.members)) return { ok: false, reason: 'not-found' };
  const root = parent.members.find((member) => text(member?.id) === rootId);
  if (!root) return { ok: false, reason: 'not-found' };

  const branchIds = collectMemberBranch(parent.members, rootId);
  const descendants = parent.members
    .filter((member) => branchIds.has(text(member?.id)) && text(member?.id) !== rootId)
    .map((member) => {
      const next = { ...member };
      if (text(next.parentId) === rootId) delete next.parentId;
      return next;
    });
  const entityId = typeof generateId === 'function' ? text(generateId('ent')) : `ent-${rootId}`;
  if (!entityId || targetTab.entities.some((entity) => text(entity?.id) === entityId)) {
    return { ok: false, reason: 'duplicate-id' };
  }

  const promoted = {
    id: entityId,
    name: text(root.name),
    avatar: '',
    rawText: '',
    title: text(root.role),
    status: text(root.status),
    description: text(root.alias),
    dynamicData: {
      f_alias: text(root.alias),
      f_title: text(root.role),
      f_status: text(root.status),
    },
    info: text(root.info),
    wikiLinkOptOuts: Array.isArray(root.wikiLinkOptOuts) ? root.wikiLinkOptOuts : [],
    milestones: [],
    images: [],
    members: descendants,
    createdAt: root.createdAt || Date.now(),
    updatedAt: Date.now(),
  };
  if (parent.memberFieldLabels) promoted.memberFieldLabels = { ...parent.memberFieldLabels };
  if (parent.memberPanelTitle) promoted.memberPanelTitle = parent.memberPanelTitle;

  parent.members = parent.members.filter((member) => !branchIds.has(text(member?.id)));
  targetTab.entities.push(promoted);
  return { ok: true, entity: promoted, entityId, movedDescendantCount: descendants.length };
}
