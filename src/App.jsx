// ==========================================
// TRá»¤ 4: TRáº¬N NHÃƒN TRUNG TÃ‚M
// File: App.jsx
// Vai tro: state toan cuc, dieu phoi, layout chinh, quan ly thu muc truyen.
//
// ÄÃ£ tÃ¡ch (cÃ¹ng thÆ° má»¥c src/, tÃªn dá»… nhá»›):
//   appNhatKyVaGoiThe.js     â€” findEntitiesByHintInNovel (mutateâ€¦ dÃ¹ng trong useAppMotCuaCapNhat)
//   AppPhongChuVaTheme.jsx   - font + CSS theme toan cuc
//   AppModalMotCua.jsx       â€” Má»™t cá»­a cáº­p nháº­t (táº¡o tháº» / nháº­t kÃ½ batch)
//   AppModalQuanLyTab.jsx    â€” Tráº­n phÃ¡p / quáº£n lÃ½ tab
//   AppModalLenhNhanh.jsx    â€” Command palette
//   AppModalGoiYNoiTraCuu.jsx â€” Gá»£i Ã½ AI ná»‘i tra cá»©u
//   lib/stripWikiBrackets.js, lib/computeRelatedEntities.js, lib/entityFieldValue.js, lib/entityCollectionQuery.js
//   useAppPersistence.js      â€” sync index + file truyá»‡n
//   AppAdvancedFieldSelect.jsx â€” collection filter select UI
//   AppLibrarySidebar.jsx, useAppLibrarySidebarState.js â€” library rail UI + state
//   AppNovelTocRail.jsx, useAppTocRail.js â€” novel TOC rail UI + navigation state
//   useAppDirectoryBackup.js  â€” folder connect + import/export backup handlers
//   useAppImageWorkflow.js    â€” image upload/picker/modal workflow
//   AppShellOverlays.jsx      â€” lightbox, toast, spinner
//   lib/appTabGroups, appDashboardStats, buildEntityLinkMap, filterNovelsForLibrary, buildCurrentContextDirHandle
//   useAppNovelCrud.js        â€” novel modal state + create/edit/delete handlers
//   useAppPhimTatToanCuc.js     â€” phÃ­m táº¯t Ctrl+K, /, Escapeâ€¦
//   lib/tinhThongKeNhanhTruyen, locLenhNhanhCommandPalette, xrefBangDanhMucThucThe, xrefChonMucThuThap
//   useAppMotCuaCapNhat.js, lib/hubBangDanhMucCacMucNhatKy â€” Hub má»™t cá»­a + catalog nháº­t kÃ½
// ==========================================

import React, { Suspense, lazy, useDeferredValue, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft } from 'lucide-react';
import {
  FALLBACK_IMG, DEFAULT_ENTITY_FIELDS, GENRES, THEMES,
  INITIAL_TABS_CONFIG, MOCK_METADATA, MOCK_NOVEL_DATA,
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
  AppHeader, LandingScreen, DashboardScreen,
  ModalEntity, ModalMilestone, ModalQuickCreate, ModalSettings,
  ModalConfirm, ModalInsertImage, ModalAddNovel, ModalDeepSearch, ModalInNovelSearch
} from './MasterComponents.jsx';
import { AdvancedFieldSelect } from './AppAdvancedFieldSelect.jsx';
import { AppLibrarySidebar } from './AppLibrarySidebar.jsx';
import { AppNovelTocRail } from './AppNovelTocRail.jsx';
import { AppOverviewSection } from './AppOverviewSection.jsx';
import { getEntityFieldValue } from './lib/entityFieldValue.js';
import { buildEntitySearchIndexMap, applyEntityCollectionFilters } from './lib/entityCollectionQuery.js';
import { useEntityCollectionQueryState } from './useEntityCollectionQueryState.js';
import { AppCollectionSection } from './AppCollectionSection.jsx';
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
import { migrateIndex } from './dataMigration.js';
import { buildTabGroups } from './lib/appTabGroups.js';
import { computeDashboardStats } from './lib/appDashboardStats.js';
import { buildEntityLinkMap } from './lib/buildEntityLinkMap.js';
import { buildCurrentContextDirHandle } from './lib/buildCurrentContextDirHandle.js';
import { useAppPersistence } from './useAppPersistence.js';
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



const AppModalMotCua = lazy(() => import('./AppModalMotCua.jsx').then((m) => ({ default: m.AppModalMotCua })));
const AppModalQuanLyTab = lazy(() => import('./AppModalQuanLyTab.jsx').then((m) => ({ default: m.AppModalQuanLyTab })));
const AppModalLenhNhanh = lazy(() => import('./AppModalLenhNhanh.jsx').then((m) => ({ default: m.AppModalLenhNhanh })));
const AppModalGoiYNoiTraCuu = lazy(() => import('./AppModalGoiYNoiTraCuu.jsx').then((m) => ({ default: m.AppModalGoiYNoiTraCuu })));

export default function App() {
  const [novelsMetadata, setNovelsMetadata] = useState(MOCK_METADATA);
  const [activeNovelData, setActiveNovelData] = useState(null); 

  const [globalTabsConfig, setGlobalTabsConfig] = useState(INITIAL_TABS_CONFIG);
  
  const [menu1Visible, setMenu1Visible] = useState(false);
  const [activeTabLon, setActiveTabLon] = useState('tong-quan');
  const [activeTabNho, setActiveTabNho] = useState(null);
  const [activeTabCon, setActiveTabCon] = useState(null);
  
  const [selectedEntityId, setSelectedEntityId] = useState(null);
  const entityAdvancedRef = useRef(null);
  const ENTITY_PAGE_SIZE = 12; 
  
  const [collectionSubTab, setCollectionSubTab] = useState('list'); 
  const [navHistory, setNavHistory] = useState([]);

  const [selectedMilestoneId, setSelectedMilestoneId] = useState(null);
  const [editingMilestoneData, setEditingMilestoneData] = useState(null);

  const [isEntityEditing, setIsEntityEditing] = useState(false);
  const [isSplitPreview, setIsSplitPreview] = useState(false);
  const [recentlyMergedFields, setRecentlyMergedFields] = useState(new Set()); // track field vá»«a merge
  const [livePreviewText, setLivePreviewText] = useState('');
  const [debouncedMarkdownPreview, setDebouncedMarkdownPreview] = useState('');
  const [isExtractingAI, setIsExtractingAI] = useState(false);
  const [isGeneratingReview, setIsGeneratingReview] = useState(false);

  const [isEditingMode, setIsEditingMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isManageTabsOpen, setIsManageTabsOpen] = useState(false);
  const [isDeepSearchOpen, setIsDeepSearchOpen] = useState(false);
  const [isInNovelSearchOpen, setIsInNovelSearchOpen] = useState(false);
  const [xrefDraft, setXrefDraft] = useState({ from: '', to: '', note: '' });
  const [neoXrefSectionOpen, setNeoXrefSectionOpen] = useState(false);
  const [overviewNeoOpen, setOverviewNeoOpen] = useState(false);
  /** { xref, suggestions, loading, error } | null */
  const [xrefAiPanel, setXrefAiPanel] = useState(null);

  const [overviewHubOpen, setOverviewHubOpen] = useState(false);
  const [overviewHubTab, setOverviewHubTab] = useState('create');
  const [hubCreatePath, setHubCreatePath] = useState('');
  const [hubCreateInput, setHubCreateInput] = useState('');
  const [hubCreatePreview, setHubCreatePreview] = useState(null);
  const [hubCreateBusy, setHubCreateBusy] = useState(false);
  const [hubUpdateChapter, setHubUpdateChapter] = useState('');
  const [hubUpdateText, setHubUpdateText] = useState('');
  const [hubUpdatePanel, setHubUpdatePanel] = useState(null);
  
  const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);
  const [editingEntityData, setEditingEntityData] = useState(null);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [quickCreateData, setQuickCreateData] = useState(null); 
  
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const [overviewForm, setOverviewForm] = useState(null);
  
  const [wikiExactMatchOnly, setWikiExactMatchOnly] = useState(() => {
    try {
      return localStorage.getItem('tangthu_wiki_exact') === '1';
    } catch {
      return false;
    }
  });
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPaletteQuery, setCommandPaletteQuery] = useState('');
  const deferredCommandPaletteQuery = useDeferredValue(commandPaletteQuery);
  const [overviewStatsOpen, setOverviewStatsOpen] = useState(false);
  const commandPaletteOpenRef = useRef(false);
  commandPaletteOpenRef.current = isCommandPaletteOpen;

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
  
  const [dirHandle, setDirHandle] = useState(null);
  const [activeNovelDirHandle, setActiveNovelDirHandle] = useState(null);
  
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimerRef = useRef(null);
  /** options: { undoLabel, onUndo } - hien nut hoan tac, toast lau hon */
  const showToast = useCallback((msg, type = 'success', options = null) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    const hasUndo = options && typeof options.onUndo === 'function';
    setToastMessage({
      msg,
      type,
      undoLabel: hasUndo ? (options.undoLabel || 'HoÃ n tÃ¡c') : undefined,
      onUndo: hasUndo ? options.onUndo : undefined,
    });
    const ms = hasUndo ? 9000 : 3500;
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, ms);
  }, []);
  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    []
  );

  const [lightboxSrc, setLightboxSrc] = useState(null); // null = Ä‘Ã³ng, string = URL/local_image
  
  const [editingTab, setEditingTab] = useState(null);

  const [geminiApiKeys, setGeminiApiKeys] = useState(() => {
    try {
      const stored = localStorage.getItem('tangthu_apikeys');
      if (stored) { const arr = JSON.parse(stored); if (Array.isArray(arr) && arr.length > 0) return arr; }
    } catch { void 0; }
    // Backward compat: migrate old single-key
    const oldKey = localStorage.getItem('tangthu_apikey');
    return oldKey ? [oldKey] : [];
  });
  const handleSaveApiKeys = (keys) => {
    const filtered = keys.map(k => k.trim()).filter(Boolean);
    setGeminiApiKeys(filtered);
    localStorage.setItem('tangthu_apikeys', JSON.stringify(filtered));
    if (filtered.length > 0) localStorage.setItem('tangthu_apikey', filtered[0]);
  };
  const [aiMode, setAiMode] = useState(() => {
    try {
      const saved = localStorage.getItem('tangthu_ai_mode');
      return saved === 'quick' ? 'quick' : 'standard';
    } catch {
      return 'standard';
    }
  });
  const [performanceMode, setPerformanceMode] = useState(() => {
    try {
      return localStorage.getItem('tangthu_perf_mode') === '1';
    } catch {
      return false;
    }
  });
  const [autoLinkToastEnabled, setAutoLinkToastEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('tangthu_autolink_toast');
      return saved !== '0';
    } catch {
      return true;
    }
  });

  /** Tong thuc the / moc - luu trong index.json, khong preload toan bo novel */
  const [novelStatsById, setNovelStatsById] = useState({});
  const [isStatsBackfilling, setIsStatsBackfilling] = useState(false);
  const novelStatsByIdRef = useRef({});
  const novelsMetadataRef = useRef(novelsMetadata);
  const globalTabsConfigRef = useRef(globalTabsConfig);
  const dirHandleRef = useRef(dirHandle);
  const activeNovelDataRef = useRef(null);
  const deepSearchIndexByNovelIdRef = useRef(new Map());
  const deepSearchWorkerRef = useRef(null);
  const deepSearchWorkerReqIdRef = useRef(0);
  const lazyTabLoadInFlightRef = useRef(new Set());
  const lazyFullHydrateInFlightRef = useRef(new Set());
  const confirmDeleteEntityRef = useRef(null);

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
    []
  );

  useEffect(() => {
    novelsMetadataRef.current = novelsMetadata;
    globalTabsConfigRef.current = globalTabsConfig;
    dirHandleRef.current = dirHandle;
  }, [novelsMetadata, globalTabsConfig, dirHandle]);

  useEffect(() => {
    activeNovelDataRef.current = activeNovelData;
  }, [activeNovelData]);

  useEffect(() => {
    return () => {
      if (deepSearchWorkerRef.current) {
        try {
          deepSearchWorkerRef.current.terminate();
        } catch {
          void 0;
        }
        deepSearchWorkerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const keep = new Set((novelsMetadata || []).map((n) => n.id));
    const idx = deepSearchIndexByNovelIdRef.current;
    for (const k of idx.keys()) {
      if (!keep.has(k)) idx.delete(k);
    }
  }, [novelsMetadata]);

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
  }, []);

  useEffect(() => {
    novelStatsByIdRef.current = novelStatsById;
  }, [novelStatsById]);

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


  const dirName = typeof dirHandle === 'string' ? 'Bá»™ nhá»› Ä‘á»‡m' : (dirHandle?.name || '');
  
  const currentTabConfig = useMemo(() => {
    if (!activeTabLon) return null;
    const parent = sortedTabs.find(t => t.id === activeTabLon);
    const tab = parent?.subTabs?.find(s => s.id === activeTabNho) || parent;
    if (!tab) return null;
    // Chá»‰ inject template máº·c Ä‘á»‹nh khi chÆ°a cÃ³ template Ä‘Ã£ lÆ°u (giá»¯ nhÃ£n tÃ¹y chá»‰nh)
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
    [entitiesList, entityPage]
  );
  const groupedEntitiesList = useMemo(() => {
    if (entityGroupBy === 'none') return [];
    const groups = {};
    entitiesList.forEach((ent) => {
      const val = getEntityFieldValue(ent, entityGroupBy).trim() || 'â€” ChÆ°a phÃ¢n loáº¡i â€”';
      if (!groups[val]) groups[val] = [];
      groups[val].push(ent);
    });
    return Object.entries(groups).sort((a, b) => {
      if (a[0] === 'â€” ChÆ°a phÃ¢n loáº¡i â€”') return 1;
      if (b[0] === 'â€” ChÆ°a phÃ¢n loáº¡i â€”') return -1;
      return a[0].localeCompare(b[0], 'vi');
    });
  }, [entitiesList, entityGroupBy]);

  /** Thá»±c thá»ƒ cÃ³ ká»· nguyÃªn trong [neoâˆ’12, neo+30] â€” má»i má»¥c sÆ°u táº­p */
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
  }, [showEntityAdvanced, setShowEntityAdvanced]);
  /** Luon resolve tu toan bo entities tab - khong dung entitiesList da loc theo o tim. */
  const selectedEntity = useMemo(() => {
    if (!activeNovelData || !activeTabLon || !selectedEntityId) return undefined;
    if (!currentTabConfig || currentTabConfig.viewType !== 'collection-track') return undefined;
    const tabData = activeNovelData.data?.[activeTabLon]?.[activeTabNho || 'default'];
    if (!tabData || typeof tabData === 'string' || !Array.isArray(tabData.entities)) return undefined;
    return tabData.entities.find((e) => e.id === selectedEntityId);
  }, [activeNovelData, activeTabLon, activeTabNho, currentTabConfig, selectedEntityId]);

  /** Äá»•i má»¥c / loáº¡i tab: bá» chá»n tháº» náº¿u khÃ´ng cÃ²n thuá»™c tab collection hiá»‡n táº¡i hoáº·c tháº» Ä‘Ã£ bá»‹ xÃ³a. */
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
  }, [activeNovelData, activeTabLon, activeTabNho, currentTabConfig, selectedEntityId]);

  // Global map - toan bo truyen, dung de resolve [[...]] link va renderMarkdown lookup.
  const entityMap = useMemo(() => buildEntityLinkMap(activeNovelData), [activeNovelData]);

  // Local/scoped map â€” chá»‰ tab hiá»‡n táº¡i, dÃ¹ng cho plain-text auto-link matcher (hiá»‡u nÄƒng).
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

  useEffect(() => {
    if (window.self !== window.top) {
       const localIndex = localStorage.getItem('tangthu_index');
       if (localIndex) {
          try {
             const parsed = JSON.parse(localIndex);
             const index = migrateIndex(parsed);
             if (index.metadata && index.metadata.length > 0) setNovelsMetadata(index.metadata);
             if (index.config) setGlobalTabsConfig(index.config);
             if (index.novelStats && typeof index.novelStats === 'object') {
               novelStatsByIdRef.current = index.novelStats;
               setNovelStatsById(index.novelStats);
             }
             setDirHandle("LOCAL_STORAGE");
          } catch { void 0; }
       }
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('tangthu_wiki_exact', wikiExactMatchOnly ? '1' : '0');
    } catch { void 0; }
  }, [wikiExactMatchOnly]);
  useEffect(() => {
    try {
      localStorage.setItem('tangthu_ai_mode', aiMode);
    } catch { void 0; }
  }, [aiMode]);
  useEffect(() => {
    try {
      localStorage.setItem('tangthu_perf_mode', performanceMode ? '1' : '0');
    } catch { void 0; }
  }, [performanceMode]);
  useEffect(() => {
    try {
      localStorage.setItem('tangthu_autolink_toast', autoLinkToastEnabled ? '1' : '0');
    } catch { void 0; }
  }, [autoLinkToastEnabled]);
  useEffect(() => {
    if (activeNovelData) {
      setOverviewForm({
        status: activeNovelData.status,
        chaptersRead: activeNovelData.chaptersRead,
        chaptersTotal: activeNovelData.chaptersTotal,
        rating: activeNovelData.rating,
        review: activeNovelData.review,
        ratingOpinion: safeString(activeNovelData.ratingOpinion),
      });
    }
  }, [activeNovelData]); 

  const findEntitiesByXrefHint = useCallback(
    (hint) => findEntitiesByHintInNovel(activeNovelData, hint),
    [activeNovelData]
  );

  const runXrefAiForRow = useCallback(
    async (xref) => {
      if (!activeNovelData || geminiApiKeys.length === 0) {
        showToast('Cáº§n API Key (CÃ i Ä‘áº·t) Ä‘á»ƒ gá»£i Ã½ AI.', 'warning');
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
    [activeNovelData, geminiApiKeys, showToast]
  );

  const applyXrefSuggestionNewEntity = useCallback(
    (s, xref) => {
      const path = resolveXrefTargetCollectionTab(
        s.tabLonId,
        s.tabNhoId,
        activeNovelData?.tabsConfig || globalTabsConfig
      );
      if (!path) {
        showToast('KhÃ´ng tÃ¬m tháº¥y má»¥c sÆ°u táº­p phÃ¹ há»£p.', 'warning');
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
        name: safeString(s.suggestedName) || 'ChÆ°a Ä‘áº·t tÃªn',
        avatar: '',
        rawText: safeString(s.draftRawText) || safeString(xref?.note) || '',
        dynamicData: {},
      });
      setIsEntityModalOpen(true);
      setXrefAiPanel(null);
      showToast('ÄÃ£ má»Ÿ form táº¡o tháº» â€” kiá»ƒm tra rá»“i LÆ°u.');
    },
    [activeNovelData?.tabsConfig, globalTabsConfig, activeTabLon, activeTabNho, activeTabCon, selectedEntityId, collectionSubTab, showToast, setEntitySearch]
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
      showToast(`Má»‘c cho Â«${safeString(matchRow.ent.name)}Â» â€” chá»‰nh rá»“i LÆ°u.`);
    },
    [activeTabLon, activeTabNho, activeTabCon, selectedEntityId, collectionSubTab, showToast]
  );

  const applyXrefSuggestionProfile = useCallback(
    (matchRow, suggestion, novelData) => {
      const tabData = novelData?.data?.[matchRow.lonId]?.[matchRow.nhoId];
      const ent = tabData?.entities?.find((e) => e.id === matchRow.ent.id);
      if (!ent) {
        showToast('KhÃ´ng tÃ¬m tháº¥y tháº».', 'error');
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
          (note ? `\n\nâ€” Gá»£i Ã½ tá»« ná»‘i tra cá»©u â€”\n${note}` : ''),
      });
      setIsEntityModalOpen(true);
      setXrefAiPanel(null);
      showToast('ÄÃ£ má»Ÿ sá»­a tháº» â€” xem pháº§n báº£n tháº£o / AI Ä‘iá»n form.');
    },
    [activeTabLon, activeTabNho, activeTabCon, selectedEntityId, collectionSubTab, showToast]
  );

  useEffect(() => {
    if (!isSplitPreview) return;
    const delay = (livePreviewText || '').length > 40000 ? 800 : 300;
    const t = setTimeout(() => setDebouncedMarkdownPreview(livePreviewText), delay);
    return () => clearTimeout(t);
  }, [livePreviewText, isSplitPreview]);

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
  }, [novelsMetadata, dirHandle, activeNovelData?.id, loadNovelData, syncIndex]);

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
    [novelsMetadata, activeNovelData, dirHandle, loadNovelData, searchRowsInWorker]
  );

  const updateActiveNovelData = useCallback(
    (updateFn) => {
      if (!activeNovelData) return;
      const updatedData = structuredClone(activeNovelData);
      updateFn(updatedData);
      const nextStats = { ...novelStatsByIdRef.current };
      if (!updatedData.__partialData) {
        nextStats[updatedData.id] = countEntitiesInNovel(updatedData);
      }
      novelStatsByIdRef.current = nextStats;
      setNovelStatsById(nextStats);
      setActiveNovelData(updatedData);
      deepSearchIndexByNovelIdRef.current.set(
        updatedData.id,
        buildNovelSearchIndex(updatedData)
      );
      syncNovel(updatedData, dirHandle);

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
        title: activeNovelData.title,
        cover: activeNovelData.cover,
        tags: activeNovelData.tags,
        review: activeNovelData.review,
        status: activeNovelData.status,
        genres: activeNovelData.genres || [activeNovelData.genre],
        theme: activeNovelData.theme,
        author: activeNovelData.author,
        folderName: activeNovelData.folderName,
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
    },
    [activeNovelData, novelsMetadata, globalTabsConfig, dirHandle, syncNovel, syncIndex]
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
      const quickName = safeString(name).trim();
      if (!quickName) return;
      const newEntityId = generateId('ent');
      let targetExistingId = null;
      updateActiveNovelData(nov => {
          if (!nov.data) nov.data = {}; if (!nov.data[lonId]) nov.data[lonId] = {};
          let tabData = nov.data[lonId][nhoId];
          if (!tabData || typeof tabData === 'string') tabData = { overview: '', entities: [] };
          if (!tabData.entities) tabData.entities = [];
          const matched = findEquivalentEntityByName(tabData.entities, quickName);
          if (matched?.entity) {
            targetExistingId = matched.entity.id;
            const prevAlias = safeString(matched.entity.dynamicData?.f_alias);
            const mergedAlias = mergeAliasText(prevAlias, quickName);
            if (mergedAlias !== prevAlias) {
              if (!matched.entity.dynamicData) matched.entity.dynamicData = {};
              matched.entity.dynamicData.f_alias = mergedAlias;
            }
          } else {
            tabData.entities.push({ id: newEntityId, name: quickName, avatar: '', rawText: '', dynamicData: {}, info: '', milestones: [], images: [] });
          }
          nov.data[lonId][nhoId] = tabData;
          if (!targetExistingId) lockFieldsTemplateIfFirstEntity(nov, lonId, nhoId);
      });
      if (targetExistingId) {
        showToast(`"${quickName}" da trung the co san - da them vao bi danh va lien ket ve the cu.`, 'warning');
        handleNavigate({ lonId, nhoId, entityId: targetExistingId });
        return;
      }
      showToast(`Da ngung tu thanh cong ${quickName}!`);
      handleNavigate({ lonId, nhoId, entityId: newEntityId });
  };

  const handleUpdateTabTemplate = (newFields) => {
    updateActiveNovelData(nov => {
       if (!nov.tabsConfig) nov.tabsConfig = [];
       const lon = nov.tabsConfig.find(t => t.id === activeTabLon);
       const nho = lon?.subTabs?.find(s => s.id === activeTabNho);
       if (nho) nho.fieldsTemplate = newFields;
    });
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
    setIsEditingMode(false); setIsSplitPreview(false); showToast("Kháº¯c áº¥n Ä‘áº¡i Ä‘áº¡o thÃ nh cÃ´ng!");
  };

  const {
    handleOpenCreateEntity,
    handleOpenEditEntity,
    handleSaveEntity,
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
  }, []);

  const handleExportEntityPDF = (entity, tabConfig) => {
    if (!entity) return;
    const fields =
      tabConfig && activeTabLon
        ? resolveFieldsTemplate(tabConfig, activeTabLon, tabConfig._parentLabel || '')
        : tabConfig?.fieldsTemplate || DEFAULT_ENTITY_FIELDS;
    const escHtml = (str) => String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    const getVal = (fid) => {
      if (entity.dynamicData?.[fid]) return entity.dynamicData[fid];
      if (fid === 'f_status') return entity.status || '';
      if (fid === 'f_title') return entity.title || '';
      if (fid === 'f_desc') return entity.description || '';
      return '';
    };
    const fieldsHTML = fields.map(f => {
      const val = getVal(f.id);
      if (!val) return '';
      return '<div class="field-row"><div class="field-label">' + escHtml(f.label) + '</div><div class="field-value">' + escHtml(val) + '</div></div>';
    }).filter(Boolean).join('');

    const milestonesHTML = (entity.milestones || []).sort((a,b) => a.chapter - b.chapter).map(ms =>
      '<div class="milestone"><div class="ms-chapter">ChÆ°Æ¡ng ' + escHtml(ms.chapter) + '</div><div class="ms-event">' + escHtml(ms.event || '') + '</div></div>'
    ).join('');

    const infoHTML = escHtml(entity.info || '').replace(/\n/g, '<br/>');
    const novelTitle = activeNovelData?.title || '';
    const tabLabel = currentTabConfig?.label || '';
    const firstFieldVal = fields[0] ? getVal(fields[0].id) : '';

    const printWindow = window.open('', '_blank');
    if (!printWindow) { showToast('TrÃ¬nh duyá»‡t cháº·n popup. Vui lÃ²ng cho phÃ©p popup!', 'warning'); return; }

    const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Há»“ SÆ¡: ' + escHtml(entity.name || '') + '</title>'
      + '<style>'
      + '@import url(\'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&family=Playfair+Display:wght@700;800&display=swap\');'
      + '* { box-sizing: border-box; margin: 0; padding: 0; }'
      + 'body { font-family: Lora, serif; background: #fff; color: #1e293b; padding: 40px; max-width: 800px; margin: 0 auto; }'
      + '.header { border-bottom: 3px solid #b45309; padding-bottom: 20px; margin-bottom: 28px; }'
      + '.novel-name { font-size: 11px; text-transform: uppercase; letter-spacing: .2em; color: #92400e; font-weight: bold; margin-bottom: 6px; }'
      + '.entity-name { font-family: Playfair Display, serif; font-size: 36px; font-weight: 800; color: #0f172a; line-height: 1.1; }'
      + '.section { margin-bottom: 28px; }'
      + '.section-title { font-family: Playfair Display, serif; font-size: 14px; font-weight: 700; color: #b45309; text-transform: uppercase; letter-spacing: .15em; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #fde68a; }'
      + '.field-row { display: flex; margin-bottom: 10px; gap: 12px; }'
      + '.field-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .1em; min-width: 160px; padding-top: 2px; }'
      + '.field-value { font-size: 14px; color: #1e293b; flex: 1; line-height: 1.6; }'
      + '.info-text { font-size: 14px; line-height: 1.8; color: #334155; }'
      + '.milestone { padding: 12px 16px; border-left: 3px solid #fbbf24; margin-bottom: 10px; background: #fffbeb; border-radius: 0 6px 6px 0; }'
      + '.ms-chapter { font-size: 11px; font-weight: 700; color: #92400e; text-transform: uppercase; margin-bottom: 4px; }'
      + '.ms-event { font-size: 13px; color: #374151; line-height: 1.6; }'
      + '.no-print { background:#1e293b; color:#f8fafc; padding:12px 20px; margin:-40px -40px 30px; display:flex; justify-content:space-between; align-items:center; }'
      + '.print-btn { background:#b45309;color:#fff;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-weight:bold; }'
      + '.footer { margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center; }'
      + '@media print { .no-print { display:none; } body { padding:20px; } }'
      + '</style></head><body>'
      + '<div class="no-print"><span>ðŸ“„ Xem trÆ°á»›c â€” Nháº¥n In Ä‘á»ƒ lÆ°u PDF</span>'
      + '<button class="print-btn" onclick="window.print()">ðŸ–¨ In / LÆ°u PDF</button></div>'
      + '<div class="header">'
      + '<div class="novel-name">ðŸ“š ' + escHtml(novelTitle) + (tabLabel ? ' Â· ' + escHtml(tabLabel) : '') + '</div>'
      + '<div class="entity-name">' + escHtml(entity.name || 'VÃ´ Danh') + '</div>'
      + (firstFieldVal ? '<div style="color:#64748b;font-size:12px;margin-top:6px;text-transform:uppercase;letter-spacing:.1em">' + escHtml(firstFieldVal) + '</div>' : '')
      + '</div>'
      + (fieldsHTML ? '<div class="section"><div class="section-title">CÄƒn CÆ¡ & Thuá»™c TÃ­nh</div>' + fieldsHTML + '</div>' : '')
      + (infoHTML ? '<div class="section"><div class="section-title">Ghi ChÃ©p Chi Tiáº¿t</div><div class="info-text">' + infoHTML + '</div></div>' : '')
      + (milestonesHTML ? '<div class="section"><div class="section-title">DÃ²ng Thá»i Gian (' + (entity.milestones||[]).length + ' má»‘c)</div>' + milestonesHTML + '</div>' : '')
      + '<div class="footer">Xuáº¥t tá»« TÃ ng ThÆ° CÃ¡c Â· ' + new Date().toLocaleDateString('vi-VN') + '</div>'
      + '</body></html>';

    printWindow.document.write(html);
    printWindow.document.close();
  };

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
  // CÃC HÃ€M CÃ’N THIáº¾U (MISSING HANDLERS)
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
  }, []);

  // Migration: gá»™p fieldsTemplate â€” thÃªm trÆ°á»ng má»›i, giá»¯ nhÃ£n tÃ¹y chá»‰nh cá»§a ngÆ°á»i dÃ¹ng
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
    // Build dest from result fields (ModalDeepSearch tráº£ vá» tabLonId/tabNhoId/entityId, khÃ´ng pháº£i result.dest)
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
  const setTabsConfig = (newTabs) => {
    if (activeNovelData) {
      updateActiveNovelData(nov => { nov.tabsConfig = newTabs; });
    } else {
      setGlobalTabsConfig(newTabs);
      syncIndex(novelsMetadata, newTabs, dirHandle);
    }
  };

  const handleAddTabLon = () => {
    const newTab = {
      id: generateId('tab'),
      label: 'Má»¥c Má»›i',
      iconName: 'ScrollText',
      subTabs: [
        { id: generateId('sub'), label: 'Tiá»ƒu Má»¥c 1', viewType: 'standard', tabCon: [] }
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
    lon.subTabs.push({
      id: generateId('sub'),
      label: 'ChÆ°Æ¡ng Má»¥c Má»›i',
      viewType: 'collection-track',
      tabCon: [],
      fieldsTemplate: defaultFields
    });
    setTabsConfig(current);
  };

  const handleAddTabCon = (lonId, nhoId) => {
    const current = structuredClone(getTabsToUpdate());
    const lon = current.find(t => t.id === lonId);
    const nho = lon?.subTabs?.find(s => s.id === nhoId);
    if (!nho) return;
    if (!nho.tabCon) nho.tabCon = [];
    nho.tabCon.push({ id: generateId('con'), label: 'Tiá»ƒu Má»¥c Má»›i' });
    setTabsConfig(current);
  };

  const handleDeleteTab = (path) => {
    const current = structuredClone(getTabsToUpdate());
    if (path.length === 1) {
      setTabsConfig(current.filter(t => t.id !== path[0]));
    } else if (path.length === 2) {
      const lon = current.find(t => t.id === path[0]);
      if (lon) lon.subTabs = (lon.subTabs || []).filter(s => s.id !== path[1]);
      setTabsConfig(current);
    } else if (path.length === 3) {
      const lon = current.find(t => t.id === path[0]);
      const nho = lon?.subTabs?.find(s => s.id === path[1]);
      if (nho) nho.tabCon = (nho.tabCon || []).filter(c => c.id !== path[2]);
      setTabsConfig(current);
    }
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  };

  const handleSaveEditLabel = (path, label) => {
    if (!label.trim()) return;
    const current = structuredClone(getTabsToUpdate());
    if (path.length === 1) {
      const t = current.find(t => t.id === path[0]);
      if (t) t.label = label.trim();
    } else if (path.length === 2) {
      const lon = current.find(t => t.id === path[0]);
      const nho = lon?.subTabs?.find(s => s.id === path[1]);
      if (nho) {
        nho.label = label.trim();
        // Tá»± sinh trÆ°á»ng phÃ¹ há»£p khi Ä‘á»•i tÃªn â€” chá»‰ Ã¡p náº¿u template chÆ°a tÃ¹y chá»‰nh
        if (nho.viewType === 'collection-track' && isStockTemplate(nho.fieldsTemplate)) {
          const guessed = guessFieldsByLabel(label.trim());
          if (guessed) nho.fieldsTemplate = structuredClone(guessed);
        }
      }
    } else if (path.length === 3) {
      const lon = current.find(t => t.id === path[0]);
      const nho = lon?.subTabs?.find(s => s.id === path[1]);
      const con = nho?.tabCon?.find(c => c.id === path[2]);
      if (con) con.label = label.trim();
    }
    setTabsConfig(current);
    setEditingTab(null);
  };

  const handleToggleViewType = (path) => {
    const current = structuredClone(getTabsToUpdate());
    if (path.length === 1) {
      const t = current.find(t => t.id === path[0]);
      if (t) t.viewType = t.viewType === 'collection-track' ? 'standard' : 'collection-track';
    } else if (path.length === 2) {
      const lon = current.find(t => t.id === path[0]);
      const nho = lon?.subTabs?.find(s => s.id === path[1]);
      if (nho) {
        const switching = nho.viewType !== 'collection-track';
        nho.viewType = switching ? 'collection-track' : 'standard';
        // Tá»± gÃ¡n template phÃ¹ há»£p khi chuyá»ƒn sang collection-track
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
      }
    }
    setTabsConfig(current);
  };

  // ==========================================

  const navFnRef = useRef(null);
  navFnRef.current = handleNavigate;

  // LÆ°u láº¡i fieldsTemplate khi cáº§n gá»™p â€” thÃªm trÆ°á»ng má»›i, giá»¯ nhÃ£n tÃ¹y chá»‰nh
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
      return <div className="font-serif prose prose-invert max-w-none animate-fade-in min-h-[200px]">{renderMarkdown(safeString(selectedEntity.info), currentContextDirHandle, entityMap, globalLinkRegex, (dest) => { if(navFnRef.current) navFnRef.current(dest); })}</div>;
  }, [selectedEntity, collectionSubTab, isEntityEditing, currentContextDirHandle, entityMap, globalLinkRegex]);

  const memoizedStandardData = useMemo(() => {
      if (isEditingMode || currentTabConfig?.viewType === 'collection-track') return null;
      return <div className="font-serif animate-fade-in flex-1">{renderMarkdown(safeString(currentStandardData), currentContextDirHandle, entityMap, globalLinkRegex, (dest) => { if(navFnRef.current) navFnRef.current(dest); })}</div>;
  }, [currentStandardData, isEditingMode, currentTabConfig?.viewType, currentContextDirHandle, entityMap, globalLinkRegex]);

  const novelQuickStats = useMemo(
    () => computeNovelQuickStats(activeNovelData, safeString),
    [activeNovelData]
  );

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

        <div className={`flex-1 flex bg-slate-950 transition-opacity duration-300 ${menu1Visible ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          {!activeNovelData ? (
            <>
              {showConnectReminder && !!dirHandle && (
                <div className="mx-10 mt-6 mb-0 rounded-2xl border border-amber-700/40 bg-amber-900/20 px-5 py-4 text-sm text-amber-100 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold uppercase tracking-widest text-[11px] text-amber-300 mb-1">Nhac nho van hanh</p>
                    <p className="font-serif text-amber-100/90">Da ket noi thu muc. Nen backup thu muc luu tru dinh ky (tuan/thang), va thu restore tren ban sao truoc khi cap nhat lon.</p>
                  </div>
                  <button
                    type="button"
                    onClick={dismissConnectReminder}
                    className="px-3 py-1.5 rounded-lg border border-amber-600/40 text-amber-200 hover:bg-amber-800/30 text-xs font-bold"
                  >
                    ÄÃ£ rÃµ
                  </button>
                </div>
              )}
              {novelsMetadata.length > 0 ? (
                <DashboardScreen
                  novelsMetadata={novelsMetadata}
                  stats={dashboardStats}
                  isLoading={isStatsBackfilling}
                  novelStatsById={novelStatsById}
                  onSelectNovel={handleSelectNovel}
                  onSelectNovelAtTab={(meta, lonId, nhoId) => handleSelectNovel(meta, { lonId, nhoId })}
                  onAddNovel={handleOpenCreateNovel}
                />
              ) : (
                <LandingScreen setIsAddNovelOpen={handleOpenCreateNovel} setIsManageTabsOpen={() => setIsManageTabsOpen(true)} />
              )}
            </>
          ) : (
            <>
              <AppNovelTocRail
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
                setIsManageTabsOpen={setIsManageTabsOpen}
              />

              <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-950">
                 <div
                   id="main-scroll-container"
                   className={`flex-1 overflow-y-auto custom-scrollbar transition-[padding] duration-200 ease-out ${menu2Expanded ? 'py-8 px-16' : 'py-8 px-12 sm:px-16 lg:px-20'}`}
                 >
                    <div
                      className={`w-full mx-auto h-full flex flex-col transition-[max-width] duration-200 ease-out ${
                        menu2Expanded ? 'max-w-7xl' : 'max-w-none'
                      }`}
                    >
                       
                       {navHistory.length > 0 && (
                           <div className="mb-4">
                               <button onClick={handleGoBack} className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-400 transition-colors font-bold uppercase tracking-widest bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-800 w-fit shadow-sm"><ChevronLeft size={14}/> Quay Láº¡i Dáº¥u Váº¿t CÅ©</button>
                           </div>
                       )}
                       
                       {activeTabLon === 'tong-quan' ? (
                          <AppOverviewSection
                            tocRailExpanded={menu2Expanded}
                            activeNovelData={activeNovelData}
                            overviewForm={overviewForm}
                            setOverviewForm={setOverviewForm}
                            updateActiveNovelData={updateActiveNovelData}
                            nearChapterEntitiesGlobal={nearChapterEntitiesGlobal}
                            novelQuickStats={novelQuickStats}
                            geminiApiKeys={geminiApiKeys}
                            currentContextDirHandle={currentContextDirHandle}
                            isGeneratingReview={isGeneratingReview}
                            setIsGeneratingReview={setIsGeneratingReview}
                            overviewNeoOpen={overviewNeoOpen}
                            setOverviewNeoOpen={setOverviewNeoOpen}
                            neoXrefSectionOpen={neoXrefSectionOpen}
                            setNeoXrefSectionOpen={setNeoXrefSectionOpen}
                            overviewStatsOpen={overviewStatsOpen}
                            setOverviewStatsOpen={setOverviewStatsOpen}
                            xrefDraft={xrefDraft}
                            setXrefDraft={setXrefDraft}
                            setXrefAiPanel={setXrefAiPanel}
                            showToast={showToast}
                            setLightboxSrc={setLightboxSrc}
                            setIsDeepSearchOpen={setIsDeepSearchOpen}
                            setIsInNovelSearchOpen={setIsInNovelSearchOpen}
                            handleOpenEditNovel={handleOpenEditNovel}
                            handleDeleteNovel={handleDeleteNovel}
                            openOverviewHub={openOverviewHub}
                            handleNavigate={handleNavigate}
                            runXrefAiForRow={runXrefAiForRow}
                            setConfirmDialog={setConfirmDialog}
                          />
                       ) : (
                          <AppCollectionSection
                            tocRailExpanded={menu2Expanded}
                            activeTabLon={activeTabLon}
                            activeTabNho={activeTabNho}
                             activeTabCon={activeTabCon}
                             sortedTabs={sortedTabs}
                             currentTabConfig={currentTabConfig}
                             handleSelectTabLon={handleSelectTabLon}
                             handleSelectTabNho={(event, lonId, sub) => {
                               event.stopPropagation();
                               handleSelectTabNho(lonId, sub.id);
                             }}
                             activeNovelData={activeNovelData}
                            currentContextDirHandle={currentContextDirHandle}
                            activeNovelDirHandle={activeNovelDirHandle}
                            dirHandle={dirHandle}
                            entityAdvancedRef={entityAdvancedRef}
                            entitySearch={entitySearch}
                            setEntitySearch={setEntitySearch}
                            entitySortMode={entitySortMode}
                            setEntitySortMode={setEntitySortMode}
                            showEntityAdvanced={showEntityAdvanced}
                            setShowEntityAdvanced={setShowEntityAdvanced}
                            isEntityAdvancedActive={isEntityAdvancedActive}
                            clearEntityAdvanced={clearEntityAdvanced}
                            entityFilterField={entityFilterField}
                            setEntityFilterField={setEntityFilterField}
                            entityFilterValue={entityFilterValue}
                            setEntityFilterValue={setEntityFilterValue}
                            entityGroupBy={entityGroupBy}
                            setEntityGroupBy={setEntityGroupBy}
                            entityFilterFields={entityFilterFields}
                            entityFilterOptions={entityFilterOptions}
                            entityGroupOptions={entityGroupOptions}
                            entityContextPresets={entityContextPresets}
                            applyEntityPreset={applyEntityPreset}
                            AdvancedFieldSelect={AdvancedFieldSelect}
                            getTerms={getTerms}
                            handleOpenCreateEntity={handleOpenCreateEntity}
                            collectionSubTab={collectionSubTab}
                            setCollectionSubTab={setCollectionSubTab}
                            entitiesList={entitiesList}
                            entityPage={entityPage}
                            setEntityPage={setEntityPage}
                            pagedEntitiesList={pagedEntitiesList}
                            groupedEntitiesList={groupedEntitiesList}
                            groupVisibleCount={groupVisibleCount}
                            setGroupVisibleCount={setGroupVisibleCount}
                            entityPageSize={ENTITY_PAGE_SIZE}
                            handleAddEntityImage={handleAddImageToSelectedEntity}
                            handleRemoveEntityImage={handleRemoveImageFromSelectedEntity}
                            onEntityCardSelect={onEntityCardSelect}
                            onEntityCardDelete={onEntityCardDelete}
                            onEntityCardAddMilestone={onEntityCardAddMilestone}
                            selectedEntity={selectedEntity}
                            isEntityEditing={isEntityEditing}
                            setIsEntityEditing={setIsEntityEditing}
                            recentlyMergedFields={recentlyMergedFields}
                            entityMap={entityMap}
                            globalLinkRegex={globalLinkRegex}
                            relatedEntities={relatedEntities}
                            isCalculatingNetwork={isCalculatingNetwork}
                            navFnRef={navFnRef}
                            handleNavigate={handleNavigate}
                            handleExportEntityPDF={handleExportEntityPDF}
                            handleOpenEditEntity={handleOpenEditEntity}
                            isExtractingAI={isExtractingAI}
                            setIsExtractingAI={setIsExtractingAI}
                            geminiApiKeys={geminiApiKeys}
                            showToast={showToast}
                            aiMode={aiMode}
                            isSplitPreview={isSplitPreview}
                            setLivePreviewText={setLivePreviewText}
                            setDebouncedMarkdownPreview={setDebouncedMarkdownPreview}
                            setIsSplitPreview={setIsSplitPreview}
                            handleUpdateEntityInfo={handleUpdateEntityInfo}
                            setImageForm={setImageForm}
                            setIsInsertImageModalOpen={setIsInsertImageModalOpen}
                            handlePickLocalImage={handlePickLocalImage}
                            debouncedMarkdownPreview={debouncedMarkdownPreview}
                            memoizedEntityInfo={memoizedEntityInfo}
                            setLightboxSrc={setLightboxSrc}
                            selectedMilestoneId={selectedMilestoneId}
                            setSelectedMilestoneId={setSelectedMilestoneId}
                            setEditingMilestoneData={setEditingMilestoneData}
                            setIsMilestoneModalOpen={setIsMilestoneModalOpen}
                            handleMergeSnapshotToProfile={handleMergeSnapshotToProfile}
                            handleDeleteMilestone={handleDeleteMilestone}
                            handleReplaceMilestones={handleReplaceMilestones}
                            getFieldValue={getFieldValue}
                            isEditingMode={isEditingMode}
                            setIsEditingMode={setIsEditingMode}
                            handleSaveStandardEditor={handleSaveStandardEditor}
                            currentStandardData={currentStandardData}
                            memoizedStandardData={memoizedStandardData}
                            handleImageDrop={handleImageDrop}
                          />
                       )}
                    </div>
                 </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Suspense fallback={null}>
        <ModalEntity isOpen={isEntityModalOpen} onClose={() => setIsEntityModalOpen(false)} onSave={handleSaveEntity} initialData={editingEntityData} tabConfig={currentTabConfig} onUpdateTemplate={handleUpdateTabTemplate} handleAvatarDrop={handleAvatarDrop} handlePickLocalImage={handlePickLocalImage} dirHandle={currentContextDirHandle} parentTabId={activeTabLon} parentLabel={currentTabConfig?._parentLabel} geminiApiKey={geminiApiKeys} geminiMode={aiMode} />
        <ModalMilestone isOpen={isMilestoneModalOpen} onClose={() => setIsMilestoneModalOpen(false)} onSave={handleSaveMilestone} initialData={editingMilestoneData} defaultChapterWhenNew={editingMilestoneData ? undefined : String(Math.max(0, parseInt(activeNovelData?.readingAnchorChapter ?? activeNovelData?.chaptersRead ?? 0, 10) || 0))} tabConfig={currentTabConfig} onUpdateTemplate={handleUpdateTabTemplate} handleAvatarDrop={handleAvatarDrop} handlePickLocalImage={handlePickLocalImage} dirHandle={currentContextDirHandle} parentTabId={activeTabLon} parentLabel={currentTabConfig?._parentLabel} geminiApiKey={geminiApiKeys} geminiMode={aiMode} entityMap={entityMap} showToast={showToast} autoLinkToastEnabled={autoLinkToastEnabled} />
        <ModalSettings
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          handleConnectFolder={handleConnectFolder}
          dirHandle={dirHandle}
          dirName={dirName}
          onExportBackup={handleExportBackup}
          onExportIndexOnly={handleExportIndexOnly}
          onImportBackup={handleImportBackup}
          geminiApiKeys={geminiApiKeys}
          setGeminiApiKeys={handleSaveApiKeys}
          aiMode={aiMode}
          setAiMode={setAiMode}
          wikiExactMatchOnly={wikiExactMatchOnly}
          setWikiExactMatchOnly={setWikiExactMatchOnly}
          performanceMode={performanceMode}
          setPerformanceMode={setPerformanceMode}
          autoLinkToastEnabled={autoLinkToastEnabled}
          setAutoLinkToastEnabled={setAutoLinkToastEnabled}
        />
        {isCommandPaletteOpen && (
          <AppModalLenhNhanh
            onClose={() => setIsCommandPaletteOpen(false)}
            commandPaletteQuery={commandPaletteQuery}
            setCommandPaletteQuery={setCommandPaletteQuery}
            commandPaletteFiltered={commandPaletteFiltered}
            onSelectCommand={(id) => {
              if (id === 'set') runCommandPaletteAction(() => setIsSettingsOpen(true));
              else if (id === 'deep') runCommandPaletteAction(() => setIsDeepSearchOpen(true));
              else if (id === 'innov') runCommandPaletteAction(() => setIsInNovelSearchOpen(true));
              else if (id === 'hub') runCommandPaletteAction(() => openOverviewHub());
              else if (id === 'home') runCommandPaletteAction(() => handleGoHome());
            }}
            onSelectNovel={(n) => runCommandPaletteAction(() => { void handleSelectNovel(n); })}
          />
        )}

        <ModalConfirm isOpen={confirmDialog.isOpen} title={confirmDialog.title} message={confirmDialog.message} onClose={() => setConfirmDialog({...confirmDialog, isOpen: false})} onConfirm={confirmDialog.onConfirm} />
        <ModalInsertImage isOpen={isInsertImageModalOpen} onClose={() => setIsInsertImageModalOpen(false)} imageForm={imageForm} setImageForm={setImageForm} handleConfirmInsertImage={handleConfirmInsertImage} />
        <ModalAddNovel isOpen={isAddNovelOpen} onClose={() => setIsAddNovelOpen(false)} formData={novelForm} setFormData={setNovelForm} onSave={handleSaveNovelModal} mode={novelModalMode} handlePickLocalImage={(cb) => handlePickCoverImage(cb)} dirHandle={currentContextDirHandle} />
        <ModalDeepSearch isOpen={isDeepSearchOpen} onClose={() => setIsDeepSearchOpen(false)} novelsMetadata={novelsMetadata} performDeepSearch={performDeepSearch} onSelectResult={handleDeepSearchResultSelect} />
        {activeNovelData && <ModalInNovelSearch isOpen={isInNovelSearchOpen} onClose={() => setIsInNovelSearchOpen(false)} novel={activeNovelData} onSelectResult={handleDeepSearchResultSelect} />}
        {xrefAiPanel && (
          <AppModalGoiYNoiTraCuu
            panel={xrefAiPanel}
            onClose={() => setXrefAiPanel(null)}
            findEntitiesByXrefHint={findEntitiesByXrefHint}
            applyXrefSuggestionNewEntity={applyXrefSuggestionNewEntity}
            applyXrefSuggestionMilestone={applyXrefSuggestionMilestone}
            applyXrefSuggestionProfile={applyXrefSuggestionProfile}
            activeNovelData={activeNovelData}
          />
        )}
        {overviewHubOpen && activeNovelData && (
          <AppModalMotCua
            activeNovelData={activeNovelData}
            onClose={() => setOverviewHubOpen(false)}
            overviewHubTab={overviewHubTab}
            setOverviewHubTab={setOverviewHubTab}
            hubCreatePath={hubCreatePath}
            setHubCreatePath={setHubCreatePath}
            hubCreateInput={hubCreateInput}
            setHubCreateInput={setHubCreateInput}
            hubCreateBusy={hubCreateBusy}
            hubCreatePreview={hubCreatePreview}
            setHubCreatePreview={setHubCreatePreview}
            hubUpdateChapter={hubUpdateChapter}
            setHubUpdateChapter={setHubUpdateChapter}
            hubUpdateText={hubUpdateText}
            setHubUpdateText={setHubUpdateText}
            hubUpdatePanel={hubUpdatePanel}
            setHubUpdatePanel={setHubUpdatePanel}
            activeTabs={activeTabs}
            hubRunCreateAi={hubRunCreateAi}
            hubSaveCreateEntity={hubSaveCreateEntity}
            runHubUpdateAi={runHubUpdateAi}
            applyHubUpdateSelected={applyHubUpdateSelected}
            findEntitiesByXrefHint={findEntitiesByXrefHint}
          />
        )}
        <ModalQuickCreate isOpen={!!quickCreateData} onClose={() => setQuickCreateData(null)} quickCreateName={quickCreateData} onConfirm={handleConfirmQuickCreate} activeTabs={activeTabs} />

        {isManageTabsOpen && (
          <AppModalQuanLyTab
            activeNovelData={activeNovelData}
            onClose={() => setIsManageTabsOpen(false)}
            sortedTabs={sortedTabs}
            editingTab={editingTab}
            setEditingTab={setEditingTab}
            handleAddTabLon={handleAddTabLon}
            handleSaveEditLabel={handleSaveEditLabel}
            handleToggleViewType={handleToggleViewType}
            handleDeleteTab={handleDeleteTab}
            handleAddTabNho={handleAddTabNho}
            handleAddTabCon={handleAddTabCon}
            setConfirmDialog={setConfirmDialog}
          />
        )}
      </Suspense>

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
        currentContextDirHandle={currentContextDirHandle}
      />

      <AppPhongChuVaTheme />
    </div>
  );
}
