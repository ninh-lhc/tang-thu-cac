/**
 * Cau hinh lien ket AUTO muc 3 giua tab nguon va tab nhan.
 * Local AUTO trong chinh tab van duoc xem la mac dinh; file nay chi quan ly
 * nhung target explicit de engine biet co duoc day du lieu sang tab khac hay khong.
 */
import {
  AUTO_SYNC_ROLE_CHARACTER_RELATED,
  AUTO_SYNC_ROLE_CULTIVATION_REALM,
  AUTO_SYNC_ROLE_CULTIVATION_SYSTEM,
  AUTO_SYNC_ROLE_FORCE,
  AUTO_SYNC_ROLE_MAIN_CHARACTER,
  AUTO_SYNC_ROLE_MAP,
  getAutoSyncRoleLabel,
  getEffectiveAutoSyncRole,
  normalizeAutoSyncRole,
} from './tabAutoSyncRole.js';

const AUTO_SYNC_LINK_PROFILES = Object.freeze({
  [AUTO_SYNC_ROLE_FORCE]: {
    targetRoles: [AUTO_SYNC_ROLE_MAP],
    selectionMode: 'single',
    targetLabel: 'tab Ban do / Dia danh',
  },
  [AUTO_SYNC_ROLE_CULTIVATION_SYSTEM]: {
    targetRoles: [AUTO_SYNC_ROLE_CULTIVATION_REALM],
    selectionMode: 'single',
    targetLabel: 'tab Canh gioi tu vi',
  },
  [AUTO_SYNC_ROLE_MAIN_CHARACTER]: {
    targetRoles: [AUTO_SYNC_ROLE_CHARACTER_RELATED],
    selectionMode: 'multiple',
    targetLabel: 'tab nhan vat lien quan',
  },
});

function safeString(value) {
  if (value == null || value === 'null' || value === 'undefined') return '';
  return String(value);
}

export function buildAutoSyncTargetPath(lonId = '', nhoId = '') {
  const left = safeString(lonId).trim();
  const right = safeString(nhoId).trim();
  if (!left || !right) return '';
  return `${left}::${right}`;
}

export function parseAutoSyncTargetPath(value = '') {
  const raw = safeString(value).trim();
  if (!raw) return null;
  const [lonId, nhoId] = raw.split('::');
  if (!safeString(lonId).trim() || !safeString(nhoId).trim()) return null;
  return {
    lonId: safeString(lonId).trim(),
    nhoId: safeString(nhoId).trim(),
    pathKey: buildAutoSyncTargetPath(lonId, nhoId),
  };
}

export function normalizeAutoSyncTargetPaths(value) {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  const out = [];
  const seen = new Set();
  list.forEach((item) => {
    const rawPath =
      typeof item === 'string'
        ? item
        : buildAutoSyncTargetPath(item?.lonId || item?.tabLonId || item?.parentId, item?.nhoId || item?.tabNhoId || item?.id);
    const parsed = parseAutoSyncTargetPath(rawPath);
    if (!parsed || seen.has(parsed.pathKey)) return;
    seen.add(parsed.pathKey);
    out.push(parsed.pathKey);
  });
  return out;
}

export function readExplicitAutoSyncTargetPaths(tabConfig) {
  if (!tabConfig || typeof tabConfig !== 'object') return [];
  return normalizeAutoSyncTargetPaths(
    tabConfig.autoSyncTargetPaths ??
      tabConfig.autoSync?.targetPaths ??
      tabConfig.autoSyncTargetPath ??
      tabConfig.autoSync?.targetPath
  );
}

export function getAutoSyncLinkProfile(role = '') {
  return AUTO_SYNC_LINK_PROFILES[normalizeAutoSyncRole(role)] || null;
}

export function supportsAutoSyncLinkRole(role = '') {
  return Boolean(getAutoSyncLinkProfile(role));
}

export function getAutoSyncLinkTargetRoles(role = '') {
  return [...(getAutoSyncLinkProfile(role)?.targetRoles || [])];
}

export function getAutoSyncLinkSelectionMode(role = '') {
  return getAutoSyncLinkProfile(role)?.selectionMode || 'single';
}

export function getAutoSyncLinkTargetLabel(role = '') {
  return getAutoSyncLinkProfile(role)?.targetLabel || 'tab nhan du lieu';
}

export function buildAutoSyncTabPathLabel(lonLabel = '', nhoLabel = '') {
  const left = safeString(lonLabel).trim();
  const right = safeString(nhoLabel).trim();
  if (left && right) return left === right ? left : `${left} > ${right}`;
  return left || right || 'Muc chua dat ten';
}

function buildTabContext(lon, nho) {
  return {
    activeTabLon: lon?.id || '',
    activeTabNho: nho?.id || '',
    currentTabConfig: nho || null,
    parentLabel: safeString(lon?.label || ''),
  };
}

export function listAutoSyncTargetCandidates(tabsConfig, sourceContext = {}) {
  const tabs = Array.isArray(tabsConfig) ? tabsConfig : [];
  const sourceRole = sourceContext.role || getEffectiveAutoSyncRole(sourceContext);
  const targetRoles = new Set(getAutoSyncLinkTargetRoles(sourceRole));
  if (targetRoles.size === 0) return [];

  const sourcePathKey = buildAutoSyncTargetPath(sourceContext.activeTabLon, sourceContext.activeTabNho);
  const out = [];

  tabs.forEach((lon, lonIndex) => {
    (lon?.subTabs || []).forEach((nho, nhoIndex) => {
      if (nho?.viewType !== 'collection-track') return;
      const pathKey = buildAutoSyncTargetPath(lon?.id, nho?.id);
      if (!pathKey || pathKey === sourcePathKey) return;
      const ctx = buildTabContext(lon, nho);
      const effectiveRole = getEffectiveAutoSyncRole(ctx);
      if (!targetRoles.has(effectiveRole)) return;
      out.push({
        pathKey,
        lonId: lon?.id || '',
        nhoId: nho?.id || '',
        lonLabel: safeString(lon?.label || lon?.id),
        nhoLabel: safeString(nho?.label || nho?.id),
        label: buildAutoSyncTabPathLabel(lon?.label || lon?.id, nho?.label || nho?.id),
        role: effectiveRole,
        roleLabel: getAutoSyncRoleLabel(effectiveRole),
        order: lonIndex * 1000 + nhoIndex,
        currentTabConfig: nho,
        parentLabel: safeString(lon?.label || ''),
      });
    });
  });

  return out.sort((left, right) => left.order - right.order || left.label.localeCompare(right.label, 'vi'));
}

export function resolveExplicitAutoSyncTargets(tabsConfig, sourceContext = {}) {
  const selected = new Set(readExplicitAutoSyncTargetPaths(sourceContext.currentTabConfig));
  if (selected.size === 0) return [];
  return listAutoSyncTargetCandidates(tabsConfig, sourceContext).filter((candidate) => selected.has(candidate.pathKey));
}

export function guessAutoSyncTargetPathsForTab(tabsConfig, sourceContext = {}) {
  const sourceRole = sourceContext.role || getEffectiveAutoSyncRole(sourceContext);
  const candidates = listAutoSyncTargetCandidates(tabsConfig, sourceContext);
  if (candidates.length === 0) return [];

  switch (normalizeAutoSyncRole(sourceRole)) {
    case AUTO_SYNC_ROLE_MAIN_CHARACTER:
      return candidates.map((candidate) => candidate.pathKey);
    case AUTO_SYNC_ROLE_FORCE:
    case AUTO_SYNC_ROLE_CULTIVATION_SYSTEM:
      return candidates.length === 1 ? [candidates[0].pathKey] : [];
    default:
      return [];
  }
}

export function collectExplicitAutoSyncLinkSources(tabsConfig, { sourceRoles = [] } = {}) {
  const tabs = Array.isArray(tabsConfig) ? tabsConfig : [];
  const wantedRoles = new Set((Array.isArray(sourceRoles) ? sourceRoles : [sourceRoles]).map(normalizeAutoSyncRole).filter(Boolean));
  if (wantedRoles.size === 0) return [];

  const out = [];
  tabs.forEach((lon, lonIndex) => {
    (lon?.subTabs || []).forEach((nho, nhoIndex) => {
      if (nho?.viewType !== 'collection-track') return;
      const sourceContext = buildTabContext(lon, nho);
      const sourceRole = getEffectiveAutoSyncRole(sourceContext);
      if (!wantedRoles.has(sourceRole)) return;
      const targets = resolveExplicitAutoSyncTargets(tabs, sourceContext);
      if (targets.length === 0) return;
      out.push({
        role: sourceRole,
        sourcePath: {
          lonId: lon?.id || '',
          nhoId: nho?.id || '',
          lonLabel: safeString(lon?.label || lon?.id),
          nhoLabel: safeString(nho?.label || nho?.id),
          label: safeString(nho?.label || nho?.id),
          order: lonIndex * 1000 + nhoIndex,
          currentTabConfig: nho,
          parentLabel: safeString(lon?.label || ''),
        },
        targetPaths: targets,
      });
    });
  });
  return out;
}

export function hydrateTabsAutoSyncLinkTargets(tabsConfig) {
  if (!Array.isArray(tabsConfig) || tabsConfig.length === 0) {
    return { tabsConfig: Array.isArray(tabsConfig) ? tabsConfig : [], changed: false };
  }

  const nextTabs = typeof structuredClone === 'function' ? structuredClone(tabsConfig) : JSON.parse(JSON.stringify(tabsConfig));
  let changed = false;

  nextTabs.forEach((lon) => {
    (lon?.subTabs || []).forEach((nho) => {
      if (nho?.viewType !== 'collection-track') return;
      const ctx = buildTabContext(lon, nho);
      const role = getEffectiveAutoSyncRole(ctx);
      if (!supportsAutoSyncLinkRole(role)) return;
      const currentPaths = readExplicitAutoSyncTargetPaths(nho);
      if (currentPaths.length > 0) return;
      const guessedPaths = guessAutoSyncTargetPathsForTab(nextTabs, ctx);
      if (guessedPaths.length === 0) return;
      nho.autoSyncTargetPaths = guessedPaths;
      changed = true;
    });
  });

  return { tabsConfig: changed ? nextTabs : tabsConfig, changed };
}
