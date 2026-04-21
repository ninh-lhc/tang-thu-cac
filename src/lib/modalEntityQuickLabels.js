/**
 * modalEntityQuickLabels.js
 * Pha 3 — map các ô «Gợi ý nhanh» của Bản đồ / Thế lực sang fieldId trong fieldsTemplate
 *         để hiển thị nhãn theo cấu hình tab (cho phép đổi tên trường mà không cần sửa code).
 * Pha 5 — thêm MAIN_FORM_SLOTS để cùng cơ chế áp cho các ô "chính" của modal Khởi tạo thẻ
 *         (ô «Biệt danh», ô «Chuỗi hiển thị / trạng thái»). Giúp đổi nhãn ở mẫu tab → modal
 *         cập nhật, không còn hardcode song song.
 */
import { safeString } from '../MasterUtils.jsx';
import { WIKI_ALIAS_FIELD } from '../MasterEngines.js';

/**
 * @typedef {{ key: string, fieldId: string | null, defaultLabel: string, ariaLabel?: string, baselineLabels?: string[] }} QuickSlotBinding
 *
 * `baselineLabels`: các nhãn "mẫu engine" của field tương ứng. Nếu fieldsTemplate đang dùng
 * một trong các giá trị này, coi như **người dùng chưa tuỳ chỉnh** → giữ `defaultLabel` của UI
 * (ví dụ «Trực thuộc» thay vì «Vị trí» mặc định trong engine).
 */

/** Slot cho tab Bản đồ. `dacTinh` không có fieldId riêng (đóng vào f_status cùng mapType). */
export const MAP_QUICK_SLOTS = Object.freeze([
  {
    key: 'gioiDien',
    fieldId: 'f_title',
    defaultLabel: 'Giới Diện',
    ariaLabel: 'Giới Diện bản đồ',
    baselineLabels: ['Tiêu đề', 'Tiêu đề / Tên phụ', 'Giới Diện'],
  },
  {
    key: 'quyMo',
    fieldId: 'f_he_gioi_ban_do',
    defaultLabel: 'Quy Mô Địa Vực',
    ariaLabel: 'Quy Mô Địa Vực bản đồ',
    baselineLabels: ['Hệ giới bản đồ', 'Quy Mô Địa Vực'],
  },
  { key: 'dacTinh', fieldId: null, defaultLabel: 'Đặc Tính Địa Vực', ariaLabel: 'Đặc Tính Địa Vực bản đồ' },
  {
    key: 'trucThuoc',
    fieldId: 'f_vi_tri',
    defaultLabel: 'Trực thuộc',
    ariaLabel: 'Trực thuộc bản đồ',
    baselineLabels: ['Vị trí', 'Trực thuộc'],
  },
]);

/** Slot cho tab Thế lực. */
export const FORCE_QUICK_SLOTS = Object.freeze([
  {
    key: 'loaiHinh',
    fieldId: 'f_loai_to_chuc',
    defaultLabel: 'Loại hình',
    ariaLabel: 'Loại hình thế lực',
    baselineLabels: ['Loại tổ chức', 'Loại hình'],
  },
  {
    key: 'heCapBac',
    fieldId: 'f_he_cap_the_luc',
    defaultLabel: 'Hệ cấp bậc',
    ariaLabel: 'Hệ cấp bậc thế lực',
    baselineLabels: ['Hệ cấp thế lực', 'Hệ cấp bậc'],
  },
  {
    key: 'capBac',
    fieldId: 'f_status',
    defaultLabel: 'Cấp bậc',
    ariaLabel: 'Cấp bậc thế lực',
    baselineLabels: ['Trạng thái', 'Cấp bậc', 'Cảnh giới'],
  },
  {
    key: 'diaChi',
    fieldId: 'f_dia_ban',
    defaultLabel: 'Địa chỉ',
    ariaLabel: 'Địa chỉ thế lực',
    baselineLabels: ['Địa bàn', 'Địa chỉ'],
  },
]);

function findTemplateField(fieldsTemplate, fieldId) {
  const fid = safeString(fieldId).trim();
  if (!fid) return null;
  const list = Array.isArray(fieldsTemplate) ? fieldsTemplate : [];
  return list.find((f) => safeString(f?.id).trim() === fid) || null;
}

/**
 * Trả về label hiển thị cho 1 slot.
 * - Nếu fieldsTemplate đang dùng 1 trong `baselineLabels` (nhãn engine mặc định) → dùng `defaultLabel` UI.
 * - Nếu nhãn trong fieldsTemplate khác baseline → coi là người dùng đã đổi, dùng nhãn đó.
 * - Không có field tương ứng → `defaultLabel`.
 */
export function resolveQuickSlotLabel(fieldsTemplate, slot) {
  if (!slot || typeof slot !== 'object') return '';
  const defaultLabel = safeString(slot.defaultLabel).trim();
  const tpl = findTemplateField(fieldsTemplate, slot.fieldId);
  const customLabel = safeString(tpl?.label).trim();
  if (!customLabel) return defaultLabel || safeString(slot.fieldId) || '';
  const baseline = Array.isArray(slot.baselineLabels)
    ? slot.baselineLabels.map((x) => safeString(x).trim()).filter(Boolean)
    : [];
  if (baseline.some((b) => b === customLabel)) return defaultLabel || customLabel;
  return customLabel;
}

/**
 * Tạo map key → { label, ariaLabel, fieldId } để component render không cần tra cứu thủ công.
 * @param {QuickSlotBinding[]} slots
 */
export function resolveQuickSlotLabels(fieldsTemplate, slots) {
  const list = Array.isArray(slots) ? slots : [];
  const out = {};
  list.forEach((slot) => {
    if (!slot || !slot.key) return;
    const label = resolveQuickSlotLabel(fieldsTemplate, slot);
    const tpl = findTemplateField(fieldsTemplate, slot.fieldId);
    out[slot.key] = {
      label,
      ariaLabel: safeString(slot.ariaLabel).trim() || label,
      fieldId: safeString(slot.fieldId).trim() || '',
      defaultLabel: safeString(slot.defaultLabel).trim() || '',
      sortPrefix: safeString(tpl?.sortPrefix).trim(),
    };
  });
  return out;
}

/**
 * Các nhãn "mặc định engine" thường gặp cho `f_status` (baseline).
 * Gom từ `MasterEngines.js` (`DEFAULT_FIELDS_TEMPLATE`, genre templates).
 * Khi template đang dùng một trong những nhãn này → coi như user chưa đổi,
 * giữ `defaultLabel` của UI (để khối map/force vẫn hiện "Chuỗi hiển thị / dữ liệu auto").
 */
export const MAIN_STATUS_BASELINE_LABELS = Object.freeze([
  'Cảnh giới / Trạng thái',
  'Cảnh giới',
  'Cấp bậc',
  'Phẩm cấp',
  'Trạng thái',
  'Mức nguy hiểm',
  'Giá / Điểm đổi',
  'Độ khó',
  'Tóm tắt dưới tên',
  'Chuỗi hiển thị / dữ liệu auto',
]);

/**
 * Slot chung cho các ô "chính" của modal Khởi tạo thẻ.
 * Dùng kèm `resolveMainFormLabels` để có thể thay `defaultLabel` theo scope runtime.
 */
export const MAIN_FORM_SLOTS = Object.freeze({
  alias: Object.freeze({
    key: 'alias',
    fieldId: WIKI_ALIAS_FIELD.id,
    defaultLabel: WIKI_ALIAS_FIELD.label,
    ariaLabel: 'Biệt danh / tên khác',
    baselineLabels: [WIKI_ALIAS_FIELD.label, 'Biệt danh', 'Biệt danh / tên khác'],
  }),
  statusLine: Object.freeze({
    key: 'statusLine',
    fieldId: 'f_status',
    defaultLabel: 'Tóm tắt dưới tên',
    ariaLabel: 'Chuỗi hiển thị / dữ liệu auto',
    baselineLabels: MAIN_STATUS_BASELINE_LABELS,
  }),
});

/**
 * Resolve nhãn cho main-form theo scope hiện tại.
 * - Map/Force scope: ô status hiển thị "Chuỗi hiển thị / dữ liệu auto" làm default (hint rằng
 *   giá trị được auto-compose từ khối Gợi ý nhanh).
 * - Các scope khác: dùng "Tóm tắt dưới tên".
 * - Trong cả 2 trường hợp, nếu user đã tuỳ chỉnh nhãn template (khác baseline) → dùng nhãn đó.
 */
export function resolveMainFormLabels(fieldsTemplate, { isMapScope = false, isForceScope = false } = {}) {
  const statusDefault = isMapScope || isForceScope ? 'Chuỗi hiển thị / dữ liệu auto' : 'Tóm tắt dưới tên';
  const statusSlot = { ...MAIN_FORM_SLOTS.statusLine, defaultLabel: statusDefault };
  const aliasSlot = MAIN_FORM_SLOTS.alias;
  return {
    alias: {
      label: resolveQuickSlotLabel(fieldsTemplate, aliasSlot),
      ariaLabel: safeString(aliasSlot.ariaLabel).trim() || aliasSlot.defaultLabel,
      fieldId: aliasSlot.fieldId,
      defaultLabel: aliasSlot.defaultLabel,
    },
    statusLine: {
      label: resolveQuickSlotLabel(fieldsTemplate, statusSlot),
      ariaLabel: safeString(statusSlot.ariaLabel).trim() || statusDefault,
      fieldId: statusSlot.fieldId,
      defaultLabel: statusDefault,
    },
  };
}
