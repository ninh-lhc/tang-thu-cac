/**
 * Diagnostics TTC-Query (test/dev): audit entity trong scope, không mutate dữ liệu.
 */
import { forEachNovelEntity } from './entityRename.js';
import { resolveFieldsTemplate } from '../MasterEngines.js';
import { safeString } from './entityFieldValue.js';
import { extractTtcDataFromEntityNote } from './ttcDataBlock.js';
import {
  buildTtcEntityRowContext,
  normalizeTtcTabsList,
} from './ttcQueryVirtualFields.js';
import { readTtcFieldValue, isTtcFieldValueEmpty } from './ttcQueryFieldAccess.js';
import { scopeMatches } from './ttcQueryScope.js';

const TIER_LABEL_RE = /phẩm cấp|cảnh giới|cấp bậc|hạng|realm|level|đẳng cấp/i;
const TITLE_LIKE_VALUE_RE = /\s-\s|truyện|tiểu thuyết|tác phẩm|phần\s*\d/i;

export function truncateTtcSample(text, max = 72) {
  const s = safeString(text).trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export function collectTtcFieldStats(activeNovelData, scope, fieldId, tabsConfig) {
  const id = String(fieldId || '').trim();
  let totalCount = 0;
  let populatedCount = 0;
  const sampleValues = [];
  const tabs = normalizeTtcTabsList(tabsConfig ?? activeNovelData?.tabsConfig);

  forEachNovelEntity(activeNovelData, (ent, ctx) => {
    if (!scopeMatches(scope, ctx.lonId, ctx.nhoId)) return;
    totalCount += 1;
    const row = buildTtcEntityRowContext(ent, ctx, tabs);
    row.noteTtcData = extractTtcDataFromEntityNote(ent);
    const raw = readTtcFieldValue(row, id);
    if (isTtcFieldValueEmpty(raw)) return;
    populatedCount += 1;
    if (sampleValues.length < 5) {
      sampleValues.push(truncateTtcSample(raw));
    }
  });

  return {
    fieldId: id,
    totalCount,
    populatedCount,
    sampleValues,
    valueType: 'string',
  };
}

/**
 * Cảnh báo khi nhãn gợi ý phẩm cấp/cảnh giới nhưng mẫu giá trị giống tiêu đề tác phẩm.
 */
export function detectTtcFieldSemanticMismatch(label, sampleValues, rowHints = []) {
  const lab = safeString(label);
  if (!TIER_LABEL_RE.test(lab) || !sampleValues?.length) return null;

  const titleLike = sampleValues.filter(
    (v) => safeString(v).length > 28 || TITLE_LIKE_VALUE_RE.test(safeString(v)),
  );
  if (titleLike.length < Math.min(2, sampleValues.length)) return null;

  const sameAsTitle = rowHints.filter((h) => h.f_status === h.f_title && !isTtcFieldValueEmpty(h.f_status));
  const message =
    sameAsTitle.length > 0
      ? 'Giá trị f_status trùng f_title trên một số thẻ — có thể dữ liệu cũ lưu nhầm field (không tự sửa).'
      : 'Mẫu giá trị trông giống tên tác phẩm/tiêu đề, trong khi nhãn tab gợi ý phẩm cấp/cảnh giới. Kiểm tra dynamicData trên thẻ.';

  return {
    code: 'value_shape_mismatch',
    message,
    sampleValues: titleLike.slice(0, 3),
  };
}

const AUDIT_FIELD_IDS = [
  'f_status',
  'f_to_chuc',
  'f_level',
  'f_pham_cap',
  'f_canh_gioi',
  'f_title',
  'f_desc',
];

/**
 * @param {object} activeNovelData
 * @param {{ kind: string, lonId?: string, nhoId?: string }} scope
 * @param {{ entityNames?: string[], tabsConfig?: object }} options
 */
export function inspectTtcScopeEntities(activeNovelData, scope, options = {}) {
  const tabsConfig = options.tabsConfig ?? activeNovelData?.tabsConfig;
  const tabs = normalizeTtcTabsList(tabsConfig);
  const nameFilter = options.entityNames?.length
    ? new Set(options.entityNames.map((n) => safeString(n).trim()))
    : null;
  const rows = [];

  forEachNovelEntity(activeNovelData, (ent, ctx) => {
    if (!scopeMatches(scope, ctx.lonId, ctx.nhoId)) return;
    if (nameFilter && !nameFilter.has(safeString(ent.name).trim())) return;

    const row = buildTtcEntityRowContext(ent, ctx, tabs);
    row.noteTtcData = extractTtcDataFromEntityNote(ent);
    const lon = tabs.find((t) => t?.id === ctx.lonId);
    const nho = lon?.subTabs?.find((s) => s?.id === ctx.nhoId);
    const resolved = nho ? resolveFieldsTemplate(nho, ctx.lonId, lon?.label || '') : [];
    const fieldValues = {};
    AUDIT_FIELD_IDS.forEach((fid) => {
      fieldValues[fid] = readTtcFieldValue(row, fid);
    });

    rows.push({
      entityId: ent.id,
      entityName: safeString(ent.name),
      lonId: ctx.lonId,
      nhoId: ctx.nhoId,
      folderPath: row.folderPath,
      status: ent.status ?? '',
      title: ent.title ?? '',
      dynamicDataKeys: Object.keys(ent.dynamicData || {}),
      dynamicData: ent.dynamicData ? { ...ent.dynamicData } : {},
      resolvedFieldsTemplate: resolved.map((f) => ({ id: f.id, label: f.label })),
      fieldValues,
    });
  });

  return rows;
}
