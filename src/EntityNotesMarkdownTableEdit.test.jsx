import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AppEntityDetailNotes } from './AppEntityDetailNotes.jsx';
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
