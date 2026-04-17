/**
 * Đồng bộ cây Bản đồ/Bí cảnh từ dữ liệu map hiện có.
 * Đọc `f_title` để đoán loại map, `f_vi_tri` để tìm map cha và nối tầng lớn hơn.
 * Ghi block AUTO vào chính map đó + block AUTO danh sách map trực thuộc ở các map lớn hơn.
 */
import { normalizeAsciiText, splitStatusHierarchyTokens } from './statusHierarchyParser.js';
import { getEntityAutoFieldValue, setEntityAutoFieldValue } from './tabAutoSyncFieldMap.js';
import {
  AUTO_SYNC_ENGINE_MAP_HIERARCHY,
  isEntityAutoSyncDisabled,
  isEntityAutoSyncLocked,
} from './autoSyncEntityPrefs.js';
import { hasAutoSyncFeature, isAutoSyncExplicitlyOff } from './tabAutoSyncRole.js';
import { isListCardEntity } from './collectionListCardSync.js';

const AUTO_MAP_META_START = '<!-- AUTO_MAP_HIERARCHY_META:START -->';
const AUTO_MAP_META_END = '<!-- AUTO_MAP_HIERARCHY_META:END -->';
const AUTO_MAP_CHILDREN_START = '<!-- AUTO_MAP_CHILDREN_LIST:START -->';
const AUTO_MAP_CHILDREN_END = '<!-- AUTO_MAP_CHILDREN_LIST:END -->';
const MAP_META_TITLE = '## Phân tầng bản đồ (AUTO)';
const MAP_CHILDREN_TITLE = '## Bản đồ trực thuộc';
const MAP_AUTO_END = '> (Tự động cập nhật theo cây bản đồ)';
const DEFAULT_LEVEL = { label: 'Địa Danh', rank: 40 };
const GENERIC_MAP_PARENT_KEYS = new Set([
  'dia danh',
  'ban do',
  'bi canh',
  'khu vuc',
  'thanh/tran',
  'thanh',
  'tran',
  'chau',
  'de quoc',
  'gioi',
  'tinh cau',
  'vi dien',
  'dai luc',
]);

function safeString(v) {
  if (v == null || v === 'null' || v === 'undefined') return '';
  return String(v);
}

function escapeRegExp(value) {
  return safeString(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeAscii(v) {
  return normalizeAsciiText(v);
}

function buildMapFieldContext(mapPath = {}) {
  return {
    activeTabLon: mapPath.lonId || '',
    activeTabNho: mapPath.nhoId || '',
    currentTabConfig: mapPath.currentTabConfig || null,
    parentLabel: mapPath.parentLabel || '',
  };
}

function removeAutoBlock(baseText, start, end) {
  const text = safeString(baseText);
  const sIdx = text.indexOf(start);
  const eIdx = text.indexOf(end);
  if (sIdx < 0 || eIdx <= sIdx) return text.trim();
  return `${text.slice(0, sIdx)}${text.slice(eIdx + end.length)}`.trim();
}

function removeAutoSection(baseText, title, endLine) {
  const text = safeString(baseText);
  if (!title || !endLine) return text.trim();
  const pattern = new RegExp(`${escapeRegExp(title)}[\\s\\S]*?${escapeRegExp(endLine)}\\s*`, 'g');
  return text.replace(pattern, '').trim();
}

function mergeAutoSection(baseText, title, endLine, bodyLines = []) {
  const body = (Array.isArray(bodyLines) ? bodyLines : [bodyLines]).filter(Boolean);
  const cleaned = removeAutoSection(baseText, title, endLine);
  if (body.length === 0) return cleaned;
  const section = [title, ...body, endLine].join('\n');
  return `${cleaned}${cleaned ? '\n\n' : ''}${section}`.trim();
}

/** Dòng footer AUTO map còn sót (không còn tiêu đề ##) — hay gặp trên thẻ Danh Sách do đồng bộ cũ. */
function removeOrphanMapAutoFooterLines(baseText) {
  const footer = MAP_AUTO_END.trim();
  const filtered = safeString(baseText)
    .split('\n')
    .filter((line) => line.trim() !== footer);
  return filtered.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function forEachCollectionEntity(nov, cb) {
  const data = nov?.data;
  if (!data || typeof data !== 'object') return;
  Object.values(data).forEach((lonData) => {
    if (!lonData || typeof lonData !== 'object') return;
    Object.values(lonData).forEach((nhoData) => {
      const entities = Array.isArray(nhoData?.entities) ? nhoData.entities : [];
      entities.forEach((entity) => cb(entity));
    });
  });
}

function stripMapHierarchyAutoBlocksFromNovel(nov) {
  let changed = false;
  forEachCollectionEntity(nov, (entity) => {
    if (!entity || typeof entity !== 'object') return;
    if (isEntityAutoSyncLocked(entity, AUTO_SYNC_ENGINE_MAP_HIERARCHY)) return;
    const original = safeString(entity.info || '');
    let next = removeAutoSection(
      removeAutoSection(
        removeAutoBlock(
          removeAutoBlock(original, AUTO_MAP_META_START, AUTO_MAP_META_END),
          AUTO_MAP_CHILDREN_START,
          AUTO_MAP_CHILDREN_END
        ),
        MAP_META_TITLE,
        MAP_AUTO_END
      ),
      MAP_CHILDREN_TITLE,
      MAP_AUTO_END
    );
    if (isListCardEntity(entity)) {
      next = removeOrphanMapAutoFooterLines(next);
    }
    if (next !== original) {
      entity.info = next;
      changed = true;
    }
  });
  return changed;
}

function detectMapLevelInfo(...inputs) {
  for (const raw of inputs) {
    const n = normalizeAscii(raw);
    if (!n) continue;
    if (n.includes('vi dien')) return { label: 'Vị Diện', rank: 120 };
    if (n.includes('tinh cau') || n.includes('tinh vuc')) return { label: 'Tinh Cầu', rank: 110 };
    if (n.includes('gioi') && !n.includes('bien gioi')) return { label: 'Giới', rank: 105 };
    if (n.includes('dai luc')) return { label: 'Đại Lục', rank: 100 };
    if (n.includes('chau')) return { label: 'Châu', rank: 90 };
    if (n.includes('de quoc') || n.includes('vuong trieu') || n.includes('quoc')) return { label: 'Đế Quốc', rank: 80 };
    if (n.includes('khu vuc') || n.includes('vuc') || n.includes('bien gioi')) return { label: 'Khu Vực', rank: 70 };
    if (n.includes('thanh') || n.includes('tran') || n.includes('phu') || n.includes('quan') || n.includes('huyen')) {
      return { label: 'Thành/Trấn', rank: 60 };
    }
  }
  return DEFAULT_LEVEL;
}

function formatMapMeta(record) {
  const levelLabel = safeString(record?.levelLabel).trim() || DEFAULT_LEVEL.label;
  const scaleLabel = safeString(record?.scaleLabel).trim();
  const parts = [levelLabel];
  if (scaleLabel && normalizeAscii(scaleLabel) !== normalizeAscii(levelLabel)) parts.push(scaleLabel);
  return parts.join(' · ');
}

function splitMapParentTokens(pathText) {
  const raw = safeString(pathText)
    .replace(/[>→»|/\\]+/g, ' - ')
    .replace(/[•·●]+/g, ' - ')
    .replace(/[;,]+/g, ' - ')
    .replace(/\r?\n+/g, ' - ')
    .trim();
  if (!raw) return [];
  return splitStatusHierarchyTokens(raw);
}

function isGenericMapParentToken(token) {
  const key = normalizeAscii(token);
  if (!key) return true;
  return GENERIC_MAP_PARENT_KEYS.has(key);
}

function replaceMapPathNames(pathText, oldName, newName) {
  const oldKey = normalizeAscii(oldName);
  const nextName = safeString(newName).trim();
  const tokens = splitMapParentTokens(pathText);
  if (!oldKey || !nextName || tokens.length === 0) {
    return { text: safeString(pathText), changed: false };
  }
  let changed = false;
  const nextTokens = tokens.map((token) => {
    if (normalizeAscii(token) !== oldKey) return token;
    changed = true;
    return nextName;
  });
  return {
    text: changed ? nextTokens.join(' - ') : safeString(pathText),
    changed,
  };
}

function extractMapParentPath(entity, mapContext = {}) {
  const explicit =
    getEntityAutoFieldValue(entity, mapContext, 'parent_path') ||
    safeString(entity?.dynamicData?.f_vi_tri).trim();
  if (explicit) return { raw: explicit, fromStatusFallback: false };

  const statusText =
    getEntityAutoFieldValue(entity, mapContext, 'status', { fallbackToStatus: true }) ||
    safeString(entity?.dynamicData?.f_status || entity?.status).trim();
  if (!statusText) return { raw: '', fromStatusFallback: false };

  const statusLevel = detectMapLevelInfo(statusText);
  const ownLevel = detectMapLevelInfo(
    getEntityAutoFieldValue(entity, mapContext, 'title') || entity?.dynamicData?.f_title,
    entity?.name
  );
  const looksLikeHierarchy = splitMapParentTokens(statusText).length > 1;
  const looksLikeOtherMap =
    statusLevel.label !== DEFAULT_LEVEL.label &&
    normalizeAscii(statusText) !== normalizeAscii(entity?.name) &&
    normalizeAscii(statusText) !== normalizeAscii(ownLevel.label);

  if (!looksLikeHierarchy && !looksLikeOtherMap) {
    return { raw: '', fromStatusFallback: false };
  }
  return { raw: statusText, fromStatusFallback: true };
}

export function isMapCollectionScope({ activeTabLon = '', activeTabNho = '', currentTabConfig = null, parentLabel = '' } = {}) {
  if (isAutoSyncExplicitlyOff(currentTabConfig)) return false;
  if (hasAutoSyncFeature({ activeTabLon, activeTabNho, currentTabConfig, parentLabel }, 'map')) {
    return true;
  }
  const lon = normalizeAscii(activeTabLon);
  const nho = normalizeAscii(activeTabNho || currentTabConfig?.id || '');
  const label = normalizeAscii(currentTabConfig?.label || '');
  const parent = normalizeAscii(parentLabel || currentTabConfig?._parentLabel || '');
  if (nho === 'dia-danh' || lon === 'ban-do') return true;
  if (label.includes('ban do') || label.includes('dia danh') || label.includes('bi canh')) return true;
  return parent.includes('ban do');
}

function findMapTabPaths(nov) {
  const out = [];
  for (const lon of nov?.tabsConfig || []) {
    for (const nho of lon?.subTabs || []) {
      if (nho?.viewType !== 'collection-track') continue;
      if (isMapCollectionScope({ activeTabLon: lon.id, activeTabNho: nho.id, currentTabConfig: nho, parentLabel: lon.label })) {
        out.push({
          lonId: lon.id,
          nhoId: nho.id,
          parentLabel: lon.label || '',
          currentTabConfig: nho,
        });
      }
    }
  }
  return out;
}

function ensureCollectionTabData(nov, lonId, nhoId) {
  if (!nov.data) nov.data = {};
  if (!nov.data[lonId]) nov.data[lonId] = {};
  const td = nov.data[lonId][nhoId];
  if (!td || typeof td !== 'object') {
    nov.data[lonId][nhoId] = { overview: '', entities: [] };
  } else if (!Array.isArray(td.entities)) {
    td.entities = [];
  }
  return nov.data[lonId][nhoId];
}

function ensureMapEntityByName(tabData, name, mapContext = {}) {
  const cleanName = safeString(name).trim();
  const key = normalizeAscii(cleanName);
  let ent = (tabData.entities || []).find((item) => normalizeAscii(item?.name) === key);
  if (!ent) {
    const detected = detectMapLevelInfo(cleanName);
    ent = {
      id: `ent-${Math.random().toString(36).slice(2, 10)}`,
      name: cleanName,
      avatar: '',
      rawText: '',
      status: '',
      dynamicData: {
        ...(detected.label !== DEFAULT_LEVEL.label ? { f_title: detected.label } : {}),
      },
      info: '',
      milestones: [],
      images: [],
    };
    setEntityAutoFieldValue(ent, mapContext, 'title', detected.label);
    tabData.entities.push(ent);
    return ent;
  }
  const currentTitle =
    getEntityAutoFieldValue(ent, mapContext, 'title') ||
    safeString(ent.dynamicData?.f_title).trim();
  if (!currentTitle) {
    const detected = detectMapLevelInfo(cleanName);
    if (detected.label !== DEFAULT_LEVEL.label) {
      const updated = setEntityAutoFieldValue(ent, mapContext, 'title', detected.label);
      if (!updated) {
        if (!ent.dynamicData || typeof ent.dynamicData !== 'object') ent.dynamicData = {};
        ent.dynamicData.f_title = detected.label;
      }
    }
  }
  return ent;
}

function buildMapRecords(entities, mapContext = {}) {
  return (entities || [])
    .map((entity) => {
      const name = safeString(entity?.name).trim();
      const nameKey = normalizeAscii(name);
      if (!nameKey) return null;
      const parentSource = extractMapParentPath(entity, mapContext);
      const titleValue =
        getEntityAutoFieldValue(entity, mapContext, 'title') ||
        safeString(entity?.dynamicData?.f_title).trim();
      const rawStatus =
        getEntityAutoFieldValue(entity, mapContext, 'status', { fallbackToStatus: true }) ||
        safeString(entity?.dynamicData?.f_status || entity?.status).trim();
      const levelInfo = detectMapLevelInfo(titleValue, name, rawStatus);
      const scaleLabel = parentSource.fromStatusFallback ? '' : rawStatus;
      return {
        entity,
        entityId: entity?.id,
        name,
        nameKey,
        levelLabel: levelInfo.label,
        levelRank: levelInfo.rank,
        scaleLabel,
      parentTokens: splitMapParentTokens(parentSource.raw).filter((token) => !isGenericMapParentToken(token)),
        fullChain: [],
        fullChainKeys: [],
      };
    })
    .filter(Boolean);
}

function mergeUniqueNames(items, selfKey = '') {
  const out = [];
  const seen = new Set();
  const ignoreKey = normalizeAscii(selfKey);
  (items || []).forEach((item) => {
    const name = safeString(item).trim();
    const key = normalizeAscii(name);
    if (!key || key === ignoreKey || seen.has(key)) return;
    seen.add(key);
    out.push(name);
  });
  return out;
}

function resolveFullChain(record, byName, stack = new Set()) {
  if (!record) return [];
  if (stack.has(record.nameKey)) return [];
  const parentTokens = Array.isArray(record.parentTokens) ? record.parentTokens : [];
  const directParent = parentTokens[0];
  if (!directParent) return [];

  const nextStack = new Set(stack);
  nextStack.add(record.nameKey);

  const directKey = normalizeAscii(directParent);
  const directRecord = byName.get(directKey);
  const inherited = directRecord && directRecord.nameKey !== record.nameKey
    ? resolveFullChain(directRecord, byName, nextStack)
    : [];

  return mergeUniqueNames([directParent, ...parentTokens.slice(1), ...inherited], record.name);
}

function hasMeaningfulMapMeta(record) {
  if (!record) return false;
  if (record.fullChain.length > 0) return true;
  if (safeString(record.scaleLabel).trim()) return true;
  return safeString(record.levelLabel).trim() && record.levelLabel !== DEFAULT_LEVEL.label;
}

function buildMapMetaBlock(record) {
  const lines = [`- Loại địa danh: ${record.levelLabel}`];
  const scaleLabel = safeString(record.scaleLabel).trim();
  if (scaleLabel && normalizeAscii(scaleLabel) !== normalizeAscii(record.levelLabel)) {
    lines.push(`- Quy mô / cấp: ${scaleLabel}`);
  }
  if (record.fullChain[0]) {
    lines.push(`- Trực thuộc: [[${record.fullChain[0]}]]`);
  }
  record.fullChain.slice(1).forEach((name, idx) => {
    lines.push(`- Ngoại tầng ${idx + 1}: [[${name}]]`);
  });
  return lines;
}

function getMapRecordMeta(name, byName) {
  const key = normalizeAscii(name);
  const rec = byName.get(key);
  if (rec) return { levelLabel: rec.levelLabel, levelRank: rec.levelRank, scaleLabel: rec.scaleLabel };
  const detected = detectMapLevelInfo(name);
  return { levelLabel: detected.label, levelRank: detected.rank, scaleLabel: '' };
}

function compareMapNodes(a, b) {
  const rankDiff = (b?.meta?.levelRank || 0) - (a?.meta?.levelRank || 0);
  if (rankDiff !== 0) return rankDiff;
  return normalizeAscii(a?.label).localeCompare(normalizeAscii(b?.label));
}

function getOrCreateTreeNode(parent, label, byName) {
  const key = normalizeAscii(label);
  if (!parent.children.has(key)) {
    parent.children.set(key, { label, meta: getMapRecordMeta(label, byName), children: new Map() });
  }
  return parent.children.get(key);
}

function buildMapDescendantsIndex(records) {
  const byAncestor = new Map();
  (records || []).forEach((record) => {
    if (!record) return;
    const keys = Array.isArray(record.fullChainKeys) ? record.fullChainKeys : [];
    keys.forEach((ancestorKey, targetIndex) => {
      if (!ancestorKey) return;
      if (!byAncestor.has(ancestorKey)) byAncestor.set(ancestorKey, []);
      byAncestor.get(ancestorKey).push({ record, targetIndex });
    });
  });
  return byAncestor;
}

function buildMapChildrenBlock(targetRecord, byName, descendantsIndex) {
  if (!targetRecord) return [];
  const root = { children: new Map() };
  const descendants = descendantsIndex?.get(targetRecord.nameKey) || [];

  descendants.forEach(({ record, targetIndex }) => {
    if (!record || record.entityId === targetRecord.entityId) return;
    if (targetIndex < 0) return;

    const descendants = record.fullChain.slice(0, targetIndex).reverse();
    let cursor = root;
    descendants.forEach((name) => {
      cursor = getOrCreateTreeNode(cursor, name, byName);
    });
    getOrCreateTreeNode(cursor, record.name, byName);
  });

  if (root.children.size === 0) return [];

  const lines = [];
  const renderNode = (node, depth) => {
    const indent = '  '.repeat(depth);
    lines.push(`${indent}- [[${node.label}]] (${formatMapMeta(node.meta)})`);
    [...node.children.values()].sort(compareMapNodes).forEach((child) => renderNode(child, depth + 1));
  };

  [...root.children.values()].sort(compareMapNodes).forEach((child) => renderNode(child, 0));
  return lines;
}

function syncMapHierarchyInTab(mapTab, mapPath = {}) {
  if (!Array.isArray(mapTab?.entities) || mapTab.entities.length === 0) return false;
  let changed = false;
  const mapContext = buildMapFieldContext(mapPath);
  const referencedParents = new Set();
  (mapTab.entities || []).forEach((ent) => {
    if (isEntityAutoSyncDisabled(ent, AUTO_SYNC_ENGINE_MAP_HIERARCHY)) return;
    const parentPath =
      getEntityAutoFieldValue(ent, mapContext, 'parent_path') ||
      ent?.dynamicData?.f_vi_tri;
    splitMapParentTokens(parentPath).forEach((name) => {
      if (isGenericMapParentToken(name)) return;
      const key = normalizeAscii(name);
      if (key) referencedParents.add(name);
    });
  });
  referencedParents.forEach((name) => {
    const beforeCount = mapTab.entities.length;
    ensureMapEntityByName(mapTab, name, mapContext);
    if (mapTab.entities.length !== beforeCount) changed = true;
  });

  const records = buildMapRecords(
    (mapTab.entities || []).filter((entity) => !isEntityAutoSyncDisabled(entity, AUTO_SYNC_ENGINE_MAP_HIERARCHY)),
    mapContext
  );
  const byName = new Map(records.map((record) => [record.nameKey, record]));
  records.forEach((record) => {
    record.fullChain = resolveFullChain(record, byName);
    record.fullChainKeys = record.fullChain.map((name) => normalizeAscii(name)).filter(Boolean);
  });
  const descendantsIndex = buildMapDescendantsIndex(records);

  records.forEach((record) => {
    const original = safeString(record.entity?.info || '');
    if (isListCardEntity(record.entity)) return;
    if (isEntityAutoSyncLocked(record.entity, AUTO_SYNC_ENGINE_MAP_HIERARCHY)) return;
    const base = removeAutoSection(
      removeAutoSection(
        removeAutoBlock(
          removeAutoBlock(original, AUTO_MAP_META_START, AUTO_MAP_META_END),
          AUTO_MAP_CHILDREN_START,
          AUTO_MAP_CHILDREN_END
        ),
        MAP_META_TITLE,
        MAP_AUTO_END
      ),
      MAP_CHILDREN_TITLE,
      MAP_AUTO_END
    );

    let next = base;
    if (hasMeaningfulMapMeta(record)) {
      next = mergeAutoSection(next, MAP_META_TITLE, MAP_AUTO_END, buildMapMetaBlock(record));
    }
    const childBlock = buildMapChildrenBlock(record, byName, descendantsIndex);
    if (Array.isArray(childBlock) && childBlock.length > 0) {
      next = mergeAutoSection(next, MAP_CHILDREN_TITLE, MAP_AUTO_END, childBlock);
    }

    if (next !== original) {
      record.entity.info = next;
      changed = true;
    }
  });

  return changed;
}

export function syncAllMapHierarchyAutoBlocks(nov) {
  if (!nov) return false;
  let changed = stripMapHierarchyAutoBlocksFromNovel(nov);
  const mapPaths = findMapTabPaths(nov);
  if (mapPaths.length === 0) return changed;

  mapPaths.forEach((mapPath) => {
    const mapTab = ensureCollectionTabData(nov, mapPath.lonId, mapPath.nhoId);
    changed = syncMapHierarchyInTab(mapTab, mapPath) || changed;
  });
  return changed;
}

export function syncMapHierarchyNameReferences(nov, { entityId = '', oldName = '', newName = '' } = {}) {
  if (!nov) return 0;
  const mapPaths = findMapTabPaths(nov);
  if (mapPaths.length === 0) return 0;
  const oldKey = normalizeAscii(oldName);
  const nextName = safeString(newName).trim();
  if (!oldKey || !nextName || oldKey === normalizeAscii(nextName)) return 0;

  let touched = 0;
  mapPaths.forEach((mapPath) => {
    const mapTab = ensureCollectionTabData(nov, mapPath.lonId, mapPath.nhoId);
    const mapContext = buildMapFieldContext(mapPath);
    (mapTab.entities || []).forEach((entity) => {
      if (!entity || entity.id === entityId) return;
      if (!entity.dynamicData || typeof entity.dynamicData !== 'object') entity.dynamicData = {};

      const explicitPath =
        getEntityAutoFieldValue(entity, mapContext, 'parent_path') ||
        safeString(entity.dynamicData.f_vi_tri).trim();
      if (explicitPath) {
        const replaced = replaceMapPathNames(explicitPath, oldName, nextName);
        if (replaced.changed) {
          const updated = setEntityAutoFieldValue(entity, mapContext, 'parent_path', replaced.text);
          if (!updated) entity.dynamicData.f_vi_tri = replaced.text;
          touched += 1;
        }
        return;
      }

      const fallback = extractMapParentPath(entity, mapContext);
      if (!fallback.fromStatusFallback) return;
      const rawStatus =
        getEntityAutoFieldValue(entity, mapContext, 'status', { fallbackToStatus: true }) ||
        safeString(entity.dynamicData.f_status || entity.status).trim();
      const replaced = replaceMapPathNames(rawStatus, oldName, nextName);
      if (!replaced.changed) return;
      const updated = setEntityAutoFieldValue(entity, mapContext, 'status', replaced.text);
      if (!updated) entity.dynamicData.f_status = replaced.text;
      entity.status = replaced.text;
      touched += 1;
    });
  });

  return touched;
}

export function syncMapHierarchyAutoBlocks(nov, { entityId } = {}) {
  if (!nov) return false;
  const mapPaths = findMapTabPaths(nov);
  if (mapPaths.length === 0) return false;
  if (entityId) {
    const found = mapPaths.some((mapPath) => {
      const mapTab = ensureCollectionTabData(nov, mapPath.lonId, mapPath.nhoId);
      return (mapTab.entities || []).some((ent) => ent?.id === entityId);
    });
    if (!found) return false;
  }
  return syncAllMapHierarchyAutoBlocks(nov);
}
