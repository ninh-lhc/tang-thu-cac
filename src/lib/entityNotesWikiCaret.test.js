import { describe, expect, it } from 'vitest';
import { isCaretInsideWikiLink } from './entityNotesWikiCaret.js';

describe('isCaretInsideWikiLink', () => {
  it('detects caret inside closed wiki on the same line', () => {
    const line = 'Gap [[Ngo Tri]] sau';
    const inside = line.indexOf('Ngo');
    expect(isCaretInsideWikiLink(line, inside)).toBe(true);
    expect(isCaretInsideWikiLink(line, 0)).toBe(false);
  });

  it('detects caret inside unclosed wiki to end of line', () => {
    const line = '[[Mo dau';
    expect(isCaretInsideWikiLink(line, line.length)).toBe(true);
  });
});
