// ==========================================
// MasterComponents.saveShortcutScope.test.jsx
// Guard Ctrl/Cmd+S pipeline so only the focused modal consumes ttc-save.
// This protects against accidental double-save when dialogs coexist.
// ==========================================

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { ModalEntity, ModalMilestone } from './MasterComponents.jsx';
import { buildFullSixRowNotebookTablePaste } from './lib/notebookTablePasteFixture.js';

function dispatchSaveShortcut() {
  window.dispatchEvent(new CustomEvent('ttc-save', { cancelable: true }));
}

function entityProps(overrides = {}) {
  return {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
    initialData: {
      id: 'entity-1',
      name: 'Entity Focus',
      avatar: '',
      rawText: '',
      dynamicData: {},
    },
    tabConfig: {},
    activeNovelData: null,
    onUpdateTemplate: vi.fn(),
    handleAvatarDrop: vi.fn(),
    handlePickLocalImage: vi.fn(),
    dirHandle: null,
    parentTabId: 'nhan-vat',
    parentLabel: 'Nhan vat',
    geminiApiKey: [],
    geminiMode: 'standard',
    ...overrides,
  };
}

function milestoneProps(overrides = {}) {
  return {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
    initialData: {
      id: 'ms-1',
      chapter: '77',
      event: 'Milestone Focus',
      snapshot: { avatar: '', dynamicData: {} },
    },
    defaultChapterWhenNew: undefined,
    tabConfig: {},
    onUpdateTemplate: vi.fn(),
    handleAvatarDrop: vi.fn(),
    handlePickLocalImage: vi.fn(),
    dirHandle: null,
    parentTabId: 'nhan-vat',
    parentLabel: 'Nhan vat',
    geminiApiKey: [],
    geminiMode: 'standard',
    entityMap: [],
    showToast: vi.fn(),
    autoLinkToastEnabled: true,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe('modal ttc-save scope', () => {
  it('shows map-specific quick guidance when creating a new map entity', async () => {
    const { getByTestId, getByText, getByRole } = render(
      <ModalEntity
        {...entityProps({
          initialData: null,
          parentTabId: 'ban-do',
          parentLabel: 'Ban do',
          tabConfig: {
            id: 'tien-gioi',
            label: 'Tien gioi',
            viewType: 'collection-track',
            modalMapForceQuickForm: 'legacy',
          },
        })}
      />
    );

    const entityRoot = getByTestId('modal-entity-root');
    const entityNameInput = entityRoot.querySelector('input[placeholder]');
    expect(entityNameInput).toBeTruthy();

    const guideTab = await waitFor(() => getByRole('tab', { name: 'Tổng quan' }));
    fireEvent.click(guideTab);
    await waitFor(() => expect(getByText(/Gợi ý nhanh \(Tien gioi\)/i)).toBeTruthy());
    expect(getByRole('combobox', { name: 'Giới Diện bản đồ' })).toBeTruthy();
    expect(getByRole('combobox', { name: 'Quy Mô Địa Vực bản đồ' })).toBeTruthy();
    expect(getByRole('combobox', { name: 'Đặc Tính Địa Vực bản đồ' })).toBeTruthy();
  });

  it('defaults Giới Diện to the active map sub-tab label when creating a map entity', () => {
    const { getByLabelText } = render(
      <ModalEntity
        {...entityProps({
          initialData: null,
          parentTabId: 'ban-do',
          parentLabel: 'Ban do',
          tabConfig: {
            id: 'am-gian',
            label: 'Âm Gian (Địa phủ)',
            viewType: 'collection-track',
            modalMapForceQuickForm: 'legacy',
          },
        })}
      />
    );
    const gioiDien = getByLabelText('Giới Diện bản đồ');
    expect(gioiDien.value).toBe('Âm Gian (Địa phủ)');
  });

  it('maps quick fields into map entity payloads', () => {
    const onEntitySave = vi.fn();
    const { getByLabelText, getByRole } = render(
      <ModalEntity
        {...entityProps({
          onSave: onEntitySave,
          initialData: null,
          parentTabId: 'ban-do',
          parentLabel: 'Ban do',
          tabConfig: {
            id: 'tien-gioi',
            label: 'Tien gioi',
            viewType: 'collection-track',
            modalMapForceQuickForm: 'legacy',
          },
        })}
      />
    );

    fireEvent.change(getByRole('textbox', { name: /danh xưng/i }), { target: { value: 'Hoang Thu Gioi' } });
    fireEvent.change(getByLabelText('Giới Diện bản đồ'), { target: { value: 'Giới' } });
    fireEvent.change(getByLabelText('Quy Mô Địa Vực bản đồ'), { target: { value: 'Đại lục' } });
    fireEvent.change(getByLabelText('Đặc Tính Địa Vực bản đồ'), { target: { value: 'Tôn giới' } });
    fireEvent.change(getByLabelText('Trực thuộc tầng 1'), { target: { value: 'Trung Tiên giới' } });
    fireEvent.click(getByRole('button', { name: /lưu thông tin/i }));

    expect(onEntitySave).toHaveBeenCalledTimes(1);
    const [, dynamicData] = onEntitySave.mock.calls[0];
    expect(dynamicData).toMatchObject({
      f_title: 'Giới',
      f_he_gioi_ban_do: 'Đại lục',
      f_vi_tri: 'Trung Tiên giới',
    });
    // Chuỗi hiển thị: các trường theo mẫu tab + «Đặc tính» trước f_vi_tri (dedupe trùng Giới trong f_status cũ).
    expect(dynamicData.f_status).toContain('Giới');
    expect(dynamicData.f_status).toContain('Tôn giới');
    expect(dynamicData.f_status).toContain('Trung Tiên giới');
  });

  it('infers force ladder from selected map location', async () => {
    const onEntitySave = vi.fn();
    const activeNovelData = {
      tabsConfig: [
        {
          id: 'ban-do',
          label: 'Ban do',
          subTabs: [{ id: 'tien-gioi', label: 'Tien gioi', viewType: 'collection-track' }],
        },
      ],
      data: {
        'ban-do': {
          'tien-gioi': {
            entities: [
              {
                id: 'map-1',
                name: 'Hoang Thú giới',
                info: '',
                dynamicData: { f_title: 'Giới', f_status: 'Giới · Tôn giới' },
                milestones: [],
              },
            ],
          },
        },
      },
    };
    const { getByLabelText, getByRole } = render(
      <ModalEntity
        {...entityProps({
          onSave: onEntitySave,
          initialData: null,
          parentTabId: 'the-luc',
          parentLabel: 'The luc',
          tabConfig: {
            id: 'tong-mon',
            label: 'Tong mon',
            viewType: 'collection-track',
            modalMapForceQuickForm: 'legacy',
          },
          activeNovelData,
        })}
      />
    );

    fireEvent.change(getByRole('textbox', { name: /danh xưng/i }), { target: { value: 'Bach Thu Cung' } });
    fireEvent.change(getByLabelText('Loại hình thế lực'), { target: { value: 'Tông Môn' } });
    fireEvent.change(getByLabelText('Hệ cấp bậc thế lực'), { target: { value: 'Tien gioi' } });
    fireEvent.change(getByLabelText('Địa chỉ thế lực'), { target: { value: 'Hoang Thú giới - Tây Châu' } });
    fireEvent.change(getByLabelText('Cấp bậc thế lực'), { target: { value: 'Thiên Tôn cấp thế lực' } });
    fireEvent.click(getByRole('button', { name: /lưu thông tin/i }));

    expect(onEntitySave).toHaveBeenCalledTimes(1);
    const [, dynamicData] = onEntitySave.mock.calls[0];
    expect(dynamicData).toMatchObject({
      f_loai_to_chuc: 'Tông Môn',
      f_he_cap_the_luc: 'Tien gioi',
      f_dia_ban: 'Hoang Thú giới - Tây Châu',
      f_status: 'Tông Môn · Tien gioi · Thiên Tôn cấp thế lực · Hoang Thú giới - Tây Châu',
    });
  });

  it('keeps map type suggestions empty until user configures a list', () => {
    const activeNovelData = {
      genres: ['Hệ Thống', 'Đô Thị'],
      tabsConfig: [],
      data: {},
    };
    const { getByLabelText } = render(
      <ModalEntity
        {...entityProps({
          initialData: null,
          parentTabId: 'ban-do',
          parentLabel: 'Ban do',
          tabConfig: {
            id: 'ban-do-su-nghiep',
            label: 'Ban do su nghiep',
            viewType: 'collection-track',
            modalMapForceQuickForm: 'legacy',
          },
          activeNovelData,
        })}
      />
    );
    const mapTypeInput = getByLabelText('Giới Diện bản đồ');
    const listEl = document.getElementById(mapTypeInput.getAttribute('list') || '');
    const options = Array.from(listEl?.querySelectorAll('option') || []).map((item) => item.getAttribute('value') || '');
    expect(options).toEqual([]);
  });

  it('keeps map system suggestions empty until shared list is configured', async () => {
    const activeNovelData = {
      tabsConfig: [
        {
          id: 'ban-do',
          label: 'Ban do',
          subTabs: [{ id: 'vi-dien', label: 'Vi dien', viewType: 'collection-track' }],
        },
      ],
      data: {
        'ban-do': {
          'vi-dien': {
            entities: [
              {
                id: 'map-custom-1',
                name: 'Ha Gioi',
                info: '',
                dynamicData: { f_title: 'Giới', f_status: 'Giới · Chí Tôn Vũ Trụ' },
                milestones: [],
              },
            ],
          },
        },
      },
    };
    const { getByLabelText } = render(
      <ModalEntity
        {...entityProps({
          initialData: null,
          parentTabId: 'ban-do',
          parentLabel: 'Ban do',
          tabConfig: {
            id: 'vi-dien',
            label: 'Vi dien',
            viewType: 'collection-track',
            modalMapForceQuickForm: 'legacy',
          },
          activeNovelData,
        })}
      />
    );

    const mapSystemInput = getByLabelText('Đặc Tính Địa Vực bản đồ');
    const listId = mapSystemInput.getAttribute('list');
    expect(listId).toBe('ttc-force-system-options');
    const listEl = document.getElementById(listId);
    const options = Array.from(listEl?.querySelectorAll('option') || []).map((item) => item.getAttribute('value') || '');
    expect(options).toEqual([]);
  });

  it('when multiple dialogs coexist, only top trap modal consumes ttc-save', async () => {
    const onEntitySave = vi.fn();
    const onMilestoneSave = vi.fn();
    const { getByTestId } = render(
      <>
        <ModalEntity {...entityProps({ onSave: onEntitySave })} />
        <ModalMilestone {...milestoneProps({ onSave: onMilestoneSave })} />
      </>
    );

    const entityRoot = getByTestId('modal-entity-root');
    const milestoneRoot = getByTestId('modal-milestone-root');
    const entityNameInput = entityRoot.querySelector('input[placeholder]');
    const milestoneChapterInput = milestoneRoot.querySelector('input[type="number"]');
    const milestoneEventInput = milestoneRoot.querySelector('textarea');

    expect(entityNameInput).toBeTruthy();
    expect(milestoneChapterInput).toBeTruthy();
    expect(milestoneEventInput).toBeTruthy();

    await waitFor(() => expect(entityNameInput.value).toBe('Entity Focus'));
    await waitFor(() => expect(milestoneChapterInput.value).toBe('77'));
    await waitFor(() => expect(milestoneEventInput.value).toBe('Milestone Focus'));

    milestoneEventInput.focus();
    dispatchSaveShortcut();
    expect(onMilestoneSave).toHaveBeenCalledTimes(1);
    expect(onEntitySave).not.toHaveBeenCalled();
  });

  it('saves snapshot fields together with the milestone payload', async () => {
    const onMilestoneSave = vi.fn();
    const { getByLabelText, getByRole, getByTestId } = render(
      <ModalMilestone
        {...milestoneProps({
          onSave: onMilestoneSave,
          initialData: null,
          defaultChapterWhenNew: 10,
          parentTabId: 'nhan-vat',
          parentLabel: 'Nhan vat',
          tabConfig: {
            id: 'nhan-vat-chinh',
            label: 'Nhan vat chinh',
            viewType: 'collection-track',
            fieldsTemplate: [
              { id: 'f_status', label: 'Cảnh giới' },
              { id: 'f_alias', label: 'Biệt danh' },
            ],
          },
        })}
      />
    );

    const milestoneRoot = getByTestId('modal-milestone-root');
    const eventTextarea = milestoneRoot.querySelector('textarea#milestone-event-editor');

    expect(eventTextarea).toBeTruthy();

    fireEvent.change(eventTextarea, { target: { value: 'Dot pha canh gioi moi.' } });
    fireEvent.change(getByLabelText('Cảnh giới'), { target: { value: 'Kim Đan' } });
    fireEvent.change(getByLabelText(/Biệt danh/i), { target: { value: 'Tiểu Nam' } });
    fireEvent.click(getByRole('button', { name: /^Lưu$/i }));

    expect(onMilestoneSave).toHaveBeenCalledTimes(1);
    const [, snapshot] = onMilestoneSave.mock.calls[0];
    expect(snapshot).toMatchObject({
      avatar: '',
      dynamicData: {
        f_status: 'Kim Đan',
        f_alias: 'Tiểu Nam',
      },
    });
  });

  it('keeps pasted milestone table previewable after save and reopen', async () => {
    localStorage.setItem('tangthu_entity_notes_auto_wrap_wiki_on_save_v1', '0');
    const pastePlain = buildFullSixRowNotebookTablePaste();
    const onMilestoneSave = vi.fn();
    const { getByTestId, getByRole, unmount } = render(
      <ModalMilestone {...milestoneProps({ onSave: onMilestoneSave, entityMap: [] })} />
    );

    const milestoneRoot = getByTestId('modal-milestone-root');
    const eventTextarea = milestoneRoot.querySelector('textarea#milestone-event-editor');
    expect(eventTextarea).toBeTruthy();

    fireEvent.click(getByRole('button', { name: /^Preview$/i }));
    fireEvent.paste(eventTextarea, {
      clipboardData: {
        getData: (type) => (type === 'text/plain' ? pastePlain : ''),
        files: [],
      },
    });

    await waitFor(() => {
      expect(milestoneRoot.querySelector('.entity-notes-md-table')).not.toBeNull();
    });

    fireEvent.click(getByRole('button', { name: /Lưu cập nhật/i }));
    expect(onMilestoneSave).toHaveBeenCalledTimes(1);
    const savedEvent = onMilestoneSave.mock.calls[0][0].event;
    expect(savedEvent).toContain('[[Bách Khoa Tu Tiên]]');
    expect(savedEvent).not.toMatch(/\[\[\[\[/);
    unmount();

    const { getByTestId: getRoot2, getByRole: getRole2 } = render(
      <ModalMilestone
        {...milestoneProps({
          entityMap: [],
          initialData: {
            id: 'ms-1',
            chapter: '77',
            title: 'Milestone Focus',
            event: savedEvent,
            snapshot: { avatar: '', dynamicData: {} },
          },
        })}
      />
    );

    const milestoneRoot2 = getRoot2('modal-milestone-root');
    fireEvent.click(getRole2('button', { name: /^Preview$/i }));
    await waitFor(() => {
      expect(milestoneRoot2.querySelector('.entity-notes-md-table')).not.toBeNull();
    });
    expect(milestoneRoot2.textContent).toMatch(/Bách Khoa|Triệu Hồi/);
    expect(milestoneRoot2.textContent).not.toMatch(/\|\s*:---/);
  });

  it('pulls focus back into modal when external element is focused', async () => {
    const onEntitySave = vi.fn();
    const { getByTestId } = render(<ModalEntity {...entityProps({ onSave: onEntitySave })} />);
    const entityRoot = getByTestId('modal-entity-root');
    const entityNameInput = entityRoot.querySelector('input[placeholder]');

    expect(entityNameInput).toBeTruthy();
    await waitFor(() => expect(entityNameInput.value).toBe('Entity Focus'));

    const outsideButton = document.createElement('button');
    outsideButton.type = 'button';
    outsideButton.textContent = 'outside';
    document.body.appendChild(outsideButton);
    outsideButton.focus();
    expect(document.activeElement).not.toBe(outsideButton);

    dispatchSaveShortcut();
    expect(onEntitySave).toHaveBeenCalledTimes(1);

    outsideButton.remove();
  });
});

describe('ModalMilestone Ctrl+G and shell', () => {
  function pressCtrlG() {
    const event = new KeyboardEvent('keydown', {
      key: 'g',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);
    return event;
  }

  it('wraps and unwraps the milestone editor with Ctrl+G without blocking the shortcut outside it', async () => {
    const { getByTestId, getByRole } = render(
      <ModalMilestone
        {...milestoneProps({
          initialData: {
            id: 'ms-1',
            chapter: '12',
            title: 'Dot pha',
            event: 'Linh Vu',
            snapshot: { avatar: '', dynamicData: {} },
          },
        })}
      />
    );

    const editor = getByTestId('modal-milestone-root').querySelector('#milestone-event-editor');
    await waitFor(() => expect(editor.value).toBe('Linh Vu'));
    editor.focus();
    editor.setSelectionRange(0, editor.value.length);

    const wrapEvent = pressCtrlG();
    expect(wrapEvent.defaultPrevented).toBe(true);
    expect(editor.value).toBe('[[Linh Vu]]');

    const unwrapEvent = pressCtrlG();
    expect(unwrapEvent.defaultPrevented).toBe(true);
    expect(editor.value).toBe('Linh Vu');

    const chapter = getByTestId('modal-milestone-root').querySelector('[data-milestone-chapter-input="true"]');
    chapter.focus();
    const outsideEvent = pressCtrlG();
    expect(outsideEvent.defaultPrevented).toBe(false);
    expect(editor.value).toBe('Linh Vu');

    expect(getByRole('button', { name: /Huỷ/ })).toBeTruthy();
    expect(getByRole('button', { name: /Lưu/ })).toBeTruthy();
    const root = getByTestId('modal-milestone-root');
    expect(root.getAttribute('data-layout')).toBe('entity-notes-comparable');
    expect(root.className).toContain('max-w-[min(92rem,calc(100vw-1.5rem))]');
    expect(root.className).toContain('overflow-x-hidden');
    const frame = getByTestId('milestone-event-editor-frame');
    expect(frame.className).toContain('h-[min(62vh,760px)]');
    expect(frame.className).toContain('max-h-[calc(100dvh-16rem)]');
  });
});

describe('ModalMilestone save does not rewrap the event body', () => {
  const AUTO_CLEAN_KEY = 'tangthu_entity_notes_auto_clean_on_save_v1';

  beforeEach(() => {
    localStorage.setItem(AUTO_CLEAN_KEY, '0');
  });

  afterEach(() => {
    localStorage.removeItem(AUTO_CLEAN_KEY);
  });

  const entityMap = [
    { name: 'Triệu Hồi' },
    { name: 'Linh Hồn Hỏa Diễm' },
    { name: 'Triệu Hồi Khó Lâu Chiến Sĩ' },
  ];

  function pressCtrlG() {
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'g',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    }));
  }

  function renderMilestone(event, onSave = vi.fn()) {
    const view = render(
      <ModalMilestone
        {...milestoneProps({
          onSave,
          entityMap,
          initialData: {
            id: 'ms-1',
            chapter: '12',
            title: 'Dot pha',
            event,
            snapshot: { avatar: '', dynamicData: {} },
          },
        })}
      />
    );
    const editor = view.getByTestId('modal-milestone-root').querySelector('#milestone-event-editor');
    return { ...view, editor, onSave };
  }

  function save(view) {
    fireEvent.click(view.getByRole('button', { name: /^Lưu cập nhật$/ }));
  }

  it('keeps plain entity names unwrapped after save', async () => {
    const event = 'Triệu Hồi không gian: 0/10';
    const view = renderMilestone(event);
    await waitFor(() => expect(view.editor.value).toBe(event));
    save(view);
    expect(view.onSave).toHaveBeenCalledTimes(1);
    expect(view.onSave.mock.calls[0][0].event).toBe(event);
    expect(view.onSave.mock.calls[0][0].event).not.toContain('[[');
  });

  it('keeps a Ctrl+G unwrap as plain text after save', async () => {
    const label = 'Linh Hồn Hỏa Diễm';
    const view = renderMilestone(`[[${label}]] (Cấp 1)`);
    await waitFor(() => expect(view.editor.value).toBe(`[[${label}]] (Cấp 1)`));
    view.editor.focus();
    view.editor.setSelectionRange(2, 2 + label.length);
    pressCtrlG();
    expect(view.editor.value).toBe(`${label} (Cấp 1)`);
    save(view);
    expect(view.onSave.mock.calls[0][0].event).toBe(`${label} (Cấp 1)`);
  });

  it('keeps a Ctrl+G wrap after save', async () => {
    const label = 'Linh Hồn Hỏa Diễm';
    const view = renderMilestone(label);
    await waitFor(() => expect(view.editor.value).toBe(label));
    view.editor.focus();
    view.editor.setSelectionRange(0, label.length);
    pressCtrlG();
    expect(view.editor.value).toBe(`[[${label}]]`);
    save(view);
    expect(view.onSave.mock.calls[0][0].event).toBe(`[[${label}]]`);
  });

  it('keeps an existing wiki link that the user did not remove', async () => {
    const event = '[[Triệu Hồi Khó Lâu Chiến Sĩ]] (Cấp 1)';
    const view = renderMilestone(event);
    await waitFor(() => expect(view.editor.value).toBe(event));
    save(view);
    expect(view.onSave.mock.calls[0][0].event).toBe(event);
  });

  it('does not wrap the chapter or title when those strings match an entity', async () => {
    const view = renderMilestone('Ghi chu thuong');
    await waitFor(() => expect(view.editor.value).toBe('Ghi chu thuong'));
    const chapter = view.getByTestId('modal-milestone-root').querySelector('[data-milestone-chapter-input="true"]');
    const titleInput = view.getByPlaceholderText('VD: Kết đan thành công');
    const nextNameInput = view.getByPlaceholderText('VD: Tháp Phượng Hoàng');
    fireEvent.change(titleInput, { target: { value: 'Triệu Hồi' } });
    fireEvent.change(nextNameInput, { target: { value: 'Linh Hồn Hỏa Diễm' } });
    chapter.focus();
    pressCtrlG();
    expect(chapter.value).toBe('12');
    expect(titleInput.value).toBe('Triệu Hồi');
    expect(nextNameInput.value).toBe('Linh Hồn Hỏa Diễm');
    save(view);
    const payload = view.onSave.mock.calls[0][0];
    expect(payload.chapter).toBe('12');
    expect(payload.title).toBe('Triệu Hồi');
    expect(payload.nextEntityName).toBe('Linh Hồn Hỏa Diễm');
    expect(payload.event).toBe('Ghi chu thuong');
  });

  it('keeps plain event text when the global save shortcut fires', async () => {
    const event = 'Triệu Hồi\nLinh Hồn Hỏa Diễm\nTriệu Hồi Khó Lâu Chiến Sĩ';
    const view = renderMilestone(event);
    await waitFor(() => expect(view.editor.value).toBe(event));
    view.editor.focus();
    dispatchSaveShortcut();
    expect(view.onSave).toHaveBeenCalledTimes(1);
    expect(view.onSave.mock.calls[0][0].event).toBe(event);
  });
});
