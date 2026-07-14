import { describe, expect, it } from 'vitest';
import {
  applyMemberMove,
  buildMemberForest,
  canMoveMember,
  flattenMemberForest,
  nextMemberSortOrder,
  reorderMemberAmongSiblings,
  reparentMemberChildrenOnDelete,
} from './entityMemberTree.js';

function mem(id, name, extra = {}) {
  return { id, name, alias: '', role: '', status: '', info: '', ...extra };
}

describe('entityMemberTree', () => {
  it('builds forest by parentId and sortOrder', () => {
    const members = [
      mem('d1', 'Đệ tử B', { parentId: 'elder', sortOrder: 1 }),
      mem('boss', 'Tông chủ', { sortOrder: 0 }),
      mem('elder', 'Trưởng lão', { parentId: 'boss', sortOrder: 0 }),
      mem('d0', 'Đệ tử A', { parentId: 'elder', sortOrder: 0 }),
    ];
    const flat = flattenMemberForest(members).map((row) => `${row.depth}:${row.member.id}`);
    expect(flat).toEqual(['0:boss', '1:elder', '2:d0', '2:d1']);
    expect(buildMemberForest(members).roots.map((m) => m.id)).toEqual(['boss']);
  });

  it('rejects cycles and self-parent', () => {
    const members = [
      mem('a', 'A'),
      mem('b', 'B', { parentId: 'a' }),
    ];
    expect(canMoveMember(members, 'a', 'a').ok).toBe(false);
    expect(canMoveMember(members, 'a', 'b').reason).toBe('cycle');
  });

  it('moves under parent and reorders siblings', () => {
    const members = [
      mem('a', 'A', { sortOrder: 0 }),
      mem('b', 'B', { sortOrder: 1 }),
      mem('c', 'C', { sortOrder: 2 }),
    ];
    expect(applyMemberMove(members, 'c', 'a').ok).toBe(true);
    expect(members.find((m) => m.id === 'c').parentId).toBe('a');
    expect(reorderMemberAmongSiblings(members, 'b', 'a').ok).toBe(true);
    const roots = buildMemberForest(members).roots.map((m) => m.id);
    expect(roots).toEqual(['b', 'a']);
  });

  it('promotes children when parent deleted', () => {
    const members = [
      mem('boss', 'Tông chủ', { sortOrder: 0 }),
      mem('elder', 'Trưởng lão', { parentId: 'boss', sortOrder: 0 }),
      mem('d1', 'Đệ tử', { parentId: 'elder', sortOrder: 0 }),
    ];
    expect(reparentMemberChildrenOnDelete(members, 'elder')).toBe(1);
    expect(members.find((m) => m.id === 'd1').parentId).toBe('boss');
    members.splice(members.findIndex((m) => m.id === 'elder'), 1);
    expect(flattenMemberForest(members).map((r) => r.member.id)).toEqual(['boss', 'd1']);
  });

  it('suggests next sort order under a parent', () => {
    const members = [
      mem('a', 'A', { sortOrder: 0 }),
      mem('b', 'B', { parentId: 'a', sortOrder: 0 }),
      mem('c', 'C', { parentId: 'a', sortOrder: 2 }),
    ];
    expect(nextMemberSortOrder(members, 'a')).toBe(3);
    expect(nextMemberSortOrder(members, null)).toBe(1);
  });
});
