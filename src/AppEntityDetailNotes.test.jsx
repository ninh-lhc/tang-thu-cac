import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AppEntityDetailNotes } from './AppEntityDetailNotes.jsx';
import { buildFullSixRowNotebookTablePaste } from './lib/notebookTablePasteFixture.js';

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
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('prefers local wiki wrapping before calling AI', async () => {
    const props = createProps();
    render(<AppEntityDetailNotes {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /Bọc link wiki/i }));

    await vi.waitFor(() => {
      expect(screen.getByRole('textbox').value).toBe('[[Linh Gioi Chau]] xuat hien giua troi.');
    });
    expect(props.setIsExtractingAI).toHaveBeenCalled();
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

  it('toggles wiki wrapping with Ctrl+G while the notes editor is focused', () => {
    const props = createProps({
      selectedEntity: {
        id: 'entity-1',
        name: 'Mai Huyền Sương',
        info: 'Mai Huyền Sương',
      },
    });
    render(<AppEntityDetailNotes {...props} />);

    const textbox = screen.getByRole('textbox');
    textbox.focus();
    textbox.setSelectionRange(0, textbox.value.length);
    fireEvent.keyDown(document, { key: 'g', ctrlKey: true });
    expect(textbox.value).toBe('[[Mai Huyền Sương]]');

    fireEvent.keyDown(document, { key: 'g', ctrlKey: true });
    expect(textbox.value).toBe('Mai Huyền Sương');
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

  it('pastes multiline cell table and preview renders HTML table', async () => {
    function NotesWithPreview() {
      const [preview, setPreview] = React.useState('');
      return (
        <AppEntityDetailNotes
          {...createProps({
            isSplitPreview: true,
            selectedEntity: { id: 'entity-1', name: 'Test', info: '' },
            debouncedMarkdownPreview: preview,
            setDebouncedMarkdownPreview: setPreview,
          })}
        />
      );
    }
    render(<NotesWithPreview />);

    const tablePaste = [
      '| Giai đoạn | Cấp độ | Kỹ năng |',
      '|---|---|---|',
      '| Hắc Thiết | Cấp 1–9:',
      '[[Linh Gioi Chau]] | Nội dung |',
    ].join('\n');

    const textbox = screen.getByRole('textbox');
    fireEvent.paste(textbox, {
      clipboardData: {
        getData: (type) => (type === 'text/plain' ? tablePaste : ''),
        files: [],
      },
    });

    expect(textbox.value).toContain('[[Linh Gioi Chau]]');
    await vi.waitFor(() => {
      expect(document.querySelector('.entity-notes-md-table')).not.toBeNull();
    });
  });

  it('pastes markdown tables as canonical GFM for preview rendering', async () => {
    function NotesWithPreview() {
      const [preview, setPreview] = React.useState('');
      return (
        <AppEntityDetailNotes
          {...createProps({
            isSplitPreview: true,
            selectedEntity: { id: 'entity-1', name: 'Test', info: '' },
            debouncedMarkdownPreview: preview,
            setDebouncedMarkdownPreview: setPreview,
          })}
        />
      );
    }
    render(<NotesWithPreview />);

    const tablePaste = [
      '| Giai đoạn | Kỹ năng |',
      '|---|---|',
      '| Cấp 1 | [[Linh Gioi Chau]] |',
    ].join('\n');

    const textbox = screen.getByRole('textbox');
    fireEvent.paste(textbox, {
      clipboardData: {
        getData: (type) => (type === 'text/plain' ? tablePaste : ''),
        files: [],
      },
    });

    expect(textbox.value).toContain('[[Linh Gioi Chau]]');
    expect(textbox.value).toMatch(/^\| Giai đoạn \| Kỹ năng \|/m);
    await vi.waitFor(() => {
      expect(document.querySelector('.entity-notes-md-table')).not.toBeNull();
    });
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

    fireEvent.click(screen.getByRole('button', { name: /Tự làm sạch/i }));

    await vi.waitFor(() => {
      expect(screen.getByRole('textbox').value).toBe('## Muc lon\n\n1. Y dau bo sung them');
    });
    await vi.waitFor(() => {
      expect(props.showToast).toHaveBeenCalled();
    });
  });

  it('keeps full pasted table in preview after save and reopen', async () => {
    localStorage.setItem('tangthu_entity_notes_auto_wrap_wiki_on_save_v1', '0');
    const pastePlain = buildFullSixRowNotebookTablePaste();
    const savedRef = { text: '' };

    function EditSession({ info, preview, setPreview, onSave }) {
      return (
        <AppEntityDetailNotes
          {...createProps({
            isSplitPreview: true,
            selectedEntity: { id: 'entity-1', name: 'Test', info },
            debouncedMarkdownPreview: preview,
            setDebouncedMarkdownPreview: setPreview,
            handleUpdateEntityInfo: onSave,
          })}
        />
      );
    }

    function PasteAndSave() {
      const [preview, setPreview] = React.useState('');
      return (
        <EditSession
          info=""
          preview={preview}
          setPreview={setPreview}
          onSave={(text) => {
            savedRef.text = text;
          }}
        />
      );
    }

    const { unmount } = render(<PasteAndSave />);
    const textbox = screen.getByRole('textbox');
    fireEvent.paste(textbox, {
      clipboardData: {
        getData: (type) => (type === 'text/plain' ? pastePlain : ''),
        files: [],
      },
    });

    await vi.waitFor(() => {
      expect(document.querySelector('.entity-notes-md-table')).not.toBeNull();
    });
    expect(screen.getByRole('textbox').value).toContain('[[Bách Khoa Tu Tiên]]');

    fireEvent.click(document.getElementById('save-entity-btn'));
    await vi.waitFor(() => expect(savedRef.text.length).toBeGreaterThan(0));
    expect(savedRef.text).toContain('# Bảng kỹ năng');
    expect(savedRef.text).not.toMatch(/\[\[\[\[/);
    unmount();

    function ReopenPreview() {
      const [preview, setPreview] = React.useState(savedRef.text);
      return (
        <EditSession
          info={savedRef.text}
          preview={preview}
          setPreview={setPreview}
          onSave={vi.fn()}
        />
      );
    }

    render(<ReopenPreview />);
    await vi.waitFor(() => {
      expect(document.querySelector('.entity-notes-md-table')).not.toBeNull();
    });
    const previewRoot = document.querySelector('.entity-notes-md-table')?.closest('[class*="overflow"]') ?? document.body;
    expect(previewRoot.textContent).not.toMatch(/\|\s*:---/);
    expect(document.body.textContent).toMatch(/Bách Khoa Tu Tiên|Triệu Hồi/);
  });

  function pressCtrlG() {
    fireEvent.keyDown(document, { key: 'g', ctrlKey: true });
  }

  function detailProps(info, extra = {}) {
    return createProps({
      entityMap: [
        { id: 'lam', name: 'Lâm Mặc Ngữ' },
        { id: 'tu', name: 'Tử Linh Pháp Sư' },
      ],
      selectedEntity: {
        id: 'entity-1',
        name: 'Lâm Mặc Ngữ',
        info,
        wikiLinkOptOuts: extra.wikiLinkOptOuts || [],
      },
      detailNotesMarkdown: info,
      ...extra.overrides,
    });
  }

  it('keeps a Ctrl+G unwrap as plain text after save', async () => {
    const info = '[[Lâm Mặc Ngữ]]';
    const props = detailProps(info);
    render(<AppEntityDetailNotes {...props} />);
    const textbox = screen.getByRole('textbox');
    textbox.focus();
    textbox.setSelectionRange(2, 2 + 'Lâm Mặc Ngữ'.length);
    pressCtrlG();
    expect(textbox.value).toBe('Lâm Mặc Ngữ');

    fireEvent.click(document.getElementById('save-entity-btn'));
    await vi.waitFor(() => {
      expect(props.handleUpdateEntityInfo).toHaveBeenCalledWith(
        'Lâm Mặc Ngữ',
        expect.objectContaining({
          wikiLinkOptOuts: [expect.objectContaining({ anchor: 'Lâm Mặc Ngữ' })],
        })
      );
    });
  });

  it('rewraps a wiki link removed by an ordinary edit when auto-wrap is on', async () => {
    const props = detailProps('[[Lâm Mặc Ngữ]]');
    render(<AppEntityDetailNotes {...props} />);
    const textbox = screen.getByRole('textbox');
    fireEvent.change(textbox, { target: { value: 'Lâm Mặc Ngữ' } });
    expect(textbox.value).toBe('Lâm Mặc Ngữ');

    fireEvent.click(document.getElementById('save-entity-btn'));
    await vi.waitFor(() => {
      expect(props.handleUpdateEntityInfo).toHaveBeenCalledWith(
        '[[Lâm Mặc Ngữ]]',
        expect.objectContaining({ wikiLinkOptOuts: [] })
      );
    });
  });

  it('keeps a Ctrl+G wrap after save', async () => {
    const props = detailProps('Lâm Mặc Ngữ');
    render(<AppEntityDetailNotes {...props} />);
    const textbox = screen.getByRole('textbox');
    textbox.focus();
    textbox.setSelectionRange(0, textbox.value.length);
    pressCtrlG();
    expect(textbox.value).toBe('[[Lâm Mặc Ngữ]]');

    fireEvent.click(document.getElementById('save-entity-btn'));
    await vi.waitFor(() => {
      expect(props.handleUpdateEntityInfo).toHaveBeenCalledWith(
        '[[Lâm Mặc Ngữ]]',
        expect.objectContaining({ wikiLinkOptOuts: [] })
      );
    });
  });

  it('clears the opt-out when Ctrl+G wraps a link again before save', async () => {
    const props = detailProps('[[Lâm Mặc Ngữ]]');
    render(<AppEntityDetailNotes {...props} />);
    const textbox = screen.getByRole('textbox');
    textbox.focus();
    textbox.setSelectionRange(2, 2 + 'Lâm Mặc Ngữ'.length);
    pressCtrlG();
    expect(textbox.value).toBe('Lâm Mặc Ngữ');
    textbox.setSelectionRange(0, textbox.value.length);
    pressCtrlG();
    expect(textbox.value).toBe('[[Lâm Mặc Ngữ]]');

    fireEvent.click(document.getElementById('save-entity-btn'));
    await vi.waitFor(() => {
      expect(props.handleUpdateEntityInfo).toHaveBeenCalledWith(
        '[[Lâm Mặc Ngữ]]',
        expect.objectContaining({ wikiLinkOptOuts: [] })
      );
    });
  });

  it('keeps existing wiki links unchanged on save', async () => {
    const info = '[[Tử Linh Pháp Sư]] của [[Lâm Mặc Ngữ]]';
    const props = detailProps(info);
    render(<AppEntityDetailNotes {...props} />);
    fireEvent.click(document.getElementById('save-entity-btn'));
    await vi.waitFor(() => {
      expect(props.handleUpdateEntityInfo).toHaveBeenCalledWith(
        info,
        expect.objectContaining({ wikiLinkOptOuts: [] })
      );
    });
  });

  it('does not auto-wrap plain text when the wiki auto-wrap preference is off', async () => {
    localStorage.setItem('tangthu_entity_notes_auto_wrap_wiki_on_save_v1', '0');
    const props = detailProps('Lâm Mặc Ngữ');
    render(<AppEntityDetailNotes {...props} />);
    fireEvent.click(document.getElementById('save-entity-btn'));
    await vi.waitFor(() => {
      expect(props.handleUpdateEntityInfo).toHaveBeenCalledWith(
        'Lâm Mặc Ngữ',
        expect.objectContaining({ wikiLinkOptOuts: [] })
      );
    });
  });

  it('auto-wraps matching entity names into wiki links when saving', () => {
    const props = createProps({
      entityMap: [{ name: 'Linh Gioi Chau', dest: { entityId: 'entity-1' } }],
      selectedEntity: {
        id: 'entity-1',
        name: 'Linh Gioi Chau',
        info: 'Linh Gioi Chau xuat hien giua troi.',
      },
    });
    render(<AppEntityDetailNotes {...props} />);

    fireEvent.click(document.getElementById('save-entity-btn'));

    return vi.waitFor(() => {
      expect(props.handleUpdateEntityInfo).toHaveBeenCalledWith(
        '[[Linh Gioi Chau]] xuat hien giua troi.',
        expect.objectContaining({ wikiLinkOptOuts: [] })
      );
    });
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

    return vi.waitFor(() => {
      expect(props.handleUpdateEntityInfo).toHaveBeenCalledWith(
        '## Muc lon\n\n1. Y dau bo sung them',
        expect.objectContaining({ wikiLinkOptOuts: [] })
      );
      expect(props.showToast).toHaveBeenCalled();
      expect(String(props.showToast.mock.calls.at(-1)?.[0] || '').toLowerCase()).toContain('lưu');
    });
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

    return vi.waitFor(() => {
      expect(props.handleUpdateEntityInfo).toHaveBeenCalledWith(
        '## 2. Ban chat suc manh (**Ton Luc**)\n\n**Ton Luc** nam o **Ton Luc**.',
        expect.objectContaining({ wikiLinkOptOuts: [] })
      );
      const toastMsg = String(props.showToast.mock.calls.at(-1)?.[0] || '');
      expect(toastMsg).toContain('2');
      expect(toastMsg.toLowerCase()).toContain('trùng');
    });
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
