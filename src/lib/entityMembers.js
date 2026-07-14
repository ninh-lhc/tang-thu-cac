/**
 * Helpers for member profiles embedded inside an entity card.
 * Used by wiki indexing, quick-view resolution, and the collection detail UI.
 * Keeps the persisted shape small: entity.members[] with name/alias/role/status/info.
 */

const MEMBER_NAME_SPLIT_RE = /[,/|()]/;

function safeText(value) {
  if (value == null || value === 'null' || value === 'undefined') return '';
  return String(value).trim();
}

export function splitEntityMemberNames(value) {
  return safeText(value)
    .split(MEMBER_NAME_SPLIT_RE)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2 && part.length <= 80);
}

export function readEntityMembers(entity) {
  return Array.isArray(entity?.members) ? entity.members.filter(Boolean) : [];
}

export function normalizeEntityMemberInput(input, { generateId } = {}) {
  const id = safeText(input?.id) || (typeof generateId === 'function' ? generateId('mem') : '');
  return {
    id,
    name: safeText(input?.name),
    alias: safeText(input?.alias),
    role: safeText(input?.role),
    status: safeText(input?.status),
    info: safeText(input?.info),
  };
}

export function findEntityMemberById(entity, memberId) {
  const id = safeText(memberId);
  if (!id) return null;
  return readEntityMembers(entity).find((member) => safeText(member?.id) === id) || null;
}

export function findEntityMemberInNovel(activeNovelData, dest) {
  const lonId = safeText(dest?.lonId);
  const nhoId = safeText(dest?.nhoId);
  const entityId = safeText(dest?.entityId);
  const memberId = safeText(dest?.memberId || dest?.childId);
  if (!activeNovelData || !lonId || !nhoId || !entityId || !memberId) return null;

  const tabData = activeNovelData.data?.[lonId]?.[nhoId];
  const parentEntity = Array.isArray(tabData?.entities)
    ? tabData.entities.find((entity) => safeText(entity?.id) === entityId)
    : null;
  if (!parentEntity) return null;
  const member = findEntityMemberById(parentEntity, memberId);
  if (!member) return null;

  const lonConfig = (activeNovelData.tabsConfig || []).find((tab) => tab?.id === lonId);
  const nhoConfig = (lonConfig?.subTabs || []).find((tab) => tab?.id === nhoId);
  return {
    member,
    parentEntity,
    lonId,
    nhoId,
    entityId,
    memberId,
    parentLabel: safeText(parentEntity.name),
    tabLabel: safeText(nhoConfig?.label || nhoId),
    lonLabel: safeText(lonConfig?.label || lonId),
  };
}
