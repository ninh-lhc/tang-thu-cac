/**
 * Read-only diagnostics for tree-driven AUTO sync.
 * Builds tab-level health, setup suggestions, preview counts, and recent log data
 * so the tab-manager modal can explain what AUTO will do before the user runs it.
 */
import { getAutoSyncFieldDefs, getEffectiveAutoSyncFieldMap } from './tabAutoSyncFieldMap.js';
import {
  getEffectiveAutoSyncRole,
  getAutoSyncRoleLabel,
  readExplicitAutoSyncRole,
} from './tabAutoSyncRole.js';
import {
  getAutoSyncEngineLabel,
  getAutoSyncEnginesForRole,
  summarizeEntityAutoSyncPrefs,
} from './autoSyncEntityPrefs.js';
import { buildFullAutoSyncPlan, previewNovelAutoSyncPlan } from './autoSyncManager.js';

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
  return left || right || 'Mục chưa đặt tên';
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
      warnings.push(`Thiếu ánh xạ cho "${def.label}".`);
      return;
    }
    if (!templateFieldIds.has(fieldId)) {
      warnings.push(`Trường "${fieldId}" cho "${def.label}" không còn trong mẫu.`);
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
      const engineIds = getAutoSyncEnginesForRole(effectiveRole);
      const entities = getTabEntities(novelData, tabLon.id, tabNho.id);
      const prefSummary = summarizeEntityAutoSyncPrefs(entities, engineIds);
      const status =
        explicitRole === 'khong-tu-dong'
          ? 'off'
          : !effectiveRole
            ? 'unassigned'
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
        roleLabel: effectiveRole ? getAutoSyncRoleLabel(effectiveRole) : 'Chưa nhận diện',
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

  if (readyCount === 0 && tabReports.length > 0) {
    wizardSteps.push('Chưa có mục AUTO nào ở trạng thái sẵn sàng hoàn toàn.');
  }
  if (warningCount > 0) {
    wizardSteps.push(`Còn ${warningCount} cảnh báo ánh xạ trường cần xử lý.`);
  }
  if ((preview.diffSummary?.touchedEntityCount || 0) > 0) {
    wizardSteps.push(`Quét lại ngay lúc này sẽ chạm tới ${preview.diffSummary.touchedEntityCount} thực thể.`);
  }
  if (lockedCount > 0 || disabledCount > 0) {
    wizardSteps.push(`Có ${lockedCount} thực thể đang khóa AUTO và ${disabledCount} thực thể đang tắt riêng.`);
  }
  if (wizardSteps.length === 0 && tabReports.length > 0) {
    wizardSteps.push('Cấu hình AUTO hiện đã khớp tốt với cây thư mục.');
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
