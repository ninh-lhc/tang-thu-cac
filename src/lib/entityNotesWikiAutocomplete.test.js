import { describe, expect, it } from 'vitest';
import {
  applyWikiAutocompleteSelection,
  buildWikiAutocompleteSuggestions,
  findOpenWikiBracketSession,
} from './entityNotesWikiAutocomplete.js';

describe('entityNotesWikiAutocomplete', () => {
  it('detects open [[ session on current line', () => {
    const text = 'Nhân vật chính là [[Tô';
    const session = findOpenWikiBracketSession(text, text.length);
    expect(session?.query).toBe('Tô');
    expect(session?.triggerStart).toBe(text.indexOf('[['));
  });

  it('returns null when bracket is already closed', () => {
    const text = 'Đã có [[Tô Thần]] rồi';
    expect(findOpenWikiBracketSession(text, 14)).toBeNull();
  });

  it('filters suggestions and adds create row', () => {
    const map = [
      { name: 'Tô Thần', entityId: 'e1', dest: { entityId: 'e1' } },
      { name: 'Tổ Thần', entityId: 'e2', dest: { entityId: 'e2' } },
    ];
    const items = buildWikiAutocompleteSuggestions(map, 'Tô', 'e1');
    expect(items.some((it) => it.name === 'Tô Thần' && it.status === 'self')).toBe(true);
    expect(items.some((it) => it.kind === 'create')).toBe(true);
  });

  it('inserts selected entity without duplicate brackets', () => {
    const text = 'X [[Tô';
    const session = findOpenWikiBracketSession(text, text.length);
    const out = applyWikiAutocompleteSelection(text, session, 'Tô Thần');
    expect(out?.newText).toBe('X [[Tô Thần]]');
  });

  it('escape keeps raw text unchanged', () => {
    const text = 'X [[Tô';
    const session = findOpenWikiBracketSession(text, text.length);
    expect(session?.query).toBe('Tô');
    expect(text).toBe('X [[Tô');
  });
});
