import { describe, expect, it } from 'vitest';
import { runTtcQueryFromSource, executeTtcQuery } from './ttcQueryEngine.js';
import { parseTtcQuery } from './ttcQueryParser.js';

const dualTabNovel = {
  tabsConfig: {
    tabs: [
      {
        id: 'do-thi-nhan-vat',
        subTabs: [
          {
            id: 'long-ngao-thien',
            label: 'Long Ngạo Thiên',
            fieldsTemplate: [{ id: 'f_level', label: 'Cấp' }],
          },
        ],
      },
      {
        id: 'ban-do',
        subTabs: [{ id: 'ha-gioi', label: 'Hạ Giới', fieldsTemplate: [] }],
      },
    ],
  },
  data: {
    'do-thi-nhan-vat': {
      'long-ngao-thien': {
        entities: [
          { id: 'c1', name: 'Alpha', dynamicData: { f_level: '5' } },
          { id: 'c2', name: 'Beta', dynamicData: {} },
        ],
      },
    },
    'ban-do': {
      'ha-gioi': {
        entities: [{ id: 'm1', name: 'MapOne', dynamicData: {} }],
      },
    },
  },
};

describe('ttcQuery semantics & UX', () => {
  it('errors on WHERE unknown field with suggestion', () => {
    const r = runTtcQueryFromSource(
      'VIEW LIST\nFROM entity\nWHERE f_levl = "5"\nSELECT entity',
      dualTabNovel,
    );
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/WHERE không tồn tại: f_levl/);
    expect(r.errors[0]).toMatch(/f_level/);
  });

  it('valid query with empty field values uses IS EMPTY, not field-missing error', () => {
    const r = runTtcQueryFromSource(
      'VIEW LIST\nFROM entity\nWHERE f_level IS EMPTY\nSELECT entity',
      dualTabNovel,
    );
    expect(r.ok).toBe(true);
    expect(r.rows.map((x) => x.entityId)).toContain('c2');
  });

  it('valid query with no matching rows returns no_match, not error', () => {
    const r = runTtcQueryFromSource(
      'VIEW LIST\nFROM entity\nWHERE id = "does-not-exist"\nSELECT entity',
      dualTabNovel,
    );
    expect(r.ok).toBe(true);
    expect(r.rows).toHaveLength(0);
    expect(r.emptyReason).toBe('no_match');
  });

  it('type filters nhoId only; lonId does not match type', () => {
    const byNho = runTtcQueryFromSource(
      'VIEW LIST\nFROM entity\nWHERE type = "long-ngao-thien"\nSELECT entity',
      dualTabNovel,
    );
    expect(byNho.rows.map((x) => x.entityId).sort()).toEqual(['c1', 'c2']);
    const byLonOnType = runTtcQueryFromSource(
      'VIEW LIST\nFROM entity\nWHERE type = "do-thi-nhan-vat"\nSELECT entity',
      dualTabNovel,
    );
    expect(byLonOnType.rows).toHaveLength(0);
  });

  it('nhoId and lonId/parentFolder filter correct tab level', () => {
    expect(
      runTtcQueryFromSource('VIEW LIST\nFROM entity\nWHERE nhoId = "ha-gioi"\nSELECT entity', dualTabNovel)
        .rows[0].entityId,
    ).toBe('m1');
    const lon = runTtcQueryFromSource(
      'VIEW LIST\nFROM entity\nWHERE lonId = "ban-do"\nSELECT entity',
      dualTabNovel,
    );
    expect(lon.rows).toHaveLength(1);
    const parent = runTtcQueryFromSource(
      'VIEW LIST\nFROM entity\nWHERE parentFolder = "do-thi-nhan-vat"\nSELECT entity, folderPath',
      dualTabNovel,
    );
    expect(parent.rows.map((x) => x.entityId).sort()).toEqual(['c1', 'c2']);
    expect(parent.rows[0].cells.find((c) => c.fieldId === 'folderPath').display).toBe(
      'do-thi-nhan-vat/long-ngao-thien',
    );
  });

  it('rename, undo, add, delete entity updates query results without crash', () => {
    const novel = JSON.parse(JSON.stringify(dualTabNovel));
    const snap = JSON.parse(JSON.stringify(novel));

    let r = runTtcQueryFromSource('VIEW LIST\nFROM entity\nWHERE id = "c1"\nSELECT entity', novel);
    expect(r.rows[0].entityName).toBe('Alpha');

    novel.data['do-thi-nhan-vat']['long-ngao-thien'].entities[0].name = 'Alpha Renamed';
    r = runTtcQueryFromSource('VIEW LIST\nFROM entity\nWHERE id = "c1"\nSELECT entity', novel);
    expect(r.rows[0].entityName).toBe('Alpha Renamed');

    Object.assign(novel, JSON.parse(JSON.stringify(snap)));
    r = runTtcQueryFromSource('VIEW LIST\nFROM entity\nWHERE id = "c1"\nSELECT entity', novel);
    expect(r.rows[0].entityName).toBe('Alpha');

    novel.data['do-thi-nhan-vat']['long-ngao-thien'].entities.push({
      id: 'c-new',
      name: 'Gamma',
      dynamicData: {},
    });
    r = runTtcQueryFromSource('VIEW LIST\nFROM entity\nWHERE id = "c-new"\nSELECT entity', novel);
    expect(r.rows).toHaveLength(1);

    novel.data['do-thi-nhan-vat']['long-ngao-thien'].entities = novel.data['do-thi-nhan-vat'][
      'long-ngao-thien'
    ].entities.filter((e) => e.id !== 'c1');
    r = executeTtcQuery(novel, parseTtcQuery('VIEW LIST\nFROM entity\nSELECT entity').query);
    expect(r.ok).toBe(true);
    expect(r.rows.some((x) => x.entityId === 'c1')).toBe(false);
  });

  it('does not mutate activeNovelData', () => {
    const novel = JSON.parse(JSON.stringify(dualTabNovel));
    const before = JSON.stringify(novel);
    runTtcQueryFromSource('VIEW LIST\nFROM entity\nSELECT entity, f_level', novel);
    expect(JSON.stringify(novel)).toBe(before);
  });
});
