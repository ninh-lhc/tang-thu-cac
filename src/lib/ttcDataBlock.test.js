import { describe, expect, it } from 'vitest';
import {
  parseTtcDataBlocksFromMarkdown,
  TTC_DATA_MAX_BODY_CHARS,
} from './ttcDataBlock.js';
import { runTtcQueryFromSource } from './ttcQueryEngine.js';
import { collectTtcKnownFieldIds } from './ttcQueryFieldCatalog.js';
import { listTtcQueryFieldOptions } from './ttcQueryBuilder.js';

describe('ttcDataBlock', () => {
  it('parses a single ttc-data fence', () => {
    const md = [
      '# Ghi chép',
      '```ttc-data',
      '{ "f_level": 3, "f_status": "alive" }',
      '```',
    ].join('\n');
    expect(parseTtcDataBlocksFromMarkdown(md)).toEqual({
      f_level: 3,
      f_status: 'alive',
    });
  });

  it('merges later blocks over earlier keys', () => {
    const md = [
      '```ttc-data',
      '{ "f_level": 1 }',
      '```',
      '```ttc-data',
      '{ "f_level": 9, "f_faction": "[[A]]" }',
      '```',
    ].join('\n');
    expect(parseTtcDataBlocksFromMarkdown(md)).toEqual({
      f_level: 9,
      f_faction: '[[A]]',
    });
  });

  it('ignores invalid JSON and non-object roots', () => {
    const md = [
      '```ttc-data',
      'not json',
      '```',
      '```ttc-data',
      '["array"]',
      '```',
      '```ttc-data',
      '{ "f_ok": true }',
      '```',
    ].join('\n');
    expect(parseTtcDataBlocksFromMarkdown(md)).toEqual({ f_ok: true });
  });

  it('skips oversize fence bodies', () => {
    const huge = `"${'x'.repeat(TTC_DATA_MAX_BODY_CHARS + 1)}"`;
    const md = ['```ttc-data', `{ "f_big": ${huge} }`, '```'].join('\n');
    expect(parseTtcDataBlocksFromMarkdown(md)).toEqual({});
  });
});

describe('ttc-query reads ttc-data from entity info', () => {
  const novel = {
    tabsConfig: { tabs: [{ id: 'a', subTabs: [{ id: 'b', fieldsTemplate: [] }] }] },
    data: {
      a: {
        b: {
          entities: [
            {
              id: 'e1',
              name: 'Hero',
              dynamicData: {},
              info: [
                'Nội dung NotebookLM…',
                '```ttc-data',
                '{',
                '  "f_level": 3,',
                '  "f_skills": ["[[Hỏa Cầu]]", "[[Băng Phong]]"]',
                '}',
                '```',
              ].join('\n'),
            },
            {
              id: 'e2',
              name: 'Card wins',
              dynamicData: { f_level: 10 },
              info: '```ttc-data\n{ "f_level": 1 }\n```',
            },
          ],
        },
      },
    },
  };

  it('SELECT and WHERE use values from ttc-data', () => {
    const r = runTtcQueryFromSource(
      'VIEW TABLE\nFROM entity\nWHERE f_level = 3\nSELECT entity, f_level, f_skills',
      novel,
    );
    expect(r.ok).toBe(true);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].entityId).toBe('e1');
    expect(r.rows[0].cells.find((c) => c.fieldId === 'f_level')?.display).toBe('3');
    expect(r.rows[0].cells.find((c) => c.fieldId === 'f_skills')?.display).toContain('Hỏa Cầu');
  });

  it('dynamicData overrides ttc-data for the same field', () => {
    const r = runTtcQueryFromSource(
      'VIEW LIST\nFROM entity\nWHERE f_level = 10\nSELECT entity, f_level',
      novel,
    );
    expect(r.ok).toBe(true);
    expect(r.rows.map((x) => x.entityId)).toEqual(['e2']);
  });

  it('registers ttc-data-only fields in query catalog (engine), not Query Builder', () => {
    const known = collectTtcKnownFieldIds(novel, novel.tabsConfig);
    expect(known.has('f_skills')).toBe(true);
    const options = listTtcQueryFieldOptions(novel, { kind: 'all' });
    expect(options.find((f) => f.id === 'f_skills')).toBeUndefined();
  });
});
