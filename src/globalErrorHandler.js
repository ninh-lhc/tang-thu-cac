/**
 * Lỗi không bắt được: promise rejection và exception đồng bộ.
 * Chỉ console.error với prefix [TTC]. Không toast, không preventDefault.
 * Ai gọi: src/main.jsx, trước createRoot. Test: globalErrorHandler.test.js
 */

const INSTALLED = '__ttcGlobalErrorHandlers';

export function installGlobalErrorHandlers(target = globalThis.window) {
  if (!target || typeof target.addEventListener !== 'function') return;
  if (target[INSTALLED]) return;
  target[INSTALLED] = true;

  target.addEventListener('unhandledrejection', (event) => {
    console.error(
      '[TTC] Unhandled promise rejection:',
      event?.reason instanceof Error ? event.reason : new Error(String(event?.reason))
    );
  });

  target.addEventListener('error', (event) => {
    if (event?.message?.includes?.('ResizeObserver loop')) return;
    console.error('[TTC] Uncaught error:', event?.error || event?.message);
  });
}
