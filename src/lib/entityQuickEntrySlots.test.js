import { describe, expect, it } from 'vitest';
import { pickDefaultQuickFieldIds, resolveEntityQuickSlots } from './entityQuickEntrySlots.js';

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

  it('resolveEntityQuickSlots merge gợi ý user + seed', () => {
    const r = resolveEntityQuickSlots({
      tabConfig: {
        label: 'Thử nghiệm',
        fieldSuggestionLists: { f_status: ['Tùy chỉnh A'] },
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
    expect(r.slots[0].suggestions).toContain('Tùy chỉnh A');
    expect(r.slots[0].suggestions.some((x) => /Luyện Khí|Kim Đan/.test(x))).toBe(true);
  });
});
