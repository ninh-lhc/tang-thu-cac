import { describe, expect, it } from 'vitest';
import {
  filterListCardInfoByFieldFilters,
  filterListCardInfoBySearchQuery,
  sortListCardContentLinesPreservingStructure,
} from './listCardInfoSearch.js';

const SAMPLE = [
  '# Danh mục thẻ (AUTO)',
  '',
  '- Tổng số thẻ: 2',
  '',
  '## Danh sách (2)',
  '',
  '1. [[Alpha]] mô tả lạc',
  '2. [[Beta]] tìm beta',
  '',
].join('\n');

describe('filterListCardInfoByFieldFilters', () => {
  it('returns original when no field values', () => {
    const r = filterListCardInfoByFieldFilters(SAMPLE, {});
    expect(r.isFiltered).toBe(false);
    expect(r.keptContentLines).toBe(-1);
    expect(r.text).toBe(SAMPLE);
  });

  it('keeps only lines containing every selected value', () => {
    const r = filterListCardInfoByFieldFilters(SAMPLE, { f_x: 'mô tả lạc' });
    expect(r.isFiltered).toBe(true);
    expect(r.keptContentLines).toBe(1);
    expect(r.text).toContain('1. [[Alpha]]');
    expect(r.text).not.toContain('2. [[Beta]]');
  });

  it('requires AND across multiple field values on same line', () => {
    const r = filterListCardInfoByFieldFilters(SAMPLE, { a: 'Alpha', b: 'beta' });
    expect(r.keptContentLines).toBe(0);
  });
});

describe('filterListCardInfoBySearchQuery', () => {
  it('returns full text when query empty', () => {
    const r = filterListCardInfoBySearchQuery(SAMPLE, '   ');
    expect(r.isFiltered).toBe(false);
    expect(r.matchCount).toBeNull();
    expect(r.text).toBe(SAMPLE);
  });

  it('keeps headers and only matching numbered lines', () => {
    const r = filterListCardInfoBySearchQuery(SAMPLE, 'alpha');
    expect(r.isFiltered).toBe(true);
    expect(r.matchCount).toBe(1);
    expect(r.text).toContain('1. [[Alpha]]');
    expect(r.text).not.toContain('2. [[Beta]]');
    expect(r.text).toContain('# Danh mục');
    expect(r.text).toContain('## Danh sách (2)');
  });

  it('is accent-insensitive for Vietnamese', () => {
    const r = filterListCardInfoBySearchQuery(SAMPLE, 'lac');
    expect(r.matchCount).toBe(1);
    expect(r.text).toContain('lạc');
  });
});

describe('sortListCardContentLinesPreservingStructure', () => {
  it('sắp dòng nội dung, giữ dòng cấu trúc', () => {
    const raw = ['# H', '', '2. B', '1. A'].join('\n');
    const out = sortListCardContentLinesPreservingStructure(raw, 'name_asc');
    expect(out.indexOf('1. A')).toBeLessThan(out.indexOf('2. B'));
    expect(out).toContain('# H');
  });
});
