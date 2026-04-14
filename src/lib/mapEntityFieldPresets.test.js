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
    expect(getMapTypeSeedPresets(MAP_FIELD_PRESET_FLAVOR.URBAN)).toContain('Thành phố');
    expect(getMapTypeSeedPresets(MAP_FIELD_PRESET_FLAVOR.URBAN)).not.toContain('Tiên tinh');
    expect(getMapHierarchySeedLabels(MAP_FIELD_PRESET_FLAVOR.URBAN)).toContain('Cấp thành phố');
    expect(getMapHierarchySeedLabels(MAP_FIELD_PRESET_FLAVOR.URBAN)).not.toContain('Vương giới');
  });

  it('Tiên Hiệp / Huyền Huyễn giữ bộ tu tiên', () => {
    expect(resolveMapFieldPresetFlavor(['Tiên Hiệp'])).toBe(MAP_FIELD_PRESET_FLAVOR.CULTIVATION);
    expect(getMapTypeSeedPresets(MAP_FIELD_PRESET_FLAVOR.CULTIVATION)).toContain('Tiên tinh');
  });

  it('Đô Thị + Tiên Hiệp: ưu tiên Đô Thị (truyện lai đô thị)', () => {
    expect(resolveMapFieldPresetFlavor(['Tiên Hiệp', 'Đô Thị'])).toBe(MAP_FIELD_PRESET_FLAVOR.URBAN);
  });
});
