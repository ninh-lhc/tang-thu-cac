import { describe, expect, it } from 'vitest';
import { reconcileRetiredWikiAliases } from './retiredWikiAliases.js';
import { buildEntityLinkMap } from './buildEntityLinkMap.js';
import { buildEntityNameLookup, resolveEntityLookup } from './entityWikiLookup.js';

describe('retired wiki aliases', () => {
  it('retires removed aliases and keeps the aliases that remain active out', () => {
    expect(reconcileRetiredWikiAliases('Thần Đạo, Tiên Đạo', 'Tiên Đạo')).toEqual(['Thần Đạo']);
  });

  it('reactivates an alias when it is added again', () => {
    expect(reconcileRetiredWikiAliases('', 'Thần Đạo', ['Thần Đạo'])).toEqual([]);
  });

  it('leaves an old alias unresolved instead of fuzzy-linking it back to the original card', () => {
    const novel = {
      tabsConfig: [{ id: 'dao', subTabs: [{ id: 'tong', viewType: 'collection-track' }] }],
      data: {
        dao: {
          tong: {
            entities: [{
              id: 'e1',
              name: 'Thần Đạo Tông',
              dynamicData: { f_alias: '' },
              wikiRetiredAliases: ['Thần Đạo'],
            }],
          },
        },
      },
    };
    const lookup = buildEntityNameLookup(buildEntityLinkMap(novel));
    expect(resolveEntityLookup(lookup, 'Thần Đạo')).toBeNull();
    expect(resolveEntityLookup(lookup, 'Thần Đạo Tông')?.dest?.entityId).toBe('e1');
  });

  it('lets a different card claim an exact name that was retired elsewhere', () => {
    const map = [
      { name: 'Thần Đạo', entityId: 'old', dest: { entityId: 'old' }, retired: true },
      { name: 'Thần Đạo', entityId: 'new', dest: { entityId: 'new' } },
    ];
    expect(resolveEntityLookup(buildEntityNameLookup(map), 'Thần Đạo')?.dest?.entityId).toBe('new');
  });
});
