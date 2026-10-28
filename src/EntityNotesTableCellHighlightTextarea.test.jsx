import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { EntityNotesTableCellHighlightTextarea } from './EntityNotesTableCellHighlightTextarea.jsx';
import { MARKDOWN_TABLE_WIKI_LINK_CLASS } from './lib/entityNotesEditorWikiHighlight.js';

afterEach(() => cleanup());

describe('EntityNotesTableCellHighlightTextarea', () => {
  it('renders wiki-link tokens in highlight overlay without changing textarea value', () => {
    function Harness() {
      const [v, setV] = React.useState('Trước [[Wiki A]] và [[Wiki B]] sau');
      return <EntityNotesTableCellHighlightTextarea value={v} onChange={(e) => setV(e.target.value)} ariaLabel="cell" />;
    }
    render(<Harness />);
    const overlay = screen.getByTestId('markdown-table-wiki-overlay');
    expect(overlay.className).toContain('pointer-events-none');
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
    expect(overlay.innerHTML).toContain('markdown-table-wiki-link');
    expect(overlay.innerHTML).toContain('[[Wiki A]]');
    expect(screen.getByLabelText('cell').value).toBe('Trước [[Wiki A]] và [[Wiki B]] sau');
  });

  it('shows visible text on textarea while focused for accurate caret', () => {
    render(
      <EntityNotesTableCellHighlightTextarea value="[[Wiki]] tail" onChange={vi.fn()} ariaLabel="cell" />,
    );
    const ta = screen.getByLabelText('cell');
    const wrapper = screen.getByTestId('markdown-table-cell-highlight');
    expect(wrapper.getAttribute('data-cell-focused')).toBe('false');
    fireEvent.focus(ta);
    expect(wrapper.getAttribute('data-cell-focused')).toBe('true');
    expect(ta.className).toContain('text-slate-200');
    expect(ta.style.WebkitTextFillColor).not.toBe('transparent');
    const overlay = screen.getByTestId('markdown-table-wiki-overlay');
    expect(overlay.className).toContain('opacity-0');
    fireEvent.blur(ta);
    expect(ta.className).toContain('text-transparent');
  });

  it('updates highlight when wiki-link is removed', () => {
    function Harness() {
      const [v, setV] = React.useState('[[X]]');
      return <EntityNotesTableCellHighlightTextarea value={v} onChange={(e) => setV(e.target.value)} ariaLabel="cell" />;
    }
    render(<Harness />);
    const ta = screen.getByLabelText('cell');
    fireEvent.change(ta, { target: { value: 'plain only' } });
    expect(ta.value).toBe('plain only');
    expect(screen.getByTestId('markdown-table-cell-highlight').getAttribute('data-has-wiki')).toBe('false');
  });

  it('marks data-has-wiki when cell contains wiki syntax', () => {
    render(
      <EntityNotesTableCellHighlightTextarea
        value="[[Triệu Hồi Khô Lâu Chiến Sĩ]]"
        onChange={vi.fn()}
        ariaLabel="cell"
      />,
    );
    expect(screen.getByTestId('markdown-table-cell-highlight').getAttribute('data-has-wiki')).toBe('true');
    expect(MARKDOWN_TABLE_WIKI_LINK_CLASS).toContain('markdown-table-wiki-link');
    expect(MARKDOWN_TABLE_WIKI_LINK_CLASS).not.toContain('border-b');
  });

  it('textarea and overlay share the same padding-right gutter style', () => {
    render(<EntityNotesTableCellHighlightTextarea value="line" onChange={vi.fn()} ariaLabel="cell" />);
    const ta = screen.getByLabelText('cell');
    const overlay = screen.getByTestId('markdown-table-wiki-overlay');
    expect(ta.style.paddingRight).toBe(overlay.style.paddingRight);
    expect(ta.style.paddingRight).toContain('5px');
  });
});
