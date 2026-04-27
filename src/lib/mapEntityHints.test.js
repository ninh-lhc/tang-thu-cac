import { describe, expect, it } from 'vitest';
import { collectMapEntityHints } from './mapEntityHints.js';

const mapLon = {
  id: 'ban-do',
  label: 'Bản đồ',
  subTabs: [
    { id: 'ha-gioi', label: 'Hạ Giới' },
    { id: 'tien-gioi', label: 'Thiên Giới' },
  ],
};

function makeNovel(entitiesByNho) {
  const data = { 'ban-do': {} };
  for (const [nhoId, rows] of Object.entries(entitiesByNho)) {
    data['ban-do'][nhoId] = { entities: rows };
  }
  return { tabsConfig: [mapLon], data };
}

describe('collectMapEntityHints', () => {
  it('scopes map names to the current map sub tab when mapNhoScopeId is set', () => {
    const novel = makeNovel({
      'ha-gioi': [{ name: 'Trong Hạ', dynamicData: {} }],
      'tien-gioi': [{ name: 'Ngoài Tiên', dynamicData: {} }],
    });
    const r = collectMapEntityHints(novel, null, 'ban-do', 'ha-gioi');
    expect(r.mapNames).toEqual(['Trong Hạ']);
    expect(r.recordsByName.has('trong ha')).toBe(true);
    expect(r.recordsByName.has('ngoai tien')).toBe(false);
  });

  it('drops f_vi_tri path tokens that are not a real entity name in the same scope', () => {
    const novel = makeNovel({
      'ha-gioi': [
        {
          name: 'A',
          dynamicData: { f_vi_tri: 'B - Tây Châu' },
        },
        { name: 'B', dynamicData: { f_he_gioi_ban_do: 'Tinh cầu' } },
      ],
    });
    const r = collectMapEntityHints(novel, null, 'ban-do', 'ha-gioi');
    expect(r.mapNames.sort()).toEqual(['A', 'B'].sort());
    expect(r.parentTier1Options).toContain('B');
    expect(r.parentTier2Options).not.toContain('Tây Châu');
  });

  it('suggests parent tier1/tier2 names by f_he «Quy mô địa vực» (Tinh cầu / Đại lục / Thành)', () => {
    const novel = makeNovel({
      'ha-gioi': [
        { name: 'Việt Long', dynamicData: { f_he_gioi_ban_do: 'Tinh cầu' } },
        { name: 'Băng Lục', dynamicData: { f_he_gioi_ban_do: 'Đại lục' } },
        { name: 'Thiên Thành', dynamicData: { f_he_gioi_ban_do: 'Thành Trì' } },
      ],
    });
    const r = collectMapEntityHints(novel, null, 'ban-do', 'ha-gioi');
    expect(r.mapNamesTrucParent1).toContain('Việt Long');
    expect(r.mapNamesTrucParent1).not.toContain('Băng Lục');
    expect(r.mapNamesTrucParent2).toContain('Băng Lục');
    expect(r.mapNamesTrucParent2).not.toContain('Việt Long');
    expect(r.mapNamesTrucParent3).toContain('Thiên Thành');
  });

  it('infers quy mô from name when f_he / f_title empty (e.g. … Đại Lục)', () => {
    const novel = makeNovel({
      'ha-gioi': [{ name: 'Phía Tây Đại Lục', dynamicData: {} }],
    });
    const r = collectMapEntityHints(novel, null, 'ban-do', 'ha-gioi');
    expect(r.mapNamesTrucParent2).toContain('Phía Tây Đại Lục');
    expect(r.mapNamesTrucParent1).not.toContain('Phía Tây Đại Lục');
  });
});
