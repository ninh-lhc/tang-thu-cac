import { describe, expect, it } from 'vitest';
import { resolveTabsConfigForGenreSelection } from './resolveTabsConfigForGenreSelection.js';

describe('resolveTabsConfigForGenreSelection', () => {
  it('ưu tiên tabsConfig đã gán trên form', () => {
    const explicit = [{ id: 'custom-lon', label: 'Custom', subTabs: [], isFixed: true }];
    expect(resolveTabsConfigForGenreSelection(['Tiên Hiệp'], explicit)).toBe(explicit);
  });

  it('gộp mục lục theo thể loại khi chưa có tabs trên form', () => {
    const out = resolveTabsConfigForGenreSelection(['Tiên Hiệp', 'Hệ Thống'], undefined);
    expect(Array.isArray(out)).toBe(true);
    expect(out.length).toBeGreaterThan(1);
    expect(out.some((t) => t.id === 'tong-quan')).toBe(true);
  });

  it('trả null khi không thể suy ra (không genre, không explicit)', () => {
    expect(resolveTabsConfigForGenreSelection([], null)).toBeNull();
    expect(resolveTabsConfigForGenreSelection([], [])).toBeNull();
  });
});
