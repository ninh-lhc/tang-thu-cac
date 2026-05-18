/**
 * Dong bo AUTO tu tab Nhan Vat Chinh sang cac tab nhan vat lien quan.
 * Khong ghi khoi danh sach len thẻ nhan vat chinh (da co Mang luoi nhan qua tren ho so).
 * Bo qua thẻ «Danh Sach …» — chi dong bo nhan vat that.
 */
import { normalizeAsciiText } from './statusHierarchyParser.js';
import { getEntityAutoFieldValue } from './tabAutoSyncFieldMap.js';
import {
  AUTO_SYNC_ENGINE_MAIN_CHARACTER,
  isEntityAutoSyncDisabled,
  isEntityAutoSyncLocked,
} from './autoSyncEntityPrefs.js';
import {
  AUTO_SYNC_ROLE_CHARACTER_RELATED,
  AUTO_SYNC_ROLE_MAIN_CHARACTER,
  getEffectiveAutoSyncRole,
  hasAutoSyncFeature,
  isAutoSyncExplicitlyOff,
} from './tabAutoSyncRole.js';
import { collectExplicitAutoSyncLinkSources } from './tabAutoSyncLinks.js';
import { isListCardEntity } from './collectionListCardSync.js';

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

function normalizeStrippedInfo(infoText) {
  return String(infoText || '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Xóa khối danh sách trên thẻ nhân vật chính (legacy / đồng bộ cũ). */
export function stripMainCharacterListAutoBlock(infoText) {
  return normalizeStrippedInfo(String(infoText || '').replace(buildAutoBlockRegex(MAIN_RELATED_TITLE), ''));
}

/** Xóa khối liên kết ngược trên thẻ nhân vật phụ. */
export function stripRelatedMainCharacterAutoBlock(infoText) {
  return normalizeStrippedInfo(String(infoText || '').replace(buildAutoBlockRegex(RELATED_MAIN_TITLE), ''));
}

export function stripMainCharacterRelationAutoBlocks(infoText) {
  return stripRelatedMainCharacterAutoBlock(stripMainCharacterListAutoBlock(infoText));
}

export function infoHasMainCharacterRelationAutoBlock(infoText = '') {
  const src = String(infoText || '');
  return src.includes(MAIN_RELATED_TITLE) || src.includes(RELATED_MAIN_TITLE);
}

function isSyncableCharacterEntity(entity) {
  return Boolean(entity) && !isListCardEntity(entity);
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

function syncMainCharacterRelationGroup(novelData, mainPath, relatedPaths = []) {
  if (!mainPath || !Array.isArray(relatedPaths) || relatedPaths.length === 0) return false;

  let changed = false;
  const mainEntities = getCollectionEntities(novelData, mainPath.lonId, mainPath.nhoId).filter(
    (entity) =>
      isSyncableCharacterEntity(entity) &&
      !isEntityAutoSyncDisabled(entity, AUTO_SYNC_ENGINE_MAIN_CHARACTER)
  );
  const relatedEntries = [];
  relatedPaths.forEach((path) => {
    const entities = getCollectionEntities(novelData, path.lonId, path.nhoId).filter(
      (entity) =>
        isSyncableCharacterEntity(entity) &&
        !isEntityAutoSyncDisabled(entity, AUTO_SYNC_ENGINE_MAIN_CHARACTER)
    );
    entities.forEach((entity) => relatedEntries.push({ entity, path }));
  });

  const mainEntity = mainEntities[0];
  if (!mainEntity || relatedEntries.length === 0) return false;

  const relatedRecords = [];
  relatedEntries.forEach(({ entity, path }) => {
    if (!entity || entity.id === mainEntity.id) return;
    const relationLabel = resolveRelationLabel(entity, path);
    const bodyLines = buildRelatedMainAutoLines(mainEntity, relationLabel, path?.label || '');
    if (bodyLines.length === 0) return;

    if (!isEntityAutoSyncLocked(entity, AUTO_SYNC_ENGINE_MAIN_CHARACTER)) {
      const baseInfo = String(entity.info || '');
      const nextInfo = upsertAutoBlock(baseInfo, RELATED_MAIN_TITLE, bodyLines);
      if (nextInfo !== baseInfo) {
        entity.info = nextInfo;
        changed = true;
      }
    }

    relatedRecords.push({
      entity,
      relationLabel,
      tabLabel: safeString(path?.label || ''),
      tabOrder: path?.order,
      path,
    });
  });

  return changed;
}

function stripMainCharacterListBlocksInPath(novelData, mainPath) {
  if (!mainPath) return false;
  let changed = false;
  getCollectionEntities(novelData, mainPath.lonId, mainPath.nhoId).forEach((entity) => {
    if (!entity) return;
    const before = String(entity.info || '');
    const after = stripMainCharacterListAutoBlock(before);
    if (after !== before) {
      entity.info = after;
      changed = true;
    }
  });
  return changed;
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

  const { mainPath, relatedPaths } = findCharacterTabPaths(novelData);
  let changed = stripMainCharacterListBlocksInPath(novelData, mainPath);

  forEachCollectionEntity(novelData, (entity) => {
    if (!entity || typeof entity !== 'object') return;
    if (isEntityAutoSyncLocked(entity, AUTO_SYNC_ENGINE_MAIN_CHARACTER)) return;
    const before = String(entity.info || '');
    const after = stripRelatedMainCharacterAutoBlock(before);
    if (after !== before) {
      entity.info = after;
      changed = true;
    }
  });

  const explicitGroups = collectExplicitAutoSyncLinkSources(novelData?.tabsConfig, {
    sourceRoles: [AUTO_SYNC_ROLE_MAIN_CHARACTER],
  });
  if (explicitGroups.length > 0) {
    explicitGroups.forEach((group) => {
      changed =
        stripMainCharacterListBlocksInPath(novelData, group.sourcePath) ||
        syncMainCharacterRelationGroup(novelData, group.sourcePath, group.targetPaths) ||
        changed;
    });
    return changed;
  }

  if (!mainPath || relatedPaths.length === 0) return changed;
  return syncMainCharacterRelationGroup(novelData, mainPath, relatedPaths) || changed;
}
