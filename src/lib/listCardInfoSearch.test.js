import { describe, expect, it } from 'vitest';
import { filterListCardInfoBySearchQuery } from './listCardInfoSearch.js';

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
