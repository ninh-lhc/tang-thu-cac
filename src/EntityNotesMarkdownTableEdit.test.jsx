import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AppEntityDetailNotes } from './AppEntityDetailNotes.jsx';
import { EntityNotesMarkdownTableEditModal } from './EntityNotesMarkdownTableEditModal.jsx';
import { ModalMilestone } from './MasterComponents.jsx';
import { buildFullSixRowNotebookTablePaste } from './lib/notebookTablePasteFixture.js';

function entityNotesProps(overrides = {}) {
  return {
    activeTabLon: 'thien-dia-ki-vat',
    activeTabNho: 'dia-danh',
    currentTabConfig: { id: 'dia-danh', label: 'Test', viewType: 'collection-track', _parentLabel: 'Tài Nguyên' },
    getTerms: () => ({ infoDesc: 'Ghi chu' }),
    isEntityEditing: true,
    isExtractingAI: false,
    setIsExtractingAI: vi.fn(),
    geminiApiKeys: [],
    showToast: vi.fn(),
    aiMode: 'standard',
    isSplitPreview: true,
    setLivePreviewText: vi.fn(),
    setDebouncedMarkdownPreview: vi.fn(),
    setIsSplitPreview: vi.fn(),
    selectedEntity: { id: 'e1', name: 'Test', info: '' },
    handleUpdateEntityInfo: vi.fn(),
    handleSetSelectedEntityAutoSyncState: vi.fn(),
    setIsEntityEditing: vi.fn(),
    setImageForm: vi.fn(),
    setIsInsertImageModalOpen: vi.fn(),
    handlePickLocalImage: vi.fn(),
    imageFileStemParts: [],
    debouncedMarkdownPreview: '',
    currentContextDirHandle: null,
    entityMap: [],
    globalLinkRegex: null,
    onNavigate: vi.fn(),
    detailNotesMarkdown: '',
    entityFilterFields: [],
    notesTabFieldBuckets: [],
    AdvancedFieldSelect: null,
    onOpenAutoSyncGuide: null,
    onOpenEntityNotesGuide: null,
    detailProfileMode: 'original',
    onChangeDetailProfileMode: vi.fn(),
    canViewTimelineCurrentProfile: false,
    timelineCurrentProfileLabel: '',
    onOpenTimelineCurrentEdit: vi.fn(),
    ...overrides,
  };
}

afterEach(() => cleanup());

describe('EntityNotesMarkdownTableEdit', () => {
  it('renders wide modal shell, grid scroll region, and sticky footer for five columns', () => {
    render(
      <EntityNotesMarkdownTableEditModal
        isOpen
        tableBlock={{
          header: ['C1', 'C2', 'C3', 'C4', 'C5'],
          aligns: ['left', 'left', 'left', 'left', 'left'],
          rows: [['a', 'b', 'c', 'd', 'e']],
        }}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(document.body.querySelector('[data-testid="entity-notes-table-edit-modal-overlay"]')).not.toBeNull();
    const panel = screen.getByTestId('entity-notes-table-edit-modal-panel');
    expect(panel.className).toContain('1880px');
    expect(panel.className).toMatch(/92dvh|92vh/);
    expect(panel.className).toContain('min-w-0');
    const header = screen.getByTestId('entity-notes-table-edit-header');
    const gridScroll = screen.getByTestId('entity-notes-table-edit-grid-scroll');
    expect(panel.contains(header)).toBe(true);
    expect(header.contains(gridScroll)).toBe(false);
    expect(gridScroll.className).toContain('min-h-0');
    expect(gridScroll.className).toContain('min-w-0');
    expect(gridScroll.className).toContain('overflow-x-auto');
    expect(gridScroll.className).toContain('overflow-y-auto');
    expect(gridScroll.className).toContain('isolate');
    expect(gridScroll.className).toMatch(/pt-0/);
    expect(gridScroll.className).not.toMatch(/\bpy-3\b/);
    const footer = screen.getByTestId('entity-notes-table-edit-footer');
    expect(gridScroll.contains(footer)).toBe(false);
    expect(panel.contains(gridScroll)).toBe(true);
    expect(panel.contains(footer)).toBe(true);
    expect(screen.getByTestId('entity-notes-table-edit-modal-overlay').className).toContain('overflow-x-hidden');
    expect(footer.className).toMatch(/shrink-0/);
    expect(footer.contains(screen.getByRole('button', { name: 'Hủy' }))).toBe(true);
    expect(footer.contains(screen.getByRole('button', { name: 'Áp dụng' }))).toBe(true);
    expect(screen.getAllByLabelText(/Tiêu đề cột/i)).toHaveLength(5);
    expect(screen.getAllByLabelText(/Ô hàng/i)).toHaveLength(5);
    expect(document.querySelector('.markdown-table-wiki-overlay')).toBeTruthy();
    const table = screen.getByTestId('entity-notes-table-edit-grid-table');
    expect(table.style.minWidth).toMatch(/70rem/);
    expect(table.className).toContain('w-full');
    const th = document.querySelector('.entity-notes-table-edit-th');
    expect(th?.className).toContain('sticky');
    expect(th?.className).toContain('top-0');
    expect(th?.className).toContain('z-30');
    expect(document.querySelector('thead[data-testid="entity-notes-table-edit-thead"]')?.className).toContain(
      '[position:static]',
    );
    expect(document.querySelector('.entity-notes-table-edit-td')?.className).toContain('isolate');
    expect(th?.className).toContain('bg-slate-950');
    expect(th?.className).not.toContain('backdrop-blur');
    expect(document.querySelector('thead[data-testid="entity-notes-table-edit-thead"]')).not.toBeNull();
    expect(screen.getByTestId('entity-notes-table-edit-meta').textContent).toBe('5 cột · 1 hàng');
  });

  it('shows table index in modal metadata when tableIndex is provided', () => {
    render(
      <EntityNotesMarkdownTableEditModal
        isOpen
        tableIndex={1}
        tableBlock={{
          header: ['A', 'B'],
          aligns: ['left', 'left'],
          rows: [['1', '2']],
        }}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId('entity-notes-table-edit-meta').textContent).toBe('Bảng 2 · 2 cột · 1 hàng');
  });

  it('Tab moves focus to the next grid cell', () => {
    render(
      <EntityNotesMarkdownTableEditModal
        isOpen
        tableBlock={{
          header: ['A', 'B'],
          aligns: ['left', 'left'],
          rows: [['1', '2']],
        }}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const first = screen.getByLabelText('Tiêu đề cột 1');
    first.focus();
    fireEvent.keyDown(first, { key: 'Tab', code: 'Tab' });
    expect(document.activeElement).toBe(screen.getByLabelText('Tiêu đề cột 2'));
    fireEvent.keyDown(document.activeElement, { key: 'Tab', code: 'Tab' });
    expect(document.activeElement).toBe(screen.getByLabelText('Ô hàng 1 cột 1'));
  });

  it('Shift+Tab moves focus to the previous grid cell', () => {
    render(
      <EntityNotesMarkdownTableEditModal
        isOpen
        tableBlock={{
          header: ['A', 'B'],
          aligns: ['left', 'left'],
          rows: [['1', '2']],
        }}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const bodyCell = screen.getByLabelText('Ô hàng 1 cột 1');
    bodyCell.focus();
    fireEvent.keyDown(bodyCell, { key: 'Tab', shiftKey: true, code: 'Tab' });
    expect(document.activeElement).toBe(screen.getByLabelText('Tiêu đề cột 2'));
  });

  it('Ctrl+Enter applies table from a cell', () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    render(
      <EntityNotesMarkdownTableEditModal
        isOpen
        tableBlock={{
          header: ['A', 'B'],
          aligns: ['left', 'left'],
          rows: [['1', '2']],
        }}
        onApply={onApply}
        onClose={onClose}
      />,
    );
    const cell = screen.getByLabelText('Ô hàng 1 cột 1');
    fireEvent.change(cell, { target: { value: '9' } });
    fireEvent.keyDown(cell, { key: 'Enter', ctrlKey: true });
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Enter without modifier still inserts newline in cell', () => {
    render(
      <EntityNotesMarkdownTableEditModal
        isOpen
        tableBlock={{
          header: ['A'],
          aligns: ['left'],
          rows: [['line']],
        }}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const cell = screen.getByLabelText('Ô hàng 1 cột 1');
    fireEvent.change(cell, { target: { value: 'a\nb' } });
    expect(cell.value).toBe('a\nb');
  });

  it('Escape closes modal via cell key handler', () => {
    const onClose = vi.fn();
    render(
      <EntityNotesMarkdownTableEditModal
        isOpen
        tableBlock={{
          header: ['A'],
          aligns: ['left'],
          rows: [['1']],
        }}
        onApply={vi.fn()}
        onClose={onClose}
      />,
    );
    fireEvent.keyDown(screen.getByLabelText('Ô hàng 1 cột 1'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('modal panel uses flex column with bounded height for long grids', () => {
    const rows = Array.from({ length: 24 }, (_, i) => [`row-${i}`, 'b']);
    render(
      <EntityNotesMarkdownTableEditModal
        isOpen
        tableBlock={{
          header: ['A', 'B'],
          aligns: ['left', 'left'],
          rows,
        }}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const panel = screen.getByTestId('entity-notes-table-edit-modal-panel');
    expect(panel.className).toContain('flex-col');
    expect(panel.className).toContain('overflow-hidden');
    expect(screen.getByTestId('entity-notes-table-edit-footer')).toBeTruthy();
  });

  it('allows horizontal scroll for many-column tables via min-width', () => {
    const headers = Array.from({ length: 10 }, (_, i) => `C${i + 1}`);
    render(
      <EntityNotesMarkdownTableEditModal
        isOpen
        tableBlock={{
          header: headers,
          aligns: headers.map(() => 'left'),
          rows: [headers.map((h) => h.toLowerCase())],
        }}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const table = screen.getByTestId('entity-notes-table-edit-grid-table');
    expect(table.style.minWidth).toMatch(/140rem/);
    expect(screen.getByTestId('entity-notes-table-edit-grid-scroll').className).toMatch(/overflow-x-auto/);
  });

  it('opens grid, cancels without changing source', async () => {
    const table = ['| A | B |', '|---|---|', '| 1 | 2 |'].join('\n');
    function Harness() {
      const [preview, setPreview] = React.useState(table);
      return (
        <AppEntityDetailNotes
          {...entityNotesProps({
            selectedEntity: { id: 'e1', name: 'T', info: table },
            debouncedMarkdownPreview: preview,
            setDebouncedMarkdownPreview: setPreview,
          })}
        />
      );
    }
    render(<Harness />);
    fireEvent.click(screen.getByTestId('edit-md-table-0'));
    expect(screen.getByRole('dialog', { name: /Chỉnh sửa bảng Markdown/i })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Ô hàng 1 cột 1'), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(screen.getByRole('textbox').value).toBe(table);
  });

  it('shows wiki highlight in modal cell while editing', async () => {
    const table = ['| Giai đoạn | Kỹ năng |', '|---|---|', '| Hắc | [[Triệu Hồi]] |'].join('\n');
    function Harness() {
      const [preview, setPreview] = React.useState(table);
      return (
        <AppEntityDetailNotes
          {...entityNotesProps({
            selectedEntity: { id: 'e1', name: 'T', info: table },
            debouncedMarkdownPreview: preview,
            setDebouncedMarkdownPreview: setPreview,
          })}
        />
      );
    }
    render(<Harness />);
    fireEvent.click(screen.getByTestId('edit-md-table-0'));
    await vi.waitFor(() => {
      expect(document.querySelector('.markdown-table-wiki-link')).toBeTruthy();
    });
    expect(screen.getByLabelText('Ô hàng 1 cột 2').value.trim()).toBe('[[Triệu Hồi]]');
  });

  it('applies cell edit with multiline br and supports undo', async () => {
    const table = ['| Giai đoạn | Kỹ năng |', '|---|---|', '| Hắc | [[A]] |'].join('\n');
    function Harness() {
      const [preview, setPreview] = React.useState(table);
      return (
        <AppEntityDetailNotes
          {...entityNotesProps({
            selectedEntity: { id: 'e1', name: 'T', info: table },
            debouncedMarkdownPreview: preview,
            setDebouncedMarkdownPreview: setPreview,
          })}
        />
      );
    }
    render(<Harness />);
    fireEvent.click(screen.getByTestId('edit-md-table-0'));
    const cell = screen.getByLabelText('Ô hàng 1 cột 2');
    fireEvent.change(cell, { target: { value: '[[A]]\nKhung xương\nĐại đao' } });
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));
    await waitFor(() => {
      expect(screen.getByRole('textbox').value).toMatch(/<br>Khung xương<br>Đại đao/);
    });
    expect(screen.getByRole('textbox').value).toContain('[[A]]');
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'z', ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByRole('textbox').value).toBe(table);
    });
  });

  it('edits only table A when two tables exist', async () => {
    const doc = [
      'Heading',
      '',
      '| A | B |',
      '|---|---|',
      '| 1 | 2 |',
      '',
      '| X | Y |',
      '|---|---|',
      '| 9 | 8 |',
    ].join('\n');
    function Harness() {
      const [preview, setPreview] = React.useState(doc);
      return (
        <AppEntityDetailNotes
          {...entityNotesProps({
            selectedEntity: { id: 'e1', name: 'T', info: doc },
            debouncedMarkdownPreview: preview,
            setDebouncedMarkdownPreview: setPreview,
          })}
        />
      );
    }
    render(<Harness />);
    fireEvent.click(screen.getByTestId('edit-md-table-0'));
    fireEvent.change(screen.getByLabelText('Ô hàng 1 cột 1'), { target: { value: 'one' } });
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));
    await waitFor(() => {
      const v = screen.getByRole('textbox').value;
      expect(v).toContain('| one | 2 |');
      expect(v).toContain('| 9 | 8 |');
      expect(v).toContain('Heading');
    });
  });

  it('works in milestone preview after save payload shape', async () => {
    localStorage.setItem('tangthu_entity_notes_auto_wrap_wiki_on_save_v1', '0');
    const pastePlain = buildFullSixRowNotebookTablePaste();
    const onSave = vi.fn();
    const { getByTestId, getByRole, unmount } = render(
      <ModalMilestone
        isOpen
        onClose={vi.fn()}
        onSave={onSave}
        initialData={{ id: 'ms-1', chapter: '1', title: 'T', event: pastePlain, snapshot: { avatar: '', dynamicData: {} } }}
        tabConfig={{}}
        onUpdateTemplate={vi.fn()}
        handleAvatarDrop={vi.fn()}
        handlePickLocalImage={vi.fn()}
        dirHandle={null}
        parentTabId="nhan-vat"
        parentLabel="NV"
        geminiApiKey={[]}
        geminiMode="standard"
        entityMap={[]}
        showToast={vi.fn()}
      />,
    );
    const root = getByTestId('modal-milestone-root');
    fireEvent.click(getByRole('button', { name: /^Preview$/i }));
    fireEvent.click(getByTestId('edit-md-table-0'));
    fireEvent.change(screen.getByLabelText('Ô hàng 1 cột 2'), {
      target: { value: '[[Triệu Hồi Khô Lâu Chiến Sĩ]]\nThêm dòng' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));
    await waitFor(() => {
      expect(root.querySelector('textarea#milestone-event-editor').value).toMatch(/Thêm dòng/);
    });
    unmount();
  });
});
