import { describe, expect, it } from 'vitest';
import { parseTtcQuery, MAX_LIMIT } from './ttcQueryParser.js';
import { executeTtcQuery, runTtcQueryFromSource } from './ttcQueryEngine.js';

const sampleNovel = {
  tabsConfig: {
    tabs: [
      {
        id: 'do-thi-nhan-vat',
        subTabs: [
          {
            id: 'long-ngao-thien',
            label: 'Long ngao thien',
            fieldsTemplate: [
              { id: 'f_alias', label: 'Biệt danh' },
              { id: 'f_level', label: 'Cấp' },
            ],
          },
        ],
      },
      {
        id: 'ban-do',
        subTabs: [{ id: 'ha-gioi', label: 'Ha gioi', fieldsTemplate: [] }],
      },
    ],
  },
  data: {
    'do-thi-nhan-vat': {
      'long-ngao-thien': {
        entities: [
          {
            id: 'c1',
            name: 'A Phi',
            dynamicData: { f_alias: 'A Phi, Tiểu Phi', f_level: '10', f_status: 'alive' },
          },
          {
            id: 'c2',
            name: 'Beta',
            dynamicData: { f_level: '20', f_description: 'Co mo ta' },
          },
          { id: 'c3', name: 'Gamma', dynamicData: {} },
        ],
      },
    },
    'ban-do': {
      'ha-gioi': {
        entities: [{ id: 'l1', name: 'Thanh A', dynamicData: {} }],
      },
    },
  },
};

describe('ttcQueryParser', () => {
  it('parses TABLE query with WHERE AND, SORT, LIMIT', () => {
    const src = [
      'VIEW TABLE',
      'FROM entity',
      'WHERE type = "long-ngao-thien" AND f_status = "alive"',
      'SELECT entity, f_level',
      'SORT f_level DESC',
      'LIMIT 10',
    ].join('\n');
    const parsed = parseTtcQuery(src);
    expect(parsed.ok).toBe(true);
    expect(parsed.query.view).toBe('table');
    expect(parsed.query.where).toHaveLength(2);
    expect(parsed.query.select).toEqual(['entity', 'f_level']);
    expect(parsed.query.sort).toEqual({ field: 'f_level', direction: 'desc' });
    expect(parsed.query.limit).toBe(10);
  });

  it('rejects LIMIT over max', () => {
    const parsed = parseTtcQuery(`VIEW LIST\nFROM entity\nSELECT entity\nLIMIT ${MAX_LIMIT + 1}`);
    expect(parsed.ok).toBe(false);
  });

  it('rejects LIMIT <= 0', () => {
    const parsed = parseTtcQuery('VIEW LIST\nFROM entity\nSELECT entity\nLIMIT 0');
    expect(parsed.ok).toBe(false);
  });
});

describe('ttcQueryEngine', () => {
  it('filters by nhoId type and sorts numeric DESC', () => {
    const src = [
      'VIEW TABLE',
      'FROM entity',
      'WHERE type = "long-ngao-thien"',
      'SELECT entity, f_level',
      'SORT f_level DESC',
      'LIMIT 50',
    ].join('\n');
    const result = runTtcQueryFromSource(src, sampleNovel);
    expect(result.ok).toBe(true);
    expect(result.rows.map((r) => r.entityId)).toEqual(['c2', 'c1', 'c3']);
    expect(result.columns[1].label).toBe('Cấp');
  });

  it('CONTAINS on alias field', () => {
    const src = [
      'VIEW TABLE',
      'FROM entity',
      'WHERE f_alias CONTAINS "A Phi"',
      'SELECT entity, f_alias',
    ].join('\n');
    const result = runTtcQueryFromSource(src, sampleNovel);
    expect(result.ok).toBe(true);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].entityName).toBe('A Phi');
  });

  it('IS NOT EMPTY filters description', () => {
    const src = [
      'VIEW TABLE',
      'FROM entity',
      'WHERE f_description IS NOT EMPTY',
      'SELECT entity',
      'LIMIT 30',
    ].join('\n');
    const result = runTtcQueryFromSource(src, sampleNovel);
    expect(result.ok).toBe(true);
    expect(result.rows.map((r) => r.entityId)).toEqual(['c2']);
  });

  it('filters map tab by nhoId ha-gioi', () => {
    const src = ['VIEW LIST', 'FROM entity', 'WHERE type = "ha-gioi"', 'SELECT entity'].join('\n');
    const result = runTtcQueryFromSource(src, sampleNovel);
    expect(result.ok).toBe(true);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].entityName).toBe('Thanh A');
  });

  it('truncates with notice when over limit', () => {
    const parsed = parseTtcQuery('VIEW LIST\nFROM entity\nSELECT entity\nLIMIT 2');
    const result = executeTtcQuery(sampleNovel, parsed.query);
    expect(result.ok).toBe(true);
    expect(result.truncated).toBe(true);
    expect(result.notice).toMatch(/2 kết quả/);
  });

  it('errors on unknown sort field', () => {
    const parsed = parseTtcQuery('VIEW LIST\nFROM entity\nSELECT entity\nSORT f_missing ASC');
    const result = executeTtcQuery(sampleNovel, parsed.query);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/SORT không tồn tại: f_missing/);
  });

  it('errors on unknown WHERE field instead of empty table', () => {
    const result = runTtcQueryFromSource(
      'VIEW TABLE\nFROM entity\nWHERE f_not_a_field = "x"\nSELECT entity',
      sampleNovel,
    );
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/WHERE không tồn tại/);
  });
});
