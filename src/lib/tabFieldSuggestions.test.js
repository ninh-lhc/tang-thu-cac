import { describe, expect, it } from 'vitest';
import {
  ensureWikiAliasInFieldsTemplate,
  ensureWikiAliasInFieldsTemplateForTab,
  linesToSuggestionArray,
  dedupeCaseInsensitiveLines,
  normalizeFieldSuggestionLists,
  pruneFieldSuggestionLists,
} from './tabFieldSuggestions.js';

describe('tabFieldSuggestions', () => {
  it('linesToSuggestionArray splits và trim', () => {
    expect(linesToSuggestionArray(' A \n B \n ')).toEqual(['A', 'B']);
  });

  it('dedupeCaseInsensitiveLines bỏ trùng không phân biệt hoa thường', () => {
    expect(dedupeCaseInsensitiveLines(['A', 'a', 'B'])).toEqual(['A', 'B']);
  });

  it('ensureWikiAliasInFieldsTemplate giữ f_alias', () => {
    const out = ensureWikiAliasInFieldsTemplate([{ id: 'f_status', label: 'X' }]);
    expect(out.some((f) => f.id === 'f_alias')).toBe(true);
  });

  it('ensureWikiAliasInFieldsTemplateForTab tôn trọng wikiAliasInTemplate: false', () => {
    const out = ensureWikiAliasInFieldsTemplateForTab(
      [{ id: 'f_status', label: 'X' }, { id: 'f_alias', label: 'Wiki' }],
      { wikiAliasInTemplate: false }
    );
    expect(out.some((f) => f.id === 'f_alias')).toBe(false);
    expect(out.some((f) => f.id === 'f_status')).toBe(true);
  });

  it('ensureWikiAliasInFieldsTemplate giữ listMergeOrder hợp lệ', () => {
    const out = ensureWikiAliasInFieldsTemplate([
      { id: 'f_status', label: 'X', listMergeOrder: 2 },
      { id: 'f_title', label: 'Y', listMergeOrder: 1.8 },
    ]);
    expect(out.find((f) => f.id === 'f_status')?.listMergeOrder).toBe(2);
    expect(out.find((f) => f.id === 'f_title')?.listMergeOrder).toBe(1);
  });

  it('ensureWikiAliasInFieldsTemplate giữ sortPrefix nếu có', () => {
    const out = ensureWikiAliasInFieldsTemplate([
      { id: 'f_status', label: 'X', sortPrefix: 'I' },
    ]);
    expect(out.find((f) => f.id === 'f_status')?.sortPrefix).toBe('I');
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
