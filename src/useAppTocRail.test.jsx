// ==========================================
// useAppTocRail.test.jsx
// Covers parent-tab reset behavior in the TOC rail.
// Keeps same-tab clicks returning to the chooser instead of reopening the menu.
// ==========================================

import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppTocRail } from './useAppTocRail.js';

function TocRailHarness() {
  const [activeTabLon, setActiveTabLon] = useState('thien-dia-ki-vat');
  const [activeTabNho, setActiveTabNho] = useState('di-thuoc-tinh');
  const [activeTabCon, setActiveTabCon] = useState('ho-so');
  const [selectedEntityId, setSelectedEntityId] = useState('entity-1');
  const [collectionSubTab, setCollectionSubTab] = useState('detail');
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [isEntityEditing, setIsEntityEditing] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [entitySearch, setEntitySearch] = useState('thai lien');
  const [navHistory, setNavHistory] = useState([]);

  const {
    menu2Expanded,
    setMenu2Expanded,
    handleSelectTabLon,
  } = useAppTocRail({
    activeNovelId: 'novel-1',
    tabGroups: [],
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
    <>
      <button type="button" onClick={() => setMenu2Expanded(false)}>
        Collapse menu
      </button>
      <button type="button" onClick={() => handleSelectTabLon('thien-dia-ki-vat')}>
        Reopen parent tab
      </button>
      <button type="button" onClick={() => handleSelectTabLon('tu-luyen')}>
        Open another parent
      </button>
      <pre data-testid="state">
        {JSON.stringify({
          activeTabLon,
          activeTabNho,
          activeTabCon,
          selectedEntityId,
          collectionSubTab,
          menu2Expanded,
          entitySearch,
          confirmDialogOpen: confirmDialog.isOpen,
          navHistorySize: navHistory.length,
        })}
      </pre>
    </>
  );
}

function readState() {
  return JSON.parse(screen.getByTestId('state').textContent);
}

describe('useAppTocRail', () => {
  afterEach(() => {
    cleanup();
  });

  it('returns to the parent chooser when clicking the active parent tab again', () => {
    render(<TocRailHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'Collapse menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reopen parent tab' }));

    expect(readState()).toMatchObject({
      activeTabLon: 'thien-dia-ki-vat',
      activeTabNho: null,
      activeTabCon: null,
      selectedEntityId: null,
      collectionSubTab: 'list',
      menu2Expanded: false,
      entitySearch: '',
      confirmDialogOpen: false,
      navHistorySize: 0,
    });
  });

  it('still expands the menu when switching to another parent tab', () => {
    render(<TocRailHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'Collapse menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open another parent' }));

    expect(readState()).toMatchObject({
      activeTabLon: 'tu-luyen',
      activeTabNho: null,
      activeTabCon: null,
      selectedEntityId: null,
      collectionSubTab: 'list',
      menu2Expanded: true,
      entitySearch: '',
      confirmDialogOpen: false,
      navHistorySize: 0,
    });
  });
});
