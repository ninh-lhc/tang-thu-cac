/**
 * Helpers for child profiles (thẻ con) embedded inside an entity card.
 * Used by wiki indexing, quick-view resolution, and the collection detail UI.
 * Persisted shape: entity.members[] (+ member.kind) + optional entity.memberFieldLabels / memberPanelTitle.
 * wikiLinkOptOuts is optional editor metadata for the shared detail notes editor.
 */

import { normalizeMemberKind } from './entityMemberKind.js';

const MEMBER_NAME_SPLIT_RE = /[,/|()]/;

export const MEMBER_FIELD_KEYS = ['name', 'alias', 'role', 'status'];

/** Nhãn mặc định — generic, không gắn «nhân vật / thế lực». */
export const DEFAULT_MEMBER_FIELD_LABELS = Object.freeze({
  name: 'Tên',
  alias: 'Bí danh / tên khác',
  role: 'Vai trò / loại',
  status: 'Trạng thái',
});

export const DEFAULT_MEMBER_PANEL_TITLE = 'Thẻ con';

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

function normalizeMemberWikiLinkOptOuts(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      anchor: safeText(item?.anchor),
      before: safeText(item?.before).slice(-40),
      after: safeText(item?.after).slice(0, 40),
    }))
    .filter((item) => item.anchor);
}

export function normalizeEntityMemberInput(input, { generateId } = {}) {
  const id = safeText(input?.id) || (typeof generateId === 'function' ? generateId('mem') : '');
  const parentId = safeText(input?.parentId) || null;
  const sortRaw = Number(input?.sortOrder);
  const out = {
    id,
    kind: normalizeMemberKind(input?.kind),
    name: safeText(input?.name),
    alias: safeText(input?.alias),
    role: safeText(input?.role),
    status: safeText(input?.status),
    info: safeText(input?.info),
    wikiLinkOptOuts: normalizeMemberWikiLinkOptOuts(input?.wikiLinkOptOuts),
  };
  if (parentId) out.parentId = parentId;
  if (Number.isFinite(sortRaw)) out.sortOrder = Math.floor(sortRaw);
  return out;
}

/**
 * Merge a member update while leaving notes untouched by default.
 * Only the dedicated notes editor may opt into replacing the notes payload.
 */
export function mergeEntityMemberUpdate(previous, next, { replaceNotes = false } = {}) {
  const merged = { ...previous, ...next };
  if (!replaceNotes) {
    merged.info = safeText(previous?.info);
    merged.wikiLinkOptOuts = normalizeMemberWikiLinkOptOuts(previous?.wikiLinkOptOuts);
  }
  return merged;
}

/**
 * Chuẩn hóa nhãn 4 trường thẻ con.
 * Ưu tiên: entity.memberFieldLabels → tabConfig.memberFieldLabels → mặc định.
 */
export function normalizeMemberFieldLabels(input) {
  const src = input && typeof input === 'object' ? input : {};
  const out = {};
  MEMBER_FIELD_KEYS.forEach((key) => {
    const custom = safeText(src[key]);
    out[key] = custom || DEFAULT_MEMBER_FIELD_LABELS[key];
  });
  return out;
}

export function resolveMemberFieldLabels(entity, tabConfig) {
  const fromEntity = entity?.memberFieldLabels;
  const fromTab = tabConfig?.memberFieldLabels;
  const hasEntity = fromEntity && typeof fromEntity === 'object'
    && MEMBER_FIELD_KEYS.some((key) => safeText(fromEntity[key]));
  return normalizeMemberFieldLabels(hasEntity ? fromEntity : fromTab);
}

export function resolveMemberPanelTitle(entity, tabConfig) {
  const fromEntity = safeText(entity?.memberPanelTitle);
  if (fromEntity) return fromEntity;
  const fromTab = safeText(tabConfig?.memberPanelTitle);
  if (fromTab) return fromTab;
  return DEFAULT_MEMBER_PANEL_TITLE;
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
    fieldLabels: resolveMemberFieldLabels(parentEntity, nhoConfig),
    panelTitle: resolveMemberPanelTitle(parentEntity, nhoConfig),
  };
}
