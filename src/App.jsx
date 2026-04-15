// ==========================================
// TRỤ 4: TRẬN NHÃN TRUNG TÂM
// File: App.jsx
// Vai trò: state toàn cục, điều phối, layout chính, quản lý thư mục truyện.
//
// Đã tách (cùng thư mục src/, tên dễ nhớ):
//   appNhatKyVaGoiThe.js - findEntitiesByHintInNovel (mutate), dùng trong useAppMotCuaCapNhat
//   AppPhongChuVaTheme.jsx - font + CSS theme toàn cục
//   AppModalMotCua.jsx - Một cửa cập nhật (tạo thẻ / nhật ký batch)
//   AppModalQuanLyTab.jsx - Trận pháp / quản lý tab
//   AppModalLenhNhanh.jsx - Command palette
//   AppModalGoiYNoiTraCuu.jsx - Gợi ý AI nối tra cứu
//   lib/stripWikiBrackets.js, lib/computeRelatedEntities.js, lib/entityFieldValue.js, lib/entityCollectionQuery.js
//   useAppPersistence.js - sync index + file truyện
//   AppAdvancedFieldSelect.jsx - collection filter select UI
//   AppLibrarySidebar.jsx, useAppLibrarySidebarState.js - library rail UI + state
//   AppNovelTocRail.jsx, useAppTocRail.js - novel TOC rail UI + navigation state
//   useAppDirectoryBackup.js - folder connect + import/export backup handlers
//   useAppImageWorkflow.js - image upload/picker/modal workflow
//   AppShellOverlays.jsx - lightbox, toast, spinner
//   entityProfilePrint.js - template + popup print cho export hồ sơ PDF
//   lib/appTabGroups, appDashboardStats, buildEntityLinkMap, filterNovelsForLibrary, buildCurrentContextDirHandle
//   useAppNovelCrud.js - novel modal state + create/edit/delete handlers
//   useAppPhimTatToanCuc.js - phím tắt Ctrl+K, /, Escape...
//   lib/tinhThongKeNhanhTruyen, locLenhNhanhCommandPalette, xrefBangDanhMucThucThe, xrefChonMucThuThap
//   useAppMotCuaCapNhat.js, lib/hubBangDanhMucCacMucNhatKy - Hub một cửa + catalog nhật ký
// ==========================================

import React, { useDeferredValue, useMemo, useEffect, useRef, useCallback, useState } from 'react';
import {
  FALLBACK_IMG, DEFAULT_ENTITY_FIELDS, GENRES, THEMES,
  INITIAL_TABS_CONFIG,
  DEFAULT_FIELDS_MAP, DEFAULT_FIELDS_BY_PARENT,
  guessFieldsByLabel, isStockTemplate, mergeFieldsTemplate, lockFieldsTemplateIfFirstEntity,
  resolveFieldsTemplate,
} from './MasterEngines.js';
import {
  generateId, safeString, getTerms, sortTabsAlphabetically,
  renderMarkdown,
  analyzeCrossRefNoteWithAI, mapGeminiErrorToUserMessage
} from './MasterUtils.jsx';
import {
  AppHeader,
} from './MasterComponents.jsx';
import { AdvancedFieldSelect } from './AppAdvancedFieldSelect.jsx';
import { AppLibrarySidebar } from './AppLibrarySidebar.jsx';
import { getEntityFieldValue } from './lib/entityFieldValue.js';
import { buildEntitySearchIndexMap, applyEntityCollectionFilters } from './lib/entityCollectionQuery.js';
import { useEntityCollectionQueryState } from './useEntityCollectionQueryState.js';
import {
  buildNovelSearchIndex,
  searchNovelIndex,
  dedupeDeepSearchResults,
  countEntitiesInNovel,
  metadataSearchHits,
} from './deepSearchCore.js';
import { computeRelatedEntities } from './lib/computeRelatedEntities.js';
import { findEntitiesByHintInNovel } from './appNhatKyVaGoiThe.js';
import { AppPhongChuVaTheme } from './AppPhongChuVaTheme.jsx';
import { buildTabGroups } from './lib/appTabGroups.js';
import { renderEntityNotesMarkdown } from './lib/renderEntityNotesMarkdown.jsx';
import { computeDashboardStats } from './lib/appDashboardStats.js';
import { buildEntityLinkMap } from './lib/buildEntityLinkMap.js';
import { resolveEntityPageForSelection } from './lib/entitySelectionPage.js';
import {
  ensureCollectionListCardsForNovel,
  normalizeListGroupStrategy,
  syncAllCollectionListCards,
} from './lib/collectionListCardSync.js';
import { buildCurrentContextDirHandle } from './lib/buildCurrentContextDirHandle.js';
import { useAppPersistence } from './useAppPersistence.js';
import { useAppShellState } from './useAppShellState.js';
import { AppShellOverlays } from './AppShellOverlays.jsx';
import { useAppLibrarySidebarState } from './useAppLibrarySidebarState.js';
import { useAppNavigationAndHistory } from './useAppNavigationAndHistory.js';
import { useAppDirectoryBackup } from './useAppDirectoryBackup.js';
import { useAppImageWorkflow } from './useAppImageWorkflow.js';
import { useAppNovelSelectionAndHydration } from './useAppNovelSelectionAndHydration.js';
import { useAppNovelCrud } from './useAppNovelCrud.js';
import { useAppModalShortcutOrchestration } from './useAppModalShortcutOrchestration.js';
import { useAppEntityMilestoneActions } from './useAppEntityMilestoneActions.js';
import { useAppMotCuaCapNhat } from './useAppMotCuaCapNhat.js';
import { useAppTocRail } from './useAppTocRail.js';
import { computeNovelQuickStats } from './lib/tinhThongKeNhanhTruyen.js';
import { buildXrefEntityCatalogText } from './lib/xrefBangDanhMucThucThe.js';
import { resolveXrefTargetCollectionTab } from './lib/xrefChonMucThuThap.js';
import { buildWikiLinkMatcher } from './lib/wikiLinkMatcher.js';
import { findEquivalentEntityByName, mergeAliasText } from './lib/entityNameIdentity.js';
import { exportEntityProfilePdf } from './entityProfilePrint.js';
import { isMapCollectionScope, syncAllMapHierarchyAutoBlocks } from './lib/mapHierarchySync.js';
import { isCultivationRelationScope, syncAllCultivationRelationBlocks } from './lib/cultivationRelationSync.js';
import { isMainCharacterRelationScope, syncAllMainCharacterRelationBlocks } from './lib/mainCharacterRelationSync.js';
import {
  AUTO_SYNC_ROLE_CHARACTER_RELATED,
  AUTO_SYNC_ROLE_CULTIVATION_REALM,
  AUTO_SYNC_ROLE_CULTIVATION_SYSTEM,
  AUTO_SYNC_ROLE_FORCE,
  AUTO_SYNC_ROLE_MAIN_CHARACTER,
  AUTO_SYNC_ROLE_MAP,
  AUTO_SYNC_ROLE_OFF,
  getEffectiveAutoSyncRole,
  normalizeAutoSyncRole,
} from './lib/tabAutoSyncRole.js';
import {
  getAutoSyncFieldDefs,
  getEffectiveAutoSyncFieldMap,
  getEntityAutoFieldValue,
  hydrateTabsAutoSyncConfigs,
  normalizeAutoSyncFieldMap,
  setEntityAutoFieldValue,
} from './lib/tabAutoSyncFieldMap.js';
import { normalizeTabAutoSyncLevelConfig } from './lib/tabAutoSyncLevels.js';
import {
  guessAutoSyncTargetPathsForTab,
  hydrateTabsAutoSyncLinkTargets,
  normalizeAutoSyncTargetPaths,
  supportsAutoSyncLinkRole,
} from './lib/tabAutoSyncLinks.js';
import {
  buildAutoSyncPlanFromTabContext,
  buildAutoSyncPlanFromTabDiff,
  buildFullAutoSyncPlan,
  runNovelAutoSyncPlan,
} from './lib/autoSyncManager.js';
import { AppMainPane } from './AppMainPane.jsx';
import { AppModalLayer } from './AppModalLayer.jsx';
import { saveGenreTabsTemplate } from './lib/genreTabsTemplateStore.js';
import {
  ensureWikiAliasInFieldsTemplate,
  sanitizeFieldsTemplate,
  linesToSuggestionArray,
  normalizeFieldSuggestionLists,
} from './lib/tabFieldSuggestions.js';

export default function App() {
  const {
    novelsMetadata,
    setNovelsMetadata,
    activeNovelData,
    setActiveNovelData,
    globalTabsConfig,
    setGlobalTabsConfig,
    menu1Visible,
    setMenu1Visible,
    activeTabLon,
    setActiveTabLon,
    activeTabNho,
    setActiveTabNho,
    activeTabCon,
    setActiveTabCon,
    selectedEntityId,
    setSelectedEntityId,
    entityAdvancedRef,
    ENTITY_PAGE_SIZE,
    collectionSubTab,
    setCollectionSubTab,
    navHistory,
    setNavHistory,
    selectedMilestoneId,
    setSelectedMilestoneId,
    editingMilestoneData,
    setEditingMilestoneData,
    isEntityEditing,
    setIsEntityEditing,
    isSplitPreview,
    setIsSplitPreview,
    recentlyMergedFields,
    setRecentlyMergedFields,
    livePreviewText,
    setLivePreviewText,
    debouncedMarkdownPreview,
    setDebouncedMarkdownPreview,
    isExtractingAI,
    setIsExtractingAI,
    isGeneratingReview,
    setIsGeneratingReview,
    isEditingMode,
    setIsEditingMode,
    isSettingsOpen,
    setIsSettingsOpen,
    isManageTabsOpen,
    setIsManageTabsOpen,
    isDeepSearchOpen,
    setIsDeepSearchOpen,
    isInNovelSearchOpen,
    setIsInNovelSearchOpen,
    xrefDraft,
    setXrefDraft,
    neoXrefSectionOpen,
    setNeoXrefSectionOpen,
    overviewNeoOpen,
    setOverviewNeoOpen,
    xrefAiPanel,
    setXrefAiPanel,
    overviewHubOpen,
    setOverviewHubOpen,
    overviewHubTab,
    setOverviewHubTab,
    hubCreatePath,
    setHubCreatePath,
    hubCreateInput,
    setHubCreateInput,
    hubCreatePreview,
    setHubCreatePreview,
    hubCreateBusy,
    setHubCreateBusy,
    hubUpdateChapter,
    setHubUpdateChapter,
    hubUpdateText,
    setHubUpdateText,
    hubUpdatePanel,
    setHubUpdatePanel,
    isEntityModalOpen,
    setIsEntityModalOpen,
    editingEntityData,
    setEditingEntityData,
    isMilestoneModalOpen,
    setIsMilestoneModalOpen,
    isAutoSyncGuideOpen,
    setIsAutoSyncGuideOpen,
    isEntityNotesGuideOpen,
    setIsEntityNotesGuideOpen,
    quickCreateData,
    setQuickCreateData,
    confirmDialog,
    setConfirmDialog,
    overviewForm,
    setOverviewForm,
    wikiExactMatchOnly,
    setWikiExactMatchOnly,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    commandPaletteQuery,
    setCommandPaletteQuery,
    deferredCommandPaletteQuery,
    overviewStatsOpen,
    setOverviewStatsOpen,
    commandPaletteOpenRef,
    dirHandle,
    setDirHandle,
    activeNovelDirHandle,
    setActiveNovelDirHandle,
    toastMessage,
    setToastMessage,
    toastTimerRef,
    showToast,
    lightboxSrc,
    setLightboxSrc,
    editingTab,
    setEditingTab,
    geminiApiKeys,
    handleSaveApiKeys,
    aiMode,
    setAiMode,
    performanceMode,
    setPerformanceMode,
    autoLinkToastEnabled,
    setAutoLinkToastEnabled,
    novelStatsById,
    setNovelStatsById,
    isStatsBackfilling,
    setIsStatsBackfilling,
    isDirectoryConnectionBootstrapping,
    novelStatsByIdRef,
    novelsMetadataRef,
    globalTabsConfigRef,
    dirHandleRef,
    activeNovelDataRef,
    deepSearchIndexByNovelIdRef,
    deepSearchWorkerRef,
    deepSearchWorkerReqIdRef,
    lazyTabLoadInFlightRef,
    lazyFullHydrateInFlightRef,
    confirmDeleteEntityRef,
  } = useAppShellState();

  const {
    librarySearchInputRef,
    searchInput,
    setSearchInput,
    setSearchQuery,
    searchField,
    setSearchField,
    searchHistory,
    isGenreFilterOpen,
    setIsGenreFilterOpen,
    selectedGenres,
    setSelectedGenres,
    toggleGenre,
    filteredNovelsList,
    sidebarListRef,
    handleSidebarScroll,
    totalSidebarItems,
    sidebarItemHeight,
    visibleSidebarNovels,
    sidebarStartIndex,
    hoveredNovelData,
    tooltipPos,
    handleSidebarNovelHover,
    clearHoveredNovel,
  } = useAppLibrarySidebarState({ novelsMetadata });

  const { syncIndex, syncNovel, loadNovelData, syncNovelRef } = useAppPersistence({
    novelStatsByIdRef,
    novelsMetadataRef,
    globalTabsConfigRef,
    dirHandleRef,
    setNovelStatsById,
    showToast,
  });

  const resolveSafeTabsConfig = useCallback(
    (candidate) => (Array.isArray(candidate) && candidate.length > 0 ? candidate : globalTabsConfigRef.current),
    [globalTabsConfigRef]
  );

  const searchRowsInWorker = useCallback((rowsByNovel, query, signal) => {
    const hasRows = rowsByNovel && Object.keys(rowsByNovel).length > 0;
    if (!hasRows) return Promise.resolve([]);
    if (typeof Worker === 'undefined') return Promise.resolve(null);
    if (!deepSearchWorkerRef.current) {
      deepSearchWorkerRef.current = new Worker(new URL('./deepSearch.worker.js', import.meta.url), {
        type: 'module',
      });
    }
    const worker = deepSearchWorkerRef.current;
    const reqId = ++deepSearchWorkerReqIdRef.current;
    return new Promise((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onError);
        if (signal) signal.removeEventListener('abort', onAbort);
      };
      const done = (fn, val) => {
        if (settled) return;
        settled = true;
        cleanup();
        fn(val);
      };
      const onMessage = (evt) => {
        const msg = evt?.data || {};
        if (msg.reqId !== reqId) return;
        done(resolve, msg.ok ? msg.results || [] : []);
      };
      const onError = (err) => done(reject, err);
      const onAbort = () => done(resolve, []);
      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onError);
      if (signal) signal.addEventListener('abort', onAbort, { once: true });
      try {
        worker.postMessage({ type: 'searchRows', reqId, query, rowsByNovel });
      } catch (err) {
        done(reject, err);
      }
    });
  }, [deepSearchWorkerRef, deepSearchWorkerReqIdRef]);

  const dashboardStats = useMemo(
    () => computeDashboardStats(novelsMetadata, novelStatsById),
    [novelsMetadata, novelStatsById]
  );

  const activeThemeClass = useMemo(() => {
      if (!activeNovelData) return 'theme-tien-hiep';
      return activeNovelData.theme || 'theme-tien-hiep';
  }, [activeNovelData]);

  const currentContextDirHandle = useMemo(
    () => buildCurrentContextDirHandle(dirHandle, activeNovelDirHandle),
    [dirHandle, activeNovelDirHandle]
  );

  const activeTabs = useMemo(() => activeNovelData?.tabsConfig || globalTabsConfig, [activeNovelData, globalTabsConfig]);
  const sortedTabs = useMemo(() => sortTabsAlphabetically(activeTabs), [activeTabs]);

  const tabGroups = useMemo(() => buildTabGroups(sortedTabs), [sortedTabs]);


  const dirName = typeof dirHandle === 'string' ? 'Bộ nhớ đệm' : (dirHandle?.name || '');
  
  const currentTabConfig = useMemo(() => {
    if (!activeTabLon) return null;
    const parent = sortedTabs.find(t => t.id === activeTabLon);
    const tab = parent?.subTabs?.find(s => s.id === activeTabNho) || parent;
    if (!tab) return null;
    // Chỉ inject template mặc định khi chưa có template đã lưu (giữ nhãn tùy chỉnh)
    if (tab.viewType === 'collection-track') {
      const cur = tab.fieldsTemplate;
      if (!cur || cur.length === 0) {
        const targetTemplate =
          DEFAULT_FIELDS_MAP[tab.id] ||
          DEFAULT_FIELDS_BY_PARENT[parent?.id] ||
          guessFieldsByLabel(tab.label || '') ||
          guessFieldsByLabel(parent?.label || '');
        if (targetTemplate) return { ...tab, fieldsTemplate: targetTemplate, _parentLabel: parent?.label || '' };
      }
    }
    return { ...tab, _parentLabel: parent?.label || '' };
  }, [sortedTabs, activeTabLon, activeTabNho]);

  const currentStandardData = useMemo(() => {
    if (!activeNovelData || !activeTabLon || !activeTabNho) return '';
    let data;
    if (activeTabCon) data = activeNovelData.data?.[activeTabLon]?.[activeTabNho]?.[activeTabCon];
    else data = activeNovelData.data?.[activeTabLon]?.[activeTabNho];
    if (typeof data === 'object' && data !== null) return data.overview || '';
    return typeof data === 'string' ? data : '';
  }, [activeNovelData, activeTabLon, activeTabNho, activeTabCon]);

  const collectionEntitiesRaw = useMemo(() => {
    if (!activeNovelData || !activeTabLon || !currentTabConfig || currentTabConfig.viewType !== 'collection-track') return [];
    const tabData = activeNovelData.data?.[activeTabLon]?.[activeTabNho || 'default'];
    if (!tabData || typeof tabData === 'string') return [];
    return tabData.entities ? [...tabData.entities] : [];
  }, [activeNovelData, activeTabLon, activeTabNho, currentTabConfig]);
  const entityFilterFields = useMemo(() => {
    const templateFields =
      currentTabConfig?.viewType === 'collection-track' && activeTabLon
        ? resolveFieldsTemplate(
            currentTabConfig,
            activeTabLon,
            sortedTabs.find((t) => t.id === activeTabLon)?.label || ''
          )
        : currentTabConfig?.fieldsTemplate || DEFAULT_ENTITY_FIELDS;
    const labelMap = new Map(
      templateFields
        .filter((f) => f && f.id)
        .map((f) => [f.id, safeString(f.label || f.id)])
    );
    const templateEntity = collectionEntitiesRaw.find((ent) => ent?.isTemplate);
    const firstEntityWithDynamicData =
      templateEntity ||
      collectionEntitiesRaw.find((ent) => ent?.dynamicData && Object.keys(ent.dynamicData).length > 0);
    const dynamicKeys = firstEntityWithDynamicData?.dynamicData
      ? Object.keys(firstEntityWithDynamicData.dynamicData).filter(Boolean)
      : [];
    if (dynamicKeys.length > 0) {
      return dynamicKeys.map((id) => ({
        id,
        label: labelMap.get(id) || safeString(id),
      }));
    }
    return templateFields;
  }, [collectionEntitiesRaw, currentTabConfig, activeTabLon, sortedTabs]);
  const {
    entitySearch, setEntitySearch,
    entityFilterField, setEntityFilterField,
    entityFilterValue, setEntityFilterValue,
    entitySortMode, setEntitySortMode,
    entityGroupBy, setEntityGroupBy,
    showEntityAdvanced, setShowEntityAdvanced,
    entityPage, setEntityPage,
    groupVisibleCount, setGroupVisibleCount,
    isEntityAdvancedActive,
    entityFilterOptions,
    entityGroupOptions,
    clearEntityAdvanced,
    entityContextPresets,
    applyEntityPreset,
  } = useEntityCollectionQueryState({
    activeNovelId: activeNovelData?.id,
    activeTabLon,
    activeTabNho,
    entityFilterFields,
  });
  const {
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
  } = useAppTocRail({
    activeNovelId: activeNovelData?.id,
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
  });
  const deferredEntitySearch = useDeferredValue(entitySearch);
  const deferredEntityFilterValue = useDeferredValue(entityFilterValue);
  const entitySearchIndexById = useMemo(
    () => buildEntitySearchIndexMap(collectionEntitiesRaw),
    [collectionEntitiesRaw]
  );
  const entitiesList = useMemo(
    () =>
      applyEntityCollectionFilters(collectionEntitiesRaw, {
        entityFilterField,
        entityFilterValue: deferredEntityFilterValue,
        entitySearchQuery: deferredEntitySearch,
        entitySearchIndexById,
        entitySortMode,
      }),
    [
      collectionEntitiesRaw,
      entitySearchIndexById,
      deferredEntitySearch,
      deferredEntityFilterValue,
      entityFilterField,
      entitySortMode,
    ]
  );
  const pagedEntitiesList = useMemo(
    () => entitiesList.slice((entityPage - 1) * ENTITY_PAGE_SIZE, entityPage * ENTITY_PAGE_SIZE),
    [entitiesList, entityPage, ENTITY_PAGE_SIZE]
  );
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(entitiesList.length / ENTITY_PAGE_SIZE));
    setEntityPage((p) => (p > maxPage ? maxPage : p));
  }, [entitiesList.length, ENTITY_PAGE_SIZE, setEntityPage]);
  useEffect(() => {
    if (entityGroupBy !== 'none') return;
    if (currentTabConfig?.viewType !== 'collection-track') return;
    const targetPage = resolveEntityPageForSelection(entitiesList, selectedEntityId, ENTITY_PAGE_SIZE);
    if (!targetPage) return;
    setEntityPage((currentPage) => (currentPage === targetPage ? currentPage : targetPage));
  }, [
    currentTabConfig,
    entitiesList,
    entityGroupBy,
    selectedEntityId,
    ENTITY_PAGE_SIZE,
    setEntityPage,
  ]);
  const groupedEntitiesList = useMemo(() => {
    if (entityGroupBy === 'none') return [];
    const groups = {};
    entitiesList.forEach((ent) => {
      const val = getEntityFieldValue(ent, entityGroupBy).trim() || '— Chưa phân loại —';
      if (!groups[val]) groups[val] = [];
      groups[val].push(ent);
    });
    return Object.entries(groups).sort((a, b) => {
      if (a[0] === '— Chưa phân loại —') return 1;
      if (b[0] === '— Chưa phân loại —') return -1;
      return a[0].localeCompare(b[0], 'vi');
    });
  }, [entitiesList, entityGroupBy]);

  /** Thực thể có kỷ nguyên trong [neo-12, neo+30] — mọi mục sưu tập */
  const nearChapterEntitiesGlobal = useMemo(() => {
    if (!activeNovelData) return [];
    if (!overviewNeoOpen) return [];
    const anchor = Math.max(0, parseInt(activeNovelData.readingAnchorChapter ?? activeNovelData.chaptersRead ?? 0, 10) || 0);
    const lo = anchor - 12;
    const hi = anchor + 30;
    const cfg = activeNovelData.tabsConfig || globalTabsConfig;
    const seen = new Set();
    const NEAR_CHAPTER_MAX = 120;
    const out = [];
    (cfg || []).forEach((lon) => {
      (lon.subTabs || []).forEach((nho) => {
        if (out.length >= NEAR_CHAPTER_MAX) return;
        if (nho.viewType !== 'collection-track') return;
        const tabData = activeNovelData.data?.[lon.id]?.[nho.id];
        (tabData?.entities || []).forEach((ent) => {
          if (out.length >= NEAR_CHAPTER_MAX) return;
          const hit = (ent.milestones || []).some((ms) => {
            const c = parseInt(ms.chapter, 10);
            return !isNaN(c) && c >= lo && c <= hi;
          });
          if (!hit) return;
          const k = `${lon.id}|${nho.id}|${ent.id}`;
          if (seen.has(k)) return;
          seen.add(k);
          out.push({ ent, lonId: lon.id, nhoId: nho.id, sectionLabel: nho.label });
        });
      });
    });
    return out;
  }, [activeNovelData, globalTabsConfig, overviewNeoOpen]);

  useEffect(() => {
    if (!showEntityAdvanced) return undefined;
    const handleOutside = (event) => {
      if (!entityAdvancedRef.current) return;
      if (!entityAdvancedRef.current.contains(event.target)) setShowEntityAdvanced(false);
    };
    const handleEsc = (event) => {
      if (event.key === 'Escape') setShowEntityAdvanced(false);
    };
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('touchstart', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('touchstart', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [showEntityAdvanced, entityAdvancedRef, setShowEntityAdvanced]);
  /** Luon resolve tu toan bo entities tab - khong dung entitiesList da loc theo o tim. */
  const selectedEntity = useMemo(() => {
    if (!activeNovelData || !activeTabLon || !selectedEntityId) return undefined;
    if (!currentTabConfig || currentTabConfig.viewType !== 'collection-track') return undefined;
    const tabData = activeNovelData.data?.[activeTabLon]?.[activeTabNho || 'default'];
    if (!tabData || typeof tabData === 'string' || !Array.isArray(tabData.entities)) return undefined;
    return tabData.entities.find((e) => e.id === selectedEntityId);
  }, [activeNovelData, activeTabLon, activeTabNho, currentTabConfig, selectedEntityId]);

  /** Đổi mục / loại tab: bỏ chọn thẻ nếu không còn thuộc tab collection hiện tại hoặc thẻ đã bị xóa. */
  useEffect(() => {
    if (!selectedEntityId) return;

    const clearEntitySelection = () => {
      setSelectedEntityId(null);
      setSelectedMilestoneId(null);
      setEditingMilestoneData(null);
      setIsEntityModalOpen(false);
      setIsMilestoneModalOpen(false);
      setCollectionSubTab((sub) => (sub === 'detail' || sub === 'timeline' ? 'list' : sub));
    };

    if (!activeNovelData) {
      clearEntitySelection();
      return;
    }
    if (!activeTabLon || !activeTabNho || !currentTabConfig || currentTabConfig.viewType !== 'collection-track') {
      clearEntitySelection();
      return;
    }
    const tabData = activeNovelData.data?.[activeTabLon]?.[activeTabNho || 'default'];
    if (!tabData || typeof tabData === 'string' || !Array.isArray(tabData.entities)) {
      clearEntitySelection();
      return;
    }
    if (!tabData.entities.some((e) => e.id === selectedEntityId)) {
      clearEntitySelection();
    }
  }, [
    activeNovelData,
    activeTabLon,
    activeTabNho,
    currentTabConfig,
    selectedEntityId,
    setCollectionSubTab,
    setEditingMilestoneData,
    setIsEntityModalOpen,
    setIsMilestoneModalOpen,
    setSelectedEntityId,
    setSelectedMilestoneId,
  ]);

  // Global map - toan bo truyen, dung de resolve [[...]] link va renderMarkdown lookup.
  const entityMap = useMemo(() => buildEntityLinkMap(activeNovelData), [activeNovelData]);

  // Local/scoped map — chỉ tab hiện tại, dùng cho plain-text auto-link matcher (hiệu năng).
  const localEntityMap = useMemo(() => {
    if (!activeNovelData) return [];
    if (currentTabConfig?.viewType === 'collection-track' && activeTabLon) {
      const nhoId = activeTabNho || 'default';
      const tabData = activeNovelData.data?.[activeTabLon]?.[nhoId];
      const entities = Array.isArray(tabData?.entities) ? tabData.entities : [];
      const temp = [];
      const addNames = (nameStr, dest) => {
        if (!nameStr || typeof nameStr !== 'string') return;
        nameStr.split(/[,/|()]/).forEach((n) => {
          const clean = n.trim();
          if (clean.length >= 2 && clean.length <= 40) temp.push({ name: clean, dest });
        });
      };
      for (const ent of entities) {
        const dest = { lonId: activeTabLon, nhoId, entityId: ent.id };
        addNames(ent.name, dest);
        if (ent.dynamicData?.f_alias) addNames(ent.dynamicData.f_alias, dest);
      }
      const uniq = [];
      const seen = new Set();
      for (const item of temp) {
        const low = item.name.toLowerCase();
        if (seen.has(low)) continue;
        seen.add(low);
        uniq.push(item);
      }
      if (uniq.length > 0) return uniq.sort((a, b) => b.name.length - a.name.length);
    }
    return entityMap;
  }, [activeNovelData, currentTabConfig?.viewType, activeTabLon, activeTabNho, entityMap]);
  const deferredLocalEntityMap = useDeferredValue(localEntityMap);
  const shouldBuildGlobalRegex = useMemo(() => {
    if (isSplitPreview) return true;
    if (currentTabConfig?.viewType !== 'collection-track') return true;
    return collectionSubTab === 'detail' || collectionSubTab === 'timeline';
  }, [isSplitPreview, currentTabConfig?.viewType, collectionSubTab]);

  const globalLinkRegex = useMemo(() => {
     if (!shouldBuildGlobalRegex) return null;
     if (!deferredLocalEntityMap || deferredLocalEntityMap.length === 0) return null;
     return buildWikiLinkMatcher(deferredLocalEntityMap);
  }, [deferredLocalEntityMap, shouldBuildGlobalRegex]);

  const [relatedEntities, setRelatedEntities] = useState([]);
  const [isCalculatingNetwork, setIsCalculatingNetwork] = useState(false);

  useEffect(() => {
    if (!activeNovelData || !selectedEntity || collectionSubTab !== 'detail') {
      setRelatedEntities([]);
      setIsCalculatingNetwork(false);
      return;
    }
    setIsCalculatingNetwork(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      try {
        const relations = computeRelatedEntities({
          activeNovelData,
          selectedEntity,
          activeTabs,
          entityMap,
          wikiExactMatchOnly,
          maxResults: 300,
        });
        if (!cancelled) setRelatedEntities(relations);
      } catch (err) {
        console.error('computeRelatedEntities', err);
        if (!cancelled) setRelatedEntities([]);
      } finally {
        if (!cancelled) setIsCalculatingNetwork(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      setIsCalculatingNetwork(false);
    };
  }, [activeNovelData, selectedEntity, activeTabs, entityMap, wikiExactMatchOnly, collectionSubTab]);

  const findEntitiesByXrefHint = useCallback(
    (hint) => findEntitiesByHintInNovel(activeNovelData, hint),
    [activeNovelData]
  );

  const runXrefAiForRow = useCallback(
    async (xref) => {
      if (!activeNovelData || geminiApiKeys.length === 0) {
        showToast('Cần API Key (Cài đặt) để gợi ý AI.', 'warning');
        return;
      }
      setXrefAiPanel({ xref, suggestions: [], loading: true, error: '' });
      try {
        const catalog = buildXrefEntityCatalogText(activeNovelData, safeString);
        const { suggestions } = await analyzeCrossRefNoteWithAI(geminiApiKeys, {
          novelTitle: activeNovelData.title,
          fromCh: xref.fromCh,
          toCh: xref.toCh,
          note: xref.note,
          entityCatalog: catalog,
        });
        setXrefAiPanel((p) =>
          p && p.xref?.id === xref.id ? { ...p, loading: false, suggestions: suggestions || [] } : p
        );
      } catch (e) {
        setXrefAiPanel((p) =>
          p && p.xref?.id === xref.id
            ? { ...p, loading: false, error: mapGeminiErrorToUserMessage(e) }
            : p
        );
      }
    },
    [activeNovelData, geminiApiKeys, setXrefAiPanel, showToast]
  );

  const applyXrefSuggestionNewEntity = useCallback(
    (s, xref) => {
      const path = resolveXrefTargetCollectionTab(
        s.tabLonId,
        s.tabNhoId,
        activeNovelData?.tabsConfig || globalTabsConfig
      );
      if (!path) {
        showToast('Không tìm thấy mục sưu tập phù hợp.', 'warning');
        return;
      }
      setNavHistory((prev) => [
        ...prev,
        { lonId: activeTabLon, nhoId: activeTabNho, conId: activeTabCon, entityId: selectedEntityId, subTab: collectionSubTab },
      ]);
      setActiveTabLon(path.lonId);
      setActiveTabNho(path.nhoId);
      setActiveTabCon(null);
      setSelectedEntityId(null);
      setCollectionSubTab('list');
      setEntitySearch('');
      setEditingEntityData({
        id: null,
        name: safeString(s.suggestedName) || 'Chưa đặt tên',
        avatar: '',
        rawText: safeString(s.draftRawText) || safeString(xref?.note) || '',
        dynamicData: {},
      });
      setIsEntityModalOpen(true);
      setXrefAiPanel(null);
      showToast('Đã mở form tạo thẻ — kiểm tra rồi Lưu.');
    },
    [
      activeNovelData?.tabsConfig,
      globalTabsConfig,
      activeTabLon,
      activeTabNho,
      activeTabCon,
      selectedEntityId,
      collectionSubTab,
      setActiveTabCon,
      setActiveTabLon,
      setActiveTabNho,
      setCollectionSubTab,
      setEditingEntityData,
      setEntitySearch,
      setIsEntityModalOpen,
      setNavHistory,
      setSelectedEntityId,
      setXrefAiPanel,
      showToast,
    ]
  );

  const applyXrefSuggestionMilestone = useCallback(
    (matchRow, suggestion, xref) => {
      const ch = parseInt(suggestion?.chapter, 10);
      const chFinal = !isNaN(ch) && ch >= 0 ? ch : Math.max(0, parseInt(xref?.fromCh, 10) || 0);
      const ev = safeString(suggestion?.eventText) || safeString(xref?.note);
      setNavHistory((prev) => [
        ...prev,
        { lonId: activeTabLon, nhoId: activeTabNho, conId: activeTabCon, entityId: selectedEntityId, subTab: collectionSubTab },
      ]);
      setActiveTabLon(matchRow.lonId);
      setActiveTabNho(matchRow.nhoId);
      setActiveTabCon(null);
      setSelectedEntityId(matchRow.ent.id);
      setCollectionSubTab('detail');
      setEditingMilestoneData({ id: null, chapter: String(chFinal), event: ev });
      setIsMilestoneModalOpen(true);
      setXrefAiPanel(null);
      showToast(`Mốc cho «${safeString(matchRow.ent.name)}» — chỉnh rồi Lưu.`);
    },
    [
      activeTabLon,
      activeTabNho,
      activeTabCon,
      selectedEntityId,
      collectionSubTab,
      setActiveTabCon,
      setActiveTabLon,
      setActiveTabNho,
      setCollectionSubTab,
      setEditingMilestoneData,
      setIsMilestoneModalOpen,
      setNavHistory,
      setSelectedEntityId,
      setXrefAiPanel,
      showToast,
    ]
  );

  const applyXrefSuggestionProfile = useCallback(
    (matchRow, suggestion, novelData) => {
      const tabData = novelData?.data?.[matchRow.lonId]?.[matchRow.nhoId];
      const ent = tabData?.entities?.find((e) => e.id === matchRow.ent.id);
      if (!ent) {
        showToast('Không tìm thấy thẻ.', 'error');
        return;
      }
      const note = safeString(suggestion?.profileNote);
      setNavHistory((prev) => [
        ...prev,
        { lonId: activeTabLon, nhoId: activeTabNho, conId: activeTabCon, entityId: selectedEntityId, subTab: collectionSubTab },
      ]);
      setActiveTabLon(matchRow.lonId);
      setActiveTabNho(matchRow.nhoId);
      setActiveTabCon(null);
      setSelectedEntityId(matchRow.ent.id);
      setCollectionSubTab('detail');
      setEditingEntityData({
        ...ent,
        rawText:
          safeString(ent.rawText) +
          (note ? `\n\n— Gợi ý từ nối tra cứu —\n${note}` : ''),
      });
      setIsEntityModalOpen(true);
      setXrefAiPanel(null);
      showToast('Đã mở sửa thẻ — xem phần bản thảo / AI điền form.');
    },
    [
      activeTabLon,
      activeTabNho,
      activeTabCon,
      selectedEntityId,
      collectionSubTab,
      setActiveTabCon,
      setActiveTabLon,
      setActiveTabNho,
      setCollectionSubTab,
      setEditingEntityData,
      setIsEntityModalOpen,
      setNavHistory,
      setSelectedEntityId,
      setXrefAiPanel,
      showToast,
    ]
  );

  useEffect(() => {
    if (!isSplitPreview) return;
    const delay = (livePreviewText || '').length > 40000 ? 800 : 300;
    const t = setTimeout(() => setDebouncedMarkdownPreview(livePreviewText), delay);
    return () => clearTimeout(t);
  }, [livePreviewText, isSplitPreview, setDebouncedMarkdownPreview]);

  useEffect(() => {
    if (!dirHandle || novelsMetadata.length === 0) return;
    let cancelled = false;
    const root = dirHandle;
    const run = async () => {
      const need = novelsMetadata.filter((m) => !novelStatsByIdRef.current[m.id]);
      const toRecalc = need.length > 0 ? need : novelsMetadata;
      if (toRecalc.length === 0 || cancelled) return;
      setIsStatsBackfilling(true);
      try {
        const acc = { ...novelStatsByIdRef.current };
        const chunk = 2;
        for (let i = 0; i < toRecalc.length; i += chunk) {
          if (cancelled) return;
          const batch = toRecalc.slice(i, i + chunk);
          await Promise.all(
            batch.map(async (meta) => {
              try {
                const loaded = await loadNovelData(meta, root);
                acc[meta.id] = loaded?.novel
                  ? countEntitiesInNovel(loaded.novel)
                  : { entities: 0, milestones: 0, byTab: [] };
              } catch {
                acc[meta.id] = { entities: 0, milestones: 0, byTab: [] };
              }
            })
          );
          novelStatsByIdRef.current = { ...acc };
          setNovelStatsById({ ...acc });
        }
        if (!cancelled) {
          await syncIndex(novelsMetadataRef.current, globalTabsConfigRef.current, root, acc);
        }
      } finally {
        setIsStatsBackfilling(false);
      }
    };
    let idleId;
    if (typeof requestIdleCallback !== 'undefined') {
      idleId = requestIdleCallback(() => { run(); }, { timeout: 5000 });
    } else {
      idleId = setTimeout(() => { run(); }, 400);
    }
    return () => {
      cancelled = true;
      if (typeof cancelIdleCallback === 'function') try { cancelIdleCallback(idleId); } catch { void 0; }
      clearTimeout(idleId);
    };
  }, [
    novelsMetadata,
    dirHandle,
    activeNovelData?.id,
    globalTabsConfigRef,
    loadNovelData,
    novelStatsByIdRef,
    novelsMetadataRef,
    setIsStatsBackfilling,
    setNovelStatsById,
    syncIndex,
  ]);

  const performDeepSearch = useCallback(
    async (query, signal, onProgress) => {
      const q = String(query || '').trim().toLowerCase();
      if (!q) return [];
      const res = [...metadataSearchHits(novelsMetadata, q)];
      const tick = () => onProgress?.(dedupeDeepSearchResults([...res]));
      tick();
      if (!dirHandle) return dedupeDeepSearchResults(res);
      const chunk = 2;
      for (let i = 0; i < novelsMetadata.length; i += chunk) {
        if (signal?.aborted) return dedupeDeepSearchResults(res);
        const batch = novelsMetadata.slice(i, i + chunk);
        const rowsByNovel = {};
        await Promise.all(
          batch.map(async (meta) => {
            if (signal?.aborted) return;
            let indexRows = deepSearchIndexByNovelIdRef.current.get(meta.id) || null;
            if (!indexRows) {
              let d = null;
              const activeIsPartial = activeNovelData?.id === meta.id && activeNovelData?.__partialData;
              if (activeNovelData?.id === meta.id && !activeIsPartial) d = activeNovelData;
              else d = (await loadNovelData(meta, dirHandle))?.novel;
              if (!d || typeof d !== 'object') return;
              indexRows = buildNovelSearchIndex({ ...d, id: meta.id, title: d.title || meta.title });
              deepSearchIndexByNovelIdRef.current.set(meta.id, indexRows);
            }
            rowsByNovel[meta.id] = indexRows;
          })
        );
        let batchResults = [];
        try {
          const workerResults = await searchRowsInWorker(rowsByNovel, q, signal);
          if (Array.isArray(workerResults)) batchResults = workerResults;
        } catch {
          batchResults = [];
        }
        if (batchResults.length === 0) {
          Object.values(rowsByNovel).forEach((rows) => searchNovelIndex(rows, q, batchResults));
          batchResults = dedupeDeepSearchResults(batchResults);
        }
        res.push(...batchResults);
        tick();
      }
      return dedupeDeepSearchResults(res);
    },
    [novelsMetadata, activeNovelData, deepSearchIndexByNovelIdRef, dirHandle, loadNovelData, searchRowsInWorker]
  );

  const updateActiveNovelData = useCallback(
    (updateFn) => {
      const currentData = activeNovelDataRef.current;
      if (!currentData) return;
      const updatedData = structuredClone(currentData);
      updateFn(updatedData);
      const nextStats = { ...novelStatsByIdRef.current };
      if (!updatedData.__partialData) {
        nextStats[updatedData.id] = countEntitiesInNovel(updatedData);
      }
      novelStatsByIdRef.current = nextStats;
      setNovelStatsById(nextStats);
      activeNovelDataRef.current = updatedData;
      setActiveNovelData(updatedData);
      deepSearchIndexByNovelIdRef.current.set(
        updatedData.id,
        buildNovelSearchIndex(updatedData)
      );
      const syncPromise = syncNovel(updatedData, dirHandle);

      const newMetaStr = JSON.stringify({
        title: updatedData.title,
        cover: updatedData.cover,
        tags: updatedData.tags,
        review: updatedData.review,
        status: updatedData.status,
        genres: updatedData.genres || [updatedData.genre],
        theme: updatedData.theme,
        author: updatedData.author,
        folderName: updatedData.folderName,
      });
      const oldMetaStr = JSON.stringify({
        title: currentData.title,
        cover: currentData.cover,
        tags: currentData.tags,
        review: currentData.review,
        status: currentData.status,
        genres: currentData.genres || [currentData.genre],
        theme: currentData.theme,
        author: currentData.author,
        folderName: currentData.folderName,
      });

      if (oldMetaStr !== newMetaStr) {
        const newMetaList = novelsMetadata.map((m) =>
          m.id === updatedData.id
            ? {
                ...m,
                title: updatedData.title,
                cover: updatedData.cover,
                tags: updatedData.tags,
                review: updatedData.review,
                status: updatedData.status,
                genres: updatedData.genres || [updatedData.genre],
                theme: updatedData.theme || 'theme-tien-hiep',
                author: updatedData.author,
                chaptersTotal: updatedData.chaptersTotal,
                folderName: updatedData.folderName || m.folderName,
              }
            : m
        );
        setNovelsMetadata(newMetaList);
        novelsMetadataRef.current = newMetaList;
        syncIndex(newMetaList, globalTabsConfig, dirHandle, nextStats);
      }
      return syncPromise;
    },
    [
      deepSearchIndexByNovelIdRef,
      dirHandle,
      globalTabsConfig,
      novelStatsByIdRef,
      novelsMetadata,
      activeNovelDataRef,
      novelsMetadataRef,
      setActiveNovelData,
      setNovelStatsById,
      setNovelsMetadata,
      syncIndex,
      syncNovel,
    ]
  );

  const {
    openOverviewHub,
    hubRunCreateAi,
    hubSaveCreateEntity,
    runHubUpdateAi,
    applyHubUpdateSelected,
  } = useAppMotCuaCapNhat({
    activeNovelData,
    activeTabs,
    geminiApiKeys,
    aiMode,
    showToast,
    updateActiveNovelData,
    hubCreatePath,
    hubCreateInput,
    hubCreatePreview,
    hubUpdateChapter,
    hubUpdateText,
    hubUpdatePanel,
    setOverviewHubOpen,
    setOverviewHubTab,
    setHubCreatePreview,
    setHubUpdatePanel,
    setHubCreateInput,
    setHubUpdateChapter,
    setHubCreatePath,
    setHubCreateBusy,
    setHubUpdateText,
    setActiveNovelData,
    syncNovelRef,
    dirHandleRef,
  });

  const { handleNavigate, handleGoBack } = useAppNavigationAndHistory({
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

  const handleConfirmQuickCreate = (name, path) => {
      const [lonId, nhoId] = path.split('|');
      const lon = activeTabs.find((tab) => tab.id === lonId);
      const nho = lon?.subTabs?.find((sub) => sub.id === nhoId);
      const autoCtx = buildAutoSyncContext(lonId, nhoId, nho, lon?.label || '');
      const quickName = safeString(name).trim();
      if (!quickName) return;
      const newEntityId = generateId('ent');
      let targetExistingId = null;
      updateActiveNovelData(nov => {
          if (!nov.data) nov.data = {}; if (!nov.data[lonId]) nov.data[lonId] = {};
          let tabData = nov.data[lonId][nhoId];
          if (!tabData || typeof tabData === 'string') tabData = { overview: '', entities: [] };
          if (!tabData.entities) tabData.entities = [];
          const matched = findEquivalentEntityByName(tabData.entities, quickName, {
            allowExactNameMatch: false,
          });
          if (matched?.entity) {
            targetExistingId = matched.entity.id;
            mergeNameIntoAutoAlias(matched.entity, quickName, autoCtx);
          } else {
            tabData.entities.push({ id: newEntityId, name: quickName, avatar: '', rawText: '', dynamicData: {}, info: '', milestones: [], images: [] });
          }
          nov.data[lonId][nhoId] = tabData;
          if (!targetExistingId) lockFieldsTemplateIfFirstEntity(nov, lonId, nhoId);
          if (isMapCollectionScope({ activeTabLon: lonId, activeTabNho: nhoId, currentTabConfig: nho, parentLabel: lon?.label || '' })) {
            syncAllMapHierarchyAutoBlocks(nov);
          }
          if (isCultivationRelationScope({ activeTabLon: lonId, activeTabNho: nhoId, currentTabConfig: nho })) {
            syncAllCultivationRelationBlocks(nov);
          }
          if (
            isMainCharacterRelationScope({
              activeTabLon: lonId,
              activeTabNho: nhoId,
              currentTabConfig: nho,
              parentLabel: lon?.label || '',
            })
          ) {
            syncAllMainCharacterRelationBlocks(nov);
          }
          syncAllCollectionListCards(nov);
      });
      if (targetExistingId) {
        showToast(`"${quickName}" đã trùng thẻ có sẵn - đã thêm vào bí danh và liên kết về thẻ cũ.`, 'warning');
        handleNavigate({ lonId, nhoId, entityId: targetExistingId });
        return;
      }
      showToast(`Đã ngưng tụ thành công ${quickName}!`);
      handleNavigate({ lonId, nhoId, entityId: newEntityId });
  };

  const handleUpdateTabTemplate = (newFields) => {
    let forceWarning = '';
    updateActiveNovelData(nov => {
       if (!nov.tabsConfig) nov.tabsConfig = [];
       const lon = nov.tabsConfig.find(t => t.id === activeTabLon);
       const nho = lon?.subTabs?.find(s => s.id === activeTabNho);
       if (!nho) return;
       nho.fieldsTemplate = newFields;
       if (nho.viewType === 'collection-track') {
        const autoCtx = buildAutoSyncContext(activeTabLon, activeTabNho, nho, lon?.label || '');
        const effectiveRole = getEffectiveAutoSyncRole(autoCtx);
        if (effectiveRole && effectiveRole !== AUTO_SYNC_ROLE_OFF) {
          const seededFieldMap = normalizeAutoSyncFieldMap(getEffectiveAutoSyncFieldMap(autoCtx), effectiveRole);
          if (Object.keys(seededFieldMap).length > 0) nho.autoSyncFieldMap = seededFieldMap;
          else delete nho.autoSyncFieldMap;
        }
       }
       const autoSyncResult = runNovelAutoSyncPlan(
         nov,
         buildAutoSyncPlanFromTabContext(buildAutoSyncContext(activeTabLon, activeTabNho, nho, lon?.label || '')),
         {
           recordLog: true,
           reason: 'tab_template',
           scopeLabel: buildTabScopeLabel(activeTabLon, activeTabNho, nov.tabsConfig),
         }
       );
       forceWarning = autoSyncResult.forceWarning || '';
    });
    if (forceWarning) showToast(forceWarning, 'warning');
  };

  const {
    isAddNovelOpen,
    setIsAddNovelOpen,
    novelModalMode,
    novelForm,
    setNovelForm,
    handleOpenCreateNovel,
    handleOpenEditNovel,
    handleSaveNovelModal,
    handleDeleteNovel,
  } = useAppNovelCrud({
    genres: GENRES,
    initialTabsConfig: INITIAL_TABS_CONFIG,
    generateId,
    activeNovelData,
    novelsMetadata,
    dirHandle,
    globalTabsConfig,
    syncIndex,
    syncNovel,
    showToast,
    updateActiveNovelData,
    setNovelStatsById,
    setNovelsMetadata,
    setActiveNovelData,
    setActiveNovelDirHandle,
    setMenu1Visible,
    setActiveTabLon,
    setActiveTabNho,
    setActiveTabCon,
    setConfirmDialog,
    novelsMetadataRef,
    novelStatsByIdRef,
  });

  const {
    showConnectReminder,
    dismissConnectReminder,
    importProgress,
    handleConnectFolder,
    handleExportBackup,
    handleExportIndexOnly,
    handleImportBackup,
  } = useAppDirectoryBackup({
    dirHandle,
    globalTabsConfig,
    novelsMetadata,
    novelStatsById,
    syncIndex,
    syncNovel,
    loadNovelData,
    resolveSafeTabsConfig,
    setDirHandle,
    setActiveNovelData,
    setActiveNovelDirHandle,
    setNovelsMetadata,
    setGlobalTabsConfig,
    setNovelStatsById,
    novelsMetadataRef,
    novelStatsByIdRef,
    showToast,
  });

  const {
    isUploading,
    setIsUploading,
    isInsertImageModalOpen,
    setIsInsertImageModalOpen,
    imageForm,
    setImageForm,
    handleImageDrop,
    handleAvatarDrop,
    handlePickCoverImage,
    handlePickLocalImage,
    handleConfirmInsertImage,
  } = useAppImageWorkflow({
    dirHandle,
    currentContextDirHandle,
    isEditingMode,
    isEntityEditing,
    showToast,
  });

  const handleSaveStandardEditor = () => {
    updateActiveNovelData(n => {
       if (!n.data) n.data = {}; if (!n.data[activeTabLon]) n.data[activeTabLon] = {};
       const content = document.getElementById('standard-editor').value;
       if (activeTabCon) {
           if (!n.data[activeTabLon][activeTabNho]) n.data[activeTabLon][activeTabNho] = {};
           n.data[activeTabLon][activeTabNho][activeTabCon] = content;
       } else {
           let currentVal = n.data[activeTabLon][activeTabNho || 'default'];
           if (typeof currentVal === 'object' && currentVal !== null) { currentVal.overview = content; n.data[activeTabLon][activeTabNho || 'default'] = currentVal; }
           else { n.data[activeTabLon][activeTabNho || 'default'] = content; }
       }
    });
    setIsEditingMode(false); setIsSplitPreview(false); showToast('Khắc ấn đại đạo thành công!');
  };

  const {
    handleOpenCreateEntity,
    handleOpenEditEntity,
    handleSaveEntity,
    handleSetSelectedEntityAutoSyncState,
    handleAddImageToSelectedEntity,
    handleRemoveImageFromSelectedEntity,
    handleUpdateEntityInfo,
    handleSaveMilestone,
    handleDeleteMilestone,
    handleReplaceMilestones,
    handleDeleteEntity,
    handleMergeSnapshotToProfile,
  } = useAppEntityMilestoneActions({
    activeNovelData,
    activeNovelDataRef,
    activeTabLon,
    activeTabNho,
    currentTabConfig,
    selectedEntity,
    selectedEntityId,
    selectedMilestoneId,
    updateActiveNovelData,
    handlePickLocalImage,
    setActiveNovelData,
    setSelectedEntityId,
    setSelectedMilestoneId,
    setEditingMilestoneData,
    setCollectionSubTab,
    setIsEditingMode,
    setIsEntityEditing,
    setConfirmDialog,
    setRecentlyMergedFields,
    setEditingEntityData,
    setIsEntityModalOpen,
    showToast,
    syncNovelRef,
    dirHandleRef,
    novelStatsByIdRef,
    setNovelStatsById,
    confirmDeleteEntityRef,
  });

  const onEntityCardSelect = useCallback((ent) => {
    handleNavigate({ lonId: activeTabLon, nhoId: activeTabNho, entityId: ent.id });
  }, [activeTabLon, activeTabNho, handleNavigate]);

  const onEntityCardDelete = (ent) => {
    handleDeleteEntity(ent.id);
  };

  const onEntityCardAddMilestone = useCallback((ent) => {
    setSelectedEntityId(ent.id);
    setCollectionSubTab('timeline');
    setTimeout(() => { setEditingMilestoneData(null); setIsMilestoneModalOpen(true); }, 100);
  }, [setCollectionSubTab, setEditingMilestoneData, setIsMilestoneModalOpen, setSelectedEntityId]);

  const handleExportEntityPDF = useCallback((entity, tabConfig) => {
    if (!entity) return;
    const fields =
      tabConfig && activeTabLon
        ? resolveFieldsTemplate(tabConfig, activeTabLon, tabConfig._parentLabel || '')
        : tabConfig?.fieldsTemplate || DEFAULT_ENTITY_FIELDS;

    exportEntityProfilePdf({
      entity,
      fields,
      novelTitle: activeNovelData?.title || '',
      tabLabel: currentTabConfig?.label || '',
      onPopupBlocked: () => showToast('Trình duyệt chặn popup. Vui lòng cho phép popup!', 'warning'),
    });
  }, [activeNovelData, activeTabLon, currentTabConfig, showToast]);

  const getFieldValue = (fieldId, ent) => {
     if (!ent) return '';
     if (ent.dynamicData && ent.dynamicData[fieldId]) return ent.dynamicData[fieldId];
     if (fieldId === 'f_status') return ent.status;
     if (fieldId === 'f_title') return ent.title;
     if (fieldId === 'f_desc') return ent.description;
     return '';
  };

  useEffect(() => {
      const handleSave = () => { if (isEditingMode) document.getElementById('save-standard-btn')?.click(); if (isEntityEditing) document.getElementById('save-entity-btn')?.click(); };
      window.addEventListener('ttc-save', handleSave); return () => window.removeEventListener('ttc-save', handleSave);
  }, [isEditingMode, isEntityEditing]);

  // ==========================================
  // CÁC HÀM CÒN THIẾU (MISSING HANDLERS)
  // ==========================================

  const handleGoHome = useCallback(() => {
    setActiveNovelData(null);
    setActiveNovelDirHandle(null);
    setActiveTabLon('tong-quan');
    setActiveTabNho(null);
    setActiveTabCon(null);
    setSelectedEntityId(null);
    setNavHistory([]);
    setMenu1Visible(false);
  }, [
    setActiveNovelData,
    setActiveNovelDirHandle,
    setActiveTabCon,
    setActiveTabLon,
    setActiveTabNho,
    setMenu1Visible,
    setNavHistory,
    setSelectedEntityId,
  ]);

  const openAutoSyncGuide = useCallback(() => {
    setIsAutoSyncGuideOpen(true);
  }, [setIsAutoSyncGuideOpen]);

  const openEntityNotesGuide = useCallback(() => {
    setIsEntityNotesGuideOpen(true);
  }, [setIsEntityNotesGuideOpen]);

  // Migration: gộp fieldsTemplate — thêm trường mới, giữ nhãn tùy chỉnh của người dùng
  const { handleSelectNovel } = useAppNovelSelectionAndHydration({
    dirHandle,
    activeNovelData,
    activeTabLon,
    activeTabNho,
    globalTabsConfig,
    loadNovelData,
    syncNovel,
    syncIndex,
    showToast,
    setMenu1Visible,
    setSelectedEntityId,
    setNavHistory,
    setActiveTabLon,
    setActiveTabNho,
    setActiveTabCon,
    setCollectionSubTab,
    setIsEditingMode,
    setIsEntityEditing,
    setIsUploading,
    setActiveNovelData,
    setActiveNovelDirHandle,
    novelsMetadataRef,
    globalTabsConfigRef,
    novelStatsByIdRef,
    setNovelStatsById,
    lazyTabLoadInFlightRef,
    lazyFullHydrateInFlightRef,
    deepSearchIndexByNovelIdRef,
  });
  const handleDeepSearchResultSelect = (result) => {
    setIsDeepSearchOpen(false);
    // Build dest from result fields (ModalDeepSearch trả về tabLonId/tabNhoId/entityId, không phải result.dest)
    const buildDest = (r) => {
      if (!r.tabLonId) return null;
      return { lonId: r.tabLonId, nhoId: r.tabNhoId || null, conId: r.tabConId || null, entityId: r.entityId || null };
    };
    const dest = buildDest(result);
    if (result.novelId !== activeNovelData?.id) {
      const meta = novelsMetadata.find(m => m.id === result.novelId);
      if (meta) {
        if (dest) pendingNavRef.current = dest;
        handleSelectNovel(meta);
      }
    } else {
      if (dest) handleNavigate(dest);
    }
  };

  // Tab management helpers
  const getTabsToUpdate = () => activeNovelData ? activeNovelData.tabsConfig : globalTabsConfig;
  const buildTabScopeLabel = (lonId, nhoId, currentTabs = getTabsToUpdate()) => {
    const lon = (currentTabs || []).find((tab) => tab.id === lonId);
    if (!lon) return 'Cây thư mục';
    if (!nhoId) return safeString(lon.label || lonId) || 'Cây thư mục';
    const nho = (lon.subTabs || []).find((tab) => tab.id === nhoId);
    const lonLabel = safeString(lon.label || lonId).trim();
    const nhoLabel = safeString(nho?.label || nhoId).trim();
    return [lonLabel, nhoLabel].filter(Boolean).join(' > ') || 'Cây thư mục';
  };
  const setTabsConfig = (
    newTabs,
    {
      resyncAuto = false,
      mutateNovelData = null,
      autoSyncPlan = null,
      autoSyncReason = 'tab_config',
      autoSyncScopeLabel = 'Cây thư mục',
    } = {}
  ) => {
    let forceWarning = '';
    if (activeNovelData) {
      updateActiveNovelData((nov) => {
        nov.tabsConfig = newTabs;
        if (typeof mutateNovelData === 'function') mutateNovelData(nov);
        if (resyncAuto) {
          const autoSyncResult = runNovelAutoSyncPlan(
            nov,
            autoSyncPlan || buildFullAutoSyncPlan(),
            {
              recordLog: true,
              reason: autoSyncReason,
              scopeLabel: autoSyncScopeLabel,
            }
          );
          forceWarning = autoSyncResult.forceWarning || '';
        }
      });
      if (forceWarning) showToast(forceWarning, 'warning');
      return;
    }
    setGlobalTabsConfig(newTabs);
    syncIndex(novelsMetadata, newTabs, dirHandle);
  };

  const handleResyncAutoTabs = useCallback(() => {
    if (!activeNovelData) return;
    let changed = false;
    let forceWarning = '';
    updateActiveNovelData((nov) => {
      const autoSyncResult = runNovelAutoSyncPlan(nov, buildFullAutoSyncPlan(), {
        recordLog: true,
        reason: 'manual_resync',
        scopeLabel: 'Toàn bộ truyện',
      });
      changed = autoSyncResult.changed;
      forceWarning = autoSyncResult.forceWarning || '';
    });
    showToast(
      changed
        ? 'Đã quét lại toàn bộ AUTO theo cây thư mục.'
        : 'AUTO đã khớp sẵn với cây thư mục hiện tại.',
      'success'
    );
    if (forceWarning) showToast(forceWarning, 'warning');
  }, [activeNovelData, updateActiveNovelData, showToast]);
  const handleApplySuggestedAutoSyncSetup = () => {
    const currentTabs = structuredClone(getTabsToUpdate());
    const hydrated = hydrateTabsAutoSyncConfigs(currentTabs);
    const linkHydrated = hydrateTabsAutoSyncLinkTargets(hydrated.tabsConfig);
    if (!hydrated.changed && !linkHydrated.changed) {
      showToast('Cấu hình AUTO hiện đã khớp với gợi ý từ cây thư mục.', 'success');
      return;
    }
    setTabsConfig(linkHydrated.tabsConfig, {
      resyncAuto: true,
      autoSyncPlan: buildFullAutoSyncPlan(),
      autoSyncReason: 'wizard_setup',
      autoSyncScopeLabel: 'Thiết lập nhanh AUTO',
    });
    showToast('Đã áp dụng gợi ý vai trò và ánh xạ AUTO theo cây thư mục.', 'success');
  };
  const handleSaveCurrentTabsAsGenreTemplate = useCallback(() => {
    if (!activeNovelData) {
      showToast('Cần mở truyện trước khi lưu mẫu cây thư mục.', 'warning');
      return;
    }
    const genres = Array.isArray(activeNovelData.genres)
      ? activeNovelData.genres.filter(Boolean)
      : typeof activeNovelData.genres === 'string'
        ? [activeNovelData.genres]
        : activeNovelData.genre
          ? [activeNovelData.genre]
          : [];
    if (genres.length === 0) {
      showToast('Truyện này chưa có thể loại để lưu mẫu.', 'warning');
      return;
    }
    const tabsConfig = Array.isArray(activeNovelData.tabsConfig) ? activeNovelData.tabsConfig : [];
    if (tabsConfig.length === 0) {
      showToast('Không có cây thư mục để lưu làm mẫu.', 'warning');
      return;
    }
    if (!saveGenreTabsTemplate(genres, tabsConfig)) {
      showToast('Lưu mẫu thất bại.', 'error');
      return;
    }
    showToast(`Đã lưu cây mẫu cho: ${genres.join(', ')}.`, 'success');
  }, [activeNovelData, showToast]);
  const buildAutoSyncContext = (lonId, nhoId, nho, parentLabel = '') => ({
    activeTabLon: lonId,
    activeTabNho: nhoId,
    currentTabConfig: nho || null,
    parentLabel,
  });
  const mergeNameIntoAutoAlias = (entity, aliasText, ctx) => {
    if (!entity || !safeString(aliasText).trim()) return;
    const prevAlias =
      getEntityAutoFieldValue(entity, ctx, 'alias') ||
      safeString(entity.dynamicData?.f_alias);
    const mergedAlias = mergeAliasText(prevAlias, aliasText);
    if (mergedAlias === prevAlias) return;
    const updated = setEntityAutoFieldValue(entity, ctx, 'alias', mergedAlias);
    if (!updated) {
      if (!entity.dynamicData || typeof entity.dynamicData !== 'object') entity.dynamicData = {};
      entity.dynamicData.f_alias = mergedAlias;
    }
  };
  const getSuggestedFieldsForAutoRole = (role) => {
    switch (normalizeAutoSyncRole(role)) {
      case AUTO_SYNC_ROLE_FORCE:
        return DEFAULT_FIELDS_MAP['gia-toc'];
      case AUTO_SYNC_ROLE_MAP:
        return DEFAULT_FIELDS_MAP['dia-danh'];
      case AUTO_SYNC_ROLE_CULTIVATION_SYSTEM:
        return DEFAULT_FIELDS_MAP['he-thong-tu-luyen'];
      case AUTO_SYNC_ROLE_CULTIVATION_REALM:
        return DEFAULT_FIELDS_MAP['canh-gioi'];
      case AUTO_SYNC_ROLE_MAIN_CHARACTER:
        return DEFAULT_FIELDS_MAP['nhan-vat-chinh'];
      case AUTO_SYNC_ROLE_CHARACTER_RELATED:
        return DEFAULT_FIELDS_MAP['phu'];
      default:
        return null;
    }
  };

  const handleAddTabLon = () => {
    const newTab = {
      id: generateId('tab'),
      label: 'Mục Mới',
      iconName: 'ScrollText',
      subTabs: [
        { id: generateId('sub'), label: 'Tiểu Mục 1', viewType: 'standard', tabCon: [] }
      ]
    };
    const current = getTabsToUpdate();
    setTabsConfig([...current, newTab]);
  };

  const handleAddTabNho = (lonId) => {
    const current = structuredClone(getTabsToUpdate());
    const lon = current.find(t => t.id === lonId);
    if (!lon) return;
    if (!lon.subTabs) lon.subTabs = [];
    const defaultFields =
      DEFAULT_FIELDS_BY_PARENT[lonId] ||
      DEFAULT_FIELDS_MAP[lonId] ||
      guessFieldsByLabel(lon.label || '') ||
      structuredClone(DEFAULT_ENTITY_FIELDS);
    const newSubTab = {
      id: generateId('sub'),
      label: 'Chương Mục Mới',
      viewType: 'collection-track',
      tabCon: [],
      fieldsTemplate: defaultFields
    };
    lon.subTabs.push(newSubTab);
    if (activeNovelData) {
      setTabsConfig(current, {
        mutateNovelData: (nov) => {
          if (!nov.data || typeof nov.data !== 'object') nov.data = {};
          if (!nov.data[lonId] || typeof nov.data[lonId] !== 'object') nov.data[lonId] = {};
          if (!nov.data[lonId][newSubTab.id] || typeof nov.data[lonId][newSubTab.id] !== 'object') {
            nov.data[lonId][newSubTab.id] = { overview: '', entities: [] };
          }
          ensureCollectionListCardsForNovel(nov, { createMissingTabBuckets: false });
        },
      });
      return;
    }
    setTabsConfig(current);
  };

  const handleAddTabCon = (lonId, nhoId) => {
    const current = structuredClone(getTabsToUpdate());
    const lon = current.find(t => t.id === lonId);
    const nho = lon?.subTabs?.find(s => s.id === nhoId);
    if (!nho) return;
    if (!nho.tabCon) nho.tabCon = [];
    nho.tabCon.push({ id: generateId('con'), label: 'Tiểu Mục Mới' });
    setTabsConfig(current);
  };

  const handleDeleteTab = (path) => {
    const current = structuredClone(getTabsToUpdate());
    const pruneNovelDataBucket = (nov) => {
      if (!nov?.data || typeof nov.data !== 'object') return;
      if (path.length === 1) {
        const lonId = path[0];
        if (Object.prototype.hasOwnProperty.call(nov.data, lonId)) delete nov.data[lonId];
        return;
      }
      if (path.length === 2) {
        const [lonDim, nhoDim] = path;
        const bucket = nov.data[lonDim];
        if (bucket && typeof bucket === 'object' && Object.prototype.hasOwnProperty.call(bucket, nhoDim)) {
          delete bucket[nhoDim];
        }
        if (bucket && typeof bucket === 'object' && Object.keys(bucket).length === 0) {
          delete nov.data[lonDim];
        }
        return;
      }
      if (path.length === 3) {
        const [lonDim, nhoDim, conDim] = path;
        const nhoNode = nov.data?.[lonDim]?.[nhoDim];
        if (nhoNode && typeof nhoNode === 'object' && Object.prototype.hasOwnProperty.call(nhoNode, conDim)) {
          delete nhoNode[conDim];
        }
      }
    };

    if (path.length === 1) {
      const nextTabs = current.filter((t) => t.id !== path[0]);
      if (activeNovelData) {
        setTabsConfig(nextTabs, {
          resyncAuto: true,
          mutateNovelData: pruneNovelDataBucket,
          autoSyncPlan: buildFullAutoSyncPlan(),
          autoSyncReason: 'delete_tab',
          autoSyncScopeLabel: 'Xóa mục khỏi cây thư mục',
        });
      } else {
        setGlobalTabsConfig(nextTabs);
        syncIndex(novelsMetadata, nextTabs, dirHandle);
      }
    } else if (path.length === 2) {
      const lon = current.find((t) => t.id === path[0]);
      if (lon) lon.subTabs = (lon.subTabs || []).filter((s) => s.id !== path[1]);
      if (activeNovelData) {
        setTabsConfig(current, {
          resyncAuto: true,
          mutateNovelData: pruneNovelDataBucket,
          autoSyncPlan: buildFullAutoSyncPlan(),
          autoSyncReason: 'delete_tab',
          autoSyncScopeLabel: 'Xóa mục khỏi cây thư mục',
        });
      } else {
        setGlobalTabsConfig(current);
        syncIndex(novelsMetadata, current, dirHandle);
      }
    } else if (path.length === 3) {
      const lon = current.find((t) => t.id === path[0]);
      const nho = lon?.subTabs?.find((s) => s.id === path[1]);
      if (nho) nho.tabCon = (nho.tabCon || []).filter((c) => c.id !== path[2]);
      if (activeNovelData) {
        setTabsConfig(current, {
          resyncAuto: false,
          mutateNovelData: pruneNovelDataBucket,
        });
      } else {
        setGlobalTabsConfig(current);
        syncIndex(novelsMetadata, current, dirHandle);
      }
    }
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
  };

  const handleSaveEditLabel = (path, label) => {
    if (!label.trim()) return;
    const current = structuredClone(getTabsToUpdate());
    let autoSyncPlan = null;
    let shouldResyncAuto = false;
    let scopeLabel = 'Cây thư mục';
    if (path.length === 1) {
      const previousTabs = getTabsToUpdate();
      const t = current.find(t => t.id === path[0]);
      if (t) t.label = label.trim();
      shouldResyncAuto = true;
      autoSyncPlan = buildFullAutoSyncPlan();
      scopeLabel = safeString(
        previousTabs.find((tab) => tab.id === path[0])?.label || label.trim()
      ) || 'Cây thư mục';
    } else if (path.length === 2) {
      const previousTabs = getTabsToUpdate();
      const previousLon = previousTabs.find((tab) => tab.id === path[0]);
      const previousNho = previousLon?.subTabs?.find((sub) => sub.id === path[1]) || null;
      const lon = current.find(t => t.id === path[0]);
      const nho = lon?.subTabs?.find(s => s.id === path[1]);
      if (nho) {
        nho.label = label.trim();
        // Tự sinh trường phù hợp khi đổi tên — chỉ áp nếu template chưa tùy chỉnh
        if (nho.viewType === 'collection-track' && isStockTemplate(nho.fieldsTemplate)) {
          const guessed = guessFieldsByLabel(label.trim());
          if (guessed) nho.fieldsTemplate = structuredClone(guessed);
        }
        shouldResyncAuto = true;
        autoSyncPlan = buildAutoSyncPlanFromTabDiff({
          previousTabContext: buildAutoSyncContext(path[0], path[1], previousNho, previousLon?.label || ''),
          nextTabContext: buildAutoSyncContext(path[0], path[1], nho, lon?.label || ''),
        });
        scopeLabel = buildTabScopeLabel(path[0], path[1], current);
      }
    } else if (path.length === 3) {
      const lon = current.find(t => t.id === path[0]);
      const nho = lon?.subTabs?.find(s => s.id === path[1]);
      const con = nho?.tabCon?.find(c => c.id === path[2]);
      if (con) con.label = label.trim();
    }
    setTabsConfig(current, {
      resyncAuto: shouldResyncAuto,
      autoSyncPlan,
      autoSyncReason: 'rename_tab',
      autoSyncScopeLabel: scopeLabel,
    });
    setEditingTab(null);
  };

  const handleToggleViewType = (path) => {
    const current = structuredClone(getTabsToUpdate());
    let autoSyncPlan = null;
    let shouldResyncAuto = false;
    let scopeLabel = 'Cây thư mục';
    if (path.length === 1) {
      const t = current.find(t => t.id === path[0]);
      if (t) t.viewType = t.viewType === 'collection-track' ? 'standard' : 'collection-track';
      shouldResyncAuto = true;
      autoSyncPlan = buildFullAutoSyncPlan();
      scopeLabel = buildTabScopeLabel(path[0], null, current);
    } else if (path.length === 2) {
      const previousTabs = getTabsToUpdate();
      const previousLon = previousTabs.find((tab) => tab.id === path[0]);
      const previousNho = previousLon?.subTabs?.find((sub) => sub.id === path[1]) || null;
      const lon = current.find(t => t.id === path[0]);
      const nho = lon?.subTabs?.find(s => s.id === path[1]);
      if (nho) {
        const switching = nho.viewType !== 'collection-track';
        nho.viewType = switching ? 'collection-track' : 'standard';
        // Tự gán template phù hợp khi chuyển sang collection-track
        if (switching && isStockTemplate(nho.fieldsTemplate)) {
          const lon = current.find(t => t.id === path[0]);
          const guessed =
            guessFieldsByLabel(nho.label || '') ||
            DEFAULT_FIELDS_BY_PARENT[path[0]] ||
            DEFAULT_FIELDS_MAP[path[0]] ||
            guessFieldsByLabel(lon?.label || '') ||
            structuredClone(DEFAULT_ENTITY_FIELDS);
          nho.fieldsTemplate = structuredClone(guessed);
        }
        shouldResyncAuto = true;
        autoSyncPlan = buildAutoSyncPlanFromTabDiff({
          previousTabContext: buildAutoSyncContext(path[0], path[1], previousNho, previousLon?.label || ''),
          nextTabContext: buildAutoSyncContext(path[0], path[1], nho, lon?.label || ''),
        });
        scopeLabel = buildTabScopeLabel(path[0], path[1], current);
      }
    }
    setTabsConfig(current, {
      resyncAuto: shouldResyncAuto,
      autoSyncPlan,
      autoSyncReason: 'toggle_view_type',
      autoSyncScopeLabel: scopeLabel,
    });
  };

  const handleSetTabAutoSyncRole = (lonId, nhoId, nextRoleValue) => {
    const current = structuredClone(getTabsToUpdate());
    const previousTabs = getTabsToUpdate();
    const previousLon = previousTabs.find((tab) => tab.id === lonId);
    const previousNho = previousLon?.subTabs?.find((sub) => sub.id === nhoId) || null;
    const lon = current.find((tab) => tab.id === lonId);
    const nho = lon?.subTabs?.find((sub) => sub.id === nhoId);
    if (!nho || nho.viewType !== 'collection-track') return;

    const nextRole = normalizeAutoSyncRole(nextRoleValue);
    if (!nextRole) delete nho.autoSyncRole;
    else nho.autoSyncRole = nextRole;
    delete nho.autoSyncTargetPaths;
    delete nho.autoSyncTargetPath;

    const autoCtx = buildAutoSyncContext(lonId, nhoId, nho, lon?.label || '');
    const effectiveRole = getEffectiveAutoSyncRole(autoCtx);
    const suggestedFields =
      effectiveRole && effectiveRole !== AUTO_SYNC_ROLE_OFF ? getSuggestedFieldsForAutoRole(effectiveRole) : null;
    if (suggestedFields) {
      const currentFields = Array.isArray(nho.fieldsTemplate) ? nho.fieldsTemplate : [];
      nho.fieldsTemplate = mergeFieldsTemplate(currentFields, suggestedFields);
    }
    if (effectiveRole && effectiveRole !== AUTO_SYNC_ROLE_OFF) {
      const seededFieldMap = normalizeAutoSyncFieldMap(getEffectiveAutoSyncFieldMap(autoCtx), effectiveRole);
      if (Object.keys(seededFieldMap).length > 0) nho.autoSyncFieldMap = seededFieldMap;
      else delete nho.autoSyncFieldMap;
      if (supportsAutoSyncLinkRole(effectiveRole)) {
        const guessedTargetPaths = guessAutoSyncTargetPathsForTab(current, autoCtx);
        if (guessedTargetPaths.length > 0) nho.autoSyncTargetPaths = guessedTargetPaths;
      }
    } else if (nextRole === AUTO_SYNC_ROLE_OFF) {
      delete nho.autoSyncFieldMap;
    }

    setTabsConfig(current, {
      resyncAuto: true,
      autoSyncPlan: buildAutoSyncPlanFromTabDiff({
        previousTabContext: buildAutoSyncContext(lonId, nhoId, previousNho, previousLon?.label || ''),
        nextTabContext: buildAutoSyncContext(lonId, nhoId, nho, lon?.label || ''),
      }),
      autoSyncReason: 'set_auto_role',
      autoSyncScopeLabel: buildTabScopeLabel(lonId, nhoId, current),
    });
  };

  const handleSetTabAutoSyncFieldMap = (lonId, nhoId, fieldKey, nextFieldIdValue) => {
    const current = structuredClone(getTabsToUpdate());
    const lon = current.find((tab) => tab.id === lonId);
    const nho = lon?.subTabs?.find((sub) => sub.id === nhoId);
    if (!nho || nho.viewType !== 'collection-track') return;

    const autoCtx = buildAutoSyncContext(lonId, nhoId, nho, lon?.label || '');
    const effectiveRole = getEffectiveAutoSyncRole(autoCtx);
    if (!effectiveRole || effectiveRole === AUTO_SYNC_ROLE_OFF) return;

    const allowedKeys = new Set(getAutoSyncFieldDefs(effectiveRole).map((def) => def.key));
    if (!allowedKeys.has(fieldKey)) return;

    const nextFieldId = safeString(nextFieldIdValue).trim();
    const currentMap = {
      ...normalizeAutoSyncFieldMap(nho.autoSyncFieldMap, effectiveRole),
    };
    if (!nextFieldId) delete currentMap[fieldKey];
    else currentMap[fieldKey] = nextFieldId;

    const normalizedMap = normalizeAutoSyncFieldMap(currentMap, effectiveRole);
    if (Object.keys(normalizedMap).length > 0) nho.autoSyncFieldMap = normalizedMap;
    else delete nho.autoSyncFieldMap;

    setTabsConfig(current, {
      resyncAuto: true,
      autoSyncPlan: buildAutoSyncPlanFromTabContext(buildAutoSyncContext(lonId, nhoId, nho, lon?.label || '')),
      autoSyncReason: 'set_field_map',
      autoSyncScopeLabel: buildTabScopeLabel(lonId, nhoId, current),
    });
  };

  const handleSetTabAutoSyncTargets = (lonId, nhoId, nextTargetPaths) => {
    const current = structuredClone(getTabsToUpdate());
    const previousTabs = getTabsToUpdate();
    const previousLon = previousTabs.find((tab) => tab.id === lonId);
    const previousNho = previousLon?.subTabs?.find((sub) => sub.id === nhoId) || null;
    const lon = current.find((tab) => tab.id === lonId);
    const nho = lon?.subTabs?.find((sub) => sub.id === nhoId);
    if (!nho || nho.viewType !== 'collection-track') return;

    const normalizedTargets = normalizeAutoSyncTargetPaths(nextTargetPaths);
    if (normalizedTargets.length > 0) nho.autoSyncTargetPaths = normalizedTargets;
    else {
      delete nho.autoSyncTargetPaths;
      delete nho.autoSyncTargetPath;
    }

    setTabsConfig(current, {
      resyncAuto: true,
      autoSyncPlan: buildAutoSyncPlanFromTabDiff({
        previousTabContext: buildAutoSyncContext(lonId, nhoId, previousNho, previousLon?.label || ''),
        nextTabContext: buildAutoSyncContext(lonId, nhoId, nho, lon?.label || ''),
      }),
      autoSyncReason: 'set_auto_targets',
      autoSyncScopeLabel: buildTabScopeLabel(lonId, nhoId, current),
    });
  };
  const handleSetTabListGroupStrategy = (lonId, nhoId, nextStrategyValue) => {
    const current = structuredClone(getTabsToUpdate());
    const lon = current.find((tab) => tab.id === lonId);
    const nho = lon?.subTabs?.find((sub) => sub.id === nhoId);
    if (!nho || nho.viewType !== 'collection-track') return;
    const normalized = normalizeListGroupStrategy(nextStrategyValue);
    if (normalized === 'auto') delete nho.autoListGroupStrategy;
    else nho.autoListGroupStrategy = normalized;
    setTabsConfig(current, {
      resyncAuto: true,
      autoSyncPlan: buildAutoSyncPlanFromTabContext(buildAutoSyncContext(lonId, nhoId, nho, lon?.label || '')),
      autoSyncReason: 'set_list_group_strategy',
      autoSyncScopeLabel: buildTabScopeLabel(lonId, nhoId, current),
    });
  };

  const handleSetTabMapEntrySuggestions = (lonId, nhoId, which, text) => {
    const current = structuredClone(getTabsToUpdate());
    const lon = current.find((tab) => tab.id === lonId);
    const nho = lon?.subTabs?.find((sub) => sub.id === nhoId);
    if (!nho || nho.viewType !== 'collection-track') return;
    const prev = nho.mapEntrySuggestions && typeof nho.mapEntrySuggestions === 'object' ? nho.mapEntrySuggestions : {};
    const prevTypes = Array.isArray(prev.types) ? prev.types : [];
    const prevHierarchy = Array.isArray(prev.hierarchy) ? prev.hierarchy : [];
    const types = which === 'types' ? linesToSuggestionArray(text) : prevTypes;
    const hierarchy = which === 'hierarchy' ? linesToSuggestionArray(text) : prevHierarchy;
    const next = {};
    if (types.length) next.types = types;
    if (hierarchy.length) next.hierarchy = hierarchy;
    if (Object.keys(next).length === 0) delete nho.mapEntrySuggestions;
    else nho.mapEntrySuggestions = next;
    setTabsConfig(current, { resyncAuto: false });
  };

  const handleMergeTabFieldSuggestionList = (lonId, nhoId, fieldId, text) => {
    const current = structuredClone(getTabsToUpdate());
    const lon = current.find((tab) => tab.id === lonId);
    const nho = lon?.subTabs?.find((sub) => sub.id === nhoId);
    if (!nho || nho.viewType !== 'collection-track') return;
    const fid = safeString(fieldId).trim();
    if (!fid) return;
    const parsed = linesToSuggestionArray(text);
    const base = {
      ...(nho.fieldSuggestionLists && typeof nho.fieldSuggestionLists === 'object' ? nho.fieldSuggestionLists : {}),
    };
    if (parsed.length === 0) delete base[fid];
    else base[fid] = parsed;
    const normalized = normalizeFieldSuggestionLists(base);
    if (Object.keys(normalized).length === 0) delete nho.fieldSuggestionLists;
    else nho.fieldSuggestionLists = normalized;
    setTabsConfig(current, { resyncAuto: false });
  };

  const handleAddTabTemplateField = (lonId, nhoId, label) => {
    const L = safeString(label).trim();
    if (!L) return;
    const current = structuredClone(getTabsToUpdate());
    const lon = current.find((tab) => tab.id === lonId);
    const nho = lon?.subTabs?.find((sub) => sub.id === nhoId);
    if (!nho || nho.viewType !== 'collection-track') return;
    const fields = ensureWikiAliasInFieldsTemplate(nho.fieldsTemplate || []);
    const newId = `f_tc_${generateId('tc')}`;
    const idx = fields.findIndex((f) => f.id === 'f_alias');
    const newField = { id: newId, label: L };
    const nextFields = idx === -1 ? [...fields, newField] : [...fields.slice(0, idx), newField, ...fields.slice(idx)];
    nho.fieldsTemplate = nextFields;
    setTabsConfig(current, {
      resyncAuto: true,
      autoSyncPlan: buildAutoSyncPlanFromTabContext(buildAutoSyncContext(lonId, nhoId, nho, lon?.label || '')),
      autoSyncReason: 'tab_add_field',
      autoSyncScopeLabel: buildTabScopeLabel(lonId, nhoId, current),
    });
  };

  const handleRemoveTabTemplateField = (lonId, nhoId, fieldId) => {
    const fid = safeString(fieldId).trim();
    if (!fid || fid === 'f_alias') return;
    const current = structuredClone(getTabsToUpdate());
    const lon = current.find((tab) => tab.id === lonId);
    const nho = lon?.subTabs?.find((sub) => sub.id === nhoId);
    if (!nho || nho.viewType !== 'collection-track') return;
    const filtered = sanitizeFieldsTemplate((nho.fieldsTemplate || []).filter((f) => f.id !== fid));
    nho.fieldsTemplate = ensureWikiAliasInFieldsTemplate(filtered);
    if (nho.fieldSuggestionLists?.[fid]) {
      const nextLists = { ...nho.fieldSuggestionLists };
      delete nextLists[fid];
      const normalized = normalizeFieldSuggestionLists(nextLists);
      if (Object.keys(normalized).length === 0) delete nho.fieldSuggestionLists;
      else nho.fieldSuggestionLists = normalized;
    }
    setTabsConfig(current, {
      resyncAuto: true,
      autoSyncPlan: buildAutoSyncPlanFromTabContext(buildAutoSyncContext(lonId, nhoId, nho, lon?.label || '')),
      autoSyncReason: 'tab_remove_field',
      autoSyncScopeLabel: buildTabScopeLabel(lonId, nhoId, current),
    });
  };

  const handleRenameTabTemplateFieldLabel = (lonId, nhoId, fieldId, nextLabel) => {
    const fid = safeString(fieldId).trim();
    if (!fid) return;
    const current = structuredClone(getTabsToUpdate());
    const lon = current.find((tab) => tab.id === lonId);
    const nho = lon?.subTabs?.find((sub) => sub.id === nhoId);
    if (!nho || nho.viewType !== 'collection-track') return;
    const L = safeString(nextLabel).trim();
    const nextFields = (nho.fieldsTemplate || []).map((f) => (f.id === fid ? { ...f, label: L || f.id } : f));
    nho.fieldsTemplate = ensureWikiAliasInFieldsTemplate(nextFields);
    setTabsConfig(current, {
      resyncAuto: true,
      autoSyncPlan: buildAutoSyncPlanFromTabContext(buildAutoSyncContext(lonId, nhoId, nho, lon?.label || '')),
      autoSyncReason: 'tab_rename_field',
      autoSyncScopeLabel: buildTabScopeLabel(lonId, nhoId, current),
    });
  };

  const handleSetTabEntityQuickEntry = (lonId, nhoId, slotFields, slotLabels) => {
    const current = structuredClone(getTabsToUpdate());
    const lon = current.find((tab) => tab.id === lonId);
    const nho = lon?.subTabs?.find((sub) => sub.id === nhoId);
    if (!nho || nho.viewType !== 'collection-track') return;
    const templateIds = new Set((nho.fieldsTemplate || []).map((f) => safeString(f?.id).trim()).filter(Boolean));
    const ids = (Array.isArray(slotFields) ? slotFields : []).map((x) => safeString(x).trim()).slice(0, 3);
    const labels = [0, 1, 2].map((i) => safeString(slotLabels?.[i] ?? '').trim());
    if (ids.length !== 3 || new Set(ids).size !== 3) return;
    if (!ids.every((id) => templateIds.has(id))) return;
    nho.entityQuickEntry = { slotFields: ids, slotLabels: labels };
    setTabsConfig(current, { resyncAuto: false });
  };

  const handleSetTabAutoSyncLevels = (lonId, nhoId, updater) => {
    const current = structuredClone(getTabsToUpdate());
    const previousTabs = getTabsToUpdate();
    const previousLon = previousTabs.find((tab) => tab.id === lonId);
    const previousNho = previousLon?.subTabs?.find((sub) => sub.id === nhoId) || null;
    const lon = current.find((tab) => tab.id === lonId);
    const nho = lon?.subTabs?.find((sub) => sub.id === nhoId);
    if (!nho || nho.viewType !== 'collection-track') return;
    const prevCfg = normalizeTabAutoSyncLevelConfig(nho.autoSyncLevelConfig);
    const nextRaw = typeof updater === 'function' ? updater(prevCfg) : updater;
    const nextCfg = normalizeTabAutoSyncLevelConfig(nextRaw);
    nho.autoSyncLevelConfig = nextCfg;
    setTabsConfig(current, {
      resyncAuto: true,
      autoSyncPlan: buildAutoSyncPlanFromTabDiff({
        previousTabContext: buildAutoSyncContext(lonId, nhoId, previousNho, previousLon?.label || ''),
        nextTabContext: buildAutoSyncContext(lonId, nhoId, nho, lon?.label || ''),
      }),
      autoSyncReason: 'set_auto_levels',
      autoSyncScopeLabel: buildTabScopeLabel(lonId, nhoId, current),
    });
  };

  // ==========================================

  const navFnRef = useRef(null);
  navFnRef.current = handleNavigate;

  // Lưu lại fieldsTemplate khi cần gộp — thêm trường mới, giữ nhãn tùy chỉnh
  useEffect(() => {
    if (!activeNovelData || !activeTabNho || !currentTabConfig) return;
    if (currentTabConfig.viewType !== 'collection-track') return;
    const targetTemplate = DEFAULT_FIELDS_MAP[activeTabNho] || DEFAULT_FIELDS_BY_PARENT[activeTabLon];
    if (!targetTemplate) return;
    const curTemplate = Array.isArray(currentTabConfig.fieldsTemplate) ? currentTabConfig.fieldsTemplate : [];
    const needsUpgradeNow =
      curTemplate.length === 0 ||
      (curTemplate.every((f) => /^f_/.test(f.id)) && curTemplate.length < targetTemplate.length);
    if (!needsUpgradeNow) return;
    updateActiveNovelData(nov => {
      if (!nov.tabsConfig) return;
      const lon = nov.tabsConfig.find(t => t.id === activeTabLon);
      const nho = lon?.subTabs?.find(s => s.id === activeTabNho);
      if (!nho) return;
      const cur = nho.fieldsTemplate;
      const needsUpgrade = !cur || cur.length === 0 ||
        (cur.every(f => /^f_/.test(f.id)) && cur.length < targetTemplate.length);
      if (needsUpgrade) nho.fieldsTemplate = mergeFieldsTemplate(cur, targetTemplate);
    });
  }, [activeTabLon, activeTabNho, activeNovelData?.id, activeNovelData, currentTabConfig, updateActiveNovelData]);

  const pendingNavRef = useRef(null);
  useEffect(() => {
    if (pendingNavRef.current && activeNovelData) {
      const dest = pendingNavRef.current;
      pendingNavRef.current = null;
      handleNavigate(dest);
    }
  }, [activeNovelData, handleNavigate]);

  const memoizedEntityInfo = useMemo(() => {
      if (!selectedEntity || collectionSubTab !== 'detail' || isEntityEditing) return null;
      return <div className="font-serif max-w-none animate-fade-in min-h-[200px]">{renderEntityNotesMarkdown(safeString(selectedEntity.info), currentContextDirHandle, entityMap, globalLinkRegex, (dest) => { if(navFnRef.current) navFnRef.current(dest); }, selectedEntity?.id)}</div>;
  }, [selectedEntity, collectionSubTab, isEntityEditing, currentContextDirHandle, entityMap, globalLinkRegex]);

  const memoizedStandardData = useMemo(() => {
      if (isEditingMode || currentTabConfig?.viewType === 'collection-track') return null;
      return <div className="font-serif animate-fade-in flex-1">{renderMarkdown(safeString(currentStandardData), currentContextDirHandle, entityMap, globalLinkRegex, (dest) => { if(navFnRef.current) navFnRef.current(dest); })}</div>;
  }, [currentStandardData, isEditingMode, currentTabConfig?.viewType, currentContextDirHandle, entityMap, globalLinkRegex]);

  const novelQuickStats = useMemo(
    () => computeNovelQuickStats(activeNovelData, safeString),
    [activeNovelData]
  );

  const overviewSectionProps = {
    tocRailExpanded: menu2Expanded,
    activeNovelData,
    overviewForm,
    setOverviewForm,
    updateActiveNovelData,
    nearChapterEntitiesGlobal,
    novelQuickStats,
    geminiApiKeys,
    currentContextDirHandle,
    isGeneratingReview,
    setIsGeneratingReview,
    overviewNeoOpen,
    setOverviewNeoOpen,
    neoXrefSectionOpen,
    setNeoXrefSectionOpen,
    overviewStatsOpen,
    setOverviewStatsOpen,
    xrefDraft,
    setXrefDraft,
    setXrefAiPanel,
    showToast,
    setLightboxSrc,
    setIsDeepSearchOpen,
    setIsInNovelSearchOpen,
    handleOpenEditNovel,
    handleDeleteNovel,
    openOverviewHub,
    handleNavigate,
    runXrefAiForRow,
    setConfirmDialog,
  };

  const collectionSectionProps = {
    tocRailExpanded: menu2Expanded,
    activeTabLon,
    activeTabNho,
    activeTabCon,
    sortedTabs,
    currentTabConfig,
    handleSelectTabLon,
    handleSelectTabNho: (event, lonId, sub) => {
      event.stopPropagation();
      handleSelectTabNho(lonId, sub.id);
    },
    activeNovelData,
    currentContextDirHandle,
    activeNovelDirHandle,
    dirHandle,
    entityAdvancedRef,
    entitySearch,
    setEntitySearch,
    entitySortMode,
    setEntitySortMode,
    showEntityAdvanced,
    setShowEntityAdvanced,
    isEntityAdvancedActive,
    clearEntityAdvanced,
    entityFilterField,
    setEntityFilterField,
    entityFilterValue,
    setEntityFilterValue,
    entityGroupBy,
    setEntityGroupBy,
    entityFilterFields,
    entityFilterOptions,
    entityGroupOptions,
    entityContextPresets,
    applyEntityPreset,
    AdvancedFieldSelect,
    getTerms,
    handleOpenCreateEntity,
    onOpenAutoSyncGuide: openAutoSyncGuide,
    onOpenEntityNotesGuide: openEntityNotesGuide,
    collectionSubTab,
    setCollectionSubTab,
    entitiesList,
    entityPage,
    setEntityPage,
    pagedEntitiesList,
    groupedEntitiesList,
    groupVisibleCount,
    setGroupVisibleCount,
    entityPageSize: ENTITY_PAGE_SIZE,
    handleAddEntityImage: handleAddImageToSelectedEntity,
    handleRemoveEntityImage: handleRemoveImageFromSelectedEntity,
    onEntityCardSelect,
    onEntityCardDelete,
    onEntityCardAddMilestone,
    selectedEntity,
    isEntityEditing,
    setIsEntityEditing,
    recentlyMergedFields,
    entityMap,
    globalLinkRegex,
    relatedEntities,
    isCalculatingNetwork,
    navFnRef,
    handleNavigate,
    handleExportEntityPDF,
    handleOpenEditEntity,
    isExtractingAI,
    setIsExtractingAI,
    geminiApiKeys,
    showToast,
    aiMode,
    isSplitPreview,
    setLivePreviewText,
    setDebouncedMarkdownPreview,
    setIsSplitPreview,
    handleUpdateEntityInfo,
    handleSetSelectedEntityAutoSyncState,
    setImageForm,
    setIsInsertImageModalOpen,
    handlePickLocalImage,
    debouncedMarkdownPreview,
    memoizedEntityInfo,
    setLightboxSrc,
    selectedMilestoneId,
    setSelectedMilestoneId,
    setEditingMilestoneData,
    setIsMilestoneModalOpen,
    handleMergeSnapshotToProfile,
    handleDeleteMilestone,
    handleReplaceMilestones,
    getFieldValue,
    isEditingMode,
    setIsEditingMode,
    handleSaveStandardEditor,
    currentStandardData,
    memoizedStandardData,
    handleImageDrop,
  };

  const { runCommandPaletteAction, commandPaletteFiltered } = useAppModalShortcutOrchestration({
    activeNovelData,
    isEntityModalOpen,
    setIsCommandPaletteOpen,
    setCommandPaletteQuery,
    setEditingEntityData,
    setIsEntityModalOpen,
    librarySearchInputRef,
    setMenu1Visible,
    commandPaletteOpenRef,
    setConfirmDialog,
    setIsSettingsOpen,
    setOverviewHubOpen,
    setIsDeepSearchOpen,
    setIsInNovelSearchOpen,
    setIsAddNovelOpen,
    setIsMilestoneModalOpen,
    setIsInsertImageModalOpen,
    setIsManageTabsOpen,
    setIsGenreFilterOpen,
    setQuickCreateData,
    setLightboxSrc,
    setIsEditingMode,
    setIsEntityEditing,
    isCommandPaletteOpen,
    deferredCommandPaletteQuery,
    novelsMetadata,
    safeString,
  });

  const modalLayerProps = {
    isEntityModalOpen,
    setIsEntityModalOpen,
    handleSaveEntity,
    editingEntityData,
    currentTabConfig,
    handleUpdateTabTemplate,
    handleAvatarDrop,
    handlePickLocalImage,
    currentContextDirHandle,
    activeTabLon,
    geminiApiKeys,
    aiMode,
    isMilestoneModalOpen,
    setIsMilestoneModalOpen,
    isAutoSyncGuideOpen,
    setIsAutoSyncGuideOpen,
    isEntityNotesGuideOpen,
    setIsEntityNotesGuideOpen,
    handleSaveMilestone,
    editingMilestoneData,
    activeNovelData,
    entityMap,
    showToast,
    autoLinkToastEnabled,
    isSettingsOpen,
    setIsSettingsOpen,
    handleConnectFolder,
    dirHandle,
    dirName,
    handleExportBackup,
    handleExportIndexOnly,
    handleImportBackup,
    handleSaveApiKeys,
    setAiMode,
    wikiExactMatchOnly,
    setWikiExactMatchOnly,
    performanceMode,
    setPerformanceMode,
    setAutoLinkToastEnabled,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    commandPaletteQuery,
    setCommandPaletteQuery,
    commandPaletteFiltered,
    runCommandPaletteAction,
    setIsDeepSearchOpen,
    setIsInNovelSearchOpen,
    openOverviewHub,
    handleGoHome,
    handleSelectNovel,
    confirmDialog,
    setConfirmDialog,
    isInsertImageModalOpen,
    setIsInsertImageModalOpen,
    imageForm,
    setImageForm,
    handleConfirmInsertImage,
    isAddNovelOpen,
    setIsAddNovelOpen,
    novelForm,
    setNovelForm,
    handleSaveNovelModal,
    novelModalMode,
    handlePickCoverImage,
    novelsMetadata,
    isDeepSearchOpen,
    performDeepSearch,
    handleDeepSearchResultSelect,
    isInNovelSearchOpen,
    xrefAiPanel,
    setXrefAiPanel,
    findEntitiesByXrefHint,
    applyXrefSuggestionNewEntity,
    applyXrefSuggestionMilestone,
    applyXrefSuggestionProfile,
    overviewHubOpen,
    setOverviewHubOpen,
    overviewHubTab,
    setOverviewHubTab,
    hubCreatePath,
    setHubCreatePath,
    hubCreateInput,
    setHubCreateInput,
    hubCreateBusy,
    hubCreatePreview,
    setHubCreatePreview,
    hubUpdateChapter,
    setHubUpdateChapter,
    hubUpdateText,
    setHubUpdateText,
    hubUpdatePanel,
    setHubUpdatePanel,
    activeTabs,
    hubRunCreateAi,
    hubSaveCreateEntity,
    runHubUpdateAi,
    applyHubUpdateSelected,
    quickCreateData,
    setQuickCreateData,
    handleConfirmQuickCreate,
    isManageTabsOpen,
    setIsManageTabsOpen,
    sortedTabs,
    editingTab,
    setEditingTab,
    handleAddTabLon,
    handleSaveEditLabel,
    handleToggleViewType,
    handleDeleteTab,
    handleAddTabNho,
    handleAddTabCon,
    handleSetTabAutoSyncRole,
    handleSetTabAutoSyncTargets,
    handleSetTabAutoSyncLevels,
    handleSetTabAutoSyncFieldMap,
    handleSetTabListGroupStrategy,
    handleSetTabMapEntrySuggestions,
    handleMergeTabFieldSuggestionList,
    handleAddTabTemplateField,
    handleRemoveTabTemplateField,
    handleRenameTabTemplateFieldLabel,
    handleSetTabEntityQuickEntry,
    handleApplySuggestedAutoSyncSetup,
    handleResyncAutoTabs,
    handleSaveCurrentTabsAsGenreTemplate,
  };
  return (
    <div className={`min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans overflow-hidden relative theme-wrapper ${activeThemeClass} ${performanceMode ? 'performance-mode' : ''}`}>
      <AppHeader
        menu1Visible={menu1Visible}
        setMenu1Visible={setMenu1Visible}
        handleGoHome={handleGoHome}
        setIsSettingsOpen={() => setIsSettingsOpen(true)}
        hasDirectory={!!dirHandle}
        dirName={dirName}
        setIsDeepSearchOpen={() => setIsDeepSearchOpen(true)}
        showInNovelSearch={!!activeNovelData}
        onInNovelSearch={() => setIsInNovelSearchOpen(true)}
        performanceMode={performanceMode}
        setPerformanceMode={setPerformanceMode}
        onOpenCommandPalette={() => {
          setIsCommandPaletteOpen(true);
          setCommandPaletteQuery('');
        }}
      />

      <div className="flex-1 flex overflow-hidden">
        <AppLibrarySidebar
          menu1Visible={menu1Visible}
          setMenu1Visible={setMenu1Visible}
          librarySearchInputRef={librarySearchInputRef}
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          searchHistory={searchHistory}
          setSearchQuery={setSearchQuery}
          searchField={searchField}
          setSearchField={setSearchField}
          isGenreFilterOpen={isGenreFilterOpen}
          setIsGenreFilterOpen={setIsGenreFilterOpen}
          selectedGenres={selectedGenres}
          toggleGenre={toggleGenre}
          setSelectedGenres={setSelectedGenres}
          handleOpenCreateNovel={handleOpenCreateNovel}
          setIsSettingsOpen={setIsSettingsOpen}
          dirHandle={dirHandle}
          filteredNovelsList={filteredNovelsList}
          sidebarListRef={sidebarListRef}
          handleSidebarScroll={handleSidebarScroll}
          totalSidebarItems={totalSidebarItems}
          sidebarItemHeight={sidebarItemHeight}
          visibleSidebarNovels={visibleSidebarNovels}
          sidebarStartIndex={sidebarStartIndex}
          activeNovelId={activeNovelData?.id}
          onSelectNovel={handleSelectNovel}
          onHoverNovel={handleSidebarNovelHover}
          onClearHover={clearHoveredNovel}
        />

        <AppMainPane
          menu1Visible={menu1Visible}
          activeNovelData={activeNovelData}
          showConnectReminder={showConnectReminder}
          dirHandle={dirHandle}
          dismissConnectReminder={dismissConnectReminder}
          novelsMetadata={novelsMetadata}
          dashboardStats={dashboardStats}
          isStatsBackfilling={isStatsBackfilling}
          novelStatsById={novelStatsById}
          handleSelectNovel={handleSelectNovel}
          handleOpenCreateNovel={handleOpenCreateNovel}
          setIsManageTabsOpen={setIsManageTabsOpen}
          menu2Expanded={menu2Expanded}
          setMenu2Expanded={setMenu2Expanded}
          handleMenu2MouseEnter={handleMenu2MouseEnter}
          handleMenu2MouseLeave={handleMenu2MouseLeave}
          sidebarGrouped={sidebarGrouped}
          setSidebarGrouped={setSidebarGrouped}
          tabGroups={tabGroups}
          sortedTabs={sortedTabs}
          collapsedTabGroups={collapsedTabGroups}
          toggleTabGroupCollapse={toggleTabGroupCollapse}
          activeTabLon={activeTabLon}
          activeTabNho={activeTabNho}
          activeTabCon={activeTabCon}
          handleSelectTabLon={handleSelectTabLon}
          handleSelectTabNho={handleSelectTabNho}
          handleSelectTabCon={handleSelectTabCon}
          navHistory={navHistory}
          handleGoBack={handleGoBack}
          collectionSubTab={collectionSubTab}
          overviewSectionProps={overviewSectionProps}
          collectionSectionProps={collectionSectionProps}
        />
      </div>

      <AppModalLayer {...modalLayerProps} />

      <AppShellOverlays
        lightboxSrc={lightboxSrc}
        setLightboxSrc={setLightboxSrc}
        hoveredNovelData={hoveredNovelData}
        tooltipPos={tooltipPos}
        toastMessage={toastMessage}
        toastTimerRef={toastTimerRef}
        setToastMessage={setToastMessage}
        isUploading={isUploading}
        importProgress={importProgress}
        isDirectoryConnectionBootstrapping={isDirectoryConnectionBootstrapping}
        currentContextDirHandle={currentContextDirHandle}
      />

      <AppPhongChuVaTheme />
    </div>
  );
}
