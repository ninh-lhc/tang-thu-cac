// ==========================================
// useAppTocRail.js
// Purpose: own the active novel TOC rail state and navigation helpers.
// Imported by: App.jsx.
// Notes: keeps expand/collapse, guard prompts, and tab jumps out of the main shell.
// ==========================================

import { useCallback, useEffect, useRef, useState } from 'react';

export function useAppTocRail({
  activeNovelId,
  tabGroups,
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
}) {
  const [menu2Expanded, setMenu2Expanded] = useState(true);
  const [collapsedTabGroups, setCollapsedTabGroups] = useState(() => new Set());
  const [sidebarGrouped, setSidebarGrouped] = useState(true);
  const menu2LeaveCollapseTimeoutRef = useRef(null);
  const lastSyncedActiveTabRef = useRef(null);

  const handleMenu2MouseEnter = useCallback(() => {
    if (menu2LeaveCollapseTimeoutRef.current) {
      clearTimeout(menu2LeaveCollapseTimeoutRef.current);
      menu2LeaveCollapseTimeoutRef.current = null;
    }
    setMenu2Expanded(true);
  }, []);

  const handleMenu2MouseLeave = useCallback(() => {
    if (menu2LeaveCollapseTimeoutRef.current) {
      clearTimeout(menu2LeaveCollapseTimeoutRef.current);
    }
    menu2LeaveCollapseTimeoutRef.current = setTimeout(() => {
      setMenu2Expanded(false);
      menu2LeaveCollapseTimeoutRef.current = null;
    }, 140);
  }, []);

  const toggleTabGroupCollapse = useCallback((groupLabel) => {
    setCollapsedTabGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupLabel)) next.delete(groupLabel);
      else next.add(groupLabel);
      return next;
    });
  }, []);

  const handleSelectTabLon = useCallback((tabId) => {
    if (activeTabLon !== tabId) {
      if (isEditingMode || isEntityEditing) {
        setConfirmDialog({
          isOpen: true,
          title: 'Chua Luu Thay Doi',
          message:
            'Ban co thay doi chua duoc luu. Roi di se mat noi dung dang soan. Tiep tuc?',
          onConfirm: () => {
            setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
            setIsEditingMode(false);
            setIsEntityEditing(false);
            setActiveTabLon(tabId);
            setActiveTabNho(null);
            setActiveTabCon(null);
            setSelectedEntityId(null);
            setEntitySearch('');
            setMenu2Expanded(true);
          },
        });
        return;
      }
      setActiveTabLon(tabId);
      setActiveTabNho(null);
      setActiveTabCon(null);
      setSelectedEntityId(null);
      setIsEditingMode(false);
      setIsEntityEditing(false);
      setEntitySearch('');
    }
    setMenu2Expanded(true);
  }, [
    activeTabLon,
    isEditingMode,
    isEntityEditing,
    setConfirmDialog,
    setIsEditingMode,
    setIsEntityEditing,
    setActiveTabLon,
    setActiveTabNho,
    setActiveTabCon,
    setSelectedEntityId,
    setEntitySearch,
  ]);

  const handleSelectTabNho = useCallback((lonId, nhoId) => {
    setActiveTabLon(lonId);
    setActiveTabNho(nhoId);
    setActiveTabCon(null);
    setSelectedEntityId(null);
    setCollectionSubTab('list');
    setIsEditingMode(false);
    setIsEntityEditing(false);
    setEntitySearch('');
  }, [
    setActiveTabLon,
    setActiveTabNho,
    setActiveTabCon,
    setSelectedEntityId,
    setCollectionSubTab,
    setIsEditingMode,
    setIsEntityEditing,
    setEntitySearch,
  ]);

  const handleSelectTabCon = useCallback((conId) => {
    setNavHistory((prev) => [
      ...prev,
      {
        lonId: activeTabLon,
        nhoId: activeTabNho,
        conId: activeTabCon,
        entityId: selectedEntityId,
        subTab: collectionSubTab,
      },
    ]);
    setActiveTabCon(conId);
    setIsEditingMode(false);
  }, [
    activeTabLon,
    activeTabNho,
    activeTabCon,
    selectedEntityId,
    collectionSubTab,
    setNavHistory,
    setActiveTabCon,
    setIsEditingMode,
  ]);

  useEffect(() => {
    return () => {
      if (menu2LeaveCollapseTimeoutRef.current) {
        clearTimeout(menu2LeaveCollapseTimeoutRef.current);
        menu2LeaveCollapseTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const labels = tabGroups.filter((group) => group.groupLabel).map((group) => group.groupLabel);
    const microtask = queueMicrotask(() => setCollapsedTabGroups(new Set(labels)));
    lastSyncedActiveTabRef.current = null;
    return () => microtask;
  }, [activeNovelId, tabGroups]);

  useEffect(() => {
    if (activeTabLon === lastSyncedActiveTabRef.current) return;
    lastSyncedActiveTabRef.current = activeTabLon;
    const group = tabGroups.find((item) => item.tabs.some((tab) => tab.id === activeTabLon));
    if (group?.groupLabel) {
      queueMicrotask(() => {
        setCollapsedTabGroups((prev) => {
          const next = new Set(prev);
          next.delete(group.groupLabel);
          return next;
        });
      });
    }
  }, [activeTabLon, tabGroups]);

  return {
    menu2Expanded,
    setMenu2Expanded,
    sidebarGrouped,
    setSidebarGrouped,
    collapsedTabGroups,
    handleMenu2MouseEnter,
    handleMenu2MouseLeave,
    toggleTabGroupCollapse,
    handleSelectTabLon,
    handleSelectTabNho,
    handleSelectTabCon,
  };
}
