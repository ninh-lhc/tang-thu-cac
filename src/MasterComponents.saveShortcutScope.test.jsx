// ==========================================
// MasterComponents.saveShortcutScope.test.jsx
// Guard Ctrl/Cmd+S pipeline so only the focused modal consumes ttc-save.
// This protects against accidental double-save when dialogs coexist.
// ==========================================

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { ModalEntity, ModalMilestone } from './MasterComponents.jsx';

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
    const { getByTestId, getByText } = render(
      <ModalEntity
        {...entityProps({
          initialData: null,
          parentTabId: 'ban-do',
          parentLabel: 'Ban do',
          tabConfig: { id: 'tien-gioi', label: 'Tien gioi', viewType: 'collection-track' },
        })}
      />
    );

    const entityRoot = getByTestId('modal-entity-root');
    const entityNameInput = entityRoot.querySelector('input[placeholder]');
    expect(entityNameInput).toBeTruthy();

    await waitFor(() => expect(getByText('Ghi nhanh cho thẻ Bản Đồ')).toBeTruthy());
    expect(getByText(/Gợi ý điền nhanh:/)).toBeTruthy();
    expect(getByText(/Dạ Lang Tiên Tinh = Tiên tinh · Vương giới/)).toBeTruthy();
    expect(getByText(/Bách Thú Cung = Tông môn · Thiên Tôn cấp thế lực · Hoang Thú giới/)).toBeTruthy();
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
          tabConfig: { id: 'tien-gioi', label: 'Tien gioi', viewType: 'collection-track' },
        })}
      />
    );

    fireEvent.change(getByRole('textbox', { name: /danh xưng/i }), { target: { value: 'Hoang Thu Gioi' } });
    fireEvent.change(getByLabelText('Loại địa bàn'), { target: { value: 'Giới' } });
    fireEvent.change(getByLabelText('Hệ phân cấp bản đồ'), { target: { value: 'Tôn giới' } });
    fireEvent.change(getByLabelText('Trực thuộc bản đồ'), { target: { value: 'Trung Tiên giới' } });
    fireEvent.click(getByRole('button', { name: /lưu thông tin/i }));

    expect(onEntitySave).toHaveBeenCalledTimes(1);
    const [, dynamicData] = onEntitySave.mock.calls[0];
    expect(dynamicData).toMatchObject({
      f_title: 'Giới',
      f_status: 'Giới · Tôn giới',
      f_vi_tri: 'Trung Tiên giới',
    });
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
    const { getByLabelText, getByRole, getByText } = render(
      <ModalEntity
        {...entityProps({
          onSave: onEntitySave,
          initialData: null,
          parentTabId: 'the-luc',
          parentLabel: 'The luc',
          tabConfig: { id: 'tong-mon', label: 'Tong mon', viewType: 'collection-track' },
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
      f_status: 'Thiên Tôn cấp thế lực',
    });
  });

  it('uses urban map presets when novel genres include Đô Thị', () => {
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
          tabConfig: { id: 'ban-do-su-nghiep', label: 'Ban do su nghiep', viewType: 'collection-track' },
          activeNovelData,
        })}
      />
    );
    const mapTypeInput = getByLabelText('Loại địa bàn');
    const listEl = document.getElementById(mapTypeInput.getAttribute('list') || '');
    const options = Array.from(listEl?.querySelectorAll('option') || []).map((item) => item.getAttribute('value') || '');
    expect(options).toContain('Thành phố');
    expect(options).not.toContain('Tiên tinh');
  });

  it('filters map hierarchy options by selected realm system', () => {
    const activeNovelData = { tabsConfig: [], data: {} };
    const { getByLabelText } = render(
      <ModalEntity
        {...entityProps({
          initialData: null,
          parentTabId: 'ban-do',
          parentLabel: 'Ban do',
          tabConfig: { id: 'ha-gioi', label: 'Ha Gioi', viewType: 'collection-track' },
          activeNovelData,
        })}
      />
    );
    fireEvent.change(getByLabelText('Hệ giới bản đồ'), { target: { value: 'Nguyên giới' } });
    const mapSystemInput = getByLabelText('Hệ phân cấp bản đồ');
    const listEl = document.getElementById(mapSystemInput.getAttribute('list') || '');
    const options = Array.from(listEl?.querySelectorAll('option') || []).map((item) => item.getAttribute('value') || '');
    expect(options).toContain('Đế giới');
    expect(options).not.toContain('Cửu cấp');
  });

  it('suggests custom map systems from existing novel entities', async () => {
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
          tabConfig: { id: 'vi-dien', label: 'Vi dien', viewType: 'collection-track' },
          activeNovelData,
        })}
      />
    );

    const mapSystemInput = getByLabelText('Hệ phân cấp bản đồ');
    const listId = mapSystemInput.getAttribute('list');
    expect(listId).toBe('ttc-force-system-options');
    const listEl = document.getElementById(listId);
    const options = Array.from(listEl?.querySelectorAll('option') || []).map((item) => item.getAttribute('value') || '');
    expect(options).toContain('Chí Tôn Vũ Trụ');
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
