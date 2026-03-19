import { describe, it, expect } from 'vitest';
import { computeRelatedEntities } from './computeRelatedEntities.js';

describe('computeRelatedEntities', () => {
  it('returns empty when missing inputs', () => {
    expect(computeRelatedEntities({})).toEqual([]);
    expect(
      computeRelatedEntities({
        activeNovelData: { data: {} },
        selectedEntity: { id: 'a', name: 'A' },
        activeTabs: [],
        entityMap: [],
        wikiExactMatchOnly: false,
      })
    ).toEqual([]);
  });

  it('finds entity mentioned in another field by name', () => {
    const selectedEntity = { id: 'hero', name: 'Tiểu Minh', dynamicData: {}, rawText: '', milestones: [] };
    const other = { id: 'npc', name: 'Lão Vương', dynamicData: { f_note: 'Gặp Tiểu Minh ở phố' }, rawText: '', milestones: [] };
    const activeNovelData = {
      data: {
        lon1: {
          sub1: { entities: [selectedEntity, other] },
        },
      },
    };
    const activeTabs = [
      { id: 'lon1', label: 'L', subTabs: [{ id: 'sub1', label: 'S', fieldsTemplate: [{ id: 'f_note', label: 'Ghi chú' }] }] },
    ];
    const entityMap = [
      { name: 'Tiểu Minh', dest: { lonId: 'lon1', nhoId: 'sub1', entityId: 'hero' } },
      { name: 'Lão Vương', dest: { lonId: 'lon1', nhoId: 'sub1', entityId: 'npc' } },
    ];
    const rel = computeRelatedEntities({
      activeNovelData,
      selectedEntity,
      activeTabs,
      entityMap,
      wikiExactMatchOnly: true,
    });
    expect(rel.length).toBe(1);
    expect(rel[0].entity.id).toBe('npc');
  });
});
