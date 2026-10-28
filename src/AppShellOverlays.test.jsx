import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AppShellOverlays } from './AppShellOverlays.jsx';

afterEach(() => cleanup());

function renderToast(overrides = {}) {
  return render(
    <AppShellOverlays
      lightboxSrc={null}
      setLightboxSrc={vi.fn()}
      hoveredNovelData={null}
      tooltipPos={null}
      toastMessage={{ msg: 'Đã ghi lại thay đổi.', type: 'success', ...overrides.toast }}
      toastTimerRef={{ current: null }}
      setToastMessage={vi.fn()}
      isUploading={false}
      importProgress={null}
      isDirectoryConnectionBootstrapping={false}
      currentContextDirHandle={null}
    />,
  );
}

describe('AppShellOverlays toast', () => {
  it('renders toast stack on document.body for viewport-bottom-center positioning', () => {
    renderToast();
    const host = document.body.querySelector('[data-testid="app-shell-toast-host"]');
    expect(host).not.toBeNull();
    expect(host?.parentElement).toBe(document.body);
    expect(host?.className).toContain('global-toast-stack');
    expect(host?.className).toContain('app-shell-toast-host');
    expect(host?.getAttribute('data-toast-stack')).toBe('viewport-bottom-center');
    expect(host?.className).not.toMatch(/\bright-/);
    expect(host?.className).not.toMatch(/justify-end/);
    expect(host?.className).not.toMatch(/\bw-full\b/);
  });

  it('uses content-sized toast item without stretching short messages to full max width', () => {
    renderToast({ toast: { msg: 'Đã tải thành công!', type: 'success' } });
    const toast = screen.getByTestId('app-shell-toast');
    expect(toast.className).toContain('app-shell-toast-item');
    expect(toast.className).not.toMatch(/\bw-full\b/);
    expect(toast.textContent).toContain('Đã tải thành công!');
    expect(toast.querySelector('.app-shell-toast-item__message')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Đóng thông báo' })).toBeTruthy();
  });

  it('wraps long toast copy with message class and close control', () => {
    renderToast({
      toast: {
        msg: 'Không ghi được thư mục lưu trữ — kiểm tra quyền truy cập thư mục trên máy.',
        type: 'error',
      },
    });
    const toast = screen.getByTestId('app-shell-toast');
    expect(toast.className).not.toMatch(/\bfixed\b/);
    expect(toast.className).not.toMatch(/96vw|520px/);
    const textSpan = toast.querySelector('.app-shell-toast-item__message');
    expect(textSpan?.className).toContain('app-shell-toast-item__message');
    expect(textSpan?.className).not.toMatch(/overflow-wrap:anywhere/);
    expect(screen.getByRole('button', { name: 'Đóng thông báo' }).className).toContain(
      'app-shell-toast-item__close',
    );
  });

  it('does not anchor toast item with right-edge fixed classes', () => {
    renderToast();
    const toast = screen.getByTestId('app-shell-toast');
    expect(toast.className).not.toMatch(/\bright-/);
    expect(toast.className).not.toMatch(/left-1\/2/);
    expect(toast.className).not.toMatch(/-translate-x-1\/2/);
  });

  it('keeps undo action button when toast provides onUndo', () => {
    renderToast({
      toast: {
        msg: 'Phục hồi bản chưa kịp ghi.',
        type: 'warning',
        onUndo: vi.fn(),
        undoLabel: 'Hoàn tác',
      },
    });
    expect(screen.getByRole('button', { name: 'Hoàn tác' })).toBeTruthy();
  });
});
