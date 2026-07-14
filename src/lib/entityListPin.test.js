import { describe, expect, it } from 'vitest';
import {
  ENTITY_LIST_PIN_MAX,
  countEntityListPins,
  isEntityListPinned,
  pinEntityInList,
  toggleEntityListPin,
  unpinEntityInList,
} from './entityListPin.js';
import { applyEntityCollectionFilters, buildEntitySearchIndexMap } from './entityCollectionQuery.js';

function ent(id, name, extra = {}) {
  return { id, name, milestones: [], dynamicData: {}, ...extra };
}

describe('entityListPin', () => {
  it('pins and unpins without using pin order for display ranks', () => {
    const list = [ent('a', 'A'), ent('b', 'B'), ent('c', 'C')];
    expect(pinEntityInList(list, 'b').ok).toBe(true);
    expect(pinEntityInList(list, 'a').ok).toBe(true);
    expect(isEntityListPinned(list[1])).toBe(true);
    expect(countEntityListPins(list)).toBe(2);
    expect(unpinEntityInList(list, 'b').ok).toBe(true);
    expect(isEntityListPinned(list.find((e) => e.id === 'a'))).toBe(true);
  });

  it('does not pin catalog list cards', () => {
    const list = [ent('ls', 'Danh sách Tiểu Mục 1')];
    expect(pinEntityInList(list, 'ls')).toEqual({ ok: false, reason: 'list-card', rank: 0 });
  });

  it(`rejects more than ${ENTITY_LIST_PIN_MAX} user pins`, () => {
    const list = Array.from({ length: ENTITY_LIST_PIN_MAX + 1 }, (_, i) => ent(`e${i}`, `N${i}`));
    for (let i = 0; i < ENTITY_LIST_PIN_MAX; i += 1) {
      expect(pinEntityInList(list, `e${i}`).ok).toBe(true);
    }
    expect(pinEntityInList(list, `e${ENTITY_LIST_PIN_MAX}`)).toEqual({
      ok: false,
      reason: 'limit',
      rank: 0,
    });
  });

  it('toggle switches pin state', () => {
    const list = [ent('a', 'A')];
    expect(toggleEntityListPin(list, 'a').pinned).toBe(true);
    expect(toggleEntityListPin(list, 'a').pinned).toBe(false);
  });

  it('keeps list-card first, then pinned by name A→Z', () => {
    const pinnedLate = ent('p2', 'Zebra', { listPinRank: 1 });
    const pinnedEarly = ent('p1', 'Beta', { listPinRank: 2 });
    const listCard = ent('ls', 'Danh sách');
    const normal = ent('n', 'Alpha');
    const index = buildEntitySearchIndexMap([normal, listCard, pinnedLate, pinnedEarly]);
    const out = applyEntityCollectionFilters([normal, listCard, pinnedLate, pinnedEarly], {
      entityFilterField: 'none',
      entityFilterValue: '',
      entitySearchQuery: '',
      entitySearchIndexById: index,
      entitySortMode: 'name_asc',
    });
    expect(out.map((x) => x.id)).toEqual(['ls', 'p1', 'p2', 'n']);
  });
});
