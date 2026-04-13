/**
 * Đồng bộ AUTO hai chiều giữa tab Hệ Thống Tu Luyện và Cảnh Giới Tu Vi.
 * Dựa trên `f_status` và `f_alias` để ghép hệ thống với cảnh giới tương ứng.
 * Chỉ chạm vào khối AUTO, giữ nguyên ghi chú tay của người dùng.
 */
import { buildPreferredWikiName } from './entityWikiDisambiguation.js';
import { findEquivalentEntityByName } from './entityNameIdentity.js';
import { normalizeAsciiText, parseRankNumber as parseStatusRankNumber, splitStatusHierarchyTokens } from './statusHierarchyParser.js';
import { getEntityAutoFieldValue } from './tabAutoSyncFieldMap.js';
import {
  AUTO_SYNC_ENGINE_CULTIVATION,
  isEntityAutoSyncDisabled,
  isEntityAutoSyncLocked,
} from './autoSyncEntityPrefs.js';
import {
  AUTO_SYNC_ROLE_CULTIVATION_REALM,
  AUTO_SYNC_ROLE_CULTIVATION_SYSTEM,
  getEffectiveAutoSyncRole,
  hasAutoSyncFeature,
  isAutoSyncExplicitlyOff,
} from './tabAutoSyncRole.js';

const REALM_AUTO_TITLE = '## Hệ Thống Tu Luyện Liên Quan (AUTO)';
const SYSTEM_AUTO_TITLE = '## Cảnh Giới Tu Vi Liên Quan (AUTO)';
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

function buildCultivationFieldContext(path = {}) {
  return {
    activeTabLon: path.lonId || '',
    activeTabNho: path.nhoId || '',
    currentTabConfig: path.currentTabConfig || null,
    parentLabel: path.parentLabel || '',
  };
}

function isSystemTabConfig(tabConfig) {
  const key = normalizeKey(tabConfig?.id || tabConfig?.label || '');
  return key === 'he-thong-tu-luyen' || key.includes('he thong tu luyen');
}

function isRealmTabConfig(tabConfig) {
  const key = normalizeKey(tabConfig?.id || tabConfig?.label || '');
  return (
    key === 'canh-gioi-tu-vi' ||
    key === 'canh-gioi' ||
    key.includes('canh gioi tu vi') ||
    key.includes('canh gioi')
  );
}

function buildAutoBlockRegex(title) {
  return new RegExp(`${escapeRegExp(title)}[\\s\\S]*?${escapeRegExp(AUTO_END)}`, 'g');
}

function stripCultivationAutoBlocks(infoText) {
  return String(infoText || '')
    .replace(buildAutoBlockRegex(REALM_AUTO_TITLE), '')
    .replace(buildAutoBlockRegex(SYSTEM_AUTO_TITLE), '')
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

function findCultivationTabPaths(novelData) {
  const tabsConfig = Array.isArray(novelData?.tabsConfig) ? novelData.tabsConfig : [];
  let systemPath = null;
  let realmPath = null;

  for (const lon of tabsConfig) {
    for (const nho of lon?.subTabs || []) {
      if (nho?.viewType !== 'collection-track') continue;
      const role = getEffectiveAutoSyncRole({
        activeTabLon: lon?.id || '',
        activeTabNho: nho?.id || '',
        currentTabConfig: nho,
        parentLabel: lon?.label || '',
      });
      if (!systemPath && role === AUTO_SYNC_ROLE_CULTIVATION_SYSTEM) {
        systemPath = { lonId: lon.id, nhoId: nho.id, currentTabConfig: nho, parentLabel: lon?.label || '' };
      }
      if (!realmPath && role === AUTO_SYNC_ROLE_CULTIVATION_REALM) {
        realmPath = { lonId: lon.id, nhoId: nho.id, currentTabConfig: nho, parentLabel: lon?.label || '' };
      }
      if (systemPath && realmPath) return { systemPath, realmPath };
    }
  }

  return { systemPath, realmPath };
}

function getCollectionEntities(novelData, lonId, nhoId) {
  const tabData = novelData?.data?.[lonId]?.[nhoId];
  return Array.isArray(tabData?.entities) ? tabData.entities : [];
}

function getStatusLine(entity, path = null) {
  const ctx = buildCultivationFieldContext(path || {});
  return (
    getEntityAutoFieldValue(entity, ctx, 'status', { fallbackToStatus: true }) ||
    safeString(entity?.dynamicData?.f_status || entity?.status).trim()
  );
}

function buildEntitiesWithAutoAlias(entities, path = null) {
  const ctx = buildCultivationFieldContext(path || {});
  return (Array.isArray(entities) ? entities : []).map((entity) => {
    const aliasText =
      getEntityAutoFieldValue(entity, ctx, 'alias') ||
      safeString(entity?.dynamicData?.f_alias);
    if (!aliasText) return entity;
    return {
      ...entity,
      dynamicData: {
        ...(entity?.dynamicData && typeof entity.dynamicData === 'object' ? entity.dynamicData : {}),
        f_alias: aliasText,
      },
    };
  });
}

function isLikelyRankText(text) {
  const norm = normalizeKey(text);
  if (!norm) return false;
  if (/\b(?:de\s*)?(?:nhat|nhi|tam|tu|ngu|luc|that|bat|cuu|thap)\b/.test(norm)) {
    const words = norm.split(/\s+/).filter(Boolean);
    if (words.length <= 2) return true;
  }
  if (/\b(?:so|trung|hau)\s*(?:ky|cap|tang)\b/.test(norm)) return true;
  if (/\b(?:vien\s*man|dinh\s*phong|dot\s*pha|bat\s*cap|cuu\s*cap|thap\s*cap)\b/.test(norm)) return true;
  if (/\b(?:cap|bac|tang|pham|giai|trung|hau|so)\b/.test(norm) && norm.length <= 16) return true;
  return false;
}

function extractRankToken(tokens, matchedSystemToken) {
  const systemKey = normalizeKey(matchedSystemToken);
  const candidates = (Array.isArray(tokens) ? tokens : []).filter((token) => normalizeKey(token) !== systemKey);
  for (const token of candidates) {
    if (isLikelyRankText(token)) return String(token || '').trim();
  }
  return '';
}

function scoreMatchReason(reason) {
  switch (reason) {
    case 'exact':
    case 'alias':
      return 5;
    case 'fingerprint':
    case 'alias_fingerprint':
      return 4;
    case 'canonical_fingerprint':
    case 'alias_canonical_fingerprint':
      return 3;
    default:
      return 1;
  }
}

function resolveRealmToSystemMatch(realmEntity, systemEntities, systemPath = null, realmPath = null) {
  const statusLine = getStatusLine(realmEntity, realmPath);
  if (!statusLine) return null;

  const tokens = splitStatusHierarchyTokens(statusLine);
  if (tokens.length === 0) return null;

  const systemEntitiesWithAlias = buildEntitiesWithAutoAlias(systemEntities, systemPath);
  const candidates = [];
  tokens.forEach((token, index) => {
    const matched = findEquivalentEntityByName(systemEntitiesWithAlias, token);
    if (!matched?.entity) return;
    candidates.push({
      token: String(token || '').trim(),
      index,
      match: matched,
    });
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const reasonCmp = scoreMatchReason(b.match?.reason) - scoreMatchReason(a.match?.reason);
    if (reasonCmp !== 0) return reasonCmp;
    const lenCmp = String(b.token || '').trim().length - String(a.token || '').trim().length;
    if (lenCmp !== 0) return lenCmp;
    return a.index - b.index;
  });

  const best = candidates[0];
  const rankToken = extractRankToken(tokens, best.token);

  return {
    realmEntity,
    statusLine,
    tokens,
    systemEntity: best.match.entity,
    systemToken: best.token,
    systemMatchReason: best.match.reason,
    rankToken,
  };
}

function buildRealmAutoBlockLines(match) {
  const lines = [];
  if (match?.systemEntity?.name) {
    lines.push(`- Hệ thống liên kết: [[${String(match.systemEntity.name).trim()}]]`);
  }
  const matchedToken = String(match?.systemToken || '').trim();
  const systemName = String(match?.systemEntity?.name || '').trim();
  if (matchedToken && normalizeKey(matchedToken) !== normalizeKey(systemName)) {
    lines.push(`- Khớp theo bí danh: ${matchedToken}`);
  }
  if (match?.rankToken) {
    lines.push(`- Thứ tự cảnh giới: ${match.rankToken}`);
  }
  return lines;
}

function buildSystemAutoBlockLines(realmRecords) {
  const lines = [];
  let order = 1;
  (realmRecords || []).forEach((record) => {
    const displayName = buildPreferredWikiName({
      name: record?.realmEntity?.name,
      statusLine: record?.statusLine || '',
    });
    if (!displayName) return;
    const suffix = record?.rankToken ? ` · ${record.rankToken}` : '';
    lines.push(`- ${order}. [[${displayName}]]${suffix}`);
    order += 1;
  });
  return lines;
}

function compareRealmRecords(a, b) {
  const aRank = Number.isFinite(a?.rankScore) ? a.rankScore : Number.POSITIVE_INFINITY;
  const bRank = Number.isFinite(b?.rankScore) ? b.rankScore : Number.POSITIVE_INFINITY;
  if (aRank !== bRank) return aRank - bRank;
  const aName = normalizeKey(a?.realmEntity?.name);
  const bName = normalizeKey(b?.realmEntity?.name);
  return aName.localeCompare(bName);
}

function rankScoreFromText(rankToken) {
  const norm = normalizeKey(rankToken);
  if (!norm) return Number.POSITIVE_INFINITY;
  const compact = norm.replace(/\s+/g, ' ');
  if (/\b(?:de\s*)?nhat\b/.test(compact)) return 1;
  if (/\b(?:de\s*)?nhi\b/.test(compact)) return 2;
  if (/\b(?:de\s*)?tam\b/.test(compact)) return 3;
  if (/\b(?:de\s*)?tu\b/.test(compact)) return 4;
  if (/\b(?:de\s*)?ngu\b/.test(compact)) return 5;
  if (/\b(?:de\s*)?luc\b/.test(compact)) return 6;
  if (/\b(?:de\s*)?that\b/.test(compact)) return 7;
  if (/\b(?:de\s*)?bat\b/.test(compact)) return 8;
  if (/\b(?:de\s*)?cuu\b/.test(compact)) return 9;
  if (/\b(?:de\s*)?thap\b/.test(compact)) return 10;
  const numeric = parseStatusRankNumber(rankToken);
  if (Number.isFinite(numeric)) return numeric;
  if (/\bso\s*ky\b/.test(compact)) return 11;
  if (/\btrung\s*ky\b/.test(compact)) return 12;
  if (/\bhau\s*ky\b/.test(compact)) return 13;
  if (/\bvien\s*man\b/.test(compact)) return 14;
  if (/\bdinh\s*phong\b/.test(compact)) return 15;
  return Number.POSITIVE_INFINITY;
}

export function isCultivationRelationScope({
  activeTabLon = '',
  activeTabNho = '',
  currentTabConfig = null,
} = {}) {
  if (isAutoSyncExplicitlyOff(currentTabConfig)) return false;
  if (hasAutoSyncFeature({ activeTabLon, activeTabNho, currentTabConfig }, 'cultivation')) {
    return true;
  }
  void activeTabLon;
  const nhoKey = normalizeKey(activeTabNho || currentTabConfig?.id || '');
  const labelKey = normalizeKey(currentTabConfig?.label || '');
  return isSystemTabConfig({ id: nhoKey, label: labelKey }) || isRealmTabConfig({ id: nhoKey, label: labelKey });
}

export function syncAllCultivationRelationBlocks(novelData) {
  const data = novelData?.data;
  if (!data || typeof data !== 'object') return false;

  let changed = false;
  forEachCollectionEntity(novelData, (entity) => {
    if (!entity || typeof entity !== 'object') return;
    if (isEntityAutoSyncLocked(entity, AUTO_SYNC_ENGINE_CULTIVATION)) return;
    const before = String(entity.info || '');
    const after = stripCultivationAutoBlocks(before);
    if (after !== before) {
      entity.info = after;
      changed = true;
    }
  });

  const { systemPath, realmPath } = findCultivationTabPaths(novelData);
  if (!systemPath && !realmPath) return changed;

  const systemEntities = systemPath
    ? getCollectionEntities(novelData, systemPath.lonId, systemPath.nhoId).filter(
        (entity) => !isEntityAutoSyncDisabled(entity, AUTO_SYNC_ENGINE_CULTIVATION)
      )
    : [];
  const realmEntities = realmPath
    ? getCollectionEntities(novelData, realmPath.lonId, realmPath.nhoId).filter(
        (entity) => !isEntityAutoSyncDisabled(entity, AUTO_SYNC_ENGINE_CULTIVATION)
      )
    : [];

  if (systemEntities.length === 0 || realmEntities.length === 0) {
    return changed;
  }

  const realmRecordsBySystemId = new Map();
  realmEntities.forEach((realmEntity) => {
    const match = resolveRealmToSystemMatch(realmEntity, systemEntities, systemPath, realmPath);
    if (!match?.systemEntity) return;
    const rankScore = rankScoreFromText(match.rankToken);
    if (!isEntityAutoSyncLocked(realmEntity, AUTO_SYNC_ENGINE_CULTIVATION)) {
      const baseInfo = String(realmEntity.info || '');
      const nextInfo = upsertAutoBlock(baseInfo, REALM_AUTO_TITLE, buildRealmAutoBlockLines(match));
      if (nextInfo !== baseInfo) {
        realmEntity.info = nextInfo;
        changed = true;
      }
    }

    const systemId = match.systemEntity.id;
    if (!realmRecordsBySystemId.has(systemId)) realmRecordsBySystemId.set(systemId, []);
    realmRecordsBySystemId.get(systemId).push({
      realmEntity,
      statusLine: match.statusLine,
      rankToken: match.rankToken,
      rankScore,
    });
  });

  systemEntities.forEach((systemEntity) => {
    const realmRecords = realmRecordsBySystemId.get(systemEntity.id) || [];
    if (realmRecords.length === 0) return;
    realmRecords.sort(compareRealmRecords);
    if (!isEntityAutoSyncLocked(systemEntity, AUTO_SYNC_ENGINE_CULTIVATION)) {
      const baseInfo = String(systemEntity.info || '');
      const nextInfo = upsertAutoBlock(baseInfo, SYSTEM_AUTO_TITLE, buildSystemAutoBlockLines(realmRecords));
      if (nextInfo !== baseInfo) {
        systemEntity.info = nextInfo;
        changed = true;
      }
    }
  });

  return changed;
}
