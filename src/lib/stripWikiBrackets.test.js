import { describe, it, expect } from 'vitest';
import { stripWikiBracketSyntax } from './stripWikiBrackets.js';

describe('stripWikiBracketSyntax', () => {
  it('removes nested wiki brackets', () => {
    expect(stripWikiBracketSyntax('X [[A [[B]]]] Y')).toBe('X A B Y');
  });
  it('returns non-strings as-is', () => {
    expect(stripWikiBracketSyntax(null)).toBe(null);
    expect(stripWikiBracketSyntax(undefined)).toBe(undefined);
  });
});
