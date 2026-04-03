import { describe, expect, it } from 'vitest';
import { buildEntityLinkMap } from './buildEntityLinkMap.js';
import { buildEntityNameLookup, resolveEntityLookup } from './entityWikiLookup.js';

function createNovelWithDuplicateFamily() {
  return {
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

describe('entityWikiLookup', () => {
  it('keeps duplicate wiki names instead of collapsing to the first entity', () => {
    const entityMap = buildEntityLinkMap(createNovelWithDuplicateFamily());
    const lacGiaEntries = entityMap.filter((item) => item.name === 'Lac Gia');

    expect(lacGiaEntries).toHaveLength(2);
    expect(new Set(lacGiaEntries.map((item) => item.dest.entityId))).toEqual(
      new Set(['lac-gia-bang-thien', 'lac-gia-man-hoang'])
    );
  });

  it('prefers the duplicate whose context overlaps with the current entity', () => {
    const entityMap = buildEntityLinkMap(createNovelWithDuplicateFamily());
    const lookup = buildEntityNameLookup(entityMap);

    const resolved = resolveEntityLookup(lookup, 'Lac Gia', { selfEntityId: 'map-man-hoang' });

    expect(resolved?.dest?.entityId).toBe('lac-gia-man-hoang');
  });
});
