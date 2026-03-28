import { describe, it, expect } from 'vitest';
import { applyWikiLinkSpots } from './applyWikiLinkSpots.js';

describe('applyWikiLinkSpots', () => {
  it('wraps target with exact before/after context', () => {
    const s = 'Xin chào Linh Tu và mọi người.';
    const out = applyWikiLinkSpots(s, [{ before: 'chào ', target: 'Linh Tu', after: ' và' }]);
    expect(out).toBe('Xin chào [[Linh Tu]] và mọi người.');
  });

  it('preserves spacing and newlines outside wraps', () => {
    const s = 'A  B\nC';
    const out = applyWikiLinkSpots(s, [{ before: '', target: 'A', after: '  ' }]);
    expect(out).toBe('[[A]]  B\nC');
  });

  it('skips already wrapped', () => {
    const s = 'X [[Linh Tu]] Y';
    const out = applyWikiLinkSpots(s, [{ before: 'X ', target: 'Linh Tu', after: ' Y' }]);
    expect(out).toBe(s);
  });

  it('skips target inside existing wiki span', () => {
    const s = '[[Linh Tu và Đạo]]';
    const out = applyWikiLinkSpots(s, [{ before: 'Tu và ', target: 'Đạo', after: ']]' }]);
    expect(out).toBe(s);
  });

  it('drops overlapping second range', () => {
    const s = 'abcdef';
    const out = applyWikiLinkSpots(s, [
      { before: '', target: 'abc', after: 'def' },
      { before: 'a', target: 'bcd', after: 'ef' },
    ]);
    expect(out).toBe('[[abc]]def');
  });

  it('ignores invalid needle', () => {
    const s = 'hello';
    expect(applyWikiLinkSpots(s, [{ before: 'x', target: 'y', after: 'z' }])).toBe(s);
  });
});
