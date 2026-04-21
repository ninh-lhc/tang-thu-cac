/**
 * fieldValueSources.js
 * Chuẩn hoá «nguồn giá trị» cho từng field trong fieldsTemplate (Pha 2 của cấu hình tab).
 * Sử dụng bởi modal Khởi tạo thẻ và editor mẫu tab — giữ 1 nguồn sự thật trong novel.tabsConfig.
 */
import { safeString } from '../MasterUtils.jsx';
import { normalizeAsciiText } from './statusHierarchyParser.js';

export const FIELD_SOURCE_KIND = Object.freeze({
  MANUAL: 'manual',
  SUB_TAB_LABEL: 'subTabLabel',
  SIBLING_TABS: 'siblingTabs',
  ENTITY_NAMES: 'entityNames',
  MAP_TYPES: 'mapTypes',
  MAP_HIERARCHY: 'mapHierarchy',
  NOVEL_METADATA: 'novelMetadata',
});

const SUPPORTED_KINDS = new Set(Object.values(FIELD_SOURCE_KIND));

export const FIELD_SOURCE_OPTIONS = [
  {
    kind: FIELD_SOURCE_KIND.MANUAL,
    label: 'Thủ công',
    hint: 'Dùng danh sách gợi ý do người dùng nhập (mỗi dòng một giá trị).',
  },
  {
    kind: FIELD_SOURCE_KIND.SUB_TAB_LABEL,
    label: 'Tên tab con đang mở',
    hint: 'Giá trị mặc định = tên tab con hiện tại (ví dụ: Hạ Giới).',
  },
  {
    kind: FIELD_SOURCE_KIND.SIBLING_TABS,
    label: 'Danh sách tab con (cùng tab lớn)',
    hint: 'Gợi ý = tên các tab con khác cùng tab lớn.',
  },
  {
    kind: FIELD_SOURCE_KIND.ENTITY_NAMES,
    label: 'Tên thẻ trong tab',
    hint: 'Gợi ý = tên các thẻ đã tạo trong tab con hiện tại.',
  },
  {
    kind: FIELD_SOURCE_KIND.MAP_TYPES,
    label: 'List «Giới Diện» của Bản đồ',
    hint: 'Dùng chung danh sách loại địa danh trong mapEntrySuggestions.types.',
  },
  {
    kind: FIELD_SOURCE_KIND.MAP_HIERARCHY,
    label: 'List «Đặc Tính» của Bản đồ',
    hint: 'Dùng chung danh sách đặc tính trong mapEntrySuggestions.hierarchy.',
  },
  {
    kind: FIELD_SOURCE_KIND.NOVEL_METADATA,
    label: 'Metadata truyện',
    hint: 'Lấy giá trị từ thông tin truyện (thể loại, tác giả, tên truyện…).',
  },
];

export const NOVEL_METADATA_KEYS = Object.freeze({
  GENRES: 'genres',
  AUTHOR: 'author',
  TITLE: 'title',
});

export function isValidFieldSourceKind(kind) {
  return SUPPORTED_KINDS.has(safeString(kind).trim());
}

/** Chuẩn hoá 1 object nguồn dữ liệu — trả về null nếu không hợp lệ / không khác mặc định. */
export function normalizeFieldSource(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const kind = safeString(raw.kind).trim();
  if (!SUPPORTED_KINDS.has(kind)) return null;
  if (kind === FIELD_SOURCE_KIND.MANUAL) return null; // mặc định, không cần lưu
  const out = { kind };
  if (kind === FIELD_SOURCE_KIND.NOVEL_METADATA) {
    const metaKey = safeString(raw.metadataKey).trim();
    if (metaKey) out.metadataKey = metaKey;
  }
  return out;
}

/** Làm sạch toàn bộ map fieldSource theo danh sách fieldId còn hợp lệ. */
export function sanitizeTabFieldSourceMap(raw, allowedFieldIds) {
  if (!raw || typeof raw !== 'object') return {};
  const allowed = new Set((Array.isArray(allowedFieldIds) ? allowedFieldIds : []).map((id) => safeString(id).trim()).filter(Boolean));
  const out = {};
  Object.entries(raw).forEach(([key, value]) => {
    const fid = safeString(key).trim();
    if (!fid || !allowed.has(fid)) return;
    const n = normalizeFieldSource(value);
    if (n) out[fid] = n;
  });
  return out;
}

/** Lấy descriptor nguồn cho 1 fieldId (fallback MANUAL). */
export function getFieldSourceDescriptor(tabConfig, fieldId) {
  const fid = safeString(fieldId).trim();
  if (!fid) return { kind: FIELD_SOURCE_KIND.MANUAL };
  const map = tabConfig?.fieldSource && typeof tabConfig.fieldSource === 'object' ? tabConfig.fieldSource : null;
  const raw = map ? map[fid] : null;
  return normalizeFieldSource(raw) || { kind: FIELD_SOURCE_KIND.MANUAL };
}

function dedupeStrings(values) {
  const seen = new Set();
  const out = [];
  (values || []).forEach((v) => {
    const raw = safeString(v).trim();
    const key = normalizeAsciiText(raw);
    if (!raw || !key || seen.has(key)) return;
    seen.add(key);
    out.push(raw);
  });
  return out;
}

function collectSiblingTabLabels(activeNovelData, parentTabId, excludeNhoId) {
  if (!activeNovelData || typeof activeNovelData !== 'object') return [];
  const lon = (activeNovelData.tabsConfig || []).find((x) => safeString(x?.id).trim() === safeString(parentTabId).trim());
  const subs = Array.isArray(lon?.subTabs) ? lon.subTabs : [];
  return subs
    .filter((sub) => sub && sub.viewType === 'collection-track' && safeString(sub?.id).trim() !== safeString(excludeNhoId).trim())
    .map((sub) => safeString(sub?.label).trim())
    .filter(Boolean);
}

function collectEntityNamesInTab(activeNovelData, parentTabId, nhoId) {
  if (!activeNovelData || typeof activeNovelData !== 'object') return [];
  const lonKey = safeString(parentTabId).trim();
  const nhoKey = safeString(nhoId).trim();
  if (!lonKey || !nhoKey) return [];
  const lonData = activeNovelData.data && typeof activeNovelData.data === 'object' ? activeNovelData.data[lonKey] : null;
  if (!lonData || typeof lonData !== 'object') return [];
  const nhoBlock = lonData[nhoKey];
  if (!nhoBlock || typeof nhoBlock !== 'object') return [];
  const items = Array.isArray(nhoBlock.items) ? nhoBlock.items : Array.isArray(nhoBlock.entities) ? nhoBlock.entities : [];
  return items
    .map((entity) => safeString(entity?.name).trim())
    .filter(Boolean);
}

function collectMapList(tabConfig, which) {
  const ms = tabConfig?.mapEntrySuggestions;
  if (!ms || typeof ms !== 'object') return [];
  const arr = Array.isArray(ms[which]) ? ms[which] : [];
  return arr.map((x) => safeString(x).trim()).filter(Boolean);
}

function collectNovelMetadata(activeNovelData, metadataKey) {
  if (!activeNovelData || typeof activeNovelData !== 'object') return { defaultValue: '', list: [] };
  const key = safeString(metadataKey).trim() || NOVEL_METADATA_KEYS.GENRES;
  if (key === NOVEL_METADATA_KEYS.GENRES) {
    const list = Array.isArray(activeNovelData.genres)
      ? activeNovelData.genres.map((g) => safeString(g).trim()).filter(Boolean)
      : safeString(activeNovelData.genre).trim()
        ? [safeString(activeNovelData.genre).trim()]
        : [];
    return { defaultValue: list[0] || '', list };
  }
  if (key === NOVEL_METADATA_KEYS.AUTHOR) {
    const v = safeString(activeNovelData.author).trim();
    return { defaultValue: v, list: v ? [v] : [] };
  }
  if (key === NOVEL_METADATA_KEYS.TITLE) {
    const v = safeString(activeNovelData.title || activeNovelData.name).trim();
    return { defaultValue: v, list: v ? [v] : [] };
  }
  return { defaultValue: '', list: [] };
}

/**
 * Tính toán gợi ý / default value cho 1 field dựa trên descriptor.
 * @returns {{ suggestions: string[], defaultValue: string, sourceLabel: string }}
 */
export function resolveFieldValueSource({
  fieldId,
  tabConfig,
  parentTabId = '',
  parentLabel = '',
  activeNovelData = null,
}) {
  const fid = safeString(fieldId).trim();
  void parentLabel; // để sẵn mở rộng về sau (ví dụ tên tab lớn)
  const descriptor = getFieldSourceDescriptor(tabConfig, fid);
  const manualList = Array.isArray(tabConfig?.fieldSuggestionLists?.[fid])
    ? tabConfig.fieldSuggestionLists[fid].map((x) => safeString(x).trim()).filter(Boolean)
    : [];
  const kind = descriptor.kind;

  if (kind === FIELD_SOURCE_KIND.SUB_TAB_LABEL) {
    const tabNhoLabel = safeString(tabConfig?.label).trim();
    return {
      suggestions: dedupeStrings([tabNhoLabel, ...manualList]),
      defaultValue: tabNhoLabel,
      sourceLabel: 'Tên tab con đang mở',
    };
  }

  if (kind === FIELD_SOURCE_KIND.SIBLING_TABS) {
    const siblings = collectSiblingTabLabels(activeNovelData, parentTabId, tabConfig?.id);
    return {
      suggestions: dedupeStrings([...manualList, ...siblings]),
      defaultValue: '',
      sourceLabel: 'Danh sách tab con (cùng tab lớn)',
    };
  }

  if (kind === FIELD_SOURCE_KIND.ENTITY_NAMES) {
    const names = collectEntityNamesInTab(activeNovelData, parentTabId, tabConfig?.id);
    return {
      suggestions: dedupeStrings([...manualList, ...names]),
      defaultValue: '',
      sourceLabel: 'Tên thẻ trong tab',
    };
  }

  if (kind === FIELD_SOURCE_KIND.MAP_TYPES) {
    const list = collectMapList(tabConfig, 'types');
    return {
      suggestions: dedupeStrings([...manualList, ...list]),
      defaultValue: '',
      sourceLabel: 'List «Giới Diện» của Bản đồ',
    };
  }

  if (kind === FIELD_SOURCE_KIND.MAP_HIERARCHY) {
    const list = collectMapList(tabConfig, 'hierarchy');
    return {
      suggestions: dedupeStrings([...manualList, ...list]),
      defaultValue: '',
      sourceLabel: 'List «Đặc Tính» của Bản đồ',
    };
  }

  if (kind === FIELD_SOURCE_KIND.NOVEL_METADATA) {
    const meta = collectNovelMetadata(activeNovelData, descriptor.metadataKey);
    return {
      suggestions: dedupeStrings([...manualList, ...meta.list]),
      defaultValue: meta.defaultValue,
      sourceLabel: 'Metadata truyện',
    };
  }

  return {
    suggestions: dedupeStrings(manualList),
    defaultValue: '',
    sourceLabel: 'Thủ công',
  };
}
