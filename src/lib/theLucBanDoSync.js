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

const AUTO_FORCE_BLOCK_START = '<!-- AUTO_THE_LUC_META:START -->';
const AUTO_FORCE_BLOCK_END = '<!-- AUTO_THE_LUC_META:END -->';
const AUTO_MAP_BLOCK_START = '<!-- AUTO_MAP_THE_LUC_LIST:START -->';
const AUTO_MAP_BLOCK_END = '<!-- AUTO_MAP_THE_LUC_LIST:END -->';
const FORCE_TYPE_GROUP_ORDER = ['Đế Quốc', 'Gia Tộc', 'Học Viện', 'Tông Môn', 'Thương Minh', 'Thế Lực Khác'];

function safeString(v) {
  if (v == null || v === 'null' || v === 'undefined') return '';
  return String(v);
}

function normalizeAscii(v) {
  return normalizeAsciiText(v);
}

function mergeAutoBlock(baseText, start, end, blockBody) {
  const text = safeString(baseText);
  const sIdx = text.indexOf(start);
  const eIdx = text.indexOf(end);
  const payload = `${start}\n${blockBody}\n${end}`;
  if (sIdx >= 0 && eIdx > sIdx) {
    return `${text.slice(0, sIdx)}${payload}${text.slice(eIdx + end.length)}`.trim();
  }
  return `${text.trim()}\n\n${payload}`.trim();
}

function removeAutoBlock(baseText, start, end) {
  const text = safeString(baseText);
  const sIdx = text.indexOf(start);
  const eIdx = text.indexOf(end);
  if (sIdx < 0 || eIdx <= sIdx) return text.trim();
  return `${text.slice(0, sIdx)}${text.slice(eIdx + end.length)}`.trim();
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

function buildForceMeta(orgType, rankText, locations) {
  const org = safeString(orgType).trim();
  const rank = safeString(rankText).trim();
  const locs = dedupeNameList(locations);
  if (!org || !rank || locs.length === 0) return null;
  return {
    orgType: org,
    rankText: rank,
    rankNum: parseRankNumber(rank),
    locations: locs,
    tailPath: locs.join(' > '),
  };
}

function classifyOrgType(rawType) {
  const n = normalizeAscii(rawType).replace(/[^a-z0-9]+/g, ' ');
  if (n.includes('de quoc') || n.includes('quoc gia') || n.includes('trieu')) return 'Đế Quốc';
  if (n.includes('gia toc')) return 'Gia Tộc';
  if (n.includes('hoc vien')) return 'Học Viện';
  if (n.includes('tong mon') || n.includes('to chuc') || n.includes('the luc')) return 'Tông Môn';
  if (n.includes('thuong minh') || n.includes('thuong hoi')) return 'Thương Minh';
  return 'Thế Lực Khác';
}

function inferOrgTypeFromContext({ dynamicData, sourceNhoId = '', sourceNhoLabel = '' } = {}) {
  const dyn = dynamicData && typeof dynamicData === 'object' ? dynamicData : {};
  const candidates = [
    dyn.f_loai_to_chuc,
    dyn.f_loai,
    dyn.f_to_chuc,
    dyn.f_title,
    sourceNhoLabel,
    sourceNhoId,
  ];
  for (const candidate of candidates) {
    const raw = safeString(candidate).trim();
    if (!raw) continue;
    const mapped = classifyOrgType(raw);
    if (mapped !== 'Thế Lực Khác') return mapped;
  }
  return 'Thế Lực Khác';
}

function splitLocationTokens(locationText) {
  const raw = safeString(locationText)
    .replace(/[>→»|]+/g, ' - ')
    .replace(/[,\n;]+/g, ' - ')
    .trim();
  if (!raw) return [];
  return dedupeNameList(splitStatusParts(raw));
}

function parseForceStatus(statusText, { fallbackOrgType = '' } = {}) {
  const parts = splitStatusParts(statusText);
  const fallbackType = safeString(fallbackOrgType).trim();
  if (parts.length === 0) return null;

  if (parts.length >= 3 && !isLikelyRankText(parts[0])) {
    return buildForceMeta(parts[0], parts[1], parts.slice(2));
  }
  if (fallbackType && parts.length >= 2 && isLikelyRankText(parts[0])) {
    return buildForceMeta(fallbackType, parts[0], parts.slice(1));
  }
  if (parts.length >= 3) {
    return buildForceMeta(parts[0], parts[1], parts.slice(2));
  }
  return null;
}

function parseForceMetaFromEntity(entity, context = {}) {
  const dyn = entity?.dynamicData && typeof entity.dynamicData === 'object' ? entity.dynamicData : {};
  const fallbackOrgType = inferOrgTypeFromContext({
    dynamicData: dyn,
    sourceNhoId: context.sourceNhoId,
    sourceNhoLabel: context.sourceNhoLabel,
  });

  const statusLine = safeString(dyn.f_status || entity?.status).trim();
  const statusMeta = parseForceStatus(statusLine, { fallbackOrgType });
  if (statusMeta) return statusMeta;

  const rankFromStatus = safeString(dyn.f_status).trim();
  const rankFromCap = safeString(dyn.f_cap).trim();
  const rankText = isLikelyRankText(rankFromStatus)
    ? rankFromStatus
    : (isLikelyRankText(rankFromCap) ? rankFromCap : '');
  const locationText = safeString(dyn.f_dia_ban || dyn.f_vi_tri).trim();
  const locations = splitLocationTokens(locationText);
  if (!rankText || locations.length === 0) return null;
  return buildForceMeta(fallbackOrgType, rankText, locations);
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

function buildLocationHierarchyLines(locations) {
  const enriched = (locations || [])
    .map((loc) => ({ raw: loc, ...detectLocationLevelName(loc) }))
    .sort((a, b) => b.rank - a.rank || normalizeAscii(a.raw).localeCompare(normalizeAscii(b.raw)));
  return enriched.map((x, idx) => `${idx + 1}. ${x.label}: [[${x.raw}]]`);
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
    byGroup.get(g).push(r);
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
        sectionLines.push(`- [[${buildForceWikiLabel(r, duplicateNameCounts)}]] - ${r.meta.rankText}`);
      });
      return;
    }
    sectionLines.push(`### ${g}`);
    list.forEach((r, idx) => {
      sectionLines.push(`${idx + 1}. [[${buildForceWikiLabel(r, duplicateNameCounts)}]] - ${r.meta.rankText} - ${r.meta.tailPath}`);
    });
  });

  return sectionLines;
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
        out.push({ lonId: lon.id, nhoId: nho.id });
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

function ensureMapEntityByName(tabData, name) {
  const key = normalizeAscii(name);
  let ent = (tabData.entities || []).find((e) => normalizeAscii(e.name) === key);
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
    tabData.entities.push(ent);
  }
  return ent;
}

function pickPreferredMapTabForLocation(item, targetsByName, fallbackMapTab) {
  const fallback = fallbackMapTab || null;
  const targetNameKey = normalizeAscii(item?.name);
  for (const row of item?.rows || []) {
    const locations = Array.isArray(row?.meta?.locations) ? row.meta.locations : [];
    for (const locName of locations) {
      const key = normalizeAscii(locName);
      if (!key || key === targetNameKey) continue;
      const targets = targetsByName.get(key) || [];
      if (targets.length > 0 && targets[0]?.mapTab) return targets[0].mapTab;
    }
  }
  return fallback;
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
      if (br !== ar) return br - ar;
      const n = normalizeAscii(a.name).localeCompare(normalizeAscii(b.name));
      if (n !== 0) return n;
      return normalizeAscii(a.meta.tailPath).localeCompare(normalizeAscii(b.meta.tailPath));
    });
}

export function syncTheLucMapAutoBlocks(nov, { sourceLonId, sourceNhoId, entityId }) {
  if (!nov || !sourceLonId || !sourceNhoId || !entityId) return false;
  const sourceTab = ensureCollectionTabData(nov, sourceLonId, sourceNhoId);
  const source = (sourceTab.entities || []).find((e) => e.id === entityId);
  if (!source) return false;

  const sourceLonCfg = (nov.tabsConfig || []).find((lon) => lon?.id === sourceLonId);
  const sourceNhoCfg = (sourceLonCfg?.subTabs || []).find((nho) => nho?.id === sourceNhoId);
  const meta = parseForceMetaFromEntity(source, {
    sourceNhoId,
    sourceNhoLabel: safeString(sourceNhoCfg?.label || sourceNhoId),
  });
  if (!meta) return false;

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
}

export function syncAllTheLucMapAutoBlocks(nov, { sourceLonId }) {
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
}

