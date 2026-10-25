import { describe, expect, it } from 'vitest';
import { parseTtcQuery } from './ttcQueryParser.js';
import { executeTtcQuery, runTtcQueryFromSource } from './ttcQueryEngine.js';

function makeNovel(entities, lon = 'tab-lon', nho = 'tab-nho') {
  return {
    data: { [lon]: { [nho]: { entities } } },
    tabsConfig: { tabs: [{ id: lon, subTabs: [{ id: nho, label: 'Nhan', fieldsTemplate: [] }] }] },
  };
}

describe('ttcQueryEngine regression', () => {
  const novel = {
    data: {
      'do-thi-nhan-vat': {
        hero: {
          entities: [
            { id: 'a', name: 'Alpha', dynamicData: { f_tag: 'vip', f_score: '5', f_note: '' } },
            { id: 'b', name: 'Bravo', dynamicData: { f_tag: 'vip', f_score: '20', f_note: 'co' } },
            { id: 'c', name: 'Charlie', dynamicData: { f_score: '10' } },
          ],
        },
      },
      'ban-do': {
        map: { entities: [{ id: 'm1', name: 'MapEnt', dynamicData: {} }] },
      },
    },
  };

  it('filters by nhoId type slug', () => {
    const r = runTtcQueryFromSource('VIEW LIST\nFROM entity\nWHERE type = "hero"\nSELECT entity', novel);
    expect(r.rows.map((x) => x.entityId).sort()).toEqual(['a', 'b', 'c']);
    const r2 = runTtcQueryFromSource('VIEW LIST\nFROM entity\nWHERE type = "map"\nSELECT entity', novel);
    expect(r2.rows).toHaveLength(1);
    expect(r2.rows[0].entityId).toBe('m1');
  });

  it('filters string eq and neq', () => {
    const eq = runTtcQueryFromSource('VIEW LIST\nFROM entity\nWHERE f_tag = "vip"\nSELECT entity', novel);
    expect(eq.rows.map((x) => x.entityId).sort()).toEqual(['a', 'b']);
    const neq = runTtcQueryFromSource('VIEW LIST\nFROM entity\nWHERE f_tag != "vip"\nSELECT entity', novel);
    expect(neq.rows.map((x) => x.entityId).sort()).toEqual(['c', 'm1']);
  });

  it('filters numeric comparisons', () => {
    const r = runTtcQueryFromSource(
      'VIEW LIST\nFROM entity\nWHERE f_score >= 10\nSELECT entity\nSORT f_score ASC',
      novel,
    );
    expect(r.rows.map((x) => x.entityId)).toEqual(['c', 'b']);
  });

  it('IS EMPTY and IS NOT EMPTY', () => {
    const empty = runTtcQueryFromSource('VIEW LIST\nFROM entity\nWHERE f_note IS EMPTY\nSELECT entity', novel);
    expect(empty.rows.map((x) => x.entityId).sort()).toEqual(['a', 'c', 'm1']);
    const notEmpty = runTtcQueryFromSource(
      'VIEW LIST\nFROM entity\nWHERE f_note IS NOT EMPTY\nSELECT entity',
      novel,
    );
    expect(notEmpty.rows.map((x) => x.entityId)).toEqual(['b']);
  });

  it('sorts numbers numerically and text case-insensitively', () => {
    const num = runTtcQueryFromSource(
      'VIEW LIST\nFROM entity\nWHERE type = "hero"\nSELECT entity\nSORT f_score DESC',
      novel,
    );
    expect(num.rows.map((x) => x.entityId)).toEqual(['b', 'c', 'a']);
    const text = runTtcQueryFromSource('VIEW LIST\nFROM entity\nSELECT entity\nSORT entity ASC', novel);
    expect(text.rows[0].entityName).toBe('Alpha');
  });

  it('puts empty sort values last for ASC and DESC', () => {
    const asc = runTtcQueryFromSource(
      'VIEW LIST\nFROM entity\nWHERE type = "hero"\nSELECT entity\nSORT f_note ASC',
      novel,
    );
    expect(asc.rows[0].entityId).toBe('b');
    expect(['a', 'c']).toContain(asc.rows[asc.rows.length - 1].entityId);
    const desc = runTtcQueryFromSource(
      'VIEW LIST\nFROM entity\nWHERE type = "hero"\nSELECT entity\nSORT f_note DESC',
      novel,
    );
    expect(desc.rows[0].entityId).toBe('b');
    expect(['a', 'c']).toContain(desc.rows[desc.rows.length - 1].entityId);
  });

  it('respects LIMIT row count', () => {
    const parsed = parseTtcQuery('VIEW LIST\nFROM entity\nSELECT entity\nLIMIT 2');
    const r = executeTtcQuery(novel, parsed.query);
    expect(r.rows).toHaveLength(2);
    expect(r.totalMatched).toBeGreaterThan(2);
  });

  it('does not mutate activeNovelData', () => {
    const snap = JSON.stringify(novel);
    executeTtcQuery(novel, parseTtcQuery('VIEW LIST\nFROM entity\nSELECT entity').query);
    expect(JSON.stringify(novel)).toBe(snap);
  });

  it('only reads entities from the given novel', () => {
    const other = makeNovel([{ id: 'x', name: 'Other', dynamicData: {} }], 'lon2', 'nho2');
    const r = runTtcQueryFromSource('VIEW LIST\nFROM entity\nSELECT entity', other);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].entityId).toBe('x');
  });

  it('returns empty result set without error', () => {
    const r = runTtcQueryFromSource('VIEW LIST\nFROM entity\nWHERE id = "missing"\nSELECT entity', novel);
    expect(r.ok).toBe(true);
    expect(r.rows).toHaveLength(0);
  });

  it('updates when novel data changes (rename, field, add, remove)', () => {
    const dynamic = JSON.parse(JSON.stringify(novel));
    let r = runTtcQueryFromSource('VIEW LIST\nFROM entity\nWHERE id = "a"\nSELECT entity', dynamic);
    expect(r.rows[0].entityName).toBe('Alpha');

    dynamic.data['do-thi-nhan-vat'].hero.entities[0].name = 'Alpha Renamed';
    r = runTtcQueryFromSource('VIEW LIST\nFROM entity\nWHERE id = "a"\nSELECT entity', dynamic);
    expect(r.rows[0].entityName).toBe('Alpha Renamed');

    dynamic.data['do-thi-nhan-vat'].hero.entities[0].dynamicData.f_score = '99';
    r = runTtcQueryFromSource(
      'VIEW LIST\nFROM entity\nWHERE id = "a" AND f_score = "99"\nSELECT entity',
      dynamic,
    );
    expect(r.rows).toHaveLength(1);

    dynamic.data['do-thi-nhan-vat'].hero.entities.push({
      id: 'new1',
      name: 'Delta',
      dynamicData: {},
    });
    r = runTtcQueryFromSource('VIEW LIST\nFROM entity\nWHERE id = "new1"\nSELECT entity', dynamic);
    expect(r.rows).toHaveLength(1);

    dynamic.data['do-thi-nhan-vat'].hero.entities = dynamic.data['do-thi-nhan-vat'].hero.entities.filter(
      (e) => e.id !== 'b',
    );
    r = runTtcQueryFromSource('VIEW LIST\nFROM entity\nWHERE id = "b"\nSELECT entity', dynamic);
    expect(r.rows).toHaveLength(0);
  });

  it('errors on unknown WHERE field', () => {
    const r = runTtcQueryFromSource('VIEW LIST\nFROM entity\nWHERE f_nope = "1"\nSELECT entity', novel);
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/WHERE không tồn tại: f_nope/);
  });

  it('errors on unknown sort field', () => {
    const parsed = parseTtcQuery('VIEW LIST\nFROM entity\nSELECT entity\nSORT f_missing ASC');
    const result = executeTtcQuery(novel, parsed.query);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/SORT không tồn tại: f_missing/);
  });
});
