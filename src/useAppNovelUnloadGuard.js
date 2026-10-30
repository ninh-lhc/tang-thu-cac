/**
 * Cảnh báo đóng tab khi còn dirty shard / ghi đĩa pending;
 * flush debounced write khi tab ẩn (visibilitychange).
 */
import { useEffect } from 'react';
import { hasAnyDirtyShards } from './lib/dirtyShardTracker.js';

export function useAppNovelUnloadGuard({ hasPendingDiskWrite, flushPendingDiskWrites }) {
  useEffect(() => {
    const needsGuard = () =>
      hasAnyDirtyShards() ||
      (typeof hasPendingDiskWrite === 'function' && hasPendingDiskWrite());

    const onBeforeUnload = (event) => {
      if (!needsGuard()) return;
      event.preventDefault();
      event.returnValue = '';
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'hidden') return;
      if (!needsGuard()) return;
      void flushPendingDiskWrites?.();
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [hasPendingDiskWrite, flushPendingDiskWrites]);
}
