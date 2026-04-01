// ==========================================
// useAppPhimTatToanCuc.test.jsx
// Kiểm thử pipeline phím tắt toàn cục (Ctrl/Cmd + K/S, Escape, /, Ctrl/Cmd+Shift+N).
// Mục tiêu: khóa regression hành vi shortcut sau khi hợp nhất về một luồng.
// ==========================================

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { useAppPhimTatToanCuc } from './useAppPhimTatToanCuc.js';

function HookHarness(props) {
  useAppPhimTatToanCuc(props);
  return null;
}

function pressKey(key, opts = {}) {
  window.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...opts,
    })
  );
}

function createProps(overrides = {}) {
  return {
    activeNovelData: { id: 'novel-1' },
    isEntityModalOpen: false,
    setIsCommandPaletteOpen: vi.fn(),
    setCommandPaletteQuery: vi.fn(),
    setEditingEntityData: vi.fn(),
    setIsEntityModalOpen: vi.fn(),
    librarySearchInputRef: { current: { focus: vi.fn() } },
    setMenu1Visible: vi.fn(),
    commandPaletteOpenRef: { current: false },
    setConfirmDialog: vi.fn(),
    setIsSettingsOpen: vi.fn(),
    setOverviewHubOpen: vi.fn(),
    setIsDeepSearchOpen: vi.fn(),
    setIsInNovelSearchOpen: vi.fn(),
    setIsAddNovelOpen: vi.fn(),
    setIsMilestoneModalOpen: vi.fn(),
    setIsInsertImageModalOpen: vi.fn(),
    setIsManageTabsOpen: vi.fn(),
    setIsGenreFilterOpen: vi.fn(),
    setQuickCreateData: vi.fn(),
    setLightboxSrc: vi.fn(),
    setIsEditingMode: vi.fn(),
    setIsEntityEditing: vi.fn(),
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useAppPhimTatToanCuc', () => {
  it.each([
    { label: 'Ctrl+S', keyOpts: { ctrlKey: true } },
    { label: 'Cmd+S', keyOpts: { metaKey: true } },
  ])('dispatches ttc-save on $label', ({ keyOpts }) => {
    const props = createProps();
    const onSaveShortcut = vi.fn();
    window.addEventListener('ttc-save', onSaveShortcut);
    try {
      render(<HookHarness {...props} />);
      pressKey('s', keyOpts);
      expect(onSaveShortcut).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener('ttc-save', onSaveShortcut);
    }
  });

  it.each([
    { label: 'Ctrl+K', keyOpts: { ctrlKey: true } },
    { label: 'Cmd+K', keyOpts: { metaKey: true } },
  ])('toggles command palette on $label', ({ keyOpts }) => {
    const props = createProps();
    render(<HookHarness {...props} />);

    pressKey('k', keyOpts);

    expect(props.setIsCommandPaletteOpen).toHaveBeenCalledTimes(1);
    const toggler = props.setIsCommandPaletteOpen.mock.calls[0][0];
    expect(typeof toggler).toBe('function');
    expect(toggler(true)).toBe(false);
    expect(toggler(false)).toBe(true);
    expect(props.setCommandPaletteQuery).toHaveBeenCalledWith('');
  });

  it('Escape closes overlays and resets editing states', () => {
    const props = createProps();
    render(<HookHarness {...props} />);

    pressKey('Escape');

    expect(props.setLightboxSrc).toHaveBeenCalledWith(null);
    expect(props.setIsEditingMode).toHaveBeenCalledWith(false);
    expect(props.setIsEntityEditing).toHaveBeenCalledWith(false);
    expect(props.setIsSettingsOpen).toHaveBeenCalledWith(false);
    expect(props.setOverviewHubOpen).toHaveBeenCalledWith(false);
    expect(props.setIsDeepSearchOpen).toHaveBeenCalledWith(false);
    expect(props.setIsInNovelSearchOpen).toHaveBeenCalledWith(false);
    expect(props.setIsAddNovelOpen).toHaveBeenCalledWith(false);
    expect(props.setIsEntityModalOpen).toHaveBeenCalledWith(false);
    expect(props.setIsMilestoneModalOpen).toHaveBeenCalledWith(false);
    expect(props.setIsInsertImageModalOpen).toHaveBeenCalledWith(false);
    expect(props.setIsManageTabsOpen).toHaveBeenCalledWith(false);
    expect(props.setIsGenreFilterOpen).toHaveBeenCalledWith(false);
    expect(props.setQuickCreateData).toHaveBeenCalledWith(null);
    expect(props.setConfirmDialog).toHaveBeenCalledTimes(1);
    const updateDialog = props.setConfirmDialog.mock.calls[0][0];
    expect(typeof updateDialog).toBe('function');
    expect(updateDialog({ isOpen: true, title: 'x' })).toEqual({ isOpen: false, title: 'x' });
    expect(updateDialog({ isOpen: false, title: 'y' })).toEqual({ isOpen: false, title: 'y' });
  });

  it('Escape closes only command palette branch when palette is open', () => {
    const props = createProps({
      commandPaletteOpenRef: { current: true },
    });
    render(<HookHarness {...props} />);

    pressKey('Escape');

    expect(props.setIsCommandPaletteOpen).toHaveBeenCalledWith(false);
    expect(props.setConfirmDialog).not.toHaveBeenCalled();
    expect(props.setLightboxSrc).not.toHaveBeenCalled();
    expect(props.setIsEditingMode).not.toHaveBeenCalled();
    expect(props.setIsEntityEditing).not.toHaveBeenCalled();
  });

  it('opens entity modal on Ctrl/Cmd+Shift+N when active novel is ready', () => {
    const props = createProps();
    render(<HookHarness {...props} />);

    pressKey('N', { ctrlKey: true, shiftKey: true });
    expect(props.setEditingEntityData).toHaveBeenCalledWith(null);
    expect(props.setIsEntityModalOpen).toHaveBeenCalledWith(true);

    pressKey('n', { metaKey: true, shiftKey: true });
    expect(props.setIsEntityModalOpen).toHaveBeenCalledTimes(2);
  });

  it('opens library sidebar and focuses search input on slash shortcut', () => {
    vi.useFakeTimers();
    const focus = vi.fn();
    const props = createProps({
      librarySearchInputRef: { current: { focus } },
    });
    render(<HookHarness {...props} />);

    pressKey('/');
    expect(props.setMenu1Visible).toHaveBeenCalledWith(true);
    expect(focus).not.toHaveBeenCalled();

    vi.runOnlyPendingTimers();
    expect(focus).toHaveBeenCalledTimes(1);
  });
});
