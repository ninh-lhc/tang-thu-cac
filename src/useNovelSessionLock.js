/**
 * Exclusive session lock cho truyện đang mở (F-004).
 * Web Locks nếu có; không có thì hasLock = true (không chặn ghi).
 * Ai gọi: App.jsx. useAppPersistence đọc lockStateRef trước khi ghi đĩa.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export function novelSessionLockName(novelId) {
  return `ttc-novel:${String(novelId)}`;
}

export function isNovelSessionLockSupported() {
  return typeof navigator !== 'undefined' && typeof navigator.locks?.request === 'function';
}

const OPTIMISTIC = {
  novelId: null,
  hasLock: true,
  isLockSupported: false,
  lockError: null,
};

function publishLockState(lockStateRef, next, setState) {
  if (lockStateRef) lockStateRef.current = next;
  setState(next);
}

export function useNovelSessionLock(novelId, dirHandle, lockStateRef) {
  const releaseRef = useRef(() => {});
  const requestTailRef = useRef(Promise.resolve());
  const generationRef = useRef(0);
  const retryWaitersRef = useRef([]);
  const [retryNonce, setRetryNonce] = useState(0);
  const [state, setState] = useState(() => ({
    ...OPTIMISTIC,
    isLockSupported: isNovelSessionLockSupported(),
  }));

  const settleRetry = (ok) => {
    const waiters = retryWaitersRef.current;
    retryWaitersRef.current = [];
    for (const resolve of waiters) resolve(ok);
  };

  useEffect(() => {
    const generation = ++generationRef.current;
    const id = novelId != null && String(novelId).length > 0 ? String(novelId) : null;
    let released = false;
    const hold = new Promise((resolve) => {
      releaseRef.current = () => {
        if (released) return;
        released = true;
        resolve();
      };
    });

    const run = async () => {
      await requestTailRef.current.catch(() => {});
      if (released || generation !== generationRef.current) return;

      const supported = isNovelSessionLockSupported();
      const publish = (next) => publishLockState(lockStateRef, next, setState);
      if (!supported) {
        publish({ novelId: id, hasLock: true, isLockSupported: false, lockError: null });
        settleRetry(true);
        return;
      }
      if (!id || dirHandle == null) {
        publish({ novelId: id, hasLock: true, isLockSupported: true, lockError: null });
        settleRetry(false);
        return;
      }

      const pending = navigator.locks.request(
        novelSessionLockName(id),
        { ifAvailable: true },
        async (lock) => {
          if (released || generation !== generationRef.current) return;
          if (!lock) {
            publish({
              novelId: id,
              hasLock: false,
              isLockSupported: true,
              lockError: 'Truyện đang được mở và chỉnh sửa ở tab khác.',
            });
            settleRetry(false);
            return;
          }
          publish({ novelId: id, hasLock: true, isLockSupported: true, lockError: null });
          settleRetry(true);
          await hold;
        }
      );
      requestTailRef.current = pending;
      await pending.catch(() => {});
    };

    void run();
    return () => {
      generationRef.current += 1;
      releaseRef.current();
    };
  }, [dirHandle, lockStateRef, novelId, retryNonce]);

  const retryLock = useCallback(
    () =>
      new Promise((resolve) => {
        retryWaitersRef.current.push(resolve);
        setRetryNonce((n) => n + 1);
      }),
    []
  );

  return {
    hasLock: state.hasLock,
    lockError: state.lockError,
    isLockSupported: state.isLockSupported,
    novelId: state.novelId,
    retryLock,
  };
}
