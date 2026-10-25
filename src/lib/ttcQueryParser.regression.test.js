import { describe, expect, it } from 'vitest';
import { parseTtcQuery, DEFAULT_LIMIT, MAX_LIMIT } from './ttcQueryParser.js';

describe('ttcQueryParser regression', () => {
  it('parses VIEW TABLE and VIEW LIST', () => {
    expect(parseTtcQuery('VIEW TABLE\nFROM entity\nSELECT entity').ok).toBe(true);
    expect(parseTtcQuery('VIEW LIST\nFROM entity\nSELECT entity').query.view).toBe('list');
  });

  it('parses WHERE with multiple AND and Vietnamese quoted values', () => {
    const src = [
      'VIEW TABLE',
      'FROM entity',
      'WHERE f_alias CONTAINS "A Phi" AND type = "long-ngao-thien"',
      'SELECT entity',
    ].join('\n');
    const parsed = parseTtcQuery(src);
    expect(parsed.ok).toBe(true);
    expect(parsed.query.where).toHaveLength(2);
    expect(parsed.query.where[1].value).toBe('long-ngao-thien');
  });

  it('parses quoted values with spaces', () => {
    const parsed = parseTtcQuery('VIEW LIST\nFROM entity\nWHERE f_status = "con song"\nSELECT entity');
    expect(parsed.ok).toBe(true);
    expect(parsed.query.where[0].value).toBe('con song');
  });

  it('parses multi-field SELECT and SORT ASC/DESC', () => {
    const asc = parseTtcQuery('VIEW TABLE\nFROM entity\nSELECT entity, f_level, id\nSORT entity ASC');
    expect(asc.ok).toBe(true);
    expect(asc.query.select).toEqual(['entity', 'f_level', 'id']);
    expect(asc.query.sort).toEqual({ field: 'entity', direction: 'asc' });
    const desc = parseTtcQuery('VIEW TABLE\nFROM entity\nSELECT entity\nSORT f_level DESC');
    expect(desc.query.sort.direction).toBe('desc');
  });

  it(`defaults LIMIT to ${DEFAULT_LIMIT}`, () => {
    const parsed = parseTtcQuery('VIEW LIST\nFROM entity\nSELECT entity');
    expect(parsed.ok).toBe(true);
    expect(parsed.query.limit).toBe(DEFAULT_LIMIT);
  });

  it('rejects LIMIT 0, negative, and over max', () => {
    expect(parseTtcQuery('VIEW LIST\nFROM entity\nSELECT entity\nLIMIT 0').ok).toBe(false);
    expect(parseTtcQuery('VIEW LIST\nFROM entity\nSELECT entity\nLIMIT -3').ok).toBe(false);
    expect(parseTtcQuery(`VIEW LIST\nFROM entity\nSELECT entity\nLIMIT ${MAX_LIMIT + 1}`).ok).toBe(false);
  });

  it('errors when missing VIEW, FROM, or empty query', () => {
    expect(parseTtcQuery('').ok).toBe(false);
    expect(parseTtcQuery('FROM entity\nSELECT entity').ok).toBe(false);
    expect(parseTtcQuery('VIEW LIST\nSELECT entity').ok).toBe(false);
    expect(parseTtcQuery('VIEW TABLE\nFROM entity').ok).toBe(false);
  });

  it('errors on invalid WHERE operator', () => {
    const parsed = parseTtcQuery('VIEW LIST\nFROM entity\nWHERE f_x LIKE "a"\nSELECT entity');
    expect(parsed.ok).toBe(false);
    expect(parsed.errors.some((e) => /WHERE/i.test(e))).toBe(true);
  });

  it('errors on unsupported line', () => {
    const parsed = parseTtcQuery('VIEW LIST\nFROM entity\nSELECT entity\nFOO bar');
    expect(parsed.ok).toBe(false);
  });
});
