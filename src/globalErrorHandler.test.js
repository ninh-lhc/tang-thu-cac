import { describe, expect, it, vi, afterEach } from 'vitest';
import { installGlobalErrorHandlers } from './globalErrorHandler.js';

function fakeHost() {
  const listeners = {};
  return {
    addEventListener(type, fn) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(fn);
    },
    emit(type, event) {
      (listeners[type] || []).forEach((fn) => fn(event));
    },
    listenerCount(type) {
      return (listeners[type] || []).length;
    },
  };
}

describe('installGlobalErrorHandlers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers unhandledrejection and error listeners', () => {
    const host = fakeHost();
    const spy = vi.spyOn(host, 'addEventListener');
    installGlobalErrorHandlers(host);
    expect(spy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    expect(spy).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('logs an unhandled promise rejection', () => {
    const host = fakeHost();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    installGlobalErrorHandlers(host);
    host.emit('unhandledrejection', { reason: new Error('disk') });
    expect(spy).toHaveBeenCalledWith('[TTC] Unhandled promise rejection:', expect.any(Error));
  });

  it('logs an uncaught error', () => {
    const host = fakeHost();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    installGlobalErrorHandlers(host);
    const error = new Error('render');
    host.emit('error', { message: 'render', error });
    expect(spy).toHaveBeenCalledWith('[TTC] Uncaught error:', error);
  });

  it('ignores ResizeObserver loop noise', () => {
    const host = fakeHost();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    installGlobalErrorHandlers(host);
    host.emit('error', { message: 'ResizeObserver loop completed with undelivered notifications.' });
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not register twice', () => {
    const host = fakeHost();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    installGlobalErrorHandlers(host);
    installGlobalErrorHandlers(host);
    expect(host.listenerCount('error')).toBe(1);
    host.emit('error', { message: 'once', error: new Error('once') });
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
