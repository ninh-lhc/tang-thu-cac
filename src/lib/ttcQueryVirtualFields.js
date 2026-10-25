/**
 * Field ảo TTC-Query — định danh ổn định theo novel.data[lonId][nhoId].
 * Label tiếng Việt (tabsConfig) chỉ dùng hiển thị cột, không dùng WHERE/SORT.
 */
import { safeString } from './entityFieldValue.js';
import { normalizeSearchText } from './normalizeSearchText.js';

/** Field ảo read-only; không map vào dynamicData. */
export const TTC_VIRTUAL_FIELD_IDS = Object.freeze([
  'entity',
  'id',
  'type',
  'nhoId',
  'lonId',
  'parentFolder',
  'folderPath',
  'folder',
]);

const VIRTUAL_SET = new Set(TTC_VIRTUAL_FIELD_IDS);

/** tabsConfig trong novel là mảng tab lớn; một số test dùng `{ tabs: [...] }`. */
export function normalizeTtcTabsList(tabsConfig) {
  if (Array.isArray(tabsConfig)) return tabsConfig;
  if (Array.isArray(tabsConfig?.tabs)) return tabsConfig.tabs;
  return [];
}

export function isTtcVirtualField(fieldId) {
  return VIRTUAL_SET.has(String(fieldId || '').trim());
}

/**
 * type = id tab con (nhoId) — cùng khóa với novel.data[lonId][nhoId].
 * parentFolder / lonId = id tab lớn.
 * folderPath / folder = `${lonId}/${nhoId}`.
 */
export function buildTtcEntityRowContext(ent, { lonId, nhoId }, tabsConfig) {
  const lon = safeString(lonId);
  const nho = safeString(nhoId);
  const folderPath = lon && nho ? `${lon}/${nho}` : lon || nho || '';
  return {
    entity: ent,
    lonId: lon,
    nhoId: nho,
    /** Giá trị query/SORT/WHERE cho field `type` */
    typeId: nho,
    typeLabel: resolveSubTabLabel(tabsConfig, lon, nho),
    folderPath,
  };
}

function resolveSubTabLabel(tabsConfig, lonId, nhoId) {
  const tabs = normalizeTtcTabsList(tabsConfig);
  if (!tabs.length) return nhoId || '';
  const lon = tabs.find((t) => t?.id === lonId);
  const nho = lon?.subTabs?.find((s) => s?.id === nhoId);
  return safeString(nho?.label || nhoId);
}

/**
 * WHERE/SORT/SELECT raw value (không dùng label hiển thị).
 */
export function ttcRawVirtualValue(rowCtx, fieldId) {
  const id = String(fieldId || '').trim();
  const ent = rowCtx?.entity;
  if (!ent) return undefined;
  switch (id) {
    case 'entity':
      return ent.name;
    case 'id':
      return ent.id;
    case 'type':
    case 'nhoId':
      return rowCtx.typeId;
    case 'lonId':
    case 'parentFolder':
      return rowCtx.lonId;
    case 'folderPath':
    case 'folder':
      return rowCtx.folderPath;
    default:
      return undefined;
  }
}

export function ttcDisplayVirtualValue(rowCtx, fieldId) {
  const id = String(fieldId || '').trim();
  if (id === 'entity') return safeString(rowCtx.entity?.name);
  if (id === 'type') return rowCtx.typeLabel || rowCtx.typeId;
  const raw = ttcRawVirtualValue(rowCtx, id);
  return raw == null ? '' : safeString(raw);
}

/** Field `type` / `nhoId`: chỉ khớp id tab con (nhoId). */
export function ttcNhoIdMatches(rowCtx, expected) {
  const want = normalizeSearchText(expected);
  if (!want) return false;
  return normalizeSearchText(rowCtx.typeId) === want;
}

/** Field `lonId` / `parentFolder`: chỉ khớp id tab lớn. */
export function ttcLonIdMatches(rowCtx, expected) {
  const want = normalizeSearchText(expected);
  if (!want) return false;
  return normalizeSearchText(rowCtx.lonId) === want;
}

/** @deprecated alias — dùng ttcNhoIdMatches */
export function ttcTypeMatches(rowCtx, expected) {
  return ttcNhoIdMatches(rowCtx, expected);
}

export function buildTtcVirtualFieldLabels() {
  return {
    entity: 'Thực thể',
    id: 'ID',
    type: 'Loại/tab con',
    nhoId: 'Tab con (nhoId)',
    lonId: 'Tab lớn (lonId)',
    parentFolder: 'Tab lớn',
    folderPath: 'Đường dẫn tab',
    folder: 'Đường dẫn tab',
  };
}
