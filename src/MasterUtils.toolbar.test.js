import { afterEach, describe, expect, it } from 'vitest';
import {
  getEntityNotesToolbarState,
  handleToolbarClick,
  handleToolbarSmartWrap,
  handleToolbarToggleLinePrefix,
  resolveEntityNotesBackspace,
  resolveEntityNotesLineBreak,
  resolveEntityNotesTabIndent,
  resolveEntityNotesWikiBackspace,
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

  it('toggles a wiki link off on the second shortcut press for selected text', () => {
    const textarea = mountEditor('Mai Huyền Sương', 0, 'Mai Huyền Sương'.length);

    handleToolbarClick('__WIKI_TOGGLE__', '', 'entity-info-editor');
    expect(textarea.value).toBe('[[Mai Huyền Sương]]');

    handleToolbarClick('__WIKI_TOGGLE__', '', 'entity-info-editor');
    expect(textarea.value).toBe('Mai Huyền Sương');
  });

  it('toggles a wiki link off on the second shortcut press without a selection', () => {
    const textarea = mountEditor('Mai Huyền Sương');

    handleToolbarClick('__WIKI_TOGGLE__', '', 'entity-info-editor');
    expect(textarea.value).toBe('[[Mai Huyền Sương]]');

    handleToolbarClick('__WIKI_TOGGLE__', '', 'entity-info-editor');
    expect(textarea.value).toBe('Mai Huyền Sương');
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

  it('backspaces one grapheme safely when caret is inside [[wiki]]', () => {
    const text = 'A [[DiệtThiên]] B';
    const caret = text.indexOf(']]');
    const nextState = resolveEntityNotesWikiBackspace(text, caret, caret);

    expect(nextState?.newText).toBe('A [[DiệtThiê]] B');
    expect(nextState?.selStart).toBe(caret - 1);
  });

  it('removes an empty bullet line above a heading without merging the heading', () => {
    const text = '- **Công dụng:** mô tả\n- \n## 4. Sức mạnh';
    const headingStart = text.indexOf('##');
    const nextState = resolveEntityNotesBackspace(text, headingStart, headingStart);

    expect(nextState?.newText).toBe('- **Công dụng:** mô tả\n\n## 4. Sức mạnh');
    expect(nextState?.selStart).toBe(nextState.newText.indexOf('##'));
  });

  it('removes an empty bullet marker when the caret is after the prefix', () => {
    const text = '## Tiêu đề\n- \n- mục dưới';
    const caret = text.indexOf('- \n') + 2;
    const nextState = resolveEntityNotesBackspace(text, caret, caret);

    expect(nextState?.newText).toBe('## Tiêu đề\n\n- mục dưới');
    expect(nextState?.selStart).toBe('## Tiêu đề\n'.length);
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
