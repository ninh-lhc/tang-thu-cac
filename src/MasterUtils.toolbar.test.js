import { afterEach, describe, expect, it } from 'vitest';
import {
  getEntityNotesToolbarState,
  handleToolbarSmartWrap,
  handleToolbarToggleLinePrefix,
  resolveEntityNotesBackspace,
  resolveEntityNotesLineBreak,
  resolveEntityNotesTabIndent,
} from './MasterUtils.jsx';

function mountEditor(value, selectionStart = value.length, selectionEnd = selectionStart) {
  const textarea = document.createElement('textarea');
  textarea.id = 'entity-info-editor';
  document.body.appendChild(textarea);
  textarea.value = value;
  textarea.focus();
  textarea.setSelectionRange(selectionStart, selectionEnd);
  return textarea;
}

describe('toolbar helpers', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('increments ordered prefixes based on the previous numbered line', () => {
    const initial = '1. Muc dau\n';
    const textarea = mountEditor(initial);

    handleToolbarToggleLinePrefix('entity-info-editor', '1. ');

    expect(textarea.value).toBe('1. Muc dau\n2. ');
  });

  it('smart-wraps the current line with bold markers when nothing is selected', () => {
    const textarea = mountEditor('Khai quat va dinh vi');

    handleToolbarSmartWrap('**', 'entity-info-editor');

    expect(textarea.value).toBe('**Khai quat va dinh vi**');
  });

  it('smart-wraps selected text with strikethrough markers', () => {
    const textarea = mountEditor('Doan can gach', 0, 4);

    handleToolbarSmartWrap('~~', 'entity-info-editor');

    expect(textarea.value).toBe('~~Doan~~ can gach');
  });

  it('detects inline and line-level toolbar states from the editor context', () => {
    const state = getEntityNotesToolbarState('## Tieu de\n- ~~Muc~~', '## Tieu de\n- ~~'.length, '## Tieu de\n- ~~Muc'.length);

    expect(state.heading2).toBe(false);
    expect(state.bullet).toBe(true);
    expect(state.strikethrough).toBe(true);
  });

  it('detects quote and ordered states on the current line', () => {
    const orderedState = getEntityNotesToolbarState('1. Muc dau', 4, 4);
    const quoteState = getEntityNotesToolbarState('> Trich dan', 3, 3);

    expect(orderedState.ordered).toBe(true);
    expect(quoteState.quote).toBe(true);
  });

  it('continues ordered lists on Enter with the next number', () => {
    const nextState = resolveEntityNotesLineBreak('1. Muc dau', '1. Muc dau'.length, '1. Muc dau'.length);

    expect(nextState?.newText).toBe('1. Muc dau\n2. ');
  });

  it('exits an empty bullet line on Enter', () => {
    const nextState = resolveEntityNotesLineBreak('- ', 2, 2);

    expect(nextState?.newText).toBe('');
    expect(nextState?.selStart).toBe(0);
  });

  it('removes an empty ordered prefix on Backspace', () => {
    const nextState = resolveEntityNotesBackspace('2. ', 3, 3);

    expect(nextState?.newText).toBe('');
    expect(nextState?.selStart).toBe(0);
  });

  it('indents list lines with Tab behavior', () => {
    const nextState = resolveEntityNotesTabIndent('- Muc 1\n- Muc 2', 0, '- Muc 1\n- Muc 2'.length);

    expect(nextState?.newText).toBe('  - Muc 1\n  - Muc 2');
  });

  it('outdents list lines with Shift+Tab behavior', () => {
    const nextState = resolveEntityNotesTabIndent('  - Muc 1', 0, '  - Muc 1'.length, { outdent: true });

    expect(nextState?.newText).toBe('- Muc 1');
  });
});
