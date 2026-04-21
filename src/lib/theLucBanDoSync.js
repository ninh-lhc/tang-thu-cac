/**
 * Đồng bộ quan hệ Thế Lực -> Bản đồ.
 *
 * Hỗ trợ 2 kiểu nhập:
 * - Chuỗi gộp trong `f_status`: "Loại - Cấp bậc - Địa điểm 1 - Địa điểm 2 ..."
 * - Trường tách: `f_status` (cấp bậc) + `f_dia_ban` (địa bàn), loại suy từ tab/field.
 *
 * Chỉ ghi vào khối AUTO, không ghi đè phần người dùng viết tay.
 */
import {
  normalizeAsciiText,
  parseRankNumber as parseStatusRankNumber,
  splitStatusHierarchyTokens,
} from './statusHierarchyParser.js';
import { buildPreferredWikiName } from './entityWikiDisambiguation.js';
import { isMapCollectionScope } from './mapHierarchySync.js';
import { getEntityAutoFieldValue, setEntityAutoFieldValue } from './tabAutoSyncFieldMap.js';
import {
  AUTO_SYNC_ENGINE_FORCE_MAP,
  isEntityAutoSyncDisabled,
  isEntityAutoSyncLocked,
} from './autoSyncEntityPrefs.js';
import { hasAutoSyncFeature, isAutoSyncExplicitlyOff } from './tabAutoSyncRole.js';
import { buildAutoSyncTargetPath, collectExplicitAutoSyncLinkSources } from './tabAutoSyncLinks.js';
import { classifyOrgType, inferOrgTypeFromContext } from './forceOrgTypeInfer.js';

const AUTO_FORCE_BLOCK_START = '<!-- AUTO_THE_LUC_META:START -->';
const AUTO_FORCE_BLOCK_END = '<!-- AUTO_THE_LUC_META:END -->';
const AUTO_MAP_BLOCK_START = '<!-- AUTO_MAP_THE_LUC_LIST:START -->';
const AUTO_MAP_BLOCK_END = '<!-- AUTO_MAP_THE_LUC_LIST:END -->';
const FORCE_META_TITLE = '## Đồng bộ Thế Lực (AUTO)';
/** @deprecated Chỉ còn dùng khi strip ghi chú cũ (đã bỏ khối này khỏi thẻ thế lực). */
const FORCE_MAP_STRATA_TITLE = '## Phân tầng bản đồ (thế lực) (AUTO)';
const FORCE_MAP_LIST_TITLE = '## Thế lực theo vị trí (AUTO)';
const FORCE_AUTO_END = '> (Tự động cập nhật theo Thế Lực ↔ Bản đồ)';
const FORCE_MAP_STRATA_END = '> (Theo địa bàn đã nhập; đồng bộ với tab Bản đồ khi có)';
const FORCE_SYNC_WARNING_LIMIT = 3;
const FORCE_TYPE_GROUP_ORDER = [
  'Đế Quốc',
  'Chủng Tộc',
  'Gia Tộc',
  'Học Viện',
  'Tông Môn',
  'Thương Minh',
  'Thế Lực Khác',
];

function safeString(v) {
  if (v == null || v === 'null' || v === 'undefined') return '';
  return String(v);
}

function normalizeAscii(v) {
  return normalizeAsciiText(v);
}

function escapeRegExp(value) {
  return safeString(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildAutoFieldContext(context = {}) {
  return {
    activeTabLon: context.sourceLonId || '',
    activeTabNho: context.sourceNhoId || '',
    currentTabConfig: context.sourceNhoConfig || null,
    parentLabel: context.sourceParentLabel || '',
  };
}

function isForceParentKey(value) {
  const key = normalizeAscii(value).replace(/-/g, ' ');
  return key === 'the luc' || key.includes('the luc');
}

export function isForceCollectionScope({
  activeTabLon = '',
  activeTabNho = '',
  currentTabConfig = null,
  parentLabel = '',
} = {}) {
  if (isAutoSyncExplicitlyOff(currentTabConfig)) return false;
  if (hasAutoSyncFeature({ activeTabLon, activeTabNho, currentTabConfig, parentLabel }, 'force')) {
    return true;
  }
  if (currentTabConfig?.viewType && currentTabConfig.viewType !== 'collection-track') return false;
  const candidates = [parentLabel, currentTabConfig?._parentLabel, activeTabLon];
  if (!currentTabConfig?.viewType) candidates.push(activeTabNho);
  return candidates.some((value) => isForceParentKey(value));
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

function stripTheLucMapAutoBlocksFromNovel(nov) {
  let changed = false;
  forEachCollectionEntity(nov, (entity) => {
    if (!entity || typeof entity !== 'object') return;
    if (isEntityAutoSyncLocked(entity, AUTO_SYNC_ENGINE_FORCE_MAP)) return;
    const original = safeString(entity.info || '');
    const next = removeAutoBlock(
      removeAutoBlock(original, AUTO_FORCE_BLOCK_START, AUTO_FORCE_BLOCK_END),
      AUTO_MAP_BLOCK_START,
      AUTO_MAP_BLOCK_END
    );
    const cleaned = removeAutoSection(
      removeAutoSection(removeAutoSection(next, FORCE_META_TITLE, FORCE_AUTO_END), FORCE_MAP_STRATA_TITLE, FORCE_MAP_STRATA_END),
      FORCE_MAP_LIST_TITLE,
      FORCE_AUTO_END
    );
    if (cleaned !== original) {
      entity.info = cleaned;
      changed = true;
    }
  });
  return changed;
}

function splitStatusParts(statusText) {
  return splitStatusHierarchyTokens(statusText);
}

function parseRankNumber(rankText) {
  return parseStatusRankNumber(rankText);
}

function isLikelyRankText(text) {
  const raw = safeString(text).trim();
  if (!raw) return false;
  if (Number.isFinite(parseRankNumber(raw))) return true;
  const n = normalizeAscii(raw).replace(/[^a-z0-9]+/g, ' ');
  if (/\b(cap|bac|tang|pham|giai)\b/.test(n)) return true;
  if (/\b(de nhat|de nhi|de tam|de tu|de ngu|de luc|de that|de bat|de cuu|de thap)\b/.test(n)) return true;
  if (/\b(so ky|trung ky|hau ky|vien man|dinh phong|dot pha)\b/.test(n)) return true;
  return false;
}

function dedupeNameList(list) {
  const out = [];
  const seen = new Set();
  (list || []).forEach((item) => {
    const name = safeString(item).trim();
    const key = normalizeAscii(name);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(name);
  });
  return out;
}

function buildForceMeta(orgType, rankText, locations, realmSystem = '') {
  const org = safeString(orgType).trim();
  const rank = safeString(rankText).trim();
  const system = safeString(realmSystem).trim();
  const locs = dedupeNameList(locations);
  if (!org || !rank || locs.length === 0) return null;
  return {
    orgType: org,
    realmSystem: system,
    rankText: rank,
    rankNum: parseRankNumber(rank),
    locations: locs,
    tailPath: locs.join(' > '),
  };
}

function splitLocationTokens(locationText) {
  const raw = safeString(locationText)
    .replace(/[>→»|]+/g, ' - ')
    .replace(/[,\n;]+/g, ' - ')
    .trim();
  if (!raw) return [];
  return dedupeNameList(splitStatusParts(raw));
}

function parseForceStatus(statusText, { fallbackOrgType = '', fallbackRealmSystem = '' } = {}) {
  const parts = splitStatusParts(statusText);
  const fallbackType = safeString(fallbackOrgType).trim();
  if (parts.length === 0) return null;

  if (parts.length >= 3 && !isLikelyRankText(parts[0])) {
    return buildForceMeta(parts[0], parts[1], parts.slice(2), fallbackRealmSystem);
  }
  if (fallbackType && parts.length >= 2 && isLikelyRankText(parts[0])) {
    return buildForceMeta(fallbackType, parts[0], parts.slice(1), fallbackRealmSystem);
  }
  if (parts.length >= 3) {
    return buildForceMeta(parts[0], parts[1], parts.slice(2), fallbackRealmSystem);
  }
  return null;
}

function parseForceMetaFromEntity(entity, context = {}) {
  const dyn = entity?.dynamicData && typeof entity.dynamicData === 'object' ? entity.dynamicData : {};
  const autoCtx = buildAutoFieldContext(context);
  const fallbackOrgType = inferOrgTypeFromContext({
    dynamicData: dyn,
    sourceNhoId: context.sourceNhoId,
    sourceNhoLabel: context.sourceNhoLabel,
    typeFieldValue: getEntityAutoFieldValue(entity, autoCtx, 'type'),
  });
  const fallbackRealmSystem =
    getEntityAutoFieldValue(entity, autoCtx, 'rank_system') ||
    safeString(dyn.f_he_cap_the_luc || dyn.f_he_phan_cap).trim();

  const statusLine =
    getEntityAutoFieldValue(entity, autoCtx, 'status', { fallbackToStatus: true }) ||
    safeString(dyn.f_status || entity?.status).trim();
  const statusMeta = parseForceStatus(statusLine, { fallbackOrgType, fallbackRealmSystem });
  if (statusMeta) return statusMeta;

  const rankFromStatus =
    getEntityAutoFieldValue(entity, autoCtx, 'status') ||
    safeString(dyn.f_status).trim();
  const rankFromCap = safeString(dyn.f_cap).trim();
  const rankText = isLikelyRankText(rankFromStatus)
    ? rankFromStatus
    : (isLikelyRankText(rankFromCap) ? rankFromCap : '');
  const locationText =
    getEntityAutoFieldValue(entity, autoCtx, 'location') ||
    safeString(dyn.f_dia_ban || dyn.f_vi_tri).trim();
  const locations = splitLocationTokens(locationText);
  if (!rankText || locations.length === 0) return null;
  return buildForceMeta(fallbackOrgType, rankText, locations, fallbackRealmSystem);
}

function detectLocationLevelName(loc) {
  const n = normalizeAscii(loc);
  if (n.includes('tinh cau') || n.includes('tinh vuc')) return { label: 'Tinh Cầu', rank: 100 };
  if (n.includes('dai luc')) return { label: 'Đại Lục', rank: 90 };
  if (n.includes('gioi') && !n.includes('bien gioi')) return { label: 'Giới', rank: 85 };
  if (n.includes('chau')) return { label: 'Châu', rank: 80 };
  if (n.includes('de quoc') || n.includes('quoc') || n.includes('trieu')) return { label: 'Đế Quốc', rank: 70 };
  if (n.includes('vuc') || n.includes('bien gioi') || n.includes('khu')) return { label: 'Khu Vực', rank: 60 };
  if (n.includes('thanh') || n.includes('tran') || n.includes('phu')) return { label: 'Thành/Trấn', rank: 50 };
  return { label: 'Địa Điểm', rank: 40 };
}

function isDetailedMapLayout(locationName) {
  return detectLocationLevelName(locationName).label !== 'Tinh Cầu';
}

function buildForceWikiLabel(row, duplicateNameCounts) {
  const baseName = safeString(row?.name).trim();
  if (!baseName) return '';
  const nameKey = normalizeAscii(baseName);
  if ((duplicateNameCounts?.get(nameKey) || 0) < 2) return baseName;
  const statusLine = [row?.meta?.orgType, row?.meta?.rankText, ...(row?.meta?.locations || [])]
    .filter(Boolean)
    .join(' - ');
  return buildPreferredWikiName({ name: baseName, statusLine });
}

function buildMapAutoBlockLines(locationName, rows, { detailedLayout, duplicateNameCounts }) {
  const byGroup = new Map(FORCE_TYPE_GROUP_ORDER.map((g) => [g, []]));
  rows.forEach((r) => {
    const g = classifyOrgType(r.meta.orgType);
    const bucket = byGroup.get(g) ?? byGroup.get('Thế Lực Khác');
    if (bucket) bucket.push(r);
  });

  const sectionLines = detailedLayout
    ? ['# Vị trí', '', `# [[${locationName}]]`]
    : ['## Vị trí'];

  FORCE_TYPE_GROUP_ORDER.forEach((g) => {
    const list = byGroup.get(g) || [];
    if (list.length === 0) return;
    if (detailedLayout) {
      sectionLines.push('');
      sectionLines.push(`## ${g}`);
      list.forEach((r) => {
        const realmSuffix = safeString(r?.meta?.realmSystem).trim() ? ` (${r.meta.realmSystem})` : '';
        sectionLines.push(`- [[${buildForceWikiLabel(r, duplicateNameCounts)}]] - ${r.meta.rankText}${realmSuffix}`);
      });
      return;
    }
    sectionLines.push(`### ${g}`);
    list.forEach((r, idx) => {
      const realmSuffix = safeString(r?.meta?.realmSystem).trim() ? ` (${r.meta.realmSystem})` : '';
      sectionLines.push(`${idx + 1}. [[${buildForceWikiLabel(r, duplicateNameCounts)}]] - ${r.meta.rankText}${realmSuffix} - ${r.meta.tailPath}`);
    });
  });

  return sectionLines;
}

function buildForceMetaBlockLines() {
  return [
    '> **Đồng bộ Thế Lực** dùng dữ liệu đã nhập ở **hồ sơ phía trên** (vd. *Thể chế*, *Cấp bậc*, *Địa bàn*, *Vị trí*…) để cập nhật tab **Bản đồ** và **Danh sách**. Không lặp lại nội dung tại đây — sửa các ô hồ sơ là đủ.',
  ];
}

export function summarizeTheLucMapSyncWarnings(warnings) {
  const list = dedupeSyncWarnings(warnings);
  if (list.length === 0) return '';

  const summarizeGroup = (type, intro) => {
    const items = list.filter((warning) => warning.type === type);
    if (items.length === 0) return '';
    const sample = items
      .slice(0, FORCE_SYNC_WARNING_LIMIT)
      .map((warning) => safeString(warning.locationName).trim())
      .filter(Boolean)
      .join(', ');
    const more = items.length > FORCE_SYNC_WARNING_LIMIT ? ` và ${items.length - FORCE_SYNC_WARNING_LIMIT} mục khác` : '';
    return `${intro}: ${sample}${more}.`;
  };

  return [
    summarizeGroup(
      'ambiguous_existing_location',
      'AUTO Thế Lực ↔ Bản Đồ bỏ qua vì có nhiều thẻ bản đồ trùng tên'
    ),
    summarizeGroup(
      'ambiguous_target_tab',
      'AUTO Thế Lực ↔ Bản Đồ bỏ qua vì không xác định chắc tab bản đồ đích'
    ),
  ]
    .filter(Boolean)
    .join(' ');
}

function findMapTabPaths(nov) {
  const out = [];
  for (const lon of nov.tabsConfig || []) {
    for (const nho of lon.subTabs || []) {
      if (nho.viewType !== 'collection-track') continue;
      if (
        isMapCollectionScope({
          activeTabLon: lon.id,
          activeTabNho: nho.id,
          currentTabConfig: nho,
          parentLabel: lon.label || '',
        })
      ) {
        out.push({
          lonId: lon.id,
          nhoId: nho.id,
          lonLabel: safeString(lon.label || lon.id),
          nhoLabel: safeString(nho.label || nho.id),
          currentTabConfig: nho,
          parentLabel: safeString(lon.label || ''),
        });
      }
    }
  }
  return out;
}

function findForceTabPaths(nov, { sourceLonId = '' } = {}) {
  const out = [];
  for (const lon of nov.tabsConfig || []) {
    if (sourceLonId && lon?.id !== sourceLonId) continue;
    for (const nho of lon.subTabs || []) {
      if (
        !isForceCollectionScope({
          activeTabLon: lon.id,
          activeTabNho: nho.id,
          currentTabConfig: nho,
          parentLabel: lon.label || '',
        })
      ) {
        continue;
      }
      out.push({
        lonId: lon.id,
        nhoId: nho.id,
        lonLabel: safeString(lon.label || lon.id),
        nhoLabel: safeString(nho.label || nho.id),
        currentTabConfig: nho,
        parentLabel: safeString(lon.label || ''),
      });
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
  if (!tabData || typeof tabData !== 'object') {
    return { entity: null, created: false };
  }
  if (!Array.isArray(tabData.entities)) tabData.entities = [];
  const key = normalizeAscii(name);
  let ent = tabData.entities.find((e) => normalizeAscii(e.name) === key);
  let created = false;
  if (!ent) {
    ent = {
      id: `ent-${Math.random().toString(36).slice(2, 10)}`,
      name: name.trim(),
      avatar: '',
      rawText: '',
      status: '',
      dynamicData: {},
      info: '',
      milestones: [],
      images: [],
    };
    const detected = detectLocationLevelName(name);
    setEntityAutoFieldValue(ent, mapContext, 'title', detected.label);
    tabData.entities.push(ent);
    created = true;
  }
  return { entity: ent, created };
}

function buildTabPathKey(path) {
  return `${safeString(path?.lonId)}::${safeString(path?.nhoId)}`;
}

function buildTabPathLabel(path) {
  const lonLabel = safeString(path?.lonLabel).trim();
  const nhoLabel = safeString(path?.nhoLabel).trim();
  if (lonLabel && nhoLabel) return lonLabel === nhoLabel ? lonLabel : `${lonLabel} > ${nhoLabel}`;
  return lonLabel || nhoLabel || buildTabPathKey(path);
}

function pushSyncWarning(warnings, warning) {
  if (!warning?.type) return;
  warnings.push({
    type: warning.type,
    locationName: safeString(warning.locationName).trim(),
    tabLabels: Array.isArray(warning.tabLabels) ? dedupeNameList(warning.tabLabels) : [],
  });
}

function dedupeSyncWarnings(warnings) {
  const out = [];
  const seen = new Set();
  for (const warning of warnings || []) {
    const key = [
      safeString(warning?.type),
      normalizeAscii(warning?.locationName),
      (warning?.tabLabels || []).map((label) => normalizeAscii(label)).sort().join('|'),
    ].join('::');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(warning);
  }
  return out;
}

function pickPreferredMapTabForLocation(item, targetsByName, mapPaths) {
  const targetNameKey = normalizeAscii(item?.name);
  const candidatePaths = [];
  const seenPathKeys = new Set();
  for (const row of item?.rows || []) {
    const locations = Array.isArray(row?.meta?.locations) ? row.meta.locations : [];
    for (const locName of locations) {
      const key = normalizeAscii(locName);
      if (!key || key === targetNameKey) continue;
      const targets = targetsByName.get(key) || [];
      if (targets.length !== 1) continue;
      const path = targets[0]?.path;
      const pathKey = buildTabPathKey(path);
      if (!path || seenPathKeys.has(pathKey)) continue;
      seenPathKeys.add(pathKey);
      candidatePaths.push(path);
    }
  }
  if (candidatePaths.length === 1) {
    return { mapPath: candidatePaths[0], reason: 'inferred_parent' };
  }
  if (candidatePaths.length > 1) {
    return { mapPath: null, reason: 'ambiguous_target_tab', candidatePaths };
  }
  if (mapPaths.length === 1) {
    return { mapPath: mapPaths[0], reason: 'single_map_tab' };
  }
  return { mapPath: null, reason: 'ambiguous_target_tab', candidatePaths: mapPaths };
}

export function buildForceRowsForLocation(forceEntities) {
  return forceEntities
    .filter((x) => x.meta)
    .sort((a, b) => {
      const ag = classifyOrgType(a.meta.orgType);
      const bg = classifyOrgType(b.meta.orgType);
      const t = FORCE_TYPE_GROUP_ORDER.indexOf(ag) - FORCE_TYPE_GROUP_ORDER.indexOf(bg);
      if (t !== 0) return t;
      const ar = Number.isFinite(a.meta.rankNum) ? a.meta.rankNum : -9999;
      const br = Number.isFinite(b.meta.rankNum) ? b.meta.rankNum : -9999;
      if (Number.isFinite(ar) && Number.isFinite(br) && ar !== br) return ar - br;
      if (Number.isFinite(ar) !== Number.isFinite(br)) return Number.isFinite(ar) ? -1 : 1;
      const n = normalizeAscii(a.name).localeCompare(normalizeAscii(b.name));
      if (n !== 0) return n;
      return normalizeAscii(a.meta.tailPath).localeCompare(normalizeAscii(b.meta.tailPath));
    });
}

export function syncTheLucMapAutoBlocksDetailed(nov, { sourceLonId, sourceNhoId, entityId } = {}) {
  if (!nov || !sourceLonId || !sourceNhoId || !entityId) {
    return { changed: false, warnings: [], applied: false, reason: 'invalid_input' };
  }

  const sourceLonCfg = (nov.tabsConfig || []).find((lon) => lon?.id === sourceLonId);
  const sourceNhoCfg = (sourceLonCfg?.subTabs || []).find((nho) => nho?.id === sourceNhoId) || null;
  if (
    !isForceCollectionScope({
      activeTabLon: sourceLonId,
      activeTabNho: sourceNhoId,
      currentTabConfig: sourceNhoCfg,
      parentLabel: sourceLonCfg?.label || '',
    })
  ) {
    return { changed: false, warnings: [], applied: false, reason: 'not_force_scope' };
  }

  const sourceTab = ensureCollectionTabData(nov, sourceLonId, sourceNhoId);
  const source = (sourceTab.entities || []).find((entity) => entity.id === entityId);
  if (!source) return { changed: false, warnings: [], applied: false, reason: 'source_not_found' };
  if (isEntityAutoSyncDisabled(source, AUTO_SYNC_ENGINE_FORCE_MAP)) {
    return { changed: false, warnings: [], applied: false, reason: 'source_disabled' };
  }

  const meta = parseForceMetaFromEntity(source, {
    sourceLonId,
    sourceNhoId,
    sourceNhoConfig: sourceNhoCfg,
    sourceNhoLabel: safeString(sourceNhoCfg?.label || sourceNhoId),
    sourceParentLabel: safeString(sourceLonCfg?.label || ''),
  });
  if (!meta) return { changed: false, warnings: [], applied: false, reason: 'invalid_force_meta' };

  const result = syncAllTheLucMapAutoBlocksDetailed(nov, { sourceLonId });
  return { ...result, applied: true };
}

export function syncTheLucMapAutoBlocks(nov, { sourceLonId, sourceNhoId, entityId }) {
  const result = syncTheLucMapAutoBlocksDetailed(nov, { sourceLonId, sourceNhoId, entityId });
  return Boolean(result.applied || result.changed);
  /*
  source.info = mergeAutoBlock(
    source.info,
    AUTO_FORCE_BLOCK_START,
    AUTO_FORCE_BLOCK_END,
    [
      '## Đồng bộ Thế Lực (AUTO)',
      `Loại Hình: ${meta.orgType}`,
      `Cấp Bậc: ${meta.rankText}`,
      'Vị Trí:',
      ...buildLocationHierarchyLines(meta.locations),
    ].join('\n')
  );

  syncAllTheLucMapAutoBlocks(nov, { sourceLonId });
  return true;
  */
}

export function syncAllTheLucMapAutoBlocksDetailed(nov, { sourceLonId } = {}) {
  if (!nov) return { changed: false, warnings: [], applied: false };

  let changed = stripTheLucMapAutoBlocksFromNovel(nov);
  const explicitGroups = collectExplicitAutoSyncLinkSources(nov?.tabsConfig, {
    sourceRoles: ['the-luc'],
  });
  const explicitTargetPathsBySourceKey = new Map();
  const explicitMapTargetPathKeys = new Set();
  explicitGroups.forEach((group) => {
    const sourcePathKey = buildTabPathKey(group.sourcePath);
    const targetPathKeys = new Set(group.targetPaths.map((targetPath) => buildAutoSyncTargetPath(targetPath.lonId, targetPath.nhoId)));
    if (targetPathKeys.size === 0) return;
    explicitTargetPathsBySourceKey.set(sourcePathKey, targetPathKeys);
    targetPathKeys.forEach((pathKey) => explicitMapTargetPathKeys.add(pathKey));
  });
  const useExplicitTargets = explicitTargetPathsBySourceKey.size > 0;

  const mapPaths = findMapTabPaths(nov)
    .filter((path) => !useExplicitTargets || explicitMapTargetPathKeys.has(buildTabPathKey(path)))
    .map((path) => ({
      ...path,
      tabData: ensureCollectionTabData(nov, path.lonId, path.nhoId),
    }));
  if (mapPaths.length === 0) return { changed, warnings: [], applied: false };

  const sourcePaths = findForceTabPaths(nov, { sourceLonId })
    .filter((path) => !useExplicitTargets || explicitTargetPathsBySourceKey.has(buildTabPathKey(path)))
    .map((path) => ({
      ...path,
      tabData: ensureCollectionTabData(nov, path.lonId, path.nhoId),
      explicitTargetPathKeys: explicitTargetPathsBySourceKey.get(buildTabPathKey(path)) || null,
    }));
  if (sourcePaths.length === 0) return { changed, warnings: [], applied: false };

  const warnings = [];
  const allForceEntities = [];

  sourcePaths.forEach((path) => {
    const entities = Array.isArray(path.tabData?.entities) ? path.tabData.entities : [];
    entities.forEach((entity) => {
      const disabled = isEntityAutoSyncDisabled(entity, AUTO_SYNC_ENGINE_FORCE_MAP);
      const locked = isEntityAutoSyncLocked(entity, AUTO_SYNC_ENGINE_FORCE_MAP);
      let cleanedInfo = safeString(entity.info).trim();
      if (!locked) {
        cleanedInfo = removeAutoSection(
          removeAutoSection(
            removeAutoBlock(entity.info, AUTO_FORCE_BLOCK_START, AUTO_FORCE_BLOCK_END),
            FORCE_META_TITLE,
            FORCE_AUTO_END
          ),
          FORCE_MAP_STRATA_TITLE,
          FORCE_MAP_STRATA_END
        );
        if (cleanedInfo !== safeString(entity.info).trim()) {
          entity.info = cleanedInfo;
          changed = true;
        }
      }
      if (disabled) return;

      const meta = parseForceMetaFromEntity(entity, {
        sourceLonId: path.lonId,
        sourceNhoId: path.nhoId,
        sourceNhoConfig: path.currentTabConfig || null,
        sourceNhoLabel: safeString(path.nhoLabel || path.nhoId),
        sourceParentLabel: safeString(path.parentLabel || ''),
      });
      if (!meta) return;

      if (!locked) {
        const nextInfo = mergeAutoSection(cleanedInfo, FORCE_META_TITLE, FORCE_AUTO_END, buildForceMetaBlockLines());
        if (nextInfo !== cleanedInfo) {
          entity.info = nextInfo;
          changed = true;
        }
      }

      allForceEntities.push({
        id: entity.id,
        name: safeString(entity.name),
        meta,
        sourcePath: path,
        explicitTargetPathKeys: path.explicitTargetPathKeys || null,
      });
    });
  });

  const duplicateNameCounts = new Map();
  allForceEntities.forEach((item) => {
    const key = normalizeAscii(item.name);
    if (!key) return;
    duplicateNameCounts.set(key, (duplicateNameCounts.get(key) || 0) + 1);
  });

  const rowsByLoc = new Map();
  allForceEntities.forEach((row) => {
    (row.meta.locations || []).forEach((loc) => {
      const key = normalizeAscii(loc);
      if (!key) return;
      if (!rowsByLoc.has(key)) rowsByLoc.set(key, { name: loc, rows: [] });
      rowsByLoc.get(key).rows.push(row);
    });
  });

  mapPaths.forEach((path) => {
    const entities = Array.isArray(path.tabData?.entities) ? path.tabData.entities : [];
    entities.forEach((entity) => {
      if (isEntityAutoSyncLocked(entity, AUTO_SYNC_ENGINE_FORCE_MAP)) return;
      const cleanedInfo = removeAutoSection(
        removeAutoBlock(entity.info, AUTO_MAP_BLOCK_START, AUTO_MAP_BLOCK_END),
        FORCE_MAP_LIST_TITLE,
        FORCE_AUTO_END
      );
      if (cleanedInfo !== safeString(entity.info).trim()) {
        entity.info = cleanedInfo;
        changed = true;
      }
    });
  });

  const mapEntityTargetsByName = new Map();
  mapPaths.forEach((path) => {
    const entities = Array.isArray(path.tabData?.entities) ? path.tabData.entities : [];
    entities.forEach((entity) => {
      if (isEntityAutoSyncDisabled(entity, AUTO_SYNC_ENGINE_FORCE_MAP)) return;
      const key = normalizeAscii(entity?.name);
      if (!key) return;
      if (!mapEntityTargetsByName.has(key)) mapEntityTargetsByName.set(key, []);
      mapEntityTargetsByName.get(key).push({ path, entity });
    });
  });

  for (const [, item] of rowsByLoc.entries()) {
    const locationKey = normalizeAscii(item.name);
    let targetEntities = mapEntityTargetsByName.get(locationKey) || [];
    const explicitAllowedTargetPathKeys = new Set();
    item.rows.forEach((row) => {
      (row?.explicitTargetPathKeys || []).forEach((pathKey) => explicitAllowedTargetPathKeys.add(pathKey));
    });

    if (useExplicitTargets && explicitAllowedTargetPathKeys.size > 0) {
      targetEntities = targetEntities.filter((target) => explicitAllowedTargetPathKeys.has(buildTabPathKey(target.path)));
    }

    if (targetEntities.length > 1) {
      pushSyncWarning(warnings, {
        type: 'ambiguous_existing_location',
        locationName: item.name,
        tabLabels: targetEntities.map((target) => buildTabPathLabel(target.path)),
      });
      continue;
    }

    if (targetEntities.length === 0) {
      const preferredTarget = useExplicitTargets
        ? (() => {
            if (explicitAllowedTargetPathKeys.size !== 1) {
              return {
                mapPath: null,
                reason: 'ambiguous_target_tab',
                candidatePaths: mapPaths.filter((path) => explicitAllowedTargetPathKeys.has(buildTabPathKey(path))),
              };
            }
            const wantedPathKey = [...explicitAllowedTargetPathKeys][0];
            return {
              mapPath: mapPaths.find((path) => buildTabPathKey(path) === wantedPathKey) || null,
              reason: 'explicit_target',
              candidatePaths: mapPaths.filter((path) => buildTabPathKey(path) === wantedPathKey),
            };
          })()
        : pickPreferredMapTabForLocation(item, mapEntityTargetsByName, mapPaths);
      if (!preferredTarget.mapPath) {
        pushSyncWarning(warnings, {
          type: 'ambiguous_target_tab',
          locationName: item.name,
          tabLabels: (
            preferredTarget.candidatePaths ||
            mapPaths.filter((path) => explicitAllowedTargetPathKeys.has(buildTabPathKey(path)))
          ).map((path) => buildTabPathLabel(path)),
        });
        continue;
      }

      const ensured = ensureMapEntityByName(preferredTarget.mapPath.tabData, item.name, {
        activeTabLon: preferredTarget.mapPath.lonId,
        activeTabNho: preferredTarget.mapPath.nhoId,
        currentTabConfig: preferredTarget.mapPath.currentTabConfig || null,
        parentLabel: preferredTarget.mapPath.parentLabel || '',
      });
      if (isEntityAutoSyncDisabled(ensured.entity, AUTO_SYNC_ENGINE_FORCE_MAP)) {
        continue;
      }
      if (ensured.created) changed = true;
      targetEntities = [{ path: preferredTarget.mapPath, entity: ensured.entity }];
      mapEntityTargetsByName.set(locationKey, targetEntities);
    }

    const rows = buildForceRowsForLocation(item.rows);
    const nextBlock = buildMapAutoBlockLines(item.name, rows, {
      detailedLayout: isDetailedMapLayout(item.name),
      duplicateNameCounts,
    });

    targetEntities.forEach((target) => {
      if (!target?.entity) return;
      if (isEntityAutoSyncDisabled(target.entity, AUTO_SYNC_ENGINE_FORCE_MAP)) return;
      if (isEntityAutoSyncLocked(target.entity, AUTO_SYNC_ENGINE_FORCE_MAP)) return;
      const nextInfo = mergeAutoSection(target.entity.info, FORCE_MAP_LIST_TITLE, FORCE_AUTO_END, nextBlock);
      if (nextInfo !== safeString(target.entity.info).trim()) {
        target.entity.info = nextInfo;
        changed = true;
      }
    });
  }

  return {
    changed,
    warnings: dedupeSyncWarnings(warnings),
    applied: allForceEntities.length > 0 || changed,
  };
}

export function syncAllTheLucMapAutoBlocks(nov, { sourceLonId }) {
  const result = syncAllTheLucMapAutoBlocksDetailed(nov, { sourceLonId });
  return Boolean(result.applied || result.changed);
  /*
  if (!nov || !sourceLonId) return false;
  const mapPaths = findMapTabPaths(nov);
  if (mapPaths.length === 0) return false;
  const mapTabs = mapPaths.map((path) => ensureCollectionTabData(nov, path.lonId, path.nhoId));
  const sourceLonCfg = (nov.tabsConfig || []).find((lon) => lon?.id === sourceLonId);
  const sourceNhoLabelById = new Map(
    (sourceLonCfg?.subTabs || []).map((nho) => [nho.id, safeString(nho.label || nho.id)])
  );

  const allForceEntities = [];
  for (const [sourceNhoId, td] of Object.entries(nov.data?.[sourceLonId] || {})) {
    const ents = Array.isArray(td?.entities) ? td.entities : [];
    for (const ent of ents) {
      const m = parseForceMetaFromEntity(ent, {
        sourceNhoId,
        sourceNhoLabel: sourceNhoLabelById.get(sourceNhoId) || sourceNhoId,
      });
      if (!m) continue;
      allForceEntities.push({ id: ent.id, name: safeString(ent.name), meta: m });
    }
  }

  const duplicateNameCounts = new Map();
  allForceEntities.forEach((item) => {
    const key = normalizeAscii(item.name);
    if (!key) return;
    duplicateNameCounts.set(key, (duplicateNameCounts.get(key) || 0) + 1);
  });

  const rowsByLoc = new Map();
  allForceEntities.forEach((r) => {
    (r.meta.locations || []).forEach((loc) => {
      const k = normalizeAscii(loc);
      if (!k) return;
      if (!rowsByLoc.has(k)) rowsByLoc.set(k, { name: loc, rows: [] });
      rowsByLoc.get(k).rows.push(r);
    });
  });

  // Clear old AUTO location blocks first so moved/deleted force data does not linger.
  mapTabs.forEach((mapTab) => {
    (mapTab.entities || []).forEach((ent) => {
      ent.info = removeAutoBlock(ent.info, AUTO_MAP_BLOCK_START, AUTO_MAP_BLOCK_END);
    });
  });

  const mapEntityTargetsByName = new Map();
  mapTabs.forEach((mapTab) => {
    (mapTab.entities || []).forEach((ent) => {
      const key = normalizeAscii(ent?.name);
      if (!key) return;
      if (!mapEntityTargetsByName.has(key)) mapEntityTargetsByName.set(key, []);
      mapEntityTargetsByName.get(key).push({ mapTab, entity: ent });
    });
  });

  for (const [, item] of rowsByLoc.entries()) {
    const locKey = normalizeAscii(item.name);
    let targetEntities = mapEntityTargetsByName.get(locKey) || [];
    if (targetEntities.length === 0) {
      const fallbackMapTab = pickPreferredMapTabForLocation(item, mapEntityTargetsByName, mapTabs[0]);
      const created = ensureMapEntityByName(fallbackMapTab, item.name);
      targetEntities = [{ mapTab: fallbackMapTab, entity: created }];
      mapEntityTargetsByName.set(locKey, targetEntities);
    }

    const rows = buildForceRowsForLocation(item.rows);
    const sectionLines = buildMapAutoBlockLines(item.name, rows, {
      detailedLayout: isDetailedMapLayout(item.name),
      duplicateNameCounts,
    });
    targetEntities.forEach((target) => {
      if (!target?.entity) return;
      target.entity.info = mergeAutoBlock(
        target.entity.info,
        AUTO_MAP_BLOCK_START,
        AUTO_MAP_BLOCK_END,
        sectionLines.join('\n')
      );
    });
  }
  return true;
  */
}

