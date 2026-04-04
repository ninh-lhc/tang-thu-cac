import { describe, expect, it } from 'vitest';
import { buildEntityLinkMap } from './buildEntityLinkMap.js';
import { buildEntityNameLookup, resolveEntityLookup } from './entityWikiLookup.js';

function createNovelWithDuplicateFamily() {
  return {
    tabsConfig: [
      {
        id: 'tai-nguyen',
        label: 'Tai Nguyen',
        subTabs: [{ id: 'dia-danh', label: 'Dia Danh', viewType: 'collection-track' }],
      },
      {
        id: 'the-luc',
        label: 'The Luc',
        subTabs: [{ id: 'gia-toc', label: 'Gia Toc', viewType: 'collection-track' }],
      },
    ],
    data: {
      'tai-nguyen': {
        'dia-danh': {
          entities: [
            {
              id: 'map-man-hoang',
              name: 'Man Hoang Dai Luc',
              dynamicData: { f_vi_tri: 'Viet Long Tinh Cau' },
            },
          ],
        },
      },
      'the-luc': {
        'gia-toc': {
          entities: [
            {
              id: 'lac-gia-bang-thien',
              name: 'Lac Gia',
              dynamicData: { f_status: 'Gia Toc - Bat Cap The Luc - Bang Thien Dai Luc - Viet Long Tinh Cau' },
            },
            {
              id: 'lac-gia-man-hoang',
              name: 'Lac Gia',
              dynamicData: { f_status: 'Gia Toc - Bat Cap The Luc - Man Hoang Dai Luc - Viet Long Tinh Cau' },
            },
          ],
        },
      },
    },
  };
}

function createNovelWithRealmCards() {
  return {
    tabsConfig: [
      {
        id: 'tu-luyen',
        label: 'Tu Luyen',
        subTabs: [{ id: 'canh-gioi-tu-vi', label: 'Canh Gioi Tu Vi', viewType: 'collection-track' }],
      },
    ],
    data: {
      'tu-luyen': {
        'canh-gioi-tu-vi': {
          entities: [
            {
              id: 'realm-luyen-hu',
              name: 'Luyen Hu',
              dynamicData: {},
            },
          ],
        },
      },
    },
  };
}

describe('entityWikiLookup', () => {
  it('keeps duplicate wiki names instead of collapsing to the first entity', () => {
    const entityMap = buildEntityLinkMap(createNovelWithDuplicateFamily());
    const lacGiaEntries = entityMap.filter((item) => item.name === 'Lac Gia');
    const syntheticEntries = entityMap.filter((item) => item.name === 'Lac Gia - Man Hoang Dai Luc');

    expect(lacGiaEntries).toHaveLength(2);
    expect(syntheticEntries).toHaveLength(1);
    expect(syntheticEntries[0]?.dest?.entityId).toBe('lac-gia-man-hoang');
    expect(new Set(lacGiaEntries.map((item) => item.dest.entityId))).toEqual(
      new Set(['lac-gia-bang-thien', 'lac-gia-man-hoang'])
    );
  });

  it('prefers the duplicate whose context overlaps with the current entity', () => {
    const entityMap = buildEntityLinkMap(createNovelWithDuplicateFamily());
    const lookup = buildEntityNameLookup(entityMap);

    const resolved = resolveEntityLookup(lookup, 'Lac Gia', { selfEntityId: 'map-man-hoang' });
    const resolvedSynthetic = resolveEntityLookup(lookup, 'Lac Gia - Man Hoang Dai Luc', {
      selfEntityId: 'map-man-hoang',
    });

    expect(resolved?.dest?.entityId).toBe('lac-gia-man-hoang');
    expect(resolvedSynthetic?.dest?.entityId).toBe('lac-gia-man-hoang');
  });

  it('resolves realm tier variants to the base realm card', () => {
    const entityMap = buildEntityLinkMap(createNovelWithRealmCards());
    const lookup = buildEntityNameLookup(entityMap);

    const mappedVariants = entityMap.filter(
      (item) => item.dest?.entityId === 'realm-luyen-hu' && String(item.name || '').startsWith('Luyen Hu ')
    );
    const resolvedTier = resolveEntityLookup(lookup, 'Luyen Hu Vien Man');
    const resolvedMid = resolveEntityLookup(lookup, 'Luyen Hu Hau Ky');

    expect(mappedVariants.length).toBeGreaterThan(0);
    expect(resolvedTier?.dest?.entityId).toBe('realm-luyen-hu');
    expect(resolvedMid?.dest?.entityId).toBe('realm-luyen-hu');
  });
});
