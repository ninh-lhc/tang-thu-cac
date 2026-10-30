/**
 * F-002: success toast only after sync promise resolves.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppEntityMilestoneActions } from './useAppEntityMilestoneActions.js';

function buildMinimalHookArgs(overrides = {}) {
  const showToast = vi.fn();
  let resolveSync;
  const syncPromise = new Promise((resolve) => {
    resolveSync = resolve;
  });
  const updateActiveNovelData = vi.fn(() => syncPromise);
  const activeNovelData = {
    id: 'n1',
    title: 'T',
    data: {
      lon: {
        default: {
          entities: [
            {
              id: 'e1',
              name: 'Hero',
              info: 'old',
              rawText: 'old',
              dynamicData: {},
              milestones: [],
              descriptions: [],
              images: [],
            },
          ],
        },
      },
    },
    tabsConfig: [],
  };
  return {
    showToast,
    updateActiveNovelData,
    resolveSync,
    syncPromise,
    activeNovelData,
    args: {
      activeNovelData,
      activeTabLon: 'lon',
      activeTabNho: 'default',
      selectedEntityId: 'e1',
      selectedEntity: activeNovelData.data.lon.default.entities[0],
      currentTabConfig: { label: 'Tab', fieldsTemplate: [] },
      updateActiveNovelData,
      showToast,
      setActiveNovelData: vi.fn(),
      syncNovelRef: { current: null },
      dirHandleRef: { current: null },
      generateId: (p) => `${p}-1`,
      setSelectedEntityId: vi.fn(),
      setSelectedMilestoneId: vi.fn(),
      setEditingMilestoneData: vi.fn(),
      setCollectionSubTab: vi.fn(),
      setIsEditingMode: vi.fn(),
      setIsEntityEditing: vi.fn(),
      setConfirmDialog: vi.fn(),
      handlePickLocalImage: vi.fn(),
      buildEntityAliasAccess: () => ({}),
      syncRenameSideEffects: () => ({}),
      ...overrides.args,
    },
    ...overrides,
  };
}

describe('useAppEntityMilestoneActions save sync (F-002)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handleUpdateEntityInfo does not toast success before sync resolves', async () => {
    const ctx = buildMinimalHookArgs();
    const { result } = renderHook(() => useAppEntityMilestoneActions(ctx.args));

    let savePromise;
    act(() => {
      savePromise = result.current.handleUpdateEntityInfo('new info');
    });

    expect(ctx.showToast).not.toHaveBeenCalledWith(
      expect.stringMatching(/thành công/i),
      'success',
      expect.anything()
    );

    await act(async () => {
      ctx.resolveSync({ ok: true, mode: 'directory' });
      await savePromise;
    });

    expect(ctx.showToast).toHaveBeenCalledWith('Ghi chép hồ sơ thành công!');
  });

  it('handleUpdateEntityInfo skips success toast when sync fails', async () => {
    const ctx = buildMinimalHookArgs();
    const { result } = renderHook(() => useAppEntityMilestoneActions(ctx.args));

    await act(async () => {
      const p = result.current.handleUpdateEntityInfo('new info');
      ctx.resolveSync({ ok: false, mode: 'directory', reason: 'write_failed' });
      await p;
    });

    expect(ctx.showToast).not.toHaveBeenCalledWith(
      expect.stringMatching(/thành công/i),
      'success',
      expect.anything()
    );
  });
});
