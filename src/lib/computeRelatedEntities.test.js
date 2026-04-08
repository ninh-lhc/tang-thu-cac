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

  it('prefers selectedEntity.info wiki over stale rawText wiki', () => {
    const selectedEntity = {
      id: 'hero',
      name: 'Hero',
      dynamicData: {},
      info: 'Không còn liên kết',
      rawText: '[[Npc A]]',
      milestones: [],
    };
    const npcA = { id: 'npc-a', name: 'Npc A', dynamicData: {}, info: '', rawText: '', milestones: [] };
    const activeNovelData = {
      data: {
        lon1: { sub1: { entities: [selectedEntity, npcA] } },
      },
    };
    const activeTabs = [{ id: 'lon1', subTabs: [{ id: 'sub1', label: 'S', fieldsTemplate: [] }] }];
    const entityMap = [
      { name: 'Hero', dest: { lonId: 'lon1', nhoId: 'sub1', entityId: 'hero' } },
      { name: 'Npc A', dest: { lonId: 'lon1', nhoId: 'sub1', entityId: 'npc-a' } },
    ];
    const rel = computeRelatedEntities({
      activeNovelData,
      selectedEntity,
      activeTabs,
      entityMap,
      wikiExactMatchOnly: true,
    });
    expect(rel.find((x) => x.entity.id === 'npc-a')).toBeUndefined();
  });

  it('drops relations after in-place entity removal (no stale WeakMap index)', () => {
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
    const args = {
      activeNovelData,
      selectedEntity,
      activeTabs,
      entityMap,
      wikiExactMatchOnly: true,
    };
    expect(computeRelatedEntities(args).length).toBe(1);
    activeNovelData.data.lon1.sub1.entities = [selectedEntity];
    expect(computeRelatedEntities(args)).toEqual([]);
  });

  it('ignores entities under data keys for removed subtabs', () => {
    const selectedEntity = { id: 'hero', name: 'Tiểu Minh', dynamicData: {}, rawText: '', milestones: [] };
    const ghost = {
      id: 'ghost',
      name: 'Ma',
      dynamicData: { f_note: 'Tiểu Minh' },
      rawText: '',
      milestones: [],
    };
    const activeNovelData = {
      data: {
        lon1: {
          sub1: { entities: [selectedEntity] },
          removed_sub: { entities: [ghost] },
        },
      },
    };
    const activeTabs = [
      { id: 'lon1', label: 'L', subTabs: [{ id: 'sub1', label: 'S', fieldsTemplate: [{ id: 'f_note', label: 'Ghi chú' }] }] },
    ];
    const entityMap = [
      { name: 'Tiểu Minh', dest: { lonId: 'lon1', nhoId: 'sub1', entityId: 'hero' } },
      { name: 'Ma', dest: { lonId: 'lon1', nhoId: 'removed_sub', entityId: 'ghost' } },
    ];
    const rel = computeRelatedEntities({
      activeNovelData,
      selectedEntity,
      activeTabs,
      entityMap,
      wikiExactMatchOnly: true,
    });
    expect(rel).toEqual([]);
  });
});
