import { describe, expect, it } from 'vitest';
import { stepTableEditGridFocus, tableEditFocusTargetToSelector } from './markdownTableEditGridFocus.js';

describe('markdownTableEditGridFocus', () => {
  it('steps forward through header then body', () => {
    expect(stepTableEditGridFocus({ colCount: 2, rowCount: 1, kind: 'header', col: 0, direction: 'next' })).toEqual({
      kind: 'header',
      col: 1,
    });
    expect(stepTableEditGridFocus({ colCount: 2, rowCount: 1, kind: 'header', col: 1, direction: 'next' })).toEqual({
      kind: 'body',
      row: 0,
      col: 0,
    });
    expect(stepTableEditGridFocus({ colCount: 2, rowCount: 1, kind: 'body', row: 0, col: 1, direction: 'next' })).toEqual({
      kind: 'footer',
    });
  });

  it('steps backward from body to header', () => {
    expect(stepTableEditGridFocus({ colCount: 2, rowCount: 1, kind: 'body', row: 0, col: 0, direction: 'prev' })).toEqual({
      kind: 'header',
      col: 1,
    });
  });

  it('maps targets to cell selectors', () => {
    expect(tableEditFocusTargetToSelector({ kind: 'header', col: 0 })).toBe('[data-table-edit-cell="header-0"]');
    expect(tableEditFocusTargetToSelector({ kind: 'body', row: 2, col: 1 })).toBe(
      '[data-table-edit-cell="body-2-1"]',
    );
    expect(tableEditFocusTargetToSelector({ kind: 'footer' })).toContain('apply');
  });
});
