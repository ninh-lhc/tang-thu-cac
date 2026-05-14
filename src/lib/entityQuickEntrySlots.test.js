import { describe, expect, it } from 'vitest';
import {
  pickDefaultQuickFieldIds,
  pickDefaultQuickFieldIdsForModalGrid,
  resolveEntityQuickSlots,
  fitEntityQuickEntrySlotsToTemplate,
  applyEntityQuickEntryToNho,
  filterAllowedQuickEntrySlotIds,
} from './entityQuickEntrySlots.js';

describe('entityQuickEntrySlots', () => {
  it('filterAllowedQuickEntrySlotIds chỉ bỏ f_alias', () => {
    expect(filterAllowedQuickEntrySlotIds(['f_status', 'f_title', 'f_alias', 'f_desc'])).toEqual([
      'f_status',
      'f_title',
      'f_desc',
    ]);
    expect(filterAllowedQuickEntrySlotIds(['f_alias'])).toEqual([]);
  });

  it('pickDefaultQuickFieldIds ưu tiên f_status / f_title / f_desc', () => {
    const ids = pickDefaultQuickFieldIds([
      { id: 'f_custom', label: 'X' },
      { id: 'f_status', label: 'S' },
      { id: 'f_title', label: 'T' },
    ]);
    expect(ids[0]).toBe('f_status');
    expect(ids[1]).toBe('f_title');
    expect(ids[2]).toBe('f_custom');
  });

  it('resolveEntityQuickSlots mặc định: 4 ô từ mẫu, không ăn f_status (có Ô phía dưới), vd. pháp bảo', () => {
    const r = resolveEntityQuickSlots({
      tabConfig: { label: 'Linh phù', fieldSuggestionLists: {} },
      fieldsTemplate: [
        { id: 'f_status', label: 'Phẩm cấp' },
        { id: 'f_title', label: 'Tên / Danh xưng' },
        { id: 'f_chu', label: 'Chủ nhân' },
        { id: 'f_linh_the', label: 'Linh thể' },
        { id: 'f_desc', label: 'Mô tả' },
        { id: 'f_alias', label: 'Wiki' },
      ],
      activeNovelData: { genres: ['Tiên Hiệp'] },
      parentTabId: 'x',
      parentLabel: 'y',
    });
    expect(r.slots).toHaveLength(4);
    expect(r.slotFields).toEqual(['f_title', 'f_desc', 'f_chu', 'f_linh_the']);
    expect(r.slotFields.every((id) => id !== 'f_status' && id !== 'f_alias')).toBe(true);
  });

  it('pickDefaultQuickFieldIdsForModalGrid bỏ f_status, ưu f_title, f_desc rồi cột còn lại theo mẫu', () => {
    const ids = pickDefaultQuickFieldIdsForModalGrid([
      { id: 'f_status', label: 'S' },
      { id: 'f_title', label: 'T' },
      { id: 'f_nguon', label: 'N' },
      { id: 'f_desc', label: 'D' },
    ]);
    expect(ids[0]).toBe('f_title');
    expect(ids[1]).toBe('f_desc');
    expect(ids[2]).toBe('f_nguon');
  });

  it('resolveEntityQuickSlots: đã có list mẫu thì không trộn seed thể loại', () => {
    const r = resolveEntityQuickSlots({
      tabConfig: {
        label: 'Thử nghiệm',
        fieldSuggestionLists: { f_title: ['Tùy chỉnh A'] },
        entityQuickEntry: {
          slotFields: ['f_status', 'f_title', 'f_desc'],
          slotLabels: ['', '', ''],
        },
      },
      fieldsTemplate: [
        { id: 'f_status', label: 'Trạng thái' },
        { id: 'f_title', label: 'Loại' },
        { id: 'f_desc', label: 'Mô tả' },
        { id: 'f_alias', label: 'Wiki' },
      ],
      activeNovelData: { genres: ['Tiên Hiệp'] },
      parentTabId: 'test-lon',
      parentLabel: 'Tab lớn',
    });
    expect(r.slots).toHaveLength(3);
    expect(r.dualFirstRow).toBe(false);
    expect(r.slots[0].fieldId).toBe('f_status');
    expect(r.slots[1].fieldId).toBe('f_title');
    expect(r.slots[1].suggestions).toEqual(['Tùy chỉnh A']);
    expect(r.slots[1].suggestions).not.toContain('Hệ phụ');
  });

  it('resolveEntityQuickSlots: f_desc có list mẫu thì preferMultilineQuickDesc false (UI gợi ý list)', () => {
    const r = resolveEntityQuickSlots({
      tabConfig: {
        label: 'Kẻ địch',
        fieldSuggestionLists: { f_desc: ['Phàm Trần Chi Cảnh', 'Siêu Phàm Truyền Kỳ'] },
        entityQuickEntry: { slotFields: ['f_desc'], slotLabels: ['Tai Ách Cảnh Giới'] },
      },
      fieldsTemplate: [{ id: 'f_desc', label: 'Mô tả' }],
      activeNovelData: { genres: ['Tiên Hiệp'] },
      parentTabId: 'x',
      parentLabel: 'y',
    });
    const d = r.slots.find((s) => s.fieldId === 'f_desc');
    expect(d?.suggestions).toEqual(['Phàm Trần Chi Cảnh', 'Siêu Phàm Truyền Kỳ']);
    expect(d?.preferMultilineQuickDesc).toBe(false);
  });

  it('resolveEntityQuickSlots: f_desc thủ công không list mẫu thì preferMultilineQuickDesc true', () => {
    const r = resolveEntityQuickSlots({
      tabConfig: {
        label: 'Tab',
        fieldSuggestionLists: {},
        entityQuickEntry: { slotFields: ['f_desc', 'f_title'], slotLabels: ['', ''] },
      },
      fieldsTemplate: [
        { id: 'f_desc', label: 'Mô tả' },
        { id: 'f_title', label: 'T' },
      ],
      activeNovelData: { genres: ['Tiên Hiệp'] },
      parentTabId: 'x',
      parentLabel: 'y',
    });
    expect(r.slots.find((s) => s.fieldId === 'f_desc')?.preferMultilineQuickDesc).toBe(true);
    expect(r.slots.find((s) => s.fieldId === 'f_title')?.preferMultilineQuickDesc).toBe(false);
  });

  it('resolveEntityQuickSlots: f_desc nguồn subTabLabel thì preferMultilineQuickDesc false', () => {
    const r = resolveEntityQuickSlots({
      tabConfig: {
        id: 'dao-cu',
        label: 'Đạo Cụ & Tiêu Hao',
        fieldSource: { f_desc: { kind: 'subTabLabel' } },
        entityQuickEntry: { slotFields: ['f_desc'], slotLabels: [''] },
      },
      fieldsTemplate: [{ id: 'f_desc', label: 'Mô tả' }],
      activeNovelData: { genres: ['Tiên Hiệp'] },
      parentTabId: 'vat-pham',
      parentLabel: 'Vật phẩm',
    });
    expect(r.slots[0].fieldId).toBe('f_desc');
    expect(r.slots[0].preferMultilineQuickDesc).toBe(false);
  });

  it('resolveEntityQuickSlots: f_status có list mẫu thì không ghép seed cảnh giới', () => {
    const r = resolveEntityQuickSlots({
      tabConfig: {
        label: 'Đạo Cụ',
        fieldSuggestionLists: {
          f_status: ['Bạch Sắc (Phổ thông)', 'Lục Sắc (Hi hữu)'],
        },
        entityQuickEntry: { slotFields: ['f_status', 'f_title'], slotLabels: ['', ''] },
      },
      fieldsTemplate: [
        { id: 'f_status', label: 'Phẩm cấp' },
        { id: 'f_title', label: 'Tên' },
        { id: 'f_desc', label: 'Mô tả' },
      ],
      activeNovelData: { genres: ['Tiên Hiệp'] },
      parentTabId: 'x',
      parentLabel: 'y',
    });
    const st = r.slots.find((s) => s.fieldId === 'f_status');
    expect(st?.suggestions).toEqual(['Bạch Sắc (Phổ thông)', 'Lục Sắc (Hi hữu)']);
    expect(st?.suggestions).not.toContain('Luyện Khí');
  });

  it('resolveEntityQuickSlots tôn trọng nguồn subTabLabel cho f_title', () => {
    const r = resolveEntityQuickSlots({
      tabConfig: {
        id: 'dao-cu',
        label: 'Đạo Cụ & Tiêu Hao',
        fieldSource: { f_title: { kind: 'subTabLabel' } },
        entityQuickEntry: { slotFields: ['f_title'], slotLabels: [''] },
      },
      fieldsTemplate: [{ id: 'f_title', label: 'Phân loại' }, { id: 'f_desc', label: 'Mô tả' }],
      activeNovelData: { genres: ['Tiên Hiệp'] },
      parentTabId: 'vat-pham',
      parentLabel: 'Vật phẩm',
    });
    expect(r.slots).toHaveLength(1);
    expect(r.slots[0].suggestions).toEqual(['Đạo Cụ & Tiêu Hao']);
    expect(r.slots[0].suggestions).not.toContain('Hệ phụ');
  });

  it('resolveEntityQuickSlots giữ f_status trong lưới khi user cấu hình', () => {
    const r = resolveEntityQuickSlots({
      tabConfig: {
        entityQuickEntry: {
          slotFields: ['f_status', 'f_title', 'f_desc', 'f_cap'],
          slotLabels: ['', '', '', ''],
        },
        fieldSuggestionLists: {},
        label: 'T',
      },
      fieldsTemplate: [
        { id: 'f_status', label: 'S' },
        { id: 'f_title', label: 'T' },
        { id: 'f_desc', label: 'D' },
        { id: 'f_cap', label: 'C' },
      ],
      activeNovelData: { genres: ['Tiên Hiệp'] },
      parentTabId: 'x',
      parentLabel: 'y',
    });
    expect(r.slots).toHaveLength(4);
    expect(r.slotFields).toEqual(['f_status', 'f_title', 'f_desc', 'f_cap']);
  });

  it('fitEntityQuickEntrySlotsToTemplate bỏ id không thuộc mẫu; giữ f_status khi có trong nguồn', () => {
    const { slotFields, slotLabels } = fitEntityQuickEntrySlotsToTemplate(
      ['f_status', 'f_unknown', 'f_title'],
      ['a', 'b', 'c'],
      [{ id: 'f_status' }, { id: 'f_title' }, { id: 'f_desc' }, { id: 'f_cap' }]
    );
    expect(slotFields).toEqual(['f_status', 'f_title', 'f_desc', 'f_cap']);
    expect(slotLabels[0]).toBe('a');
    expect(slotLabels[1]).toBe('c');
    expect(slotLabels[2]).toBe('');
    expect(slotLabels[3]).toBe('');
  });

  it('resolveEntityQuickSlots không ghép thêm ô mặc định khi user đã lưu ít hơn tối đa trường', () => {
    const r = resolveEntityQuickSlots({
      tabConfig: {
        label: 'Tài nguyên',
        fieldSuggestionLists: {},
        entityQuickEntry: {
          slotFields: ['f_nguon', 'f_cap'],
          slotLabels: ['', ''],
        },
      },
      fieldsTemplate: [
        { id: 'f_status', label: 'S' },
        { id: 'f_title', label: 'T' },
        { id: 'f_nguon', label: 'Nguồn' },
        { id: 'f_cap', label: 'Cấp' },
        { id: 'f_desc', label: 'Mô tả' },
      ],
      activeNovelData: { genres: ['Tiên Hiệp'] },
      parentTabId: 'x',
      parentLabel: 'y',
    });
    expect(r.slotFields).toEqual(['f_nguon', 'f_cap']);
    expect(r.slots).toHaveLength(2);
  });

  it('resolveEntityQuickSlots bật dualFirstRow khi tab cấu hình', () => {
    const r = resolveEntityQuickSlots({
      tabConfig: {
        entityQuickEntry: {
          slotFields: ['f_cap', 'f_status', 'f_desc'],
          slotLabels: ['Cấp bậc', 'Phẩm chất', ''],
          dualFirstRow: true,
        },
        fieldSuggestionLists: {},
      },
      fieldsTemplate: [
        { id: 'f_cap', label: 'Cấp' },
        { id: 'f_status', label: 'Phẩm' },
        { id: 'f_desc', label: 'Mô tả' },
      ],
      activeNovelData: { genres: ['Tiên Hiệp'] },
      parentTabId: 'x',
      parentLabel: 'y',
    });
    expect(r.dualFirstRow).toBe(true);
    expect(r.slotFields[0]).toBe('f_cap');
    expect(r.slotFields[1]).toBe('f_status');
    expect(r.slotFields[2]).toBe('f_desc');
  });

  it('applyEntityQuickEntryToNho chỉ sửa collection-track, cắt theo mẫu, merge tùy chọn', () => {
    const nho = {
      viewType: 'collection-track',
      fieldsTemplate: [
        { id: 'f_status' },
        { id: 'f_title' },
        { id: 'f_desc' },
      ],
      entityQuickEntry: { other: 1 },
    };
    const ok = applyEntityQuickEntryToNho(
      nho,
      ['f_status', 'f_unknown', 'f_title'],
      ['a', 'b', 'c'],
      { dualFirstRow: true, useSelectUi: true }
    );
    expect(ok).toBe(true);
    expect(nho.entityQuickEntry.other).toBe(1);
    expect(nho.entityQuickEntry.dualFirstRow).toBe(true);
    expect(nho.entityQuickEntry.useSelectUi).toBe(true);
    expect(nho.entityQuickEntry.slotFields).toEqual(['f_status', 'f_title', 'f_desc']);
  });

  it('applyEntityQuickEntryToNho bỏ qua khi không phải collection-track', () => {
    const nho = { viewType: 'milestone', entityQuickEntry: {} };
    expect(applyEntityQuickEntryToNho(nho, ['f_status'], ['x'])).toBe(false);
  });

  it('applyEntityQuickEntryToNho ưu tiên fieldsTemplateForFit khi truyền (khớp mẫu đã resolve)', () => {
    const nho = {
      viewType: 'collection-track',
      fieldsTemplate: [{ id: 'f_title' }],
      entityQuickEntry: {},
    };
    const resolvedWide = [
      { id: 'f_title' },
      { id: 'f_extra' },
      { id: 'f_desc' },
    ];
    applyEntityQuickEntryToNho(nho, ['f_extra', 'f_title'], ['nhãn extra', ''], {}, resolvedWide);
    expect(nho.entityQuickEntry.slotFields[0]).toBe('f_extra');
    expect(nho.entityQuickEntry.slotLabels[0]).toBe('nhãn extra');
  });
});
