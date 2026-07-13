/**
 * Shared toast state and timer lifecycle.
 * Used by App shell state so overlays and actions can share one toast channel.
 * Keeps timer cleanup and undo behavior in one small hook.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export function useToast() {
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((msg, type = 'success', options = null) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    const onAction =
      options && typeof options.onAction === 'function'
        ? options.onAction
        : options && typeof options.onUndo === 'function'
          ? options.onUndo
          : null;
    const hasAction = typeof onAction === 'function';
    const actionLabel = hasAction
      ? options.actionLabel || options.undoLabel || 'Hoàn tác'
      : undefined;
    setToastMessage({
      msg,
      type,
      undoLabel: actionLabel,
      onUndo: hasAction ? onAction : undefined,
    });
    const ms =
      typeof options?.durationMs === 'number'
        ? options.durationMs
        : hasAction
          ? 20000
          : 3500;
    if (ms <= 0) {
      toastTimerRef.current = null;
      return;
    }
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, ms);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  return {
    toastMessage,
    setToastMessage,
    toastTimerRef,
    showToast,
  };
}
