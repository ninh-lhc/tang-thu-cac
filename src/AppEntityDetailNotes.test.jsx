import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AppEntityDetailNotes } from './AppEntityDetailNotes.jsx';

function createProps(overrides = {}) {
  return {
    activeTabLon: 'thien-dia-ki-vat',
    activeTabNho: 'dia-danh',
    currentTabConfig: {
      id: 'dia-danh',
      label: 'Bản đồ / Bí cảnh',
      viewType: 'collection-track',
      autoSyncRole: 'ban-do',
      _parentLabel: 'Tài Nguyên',
    },
    getTerms: () => ({ infoDesc: 'Ghi chu chi tiet' }),
    isEntityEditing: true,
    isExtractingAI: false,
    setIsExtractingAI: vi.fn(),
    geminiApiKeys: [],
    showToast: vi.fn(),
    aiMode: 'standard',
    isSplitPreview: false,
    setLivePreviewText: vi.fn(),
    setDebouncedMarkdownPreview: vi.fn(),
    setIsSplitPreview: vi.fn(),
    selectedEntity: {
      id: 'entity-1',
      name: 'Linh Gioi Chau',
      info: 'Linh Gioi Chau xuat hien giua troi.',
    },
    handleUpdateEntityInfo: vi.fn(),
    handleSetSelectedEntityAutoSyncState: vi.fn(),
    setIsEntityEditing: vi.fn(),
    setImageForm: vi.fn(),
    setIsInsertImageModalOpen: vi.fn(),
    handlePickLocalImage: vi.fn(),
    imageFileStemParts: [],
    debouncedMarkdownPreview: '',
    currentContextDirHandle: null,
    entityMap: [{ id: 'entity-1', name: 'Linh Gioi Chau' }],
    globalLinkRegex: null,
    onNavigate: vi.fn(),
    detailNotesMarkdown: 'Linh Gioi Chau xuat hien giua troi.',
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

describe('AppEntityDetailNotes', () => {
  afterEach(() => {
    cleanup();
  });

  it('prefers local wiki wrapping before calling AI', async () => {
    const props = createProps();
    render(<AppEntityDetailNotes {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /Chuẩn hoá AI/i }));

    await vi.waitFor(() => {
      expect(screen.getByRole('textbox').value).toBe('[[Linh Gioi Chau]] xuat hien giua troi.');
    });
    expect(props.setIsExtractingAI).toHaveBeenCalled();
  });

  it('inserts the long-form analysis scaffold from the toolbar', () => {
    const props = createProps();
    render(<AppEntityDetailNotes {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /Khung phân tích/i }));

    expect(screen.getByRole('textbox').value).toContain('[[Linh Gioi Chau]]');
    expect(screen.getByRole('textbox').value).toContain('**1.');
    expect(screen.getByRole('textbox').value).toContain('**2.');
    expect(screen.getByRole('textbox').value).toContain('**3.');
  });

  it('wraps selected text with the chosen color markup', () => {
    const props = createProps({
      selectedEntity: {
        id: 'entity-1',
        name: 'Linh Gioi Chau',
        info: 'Doan mau can to.',
      },
    });
    render(<AppEntityDetailNotes {...props} />);

    const textbox = screen.getByRole('textbox');
    fireEvent.change(textbox, { target: { value: 'Doan mau can to.' } });
    textbox.setSelectionRange(0, 4);

    fireEvent.click(screen.getByRole('button', { name: /^Màu$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Tô màu/i }));

    expect(screen.getByRole('textbox').value).toContain('[color=');
    expect(screen.getByRole('textbox').value).toContain('Doan');
  });

  it('wraps selected text with strikethrough markup from the toolbar', () => {
    const props = createProps({
      selectedEntity: {
        id: 'entity-1',
        name: 'Linh Gioi Chau',
        info: 'Doan mau can gach.',
      },
    });
    render(<AppEntityDetailNotes {...props} />);

    const textbox = screen.getByRole('textbox');
    fireEvent.change(textbox, { target: { value: 'Doan mau can gach.' } });
    textbox.setSelectionRange(0, 4);

    fireEvent.click(screen.getByRole('button', { name: /Gạch ngang/i }));

    expect(screen.getByRole('textbox').value).toBe('~~Doan~~ mau can gach.');
  });

  it('opens the in-app notes guide from the detail header', () => {
    const onOpenEntityNotesGuide = vi.fn();
    const props = createProps({
      isEntityEditing: false,
      onOpenEntityNotesGuide,
    });
    render(<AppEntityDetailNotes {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /Hướng dẫn/i }));

    expect(onOpenEntityNotesGuide).toHaveBeenCalledTimes(1);
  });

  it('switches between original and current profile modes from the header', () => {
    const onChangeDetailProfileMode = vi.fn();
    const props = createProps({
      isEntityEditing: false,
      onChangeDetailProfileMode,
      canViewTimelineCurrentProfile: true,
      timelineCurrentProfileLabel: 'Chuong 88 · Dot pha',
    });
    render(<AppEntityDetailNotes {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /^Hiện tại$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Ban đầu$/i }));

    expect(onChangeDetailProfileMode).toHaveBeenNthCalledWith(1, 'current');
    expect(onChangeDetailProfileMode).toHaveBeenNthCalledWith(2, 'original');
  });

  it('disables the current profile button when timeline has no snapshot view', () => {
    const onChangeDetailProfileMode = vi.fn();
    const props = createProps({
      isEntityEditing: false,
      onChangeDetailProfileMode,
      canViewTimelineCurrentProfile: false,
    });
    render(<AppEntityDetailNotes {...props} />);

    const currentButton = screen.getByRole('button', { name: /^Hiện tại$/i });
    expect(currentButton.hasAttribute('disabled')).toBe(true);

    fireEvent.click(currentButton);
    expect(onChangeDetailProfileMode).not.toHaveBeenCalled();
  });

  it('opens timeline edit instead of entity notes edit while in current mode', () => {
    const onOpenTimelineCurrentEdit = vi.fn();
    const setIsEntityEditing = vi.fn();
    const props = createProps({
      isEntityEditing: false,
      detailProfileMode: 'current',
      canViewTimelineCurrentProfile: true,
      onOpenTimelineCurrentEdit,
      setIsEntityEditing,
    });
    render(<AppEntityDetailNotes {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /Sửa timeline/i }));

    expect(onOpenTimelineCurrentEdit).toHaveBeenCalledTimes(1);
    expect(setIsEntityEditing).not.toHaveBeenCalled();
  });

  it('smart-wraps the current line with the bold pair button', () => {
    const props = createProps({
      selectedEntity: {
        id: 'entity-1',
        name: 'Linh Gioi Chau',
        info: 'Khai quat va dinh vi',
      },
    });
    render(<AppEntityDetailNotes {...props} />);

    const textbox = screen.getByRole('textbox');
    textbox.setSelectionRange(textbox.value.length, textbox.value.length);
    fireEvent.click(screen.getByRole('button', { name: /^\*\*$/ }));

    expect(screen.getByRole('textbox').value).toBe('**Khai quat va dinh vi**');
  });

  it('cleans pasted text before inserting it into the editor', () => {
    const props = createProps({
      selectedEntity: {
        id: 'entity-1',
        name: 'Linh Gioi Chau',
        info: '',
      },
    });
    render(<AppEntityDetailNotes {...props} />);

    const textbox = screen.getByRole('textbox');
    fireEvent.paste(textbox, {
      clipboardData: {
        getData: () => 'Doan   van\nbi xuong dong\u00a0sai.\n\n- y   mot\nvan cung y',
        files: [],
      },
    });

    expect(textbox.value).toBe('Doan van bi xuong dong sai.\n\n- y mot van cung y');
  });

  it('cleans the whole draft when clicking the clean button', async () => {
    const props = createProps({
      selectedEntity: {
        id: 'entity-1',
        name: 'Linh Gioi Chau',
        info: '##   Muc lon \n\n1.  Y dau\nbo sung them',
      },
    });
    render(<AppEntityDetailNotes {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /Chuẩn hoá AI/i }));

    await vi.waitFor(() => {
      expect(screen.getByRole('textbox').value).toBe('## Muc lon\n\n1. Y dau bo sung them');
    });
    expect(props.showToast).toHaveBeenCalled();
  });

  it('auto-normalizes notes before saving when auto-clean is enabled', () => {
    const props = createProps({
      selectedEntity: {
        id: 'entity-1',
        name: 'Linh Gioi Chau',
        info: '##   Muc lon \n\n1.  Y dau\nbo sung them',
      },
    });
    render(<AppEntityDetailNotes {...props} />);

    fireEvent.click(document.getElementById('save-entity-btn'));

    expect(props.handleUpdateEntityInfo).toHaveBeenCalledWith(
      '## Muc lon\n\n1. Y dau bo sung them',
      expect.objectContaining({ wikiLinkOptOuts: [] })
    );
    expect(props.showToast).toHaveBeenCalledTimes(1);
    expect(String(props.showToast.mock.calls[0][0]).toLowerCase()).toContain('lưu');
  });

  it('propagates manual phrase formatting to matching phrases before saving', () => {
    const props = createProps({
      selectedEntity: {
        id: 'entity-1',
        name: 'Linh Gioi Chau',
        info: '## 2. Ban chat suc manh (**Ton Luc**)\n\nTon Luc nam o Ton Luc.',
      },
    });
    render(<AppEntityDetailNotes {...props} />);

    fireEvent.click(document.getElementById('save-entity-btn'));

    expect(props.handleUpdateEntityInfo).toHaveBeenCalledWith(
      '## 2. Ban chat suc manh (**Ton Luc**)\n\n**Ton Luc** nam o **Ton Luc**.',
      expect.objectContaining({ wikiLinkOptOuts: [] })
    );
    expect(props.showToast).toHaveBeenCalledTimes(1);
    expect(String(props.showToast.mock.calls[0][0])).toContain('2');
    expect(String(props.showToast.mock.calls[0][0]).toLowerCase()).toContain('trùng');
  });

  it('lets diagnostics jump from preview toc back to the editor line', () => {
    const info = ['# Muc lon', '', 'Doan mo dau', '', '### Tieu muc', '', '- Y chinh'].join('\n');
    const props = createProps({
      isSplitPreview: true,
      debouncedMarkdownPreview: info,
      selectedEntity: {
        id: 'entity-1',
        name: 'Linh Gioi Chau',
        info,
      },
    });
    render(<AppEntityDetailNotes {...props} />);

    const textbox = screen.getByRole('textbox');
    fireEvent.click(screen.getByRole('button', { name: /Tieu muc/i }));

    expect(document.activeElement).toBe(textbox);
    expect(textbox.selectionStart).toBe(info.indexOf('### Tieu muc'));
  });

  it('renders entity-level AUTO controls and forwards toggle actions', () => {
    const props = createProps({
      isEntityEditing: false,
    });
    render(<AppEntityDetailNotes {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /Xem tùy chỉnh AUTO/i }));
    fireEvent.click(screen.getAllByRole('button', { name: /Tắt riêng/i })[0]);

    expect(props.handleSetSelectedEntityAutoSyncState).toHaveBeenCalledTimes(1);
    expect(props.handleSetSelectedEntityAutoSyncState).toHaveBeenCalledWith('force_map', 'disabled', true);
  });
});
