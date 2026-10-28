import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AppShellOverlays } from './AppShellOverlays.jsx';

afterEach(() => cleanup());

describe('AppShellOverlays toast', () => {
  it('anchors toast bottom-right so it does not cover centered content', () => {
    render(
      <AppShellOverlays
        lightboxSrc={null}
        setLightboxSrc={vi.fn()}
        hoveredNovelData={null}
        tooltipPos={null}
        toastMessage={{ msg: 'Đã ghi lại thay đổi.', type: 'success' }}
        toastTimerRef={{ current: null }}
        setToastMessage={vi.fn()}
        isUploading={false}
        importProgress={null}
        isDirectoryConnectionBootstrapping={false}
        currentContextDirHandle={null}
      />,
    );

    const toast = screen.getByTestId('app-shell-toast');
    expect(toast.className).toMatch(/bottom-6/);
    expect(toast.className).toMatch(/\[right:max\(/);
    expect(toast.className).not.toMatch(/left-1\/2/);
    expect(toast.className).not.toMatch(/-translate-x-1\/2/);
  });
});
