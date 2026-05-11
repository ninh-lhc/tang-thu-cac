// ==========================================
// useAppTocRail.test.jsx
// Purpose: lock the TOC rail behavior for re-selecting a large tab.
// Imported by: Vitest only.
// Notes: same-tab click should reset back to the large-tab landing state, not just reopen the rail.
// ==========================================

import React, { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useAppTocRail } from './useAppTocRail.js';

function TocRailHarness() {
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, onConfirm: null });
  const [entitySearch, setEntitySearch] = useState('linh');
  const [navHistory, setNavHistory] = useState([]);
  const [activeTabLon, setActiveTabLon] = useState('tu-luyen');
  const [activeTabNho, setActiveTabNho] = useState('he-thong-tu-luyen');
  const [activeTabCon, setActiveTabCon] = useState('chi-tiet');
  const [selectedEntityId, setSelectedEntityId] = useState('entity-1');
  const [collectionSubTab, setCollectionSubTab] = useState('detail');
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [isEntityEditing, setIsEntityEditing] = useState(false);

  const {
    menu2Expanded,
    setMenu2Expanded,
    handleSelectTabLon,
  } = useAppTocRail({
    activeTabLon,
    activeTabNho,
    activeTabCon,
    selectedEntityId,
    collectionSubTab,
    isEditingMode,
    isEntityEditing,
    setConfirmDialog,
    setEntitySearch,
    setNavHistory,
    setActiveTabLon,
    setActiveTabNho,
    setActiveTabCon,
    setSelectedEntityId,
    setCollectionSubTab,
    setIsEditingMode,
    setIsEntityEditing,
  });

  return (
    <div>
      <button type="button" onClick={() => setMenu2Expanded(false)}>
        Collapse rail
      </button>
      <button type="button" onClick={() => handleSelectTabLon('tu-luyen')}>
        Reselect current tab
      </button>
      <button type="button" onClick={() => handleSelectTabLon('ban-do')}>
        Select other tab
      </button>
      <pre data-testid="state">
        {JSON.stringify({
          menu2Expanded,
          activeTabLon,
          activeTabNho,
          activeTabCon,
          selectedEntityId,
          collectionSubTab,
          entitySearch,
          navHistoryLength: navHistory.length,
          confirmOpen: confirmDialog.isOpen,
        })}
      </pre>
    </div>
  );
}

function readState() {
  return JSON.parse(screen.getByTestId('state').textContent);
}

describe('useAppTocRail', () => {
  afterEach(() => {
    cleanup();
  });

  it('resets the current large tab back to its landing state without reopening the rail', () => {
    render(<TocRailHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'Collapse rail' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reselect current tab' }));

    expect(readState()).toMatchObject({
      menu2Expanded: false,
      activeTabLon: 'tu-luyen',
      activeTabNho: null,
      activeTabCon: null,
      selectedEntityId: null,
      collectionSubTab: 'list',
      entitySearch: '',
      confirmOpen: false,
    });
  });

  it('still expands the rail when switching to a different large tab', () => {
    render(<TocRailHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'Collapse rail' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select other tab' }));

    expect(readState()).toMatchObject({
      menu2Expanded: true,
      activeTabLon: 'ban-do',
      activeTabNho: null,
      activeTabCon: null,
      selectedEntityId: null,
      collectionSubTab: 'list',
      entitySearch: '',
      confirmOpen: false,
    });
  });
});
