/**
 * Biên dịch Query Builder → Markdown ```ttc-query (không eval, không HTML).
 */
import { forEachNovelEntity } from './entityRename.js';
import { safeString } from './entityFieldValue.js';
import { DEFAULT_LIMIT, MAX_LIMIT, parseTtcQuery } from './ttcQueryParser.js';
import { getTtcQueryFieldDisplayMeta } from './ttcQueryFieldCatalog.js';
import {
  TTC_VIRTUAL_FIELD_IDS,
  buildTtcVirtualFieldLabels,
  normalizeTtcTabsList,
} from './ttcQueryVirtualFields.js';
import { resolveFieldsTemplate } from '../MasterEngines.js';
import { scopeMatches } from './ttcQueryScope.js';
import {
  collectTtcFieldStats,
  detectTtcFieldSemanticMismatch,
} from './ttcQueryDiagnostics.js';

/** Field ảo hiển thị trong «Cột thường». */
export const TTC_BUILDER_CONTENT_VIRTUAL_IDS = Object.freeze(['entity']);

/** Field ảo tab/thư mục — nhóm nâng cao, thu gọn mặc định. `folder` giữ engine, ẩn UI. */
export const TTC_BUILDER_ADVANCED_VIRTUAL_IDS = Object.freeze([
  'id',
  'type',
  'nhoId',
  'lonId',
  'parentFolder',
  'folderPath',
]);

const BUILDER_HIDDEN_VIRTUAL = new Set(['folder']);

const SOURCE_PRIORITY = Object.freeze({
  template: 40,
  inherited: 30,
  dynamic: 20,
  system: 10,
  virtual: 5,
});

export const TTC_BUILDER_OPS = Object.freeze([
  { id: 'eq', label: 'bằng', token: '=' },
  { id: 'neq', label: 'khác', token: '!=' },
  { id: 'contains', label: 'chứa', token: 'CONTAINS' },
  { id: 'gt', label: 'lớn hơn', token: '>' },
  { id: 'gte', label: 'lớn hơn hoặc bằng', token: '>=' },
  { id: 'lt', label: 'nhỏ hơn', token: '<' },
  { id: 'lte', label: 'nhỏ hơn hoặc bằng', token: '<=' },
  { id: 'isEmpty', label: 'đang trống', token: 'IS EMPTY' },
  { id: 'isNotEmpty', label: 'không trống', token: 'IS NOT EMPTY' },
]);

function quoteValue(raw) {
  const s = String(raw ?? '').trim();
  if (s.includes('"') || s.includes('\n')) {
    return { ok: false, error: 'Giá trị lọc chưa hỗ trợ dấu ngoặc kép hoặc xuống dòng.' };
  }
  if (/^-?\d+(?:\.\d+)?$/.test(s)) return { ok: true, text: s };
  return { ok: true, text: `"${s}"` };
}

export function listTtcQueryScopes(activeNovelData) {
  const tabs = normalizeTtcTabsList(activeNovelData?.tabsConfig);
  const lonLabels = new Map();
  const nhoLabels = new Map();
  tabs.forEach((lon) => {
    if (!lon?.id) return;
    lonLabels.set(lon.id, safeString(lon.label || lon.id));
    (lon.subTabs || []).forEach((nho) => {
      if (!nho?.id) return;
      nhoLabels.set(`${lon.id}|${nho.id}`, safeString(nho.label || nho.id));
    });
  });

  const scopes = [{ id: 'all', kind: 'all', label: 'Toàn bộ truyện đang mở' }];
  const seenLon = new Set();
  const seenNho = new Set();

  const pushLon = (lonId) => {
    if (!lonId || seenLon.has(lonId)) return;
    seenLon.add(lonId);
    scopes.push({
      id: `lon:${lonId}`,
      kind: 'lon',
      lonId,
      tabLabel: lonLabels.get(lonId) || lonId,
      label: `Tab lớn: ${lonLabels.get(lonId) || lonId}`,
    });
  };
  const pushNho = (lonId, nhoId) => {
    const key = `${lonId}|${nhoId}`;
    if (!lonId || !nhoId || seenNho.has(key)) return;
    seenNho.add(key);
    pushLon(lonId);
    scopes.push({
      id: `nho:${lonId}|${nhoId}`,
      kind: 'nho',
      lonId,
      nhoId,
      folderPath: `${lonId}/${nhoId}`,
      tabLabel: nhoLabels.get(key) || nhoId,
      label: `Tab con: ${nhoLabels.get(key) || nhoId}`,
    });
  };

  tabs.forEach((lon) => {
    pushLon(lon.id);
    (lon.subTabs || []).forEach((nho) => pushNho(lon.id, nho.id));
  });
  forEachNovelEntity(activeNovelData, (_ent, ctx) => {
    pushNho(ctx.lonId, ctx.nhoId);
  });
  return scopes;
}

export function builderFieldGroup(fieldId, source) {
  const id = String(fieldId || '').trim();
  if (BUILDER_HIDDEN_VIRTUAL.has(id)) return null;
  if (TTC_BUILDER_ADVANCED_VIRTUAL_IDS.includes(id)) return 'advanced';
  if (TTC_BUILDER_CONTENT_VIRTUAL_IDS.includes(id)) return 'content';
  if (source === 'virtual') return 'advanced';
  return 'content';
}

function addTemplateFieldsFromLonNho(byId, lon, nho, scopeLabel) {
  if (!lon?.id || !nho?.id) return;
  const parentLabel = safeString(lon.label || lon.id);
  (Array.isArray(lon.fieldsTemplate) ? lon.fieldsTemplate : []).forEach((field) => {
    if (!field?.id) return;
    upsertFieldOption(byId, field.id, {
      templateLabel: field.label,
      source: 'inherited',
      scopeLabel: parentLabel,
      type: field.type || 'text',
    });
  });
  resolveFieldsTemplate(nho, lon.id, parentLabel).forEach((field) => {
    if (!field?.id) return;
    upsertFieldOption(byId, field.id, {
      templateLabel: field.label,
      source: 'template',
      scopeLabel: scopeLabel || safeString(nho.label || nho.id),
      type: field.type || 'text',
    });
  });
}

function collectScopedTemplateFields(tabs, scope) {
  const entries = [];
  if (scope?.kind === 'nho') {
    const lon = tabs.find((t) => t.id === scope.lonId);
    const nho = lon?.subTabs?.find((s) => s.id === scope.nhoId);
    if (lon && nho) {
      entries.push({
        lon,
        nho,
        scopeLabel: safeString(nho.label || nho.id),
      });
    }
    return entries;
  }
  if (scope?.kind === 'lon') {
    const lon = tabs.find((t) => t.id === scope.lonId);
    if (!lon) return entries;
    (lon.subTabs || []).forEach((nho) => {
      entries.push({
        lon,
        nho,
        scopeLabel: safeString(nho.label || nho.id),
      });
    });
    if (!entries.length) {
      entries.push({ lon, nho: { id: '', label: '' }, scopeLabel: safeString(lon.label || lon.id) });
    }
    return entries;
  }
  tabs.forEach((lon) => {
    (lon.subTabs || []).forEach((nho) => {
      entries.push({
        lon,
        nho,
        scopeLabel: safeString(nho.label || nho.id),
      });
    });
  });
  return entries;
}

function upsertFieldOption(byId, fieldId, patch) {
  const key = String(fieldId || '').trim();
  if (!key || BUILDER_HIDDEN_VIRTUAL.has(key)) return;

  const priority = SOURCE_PRIORITY[patch.source] ?? 0;
  const existing = byId.get(key);
  if (existing && existing.priority > priority) return;

  const scopeLabel = patch.scopeLabel || '';
  const meta = getTtcQueryFieldDisplayMeta(key, { ...patch, scopeLabel });
  const group = builderFieldGroup(key, meta.source);
  if (!group) return;

  byId.set(key, {
    ...meta,
    fieldId: key,
    group,
    priority,
  });
}

export function listTtcQueryFieldOptions(activeNovelData, scope) {
  const tabs = normalizeTtcTabsList(activeNovelData?.tabsConfig);
  const byId = new Map();
  const scopeLabel = scope?.tabLabel || '';

  TTC_BUILDER_CONTENT_VIRTUAL_IDS.forEach((id) => {
    upsertFieldOption(byId, id, { source: 'virtual', scopeLabel });
  });
  TTC_BUILDER_ADVANCED_VIRTUAL_IDS.forEach((id) => {
    upsertFieldOption(byId, id, { source: 'virtual', scopeLabel });
  });

  const templateEntries = collectScopedTemplateFields(tabs, scope);
  templateEntries.forEach(({ lon, nho, scopeLabel: tabLabel }) => {
    if (nho?.id) addTemplateFieldsFromLonNho(byId, lon, nho, tabLabel);
  });

  ['f_alias', 'f_status', 'f_title', 'f_desc'].forEach((id) => {
    if (!byId.has(id)) {
      upsertFieldOption(byId, id, { source: 'system', scopeLabel });
    }
  });

  forEachNovelEntity(activeNovelData, (ent, ctx) => {
    if (!scopeMatches(scope, ctx.lonId, ctx.nhoId)) return;
    Object.keys(ent?.dynamicData || {}).forEach((key) => {
      upsertFieldOption(byId, key, { source: 'dynamic', scopeLabel });
    });
  });

  const virtualLabels = buildTtcVirtualFieldLabels();
  const options = [...byId.values()].map((field) => {
    if (field.source === 'virtual' && virtualLabels[field.id]) {
      return { ...field, label: virtualLabels[field.id] };
    }
    return field;
  });

  const labelCounts = new Map();
  options.forEach((field) => {
    labelCounts.set(field.label, (labelCounts.get(field.label) || 0) + 1);
  });
  options.forEach((field) => {
    field.ambiguous = (labelCounts.get(field.label) || 0) > 1;
  });

  const statsScope =
    scope?.kind === 'nho' || scope?.kind === 'lon'
      ? scope
      : { kind: 'all' };

  return options.map((field) => {
    const stats = collectTtcFieldStats(activeNovelData, statsScope, field.id, activeNovelData?.tabsConfig);
    const semanticMismatch = detectTtcFieldSemanticMismatch(field.label, stats.sampleValues);
    return {
      ...field,
      ...stats,
      semanticMismatch,
    };
  });
}

export function ttcFieldGroupTitle(group, scope) {
  if (group === 'content') return 'Cột thường';
  if (group === 'advanced') return 'Cột hệ thống nâng cao';
  if (group === 'folder') return 'Cột thư mục/tab';
  if (group === 'dynamic') return 'Cột động';
  if (group === 'template') {
    const name = scope?.tabLabel;
    return name ? `Cột dữ liệu của ${name}` : 'Cột dữ liệu';
  }
  return 'Cột hệ thống';
}

export function compileTtcQueryMarkdown(draft) {
  const errors = [];
  const columns = (draft?.columns || []).map((id) => String(id || '').trim()).filter(Boolean);
  if (!columns.length) errors.push('Chọn ít nhất một cột.');

  const where = [];
  const scope = draft?.scope;
  if (scope?.kind === 'lon' && scope.lonId) {
    where.push(`parentFolder = "${scope.lonId}"`);
  } else if (scope?.kind === 'nho' && scope.lonId && scope.nhoId) {
    where.push(`folderPath = "${scope.lonId}/${scope.nhoId}"`);
  }

  (draft?.filters || []).forEach((filter, index) => {
    const field = String(filter?.field || '').trim();
    const op = TTC_BUILDER_OPS.find((item) => item.id === filter?.op);
    if (!field && !filter?.op) return;
    if (!field) {
      errors.push(`Bộ lọc ${index + 1}: thiếu field.`);
      return;
    }
    if (!op) {
      errors.push(`Bộ lọc ${index + 1}: toán tử không hợp lệ.`);
      return;
    }
    if (op.id === 'isEmpty' || op.id === 'isNotEmpty') {
      where.push(`${field} ${op.token}`);
      return;
    }
    const quoted = quoteValue(filter?.value);
    if (!quoted.ok) errors.push(`Bộ lọc ${index + 1}: ${quoted.error}`);
    else if (!String(filter?.value ?? '').trim()) errors.push(`Bộ lọc ${index + 1}: thiếu giá trị.`);
    else where.push(`${field} ${op.token} ${quoted.text}`);
  });

  let limit = Number(draft?.limit);
  if (!Number.isFinite(limit)) limit = DEFAULT_LIMIT;
  limit = Math.trunc(limit);
  if (limit <= 0) errors.push('Số dòng tối đa phải lớn hơn 0.');
  if (limit > MAX_LIMIT) errors.push(`Số dòng tối đa không được vượt ${MAX_LIMIT}.`);

  const lines = ['VIEW TABLE', 'FROM entity'];
  if (where.length) lines.push(`WHERE ${where.join(' AND ')}`);
  if (columns.length) lines.push(`SELECT ${columns.join(', ')}`);
  const sortField = String(draft?.sortField || '').trim();
  if (sortField) {
    lines.push(`SORT ${sortField} ${draft?.sortDir === 'desc' ? 'DESC' : 'ASC'}`);
  }
  if (limit > 0 && limit <= MAX_LIMIT) lines.push(`LIMIT ${limit}`);

  const source = lines.join('\n');
  const parsed = errors.length ? null : parseTtcQuery(source);
  if (parsed && !parsed.ok) errors.push(...parsed.errors);

  const markdown = `\`\`\`ttc-query\n${source}\n\`\`\``;
  return {
    ok: errors.length === 0,
    errors,
    source,
    markdown,
  };
}

