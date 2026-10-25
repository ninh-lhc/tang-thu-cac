import { describe, expect, it } from 'vitest';
import { runTtcQueryFromSource } from './ttcQueryEngine.js';

function buildLargeNovel(count) {
  const entities = Array.from({ length: count }, (_, i) => ({
    id: `e-${i}`,
    name: `Entity ${i}`,
    dynamicData: { f_level: String(i % 100), f_bucket: i % 2 === 0 ? 'even' : 'odd' },
  }));
  return {
    data: { 'test-lon': { 'test-nho': { entities } } },
  };
}

describe('ttcQuery performance', () => {
  const novel500 = buildLargeNovel(500);

  it('LIMIT 50 returns at most 50 rows quickly', () => {
    const t0 = performance.now();
    const r = runTtcQueryFromSource(
      'VIEW TABLE\nFROM entity\nSELECT entity, f_level\nLIMIT 50',
      novel500,
    );
    const ms = performance.now() - t0;
    expect(r.ok).toBe(true);
    expect(r.rows.length).toBe(50);
    expect(r.totalMatched).toBe(500);
    expect(ms).toBeLessThan(1500);
  });

  it('LIMIT 500 with filter and sort stays bounded', () => {
    const t0 = performance.now();
    const r = runTtcQueryFromSource(
      [
        'VIEW TABLE',
        'FROM entity',
        'WHERE f_bucket = "even"',
        'SELECT entity, f_level',
        'SORT f_level DESC',
        'LIMIT 500',
      ].join('\n'),
      novel500,
    );
    const ms = performance.now() - t0;
    expect(r.ok).toBe(true);
    expect(r.rows.length).toBeLessThanOrEqual(500);
    expect(r.rows.length).toBe(250);
    expect(ms).toBeLessThan(1500);
  });
});
