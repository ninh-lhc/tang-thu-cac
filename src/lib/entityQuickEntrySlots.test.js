import { describe, expect, it } from 'vitest';
import { pickDefaultQuickFieldIds, pickDefaultQuickFieldIdsForModalGrid, resolveEntityQuickSlots, fitEntityQuickEntrySlotsToTemplate, applyEntityQuickEntryToNho } from './entityQuickEntrySlots.js';

describe('entityQuickEntrySlots', () => {
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

  it('resolveEntityQuickSlots merge gợi ý user + seed', () => {
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
    expect(r.slots).toHaveLength(2);
    expect(r.dualFirstRow).toBe(false);
    expect(r.slots[0].fieldId).toBe('f_title');
    expect(r.slots[0].suggestions).toContain('Tùy chỉnh A');
  });

  it('resolveEntityQuickSlots bỏ f_status khỏi quick grid và giữ tối đa cột còn lại', () => {
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
    expect(r.slots).toHaveLength(3);
    expect(r.slotFields).toEqual(['f_title', 'f_desc', 'f_cap']);
  });

  it('fitEntityQuickEntrySlotsToTemplate bỏ id không thuộc mẫu và bỏ f_status khỏi quick grid', () => {
    const { slotFields, slotLabels } = fitEntityQuickEntrySlotsToTemplate(
      ['f_status', 'f_unknown', 'f_title'],
      ['a', 'b', 'c'],
      [{ id: 'f_status' }, { id: 'f_title' }, { id: 'f_desc' }, { id: 'f_cap' }]
    );
    expect(slotFields).toEqual(['f_title', 'f_desc', 'f_cap']);
    expect(slotLabels[0]).toBe('c');
    expect(slotLabels[1]).toBe('');
    expect(slotLabels[2]).toBe('');
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
    expect(r.slotFields[1]).toBe('f_desc');
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
    expect(nho.entityQuickEntry.slotFields).toEqual(['f_title', 'f_desc']);
  });

  it('applyEntityQuickEntryToNho bỏ qua khi không phải collection-track', () => {
    const nho = { viewType: 'milestone', entityQuickEntry: {} };
    expect(applyEntityQuickEntryToNho(nho, ['f_status'], ['x'])).toBe(false);
  });
});
