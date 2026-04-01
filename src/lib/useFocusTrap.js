/**
 * Focus trap for modals — giữ focus trong container, Tab/Shift+Tab vòng.
 */
import { useEffect, useRef } from 'react';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
const trapStack = [];

function getFocusableElements(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE)).filter((el) => {
    if (!(el instanceof HTMLElement)) return false;
    if (el.hasAttribute('disabled')) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    return true;
  });
}

export function useFocusTrap(isActive) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;
    const el = containerRef.current;
    const token = Symbol('focus-trap');
    trapStack.push(token);
    const isTopTrap = () => trapStack[trapStack.length - 1] === token;
    const previousFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const hadTabIndex = el.hasAttribute('tabindex');
    const originalTabIndex = el.getAttribute('tabindex');
    if (!hadTabIndex) el.setAttribute('tabindex', '-1');

    const focusFirstInTrap = () => {
      const focusables = getFocusableElements(el);
      const first = focusables[0] || el;
      first?.focus?.();
      return focusables;
    };

    focusFirstInTrap();

    const onKeyDown = (e) => {
      if (!isTopTrap()) return;
      if (e.key !== 'Tab') return;
      const focusables = getFocusableElements(el);
      if (focusables.length === 0) {
        e.preventDefault();
        el.focus?.();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (!el.contains(document.activeElement) || document.activeElement === first) {
          e.preventDefault();
          last?.focus?.();
        }
      } else {
        if (!el.contains(document.activeElement) || document.activeElement === last) {
          e.preventDefault();
          first?.focus?.();
        }
      }
    };

    const onFocusIn = (e) => {
      if (!isTopTrap()) return;
      const target = e.target;
      if (target instanceof Node && el.contains(target)) return;
      focusFirstInTrap();
    };

    el.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      el.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);

      const idx = trapStack.lastIndexOf(token);
      if (idx !== -1) trapStack.splice(idx, 1);

      if (!hadTabIndex) el.removeAttribute('tabindex');
      else if (originalTabIndex == null) el.removeAttribute('tabindex');
      else el.setAttribute('tabindex', originalTabIndex);

      if (previousFocused && document.contains(previousFocused)) {
        previousFocused.focus?.();
      }
    };
  }, [isActive]);

  return containerRef;
}
