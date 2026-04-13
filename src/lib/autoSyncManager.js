/**
 * Central AUTO sync planner/orchestrator for tree-based engines.
 * Keeps manual resync, selective resync, preview diff, and sync logs on one path
 * so App.jsx and diagnostics do not each reinvent engine ordering.
 */
import { syncAllAutoRelationNotesForNovel } from './autoRelationDetailNote.js';
import { syncAllCollectionListCards } from './collectionListCardSync.js';
import { syncAllCultivationRelationBlocks } from './cultivationRelationSync.js';
import { syncAllMainCharacterRelationBlocks } from './mainCharacterRelationSync.js';
import { syncAllMapHierarchyAutoBlocks } from './mapHierarchySync.js';
import { getEffectiveAutoSyncRole } from './tabAutoSyncRole.js';
import {
  AUTO_SYNC_ENGINE_COLLECTION_CARDS,
  AUTO_SYNC_ENGINE_CULTIVATION,
  AUTO_SYNC_ENGINE_FORCE_MAP,
  AUTO_SYNC_ENGINE_MAIN_CHARACTER,
  AUTO_SYNC_ENGINE_MAP_HIERARCHY,
  AUTO_SYNC_ENGINE_RELATION_NOTES,
  getAutoSyncEngineLabel,
  getAutoSyncEnginesForRole,
} from './autoSyncEntityPrefs.js';
import { readExplicitAutoSyncTargetPaths, supportsAutoSyncLinkRole } from './tabAutoSyncLinks.js';
import {
  summarizeTheLucMapSyncWarnings,
  syncAllTheLucMapAutoBlocksDetailed,
} from './theLucBanDoSync.js';

const AUTO_SYNC_ENGINE_ORDER = Object.freeze([
  AUTO_SYNC_ENGINE_FORCE_MAP,
  AUTO_SYNC_ENGINE_RELATION_NOTES,
  AUTO_SYNC_ENGINE_MAIN_CHARACTER,
  AUTO_SYNC_ENGINE_CULTIVATION,
  AUTO_SYNC_ENGINE_MAP_HIERARCHY,
  AUTO_SYNC_ENGINE_COLLECTION_CARDS,
]);

const AUTO_SYNC_LOG_LIMIT = 20;

function safeString(value) {
  if (value == null || value === 'null' || value === 'undefined') return '';
  return String(value);
}

function cloneValue(value) {
  try {
    return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function sortEngines(engineIds = []) {
  const wanted = new Set(engineIds.filter(Boolean));
  return AUTO_SYNC_ENGINE_ORDER.filter((engineId) => wanted.has(engineId));
}

function getLocalAutoSyncEnginesForRole(role = '') {
  if (!role) return [];
  const roleEngines = getAutoSyncEnginesForRole(role);
  return roleEngines.filter((engineId) => engineId === AUTO_SYNC_ENGINE_MAP_HIERARCHY);
}

function getLinkedAutoSyncEnginesForRole(role = '') {
  if (!role) return [];
  const roleEngines = getAutoSyncEnginesForRole(role);
  return roleEngines.filter((engineId) => engineId !== AUTO_SYNC_ENGINE_MAP_HIERARCHY);
}

function buildEnginesForTabContext(tabContext = {}, { includeCollectionCards = true } = {}) {
  const engineSet = new Set();
  const currentTabConfig = tabContext?.currentTabConfig;
  const isCollectionTab = currentTabConfig?.viewType === 'collection-track';
  const role = getEffectiveAutoSyncRole(tabContext);

  if (includeCollectionCards && isCollectionTab && role !== 'khong-tu-dong') {
    engineSet.add(AUTO_SYNC_ENGINE_COLLECTION_CARDS);
  }

  getLocalAutoSyncEnginesForRole(role).forEach((engineId) => engineSet.add(engineId));

  const hasExplicitTargets =
    isCollectionTab &&
    supportsAutoSyncLinkRole(role) &&
    readExplicitAutoSyncTargetPaths(currentTabConfig).length > 0;

  if (hasExplicitTargets) {
    getLinkedAutoSyncEnginesForRole(role).forEach((engineId) => engineSet.add(engineId));
  }

  return sortEngines([...engineSet]);
}

function buildCleanupEnginesForTabContext(tabContext = {}, options = {}) {
  const engineSet = new Set(buildEnginesForTabContext(tabContext, options));
  const role = getEffectiveAutoSyncRole(tabContext);
  getAutoSyncEnginesForRole(role).forEach((engineId) => engineSet.add(engineId));
  return sortEngines([...engineSet]);
}

function buildEntitySnapshotMap(novelData) {
  const map = new Map();
  const data = novelData?.data;
  if (!data || typeof data !== 'object') return map;
  Object.entries(data).forEach(([lonId, lonData]) => {
    if (!lonData || typeof lonData !== 'object') return;
    Object.entries(lonData).forEach(([nhoId, nhoData]) => {
      const entities = Array.isArray(nhoData?.entities) ? nhoData.entities : [];
      entities.forEach((entity) => {
        const entityId = safeString(entity?.id).trim();
        if (!entityId) return;
        const key = `${lonId}::${nhoId}::${entityId}`;
        map.set(key, {
          info: safeString(entity?.info),
          status: safeString(entity?.status),
          name: safeString(entity?.name),
          dynamicData: JSON.stringify(entity?.dynamicData || {}),
        });
      });
    });
  });
  return map;
}

function summarizeEntitySnapshotDiff(beforeMap, afterMap) {
  const keys = new Set([...beforeMap.keys(), ...afterMap.keys()]);
  const summary = {
    touchedEntityCount: 0,
    infoChangedCount: 0,
    fieldChangedCount: 0,
    createdEntityCount: 0,
    removedEntityCount: 0,
  };

  keys.forEach((key) => {
    const before = beforeMap.get(key);
    const after = afterMap.get(key);
    if (!before && after) {
      summary.touchedEntityCount += 1;
      summary.createdEntityCount += 1;
      return;
    }
    if (before && !after) {
      summary.touchedEntityCount += 1;
      summary.removedEntityCount += 1;
      return;
    }
    if (!before || !after) return;

    const infoChanged = before.info !== after.info;
    const fieldChanged =
      before.status !== after.status ||
      before.dynamicData !== after.dynamicData ||
      before.name !== after.name;

    if (!infoChanged && !fieldChanged) return;
    summary.touchedEntityCount += 1;
    if (infoChanged) summary.infoChangedCount += 1;
    if (fieldChanged) summary.fieldChangedCount += 1;
  });

  return summary;
}

function buildAutoSyncLogEntry({
  scopeLabel = '',
  reason = '',
  engines = [],
  changed = false,
  diffSummary = null,
  forceWarning = '',
}) {
  return {
    id: `auto-sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    scopeLabel: safeString(scopeLabel).trim() || 'Toàn bộ truyện',
    reason: safeString(reason).trim() || 'manual',
    changed: Boolean(changed),
    engines: engines.map((engineId) => ({
      id: engineId,
      label: getAutoSyncEngineLabel(engineId),
    })),
    diffSummary: diffSummary || null,
    forceWarning: safeString(forceWarning).trim(),
  };
}

export function appendNovelAutoSyncLog(novelData, entry) {
  if (!novelData || !entry) return;
  const current = Array.isArray(novelData.autoSyncLog) ? novelData.autoSyncLog : [];
  novelData.autoSyncLog = [entry, ...current].slice(0, AUTO_SYNC_LOG_LIMIT);
}

export function buildAutoSyncPlanFromRoles(roles = [], { includeCollectionCards = true } = {}) {
  const engineSet = new Set();
  (Array.isArray(roles) ? roles : [roles]).forEach((role) => {
    getAutoSyncEnginesForRole(role).forEach((engineId) => engineSet.add(engineId));
  });
  if (includeCollectionCards) {
    engineSet.add(AUTO_SYNC_ENGINE_COLLECTION_CARDS);
  }
  return {
    engines: sortEngines([...engineSet]),
  };
}

export function buildAutoSyncPlanFromTabContext(tabContext = {}, options = {}) {
  return {
    engines: buildEnginesForTabContext(tabContext, options),
  };
}

export function buildAutoSyncPlanFromTabDiff({ previousTabContext = null, nextTabContext = null } = {}, options = {}) {
  const engineSet = new Set();
  buildCleanupEnginesForTabContext(previousTabContext || {}, options).forEach((engineId) => engineSet.add(engineId));
  buildEnginesForTabContext(nextTabContext || {}, options).forEach((engineId) => engineSet.add(engineId));
  return {
    engines: sortEngines([...engineSet]),
  };
}

export function buildFullAutoSyncPlan({ includeCollectionCards = true } = {}) {
  const engines = [
    AUTO_SYNC_ENGINE_FORCE_MAP,
    AUTO_SYNC_ENGINE_RELATION_NOTES,
    AUTO_SYNC_ENGINE_MAIN_CHARACTER,
    AUTO_SYNC_ENGINE_CULTIVATION,
    AUTO_SYNC_ENGINE_MAP_HIERARCHY,
  ];
  if (includeCollectionCards) engines.push(AUTO_SYNC_ENGINE_COLLECTION_CARDS);
  return { engines: sortEngines(engines) };
}

export function runNovelAutoSyncPlan(novelData, plan = {}, options = {}) {
  if (!novelData) {
    return {
      changed: false,
      engines: [],
      forceWarning: '',
      diffSummary: null,
      logEntry: null,
    };
  }

  const engines = sortEngines(Array.isArray(plan?.engines) ? plan.engines : []);
  if (engines.length === 0) {
    return {
      changed: false,
      engines: [],
      forceWarning: '',
      diffSummary: null,
      logEntry: null,
    };
  }

  const captureDiff = Boolean(options.captureDiff || options.recordLog);
  const beforeMap = captureDiff ? buildEntitySnapshotMap(novelData) : null;

  let changed = false;
  let forceWarning = '';

  engines.forEach((engineId) => {
    if (engineId === AUTO_SYNC_ENGINE_FORCE_MAP) {
      const result = syncAllTheLucMapAutoBlocksDetailed(novelData);
      changed = result.changed || changed;
      forceWarning = summarizeTheLucMapSyncWarnings(result.warnings) || forceWarning;
      return;
    }
    if (engineId === AUTO_SYNC_ENGINE_RELATION_NOTES) {
      changed = syncAllAutoRelationNotesForNovel(novelData) || changed;
      return;
    }
    if (engineId === AUTO_SYNC_ENGINE_MAIN_CHARACTER) {
      changed = syncAllMainCharacterRelationBlocks(novelData) || changed;
      return;
    }
    if (engineId === AUTO_SYNC_ENGINE_CULTIVATION) {
      changed = syncAllCultivationRelationBlocks(novelData) || changed;
      return;
    }
    if (engineId === AUTO_SYNC_ENGINE_MAP_HIERARCHY) {
      changed = syncAllMapHierarchyAutoBlocks(novelData) || changed;
      return;
    }
    if (engineId === AUTO_SYNC_ENGINE_COLLECTION_CARDS) {
      changed = syncAllCollectionListCards(novelData) || changed;
    }
  });

  const diffSummary = captureDiff
    ? summarizeEntitySnapshotDiff(beforeMap, buildEntitySnapshotMap(novelData))
    : null;

  let logEntry = null;
  if (options.recordLog) {
    logEntry = buildAutoSyncLogEntry({
      scopeLabel: options.scopeLabel,
      reason: options.reason,
      engines,
      changed,
      diffSummary,
      forceWarning,
    });
    appendNovelAutoSyncLog(novelData, logEntry);
  }

  return {
    changed,
    engines,
    forceWarning,
    diffSummary,
    logEntry,
  };
}

export function previewNovelAutoSyncPlan(novelData, plan = {}) {
  const clonedNovel = cloneValue(novelData);
  if (!clonedNovel) {
    return {
      changed: false,
      engines: [],
      forceWarning: '',
      diffSummary: {
        touchedEntityCount: 0,
        infoChangedCount: 0,
        fieldChangedCount: 0,
        createdEntityCount: 0,
        removedEntityCount: 0,
      },
    };
  }
  return runNovelAutoSyncPlan(clonedNovel, plan, { captureDiff: true, recordLog: false });
}
