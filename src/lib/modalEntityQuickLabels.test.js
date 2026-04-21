import { describe, expect, it } from 'vitest';
import {
  FORCE_QUICK_SLOTS,
  MAIN_FORM_SLOTS,
  MAIN_STATUS_BASELINE_LABELS,
  MAP_QUICK_SLOTS,
  resolveMainFormLabels,
  resolveQuickSlotLabel,
  resolveQuickSlotLabels,
} from './modalEntityQuickLabels.js';
import { WIKI_ALIAS_FIELD } from '../MasterEngines.js';

describe('resolveQuickSlotLabel', () => {
  it('trả về defaultLabel khi fieldsTemplate không có field tương ứng', () => {
    expect(resolveQuickSlotLabel([], MAP_QUICK_SLOTS[0])).toBe('Giới Diện');
  });

  it('dùng label tùy chỉnh trong fieldsTemplate khi có', () => {
    const tpl = [{ id: 'f_title', label: 'Tên giới diện' }];
    expect(resolveQuickSlotLabel(tpl, MAP_QUICK_SLOTS[0])).toBe('Tên giới diện');
  });

  it('slot không có fieldId (vd. Đặc Tính Địa Vực) giữ defaultLabel', () => {
    const dacTinh = MAP_QUICK_SLOTS.find((s) => s.key === 'dacTinh');
    expect(resolveQuickSlotLabel([{ id: 'f_title', label: 'X' }], dacTinh)).toBe('Đặc Tính Địa Vực');
  });

  it('label rỗng trong template sẽ fallback về defaultLabel', () => {
    const tpl = [{ id: 'f_title', label: '   ' }];
    expect(resolveQuickSlotLabel(tpl, MAP_QUICK_SLOTS[0])).toBe('Giới Diện');
  });

  it('label khớp baselineLabels của engine → giữ defaultLabel UI (không override)', () => {
    const trucThuoc = MAP_QUICK_SLOTS.find((s) => s.key === 'trucThuoc');
    const tpl = [{ id: 'f_vi_tri', label: 'Vị trí' }];
    expect(resolveQuickSlotLabel(tpl, trucThuoc)).toBe('Trực thuộc');
  });

  it('label khác baselineLabels → coi là đã tuỳ chỉnh, dùng nhãn mới', () => {
    const trucThuoc = MAP_QUICK_SLOTS.find((s) => s.key === 'trucThuoc');
    const tpl = [{ id: 'f_vi_tri', label: 'Thuộc về' }];
    expect(resolveQuickSlotLabel(tpl, trucThuoc)).toBe('Thuộc về');
  });
});

describe('resolveQuickSlotLabels', () => {
  it('trả về map theo key với label + ariaLabel (nhãn baseline giữ nguyên defaultLabel)', () => {
    const tpl = [
      { id: 'f_loai_to_chuc', label: 'Loại tổ chức' }, // baseline → defaultLabel
      { id: 'f_status', label: 'Phẩm bậc võ học' }, // custom → override
    ];
    const map = resolveQuickSlotLabels(tpl, FORCE_QUICK_SLOTS);
    expect(map.loaiHinh.label).toBe('Loại hình');
    expect(map.capBac.label).toBe('Phẩm bậc võ học');
    expect(map.heCapBac.label).toBe('Hệ cấp bậc');
    expect(map.diaChi.ariaLabel).toBe('Địa chỉ thế lực');
  });

  it('ariaLabel fallback về label khi slot không định nghĩa ariaLabel', () => {
    const customSlots = [{ key: 'k1', fieldId: 'f_x', defaultLabel: 'Custom' }];
    const map = resolveQuickSlotLabels([], customSlots);
    expect(map.k1.ariaLabel).toBe('Custom');
  });
});

describe('resolveMainFormLabels (Pha 5)', () => {
  it('alias dùng WIKI_ALIAS_FIELD.label khi template không đổi', () => {
    const tpl = [{ id: WIKI_ALIAS_FIELD.id, label: WIKI_ALIAS_FIELD.label }];
    const out = resolveMainFormLabels(tpl, {});
    expect(out.alias.label).toBe(WIKI_ALIAS_FIELD.label);
    expect(out.alias.fieldId).toBe(WIKI_ALIAS_FIELD.id);
  });

  it('alias nhận nhãn tuỳ chỉnh khi template đổi khác baseline', () => {
    const tpl = [{ id: WIKI_ALIAS_FIELD.id, label: 'Tên gọi khác' }];
    const out = resolveMainFormLabels(tpl, {});
    expect(out.alias.label).toBe('Tên gọi khác');
  });

  it('statusLine map/force scope: baseline → giữ "Chuỗi hiển thị / dữ liệu auto"', () => {
    const tpl = [{ id: 'f_status', label: 'Cảnh giới' }];
    const out = resolveMainFormLabels(tpl, { isMapScope: true });
    expect(out.statusLine.label).toBe('Chuỗi hiển thị / dữ liệu auto');
  });

  it('statusLine map/force scope: label tuỳ chỉnh → dùng nhãn template', () => {
    const tpl = [{ id: 'f_status', label: 'Cảnh Tầng Địa Vực' }];
    const out = resolveMainFormLabels(tpl, { isForceScope: true });
    expect(out.statusLine.label).toBe('Cảnh Tầng Địa Vực');
  });

  it('statusLine scope thường: baseline → "Tóm tắt dưới tên"', () => {
    const tpl = [{ id: 'f_status', label: 'Phẩm cấp' }];
    const out = resolveMainFormLabels(tpl, {});
    expect(out.statusLine.label).toBe('Tóm tắt dưới tên');
  });

  it('statusLine scope thường: label tuỳ chỉnh → dùng nhãn template', () => {
    const tpl = [{ id: 'f_status', label: 'Trạng thái đặc biệt' }];
    const out = resolveMainFormLabels(tpl, {});
    expect(out.statusLine.label).toBe('Trạng thái đặc biệt');
  });

  it('MAIN_STATUS_BASELINE_LABELS gồm các nhãn engine mặc định phổ biến', () => {
    ['Cảnh giới', 'Cấp bậc', 'Phẩm cấp', 'Trạng thái'].forEach((label) => {
      expect(MAIN_STATUS_BASELINE_LABELS).toContain(label);
    });
  });

  it('MAIN_FORM_SLOTS.alias gắn đúng fieldId f_alias', () => {
    expect(MAIN_FORM_SLOTS.alias.fieldId).toBe(WIKI_ALIAS_FIELD.id);
  });
});
