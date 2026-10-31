/**
 * F-004: Web Locks session — grant, deny, release, missing API.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useNovelSessionLock } from './useNovelSessionLock.js';

function installLocks() {
  const held = new Set();
  const requests = [];
  navigator.locks = {
    request(name, options, callback) {
      const cb = typeof options === 'function' ? options : callback;
      const opts = typeof options === 'function' ? {} : options || {};
      requests.push(name);
      return (async () => {
        if (opts.ifAvailable && held.has(name)) return cb(null);
        held.add(name);
        try {
          return await cb({ name });
        } finally {
          held.delete(name);
        }
      })();
    },
  };
  return { held, requests };
}

const dir = { kind: 'directory' };

describe('useNovelSessionLock', () => {
  afterEach(() => {
    delete navigator.locks;
  });

  it('sets hasLock when the session lock is granted', async () => {
    const locks = installLocks();
    const lockStateRef = { current: null };
    const { result } = renderHook(() => useNovelSessionLock('novel-a', dir, lockStateRef));

    await waitFor(() => expect(result.current.hasLock).toBe(true));
    expect(result.current.isLockSupported).toBe(true);
    expect(result.current.lockError).toBeNull();
    expect(locks.held.has('ttc-novel:novel-a')).toBe(true);
    expect(lockStateRef.current.hasLock).toBe(true);
  });

  it('sets lockError when another context already holds the lock', async () => {
    installLocks();
    let releaseFirst = () => {};
    const first = navigator.locks.request('ttc-novel:novel-a', { ifAvailable: true }, () => {
      return new Promise((resolve) => {
        releaseFirst = resolve;
      });
    });
    const lockStateRef = { current: null };
    const { result } = renderHook(() => useNovelSessionLock('novel-a', dir, lockStateRef));

    await waitFor(() => expect(result.current.hasLock).toBe(false));
    expect(result.current.lockError).toMatch(/tab khác/);
    releaseFirst();
    await first;
  });

  it('releases the previous novel lock when novelId changes', async () => {
    const locks = installLocks();
    const lockStateRef = { current: null };
    const { rerender } = renderHook(({ id }) => useNovelSessionLock(id, dir, lockStateRef), {
      initialProps: { id: 'a' },
    });

    await waitFor(() => expect(locks.held.has('ttc-novel:a')).toBe(true));
    rerender({ id: 'b' });
    await waitFor(() => expect(locks.held.has('ttc-novel:b')).toBe(true));
    expect(locks.held.has('ttc-novel:a')).toBe(false);
  });

  it('releases the lock on unmount', async () => {
    const locks = installLocks();
    const lockStateRef = { current: null };
    const { unmount } = renderHook(() => useNovelSessionLock('novel-a', dir, lockStateRef));
    await waitFor(() => expect(locks.held.has('ttc-novel:novel-a')).toBe(true));
    unmount();
    await waitFor(() => expect(locks.held.has('ttc-novel:novel-a')).toBe(false));
  });

  it('stays optimistic when navigator.locks is missing', async () => {
    delete navigator.locks;
    const lockStateRef = { current: null };
    const { result } = renderHook(() => useNovelSessionLock('novel-a', dir, lockStateRef));
    await waitFor(() => expect(result.current.isLockSupported).toBe(false));
    expect(result.current.hasLock).toBe(true);
    expect(result.current.lockError).toBeNull();
  });

  it('does not request a lock when novelId is null', async () => {
    const locks = installLocks();
    const lockStateRef = { current: null };
    const { result } = renderHook(() => useNovelSessionLock(null, dir, lockStateRef));
    await act(async () => {
      await Promise.resolve();
    });
    expect(locks.requests).toEqual([]);
    expect(result.current.hasLock).toBe(true);
  });

  it('keeps only the last lock when novelId changes rapidly', async () => {
    const locks = installLocks();
    const lockStateRef = { current: null };
    const { rerender } = renderHook(({ id }) => useNovelSessionLock(id, dir, lockStateRef), {
      initialProps: { id: 'a' },
    });
    rerender({ id: 'b' });
    rerender({ id: 'c' });
    await waitFor(() => expect(locks.held.size).toBe(1));
    expect(locks.held.has('ttc-novel:c')).toBe(true);
  });
});
