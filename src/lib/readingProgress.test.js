import { describe, it, expect } from 'vitest';
import {
  parseTotalChapters,
  computeProgressPercent,
  isReadingDone,
  bumpReadChapters,
} from './readingProgress.js';

describe('readingProgress', () => {
  it('parseTotalChapters handles ??? and numbers', () => {
    expect(parseTotalChapters('???')).toBe(0);
    expect(parseTotalChapters('100')).toBe(100);
    expect(parseTotalChapters('')).toBe(0);
  });

  it('computeProgressPercent', () => {
    expect(computeProgressPercent(0, 0)).toBe(0);
    expect(computeProgressPercent(25, 100)).toBe(25);
    expect(computeProgressPercent(100, 100)).toBe(100);
    expect(computeProgressPercent(150, 100)).toBe(100);
  });

  it('isReadingDone', () => {
    expect(isReadingDone(0, 0)).toBe(false);
    expect(isReadingDone(100, 100)).toBe(true);
    expect(isReadingDone(99, 100)).toBe(false);
  });

  it('bumpReadChapters clamps to total when known', () => {
    expect(bumpReadChapters(98, 5, 100)).toBe(100);
    expect(bumpReadChapters(3, -1, 100)).toBe(2);
    expect(bumpReadChapters(0, -1, 100)).toBe(0);
    expect(bumpReadChapters(10, 50, 0)).toBe(60);
  });
});
