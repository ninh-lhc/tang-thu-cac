/**
 * Auto-sync list-card notes inside each collection tab.
 * A list card is any entity whose name starts with "Danh sach".
 * The helper keeps manual notes intact and only rewrites its AUTO block.
 * Ranh giới khối: dòng tiêu đề # Danh mục thẻ (AUTO) (không dùng <!-- --> để giao diện gọn).
 * Thế lực/bản đồ: một ## địa·loại·hệ (tổng), các ### theo cấp bậc; trong mỗi cấp sort tên A–Z.
 * Dữ liệu cũ có <!-- AUTO_COLLECTION_LIST:... --> vẫn được đọc và xóa khi đồng bộ lại.
 */

import {
  normalizeAsciiText,
  parseRankNumber,
  parseStatusHierarchy,
  splitStatusHierarchyTokens,
} from './statusHierarchyParser.js';
import { parseOwnerTimelineHint } from './autoOwnerMilestone.js';
import { findEquivalentEntityByName } from './entityNameIdentity.js';
import { isAutoSyncExplicitlyOff } from './tabAutoSyncRole.js';
import { normalizeTabAutoSyncLevelConfig } from './tabAutoSyncLevels.js';
import { inferForceSystemLabel } from './forceRankLadder.js';
import { classifyOrgType, inferOrgTypeFromContext, inferOrgTypeFromTabSlug } from './forceOrgTypeInfer.js';

const LEGACY_AUTO_LIST_START = '<!-- AUTO_COLLECTION_LIST:START -->';
const LEGACY_AUTO_LIST_END = '<!-- AUTO_COLLECTION_LIST:END -->';
const AUTO_LIST_TITLE = '# Danh m\u1ee5c th\u1ebb (AUTO)';

const ATTRIBUTE_GROUP_ORDER = [
  'bang',
  'hoa',
  'phong',
  'loi',
  'moc',
  'thuy',
  'tho',
  'am',
  'duong',
];

const TIER_LEVEL_ORDER = [
  'hoang cap',
  'huyen cap',
  'dia cap',
  'thien cap',
  'linh cap',
  'chan cap',
  'cuc cap',
  'at cap',
  'ngoc cap',
  'vuong cap',
  'ton cap',
  'de cap',
  'cam ky',
];

const TIER_SUB_ORDER = ['ha pham', 'trung pham', 'thuong pham', 'cuc pham'];

const LIST_GROUP_STRATEGY_VALUES = new Set([
  'auto',
  'title',
  'status',
  'rank',
  'location',
  'relation',
  'owner',
  'text',
]);

export function normalizeListGroupStrategy(value = '') {
  const raw = String(value || '').trim().toLowerCase();
  return LIST_GROUP_STRATEGY_VALUES.has(raw) ? raw : 'auto';
}

/** Thứ tự id trường dùng chung: gom nhóm (ô đầu tiên có giá trị) + gộp list gợi ý cho thứ tự AUTO. Trường không có list gợi ý thì bỏ qua khi gộp. */
export function normalizeAutoListGroupFieldOrder(tabConfig) {
  const raw = tabConfig?.autoListGroupFieldOrder;
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => safeString(x).trim()).filter(Boolean);
}

/** Có ít nhất một trường trong fieldsTemplate đặt listMergeOrder (số thứ tự gộp list AUTO). */
export function templateHasListMergeOrder(tabConfig) {
  const fields = Array.isArray(tabConfig?.fieldsTemplate) ? tabConfig.fieldsTemplate : [];
  return fields.some((f) => {
    const o = f?.listMergeOrder;
    return typeof o === 'number' && Number.isFinite(o);
  });
}

/**
 * Thứ tự id trường để gộp list gợi ý / nhãn nhóm (khi bật listMergeOrder): số nhỏ trước;
 * trường chưa đánh số xếp sau, giữ thứ tự trong mẫu. bỏ f_alias.
 */
export function getAutoListFieldIdsFromTemplate(tabConfig) {
  const fields = Array.isArray(tabConfig?.fieldsTemplate) ? tabConfig.fieldsTemplate : [];
  const rows = fields
    .map((f, idx) => {
      const id = safeString(f?.id).trim();
      if (!id || id === 'f_alias') return null;
      const o = f?.listMergeOrder;
      const sort = typeof o === 'number' && Number.isFinite(o) ? Math.trunc(o) : null;
      return { id, idx, sort };
    })
    .filter(Boolean);
  rows.sort((a, b) => {
    const aNum = a.sort !== null;
    const bNum = b.sort !== null;
    if (aNum && bNum && a.sort !== b.sort) return a.sort - b.sort;
    if (aNum && !bNum) return -1;
    if (!aNum && bNum) return 1;
    return a.idx - b.idx;
  });
  return rows.map((r) => r.id);
}

function pickMergeFieldIds(tabConfig, fallbackIds = []) {
  const custom = normalizeAutoListGroupFieldOrder(tabConfig);
  if (custom.length > 0) return custom;
  if (templateHasListMergeOrder(tabConfig)) {
    const fromTpl = getAutoListFieldIdsFromTemplate(tabConfig);
    if (fromTpl.length > 0) return fromTpl;
  }
  return Array.isArray(fallbackIds) ? fallbackIds.map((x) => safeString(x).trim()).filter(Boolean) : [];
}

function computeTierOrder(label) {
  const normalized = normalize(label);
  if (!normalized) return null;
  const levelIdx = TIER_LEVEL_ORDER.findIndex((token) => normalized.includes(token));
  if (levelIdx < 0) return null;
  const subIdx = TIER_SUB_ORDER.findIndex((token) => normalized.includes(token));
  return levelIdx * 100 + (subIdx >= 0 ? subIdx : 50);
}

function safeString(value) {
  if (value == null || value === 'null' || value === 'undefined') return '';
  return String(value);
}

function normalize(value) {
  return normalizeAsciiText(value);
}

function normalizeGroupKey(label) {
  return normalize(label).replace(/\s+/g, ' ').trim();
}

function findLegacyAutoListRange(text) {
  const s = text.indexOf(LEGACY_AUTO_LIST_START);
  const e = text.indexOf(LEGACY_AUTO_LIST_END);
  if (s < 0 || e <= s) return null;
  return { start: s, end: e + LEGACY_AUTO_LIST_END.length };
}

/** Khối danh sách AUTO (định dạng mới): từ dòng tiêu đề tới hết các dòng trống / ## / - */
function findTitleAutoListRange(text) {
  const title = AUTO_LIST_TITLE;
  let pos = 0;
  while (pos < text.length) {
    const nl = text.indexOf('\n', pos);
    const lineEnd = nl === -1 ? text.length : nl;
    let line = text.slice(pos, lineEnd);
    if (line.endsWith('\r')) line = line.slice(0, -1);
    if (line === title) {
      const blockStart = pos;
      let scan = nl === -1 ? text.length : nl + 1;
      while (scan < text.length) {
        const nl2 = text.indexOf('\n', scan);
        const le = nl2 === -1 ? text.length : nl2;
        let ln = text.slice(scan, le);
        if (ln.endsWith('\r')) ln = ln.slice(0, -1);
        const trimmed = ln.trimEnd();
        if (trimmed === '') {
          scan = nl2 === -1 ? text.length : nl2 + 1;
          continue;
        }
        if (
          trimmed.startsWith('## ') ||
          trimmed.startsWith('### ') ||
          trimmed.startsWith('- ') ||
          /^\d+\.\s/.test(trimmed)
        ) {
          scan = nl2 === -1 ? text.length : nl2 + 1;
          continue;
        }
        break;
      }
      return { start: blockStart, end: scan };
    }
    if (nl === -1) break;
    pos = nl + 1;
  }
  return null;
}

function removeCollectionListAutoBlock(baseText) {
  let text = safeString(baseText);
  const legacy = findLegacyAutoListRange(text);
  if (legacy) {
    text = `${text.slice(0, legacy.start)}${text.slice(legacy.end)}`;
  }
  const titleRange = findTitleAutoListRange(text);
  if (titleRange) {
    text = `${text.slice(0, titleRange.start)}${text.slice(titleRange.end)}`;
  }
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

function mergeCollectionListAutoBlock(baseText, blockBody) {
  const body = safeString(blockBody).trim();
  const cleaned = removeCollectionListAutoBlock(baseText);
  const prefix = cleaned.trimEnd();
  const sep = prefix ? '\n\n' : '';
  return `${prefix}${sep}${body}`.trim();
}

function isCollectionTab(tabConfig) {
  return tabConfig?.viewType === 'collection-track';
}

/** Thẻ chỉ mục AUTO trong tab — không phải thẻ bản đồ; dùng chung với mapHierarchySync. */
export function isListCardEntity(entity) {
  return normalize(entity?.name).startsWith('danh sach');
}

function buildListCardName(tabLabel = '') {
  const suffix = safeString(tabLabel).trim();
  return suffix ? `Danh Sách ${suffix}` : 'Danh Sách';
}

function hasCanonicalListCard(tabData, tabLabel = '') {
  const entities = Array.isArray(tabData?.entities) ? tabData.entities : [];
  const canonical = normalize(buildListCardName(tabLabel));
  if (!canonical) return false;
  return entities.some((entity) => normalize(entity?.name) === canonical);
}

function seedAutoLevelsForCanonicalListCard(tabConfig, tabData, tabLabel = '') {
  if (!tabConfig || typeof tabConfig !== 'object') return false;
  if (!hasCanonicalListCard(tabData, tabLabel)) return false;
  if (tabConfig.autoSyncLevelConfig && typeof tabConfig.autoSyncLevelConfig === 'object') return false;
  tabConfig.autoSyncLevelConfig = normalizeTabAutoSyncLevelConfig({
    enabled: true,
    levels: {
      level_1_card: true,
      level_2_list: true,
      level_3_linked: false,
      level_4_timeline: false,
    },
  });
  return true;
}

function ensureListCardEntity(tabData, tabLabel = '') {
  const entities = Array.isArray(tabData?.entities) ? tabData.entities : [];
  if (entities.some(isListCardEntity)) return false;
  entities.unshift({
    id: `ent-list-${Math.random().toString(36).slice(2, 9)}`,
    name: buildListCardName(tabLabel),
    info: '',
    dynamicData: {},
    milestones: [],
    images: [],
  });
  tabData.entities = entities;
  return true;
}

function pickFirstFilled(entity, fieldIds) {
  for (const fieldId of fieldIds) {
    const value = safeString(entity?.dynamicData?.[fieldId] || entity?.[fieldId]).trim();
    if (value) return value;
  }
  return '';
}

function splitHierarchyLikeTokens(value) {
  const raw = safeString(value)
    .replace(/[>→»|]+/g, ' - ')
    .replace(/[,\n;]+/g, ' - ')
    .trim();
  if (!raw) return [];
  return splitStatusHierarchyTokens(raw);
}

function getMapDirectParent(entity) {
  // Chỉ địa bàn / vị trí — không dùng f_status (cấp bậc) kẻo nhầm «Cửu Cấp thế lực» thành parent bản đồ.
  // Ưu tiên f_dia_ban (đại lục / địa chỉ lớn) trước f_vi_tri (thường là điểm cuối / đế quốc) để sort · nhóm khớp ý «địa chỉ».
  const tokens = splitHierarchyLikeTokens(pickFirstFilled(entity, ['f_dia_ban', 'f_vi_tri']));
  return safeString(tokens[0]).trim();
}

/** Tránh nhầm «Cửu/Bát Cấp thế lực» trong ô f_title với loại hình. */
function isLikelyForceRankLine(text) {
  const raw = safeString(text).trim();
  if (!raw) return false;
  if (Number.isFinite(parseRankNumber(raw))) return true;
  const n = normalize(raw);
  return /\bcap\b/.test(n) && /\bthe\s+luc\b/.test(n);
}

/** f_title đôi khi chứa chuỗi cấp khi mẫu tab không có ô f_status / f_cap riêng. */
function isRankLikeValue(text) {
  const raw = safeString(text).trim();
  if (!raw) return false;
  if (Number.isFinite(parseRankNumber(raw))) return true;
  return isLikelyForceRankLine(raw);
}

function getForceRankLabel(entity) {
  const rawStatus = pickFirstFilled(entity, ['f_status']);
  const parsedStatus = parseStatusHierarchy(rawStatus);
  if (parsedStatus?.rankLabel) return safeString(parsedStatus.rankLabel).trim();
  let rawRank = pickFirstFilled(entity, ['f_status', 'f_cap']);
  if (!safeString(rawRank).trim()) {
    const rawTitle = pickFirstFilled(entity, ['f_title']);
    if (rawTitle && isRankLikeValue(rawTitle)) rawRank = rawTitle;
  }
  return safeString(rawRank).trim();
}

function getForceRankSystemLabel(entity) {
  const direct = pickFirstFilled(entity, ['f_he_cap_the_luc', 'f_he_phan_cap']);
  if (safeString(direct).trim()) return safeString(direct).trim();
  return inferForceSystemLabel(getForceRankLabel(entity));
}

/** Ghép thứ tự gợi ý từ nhiều fieldId (đúng thứ tự mảng). Trường không có list hoặc list rỗng: bỏ qua. */
function buildMergedSuggestionOrder(tabConfig = null, fieldIds = []) {
  const lists = tabConfig?.fieldSuggestionLists;
  if (!lists || typeof lists !== 'object') return null;
  const ids = Array.isArray(fieldIds) ? fieldIds.map((x) => safeString(x).trim()).filter(Boolean) : [];
  if (ids.length === 0) return null;
  const ordered = [];
  const seen = new Set();
  ids.forEach((fid) => {
    const arr = Array.isArray(lists[fid]) ? lists[fid] : [];
    if (arr.length === 0) return;
    arr.forEach((item) => {
      const key = normalize(safeString(item).trim());
      if (!key || seen.has(key)) return;
      seen.add(key);
      ordered.push({ raw: item, key });
    });
  });
  if (ordered.length === 0) return null;
  return (label) => {
    const n = normalize(label);
    if (!n) return null;
    const idx = ordered.findIndex((item) => n === item.key || n.includes(item.key));
    return idx >= 0 ? idx : null;
  };
}

function buildTierSuggestionOrder(tabConfig = null, fieldIds = ['f_cap', 'f_status']) {
  const customOrder = Array.isArray(tabConfig?.autoListGroupOrder) ? tabConfig.autoListGroupOrder : [];
  const customRaw = customOrder.map((v) => safeString(v).trim()).filter(Boolean);
  if (customRaw.length > 0) {
    const ordered = [];
    const seen = new Set();
    customRaw.forEach((item) => {
      const key = normalize(item);
      if (!key || seen.has(key)) return;
      seen.add(key);
      ordered.push({ raw: item, key });
    });
    if (ordered.length > 0) {
      return (label) => {
        const n = normalize(label);
        if (!n) return null;
        const idx = ordered.findIndex((item) => n === item.key || n.includes(item.key));
        return idx >= 0 ? idx : null;
      };
    }
  }

  return buildMergedSuggestionOrder(tabConfig, fieldIds);
}

function buildCustomGroupOrder(tabConfig = null) {
  const raw = Array.isArray(tabConfig?.autoListGroupOrder) ? tabConfig.autoListGroupOrder : [];
  const ordered = [];
  const seen = new Set();
  raw
    .map((v) => safeString(v).trim())
    .filter(Boolean)
    .forEach((item) => {
      const key = normalize(item);
      if (!key || seen.has(key)) return;
      seen.add(key);
      ordered.push(key);
    });
  if (ordered.length === 0) return null;
  return (label) => {
    const n = normalize(label);
    if (!n) return null;
    const idx = ordered.findIndex((key) => n === key || n.includes(key));
    return idx >= 0 ? idx : null;
  };
}

function compareForceEntries(a, b) {
  const as = normalize(getForceRankSystemLabel(a));
  const bs = normalize(getForceRankSystemLabel(b));
  if (as !== bs) return as.localeCompare(bs, 'vi');
  const ar = parseRankNumber(getForceRankLabel(a));
  const br = parseRankNumber(getForceRankLabel(b));
  const aHasRank = Number.isFinite(ar);
  const bHasRank = Number.isFinite(br);
  if (aHasRank && bHasRank && ar !== br) return ar - br;
  if (aHasRank !== bHasRank) return aHasRank ? -1 : 1;
  return safeString(a?.name).localeCompare(safeString(b?.name), 'vi');
}

/** Loại hình thế lực để hiển thị trong dòng thẻ / nhóm (không dùng làm wiki). */
function resolveForceOrgTypeLabel(entity, ctx = {}) {
  const dyn = entity?.dynamicData && typeof entity.dynamicData === 'object' ? entity.dynamicData : {};
  let org = inferOrgTypeFromContext({
    dynamicData: dyn,
    sourceNhoId: safeString(ctx.nhoId || ctx.tabConfig?.id || ''),
    sourceNhoLabel: safeString(ctx.tabLabel || ctx.tabConfig?.label || ''),
    typeFieldValue: '',
  });
  if (org === 'Thế Lực Khác') {
    for (const fid of ['f_loai_to_chuc', 'f_loai', 'f_title']) {
      const raw = safeString(dyn[fid] ?? (fid === 'f_title' ? entity?.title : '')).trim();
      if (!raw || isLikelyForceRankLine(raw)) continue;
      org = raw;
      break;
    }
  }
  if (!org || org === 'Thế Lực Khác') {
    const fromSlug = inferOrgTypeFromTabSlug(safeString(ctx.nhoId || ctx.tabConfig?.id || ''));
    if (fromSlug) return fromSlug;
  }
  if (!org || org === 'Thế Lực Khác') {
    const fromName = classifyOrgType(safeString(entity?.name));
    if (fromName !== 'Thế Lực Khác') return fromName;
  }
  if (!org || org === 'Thế Lực Khác') return '';
  return org;
}

/** Loại hình cho nhãn nhóm / dòng AUTO: suy luận → f_loai_to_chuc / f_loai → slug tab. */
function resolveOrgForMapList(entity, ctx) {
  let o = resolveForceOrgTypeLabel(entity, ctx);
  if (o) return o;
  o = safeString(pickFirstFilled(entity, ['f_loai_to_chuc', 'f_loai'])).trim();
  if (o) return o;
  const fromId = inferOrgTypeFromTabSlug(safeString(ctx.nhoId || ctx.tabConfig?.id || ''));
  if (fromId) return fromId;
  return inferOrgTypeFromTabSlug(safeString(ctx.tabLabel || ctx.tabConfig?.label || ''));
}

/** Địa danh để sort: ưu tiên chuỗi đầy đủ f_dia_ban / f_vi_tri (khớp ô «Địa chỉ» trong modal), không chỉ token đầu. */
function getForceSortLocation(entity) {
  const full = safeString(pickFirstFilled(entity, ['f_dia_ban', 'f_vi_tri'])).trim();
  if (full) return full;
  return safeString(getMapDirectParent(entity)).trim();
}

function getForceRealmSystemSort(entity) {
  return safeString(pickFirstFilled(entity, ['f_he_cap_the_luc', 'f_he_phan_cap'])).trim();
}

function compareNonemptyViEmptyLast(a, b) {
  const A = safeString(a).trim();
  const B = safeString(b).trim();
  if (!A && !B) return 0;
  if (!A) return 1;
  if (!B) return -1;
  return A.localeCompare(B, 'vi');
}

/** Địa danh → loại hình → hệ cấp bậc → cấp (số) → chuỗi cấp → tên (khớp Gợi ý nhanh Đế quốc). */
function compareForceLocationHierarchy(a, b, ctx) {
  const locCmp = compareNonemptyViEmptyLast(getForceSortLocation(a), getForceSortLocation(b));
  if (locCmp !== 0) return locCmp;

  const orgCmp = compareNonemptyViEmptyLast(resolveOrgForMapList(a, ctx), resolveOrgForMapList(b, ctx));
  if (orgCmp !== 0) return orgCmp;

  const sysCmp = compareNonemptyViEmptyLast(getForceRealmSystemSort(a), getForceRealmSystemSort(b));
  if (sysCmp !== 0) return sysCmp;

  const ar = parseRankNumber(getForceRankLabel(a));
  const br = parseRankNumber(getForceRankLabel(b));
  const aHas = Number.isFinite(ar);
  const bHas = Number.isFinite(br);
  if (aHas && bHas && ar !== br) return ar - br;
  if (aHas !== bHas) return aHas ? -1 : 1;

  const rankStrCmp = compareNonemptyViEmptyLast(getForceRankLabel(a), getForceRankLabel(b));
  if (rankStrCmp !== 0) return rankStrCmp;

  return safeString(a?.name).localeCompare(safeString(b?.name), 'vi');
}

function renderForceEntry(entity, ctx = {}) {
  const name = safeString(entity?.name).trim();
  if (!name) return '';
  const org = resolveOrgForMapList(entity, ctx);
  const sys = getForceRealmSystemSort(entity);
  const rank = safeString(getForceRankLabel(entity)).trim();
  const bits = [];
  if (org) bits.push(`\`${org}\``);
  if (sys) bits.push(`\`${sys}\``);
  if (rank) bits.push(`\`${rank}\``);
  if (bits.length === 0) return `[[${name}]]`;
  return `[[${name}]] - ${bits.join(' · ')}`;
}

const MAP_GROUP_RANK_SEP = ' \u00b7 ';

/** Chuỗi cấp dùng để tách nhóm (không gộp cửu cấp với bát cấp). */
function rankLineForForceSubGroup(entity) {
  const rankLine = safeString(getForceRankLabel(entity)).trim();
  if (!rankLine) return '';
  if (Number.isFinite(parseRankNumber(rankLine))) return rankLine;
  const n = normalize(rankLine);
  if (/\b(cap|the\s+luc|de\b|ton\b|vuong\b|mon\b)\b/.test(n)) return rankLine;
  return '';
}

/** Gom nhóm danh sách thế lực: cùng loại (Đế Quốc, Tông Môn…) nhưng khác cấp → tách bằng hậu tố · cấp bậc. */
function appendRankToForceGroupLabel(baseText, entity) {
  const base = safeString(baseText).trim();
  const rankForSplit = rankLineForForceSubGroup(entity);
  if (!rankForSplit) return base;
  if (!base) return rankForSplit;
  const nb = normalize(base);
  const nr = normalize(rankForSplit);
  if (nb.includes(nr)) return base;
  return `${base}${MAP_GROUP_RANK_SEP}${rankForSplit}`;
}

/** Configured field đầu được coi là "base location/loại" hợp lệ chỉ khi không phải chuỗi cấp bậc. */
function firstConfiguredNonRank(entity, fieldIds = []) {
  for (const fid of fieldIds) {
    const value = safeString(entity?.dynamicData?.[fid] ?? entity?.[fid]).trim();
    if (!value) continue;
    if (Number.isFinite(parseRankNumber(value))) continue;
    return value;
  }
  return '';
}

/** Tiêu đề cấp 1 (địa · loại · hệ cấp) — không gồm hạng cấp; dùng cho khối ## lớn. */
function buildMapForcePrimaryGroupLabel(entity, ctx) {
  const configuredNonRank = firstConfiguredNonRank(entity, ctx.configuredFieldIds || []);
  const locationValue = safeString(
    pickFirstFilled(entity, ['f_dia_ban', 'f_vi_tri']) || getMapDirectParent(entity)
  ).trim();
  const orgValue = resolveOrgForMapList(entity, ctx);
  const realmLine = getForceRealmSystemSort(entity);

  const parts = [];
  const pushUnique = (value) => {
    const v = safeString(value).trim();
    if (!v) return;
    if (parts.some((p) => normalize(p) === normalize(v))) return;
    parts.push(v);
  };

  if (ctx.preferLocationAsBase) {
    pushUnique(locationValue || configuredNonRank);
    pushUnique(orgValue);
    pushUnique(realmLine);
  } else {
    pushUnique(locationValue);
    pushUnique(orgValue);
    pushUnique(realmLine);
    pushUnique(configuredNonRank);
  }

  let core = parts.join(MAP_GROUP_RANK_SEP);
  if (!core) core = safeString(pickFirstFilled(entity, ['f_title', 'f_status'])).trim();
  return core.trim();
}

/** Nhãn gom nhóm phẳng (địa · loại · hệ · cấp) — giữ cho tương thích; danh sách AUTO dùng ## + ### tách cấp. */
function buildMapForceGroupLabel(entity, ctx) {
  const core = buildMapForcePrimaryGroupLabel(entity, ctx);
  const rankLine = rankLineForForceSubGroup(entity);
  const merged = appendRankToForceGroupLabel(core, entity);
  return merged || safeString(rankLine || core || 'Chưa phân loại').trim();
}

function compareRankSubgroupOrder(rankLabelA, rankLabelB) {
  const a = safeString(rankLabelA).trim();
  const b = safeString(rankLabelB).trim();
  const ar = parseRankNumber(a);
  const br = parseRankNumber(b);
  const aHas = Number.isFinite(ar);
  const bHas = Number.isFinite(br);
  if (aHas && bHas && ar !== br) return ar - br;
  if (aHas !== bHas) return aHas ? -1 : 1;
  return compareNonemptyViEmptyLast(a, b);
}

/** Tiêu đề nhóm AUTO: chỉ bọc [[wiki]] đoạn địa danh đầu tiên; các đoạn sau (· loại · cấp…) giữ plain. */
function formatAutoListGroupHeading(groupLabel, ownerLookupEntities) {
  const raw = safeString(groupLabel).trim();
  if (!raw || raw === 'Chưa phân loại') return raw;
  const parts = raw.split(MAP_GROUP_RANK_SEP).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return raw;
  const primary = parts[0];
  const rest = parts.slice(1);
  const hit = findEquivalentEntityByName(ownerLookupEntities, primary);
  const canon = safeString(hit?.entity?.name).trim();
  const head = canon ? `[[${canon}]]` : primary;
  if (rest.length === 0) return head;
  return `${head}${MAP_GROUP_RANK_SEP}${rest.join(MAP_GROUP_RANK_SEP)}`;
}

function extractOwnerName(rawValue) {
  const raw = safeString(rawValue).trim();
  if (!raw) return '';
  const noWiki = raw.replace(/^\[\[|\]\]$/g, '').trim();
  const chapterIdx = noWiki.search(/\(\d{1,6}\)/);
  const base = chapterIdx > 0 ? noWiki.slice(0, chapterIdx).trim() : noWiki;
  return base.replace(/^[^\p{L}\p{N}\u005b]+/u, '').trim();
}

function resolveOwnerLabel(entity, ownerLookupEntities = []) {
  const rawDirect = pickFirstFilled(entity, [
    'f_chu',
    'f_owner',
    'f_phai',
    'f_mon_phai',
    'f_tong_phai',
    'f_tong_mon',
    'f_to_chuc',
    'f_the_luc',
    'f_phe',
    'f_nguoi_so_huu',
    'f_nguoi_su_dung',
    'f_nguoi_tu_luyen',
    'f_truyen_nhan',
    'f_khe_chu',
  ]);
  let raw = rawDirect;
  if (!safeString(raw).trim()) {
    const dyn = entity?.dynamicData && typeof entity.dynamicData === 'object' ? entity.dynamicData : {};
    for (const [key, value] of Object.entries(dyn)) {
      if (!safeString(value).trim()) continue;
      const k = safeString(key);
      // f_loai_to_chuc chứa chuỗi "to_chuc" — không phải quyền sở hữu / tông phái.
      if (/loai_to_chuc/i.test(k)) continue;
      if (/(chu|owner|so_huu|phai|to_chuc|the_luc|phe)/i.test(k)) {
        raw = value;
        break;
      }
    }
  }
  const ownerFromFields = extractOwnerName(raw);
  let ownerName = ownerFromFields;
  if (!ownerName) {
    const parsed = parseOwnerTimelineHint({
      dynamicData: entity?.dynamicData || {},
      fieldsTemplate: [],
      rawText: safeString(entity?.info || entity?.rawText),
    });
    ownerName = safeString(parsed?.ownerName).trim();
  }
  if (!ownerName) return '';
  const matched = findEquivalentEntityByName(ownerLookupEntities, ownerName);
  return safeString(matched?.entity?.name).trim() || ownerName;
}

/** Tab nhỏ gom thế lực theo «Đế quốc / Chủng tộc / Tông môn…» — dù lon là «Tài nguyên» vẫn không dùng tier như đan dược. */
function isForceBucketCollectionTab(nhoId = '', tabLabel = '') {
  const bag = normalize([nhoId, tabLabel].filter(Boolean).join(' ')).replace(/-/g, ' ');
  if (!bag) return false;
  return (
    /\bde\s+quoc\b/.test(bag) ||
    /\bquoc\s+gia\b/.test(bag) ||
    /\bchung\s+toc\b/.test(bag) ||
    /\btong\s+mon\b/.test(bag) ||
    /\bgia\s+toc\b/.test(bag) ||
    /\bhoc\s+vien\b/.test(bag) ||
    /\bthuong\s+minh\b/.test(bag) ||
    /\bthuong\s+hoi\b/.test(bag) ||
    /\bthe\s+luc\s+khac\b/.test(bag)
  );
}

function detectGroupingStrategy({ lonId = '', nhoId = '', tabLabel = '', parentLabel = '', tabConfig = null } = {}) {
  const customGroupOrder = buildCustomGroupOrder(tabConfig);
  const explicitFieldOrder = normalizeAutoListGroupFieldOrder(tabConfig);
  const templateFieldOrder = templateHasListMergeOrder(tabConfig) ? getAutoListFieldIdsFromTemplate(tabConfig) : [];
  const configuredFields = explicitFieldOrder.length > 0 ? explicitFieldOrder : templateFieldOrder;
  const hasConfiguredFields = configuredFields.length > 0;
  const labelFromConfigured = (entity) => pickFirstFilled(entity, configuredFields);

  const buildTierStrategy = (getGroupLabel, tierFieldIds = ['f_cap', 'f_status', 'f_title']) => {
    const mergeIds = pickMergeFieldIds(tabConfig, tierFieldIds);
    return {
      kind: 'tier',
      getGroupLabel: hasConfiguredFields ? labelFromConfigured : getGroupLabel,
      getTierOrder: buildTierSuggestionOrder(tabConfig, mergeIds) || undefined,
    };
  };
  const buildTextStrategy = (getGroupLabel, kind = 'text', suggestionFieldIds = []) => {
    const mergeIds = pickMergeFieldIds(tabConfig, suggestionFieldIds);
    return {
      kind,
      getGroupLabel: hasConfiguredFields ? labelFromConfigured : getGroupLabel,
      getGroupOrder:
        customGroupOrder ||
        (mergeIds.length > 0 ? buildMergedSuggestionOrder(tabConfig, mergeIds) : null) ||
        undefined,
    };
  };
  const strategyOverride = normalizeListGroupStrategy(tabConfig?.autoListGroupStrategy || '');
  if (strategyOverride !== 'auto') {
    switch (strategyOverride) {
      case 'title':
        return buildTextStrategy((entity) => pickFirstFilled(entity, ['f_title']), 'text', ['f_title']);
      case 'status':
        return buildTextStrategy((entity) => pickFirstFilled(entity, ['f_status']), 'text', ['f_status']);
      case 'rank':
        return buildTierStrategy((entity) => pickFirstFilled(entity, ['f_cap', 'f_status']), ['f_cap', 'f_status', 'f_title']);
      case 'location': {
        const locationCtx = { nhoId, tabLabel, parentLabel, tabConfig };
        const basePrimary = (entity) => {
          const base = hasConfiguredFields
            ? safeString(labelFromConfigured(entity)).trim()
            : safeString(pickFirstFilled(entity, ['f_dia_ban', 'f_vi_tri', 'f_status'])).trim();
          return base || '';
        };
        return {
          kind: 'force-location',
          getGroupLabel: (entity) => {
            const base = basePrimary(entity);
            const merged = appendRankToForceGroupLabel(base, entity);
            return merged || base || 'Ch\u01b0a ph\u00e2n lo\u1ea1i';
          },
          getForcePrimaryLabel: (entity) => basePrimary(entity) || 'Ch\u01b0a ph\u00e2n lo\u1ea1i',
          compareEntries: compareForceEntries,
          renderEntry: (entity) => renderForceEntry(entity, locationCtx),
          getGroupOrder:
            customGroupOrder ||
            buildMergedSuggestionOrder(tabConfig, pickMergeFieldIds(tabConfig, ['f_dia_ban', 'f_vi_tri', 'f_status'])) ||
            undefined,
        };
      }
      case 'relation':
        return buildTextStrategy((entity) => pickFirstFilled(entity, ['f_quan_he', 'f_title', 'f_status']), 'text', [
          'f_quan_he',
          'f_title',
          'f_status',
        ]);
      case 'owner':
        return buildTextStrategy((entity) => pickFirstFilled(entity, ['f_chu', 'f_owner', 'f_nguoi_so_huu']), 'text', [
          'f_chu',
          'f_owner',
          'f_nguoi_so_huu',
        ]);
      case 'text':
      default:
        return buildTextStrategy((entity) => pickFirstFilled(entity, ['f_title', 'f_cap', 'f_status']), 'text', [
          'f_title',
          'f_cap',
          'f_status',
        ]);
    }
  }

  // Coi id dạng dia-danh / tai-nguyen như có khoảng — tránh không khớp tab bản đồ khi thiếu từ trong nhãn.
  const scope = normalize([lonId, nhoId, tabLabel, parentLabel].filter(Boolean).join(' ')).replace(/-/g, ' ');

  if (scope.includes('di thuoc tinh')) {
    return {
      ...buildTextStrategy((entity) => pickFirstFilled(entity, ['f_title', 'f_loai', 'f_status']), 'attribute', [
        'f_title',
        'f_loai',
        'f_status',
      ]),
    };
  }

  // Tab bản đồ thường nằm dưới lon «Tài nguyên» → scope có `tai nguyen`; phải ưu tiên trước buildTierStrategy tài nguyên.
  if (scope.includes('ban do') || scope.includes('dia danh') || scope.includes('bi canh')) {
    const mergeIds = pickMergeFieldIds(tabConfig, [
      'f_dia_ban',
      'f_vi_tri',
      'f_status',
      'f_title',
      'f_he_gioi_ban_do',
    ]);
    const mapLabelCtx = {
      nhoId,
      tabLabel,
      parentLabel,
      tabConfig,
      configuredFieldIds: hasConfiguredFields ? configuredFields : [],
      preferLocationAsBase: true,
    };
    return {
      kind: 'force-location',
      getGroupLabel: (entity) => buildMapForceGroupLabel(entity, mapLabelCtx),
      getForcePrimaryLabel: (entity) => buildMapForcePrimaryGroupLabel(entity, mapLabelCtx),
      compareEntries: compareForceEntries,
      renderEntry: (entity) => renderForceEntry(entity, { nhoId, tabLabel, parentLabel, tabConfig }),
      getGroupOrder:
        customGroupOrder || (mergeIds.length > 0 ? buildMergedSuggestionOrder(tabConfig, mergeIds) : null) || undefined,
    };
  }

  // Lon «Tài nguyên» có scope `tai nguyen` — phải nhận tab con «Đế quốc / Tông môn…» trước tier tài nguyên.
  if (scope.includes('the luc') || isForceBucketCollectionTab(nhoId, tabLabel)) {
    const mergeIds = pickMergeFieldIds(tabConfig, [
      'f_loai_to_chuc',
      'f_to_chuc',
      'f_loai',
      'f_title',
      'f_he_cap_the_luc',
      'f_he_phan_cap',
      'f_dia_ban',
      'f_vi_tri',
      'f_cap',
      'f_status',
    ]);
    const forceLabelCtx = {
      nhoId,
      tabLabel,
      parentLabel,
      tabConfig,
      configuredFieldIds: hasConfiguredFields ? configuredFields : [],
      preferLocationAsBase: false,
    };
    return {
      kind: 'force-location',
      getGroupLabel: (entity) => buildMapForceGroupLabel(entity, forceLabelCtx),
      getForcePrimaryLabel: (entity) => buildMapForcePrimaryGroupLabel(entity, forceLabelCtx),
      compareEntries: compareForceEntries,
      renderEntry: (entity) => renderForceEntry(entity, { nhoId, tabLabel, parentLabel, tabConfig }),
      getGroupOrder:
        customGroupOrder || (mergeIds.length > 0 ? buildMergedSuggestionOrder(tabConfig, mergeIds) : null) || undefined,
    };
  }

  if (
    scope.includes('cong phap') ||
    scope.includes('vu ky') ||
    scope.includes('bi thuat') ||
    scope.includes('cam thuat') ||
    scope.includes('phap bao') ||
    scope.includes('binh khi') ||
    scope.includes('dan duoc') ||
    scope.includes('tran phap') ||
    scope.includes('goi qua') ||
    scope.includes('cua hang') ||
    scope.includes('thien tai dia bao') ||
    scope.includes('tai nguyen')
  ) {
    return buildTierStrategy((entity) => pickFirstFilled(entity, ['f_cap', 'f_status', 'f_title']), [
      'f_cap',
      'f_status',
      'f_title',
    ]);
  }

  if (scope.includes('canh gioi')) {
    return {
      ...buildTextStrategy((entity) => pickFirstFilled(entity, ['f_status', 'f_title']), 'text', ['f_status', 'f_title']),
    };
  }

  if (scope.includes('he thong tu luyen')) {
    return {
      ...buildTextStrategy((entity) => pickFirstFilled(entity, ['f_title', 'f_status']), 'text', ['f_title', 'f_status']),
    };
  }

  if (scope.includes('nhan vat')) {
    return {
      ...buildTextStrategy((entity) => pickFirstFilled(entity, ['f_quan_he', 'f_title', 'f_status']), 'text', [
        'f_quan_he',
        'f_title',
        'f_status',
      ]),
    };
  }

  return buildTextStrategy((entity) => pickFirstFilled(entity, ['f_title', 'f_cap', 'f_status']), 'text', [
    'f_title',
    'f_cap',
    'f_status',
  ]);
}

function computeGroupOrder(kind, label, strategy = null) {
  const normalized = normalize(label);
  if (!normalized) return 10_000;

  if (typeof strategy?.getGroupOrder === 'function') {
    const custom = strategy.getGroupOrder(label);
    if (Number.isFinite(custom)) return custom;
  }

  if (kind === 'tier' && typeof strategy?.getTierOrder === 'function') {
    const custom = strategy.getTierOrder(label);
    if (Number.isFinite(custom)) return custom;
  }

  // Nhãn nhóm «địa danh · loại · cấp» là chuỗi ghép: không dùng parseRankNumber/computeTierOrder
  // trên cả chuỗi (vd. «Bát Cấp» = 8 khiến thứ tự nhóm sai). Chỉ localeCompare tie-break.
  if (kind === 'force-location') {
    return 5_000;
  }

  const anyTierOrder = computeTierOrder(label);
  if (anyTierOrder != null) return anyTierOrder;

  if (kind === 'attribute') {
    const idx = ATTRIBUTE_GROUP_ORDER.findIndex((token) => normalized.includes(token));
    return idx >= 0 ? idx : 9_000;
  }

  if (kind === 'tier') {
    const parsed = parseRankNumber(label);
    if (Number.isFinite(parsed)) return 8_000 + parsed;
    return 9_000;
  }

  return 5_000;
}

function buildAutoLines(records, strategy, ownerLookupEntities = [], sortContext = null) {
  const useForceHierarchy =
    strategy.kind === 'force-location' && sortContext != null && typeof sortContext === 'object';
  let items = Array.isArray(records) ? [...records] : [];
  if (useForceHierarchy) {
    items.sort((a, b) => compareForceLocationHierarchy(a, b, sortContext));
  }
  const lines = [AUTO_LIST_TITLE, '', `- T\u1ed5ng s\u1ed1 th\u1ebb: ${items.length}`, ''];
  const compareEntries = typeof strategy?.compareEntries === 'function'
    ? strategy.compareEntries
    : (a, b) => safeString(a?.name).localeCompare(safeString(b?.name), 'vi');
  const renderEntry = typeof strategy?.renderEntry === 'function'
    ? strategy.renderEntry
    : (entity) => {
        const name = safeString(entity?.name).trim();
        if (!name) return '';
        const owner = resolveOwnerLabel(entity, ownerLookupEntities);
        const ownerSuffix = owner ? ` - [[${owner}]]` : '';
        return `[[${name}]]${ownerSuffix}`;
      };

  if (items.length === 0) {
    lines.push('## Ch\u01b0a ph\u00e2n lo\u1ea1i (0)');
    lines.push('');
    lines.push('- Ch\u01b0a c\u00f3 th\u1ebb n\u00e0o trong tab n\u00e0y.');
    return lines;
  }

  if (useForceHierarchy && typeof strategy.getForcePrimaryLabel === 'function') {
    const RANK_UNKNOWN = 'Ch\u01b0a r\u00f5 c\u1ea5p b\u1eadc';
    const primaryBuckets = new Map();
    const primaryOrder = [];
    const seenPrimary = new Set();

    items.forEach((entity) => {
      const rawPrimary = safeString(strategy.getForcePrimaryLabel(entity)).trim();
      const primaryLabel = rawPrimary || 'Ch\u01b0a ph\u00e2n lo\u1ea1i';
      const pk = normalizeGroupKey(primaryLabel) || 'chua phan loai';
      if (!seenPrimary.has(pk)) {
        seenPrimary.add(pk);
        primaryOrder.push(pk);
      }
      const rankRaw = rankLineForForceSubGroup(entity).trim();
      const rankDisplay = rankRaw || RANK_UNKNOWN;
      const rk = normalizeGroupKey(rankRaw) || 'chua ro cap';
      if (!primaryBuckets.has(pk)) {
        primaryBuckets.set(pk, { label: primaryLabel, rankMap: new Map() });
      }
      const bucket = primaryBuckets.get(pk);
      if (!bucket.rankMap.has(rk)) bucket.rankMap.set(rk, { rankDisplay, entities: [] });
      bucket.rankMap.get(rk).entities.push(entity);
    });

    primaryOrder.forEach((pk, index) => {
      const bucket = primaryBuckets.get(pk);
      const rankMap = bucket.rankMap;
      const total = [...rankMap.values()].reduce((s, sub) => s + sub.entities.length, 0);
      if (index > 0) lines.push('');
      const headingCore = formatAutoListGroupHeading(bucket.label, ownerLookupEntities);
      lines.push(`## ${headingCore} (${total})`);
      lines.push('');
      const rankKeys = [...rankMap.keys()];
      rankKeys.sort((a, b) =>
        compareRankSubgroupOrder(rankMap.get(a).rankDisplay, rankMap.get(b).rankDisplay)
      );
      rankKeys.forEach((rk, rkIndex) => {
        const sub = rankMap.get(rk);
        const subEntities = [...sub.entities].sort((a, b) =>
          safeString(a?.name).localeCompare(safeString(b?.name), 'vi')
        );
        if (rkIndex > 0) lines.push('');
        lines.push(`### ${sub.rankDisplay} (${subEntities.length})`);
        lines.push('');
        subEntities.forEach((entity, idx) => {
          const lineContent = renderEntry(entity, ownerLookupEntities);
          if (!lineContent) return;
          lines.push(`${idx + 1}. ${lineContent}`);
        });
      });
    });

    return lines;
  }

  const grouped = new Map();
  items.forEach((entity) => {
    const rawLabel = safeString(strategy.getGroupLabel(entity)).trim();
    const groupLabel = rawLabel || 'Ch\u01b0a ph\u00e2n lo\u1ea1i';
    const groupKey = normalizeGroupKey(groupLabel) || 'chua phan loai';
    if (!grouped.has(groupKey)) grouped.set(groupKey, { label: groupLabel, entities: [] });
    grouped.get(groupKey).entities.push(entity);
  });

  const groupEntries = Array.from(grouped.values()).sort((a, b) => {
    const orderDiff =
      computeGroupOrder(strategy.kind, a.label, strategy) - computeGroupOrder(strategy.kind, b.label, strategy);
    if (orderDiff !== 0) return orderDiff;
    return a.label.localeCompare(b.label, 'vi');
  });

  groupEntries.forEach(({ label: groupLabel, entities }, index) => {
    if (index > 0) lines.push('');
    const headingCore = formatAutoListGroupHeading(groupLabel, ownerLookupEntities);
    lines.push(`## ${headingCore} (${entities.length})`);
    lines.push('');
    let visibleIdx = 0;
    const orderedEntities = [...entities].sort(compareEntries);
    orderedEntities.forEach((entity) => {
      const lineContent = renderEntry(entity, ownerLookupEntities);
      if (!lineContent) return;
      visibleIdx += 1;
      lines.push(`${visibleIdx}. ${lineContent}`);
    });
  });

  return lines;
}

/** Thẻ chỉ là đại lục/địa danh trên tab bản đồ, không có tín hiệu thế lực → không đưa vào khối AUTO danh sách thế lực. */
function entityHasMapForceListSignals(entity) {
  const pick = (fieldId) => safeString(entity?.dynamicData?.[fieldId] ?? entity?.[fieldId]).trim();
  if (
    pick('f_loai_to_chuc') ||
    pick('f_to_chuc') ||
    pick('f_loai') ||
    pick('f_status') ||
    pick('f_cap') ||
    pick('f_dia_ban') ||
    pick('f_vi_tri') ||
    pick('f_title')
  ) {
    return true;
  }
  const dyn = entity?.dynamicData && typeof entity.dynamicData === 'object' ? entity.dynamicData : {};
  return Object.keys(dyn).length > 0;
}

function isMapLikeCollectionScope(context = {}) {
  const scope = normalize(
    [context.lonId, context.nhoId, context.tabLabel, context.parentLabel].filter(Boolean).join(' ')
  ).replace(/-/g, ' ');
  return scope.includes('ban do') || scope.includes('dia danh') || scope.includes('bi canh');
}

function syncListCardsInTab(tabData, context, ownerLookupEntities) {
  const entities = Array.isArray(tabData?.entities) ? tabData.entities : [];
  const listCards = entities.filter(isListCardEntity);
  if (listCards.length === 0) return false;

  let normalEntities = entities.filter((entity) => !isListCardEntity(entity));
  const strategy = detectGroupingStrategy(context);
  if (strategy.kind === 'force-location' && isMapLikeCollectionScope(context)) {
    normalEntities = normalEntities.filter(entityHasMapForceListSignals);
  }
  const sortContext = {
    nhoId: context.nhoId,
    tabLabel: context.tabLabel,
    parentLabel: context.parentLabel,
    tabConfig: context.tabConfig,
    lonId: context.lonId,
  };
  const blockText = buildAutoLines(normalEntities, strategy, ownerLookupEntities, sortContext).join('\n');
  let changed = false;

  listCards.forEach((listCard) => {
    const nextInfo = mergeCollectionListAutoBlock(listCard.info, blockText);
    if (safeString(nextInfo) !== safeString(listCard.info)) {
      listCard.info = nextInfo;
      changed = true;
    }
  });

  return changed;
}

function clearListCardsAutoInTab(tabData) {
  const entities = Array.isArray(tabData?.entities) ? tabData.entities : [];
  const listCards = entities.filter(isListCardEntity);
  if (listCards.length === 0) return false;
  let changed = false;
  listCards.forEach((listCard) => {
    const nextInfo = removeCollectionListAutoBlock(listCard.info);
    if (safeString(nextInfo) !== safeString(listCard.info)) {
      listCard.info = nextInfo;
      changed = true;
    }
  });
  return changed;
}

export function syncAllCollectionListCardsDetailed(nov) {
  if (!nov?.data || !Array.isArray(nov?.tabsConfig)) {
    return { changed: false, recreatedCount: 0, recreatedTabs: [] };
  }
  let changed = false;
  let recreatedCount = 0;
  const recreatedTabs = [];
  const ownerLookupEntities = [];
  for (const lonData of Object.values(nov.data || {})) {
    if (!lonData || typeof lonData !== 'object') continue;
    for (const tabData of Object.values(lonData)) {
      const entities = Array.isArray(tabData?.entities) ? tabData.entities : [];
      ownerLookupEntities.push(...entities);
    }
  }

  (nov.tabsConfig || []).forEach((lon) => {
    (lon?.subTabs || []).forEach((nho) => {
      if (!isCollectionTab(nho)) return;
      const tabData = nov?.data?.[lon.id]?.[nho.id];
      if (!tabData || typeof tabData !== 'object' || !Array.isArray(tabData.entities)) return;
      const recreated = ensureListCardEntity(tabData, nho.label || nho.id);
      if (recreated) {
        recreatedCount += 1;
        recreatedTabs.push({
          lonId: safeString(lon.id).trim(),
          nhoId: safeString(nho.id).trim(),
          lonLabel: safeString(lon.label).trim(),
          nhoLabel: safeString(nho.label || nho.id).trim(),
        });
      }
      changed = recreated || changed;
      changed = seedAutoLevelsForCanonicalListCard(nho, tabData, nho.label || nho.id) || changed;
      if (isAutoSyncExplicitlyOff(nho)) {
        changed = clearListCardsAutoInTab(tabData) || changed;
        return;
      }
      changed = syncListCardsInTab(
        tabData,
        {
          lonId: lon.id,
          nhoId: nho.id,
          tabLabel: nho.label || '',
          parentLabel: lon.label || '',
          tabConfig: nho,
        },
        ownerLookupEntities
      ) || changed;
    });
  });

  return { changed, recreatedCount, recreatedTabs };
}

export function syncAllCollectionListCards(nov) {
  return syncAllCollectionListCardsDetailed(nov).changed;
}

export function ensureCollectionListCardsForNovel(nov, { createMissingTabBuckets = false } = {}) {
  if (!nov || !Array.isArray(nov?.tabsConfig)) return false;
  if (!nov.data || typeof nov.data !== 'object') nov.data = {};
  let changed = false;

  (nov.tabsConfig || []).forEach((lon) => {
    const lonId = safeString(lon?.id).trim();
    if (!lonId) return;
    if (!nov.data[lonId] || typeof nov.data[lonId] !== 'object') {
      if (!createMissingTabBuckets) return;
      nov.data[lonId] = {};
      changed = true;
    }
    (lon?.subTabs || []).forEach((nho) => {
      if (!isCollectionTab(nho)) return;
      const nhoId = safeString(nho?.id).trim();
      if (!nhoId) return;
      if (!nov.data[lonId][nhoId] || typeof nov.data[lonId][nhoId] !== 'object') {
        if (!createMissingTabBuckets) return;
        nov.data[lonId][nhoId] = { overview: '', entities: [] };
        changed = true;
      }
      const tabData = nov.data[lonId][nhoId];
      if (!Array.isArray(tabData.entities)) {
        tabData.entities = [];
        changed = true;
      }
      changed = ensureListCardEntity(tabData, nho?.label || nhoId) || changed;
      changed = seedAutoLevelsForCanonicalListCard(nho, tabData, nho?.label || nhoId) || changed;
    });
  });

  return changed;
}
