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
    fireEvent.change(getByLabelText('Địa bàn thế lực'), { target: { value: 'Hoang Thú giới' } });
    await waitFor(() => expect(getByText('Tôn giới')).toBeTruthy());
    fireEvent.change(getByLabelText('Cấp thế lực'), { target: { value: 'Thiên Tôn cấp thế lực' } });
    fireEvent.click(getByRole('button', { name: /lưu thông tin/i }));

    expect(onEntitySave).toHaveBeenCalledTimes(1);
    const [, dynamicData] = onEntitySave.mock.calls[0];
    expect(dynamicData).toMatchObject({
      f_dia_ban: 'Hoang Thú giới',
      f_status: 'Thiên Tôn cấp thế lực',
    });
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
