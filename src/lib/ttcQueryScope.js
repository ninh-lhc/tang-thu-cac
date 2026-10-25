/**
 * Phạm vi tab và nhãn field theo scope cho TTC-Query.
 */
import { resolveFieldsTemplate } from '../MasterEngines.js';
import { getTtcQueryFieldDisplayMeta } from './ttcQueryFieldCatalog.js';
import {
  buildTtcVirtualFieldLabels,
  normalizeTtcTabsList,
} from './ttcQueryVirtualFields.js';
import { normalizeTtcFieldId } from './ttcQueryFieldAccess.js';
import { safeString } from './entityFieldValue.js';

export function scopeMatches(scope, lonId, nhoId) {
  if (!scope || scope.kind === 'all') return true;
  if (scope.kind === 'lon') return lonId === scope.lonId;
  if (scope.kind === 'nho') return lonId === scope.lonId && nhoId === scope.nhoId;
  return true;
}

function findLonNhoForNhoId(tabs, nhoId) {
  const want = normalizeTtcFieldId(nhoId);
  if (!want) return null;
  for (const lon of tabs) {
    const nho = (lon?.subTabs || []).find((s) => s?.id === want);
    if (nho) return { lon, nho };
  }
  return null;
}

/**
 * Suy phạm vi nhãn từ WHERE (ưu tiên folderPath, parentFolder, type/nhoId).
 */
export function inferTtcQueryLabelScopeFromWhere(where, tabsConfig) {
  const tabs = normalizeTtcTabsList(tabsConfig);
  let lonOnly = null;
  let nhoOnly = null;

  for (const cond of where || []) {
    if (cond.op !== 'eq') continue;
    const field = normalizeTtcFieldId(cond.field);
    const value = safeString(cond.value).trim();
    if (!value) continue;

    if (field === 'folderPath' || field === 'folder') {
      const slash = value.indexOf('/');
      if (slash > 0) {
        const lonId = value.slice(0, slash).trim();
        const nhoId = value.slice(slash + 1).trim();
        if (lonId && nhoId) return { kind: 'nho', lonId, nhoId };
      }
    }
    if (field === 'parentFolder' || field === 'lonId') {
      lonOnly = value;
    }
    if (field === 'type' || field === 'nhoId') {
      nhoOnly = value;
    }
  }

  if (lonOnly && nhoOnly) return { kind: 'nho', lonId: lonOnly, nhoId: nhoOnly };
  if (nhoOnly) {
    const hit = findLonNhoForNhoId(tabs, nhoOnly);
    if (hit?.lon?.id && hit?.nho?.id) {
      return { kind: 'nho', lonId: hit.lon.id, nhoId: hit.nho.id };
    }
    return { kind: 'nho', lonId: '', nhoId: nhoOnly, ambiguous: true };
  }
  if (lonOnly) return { kind: 'lon', lonId: lonOnly };
  return { kind: 'all' };
}

function applyTemplateLabels(map, fields, source, scopeLabel) {
  (fields || []).forEach((field) => {
    if (!field?.id) return;
    const id = normalizeTtcFieldId(field.id);
    map[id] = getTtcQueryFieldDisplayMeta(id, {
      templateLabel: field.label,
      source,
      scopeLabel,
    }).label;
  });
}

/**
 * Nhãn cột theo tab con/lớn — không gộp nhãn tab khác (tránh header sai scope).
 */
export function buildTtcFieldLabelMapForScope(tabsConfig, scope = { kind: 'all' }) {
  const map = { ...buildTtcVirtualFieldLabels() };
  const tabs = normalizeTtcTabsList(tabsConfig);

  if (scope.kind === 'nho' && scope.lonId && scope.nhoId) {
    const lon = tabs.find((t) => t?.id === scope.lonId);
    const nho = lon?.subTabs?.find((s) => s?.id === scope.nhoId);
    if (lon && nho) {
      applyTemplateLabels(map, lon.fieldsTemplate, 'inherited', safeString(lon.label || lon.id));
      applyTemplateLabels(
        map,
        resolveFieldsTemplate(nho, lon.id, lon.label || ''),
        'template',
        safeString(nho.label || nho.id),
      );
    }
  } else if (scope.kind === 'lon' && scope.lonId) {
    const lon = tabs.find((t) => t?.id === scope.lonId);
    if (lon) {
      applyTemplateLabels(map, lon.fieldsTemplate, 'inherited', safeString(lon.label || lon.id));
      (lon.subTabs || []).forEach((nho) => {
        applyTemplateLabels(
          map,
          resolveFieldsTemplate(nho, lon.id, lon.label || ''),
          'template',
          safeString(nho.label || nho.id),
        );
      });
    }
  } else {
    tabs.forEach((lon) => {
      applyTemplateLabels(map, lon.fieldsTemplate, 'inherited', safeString(lon.label || lon.id));
      (lon.subTabs || []).forEach((nho) => {
        applyTemplateLabels(
          map,
          resolveFieldsTemplate(nho, lon.id, lon.label || ''),
          'template',
          safeString(nho.label || nho.id),
        );
      });
    });
  }

  ['f_alias', 'f_status', 'f_title', 'f_desc'].forEach((id) => {
    if (!map[id] || map[id] === id) {
      map[id] = getTtcQueryFieldDisplayMeta(id, { source: 'system' }).label;
    }
  });

  return map;
}
