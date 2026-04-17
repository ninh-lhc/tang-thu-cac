/**
 * Ba ô gợi ý nhanh khi Khởi tạo thẻ (tab không phải Bản đồ / Thế lực).
 * Kết hợp entityQuickEntry trên tab + fieldSuggestionLists + seed theo thể loại & tên tab.
 * `entityQuickEntry.dualFirstRow`: hai ô đầu hiển thị song song (vd. f_cap = cấp bậc, f_status = phẩm chất).
 */
import { resolveMapFieldPresetFlavor, MAP_FIELD_PRESET_FLAVOR } from './mapEntityFieldPresets.js';
import { normalizeAsciiText } from './statusHierarchyParser.js';

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

/** Chọn 3 field mặc định từ template (ưu tiên f_status, f_title, f_desc…). */
export function pickDefaultQuickFieldIds(fieldsTemplate) {
  const ids = templateFieldIds(fieldsTemplate);
  if (ids.length === 0) return ['f_status', 'f_title', 'f_desc'];
  const picked = [];
  for (const pref of PREFERRED_FIELD_ORDER) {
    if (ids.includes(pref) && !picked.includes(pref)) picked.push(pref);
    if (picked.length >= 3) return picked.slice(0, 3);
  }
  for (const id of ids) {
    if (!picked.includes(id)) picked.push(id);
    if (picked.length >= 3) break;
  }
  while (picked.length < 3) {
    const pad = ['f_status', 'f_title', 'f_desc'][picked.length] || `f_extra_${picked.length}`;
    if (!picked.includes(pad)) picked.push(pad);
    else break;
  }
  return picked.slice(0, 3);
}

function normalizeSlotFields(raw, templateIds) {
  const allowed = new Set(templateIds);
  const list = Array.isArray(raw) ? raw.map((x) => String(x || '').trim()).filter(Boolean) : [];
  const out = [];
  for (const id of list) {
    if (allowed.has(id) && !out.includes(id)) out.push(id);
    if (out.length >= 3) break;
  }
  return out.length === 3 ? out : null;
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
 * Gợi ý seed theo field + ngữ cảnh (không ghi đè list người dùng — chỉ merge).
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
  let slotFields = normalizeSlotFields(eq.slotFields, templateIds);
  if (!slotFields) {
    slotFields = pickDefaultQuickFieldIds(templateList);
  }
  const slotLabelsRaw = Array.isArray(eq.slotLabels) ? eq.slotLabels.map((x) => String(x || '').trim()) : ['', '', ''];
  const slotLabels = [0, 1, 2].map((i) => slotLabelsRaw[i] || '');

  const genres = normalizeNovelGenresForQuick(activeNovelData);
  const flavor = resolveMapFieldPresetFlavor(genres);
  const tabNhoLabel = String(tabConfig?.label || '').trim();
  const lists = tabConfig?.fieldSuggestionLists && typeof tabConfig.fieldSuggestionLists === 'object' ? tabConfig.fieldSuggestionLists : {};

  const slots = slotFields.map((fieldId, idx) => {
    const userList = Array.isArray(lists[fieldId]) ? lists[fieldId] : [];
    const seeds = getQuickEntrySeedLines(fieldId, flavor, tabLonLabel, tabNhoLabel);
    const suggestions = dedupeCaseInsensitive([...userList, ...seeds]);
    const baseLabel = idToLabel.get(fieldId) || String(fieldId || '');
    const label = slotLabels[idx] || baseLabel;
    return { fieldId, label, suggestions };
  });

  const dualFirstRow = eq.dualFirstRow === true;

  return {
    slotFields,
    slotLabels,
    dualFirstRow,
    slots,
  };
}
