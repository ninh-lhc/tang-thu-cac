/**
 * Ô gợi ý nhanh khi Khởi tạo thẻ (tab không phải Bản đồ / Thế lực).
 * Kết hợp entityQuickEntry trên tab + fieldSuggestionLists; seed theo thể loại chỉ khi list mẫu trống (tránh trộn cảnh giới vào Phẩm cấp đồ vật).
 * Cấu hình: đúng {@link MAX_QUICK_ENTRY_SLOTS} trường (mặc định/ tối đa 4) khi mẫu tab đủ cột; ít hơn nếu mẫu ít trường.
 * `entityQuickEntry.dualFirstRow`: cờ lịch sử (giao diện lưới xếp tự động theo số cột).
 */
export const MAX_QUICK_ENTRY_SLOTS = 4;
export const DEFAULT_QUICK_ENTRY_SLOT_COUNT = 4;
import { resolveMapFieldPresetFlavor, MAP_FIELD_PRESET_FLAVOR } from './mapEntityFieldPresets.js';
import { normalizeAsciiText } from './statusHierarchyParser.js';
import { suggestionRowsToValues } from './suggestionRowFormat.js';

const PREFERRED_FIELD_ORDER = ['f_status', 'f_title', 'f_desc', 'f_cap', 'f_vi_tri', 'f_dia_ban'];

function dedupeCaseInsensitive(values) {
  const out = [];
  const seen = new Set();
  (values || []).forEach((value) => {
    const raw = String(value || '').trim();
    const key = normalizeAsciiText(raw);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(raw);
  });
  return out;
}

export function normalizeNovelGenresForQuick(novel) {
  if (!novel || typeof novel !== 'object') return [];
  if (Array.isArray(novel.genres)) return novel.genres.filter(Boolean);
  if (typeof novel.genre === 'string' && novel.genre.trim()) return [novel.genre.trim()];
  return [];
}

function templateFieldIds(fieldsTemplate) {
  return (Array.isArray(fieldsTemplate) ? fieldsTemplate : [])
    .map((f) => String(f?.id || '').trim())
    .filter((id) => id && id !== 'f_alias');
}

/**
 * Id không bao giờ gán vào ô gợi ý nhanh (biệt danh wiki — trùng ô khác).
 * `f_status` (Phẩm cấp / trạng thái) **được phép** nếu người dùng muốn gợi ý nhanh cùng ô chính.
 */
export const EXCLUDED_FROM_MODAL_QUICK_GRID = new Set(['f_alias']);

/** Khi tự chọn bộ ô mặc định: vẫn bỏ f_status để tránh trùng ô chính (trừ khi user cấu hình tay). */
const SKIPPED_IN_DEFAULT_QUICK_GRID = new Set(['f_status', 'f_alias']);

/** Bỏ id không hợp lệ cho ô gợi ý nhanh trước khi validate / lưu. */
export function filterAllowedQuickEntrySlotIds(slotFields) {
  return (Array.isArray(slotFields) ? slotFields : [])
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .filter((id) => !EXCLUDED_FROM_MODAL_QUICK_GRID.has(id))
    .slice(0, MAX_QUICK_ENTRY_SLOTS);
}

/** Chọn 4 field mặc định từ template (ưu tiên f_status, f_title, f_desc…). */
export function pickDefaultQuickFieldIds(fieldsTemplate) {
  const ids = templateFieldIds(fieldsTemplate);
  if (ids.length === 0) return ['f_status', 'f_title', 'f_desc'];
  const picked = [];
  for (const pref of PREFERRED_FIELD_ORDER) {
    if (ids.includes(pref) && !picked.includes(pref)) picked.push(pref);
    if (picked.length >= DEFAULT_QUICK_ENTRY_SLOT_COUNT) return picked.slice(0, DEFAULT_QUICK_ENTRY_SLOT_COUNT);
  }
  for (const id of ids) {
    if (!picked.includes(id)) picked.push(id);
    if (picked.length >= DEFAULT_QUICK_ENTRY_SLOT_COUNT) break;
  }
  return picked;
}

/**
 * Bộ 4 ô gợi ý mặc định trên form Khởi tạo: không ăn f_status / f_alias
 * (đã là «Trạng thái / Cấp» + biệt danh ở dưới) — thường 4 thẻ khi mẫu tab đủ cột.
 */
export function pickDefaultQuickFieldIdsForModalGrid(fieldsTemplate) {
  const ids = templateFieldIds(fieldsTemplate);
  if (ids.length === 0) {
    return ['f_title', 'f_desc', 'f_cap', 'f_vi_tri'];
  }
  const picked = [];
  for (const pref of PREFERRED_FIELD_ORDER) {
    if (SKIPPED_IN_DEFAULT_QUICK_GRID.has(pref)) continue;
    if (ids.includes(pref) && !picked.includes(pref)) picked.push(pref);
    if (picked.length >= DEFAULT_QUICK_ENTRY_SLOT_COUNT) return picked.slice(0, DEFAULT_QUICK_ENTRY_SLOT_COUNT);
  }
  for (const id of ids) {
    if (SKIPPED_IN_DEFAULT_QUICK_GRID.has(id)) continue;
    if (!picked.includes(id)) picked.push(id);
    if (picked.length >= DEFAULT_QUICK_ENTRY_SLOT_COUNT) break;
  }
  return picked.slice(0, DEFAULT_QUICK_ENTRY_SLOT_COUNT);
}

function normalizeSlotFields(raw, templateIds) {
  const allowed = new Set(templateIds);
  const list = Array.isArray(raw) ? raw.map((x) => String(x || '').trim()).filter(Boolean) : [];
  const out = [];
  for (const id of list) {
    if (EXCLUDED_FROM_MODAL_QUICK_GRID.has(id)) continue;
    if (allowed.has(id) && !out.includes(id)) out.push(id);
    if (out.length >= MAX_QUICK_ENTRY_SLOTS) break;
  }
  if (out.length < 1) return null;
  return out;
}

/**
 * Chuẩn hóa thứ tự + hợp lệ theo mẫu (bỏ id không thuộc lưới ô nhanh).
 * `fillToMax: true` (mặc định): bổ sung tới tối đa {@link MAX_QUICK_ENTRY_SLOTS} cột — dùng khi chưa có cấu hình user.
 * `fillToMax: false`: chỉ giữ các id đã truyền (sau lọc mẫu), không ghép thêm ô mặc định — khớp «Áp dụng» trong modal.
 */
function finalizeQuickSlotFieldIds(ordered, templateList, options = {}) {
  const fillToMax = options.fillToMax !== false;
  const templateListArr = Array.isArray(templateList) ? templateList : [];
  const templateIdsArr = templateFieldIds(templateListArr);
  if (templateIdsArr.length < 1) return [];
  const cap = Math.min(MAX_QUICK_ENTRY_SLOTS, templateIdsArr.length);
  const tset = new Set(templateIdsArr);
  const out = [];
  for (const id of ordered) {
    if (!tset.has(id) || out.includes(id)) continue;
    out.push(id);
    if (out.length >= cap) return out;
  }
  if (!fillToMax) return out;
  for (const id of pickDefaultQuickFieldIdsForModalGrid(templateListArr)) {
    if (!tset.has(id) || out.includes(id)) continue;
    out.push(id);
    if (out.length >= cap) return out;
  }
  for (const id of templateIdsArr) {
    if (out.includes(id)) continue;
    out.push(id);
    if (out.length >= cap) return out;
  }
  return out;
}

/**
 * Cấu hình đã lưu (1–4 id hợp lệ) hoặc bộ mặc định.
 * Khi user đã lưu `slotFields` hợp lệ: không tự ghép thêm ô mặc định (tránh «Áp dụng» xong vẫn thấy f_title/f_desc dư).
 * @param {{ entityQuickEntry?: { slotFields?: string[] } } | null | undefined} tabNho
 * @param {Array<{ id?: string }>} fieldsTemplate
 * @returns {string[]}
 */
export function getEffectiveQuickEntrySlotFields(tabNho, fieldsTemplate) {
  const templateList = Array.isArray(fieldsTemplate) ? fieldsTemplate : [];
  const templateIds = templateFieldIds(templateList);
  const defaultSlots = pickDefaultQuickFieldIdsForModalGrid(templateList);
  const raw = tabNho?.entityQuickEntry?.slotFields;
  const n = normalizeSlotFields(raw, templateIds);
  const hadExplicitUser = Boolean(n && n.length > 0);
  const base = hadExplicitUser ? n : defaultSlots;
  return finalizeQuickSlotFieldIds(base, templateList, { fillToMax: !hadExplicitUser });
}

/**
 * Áp bộ trường/ nhãn nguồn xuống mẫu trường của một tab (vd. khi «Áp cả tab lớn»).
 * Chỉ giữ id thuộc mẫu; đúng {@link MAX_QUICK_ENTRY_SLOTS} ô nếu mẫu đủ; nếu rỗng → mặc định từ mẫu.
 * @param {string[]|undefined} sourceSlotFields
 * @param {string[]|undefined} sourceSlotLabels
 * @param {Array<{ id?: string }>} fieldsTemplate
 * @returns {{ slotFields: string[], slotLabels: string[] }}
 */
export function fitEntityQuickEntrySlotsToTemplate(sourceSlotFields, sourceSlotLabels, fieldsTemplate) {
  const templateList = Array.isArray(fieldsTemplate) ? fieldsTemplate : [];
  const templateIds = new Set(templateFieldIds(templateList));
  const raw = Array.isArray(sourceSlotFields) ? sourceSlotFields : [];
  const rawIds = raw.map((id) => String(id || '').trim());
  const labelForFieldId = (fid) => {
    const idx = rawIds.indexOf(fid);
    return idx >= 0 ? String(sourceSlotLabels?.[idx] ?? '').trim() : '';
  };
  const out = [];
  for (const id of raw) {
    const idt = String(id || '').trim();
    if (templateIds.has(idt) && !out.includes(idt)) out.push(idt);
    if (out.length >= MAX_QUICK_ENTRY_SLOTS) break;
  }
  if (out.length < 1) {
    const def = pickDefaultQuickFieldIdsForModalGrid(templateList);
    const fields = finalizeQuickSlotFieldIds(def, templateList);
    return {
      slotFields: fields,
      slotLabels: fields.map((fid) => labelForFieldId(fid)),
    };
  }
  const fields = finalizeQuickSlotFieldIds(out, templateList);
  return {
    slotFields: fields,
    slotLabels: fields.map((fid) => labelForFieldId(fid)),
  };
}

/**
 * Ghi cấu hình quick entry (đã cắt khớp mẫu) lên tab nhỏ sưu tập.
 * @param {{ viewType?: string, entityQuickEntry?: object, fieldsTemplate?: object[] } | null | undefined} nho
 * @param {string[]|undefined} sourceSlotFields
 * @param {string[]|undefined} sourceSlotLabels
 * @param {{ dualFirstRow?: boolean, useSelectUi?: boolean }} [options]
 * @param {Array<{ id?: string }>|undefined} [fieldsTemplateForFit] — mẫu đã resolve (giống modal); mặc định `nho.fieldsTemplate`.
 * @returns {boolean} đã ghi
 */
export function applyEntityQuickEntryToNho(nho, sourceSlotFields, sourceSlotLabels, options = {}, fieldsTemplateForFit) {
  if (!nho || nho.viewType !== 'collection-track') return false;
  const templateList =
    Array.isArray(fieldsTemplateForFit) && fieldsTemplateForFit.length > 0 ? fieldsTemplateForFit : nho.fieldsTemplate;
  const { slotFields, slotLabels } = fitEntityQuickEntrySlotsToTemplate(
    sourceSlotFields,
    sourceSlotLabels,
    templateList
  );
  const prev = nho.entityQuickEntry && typeof nho.entityQuickEntry === 'object' ? { ...nho.entityQuickEntry } : {};
  nho.entityQuickEntry = {
    ...prev,
    slotFields,
    slotLabels,
    dualFirstRow: Boolean(options.dualFirstRow),
    useSelectUi: Boolean(options.useSelectUi),
  };
  return true;
}

function getStatusSeeds(flavor) {
  switch (flavor) {
    case MAP_FIELD_PRESET_FLAVOR.URBAN:
      return ['Đang hoạt động', 'Tạm ẩn', 'Cố vấn', 'Khách mời', 'VIP', 'Đang phát triển'];
    case MAP_FIELD_PRESET_FLAVOR.SCIFI:
      return ['Đồng bộ orbit', 'Ngưng hoạt động', 'Bảo trì', 'Thử nghiệm', 'Cảnh báo'];
    case MAP_FIELD_PRESET_FLAVOR.SURVIVAL:
      return ['Ổn định', 'Cảnh báo', 'Nguy hiểm', 'Cách ly', 'Mất liên lạc'];
    default:
      return ['Luyện Khí', 'Trúc Cơ', 'Kim Đan', 'Nguyên Anh', 'Hóa Thần', 'Đại Thừa'];
  }
}

function getTitleSeeds(flavor, tabNhoLabel) {
  const base =
    flavor === MAP_FIELD_PRESET_FLAVOR.URBAN
      ? ['Phân loại A', 'Phân loại B', 'Hạng S', 'Hạng A', 'Hạng B']
      : flavor === MAP_FIELD_PRESET_FLAVOR.SCIFI
        ? ['Cấp I', 'Cấp II', 'Cấp III', 'Prototype', 'Legacy']
        : ['Hệ phụ', 'Hệ chính', 'Biến thể', 'Hiếm', 'Thường'];
  const t = String(tabNhoLabel || '').trim();
  if (t && t.length < 48) return dedupeCaseInsensitive([`${t} (mẫu)`, ...base]);
  return base;
}

function getDescSeeds(flavor) {
  if (flavor === MAP_FIELD_PRESET_FLAVOR.URBAN) {
    return ['Ghi chú ngắn về vai trò trong tổ chức.', 'Liên hệ / đường dây nội bộ.', 'Giai đoạn hiện tại của plot.'];
  }
  if (flavor === MAP_FIELD_PRESET_FLAVOR.SCIFI) {
    return ['Thông số vận hành ngắn.', 'Nguồn năng lượng / module gắn.', 'Ràng buộc pháp lý hoặc hợp đồng.'];
  }
  return ['Đặc điểm nổi bật.', 'Ưu / nhược điểm chiến đấu.', 'Quan hệ với phe khác.'];
}

function getCapSeeds(flavor) {
  return flavor === MAP_FIELD_PRESET_FLAVOR.CULTIVATION
    ? ['Sơ kỳ', 'Trung kỳ', 'Hậu kỳ', 'Đại viên mãn', 'Viên mãn']
    : ['Cấp 1', 'Cấp 2', 'Cấp 3', 'Tối đa', 'Nền tảng'];
}

/**
 * Gợi ý seed theo field + ngữ cảnh — chỉ dùng khi `fieldSuggestionLists` chưa có dòng cho trường đó.
 */
export function getQuickEntrySeedLines(fieldId, flavor, tabLonLabel, tabNhoLabel) {
  const fid = String(fieldId || '').trim();
  if (fid === 'f_status') return getStatusSeeds(flavor);
  if (fid === 'f_title') return getTitleSeeds(flavor, tabNhoLabel);
  if (fid === 'f_desc') return getDescSeeds(flavor);
  if (fid === 'f_cap' || fid.includes('cap')) return getCapSeeds(flavor);
  const ctx = [tabLonLabel, tabNhoLabel].filter(Boolean).join(' · ');
  return ctx ? [`Ngữ cảnh: ${ctx}`] : [];
}

/**
 * @returns {{ slotFields: string[], slotLabels: string[], dualFirstRow: boolean, slots: { fieldId: string, label: string, suggestions: string[] }[] }}
 */
export function resolveEntityQuickSlots({
  tabConfig,
  fieldsTemplate,
  activeNovelData,
  parentLabel: tabLonLabel,
}) {
  const templateList = Array.isArray(fieldsTemplate) ? fieldsTemplate : [];
  const templateIds = templateFieldIds(templateList);
  const idToLabel = new Map(templateList.map((f) => [f.id, safeLabel(f)]));
  function safeLabel(f) {
    return String(f?.label || f?.id || '').trim() || String(f?.id || '');
  }

  const eq = tabConfig?.entityQuickEntry && typeof tabConfig.entityQuickEntry === 'object' ? tabConfig.entityQuickEntry : {};
  let baseFields = normalizeSlotFields(eq.slotFields, templateIds);
  const hadExplicitUser = Boolean(baseFields && baseFields.length > 0);
  if (!baseFields) {
    baseFields = pickDefaultQuickFieldIdsForModalGrid(templateList);
  }
  const slotLabelsRaw = Array.isArray(eq.slotLabels) ? eq.slotLabels.map((x) => String(x || '').trim()) : [];
  const labelByFid = new Map();
  baseFields.forEach((fid, i) => {
    labelByFid.set(fid, slotLabelsRaw[i] || '');
  });
  const slotFields = finalizeQuickSlotFieldIds(baseFields, templateList, { fillToMax: !hadExplicitUser });
  const slotLabels = slotFields.map((fid) => labelByFid.get(fid) ?? '');

  const genres = normalizeNovelGenresForQuick(activeNovelData);
  const flavor = resolveMapFieldPresetFlavor(genres);
  const tabNhoLabel = String(tabConfig?.label || '').trim();
  const lists = tabConfig?.fieldSuggestionLists && typeof tabConfig.fieldSuggestionLists === 'object' ? tabConfig.fieldSuggestionLists : {};

  const idToPrefix = new Map(
    templateList.map((f) => [f.id, String(f?.sortPrefix || '').trim()])
  );
  const slots = slotFields.map((fieldId, idx) => {
    const userList = Array.isArray(lists[fieldId]) ? suggestionRowsToValues(lists[fieldId]) : [];
    const seeds = getQuickEntrySeedLines(fieldId, flavor, tabLonLabel, tabNhoLabel);
    const suggestions =
      userList.length > 0 ? dedupeCaseInsensitive(userList) : dedupeCaseInsensitive([...userList, ...seeds]);
    const baseLabel = idToLabel.get(fieldId) || String(fieldId || '');
    const label = slotLabels[idx] || baseLabel;
    const sortPrefix = idToPrefix.get(fieldId) || '';
    return { fieldId, label, suggestions, sortPrefix };
  });

  const dualFirstRow = eq.dualFirstRow === true;

  return {
    slotFields,
    slotLabels,
    dualFirstRow,
    slots,
  };
}
