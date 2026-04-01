/**
 * Đồng bộ quan hệ Thế Lực -> Bản đồ từ chuỗi f_status:
 *   "Loại - Cấp bậc - Địa điểm 1 - Địa điểm 2 ..."
 *
 * - Ghi block AUTO vào info của thẻ Thế Lực (không đè phần user tự viết).
 * - Upsert thẻ địa điểm ở tab Bản đồ/Bí cảnh và ghi block AUTO danh sách thế lực tọa lạc.
 */
import {
  normalizeAsciiText,
  parseRankNumber as parseStatusRankNumber,
  splitStatusHierarchyTokens,
} from './statusHierarchyParser.js';

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

function parseForceStatus(statusText) {
  const parts = splitStatusParts(statusText);
  if (parts.length < 3) return null;
  const orgType = parts[0];
  const rankText = parts[1];
  const locations = parts.slice(2);
  if (!orgType || !rankText || locations.length === 0) return null;
  return {
    orgType,
    rankText,
    rankNum: parseRankNumber(rankText),
    locations,
    tailPath: locations.join(' > '),
  };
}

function classifyOrgType(rawType) {
  const n = normalizeAscii(rawType);
  if (n.includes('de quoc') || n.includes('quoc gia') || n.includes('trieu')) return 'Đế Quốc';
  if (n.includes('gia toc')) return 'Gia Tộc';
  if (n.includes('hoc vien')) return 'Học Viện';
  if (n.includes('tong mon') || n.includes('to chuc') || n.includes('the luc')) return 'Tông Môn';
  if (n.includes('thuong minh') || n.includes('thuong hoi')) return 'Thương Minh';
  return 'Thế Lực Khác';
}

function detectLocationLevelName(loc) {
  const n = normalizeAscii(loc);
  if (n.includes('tinh cau') || n.includes('tinh vuc')) return { label: 'Tinh Cầu', rank: 100 };
  if (n.includes('dai luc')) return { label: 'Đại Lục', rank: 90 };
  if (n.includes('chau')) return { label: 'Châu', rank: 80 };
  if (n.includes('de quoc') || n.includes('quoc') || n.includes('trieu')) return { label: 'Đế Quốc', rank: 70 };
  if (n.includes('vuc') || n.includes('bien gioi') || n.includes('khu')) return { label: 'Khu Vực', rank: 60 };
  if (n.includes('thanh') || n.includes('tran') || n.includes('phu')) return { label: 'Thành/Trấn', rank: 50 };
  return { label: 'Địa Điểm', rank: 40 };
}

function buildLocationHierarchyLines(locations) {
  const enriched = (locations || [])
    .map((loc) => ({ raw: loc, ...detectLocationLevelName(loc) }))
    .sort((a, b) => b.rank - a.rank || normalizeAscii(a.raw).localeCompare(normalizeAscii(b.raw)));
  return enriched.map((x, idx) => `${idx + 1}. ${x.label}: [[${x.raw}]]`);
}

function findMapTabPath(nov) {
  for (const lon of nov.tabsConfig || []) {
    for (const nho of lon.subTabs || []) {
      if (nho.viewType !== 'collection-track') continue;
      const idNorm = normalizeAscii(nho.id);
      const lbNorm = normalizeAscii(nho.label);
      if (
        idNorm === 'dia-danh' ||
        lbNorm.includes('ban do') ||
        lbNorm.includes('dia danh') ||
        lbNorm.includes('bi canh')
      ) {
        return { lonId: lon.id, nhoId: nho.id };
      }
    }
  }
  return null;
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

  const meta = parseForceStatus(source.dynamicData?.f_status);
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
  const mapPath = findMapTabPath(nov);
  if (!mapPath) return false;
  const mapTab = ensureCollectionTabData(nov, mapPath.lonId, mapPath.nhoId);

  const allForceEntities = [];
  for (const td of Object.values(nov.data?.[sourceLonId] || {})) {
    const ents = Array.isArray(td?.entities) ? td.entities : [];
    for (const ent of ents) {
      const m = parseForceStatus(ent?.dynamicData?.f_status);
      if (!m) continue;
      allForceEntities.push({ id: ent.id, name: safeString(ent.name), meta: m });
    }
  }

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
  (mapTab.entities || []).forEach((ent) => {
    ent.info = removeAutoBlock(ent.info, AUTO_MAP_BLOCK_START, AUTO_MAP_BLOCK_END);
  });

  for (const [, item] of rowsByLoc.entries()) {
    const locEnt = ensureMapEntityByName(mapTab, item.name);
    const rows = buildForceRowsForLocation(item.rows);
    const byGroup = new Map(FORCE_TYPE_GROUP_ORDER.map((g) => [g, []]));
    rows.forEach((r) => {
      const g = classifyOrgType(r.meta.orgType);
      byGroup.get(g).push(r);
    });
    const sectionLines = ['## Vị trí'];
    FORCE_TYPE_GROUP_ORDER.forEach((g) => {
      const list = byGroup.get(g) || [];
      if (list.length === 0) return;
      sectionLines.push(`### ${g}`);
      list.forEach((r, idx) => {
        sectionLines.push(`${idx + 1}. [[${r.name}]] - ${r.meta.rankText} - ${r.meta.tailPath}`);
      });
    });
    locEnt.info = mergeAutoBlock(
      locEnt.info,
      AUTO_MAP_BLOCK_START,
      AUTO_MAP_BLOCK_END,
      sectionLines.join('\n')
    );
  }

  return true;
}

