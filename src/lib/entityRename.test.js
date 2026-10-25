import { describe, expect, it } from 'vitest';
import { buildEntityLinkMap } from './buildEntityLinkMap.js';
import { buildEntityNameLookup, resolveEntityLookup } from './entityWikiLookup.js';
import {
  applyEntityRename,
  entityNamesEquivalentForRename,
  findEntityRenameCollision,
  findMaxRenameHistoryChapter,
  milestoneHasAppliedRename,
  purgeNamesFromWikiRetiredAliases,
  recordEntityRenameHistory,
  removeNameFromAliasText,
  validateEntityRename,
  validateTimelineRenameChapter,
  validateMilestoneChapterEdit,
  RENAME_CHAPTER_ORDER_BLOCK_MESSAGE,
} from './entityRename.js';

function novelWithEntities(entities) {
  return {
    tabsConfig: [{ id: 'lon', label: 'L', subTabs: [{ id: 'sub', label: 'S' }] }],
    data: { lon: { sub: { entities } } },
  };
}

function lookupForEntities(entities) {
  return buildEntityNameLookup(buildEntityLinkMap(novelWithEntities(entities)));
}

describe('entityRename', () => {
  it('detects collision with another entity primary name', () => {
    const nov = novelWithEntities([
      { id: 'a', name: 'Tần Vũ', dynamicData: {} },
      { id: 'b', name: 'Vũ Đế', dynamicData: {} },
    ]);
    const hit = findEntityRenameCollision(nov, { excludeEntityId: 'a', candidateName: 'Vũ Đế' });
    expect(hit?.entityId).toBe('b');
    expect(hit?.conflictingField).toBe('name');
    expect(findEntityRenameCollision(nov, { excludeEntityId: 'a', candidateName: 'Tần Vũ' })).toBeNull();
  });

  it('detects collision with alias on another entity', () => {
    const nov = novelWithEntities([
      { id: 'a', name: 'Tần Vũ', dynamicData: {} },
      { id: 'b', name: 'Khác', dynamicData: { f_alias: 'Vũ Đế' } },
    ]);
    const hit = findEntityRenameCollision(nov, { excludeEntityId: 'a', candidateName: 'Vũ Đế' });
    expect(hit?.entityId).toBe('b');
    expect(hit?.conflictingField).toBe('alias');
  });

  it('detects collision with retired alias on another entity', () => {
    const nov = novelWithEntities([
      { id: 'a', name: 'Tần Vũ', dynamicData: {} },
      { id: 'b', name: 'Khác', dynamicData: {}, wikiRetiredAliases: ['Tần Đế'] },
    ]);
    const hit = findEntityRenameCollision(nov, { excludeEntityId: 'a', candidateName: 'Tần Đế' });
    expect(hit?.entityId).toBe('b');
    expect(hit?.conflictingField).toBe('retiredAlias');
  });

  it('allows promoting own alias to primary name', () => {
    const nov = novelWithEntities([
      { id: 'a', name: 'Tần Vũ', dynamicData: { f_alias: 'Tần Đế' } },
      { id: 'b', name: 'Khác', dynamicData: {} },
    ]);
    expect(findEntityRenameCollision(nov, { excludeEntityId: 'a', candidateName: 'Tần Đế' })).toBeNull();
  });

  it('validateEntityRename treats equivalent names as unchanged', () => {
    const nov = novelWithEntities([{ id: 'a', name: 'Tần Vũ', dynamicData: {} }]);
    const v = validateEntityRename(nov, { entityId: 'a', currentName: 'Tần Vũ' }, 'Tần Vũ');
    expect(v.ok).toBe(true);
    expect(v.code).toBe('unchanged');
  });

  it('validateEntityRename rejects empty target', () => {
    const nov = novelWithEntities([{ id: 'a', name: 'Tần Vũ', dynamicData: {} }]);
    expect(validateEntityRename(nov, { entityId: 'a', currentName: 'Tần Vũ' }, '   ').ok).toBe(false);
  });

  it('records renameHistory without duplicate milestone id', () => {
    const ent = { id: 'a', name: 'Tần Đế', renameHistory: [] };
    recordEntityRenameHistory(ent, {
      oldName: 'Tần Vũ',
      newName: 'Tần Đế',
      milestoneId: 'ms-1',
      chapter: 120,
      changedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(ent.renameHistory).toHaveLength(1);
    recordEntityRenameHistory(ent, {
      oldName: 'Tần Vũ',
      newName: 'Tần Đế Vương',
      milestoneId: 'ms-1',
      chapter: 120,
    });
    expect(ent.renameHistory).toHaveLength(1);
    expect(ent.renameHistory[0].newName).toBe('Tần Đế Vương');
  });

  it('applyEntityRename performs multi-step rename chain', () => {
    const ent = { id: 'entity-001', name: 'Tần Vũ', dynamicData: { f_alias: '' } };
    let r = applyEntityRename(ent, { newName: 'Tần Đế', timelineEventId: 'ms1', chapter: 10 });
    expect(r.renamed).toBe(true);
    expect(ent.name).toBe('Tần Đế');
    expect(splitAlias(ent).sort()).toEqual(['Tần Vũ'].sort());

    r = applyEntityRename(ent, { newName: 'Thiên Đế', timelineEventId: 'ms2', chapter: 200 });
    expect(r.renamed).toBe(true);
    expect(ent.name).toBe('Thiên Đế');
    const aliases = splitAlias(ent);
    expect(aliases).toContain('Tần Vũ');
    expect(aliases).toContain('Tần Đế');
    expect(new Set(aliases).size).toBe(aliases.length);

    const lookup = lookupForEntities([ent]);
    expect(resolveEntityLookup(lookup, 'Tần Vũ')?.dest?.entityId).toBe('entity-001');
    expect(resolveEntityLookup(lookup, 'Tần Đế')?.dest?.entityId).toBe('entity-001');
    expect(resolveEntityLookup(lookup, 'Thiên Đế')?.dest?.entityId).toBe('entity-001');
  });

  it('promote alias: new name removed from alias list', () => {
    const ent = { id: 'a', name: 'Tần Vũ', dynamicData: { f_alias: 'Tần Đế, Vũ Đế' } };
    const r = applyEntityRename(ent, { newName: 'Tần Đế' });
    expect(r.renamed).toBe(true);
    expect(ent.name).toBe('Tần Đế');
    const aliases = splitAlias(ent);
    expect(aliases).toContain('Tần Vũ');
    expect(aliases).toContain('Vũ Đế');
    expect(aliases).not.toContain('Tần Đế');
  });

  it('purgeNamesFromWikiRetiredAliases removes active identities', () => {
    const ent = {
      id: 'a',
      name: 'Tần Đế',
      dynamicData: { f_alias: 'Tần Vũ' },
      wikiRetiredAliases: ['Tần Vũ', 'Tên Khác'],
    };
    purgeNamesFromWikiRetiredAliases(ent, ['Tần Vũ', 'Tần Đế']);
    expect(ent.wikiRetiredAliases).toEqual(['Tên Khác']);
  });

  it('milestoneHasAppliedRename follows renameHistory timelineEventId', () => {
    const ent = {
      id: 'a',
      name: 'Tần Đế',
      renameHistory: [{ oldName: 'Tần Vũ', newName: 'Tần Đế', timelineEventId: 'ms-9' }],
      milestones: [{ id: 'ms-9', nextEntityName: 'Tần Đế' }],
    };
    expect(milestoneHasAppliedRename(ent, ent.milestones[0])).toBe(true);
    expect(milestoneHasAppliedRename(ent, { id: 'ms-other', nextEntityName: 'X' })).toBe(false);
  });

  it('entity without renameHistory still renames safely', () => {
    const ent = { id: 'a', name: 'A', dynamicData: {} };
    applyEntityRename(ent, { newName: 'B' });
    expect(ent.renameHistory?.length).toBe(1);
    expect(ent.name).toBe('B');
  });

  it('removeNameFromAliasText is stable with extra separators', () => {
    expect(removeNameFromAliasText('Alpha,, Beta | Gamma', 'Beta')).toBe('Alpha, Gamma');
  });

  it('entityNamesEquivalentForRename respects fingerprint rules', () => {
    expect(entityNamesEquivalentForRename('Tần Vũ', 'Tần Vũ')).toBe(true);
    expect(entityNamesEquivalentForRename('Độ Kiếp', 'độ kiếp')).toBe(false);
  });

  it('applyEntityRename unchanged does not append renameHistory', () => {
    const ent = { id: 'a', name: 'Tần Vũ', dynamicData: { f_alias: 'X' } };
    const r = applyEntityRename(ent, { newName: 'Tần Vũ' });
    expect(r.renamed).toBe(false);
    expect(ent.renameHistory).toBeUndefined();
    expect(ent.dynamicData.f_alias).toBe('X');
  });

  it('direct-form rename records reason without timelineEventId', () => {
    const ent = { id: 'a', name: 'A', dynamicData: {} };
    applyEntityRename(ent, { newName: 'B', reason: 'direct-form' });
    expect(ent.renameHistory[0].reason).toBe('direct-form');
    expect(ent.renameHistory[0].timelineEventId).toBeNull();
    expect(ent.renameHistory[0].chapter).toBeNull();
  });

  it('blocks retroactive timeline rename by chapter order', () => {
    const ent = {
      id: 'a',
      name: 'Thiên Đế',
      renameHistory: [
        { oldName: 'Tần Vũ', newName: 'Tần Đế', chapter: 50, timelineEventId: 'ms1' },
        { oldName: 'Tần Đế', newName: 'Thiên Đế', chapter: 120, timelineEventId: 'ms2' },
      ],
    };
    expect(findMaxRenameHistoryChapter(ent)).toBe(120);
    const retro = validateTimelineRenameChapter(ent, 80);
    expect(retro.ok).toBe(false);
    expect(retro.code).toBe('retroactive');
    expect(retro.message).toBe(RENAME_CHAPTER_ORDER_BLOCK_MESSAGE);
    expect(validateTimelineRenameChapter(ent, 150).ok).toBe(true);
  });

  it('blocks duplicate rename at the same chapter as prior rename', () => {
    const ent = {
      id: 'a',
      name: 'Tần Đế',
      renameHistory: [{ oldName: 'Tần Vũ', newName: 'Tần Đế', chapter: 120, timelineEventId: 'ms1' }],
    };
    const dup = validateTimelineRenameChapter(ent, 120);
    expect(dup.ok).toBe(false);
    expect(dup.code).toBe('chapter_order');
  });

  it('blocks chapter edit on milestone that already applied rename', () => {
    const ent = {
      id: 'a',
      name: 'Tần Đế',
      renameHistory: [{ oldName: 'Tần Vũ', newName: 'Tần Đế', chapter: 120, timelineEventId: 'ms1' }],
      milestones: [{ id: 'ms1', chapter: 120, nextEntityName: 'Tần Đế' }],
    };
    expect(validateMilestoneChapterEdit(ent, ent.milestones[0], 120).ok).toBe(true);
    expect(validateMilestoneChapterEdit(ent, ent.milestones[0], 121).ok).toBe(false);
  });

  it('entityMap rebuilds from undo snapshot after rename', () => {
    const novel = novelWithEntities([{ id: 'a', name: 'Tên Cũ', dynamicData: {} }]);
    const prev = structuredClone(novel);
    applyEntityRename(novel.data.lon.sub.entities[0], { newName: 'Tên Mới', reason: 'direct-form' });
    expect(buildEntityLinkMap(novel).some((row) => row.name === 'Tên Mới')).toBe(true);
    const restoredMap = buildEntityLinkMap(prev);
    expect(restoredMap.some((row) => row.name === 'Tên Cũ')).toBe(true);
    expect(restoredMap.some((row) => row.name === 'Tên Mới')).toBe(false);
  });

  it('undo snapshot restores rename-related entity fields', () => {
    const entity = {
      id: 'a',
      name: 'Tần Vũ',
      dynamicData: { f_alias: '' },
      wikiRetiredAliases: [],
      renameHistory: [],
    };
    const prev = structuredClone(entity);
    applyEntityRename(entity, { newName: 'Tần Đế', reason: 'direct-form' });
    expect(entity.name).toBe('Tần Đế');
    const restored = structuredClone(prev);
    expect(restored.name).toBe('Tần Vũ');
    expect(restored.dynamicData.f_alias).toBe('');
    expect(restored.renameHistory).toEqual([]);
  });
});

function splitAlias(ent) {
  return String(ent.dynamicData?.f_alias || '')
    .split(/[,/|()]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
