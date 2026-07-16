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

  it('keeps case-sensitive wiki concepts separate when the text casing changes meaning', () => {
    const lookup = buildEntityNameLookup([
      {
        name: 'He Thong',
        dest: { entityId: 'ba-chu-he-thong' },
      },
      {
        name: 'he thong',
        dest: { entityId: 'he-thong-khai-niem' },
      },
    ]);

    expect(resolveEntityLookup(lookup, 'He Thong')?.dest?.entityId).toBe('ba-chu-he-thong');
    expect(resolveEntityLookup(lookup, 'he thong')?.dest?.entityId).toBe('he-thong-khai-niem');
    expect(resolveEntityLookup(lookup, 'He thong')?.dest?.entityId).toBe('he-thong-khai-niem');
  });

  it('does not fall back to a title-case proper noun when lowercase text is only a generic mention', () => {
    const lookup = buildEntityNameLookup([
      {
        name: 'He Thong',
        dest: { entityId: 'ba-chu-he-thong' },
      },
    ]);

    expect(resolveEntityLookup(lookup, 'he thong')).toBeNull();
    expect(resolveEntityLookup(lookup, 'He thong')).toBeNull();
  });

  it('does not resolve a lowercase wiki label to a title-cased entity name', () => {
    const lookup = buildEntityNameLookup([{ name: 'Do Kiep', dest: { entityId: 'realm-do-kiep' } }]);

    expect(resolveEntityLookup(lookup, 'do kiep')).toBe(null);
    expect(resolveEntityLookup(lookup, 'Do Kiep')?.dest?.entityId).toBe('realm-do-kiep');
  });

  it('prefers the stricter case-matching candidate when names differ only by casing', () => {
    const lookup = buildEntityNameLookup([
      { name: 'do kiep', dest: { entityId: 'process-do-kiep' } },
      { name: 'Do Kiep', dest: { entityId: 'realm-do-kiep' } },
    ]);

    expect(resolveEntityLookup(lookup, 'do kiep')?.dest?.entityId).toBe('process-do-kiep');
    expect(resolveEntityLookup(lookup, 'Do Kiep')?.dest?.entityId).toBe('realm-do-kiep');
  });

  it('resolves an entity own alias surfaces back to itself even when a duplicate lowercase card exists', () => {
    const lookup = buildEntityNameLookup([
      { name: 'Bạch Ngân', dest: { entityId: 'bach-ngan-chinh' } },
      { name: 'Bạch ngân', dest: { entityId: 'bach-ngan-chinh' } },
      { name: 'bạch ngân', dest: { entityId: 'bach-ngan-chinh' } },
      { name: 'bạch ngân', dest: { entityId: 'tien-te-bach-ngan' } },
    ]);

    const opts = { selfEntityId: 'bach-ngan-chinh' };
    expect(resolveEntityLookup(lookup, 'Bạch Ngân', opts)?.dest?.entityId).toBe('bach-ngan-chinh');
    expect(resolveEntityLookup(lookup, 'Bạch ngân', opts)?.dest?.entityId).toBe('bach-ngan-chinh');
    expect(resolveEntityLookup(lookup, 'bạch ngân', opts)?.dest?.entityId).toBe('bach-ngan-chinh');
  });

  it('resolves an entity own lowercase alias to itself when there is no duplicate', () => {
    const lookup = buildEntityNameLookup([
      { name: 'Bạch Ngân', dest: { entityId: 'bach-ngan-chinh' } },
      { name: 'bạch ngân', dest: { entityId: 'bach-ngan-chinh' } },
    ]);

    expect(
      resolveEntityLookup(lookup, 'bạch ngân', { selfEntityId: 'bach-ngan-chinh' })?.dest?.entityId
    ).toBe('bach-ngan-chinh');
  });

  it('drops orphan data buckets not present in tabsConfig (no ghost wiki names)', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'he-thong-tu-luyen',
          label: 'He thong',
          subTabs: [{ id: 'system-sub', label: 'System', viewType: 'collection-track' }],
        },
      ],
      data: {
        'he-thong-tu-luyen': {
          'system-sub': { entities: [{ id: 'keep', name: 'Luyen Khi' }] },
          'tab-da-xoa': { entities: [{ id: 'ghost', name: 'Ma Anh Bo Phap' }] },
        },
      },
    };
    const entityMap = buildEntityLinkMap(novel);
    expect(entityMap.some((x) => x.dest?.entityId === 'ghost')).toBe(false);
    expect(entityMap.some((x) => x.dest?.entityId === 'keep')).toBe(true);
  });

  it('indexes embedded member profiles as wiki targets under their parent card', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'the-luc',
          label: 'The Luc',
          subTabs: [{ id: 'ke-thu', label: 'Ke Thu', viewType: 'collection-track' }],
        },
      ],
      data: {
        'the-luc': {
          'ke-thu': {
            entities: [
              {
                id: 'tan-gia',
                name: 'Tan Gia',
                members: [
                  {
                    id: 'mem-tan-hao',
                    name: 'Tan Hao',
                    alias: 'Tan thieu chu',
                    role: 'Thieu chu',
                  },
                ],
              },
            ],
          },
        },
      },
    };
    const entityMap = buildEntityLinkMap(novel);
    const lookup = buildEntityNameLookup(entityMap);

    const byName = resolveEntityLookup(lookup, 'Tan Hao');
    const byAlias = resolveEntityLookup(lookup, 'Tan thieu chu');
    const parent = resolveEntityLookup(lookup, 'Tan Gia');

    expect(parent?.dest).toEqual({ lonId: 'the-luc', nhoId: 'ke-thu', entityId: 'tan-gia' });
    expect(byName?.dest).toEqual({
      lonId: 'the-luc',
      nhoId: 'ke-thu',
      entityId: 'tan-gia',
      memberId: 'mem-tan-hao',
    });
    expect(byAlias?.dest?.memberId).toBe('mem-tan-hao');
  });

  it('resolves member alias with drifted later-token casing to the same child profile', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'ban-do',
          label: 'Ban Do',
          subTabs: [{ id: 'ha-gioi', label: 'Ha Gioi', viewType: 'collection-track' }],
        },
      ],
      data: {
        'ban-do': {
          'ha-gioi': {
            entities: [
              {
                id: 'khanh-thanh',
                name: 'Khanh Thanh',
                members: [
                  {
                    id: 'mem-loi-duong',
                    name: 'Lôi Đường',
                    alias: 'Lôi Gia',
                    role: 'Ngu Dai The Luc',
                  },
                ],
              },
            ],
          },
        },
      },
    };
    const lookup = buildEntityNameLookup(buildEntityLinkMap(novel));

    expect(resolveEntityLookup(lookup, 'Lôi Đường')?.dest?.memberId).toBe('mem-loi-duong');
    expect(resolveEntityLookup(lookup, 'Lôi Gia')?.dest?.memberId).toBe('mem-loi-duong');
    expect(resolveEntityLookup(lookup, 'Lôi gia')?.dest?.memberId).toBe('mem-loi-duong');
    // Viết thường hết vẫn không khớp — tránh bọc nhầm cụm thường ngữ.
    expect(resolveEntityLookup(lookup, 'lôi gia')).toBeNull();
  });

  it('still refuses title-case entity fallback for mixed-case generic mentions', () => {
    const lookup = buildEntityNameLookup([
      { name: 'He Thong', dest: { entityId: 'ba-chu-he-thong' } },
    ]);
    expect(resolveEntityLookup(lookup, 'He thong')).toBeNull();
    expect(resolveEntityLookup(lookup, 'he thong')).toBeNull();
  });
});
