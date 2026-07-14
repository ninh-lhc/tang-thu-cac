import { describe, expect, it } from 'vitest';
import {
  applyMapMove,
  areMapSiblings,
  buildMapBreadcrumb,
  buildMapForest,
  canMoveMapNode,
  compareMapEntityNames,
  detachMapChildrenOnDelete,
  filterEntitiesByMapBranch,
  filterMapTreeRootsOnly,
  getDirectMapChildren,
  getMapBranchRoot,
  getSubtreeIds,
  inferMapParentIdsFromViTri,
  readMapParentId,
  setMapParentId,
  sortMapEntitiesByName,
  tabHasEntityTreeLinks,
} from './mapEntityTree.js';

function ent(id, name, mapParentId = null, extra = {}) {
  return {
    id,
    name,
    mapParentId: mapParentId || undefined,
    dynamicData: {},
    ...extra,
  };
}

describe('mapEntityTree', () => {
  it('reads and clears mapParentId', () => {
    const e = ent('a', 'A', 'b');
    expect(readMapParentId(e)).toBe('b');
    setMapParentId(e, null);
    expect(readMapParentId(e)).toBe(null);
    expect(e.mapParentId).toBeUndefined();
  });

  it('builds forest with children and roots', () => {
    const entities = [
      ent('dai-tan', 'Dai Tan'),
      ent('kinh-chau', 'Kinh Chau', 'dai-tan'),
      ent('ham-duong', 'Ham Duong', 'kinh-chau'),
      ent('loose', 'Loose'),
    ];
    const forest = buildMapForest(entities);
    expect(forest.roots.map((e) => e.id).sort()).toEqual(['dai-tan', 'loose']);
    expect(getDirectMapChildren(entities, 'dai-tan').map((e) => e.id)).toEqual(['kinh-chau']);
    expect(getDirectMapChildren(entities, 'kinh-chau').map((e) => e.id)).toEqual(['ham-duong']);
  });

  it('blocks self and cycle moves', () => {
    const entities = [
      ent('a', 'A'),
      ent('b', 'B', 'a'),
      ent('c', 'C', 'b'),
    ];
    expect(canMoveMapNode(entities, 'a', 'a').ok).toBe(false);
    expect(canMoveMapNode(entities, 'a', 'c').ok).toBe(false);
    expect(canMoveMapNode(entities, 'c', 'a').ok).toBe(true);
  });

  it('applies move and syncs f_vi_tri', () => {
    const entities = [
      ent('a', 'A'),
      ent('b', 'B'),
      ent('c', 'C', 'a'),
    ];
    const result = applyMapMove(entities, 'c', 'b');
    expect(result.ok).toBe(true);
    expect(readMapParentId(entities[2])).toBe('b');
    expect(entities[2].dynamicData.f_vi_tri).toBe('B');
  });

  it('detaches children when parent deleted', () => {
    const entities = [
      ent('a', 'A'),
      ent('b', 'B', 'a'),
      ent('c', 'C', 'a'),
    ];
    expect(detachMapChildrenOnDelete(entities, 'a')).toBe(2);
    expect(readMapParentId(entities[1])).toBe(null);
    expect(readMapParentId(entities[2])).toBe(null);
  });

  it('collects subtree ids and filters branch', () => {
    const entities = [
      ent('root', 'Root'),
      ent('mid', 'Mid', 'root'),
      ent('leaf', 'Leaf', 'mid'),
      ent('other', 'Other'),
    ];
    expect([...getSubtreeIds(entities, 'root')].sort()).toEqual(['leaf', 'mid', 'root']);
    expect(filterEntitiesByMapBranch(entities, 'mid').map((e) => e.id).sort()).toEqual(['leaf', 'mid']);
  });

  it('infers mapParentId from f_vi_tri once', () => {
    const entities = [
      ent('dai-tan', 'Dai Tan'),
      {
        id: 'kinh',
        name: 'Kinh Chau',
        dynamicData: { f_vi_tri: 'Dai Tan' },
      },
    ];
    expect(inferMapParentIdsFromViTri(entities)).toBe(1);
    expect(readMapParentId(entities[1])).toBe('dai-tan');
    expect(inferMapParentIdsFromViTri(entities)).toBe(0);
  });

  it('builds breadcrumb from root to node', () => {
    const entities = [
      ent('a', 'A'),
      ent('b', 'B', 'a'),
      ent('c', 'C', 'b'),
    ];
    expect(buildMapBreadcrumb(entities, 'c').map((e) => e.name)).toEqual(['A', 'B', 'C']);
    expect(buildMapBreadcrumb(entities, 'c', { includeSelf: false }).map((e) => e.name)).toEqual(['A', 'B']);
  });

  it('resolves branch root from a deep child', () => {
    const entities = [
      ent('a', 'A'),
      ent('b', 'B', 'a'),
      ent('c', 'C', 'b'),
      ent('other', 'Other'),
    ];
    expect(getMapBranchRoot(entities, 'c')?.id).toBe('a');
    expect(getMapBranchRoot(entities, 'a')?.id).toBe('a');
    expect(getMapBranchRoot(entities, 'missing')).toBe(null);
  });

  it('sorts same-level children by Vietnamese name stably', () => {
    const entities = [
      ent('p', 'Parent'),
      ent('k', 'Khánh Thành', 'p'),
      ent('b', 'Bắc Châu Cửu Quận', 'p'),
      ent('l', 'Lĩnh Nam', 'p'),
    ];
    expect(getDirectMapChildren(entities, 'p').map((e) => e.name)).toEqual([
      'Bắc Châu Cửu Quận',
      'Khánh Thành',
      'Lĩnh Nam',
    ]);
    expect(sortMapEntitiesByName(entities.filter((e) => e.id !== 'p')).map((e) => e.name)).toEqual([
      'Bắc Châu Cửu Quận',
      'Khánh Thành',
      'Lĩnh Nam',
    ]);
    // Cùng tên → tie-break theo id để thứ tự ổn định khi chọn thẻ.
    expect(compareMapEntityNames(ent('1', 'Khánh'), ent('2', 'Khánh'))).toBe(
      '1'.localeCompare('2', 'en')
    );
  });

  it('detects siblings that share the same parent', () => {
    const entities = [
      ent('p', 'Parent'),
      ent('a', 'A', 'p'),
      ent('b', 'B', 'p'),
      ent('c', 'C'),
    ];
    expect(areMapSiblings(entities, 'a', 'b')).toBe(true);
    expect(areMapSiblings(entities, 'a', 'c')).toBe(false);
    expect(areMapSiblings(entities, 'a', 'a')).toBe(false);
  });

  it('detects when a tab already uses tree parent links', () => {
    expect(tabHasEntityTreeLinks([ent('a', 'A'), ent('b', 'B', 'a')])).toBe(true);
    expect(tabHasEntityTreeLinks([ent('a', 'A'), ent('b', 'B')])).toBe(false);
    expect(tabHasEntityTreeLinks([])).toBe(false);
  });

  it('filters to roots only when listing without a branch focus', () => {
    const entities = [
      ent('root', 'Root'),
      ent('mid', 'Mid', 'root'),
      ent('leaf', 'Leaf', 'mid'),
      ent('other', 'Other'),
    ];
    expect(filterMapTreeRootsOnly(entities).map((e) => e.id).sort()).toEqual(['other', 'root']);
  });
});
