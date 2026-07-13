/**
 * Auto-sync list-card notes inside each collection tab.
 * A list card is any entity whose name starts with "Danh sach".
 * Mỗi dòng: `[[Tên thẻ]]` + nguyên chuỗi ô hiển thị (`dynamicData.f_status` / `status`);
 * hết chuỗi thì fallback chủ sở hữu. Không tách/dedupe nhiều field mẫu.
 * Chỉ ghi khối AUTO khi thẻ danh sách chưa có block mới (thêm mới); block # tiêu đề đã có giữ nguyên.
 * Legacy <!-- AUTO_COLLECTION_LIST --> vẫn được migrate 1 lần rồi giữ ổn định.
 */

import {
  normalizeAsciiText,
  parseRankNumber,
  parseStatusHierarchy,
  splitMapHierarchyTokens,
  splitStatusHierarchyTokens,
} from './statusHierarchyParser.js';
import { parseOwnerTimelineHint } from './autoOwnerMilestone.js';
import { findEquivalentEntityByName } from './entityNameIdentity.js';
import { isAutoSyncExplicitlyOff } from './tabAutoSyncRole.js';
import { normalizeTabAutoSyncLevelConfig } from './tabAutoSyncLevels.js';
import { inferForceSystemLabel } from './forceRankLadder.js';
import { classifyOrgType, inferOrgTypeFromContext, inferOrgTypeFromTabSlug } from './forceOrgTypeInfer.js';
import { compareOutlineStrings } from './outlineListOrder.js';
import { MAX_QUICK_ENTRY_SLOTS } from './entityQuickEntrySlots.js';

const LEGACY_AUTO_LIST_START = '<!-- AUTO_COLLECTION_LIST:START -->';
const LEGACY_AUTO_LIST_END = '<!-- AUTO_COLLECTION_LIST:END -->';
const AUTO_LIST_TITLE = '# Danh m\u1ee5c th\u1ebb (AUTO)';
/** Giới hạn độ dài một mẩu «Nhãn - giá trị» sau [[Tên thẻ]] (tránh dòng AUTO quá dài). */
const AUTO_LIST_LABELED_FIELD_MAX_LEN = 180;

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

function stripTrailingCountSuffix(label) {
  return safeString(label).replace(/\s*\(\d+\)\s*$/u, '').trim();
}

function isMapLikeCollectionScope(context = {}) {
  const scope = normalize(
    [context.lonId, context.nhoId, context.tabLabel, context.parentLabel].filter(Boolean).join(' ')
  ).replace(/-/g, ' ');
  return scope.includes('ban do') || scope.includes('dia danh') || scope.includes('bi canh');
}

function getEntityHierarchyChain(entity) {
  const viTriTokens = splitMapHierarchyTokens(safeString(entity?.dynamicData?.f_vi_tri ?? entity?.f_vi_tri));
  if (viTriTokens.length > 1) return viTriTokens;
  const diaBanTokens = splitMapHierarchyTokens(safeString(entity?.dynamicData?.f_dia_ban ?? entity?.f_dia_ban));
  if (diaBanTokens.length > 1) return diaBanTokens;
  if (viTriTokens.length > 0) return viTriTokens;
  return diaBanTokens;
}

function isLabelMatchingScope(groupLabel, scopeLabel) {
  const groupNorm = normalizeGroupKey(stripTrailingCountSuffix(groupLabel));
  const scopeNorm = normalizeGroupKey(stripTrailingCountSuffix(scopeLabel));
  if (!groupNorm || !scopeNorm) return false;
  return groupNorm === scopeNorm;
}

function collectScopeLabels(sortContext = null) {
  if (!sortContext || typeof sortContext !== 'object') return [];
  return [
    sortContext.tabLabel,
    sortContext.parentLabel,
    sortContext.tabConfig?.label,
  ].filter((scope) => safeString(scope).trim());
}

/** Chỉ tên tab con (nho) — không gồm lon cha; dùng để bỏ lặp khi đang xem đúng tab đó. */
function collectSubTabEchoLabels(sortContext = null) {
  if (!sortContext || typeof sortContext !== 'object') return [];
  const a = safeString(sortContext.tabConfig?.label).trim();
  const b = safeString(sortContext.tabLabel).trim();
  const out = [];
  const push = (s) => {
    if (!s) return;
    const nk = normalizeGroupKey(stripTrailingCountSuffix(s));
    if (!nk) return;
    if (!out.some((x) => normalizeGroupKey(stripTrailingCountSuffix(x)) === nk)) out.push(s);
  };
  push(a);
  push(b);
  return out;
}

function isEchoOfCurrentSubTabLabel(text, sortContext) {
  const t = safeString(text).trim();
  if (!t || !sortContext || typeof sortContext !== 'object') return false;
  return collectSubTabEchoLabels(sortContext).some((scope) => isLabelMatchingScope(t, scope));
}

function omitSubTabEchoOrg(org, sortContext) {
  const v = safeString(org).trim();
  if (!v) return '';
  if (isEchoOfCurrentSubTabLabel(v, sortContext)) return '';
  return v;
}

function isTokenMatchingAnyScope(token, scopeCandidates = []) {
  return scopeCandidates.some((scope) => isLabelMatchingScope(token, scope));
}

function shouldSkipScopedForceBit(bitValue, sortContext) {
  const value = safeString(bitValue).trim();
  if (!value) return true;
  if (!isMapLikeCollectionScope(sortContext || {})) return false;
  const scopes = collectSubTabEchoLabels(sortContext);
  if (scopes.length === 0) return false;
  return scopes.some((scope) => isLabelMatchingScope(value, scope));
}

/** Bỏ các đoạn trùng scope khỏi nhãn nhóm; tab bản đồ chỉ bỏ echo tên tab con (không bỏ «Đế Quốc» trên tab Đế quốc). */
function stripScopeTokensFromGroupLabelText(rawLabel, sortContext) {
  const raw = safeString(rawLabel).trim();
  if (!raw) return '';
  const scopes = isMapLikeCollectionScope(sortContext || {})
    ? collectSubTabEchoLabels(sortContext)
    : collectScopeLabels(sortContext);
  if (scopes.length === 0) return raw;
  const parts = raw
    .split(MAP_GROUP_RANK_SEP)
    .flatMap((chunk) => chunk.split(/\s*·\s*/u))
    .map((s) => safeString(s).trim())
    .filter(Boolean)
    .filter((seg) => !isTokenMatchingAnyScope(seg, scopes));
  if (parts.length === 0) return '';
  return parts.join(MAP_GROUP_RANK_SEP);
}

function createMapTrieNode(displayLabel) {
  const label = safeString(displayLabel).trim();
  return {
    label: label || 'Ch\u01b0a ph\u00e2n lo\u1ea1i',
    key: normalizeGroupKey(label) || 'chua phan loai',
    entities: [],
    children: new Map(),
  };
}

/** Có thẻ khác với chuỗi dài hơn cùng cấp cha → cho phép gắn thẻ «chỉ cha» vào cấp con trùng tên. */
function collectMapTrieChildHints(items, sortContext) {
  const hints = new Set();
  (Array.isArray(items) ? items : []).forEach((ent) => {
    const ch = getScopedHierarchyChain(ent, sortContext);
    if (ch.length < 2) return;
    const pk = normalizeGroupKey(ch[0]) || '';
    const ck = normalizeGroupKey(ch[1]) || '';
    if (pk && ck) hints.add(`${pk}::${ck}`);
  });
  return hints;
}

function maybeExtendSingletonMapPath(path, entity, childHints) {
  const p = Array.isArray(path) ? [...path] : [];
  if (p.length !== 1) return p;
  const nm = safeString(entity?.name).trim();
  if (!nm) return p;
  const p0 = normalizeGroupKey(p[0]) || '';
  const nmKey = normalizeGroupKey(nm) || '';
  if (!p0 || !nmKey || nmKey === p0) return p;
  if (!childHints.has(`${p0}::${nmKey}`)) return p;
  return [...p, nm];
}

function insertEntityMapTrie(root, path, entity) {
  if (!Array.isArray(path) || path.length === 0) return;
  let node = root;
  for (let i = 0; i < path.length; i += 1) {
    const seg = path[i];
    const ck = normalizeGroupKey(seg) || 'khac';
    if (!node.children.has(ck)) {
      node.children.set(ck, createMapTrieNode(seg));
    }
    node = node.children.get(ck);
    if (i === path.length - 1) {
      node.entities.push(entity);
    }
  }
}

function countEntitiesInMapTrieNode(node) {
  let n = node.entities.length;
  node.children.forEach((ch) => {
    n += countEntitiesInMapTrieNode(ch);
  });
  return n;
}

/**
 * Chuỗi phân cấp sau khi bỏ các token trùng scope tab hiện tại. Ví dụ tab "Hạ Giới",
 * entity có f_vi_tri = "Hạ Giới · Băng Ma Tinh · Đại Lục" → ["Băng Ma Tinh", "Đại Lục"].
 */
function getScopedHierarchyChain(entity, sortContext) {
  const chain = getEntityHierarchyChain(entity);
  const scopes = collectScopeLabels(sortContext);
  if (scopes.length === 0) return chain;
  return chain.filter((token) => !isTokenMatchingAnyScope(token, scopes));
}

function _hasScopedHierarchySignal(items, sortContext) {
  const scopes = collectScopeLabels(sortContext);
  if (scopes.length === 0) return false;
  return items.some((entity) => {
    const chain = getEntityHierarchyChain(entity);
    return chain.some((token) => isTokenMatchingAnyScope(token, scopes));
  });
}

/**
 * Layout mục lục phân cấp khi tab hiện tại (vd. "Hạ Giới") đã xuất hiện trong chuỗi trực thuộc:
 *  - bỏ heading lớn trùng tab
 *  - cây địa danh đầy đủ: tinh cầu `##`, đại lục `###`, sâu hơn `####`…; thẻ cùng nút vừa liệt kê vừa có con thì con nằm dưới.
 */
function _appendScopedMapHierarchyLines(
  lines,
  items,
  strategy,
  ownerLookupEntities,
  sortContext,
  compareEntries,
  renderEntry
) {
  const root = { children: new Map() };
  const childHints = collectMapTrieChildHints(items, sortContext);
  const scopes = collectScopeLabels(sortContext);
  items.forEach((entity) => {
    const chain = getScopedHierarchyChain(entity, sortContext);
    let path = (Array.isArray(chain) ? chain : [])
      .map((t) => safeString(t).trim())
      .filter(Boolean)
      .filter((t) => !scopes.length || !isTokenMatchingAnyScope(t, scopes));
    if (path.length === 0) {
      const fallback = safeString(entity?.name).trim();
      path = fallback ? [fallback] : [];
    }
    path = maybeExtendSingletonMapPath(path, entity, childHints);
    insertEntityMapTrie(root, path, entity);
  });

  const sortByOutlineThenVi = (a, b) => {
    const la = safeString(a).trim();
    const lb = safeString(b).trim();
    const oc = compareOutlineStrings(la, lb);
    if (oc !== 0) return oc;
    return la.localeCompare(lb, 'vi');
  };

  const renderNode = (node, depth, isFirstTopSection) => {
    const total = countEntitiesInMapTrieNode(node);
    const displayLabel = stripScopeTokensFromGroupLabelText(node.label, sortContext);
    const stripped = safeString(displayLabel).trim();
    const childKeys = [...node.children.keys()].sort((ka, kb) =>
      sortByOutlineThenVi(node.children.get(ka).label, node.children.get(kb).label)
    );

    if (!stripped && node.entities.length === 0 && childKeys.length > 0) {
      childKeys.forEach((ck, idx) => {
        renderNode(node.children.get(ck), depth, isFirstTopSection && idx === 0);
      });
      return;
    }

    const headingLabel =
      stripped ||
      (isMapLikeCollectionScope(sortContext || {}) && isEchoOfCurrentSubTabLabel(node.label, sortContext)
        ? ''
        : node.label);
    const headingCore =
      depth === 0
        ? formatAutoListGroupHeading(
            safeString(headingLabel).trim() || 'Ch\u01b0a ph\u00e2n lo\u1ea1i',
            ownerLookupEntities
          )
        : safeString(stripped || node.label).trim();
    const hashes = '#'.repeat(Math.min(2 + depth, 6));

    if (!isFirstTopSection) lines.push('');
    lines.push(`${hashes} ${headingCore} (${total})`);
    lines.push('');

    let visibleIdx = 0;
    [...node.entities].sort(compareEntries).forEach((entity) => {
      const text = renderEntry(entity, ownerLookupEntities);
      if (!text) return;
      visibleIdx += 1;
      lines.push(`${visibleIdx}. ${text}`);
    });

    childKeys.forEach((ck) => {
      renderNode(node.children.get(ck), depth + 1, false);
    });
  };

  const topKeys = [...root.children.keys()].sort((ka, kb) =>
    sortByOutlineThenVi(root.children.get(ka).label, root.children.get(kb).label)
  );
  topKeys.forEach((tk, idx) => {
    renderNode(root.children.get(tk), 0, idx === 0);
  });

  return lines;
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
          /^#{2,6}\s/.test(trimmed) ||
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
  // Lặp xóa mọi dấu vết legacy (có thể bị nhồi nhiều lần vì sync lỗi trước đây).
  let guard = 0;
  while (guard < 20) {
    const legacy = findLegacyAutoListRange(text);
    if (!legacy) break;
    text = `${text.slice(0, legacy.start)}${text.slice(legacy.end)}`;
    guard += 1;
  }
  // Lặp xóa mọi block có tiêu đề "Danh mục thẻ (AUTO)" vì info có thể đã dính
  // nhiều bản chồng lên nhau (regression cũ trước khi scanner hỗ trợ ####).
  guard = 0;
  while (guard < 20) {
    const titleRange = findTitleAutoListRange(text);
    if (!titleRange) break;
    text = `${text.slice(0, titleRange.start)}${text.slice(titleRange.end)}`;
    guard += 1;
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

/** Đã có khối AUTO định dạng mới (và không còn legacy HTML comment cần migrate). */
export function hasCollectionListAutoBlock(baseText) {
  const text = safeString(baseText);
  if (!text) return false;
  // Còn <!-- AUTO_COLLECTION_LIST --> → cần bộ 1 lần để bỏ marker cũ.
  if (findLegacyAutoListRange(text)) return false;
  return !!findTitleAutoListRange(text);
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

function isAutoLevel2Enabled(tabConfig) {
  const cfg = normalizeTabAutoSyncLevelConfig(tabConfig?.autoSyncLevelConfig);
  return cfg.enabled !== false && cfg.levels?.level_2_list === true;
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
function _compareForceEntries(a, b) {
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
  const wrap = (v) => {
    const s = safeString(v).trim();
    if (!s) return '';
    if (!isMapLikeCollectionScope(ctx || {})) return s;
    return omitSubTabEchoOrg(s, ctx);
  };
  let o = resolveForceOrgTypeLabel(entity, ctx);
  if (o) return wrap(o);
  o = safeString(pickFirstFilled(entity, ['f_loai_to_chuc', 'f_loai'])).trim();
  if (o) return wrap(o);
  const fromId = inferOrgTypeFromTabSlug(safeString(ctx.nhoId || ctx.tabConfig?.id || ''));
  if (fromId) return wrap(fromId);
  return wrap(inferOrgTypeFromTabSlug(safeString(ctx.tabLabel || ctx.tabConfig?.label || '')));
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
function _compareForceLocationHierarchy(a, b, ctx) {
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

const MAP_GROUP_RANK_SEP = ' \u00b7 ';

/** Giống modal bản đồ `parseMapQuickState`: tách token theo · / • / | / /. */
function extractMapStatusSegments(fStatus) {
  return safeString(fStatus)
    .split(/[·•|/]+/)
    .map((s) => safeString(s).trim())
    .filter(Boolean);
}

/** «Quy mô địa vực» (và phần sau) khi f_status dạng «Giới diện · Quy mô …». */
function mapQuyMoRankLineFromEntity(entity) {
  const raw = pickFirstFilled(entity, ['f_status']);
  const segs = extractMapStatusSegments(raw);
  if (segs.length >= 2) return segs.slice(1).join(MAP_GROUP_RANK_SEP).trim();
  return '';
}

function _renderForceEntry(entity, ctx = {}) {
  const name = safeString(entity?.name).trim();
  if (!name) return '';
  const statusLine = safeString(pickFirstFilled(entity, ['f_status'])).trim();
  const statusBits = statusLine
    .split(/[·•|/]+/)
    .map((s) => safeString(s).trim())
    .filter(Boolean);
  const org = resolveOrgForMapList(entity, ctx);
  const sys = getForceRealmSystemSort(entity);
  const rank =
    mapQuyMoRankLineFromEntity(entity) || safeString(getForceRankLabel(entity)).trim();
  const bits = [];
  const seenNorm = new Set();
  const pushBit = (raw) => {
    const v = safeString(raw).trim();
    if (!v) return;
    if (shouldSkipScopedForceBit(v, ctx)) return;
    const nk = normalize(v);
    if (seenNorm.has(nk)) return;
    seenNorm.add(nk);
    bits.push(`\`${v}\``);
  };
  pushBit(org);
  if (statusBits.length >= 2) {
    statusBits.forEach(pushBit);
  } else {
    pushBit(sys);
    pushBit(rank);
  }
  if (bits.length === 0) return `[[${name}]]`;
  return `[[${name}]] - ${bits.join(' · ')}`;
}

/** Chuỗi cấp dùng để tách nhóm (không gộp cửu cấp với bát cấp). */
function rankLineForForceSubGroup(entity, sortContext = null) {
  const rankLine = safeString(getForceRankLabel(entity)).trim();
  if (rankLine) {
    if (Number.isFinite(parseRankNumber(rankLine))) return rankLine;
    const n = normalize(rankLine);
    if (/\b(cap|the\s+luc|de\b|ton\b|vuong\b|mon\b)\b/.test(n)) return rankLine;
  }
  const quyMo = mapQuyMoRankLineFromEntity(entity);
  if (quyMo) {
    if (
      sortContext &&
      isMapLikeCollectionScope(sortContext || {}) &&
      isEchoOfCurrentSubTabLabel(quyMo, sortContext)
    ) {
      return '';
    }
    return quyMo;
  }
  if (rankLine) {
    if (
      sortContext &&
      isMapLikeCollectionScope(sortContext || {}) &&
      isEchoOfCurrentSubTabLabel(rankLine, sortContext)
    ) {
      return '';
    }
    return rankLine;
  }
  return '';
}

/** Gom nhóm danh sách thế lực: cùng loại (Đế Quốc, Tông Môn…) nhưng khác cấp → tách bằng hậu tố · cấp bậc. */
function appendRankToForceGroupLabel(baseText, entity, sortContext = null) {
  const base = safeString(baseText).trim();
  const rankForSplit = rankLineForForceSubGroup(entity, sortContext);
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
    if (isMapLikeCollectionScope(ctx || {}) && isEchoOfCurrentSubTabLabel(v, ctx)) return;
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
function _buildMapForceGroupLabel(entity, ctx) {
  const core = buildMapForcePrimaryGroupLabel(entity, ctx);
  const rankLine = rankLineForForceSubGroup(entity, ctx);
  const merged = appendRankToForceGroupLabel(core, entity, ctx);
  return merged || safeString(rankLine || core || 'Chưa phân loại').trim();
}

function _compareRankSubgroupOrder(rankLabelA, rankLabelB) {
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

function getTabTemplateFields(tabConfig) {
  return Array.isArray(tabConfig?.fieldsTemplate) ? tabConfig.fieldsTemplate : [];
}

function _collectTemplateFieldIds(tabConfig) {
  return getTabTemplateFields(tabConfig)
    .map((field) => safeString(field?.id).trim())
    .filter(Boolean);
}

function collectTemplateOwnerFieldIds(tabConfig) {
  return getTabTemplateFields(tabConfig)
    .filter((field) => {
      const fieldId = safeString(field?.id).trim();
      const label = safeString(field?.label).trim();
      return isOwnerLikeFieldId(fieldId) || /(chủ|owner|sở hữu|phái|tổ chức|thế lực|phe)/i.test(label);
    })
    .map((field) => safeString(field?.id).trim())
    .filter(Boolean);
}

function collectTemplateDetailFieldIds(tabConfig) {
  const ownerFieldIds = new Set(collectTemplateOwnerFieldIds(tabConfig));
  const highPriority = [];
  const normalPriority = [];
  getTabTemplateFields(tabConfig).forEach((field) => {
    const fieldId = safeString(field?.id).trim();
    const label = safeString(field?.label).trim();
    if (!fieldId || ownerFieldIds.has(fieldId)) return;
    if (/^(f_alias|f_mo_ta|f_ghi_chu|f_note|f_notes|f_noi_dung|f_content)$/i.test(fieldId)) return;
    const signature = `${fieldId} ${label}`;
    if (/(vi_tri|dia_ban|status|cap|title|vị trí|địa bàn|trạng thái|cấp|tiêu đề)/i.test(signature)) {
      highPriority.push(fieldId);
    } else {
      normalPriority.push(fieldId);
    }
  });
  return [...highPriority, ...normalPriority];
}

/**
 * Các trường chi tiết (cùng tập hợp với `collectTemplateDetailFieldIds`), sắp theo
 * `field.sortPrefix` (I, II, 1, 1.1…) rồi theo thứ tự trong mẫu. Trả `null` nếu không
 * có mẫu trường — dùng `collectDefaultEntityDetailBitsLegacy` (hành vi cũ).
 */
function getDetailFieldObjectsForListDisplay(tabConfig) {
  const all = getTabTemplateFields(tabConfig);
  if (all.length === 0) return null;
  const ownerFieldIds = new Set(collectTemplateOwnerFieldIds(tabConfig));
  const out = [];
  all.forEach((field, index) => {
    const fieldId = safeString(field?.id).trim();
    if (!fieldId || ownerFieldIds.has(fieldId)) return;
    if (/^(f_alias|f_mo_ta|f_ghi_chu|f_note|f_notes|f_noi_dung|f_content)$/i.test(fieldId)) {
      return;
    }
    out.push({ field, fieldId, index });
  });
  if (out.length === 0) return null;
  out.sort((a, b) => {
    const as = safeString(a.field?.sortPrefix).trim();
    const bs = safeString(b.field?.sortPrefix).trim();
    if (as && bs) {
      const oc = compareOutlineStrings(as, bs);
      if (oc !== 0) return oc;
    } else if (as && !bs) return -1;
    else if (!as && bs) return 1;
    return a.index - b.index;
  });
  return out;
}

function pickFirstFieldEntry(entity, fieldIds) {
  for (const fieldId of fieldIds) {
    const id = safeString(fieldId).trim();
    if (!id) continue;
    const value = safeString(entity?.dynamicData?.[id] || entity?.[id]).trim();
    if (value) return { fieldId: id, value };
  }
  return null;
}

function findTemplateFieldById(tabConfig, fieldId) {
  const id = safeString(fieldId).trim();
  if (!id) return null;
  return getTabTemplateFields(tabConfig).find((f) => safeString(f?.id).trim() === id) || null;
}

/** Tách giá trị một trường thành các token hiển thị (cùng quy tắc tách cũ, không bọc nhãn). */
function collectListFieldTokens(fieldId, rawValue) {
  const v = safeString(rawValue).trim();
  if (!v || v.length > 80) return [];
  const fid = safeString(fieldId).trim();
  const sig = `${fid} `;
  if (/(vi_tri|dia_ban|vị trí|địa bàn)/i.test(sig)) {
    return splitMapHierarchyTokens(v);
  }
  if (/(^f_status$|^f_cap$|f_title|f_he_gioi)/i.test(fid) || /(status|cap|title|tiêu đề)/i.test(sig)) {
    const out = [];
    extractMapStatusSegments(v).forEach((seg) => {
      splitMapHierarchyTokens(seg).forEach((t) => {
        const s = safeString(t).trim();
        if (s) out.push(s);
      });
    });
    return out;
  }
  if (fid === 'f_desc') {
    return [v];
  }
  if (/[·•>|/,-]/.test(v)) {
    return splitMapHierarchyTokens(v);
  }
  return [v];
}

function listFieldTemplateLabel(field, fieldId) {
  const L = safeString(field?.label).trim();
  if (L) return L;
  return safeString(fieldId).trim();
}

function pushLabeledListFieldBits(field, fieldId, rawValue, pushBit, precomputedTokens = null) {
  const fid = safeString(fieldId).trim();
  const label = listFieldTemplateLabel(field || {}, fid);
  const tokens =
    precomputedTokens != null ? precomputedTokens.filter((t) => safeString(t).trim()) : collectListFieldTokens(fid, rawValue);
  if (tokens.length === 0) return;
  const valuePart = tokens.join(' · ');
  const piece = label ? `${label} - ${valuePart}` : valuePart;
  const pieceTrim = piece.trim();
  if (!pieceTrim || pieceTrim.length > AUTO_LIST_LABELED_FIELD_MAX_LEN) return;
  pushBit(pieceTrim);
}

function resolveOwnerLabel(entity, ownerLookupEntities = [], tabConfig = null) {
  const rawDirect = pickFirstFilled(entity, [
    ...collectTemplateOwnerFieldIds(tabConfig),
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
      fieldsTemplate: getTabTemplateFields(tabConfig),
      rawText: safeString(entity?.info || entity?.rawText),
    });
    ownerName = safeString(parsed?.ownerName).trim();
  }
  if (!ownerName) return '';
  const matched = findEquivalentEntityByName(ownerLookupEntities, ownerName);
  return safeString(matched?.entity?.name).trim() || ownerName;
}

function isOwnerLikeFieldId(fieldId) {
  const fid = safeString(fieldId).trim().toLowerCase();
  if (!fid) return false;
  if (/loai_to_chuc/.test(fid)) return false;
  /** `f_to_chuc` hay gán nhãn «bản chất / phân loại» (vd. Túc địch), không chỉ quyền sở hữu — vẫn đưa vào mẩu AUTO. */
  if (fid === 'f_to_chuc') return false;
  /** Không dùng mẫu /chu/ — khớp nhầm mọi id chứa «chu» (vd. f_chu = Nguồn gốc trong mẫu). */
  return /(owner|so_huu|phai|to_chuc|the_luc|phe|mon_phai|tong_phai|tong_mon|khe_chu|nguoi_so_huu|nguoi_su_dung|nguoi_tu_luyen|truyen_nhan)/.test(
    fid
  );
}

/**
 * Trường đưa vào hậu tố dòng AUTO: nếu có ít nhất một `sortPrefix` (Số TT) trên mẫu,
 * chỉ các trường **đã nhập Số TT**, thứ tự 1 → 2 → 3 → 4 (theo `compareOutlineStrings`).
 * Nếu không ai có Số TT: tối đa {@link MAX_QUICK_ENTRY_SLOTS} trường chi tiết đầu tiên (tương thích tab cũ).
 */
function getAutoListDetailFieldObjects(tabConfig) {
  const orderedObjects = getDetailFieldObjectsForListDisplay(tabConfig);
  if (!orderedObjects || orderedObjects.length === 0) return null;
  const numbered = orderedObjects.filter((row) => safeString(row.field?.sortPrefix).trim());
  if (numbered.length > 0) return numbered.slice(0, MAX_QUICK_ENTRY_SLOTS);
  return orderedObjects.slice(0, MAX_QUICK_ENTRY_SLOTS);
}

function collectDefaultEntityDetailBitsLegacy(entity, tabConfig = null) {
  const bits = [];
  const seen = new Set();
  const pushBit = (raw) => {
    const value = normalizeListBitToken(safeString(raw)).trim();
    if (!value) return;
    const key = normalize(value);
    if (!key || seen.has(key)) return;
    seen.add(key);
    bits.push(value);
  };

  const templateDetailFieldIds = collectTemplateDetailFieldIds(tabConfig);
  const locationCandidateFieldIds = [
    ...templateDetailFieldIds.filter((fieldId) => /(vi_tri|dia_ban)/i.test(fieldId)),
    'f_vi_tri',
    'f_dia_ban',
  ];
  const statusCandidateFieldIds = [
    ...templateDetailFieldIds.filter((fieldId) => /(status|cap|title)/i.test(fieldId)),
    'f_status',
    'f_cap',
    'f_title',
  ];
  const locEntry = pickFirstFieldEntry(entity, locationCandidateFieldIds);
  if (locEntry) {
    const locField = findTemplateFieldById(tabConfig, locEntry.fieldId);
    pushLabeledListFieldBits(locField || { id: locEntry.fieldId, label: '' }, locEntry.fieldId, locEntry.value, pushBit);
  }

  const stEntry = pickFirstFieldEntry(entity, statusCandidateFieldIds);
  if (stEntry) {
    const stField = findTemplateFieldById(tabConfig, stEntry.fieldId);
    pushLabeledListFieldBits(stField || { id: stEntry.fieldId, label: '' }, stEntry.fieldId, stEntry.value, pushBit);
  }

  // Đồng bộ trải nghiệm giữa tab bản đồ và tab khác:
  // luôn bổ sung detail theo thứ tự field của tab hiện tại (nếu có),
  // không chỉ fallback khi rỗng. Nhờ đó mọi tab cùng chung format hiển thị.
  if (entity?.dynamicData && typeof entity.dynamicData === 'object') {
    const skipKeys = new Set([
      'f_alias',
      'f_mo_ta',
      'f_ghi_chu',
      'f_note',
      'f_notes',
      'f_noi_dung',
      'f_content',
    ]);
    const preferredFieldIds = templateDetailFieldIds.length > 0
      ? templateDetailFieldIds
      : Object.keys(entity.dynamicData || {});
    preferredFieldIds.forEach((fieldId) => {
      const rawValue = entity.dynamicData?.[fieldId];
      const fid = safeString(fieldId).trim().toLowerCase();
      if (!fid || skipKeys.has(fid)) return;
      if (isOwnerLikeFieldId(fid)) return;
      const value = safeString(rawValue).trim();
      if (!value) return;
      if (value.length > 80) return;
      if (normalize(value) === normalize(entity?.name)) return;
      const fieldObj = findTemplateFieldById(tabConfig, fieldId);
      pushLabeledListFieldBits(fieldObj || { id: fieldId, label: '' }, fieldId, rawValue, pushBit);
    });
  }

  return bits.slice(0, 3);
}

/** Tách từng mẩu [[…]] trong văn trường. */
function extractWikiInnersFromFieldText(text) {
  const out = [];
  const s = safeString(text);
  const re = /\[\[([^\]]*?)\]\]/gu;
  let m;
  while ((m = re.exec(s)) !== null) {
    const inner = safeString(m[1]).trim();
    if (inner) out.push(inner);
  }
  return out;
}

/** Token sau khi tách: bỏ bọc `[[x]]` → `x` (khớp tập nguồn wiki). */
function normalizeListBitToken(raw) {
  const t = safeString(raw).trim();
  const m = t.match(/^\[\[([^\]]*)\]\]$/u);
  return m ? safeString(m[1]).trim() : t;
}

/** Chuẩn hóa nội bộ [[…]] đã gõ trong các trường dùng làm mẩu AUTO. */
function collectWikiInnerNormsFromDetailFieldSources(entity, tabConfig) {
  const norms = new Set();
  const addText = (t) => {
    extractWikiInnersFromFieldText(t).forEach((inner) => {
      const n = normalize(safeString(inner).trim());
      if (n) norms.add(n);
    });
  };
  const dyn = entity?.dynamicData && typeof entity.dynamicData === 'object' ? entity.dynamicData : {};
  const skipKeys = new Set([
    'f_alias',
    'f_mo_ta',
    'f_ghi_chu',
    'f_note',
    'f_notes',
    'f_noi_dung',
    'f_content',
  ]);
  const orderedObjects = getAutoListDetailFieldObjects(tabConfig);
  if (orderedObjects && orderedObjects.length > 0) {
    orderedObjects.forEach(({ fieldId }) => {
      const fid = safeString(fieldId).trim().toLowerCase();
      if (skipKeys.has(fid) || isOwnerLikeFieldId(fid)) return;
      addText(dyn[fieldId]);
    });
    return norms;
  }
  const templateDetailFieldIds = collectTemplateDetailFieldIds(tabConfig);
  const locationCandidateFieldIds = [
    ...templateDetailFieldIds.filter((fieldId) => /(vi_tri|dia_ban)/i.test(fieldId)),
    'f_vi_tri',
    'f_dia_ban',
  ];
  const statusCandidateFieldIds = [
    ...templateDetailFieldIds.filter((fieldId) => /(status|cap|title)/i.test(fieldId)),
    'f_status',
    'f_cap',
    'f_title',
  ];
  new Set([...locationCandidateFieldIds, ...statusCandidateFieldIds]).forEach((id) => {
    addText(dyn[safeString(id).trim()]);
  });
  const preferredFieldIds = templateDetailFieldIds.length > 0 ? templateDetailFieldIds : Object.keys(dyn);
  preferredFieldIds.forEach((fieldId) => {
    const fid = safeString(fieldId).trim().toLowerCase();
    if (!fid || skipKeys.has(fid) || isOwnerLikeFieldId(fid)) return;
    addText(dyn[fieldId]);
  });
  return norms;
}

function ownerFieldRawHadWikiForLabel(entity, tabConfig, ownerLabel) {
  if (!ownerLabel) return false;
  const n = normalize(ownerLabel);
  const candidateIds = [
    ...collectTemplateOwnerFieldIds(tabConfig),
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
  ];
  const seen = new Set();
  const dyn = entity?.dynamicData && typeof entity.dynamicData === 'object' ? entity.dynamicData : {};
  for (const id of candidateIds) {
    const k = safeString(id).trim();
    if (seen.has(k)) continue;
    seen.add(k);
    const inners = extractWikiInnersFromFieldText(dyn[k] ?? '');
    if (inners.some((inner) => normalize(safeString(inner).trim()) === n)) return true;
  }
  for (const [k, v] of Object.entries(dyn)) {
    if (/loai_to_chuc/i.test(k)) continue;
    if (!/(chu|owner|so_huu|phai|to_chuc|the_luc|phe)/i.test(k)) continue;
    if (extractWikiInnersFromFieldText(v).some((inner) => normalize(safeString(inner).trim()) === n)) {
      return true;
    }
  }
  return false;
}

/** Giá trị mẩu AUTO — tông trắng xám sáng; in đậm bằng ** (strong kế thừa màu span trong processInline). */
const AUTO_LIST_FIELD_VALUE_COLOR = '#f8fafc';
/** Nhãn trường (mẫu / id hiển thị) — xanh sáng, tách biệt giá trị. */
const AUTO_LIST_FIELD_NAME_COLOR = '#93c5fd';
/** Dấu «-» giữa nhãn và giá trị (cùng tông meta với dấu ·). */
const AUTO_LIST_META_MINUS_COLOR = '#a8c0d8';
/** Giữ tương thích tên hằng cũ (cùng màu giá trị). */
const AUTO_LIST_PLAIN_BIT_COLOR = AUTO_LIST_FIELD_VALUE_COLOR;
/** Dấu nối giữa các mẩu (màu meta dễ đọc trên nền tối). */
const AUTO_LIST_META_SEP = ` [color=#8ca0be]·[/color] `;
/** Giữ tên hằng cũ cho API join (cùng giá trị với dấu nối mới). */
const AUTO_LIST_DETAIL_SEP = AUTO_LIST_META_SEP;
/** Trần mức khi một trường (vd. chuỗi địa) tách thành nhiều mẩu — không giới hạn số *trường* đã gán Số TT. */
const AUTO_LIST_DETAIL_BIT_CAP = 32;

function autoListSanitizeForColorTagInner(raw) {
  return safeString(raw)
    .trim()
    .replace(/\[\/color\]/gi, '/color');
}

/** Bọc giá trị plain: màu + in đậm; gỡ `**` lồng để không vỡ markdown. */
function autoListWrapValueColoredBold(colorHex, rawInner) {
  const inner = autoListSanitizeForColorTagInner(rawInner).replace(/\*\*/g, '');
  if (!inner) return '';
  return `[color=${colorHex}]**${inner}**[/color]`;
}

function autoListSanitizeWikiBracketInner(raw) {
  return autoListSanitizeForColorTagInner(raw).replace(/\]\]/g, '⟩⟩');
}

/** Trùng tên thẻ (không phải thẻ danh sách) → AUTO bọc [[…]] để preview còn bấm mở hồ sơ. */
function getLinkableEntityMatchForAutoList(inner, ownerLookupEntities) {
  const match = findEquivalentEntityByName(ownerLookupEntities || [], inner, {});
  if (!match?.entity) return null;
  if (isListCardEntity(match.entity)) return null;
  return match;
}

function formatOneAutoListDetailSegment(seg, wikiNorms, ownerLookupEntities) {
  const inner = autoListSanitizeForColorTagInner(seg);
  const n = normalize(inner);
  const fromFieldWiki = wikiNorms.has(n);
  const entMatch = getLinkableEntityMatchForAutoList(inner, ownerLookupEntities);
  const useWiki = fromFieldWiki || !!entMatch;
  if (!useWiki) {
    return autoListWrapValueColoredBold(AUTO_LIST_FIELD_VALUE_COLOR, inner);
  }
  const linkLabel = entMatch?.entity?.name
    ? autoListSanitizeWikiBracketInner(safeString(entMatch.entity.name).trim())
    : autoListSanitizeWikiBracketInner(inner);
  return `[[${linkLabel}]]`;
}

function formatLabeledAutoListFieldPreview(labelPart, valuePart, wikiNorms, ownerLookupEntities) {
  const lp = autoListSanitizeForColorTagInner(labelPart);
  const vp = autoListSanitizeForColorTagInner(valuePart);
  const nameSeg = `[color=${AUTO_LIST_FIELD_NAME_COLOR}]${lp}[/color] [color=${AUTO_LIST_META_MINUS_COLOR}]-[/color]`;
  if (vp.includes('[[')) {
    const segs = vp.split(/\s·\s/).map((s) => s.trim()).filter(Boolean);
    if (segs.length > 1) {
      const parts = segs.map((seg) => formatOneAutoListDetailSegment(seg, wikiNorms, ownerLookupEntities));
      return `${nameSeg} ${parts.join(AUTO_LIST_DETAIL_SEP)}`;
    }
  }
  const valueSeg = formatOneAutoListDetailSegment(vp, wikiNorms, ownerLookupEntities);
  return `${nameSeg} ${valueSeg}`;
}

function formatAutoListDetailBitsForPreview(detailBits, entity, tabConfig, ownerLookupEntities) {
  if (!Array.isArray(detailBits) || detailBits.length === 0) return '';
  const wikiNorms = collectWikiInnerNormsFromDetailFieldSources(entity, tabConfig);
  return detailBits
    .map((b) => {
      const raw = autoListSanitizeForColorTagInner(b);
      const labeled = /^(.+?)\s-\s(.+)$/.exec(raw);
      if (labeled) {
        const labelPart = labeled[1].trim();
        const valuePart = labeled[2].trim();
        return formatLabeledAutoListFieldPreview(labelPart, valuePart, wikiNorms, ownerLookupEntities);
      }
      return formatOneAutoListDetailSegment(raw, wikiNorms, ownerLookupEntities);
    })
    .join(AUTO_LIST_DETAIL_SEP);
}

/** Nguyên chuỗi ô «Chuỗi hiển thị / dữ liệu AUTO» (`f_status`), fallback `entity.status`. */
function getEntityDisplayLineRaw(entity) {
  const fromDyn = safeString(entity?.dynamicData?.f_status).trim();
  if (fromDyn) return fromDyn;
  return safeString(entity?.status).trim();
}

/** Giữ nguyên chuỗi hiển thị: không tách nhãn/field; chỉ bọc màu nếu chưa có [[wiki]]. */
function formatRawDisplayLineForPreview(raw) {
  const t = safeString(raw).trim();
  if (!t) return '';
  if (t.includes('[[')) return autoListSanitizeForColorTagInner(t);
  return autoListWrapValueColoredBold(AUTO_LIST_FIELD_VALUE_COLOR, t);
}

function buildAutoListEntryPayload(entity, ownerLookupEntities = [], tabConfig = null) {
  const name = safeString(entity?.name).trim();
  if (!name) return null;
  const displayLine = getEntityDisplayLineRaw(entity);
  const displayNorm = normalize(displayLine);
  const usableDisplay =
    displayLine && displayNorm && displayNorm !== normalize(name) ? displayLine : '';
  const ownerLabel = usableDisplay ? '' : resolveOwnerLabel(entity, ownerLookupEntities, tabConfig);
  return { name, displayLine: usableDisplay, ownerLabel };
}

/** Số mẩu sau `[[Tên thẻ]]` trên dòng AUTO: 1 nếu có chuỗi hiển thị hoặc chủ; 0 nếu chỉ tên. */
function getAutoListLineSegmentCount(entity, ownerLookupEntities, tabConfig) {
  const p = buildAutoListEntryPayload(entity, ownerLookupEntities, tabConfig);
  if (!p) return 0;
  if (p.displayLine) return 1;
  if (p.ownerLabel) return 1;
  return 0;
}

function renderAutoListEntry(entity, ownerLookupEntities = [], tabConfig = null) {
  const payload = buildAutoListEntryPayload(entity, ownerLookupEntities, tabConfig);
  if (!payload) return '';
  const { name, displayLine, ownerLabel } = payload;
  if (displayLine) {
    return `[[${name}]]${AUTO_LIST_DETAIL_SEP}${formatRawDisplayLineForPreview(displayLine)}`;
  }
  if (ownerLabel) {
    const oPlain = autoListSanitizeForColorTagInner(ownerLabel);
    const fromFieldWiki = ownerFieldRawHadWikiForLabel(entity, tabConfig, ownerLabel);
    const entMatch = getLinkableEntityMatchForAutoList(oPlain, ownerLookupEntities);
    const useWiki = fromFieldWiki || !!entMatch;
    if (!useWiki) {
      return `[[${name}]]${AUTO_LIST_DETAIL_SEP}${autoListWrapValueColoredBold(AUTO_LIST_FIELD_VALUE_COLOR, oPlain)}`;
    }
    const linkLabel = entMatch?.entity?.name
      ? autoListSanitizeWikiBracketInner(safeString(entMatch.entity.name).trim())
      : autoListSanitizeWikiBracketInner(oPlain);
    return `[[${name}]]${AUTO_LIST_DETAIL_SEP}[[${linkLabel}]]`;
  }
  return `[[${name}]]`;
}

function buildAutoLines(records, ownerLookupEntities = [], tabConfig = null) {
  let items = Array.isArray(records) ? [...records] : [];
  items.sort((a, b) => {
    const ca = getAutoListLineSegmentCount(a, ownerLookupEntities, tabConfig);
    const cb = getAutoListLineSegmentCount(b, ownerLookupEntities, tabConfig);
    if (ca !== cb) return ca - cb;
    const na = safeString(a?.name).trim();
    const nb = safeString(b?.name).trim();
    return na.localeCompare(nb, 'vi', { sensitivity: 'base' });
  });
  const lines = [AUTO_LIST_TITLE, '', `- T\u1ed5ng s\u1ed1 th\u1ebb: ${items.length}`, ''];

  if (items.length === 0) {
    lines.push('## Ch\u01b0a ph\u00e2n lo\u1ea1i (0)');
    lines.push('');
    lines.push('- Ch\u01b0a c\u00f3 th\u1ebb n\u00e0o trong tab n\u00e0y.');
    return lines;
  }

  lines.push(`## Danh s\u00e1ch (${items.length})`);
  lines.push('');
  let visibleIdx = 0;
  items.forEach((entity) => {
    const lineContent = renderAutoListEntry(entity, ownerLookupEntities, tabConfig);
    if (!lineContent) return;
    visibleIdx += 1;
    lines.push(`${visibleIdx}. ${lineContent}`);
  });

  return lines;
}

function syncListCardsInTab(tabData, context, ownerLookupEntities) {
  const entities = Array.isArray(tabData?.entities) ? tabData.entities : [];
  const listCards = entities.filter(isListCardEntity);
  if (listCards.length === 0) return false;

  const normalEntities = entities.filter((entity) => !isListCardEntity(entity));
  const blockText = buildAutoLines(normalEntities, ownerLookupEntities, context?.tabConfig || null).join('\n');
  let changed = false;

  listCards.forEach((listCard) => {
    // Đã có khối AUTO (định dạng # tiêu đề) → giữ nguyên.
    // Chưa có / chỉ còn legacy HTML comment → bộ 1 lần (migrate hoặc thêm mới).
    if (hasCollectionListAutoBlock(listCard.info)) return;
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
      const explicitOff = isAutoSyncExplicitlyOff(nho);
      const level2Enabled = isAutoLevel2Enabled(nho);
      if (explicitOff || !level2Enabled) {
        changed = clearListCardsAutoInTab(tabData) || changed;
        return;
      }
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
      const explicitOff = isAutoSyncExplicitlyOff(nho);
      const level2Enabled = isAutoLevel2Enabled(nho);
      if (explicitOff || !level2Enabled) {
        changed = clearListCardsAutoInTab(tabData) || changed;
        return;
      }
      changed = ensureListCardEntity(tabData, nho?.label || nhoId) || changed;
      changed = seedAutoLevelsForCanonicalListCard(nho, tabData, nho?.label || nhoId) || changed;
    });
  });

  return changed;
}
