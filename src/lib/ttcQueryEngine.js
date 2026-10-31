/**
 * Engine truy vấn entity read-only từ activeNovelData — không eval, không ghi dữ liệu.
 */
import { forEachNovelEntity } from './entityRename.js';
import { getEntityFieldValue, safeString } from './entityFieldValue.js';
import { normalizeSearchText } from './normalizeSearchText.js';
import { parseTtcQuery, DEFAULT_LIMIT, MAX_LIMIT } from './ttcQueryParser.js';
import {
  buildTtcEntityRowContext,
  isTtcVirtualField,
  ttcDisplayVirtualValue,
  ttcLonIdMatches,
  ttcNhoIdMatches,
} from './ttcQueryVirtualFields.js';
import {
  collectTtcKnownFieldIds,
  validateTtcQueryFields,
} from './ttcQueryFieldCatalog.js';
import { extractTtcDataFromEntityNote } from './ttcDataBlock.js';
import {
  isTtcFieldValueEmpty,
  normalizeTtcFieldId,
  readTtcFieldValue,
  readTtcFieldValueAsString,
} from './ttcQueryFieldAccess.js';
import {
  buildTtcFieldLabelMapForScope,
  inferTtcQueryLabelScopeFromWhere,
} from './ttcQueryScope.js';
import { detectTtcFieldSemanticMismatch } from './ttcQueryDiagnostics.js';

/** @deprecated dùng buildTtcFieldLabelMapForScope — giữ cho test cũ gọi trực tiếp. */
export function buildTtcFieldLabelMap(tabsConfig) {
  return buildTtcFieldLabelMapForScope(tabsConfig, { kind: 'all' });
}

function collectEntityRows(activeNovelData, tabsConfig) {
  const rows = [];
  forEachNovelEntity(activeNovelData, (ent, ctx) => {
    const row = buildTtcEntityRowContext(ent, ctx, tabsConfig);
    row.noteTtcData = extractTtcDataFromEntityNote(ent);
    rows.push(row);
  });
  return rows;
}

function displayFieldValue(row, fieldId) {
  const id = normalizeTtcFieldId(fieldId);
  if (isTtcVirtualField(id)) return ttcDisplayVirtualValue(row, id);
  const raw = readTtcFieldValue(row, id);
  if (raw == null || raw === '') return '';
  if (typeof raw === 'object') {
    try {
      return JSON.stringify(raw);
    } catch {
      return '[Object]';
    }
  }
  return safeString(raw);
}

function isEmptyValue(value) {
  return isTtcFieldValueEmpty(value);
}

function valueForCompare(row, fieldId) {
  const id = normalizeTtcFieldId(fieldId);
  if (id === 'type' || id === 'nhoId') {
    return { kind: 'nhoId', row };
  }
  if (id === 'lonId' || id === 'parentFolder') {
    return { kind: 'lonId', row };
  }
  const raw = readTtcFieldValue(row, id);
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return { kind: 'number', value: raw, text: normalizeSearchText(String(raw)) };
  }
  if (typeof raw === 'boolean') {
    return { kind: 'boolean', value: raw, text: raw ? 'true' : 'false' };
  }
  if (Array.isArray(raw)) {
    return {
      kind: 'array',
      items: raw,
      text: normalizeSearchText(raw.map((x) => safeString(x)).join(' ')),
    };
  }
  if (raw != null && typeof raw === 'object') {
    const text = normalizeSearchText(getEntityFieldValue(row.entity, id));
    return { kind: 'object', text };
  }
  const text = normalizeSearchText(safeString(raw));
  const num = Number(raw);
  if (raw !== '' && raw != null && !Number.isNaN(num) && String(raw).trim() !== '') {
    return { kind: 'number', value: num, text };
  }
  return { kind: 'string', text, raw: safeString(raw) };
}

function compareScalar(left, op, rightRaw) {
  const rightText = normalizeSearchText(safeString(rightRaw));
  if (left.kind === 'nhoId') {
    const match = ttcNhoIdMatches(left.row, rightRaw);
    if (op === 'eq') return match;
    if (op === 'neq') return !match;
    return false;
  }
  if (left.kind === 'lonId') {
    const match = ttcLonIdMatches(left.row, rightRaw);
    if (op === 'eq') return match;
    if (op === 'neq') return !match;
    return false;
  }
  if (left.kind === 'number' && typeof rightRaw === 'number') {
    if (op === 'eq') return left.value === rightRaw;
    if (op === 'neq') return left.value !== rightRaw;
    if (op === 'gt') return left.value > rightRaw;
    if (op === 'lt') return left.value < rightRaw;
    if (op === 'gte') return left.value >= rightRaw;
    if (op === 'lte') return left.value <= rightRaw;
    return false;
  }
  const l = left.text ?? normalizeSearchText(safeString(left.raw));
  if (op === 'eq') return l === rightText;
  if (op === 'neq') return l !== rightText;
  if (op === 'gt' || op === 'lt' || op === 'gte' || op === 'lte') {
    const ln = Number(left.raw ?? left.value);
    const rn = Number(rightRaw);
    if (!Number.isFinite(ln) || !Number.isFinite(rn)) return false;
    if (op === 'gt') return ln > rn;
    if (op === 'lt') return ln < rn;
    if (op === 'gte') return ln >= rn;
    if (op === 'lte') return ln <= rn;
  }
  return false;
}

function evalCondition(row, cond) {
  const field = normalizeTtcFieldId(cond.field);
  const left = valueForCompare(row, field);
  const raw = readTtcFieldValue(row, field);

  if (cond.op === 'isEmpty') return isEmptyValue(raw);
  if (cond.op === 'isNotEmpty') return !isEmptyValue(raw);
  if (cond.op === 'contains') {
    const needle = normalizeSearchText(cond.value);
    if (left.kind === 'array') {
      return left.items.some((item) => normalizeSearchText(item).includes(needle));
    }
    const hay = left.text ?? normalizeSearchText(safeString(raw));
    return hay.includes(needle);
  }
  return compareScalar(left, cond.op, cond.value);
}

function sortKey(row, fieldId) {
  const id = normalizeTtcFieldId(fieldId);
  const raw = readTtcFieldValue(row, id);
  if (raw == null || raw === '') return { empty: true, kind: 'empty', value: null, text: '' };
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return { empty: false, kind: 'number', value: raw, text: '' };
  }
  if (typeof raw === 'boolean') {
    return { empty: false, kind: 'boolean', value: raw ? 1 : 0, text: '' };
  }
  const text = normalizeSearchText(displayFieldValue(row, id));
  const num = Number(raw);
  if (!Number.isNaN(num) && safeString(raw).trim() !== '') {
    return { empty: false, kind: 'number', value: num, text: '' };
  }
  return { empty: false, kind: 'string', value: 0, text };
}

function compareSortKeys(a, b, direction) {
  const mul = direction === 'desc' ? -1 : 1;
  if (a.empty !== b.empty) return a.empty ? 1 : -1;
  if (a.kind === 'number' && b.kind === 'number') {
    if (a.value === b.value) return 0;
    return a.value > b.value ? mul : -mul;
  }
  const cmp = a.text.localeCompare(b.text, 'vi', { sensitivity: 'accent' });
  if (cmp === 0) return 0;
  return cmp > 0 ? mul : -mul;
}

/**
 * @param {object} activeNovelData
 * @param {object} query — đã parse
 * @param {{ tabsConfig?: object }} context
 */
export function executeTtcQuery(activeNovelData, query, context = {}) {
  if (!activeNovelData?.data) {
    return { ok: false, errors: ['Chưa có dữ liệu truyện để truy vấn.'] };
  }
  const tabsConfig = context.tabsConfig ?? activeNovelData?.tabsConfig ?? null;
  const labelScope =
    context.labelScope ?? inferTtcQueryLabelScopeFromWhere(query.where, tabsConfig);
  const labelMap = buildTtcFieldLabelMapForScope(tabsConfig, labelScope);
  const knownFieldIds = collectTtcKnownFieldIds(activeNovelData, tabsConfig);
  const fieldErrors = validateTtcQueryFields(query, knownFieldIds);
  if (fieldErrors.length) {
    return { ok: false, errors: fieldErrors };
  }

  let rows = collectEntityRows(activeNovelData, tabsConfig);
  for (const cond of query.where || []) {
    rows = rows.filter((row) => evalCondition(row, cond));
  }

  const totalMatched = rows.length;

  if (query.sort?.field) {
    const sortField = normalizeTtcFieldId(query.sort.field);
    rows = [...rows].sort((a, b) =>
      compareSortKeys(sortKey(a, sortField), sortKey(b, sortField), query.sort.direction),
    );
  } else {
    rows = [...rows].sort((a, b) =>
      safeString(a.entity?.name).localeCompare(safeString(b.entity?.name), 'vi'),
    );
  }

  const limit = query.limit ?? DEFAULT_LIMIT;
  const capped = Math.min(Math.max(1, limit), MAX_LIMIT);
  const truncated = totalMatched > capped;
  const slice = rows.slice(0, capped);

  const fieldWarnings = [];
  const columns = (query.select || []).map((fieldId) => {
    const id = normalizeTtcFieldId(fieldId);
    const label = labelMap[id] || id;
    const samples = [];
    for (const row of rows.slice(0, 30)) {
      const v = readTtcFieldValueAsString(row, id);
      if (v && samples.length < 5) samples.push(v);
    }
    const mismatch = detectTtcFieldSemanticMismatch(label, samples);
    if (mismatch) {
      fieldWarnings.push({ fieldId: id, ...mismatch });
    }
    return { id, label };
  });

  const resultRows = slice.map((row) => ({
    entityId: row.entity.id,
    lonId: row.lonId,
    nhoId: row.nhoId,
    entityName: safeString(row.entity.name),
    cells: columns.map((col) => ({
      fieldId: col.id,
      display: displayFieldValue(row, col.id),
      isEntityLink: col.id === 'entity',
    })),
  }));

  return {
    ok: true,
    view: query.view,
    columns,
    rows: resultRows,
    totalMatched,
    limit: capped,
    truncated,
    notice: truncated ? `Đang hiển thị ${capped} kết quả đầu tiên.` : null,
    emptyReason: resultRows.length === 0 ? 'no_match' : null,
    labelScope,
    fieldWarnings: fieldWarnings.length ? fieldWarnings : null,
  };
}

export function runTtcQueryFromSource(source, activeNovelData, context = {}) {
  const parsed = parseTtcQuery(source);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };
  return executeTtcQuery(activeNovelData, parsed.query, context);
}
