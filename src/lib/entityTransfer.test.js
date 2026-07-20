import { describe, expect, it } from 'vitest';
import { moveEntityAcrossCollectionTabs, promoteEntityMemberToCollectionCard } from './entityTransfer.js';

function novelFixture() {
  return {
    data: {
      a: { one: { entities: [] } },
      b: { two: { entities: [] } },
    },
  };
}

describe('entity transfers', () => {
  it('moves a real card intact and detaches invalid map-tree links', () => {
    const novel = novelFixture();
    const card = { id: 'e1', name: 'Thẻ A', info: 'Chi tiết', images: ['x'], mapParentId: 'parent' };
    novel.data.a.one.entities.push(card, { id: 'child', name: 'Con', mapParentId: 'e1' });

    const result = moveEntityAcrossCollectionTabs(novel, { lonId: 'a', nhoId: 'one' }, { lonId: 'b', nhoId: 'two' }, 'e1');

    expect(result.ok).toBe(true);
    expect(novel.data.b.two.entities[0]).toMatchObject({ id: 'e1', info: 'Chi tiết', images: ['x'] });
    expect(novel.data.b.two.entities[0].mapParentId).toBeUndefined();
    expect(novel.data.a.one.entities[0].mapParentId).toBeUndefined();
  });

  it('promotes one member and moves its whole descendant branch with it', () => {
    const novel = novelFixture();
    novel.data.a.one.entities.push({
      id: 'parent',
      name: 'Tông môn',
      members: [
        { id: 'm1', name: 'Điện chủ', role: 'Chủ điện', info: 'Hồ sơ' },
        { id: 'm2', name: 'Đệ tử', parentId: 'm1' },
        { id: 'm3', name: 'Đồ tôn', parentId: 'm2' },
        { id: 'other', name: 'Nhánh khác' },
      ],
    });

    const result = promoteEntityMemberToCollectionCard(
      novel,
      { lonId: 'a', nhoId: 'one' },
      { lonId: 'b', nhoId: 'two' },
      'parent',
      'm1',
      { generateId: () => 'promoted' }
    );

    expect(result).toMatchObject({ ok: true, entityId: 'promoted', movedDescendantCount: 2 });
    expect(novel.data.a.one.entities[0].members.map((member) => member.id)).toEqual(['other']);
    expect(novel.data.b.two.entities[0]).toMatchObject({ name: 'Điện chủ', title: 'Chủ điện', info: 'Hồ sơ' });
    expect(novel.data.b.two.entities[0].members).toEqual([
      expect.objectContaining({ id: 'm2' }),
      expect.objectContaining({ id: 'm3', parentId: 'm2' }),
    ]);
    expect(novel.data.b.two.entities[0].members[0].parentId).toBeUndefined();
  });
});
