// ==========================================
// MasterComponents.saveShortcutScope.test.jsx
// Guard Ctrl/Cmd+S pipeline so only the focused modal consumes ttc-save.
// This protects against accidental double-save when dialogs coexist.
// ==========================================

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
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
