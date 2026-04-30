import { describe, expect, it } from 'vitest';
import {
  MAP_FIELD_PRESET_FLAVOR,
  getMapHierarchySeedLabels,
  getMapTypeSeedPresets,
  resolveMapFieldPresetFlavor,
} from './mapEntityFieldPresets.js';

describe('mapEntityFieldPresets', () => {
  it('ưu tiên Đô Thị để không rơi preset Tiên Hiệp', () => {
    expect(resolveMapFieldPresetFlavor(['Hệ Thống', 'Đô Thị'])).toBe(MAP_FIELD_PRESET_FLAVOR.URBAN);
    expect(getMapTypeSeedPresets(MAP_FIELD_PRESET_FLAVOR.URBAN)).toEqual([]);
    expect(getMapHierarchySeedLabels(MAP_FIELD_PRESET_FLAVOR.URBAN)).toEqual([]);
  });

  it('Tiên Hiệp / Huyền Huyễn giữ bộ tu tiên', () => {
    expect(resolveMapFieldPresetFlavor(['Tiên Hiệp'])).toBe(MAP_FIELD_PRESET_FLAVOR.CULTIVATION);
    expect(getMapTypeSeedPresets(MAP_FIELD_PRESET_FLAVOR.CULTIVATION)).toEqual([]);
    expect(getMapHierarchySeedLabels(MAP_FIELD_PRESET_FLAVOR.CULTIVATION)).toEqual([]);
  });

  it('Đô Thị + Tiên Hiệp: ưu tiên Đô Thị (truyện lai đô thị)', () => {
    expect(resolveMapFieldPresetFlavor(['Tiên Hiệp', 'Đô Thị'])).toBe(MAP_FIELD_PRESET_FLAVOR.URBAN);
  });
});
