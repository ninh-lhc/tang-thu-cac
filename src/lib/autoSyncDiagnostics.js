/**
 * Read-only diagnostics for tree-driven AUTO sync.
 * Builds tab health, setup hints, preview counts, and recent sync logs
 * so the tree modal can explain what will happen before the user runs AUTO.
 */
import { getAutoSyncFieldDefs, getEffectiveAutoSyncFieldMap } from './tabAutoSyncFieldMap.js';
import {
  getEffectiveAutoSyncRole,
  getAutoSyncRoleLabel,
  readExplicitAutoSyncRole,
} from './tabAutoSyncRole.js';
import {
  getAutoSyncEngineLabel,
  summarizeEntityAutoSyncPrefs,
} from './autoSyncEntityPrefs.js';
import {
  buildAutoSyncPlanFromTabContext,
  buildFullAutoSyncPlan,
  previewNovelAutoSyncPlan,
} from './autoSyncManager.js';

function safeString(value) {
  if (value == null || value === 'null' || value === 'undefined') return '';
  return String(value);
}

function countTabEntities(novelData, lonId, nhoId) {
  const entities = novelData?.data?.[lonId]?.[nhoId]?.entities;
  return Array.isArray(entities) ? entities.length : 0;
}

function getTabEntities(novelData, lonId, nhoId) {
  const entities = novelData?.data?.[lonId]?.[nhoId]?.entities;
  return Array.isArray(entities) ? entities : [];
}

function buildTabPathLabel(lonLabel, nhoLabel) {
  const left = safeString(lonLabel).trim();
  const right = safeString(nhoLabel).trim();
  if (left && right) return `${left} > ${right}`;
  return left || right || 'Muc chua dat ten';
}

function collectTabWarnings(tabNho, fieldDefs, fieldMap) {
  const templateFields = Array.isArray(tabNho?.fieldsTemplate) ? tabNho.fieldsTemplate : [];
  const templateFieldIds = new Set(
    templateFields
      .map((field) => safeString(field?.id).trim())
      .filter(Boolean)
  );
  const warnings = [];
  fieldDefs.forEach((def) => {
    const fieldId = safeString(fieldMap[def.key]).trim();
    if (!fieldId) {
      warnings.push(`Thieu anh xa cho "${def.label}".`);
      return;
    }
    if (!templateFieldIds.has(fieldId)) {
      warnings.push(`Truong "${fieldId}" cho "${def.label}" khong con trong mau.`);
    }
  });
  return warnings;
}

export function collectNovelAutoSyncDiagnostics(novelData) {
  const tabsConfig = Array.isArray(novelData?.tabsConfig) ? novelData.tabsConfig : [];
  const tabReports = [];

  tabsConfig.forEach((tabLon) => {
    (tabLon?.subTabs || []).forEach((tabNho) => {
      if (tabNho?.viewType !== 'collection-track') return;
      const tabContext = {
        activeTabLon: tabLon.id,
        activeTabNho: tabNho.id,
        currentTabConfig: tabNho,
        parentLabel: tabLon.label || '',
      };
      const explicitRole = readExplicitAutoSyncRole(tabNho);
      const effectiveRole = getEffectiveAutoSyncRole(tabContext);
      const fieldDefs = getAutoSyncFieldDefs(effectiveRole);
      const fieldMap = getEffectiveAutoSyncFieldMap(tabContext);
      const warnings = collectTabWarnings(tabNho, fieldDefs, fieldMap);
      const engineIds = buildAutoSyncPlanFromTabContext(tabContext).engines;
      const entities = getTabEntities(novelData, tabLon.id, tabNho.id);
      const prefSummary = summarizeEntityAutoSyncPrefs(entities, engineIds);
      const status =
        explicitRole === 'khong-tu-dong'
          ? 'off'
          : warnings.length > 0
            ? 'warning'
            : 'ready';

      tabReports.push({
        id: `${tabLon.id}::${tabNho.id}`,
        lonId: tabLon.id,
        nhoId: tabNho.id,
        pathLabel: buildTabPathLabel(tabLon.label, tabNho.label),
        explicitRole,
        effectiveRole,
        roleLabel: effectiveRole ? getAutoSyncRoleLabel(effectiveRole) : 'AUTO noi bo',
        isInferred: !explicitRole && Boolean(effectiveRole),
        entityCount: countTabEntities(novelData, tabLon.id, tabNho.id),
        engineIds,
        engineLabels: engineIds.map((engineId) => getAutoSyncEngineLabel(engineId)),
        warnings,
        lockedEntityCount: prefSummary.lockedCount,
        disabledEntityCount: prefSummary.disabledCount,
        status,
      });
    });
  });

  const preview = previewNovelAutoSyncPlan(novelData, buildFullAutoSyncPlan());

  const wizardSteps = [];
  const warningCount = tabReports.reduce((sum, report) => sum + report.warnings.length, 0);
  const readyCount = tabReports.filter((report) => report.status === 'ready').length;
  const offCount = tabReports.filter((report) => report.status === 'off').length;
  const lockedCount = tabReports.reduce((sum, report) => sum + report.lockedEntityCount, 0);
  const disabledCount = tabReports.reduce((sum, report) => sum + report.disabledEntityCount, 0);

  if (tabReports.length > 0) {
    wizardSteps.push('Moi tab Luoi se tu co AUTO noi bo cho the va Danh sach trong cung tab.');
  }
  if (warningCount > 0) {
    wizardSteps.push(`Con ${warningCount} canh bao anh xa truong can xu ly.`);
  }
  if ((preview.diffSummary?.touchedEntityCount || 0) > 0) {
    wizardSteps.push(`Quet lai luc nay se cham toi ${preview.diffSummary.touchedEntityCount} thuc the.`);
  }
  if (lockedCount > 0 || disabledCount > 0) {
    wizardSteps.push(`Co ${lockedCount} thuc the dang khoa AUTO va ${disabledCount} thuc the dang tat rieng.`);
  }
  if (wizardSteps.length === 1 && readyCount === tabReports.length && tabReports.length > 0) {
    wizardSteps.push('Chi can bat lien tab o nhung muc thuc su can day du lieu sang noi khac.');
  }

  return {
    tabReports,
    summary: {
      totalCollectionTabs: tabReports.length,
      readyCount,
      warningCount,
      offCount,
      lockedCount,
      disabledCount,
    },
    preview: {
      changed: preview.changed,
      touchedEntityCount: preview.diffSummary?.touchedEntityCount || 0,
      infoChangedCount: preview.diffSummary?.infoChangedCount || 0,
      fieldChangedCount: preview.diffSummary?.fieldChangedCount || 0,
      createdEntityCount: preview.diffSummary?.createdEntityCount || 0,
      removedEntityCount: preview.diffSummary?.removedEntityCount || 0,
      forceWarning: preview.forceWarning || '',
    },
    recentLogs: Array.isArray(novelData?.autoSyncLog) ? novelData.autoSyncLog : [],
    wizardSteps,
  };
}
