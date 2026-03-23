import { describe, it, expect } from 'vitest';
import { buildCommandPaletteFiltered } from './locLenhNhanhCommandPalette.js';

const safeString = (v) => (v == null ? '' : String(v));

describe('buildCommandPaletteFiltered', () => {
  it('luôn có lệnh cài đặt và deep search', () => {
    const r = buildCommandPaletteFiltered('', [], null, safeString);
    expect(r.actions.some((a) => a.id === 'set')).toBe(true);
    expect(r.actions.some((a) => a.id === 'deep')).toBe(true);
  });
});
