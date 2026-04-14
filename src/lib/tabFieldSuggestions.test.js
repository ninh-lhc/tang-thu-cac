import { describe, expect, it } from 'vitest';
import {
  ensureWikiAliasInFieldsTemplate,
  linesToSuggestionArray,
  normalizeFieldSuggestionLists,
  pruneFieldSuggestionLists,
} from './tabFieldSuggestions.js';

describe('tabFieldSuggestions', () => {
  it('linesToSuggestionArray splits và trim', () => {
    expect(linesToSuggestionArray(' A \n B \n ')).toEqual(['A', 'B']);
  });

  it('ensureWikiAliasInFieldsTemplate giữ f_alias', () => {
    const out = ensureWikiAliasInFieldsTemplate([{ id: 'f_status', label: 'X' }]);
    expect(out.some((f) => f.id === 'f_alias')).toBe(true);
  });

  it('pruneFieldSuggestionLists lọc theo field id', () => {
    const pruned = pruneFieldSuggestionLists(
      { f_status: ['A'], f_removed: ['B'] },
      ['f_status']
    );
    expect(pruned).toEqual({ f_status: ['A'] });
  });

  it('normalizeFieldSuggestionLists bỏ entry rỗng', () => {
    expect(normalizeFieldSuggestionLists({ f_status: ['  ', 'OK'] })).toEqual({ f_status: ['OK'] });
  });
});
