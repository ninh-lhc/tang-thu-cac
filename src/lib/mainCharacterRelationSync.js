/**
 * Dong bo AUTO giua tab Nhan Vat Chinh va cac tab nhan vat con lai.
 * Muc tieu: khi tao/sua/xoa nhan vat, thong tin lien ket luon duoc cap nhat hai chieu.
 * Chi thay doi khoi AUTO, giu nguyen noi dung ghi chu tay cua nguoi dung.
 */
import { buildPreferredWikiName } from './entityWikiDisambiguation.js';
import { normalizeAsciiText } from './statusHierarchyParser.js';
import { getEntityAutoFieldValue } from './tabAutoSyncFieldMap.js';
import {
  AUTO_SYNC_ROLE_CHARACTER_RELATED,
  AUTO_SYNC_ROLE_MAIN_CHARACTER,
  getEffectiveAutoSyncRole,
  hasAutoSyncFeature,
  isAutoSyncExplicitlyOff,
} from './tabAutoSyncRole.js';

const MAIN_RELATED_TITLE = '## Nhân Vật Liên Quan (AUTO)';
const RELATED_MAIN_TITLE = '## Nhân Vật Chính Liên Kết (AUTO)';
const AUTO_END = '> (Khối tự động, không cần sửa tay)';

function safeString(value) {
  if (value == null || value === 'null' || value === 'undefined') return '';
  return String(value);
}

function escapeRegExp(text) {
  return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeKey(value) {
  return normalizeAsciiText(String(value || '').replace(/\[\[|\]\]/g, '').trim());
}

function buildCharacterFieldContext(path = {}) {
  return {
    activeTabLon: path.lonId || '',
    activeTabNho: path.nhoId || '',
    currentTabConfig: path.currentTabConfig || null,
    parentLabel: path.parentLabel || '',
  };
}

function buildAutoBlockRegex(title) {
  return new RegExp(`${escapeRegExp(title)}[\\s\\S]*?${escapeRegExp(AUTO_END)}`, 'g');
}

function stripMainCharacterRelationAutoBlocks(infoText) {
  return String(infoText || '')
    .replace(buildAutoBlockRegex(MAIN_RELATED_TITLE), '')
    .replace(buildAutoBlockRegex(RELATED_MAIN_TITLE), '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function upsertAutoBlock(infoText, title, bodyLines) {
  const src = String(infoText || '').trimEnd();
  const block = [title, ...(bodyLines || []).filter(Boolean), AUTO_END].join('\n');
  const blockRe = buildAutoBlockRegex(title);
  const cleaned = src.replace(blockRe, '').replace(/\n{3,}/g, '\n\n').trimEnd();
  return cleaned ? `${cleaned}\n\n${block}` : block;
}

function forEachCollectionEntity(novelData, cb) {
  const data = novelData?.data;
  if (!data || typeof data !== 'object') return;
  Object.values(data).forEach((lonData) => {
    if (!lonData || typeof lonData !== 'object') return;
    Object.values(lonData).forEach((nhoData) => {
      const entities = Array.isArray(nhoData?.entities) ? nhoData.entities : [];
      entities.forEach((entity) => cb(entity));
    });
  });
}

function findCharacterTabPaths(novelData) {
  const tabsConfig = Array.isArray(novelData?.tabsConfig) ? novelData.tabsConfig : [];
  const relatedPaths = [];
  let mainPath = null;

  tabsConfig.forEach((lon, lonIndex) => {
    (lon?.subTabs || []).forEach((nho, nhoIndex) => {
      if (nho?.viewType !== 'collection-track') return;
      const role = getEffectiveAutoSyncRole({
        activeTabLon: lon?.id || '',
        activeTabNho: nho?.id || '',
        currentTabConfig: nho,
        parentLabel: lon?.label || '',
      });
      if (role === AUTO_SYNC_ROLE_MAIN_CHARACTER) {
        if (!mainPath) {
          mainPath = {
            lonId: lon.id,
            nhoId: nho.id,
            label: safeString(nho.label || nho.id),
            order: lonIndex * 1000 + nhoIndex,
            currentTabConfig: nho,
            parentLabel: safeString(lon.label || ''),
          };
        }
        return;
      }
      if (role !== AUTO_SYNC_ROLE_CHARACTER_RELATED) return;
      relatedPaths.push({
        lonId: lon.id,
        nhoId: nho.id,
        label: safeString(nho.label || nho.id),
        order: lonIndex * 1000 + nhoIndex,
        currentTabConfig: nho,
        parentLabel: safeString(lon.label || ''),
      });
    });
  });

  return { mainPath, relatedPaths };
}

function getCollectionEntities(novelData, lonId, nhoId) {
  const tabData = novelData?.data?.[lonId]?.[nhoId];
  return Array.isArray(tabData?.entities) ? tabData.entities : [];
}

function inferRelationLabelFromTab(tabLabel = '', tabId = '') {
  const key = normalizeKey(tabLabel || tabId);
  if (!key) return '';
  if (key.includes('dao lu')) return 'Đạo lữ';
  if (key.includes('than nhan') || key.includes('gia dinh')) return 'Thân nhân';
  if (key.includes('huynh de') || key.includes('dong mon')) return 'Huynh đệ';
  if (key.includes('de tu')) return 'Đệ tử';
  if (key.includes('su phu')) return 'Sư đồ';
  if (key.includes('ban be') || key.includes('bang huu')) return 'Bạn bè';
  return safeString(tabLabel || tabId).trim();
}

function resolveRelationLabel(entity, path) {
  const explicit =
    getEntityAutoFieldValue(entity, buildCharacterFieldContext(path), 'relation') ||
    safeString(entity?.dynamicData?.f_quan_he).trim();
  if (explicit) return explicit;
  return inferRelationLabelFromTab(path?.label || '', path?.nhoId || '');
}

function buildRelatedMainAutoLines(mainEntity, relationLabel, pathLabel = '') {
  const lines = [];
  const mainName = safeString(mainEntity?.name).trim();
  if (mainName) lines.push(`- Nhân vật chính: [[${mainName}]]`);
  if (relationLabel) lines.push(`- Quan hệ: ${relationLabel}`);
  const relationKey = normalizeKey(relationLabel);
  const pathKey = normalizeKey(pathLabel);
  if (pathLabel && pathKey && pathKey !== relationKey) {
    lines.push(`- Nhóm: ${pathLabel}`);
  }
  return lines;
}

function compareRelatedRecords(a, b) {
  const aOrder = Number.isFinite(a?.tabOrder) ? a.tabOrder : Number.POSITIVE_INFINITY;
  const bOrder = Number.isFinite(b?.tabOrder) ? b.tabOrder : Number.POSITIVE_INFINITY;
  if (aOrder !== bOrder) return aOrder - bOrder;
  const relationCmp = normalizeKey(a?.relationLabel).localeCompare(normalizeKey(b?.relationLabel));
  if (relationCmp !== 0) return relationCmp;
  return normalizeKey(a?.entity?.name).localeCompare(normalizeKey(b?.entity?.name));
}

function buildMainRelatedAutoLines(records) {
  const lines = [];
  const sorted = [...(records || [])].sort(compareRelatedRecords);
  sorted.forEach((record) => {
    const recordCtx = buildCharacterFieldContext(record?.path || {});
    const displayName = buildPreferredWikiName({
      name: record?.entity?.name,
      statusLine:
        getEntityAutoFieldValue(record?.entity, recordCtx, 'status', { fallbackToStatus: true }) ||
        safeString(record?.entity?.dynamicData?.f_status || record?.entity?.status || ''),
    });
    if (!displayName) return;
    const metaParts = [];
    if (record?.relationLabel) metaParts.push(record.relationLabel);
    const relationKey = normalizeKey(record?.relationLabel);
    const tabKey = normalizeKey(record?.tabLabel);
    if (record?.tabLabel && tabKey && tabKey !== relationKey) metaParts.push(record.tabLabel);
    const suffix = metaParts.length > 0 ? ` · ${metaParts.join(' · ')}` : '';
    lines.push(`- [[${displayName}]]${suffix}`);
  });
  return lines;
}

export function isMainCharacterRelationScope({
  activeTabLon = '',
  activeTabNho = '',
  currentTabConfig = null,
  parentLabel = '',
} = {}) {
  if (isAutoSyncExplicitlyOff(currentTabConfig)) return false;
  if (hasAutoSyncFeature({ activeTabLon, activeTabNho, currentTabConfig, parentLabel }, 'main_character')) {
    return true;
  }
  const lonKey = normalizeKey(activeTabLon || '');
  const parentKey = normalizeKey(parentLabel || currentTabConfig?._parentLabel || '');
  if (lonKey === 'nhan-vat' || parentKey.includes('nhan vat')) return true;

  const nhoKey = normalizeKey(activeTabNho || currentTabConfig?.id || '');
  return (
    nhoKey === 'nhan-vat-chinh' ||
    nhoKey.includes('dao lu') ||
    nhoKey.includes('than nhan') ||
    nhoKey.includes('huynh de') ||
    nhoKey.includes('chu nhan')
  );
}

export function syncAllMainCharacterRelationBlocks(novelData) {
  const data = novelData?.data;
  if (!data || typeof data !== 'object') return false;

  let changed = false;
  forEachCollectionEntity(novelData, (entity) => {
    if (!entity || typeof entity !== 'object') return;
    const before = String(entity.info || '');
    const after = stripMainCharacterRelationAutoBlocks(before);
    if (after !== before) {
      entity.info = after;
      changed = true;
    }
  });

  const { mainPath, relatedPaths } = findCharacterTabPaths(novelData);
  if (!mainPath && relatedPaths.length === 0) return changed;

  const mainEntities = mainPath ? getCollectionEntities(novelData, mainPath.lonId, mainPath.nhoId) : [];
  const relatedEntries = [];
  relatedPaths.forEach((path) => {
    const entities = getCollectionEntities(novelData, path.lonId, path.nhoId);
    entities.forEach((entity) => relatedEntries.push({ entity, path }));
  });

  const mainEntity = mainEntities[0];
  if (!mainEntity || relatedEntries.length === 0) return changed;

  const relatedRecords = [];
  relatedEntries.forEach(({ entity, path }) => {
    if (!entity || entity.id === mainEntity.id) return;
    const relationLabel = resolveRelationLabel(entity, path);
    const bodyLines = buildRelatedMainAutoLines(mainEntity, relationLabel, path?.label || '');
    if (bodyLines.length === 0) return;

    const baseInfo = String(entity.info || '');
    const nextInfo = upsertAutoBlock(baseInfo, RELATED_MAIN_TITLE, bodyLines);
    if (nextInfo !== baseInfo) {
      entity.info = nextInfo;
      changed = true;
    }

    relatedRecords.push({
      entity,
      relationLabel,
      tabLabel: safeString(path?.label || ''),
      tabOrder: path?.order,
      path,
    });
  });

  if (relatedRecords.length === 0) return changed;
  const mainBodyLines = buildMainRelatedAutoLines(relatedRecords);
  if (mainBodyLines.length === 0) return changed;
  const mainBaseInfo = String(mainEntity.info || '');
  const mainNextInfo = upsertAutoBlock(mainBaseInfo, MAIN_RELATED_TITLE, mainBodyLines);
  if (mainNextInfo !== mainBaseInfo) {
    mainEntity.info = mainNextInfo;
    changed = true;
  }

  return changed;
}
