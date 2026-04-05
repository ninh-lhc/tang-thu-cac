import React, { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useAppNavigationAndHistory } from './useAppNavigationAndHistory.js';

function NavigationHarness() {
  const [activeTabLon, setActiveTabLon] = useState('ban-do');
  const [activeTabNho, setActiveTabNho] = useState('ha-gioi');
  const [activeTabCon, setActiveTabCon] = useState(null);
  const [selectedEntityId, setSelectedEntityId] = useState('entity-a');
  const [collectionSubTab, setCollectionSubTab] = useState('detail');
  const [navHistory, setNavHistory] = useState([]);
  const [, setEntitySearch] = useState('');
  const [, setRecentlyMergedFields] = useState(new Set());
  const [, setIsEditingMode] = useState(false);
  const [, setIsEntityEditing] = useState(false);
  const [, setQuickCreateData] = useState(null);

  const { handleNavigate } = useAppNavigationAndHistory({
    activeTabLon,
    activeTabNho,
    activeTabCon,
    selectedEntityId,
    collectionSubTab,
    navHistory,
    setNavHistory,
    setEntitySearch,
    setRecentlyMergedFields,
    setActiveTabLon,
    setActiveTabNho,
    setActiveTabCon,
    setSelectedEntityId,
    setCollectionSubTab,
    setIsEditingMode,
    setIsEntityEditing,
    setQuickCreateData,
  });

  return (
    <button
      type="button"
      onClick={() => handleNavigate({ lonId: 'ban-do', nhoId: 'ha-gioi', entityId: 'entity-b' })}
    >
      Navigate
    </button>
  );
}

describe('useAppNavigationAndHistory', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (cb) => setTimeout(cb, 16));
    vi.stubGlobal('cancelAnimationFrame', (id) => clearTimeout(id));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keeps resetting scroll to top after wiki-style navigation', () => {
    render(
      <>
        <div id="main-scroll-container" style={{ height: '120px', overflowY: 'auto' }}>
          <div style={{ height: '1200px' }} />
        </div>
        <div id="collection-scroll-container" style={{ height: '120px', overflowY: 'auto' }}>
          <div style={{ height: '1200px' }} />
        </div>
        <NavigationHarness />
      </>
    );

    const mainScroller = document.getElementById('main-scroll-container');
    const collectionScroller = document.getElementById('collection-scroll-container');
    expect(mainScroller).not.toBeNull();
    expect(collectionScroller).not.toBeNull();

    mainScroller.scrollTop = 180;
    collectionScroller.scrollTop = 260;

    fireEvent.click(screen.getByRole('button', { name: 'Navigate' }));

    // Simulate a late layout/browser restore that tries to keep the old viewport.
    mainScroller.scrollTop = 180;
    collectionScroller.scrollTop = 260;

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(mainScroller.scrollTop).toBe(0);
    expect(collectionScroller.scrollTop).toBe(0);
  });
});
