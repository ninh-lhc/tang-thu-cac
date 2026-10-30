import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { markShardDirty, consumeDirtyShards } from './lib/dirtyShardTracker.js';
import { useAppNovelUnloadGuard } from './useAppNovelUnloadGuard.js';

describe('useAppNovelUnloadGuard', () => {
  beforeEach(() => {
    consumeDirtyShards();
  });

  afterEach(() => {
    consumeDirtyShards();
  });

  it('registers beforeunload when dirty shards exist', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    markShardDirty('L', 'S');
    renderHook(() =>
      useAppNovelUnloadGuard({
        hasPendingDiskWrite: () => false,
        flushPendingDiskWrites: vi.fn(),
      })
    );
    expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    addSpy.mockRestore();
  });

  it('calls flush on visibility hidden when pending write', () => {
    const flush = vi.fn();
    renderHook(() =>
      useAppNovelUnloadGuard({
        hasPendingDiskWrite: () => true,
        flushPendingDiskWrites: flush,
      })
    );
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(flush).toHaveBeenCalled();
  });
});
