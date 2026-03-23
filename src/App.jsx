// ==========================================
// TRỤ 4: TRẬN NHÃN TRUNG TÂM
// File: App.jsx
// Vai trò: State toàn cục, điều phối, layout chính, Quản lý Thư mục Truyện
//
// Đã tách (cùng thư mục src/, tên dễ nhớ):
//   appNhatKyVaGoiThe.js     — findEntitiesByHintInNovel (mutate… dùng trong useAppMotCuaCapNhat)
//   AppPhongChuVaTheme.jsx   — font + CSS theme toàn cục
//   AppModalMotCua.jsx       — Một cửa cập nhật (tạo thẻ / nhật ký batch)
//   AppModalQuanLyTab.jsx    — Trận pháp / quản lý tab
//   AppModalLenhNhanh.jsx    — Command palette
//   AppModalGoiYNoiTraCuu.jsx — Gợi ý AI nối tra cứu
//   lib/stripWikiBrackets.js, lib/computeRelatedEntities.js
//   useAppPersistence.js      — sync index + file truyện
//   AppShellOverlays.jsx      — lightbox, toast, spinner
//   lib/appTabGroups, appDashboardStats, buildEntityLinkMap, filterNovelsForLibrary, buildCurrentContextDirHandle
//   useAppPhimTatToanCuc.js     — phím tắt Ctrl+K, /, Escape…
//   lib/tinhThongKeNhanhTruyen, locLenhNhanhCommandPalette, xrefBangDanhMucThucThe, xrefChonMucThuThap
//   useAppMotCuaCapNhat.js, lib/hubBangDanhMucCacMucNhatKy — Hub một cửa + catalog nhật ký
// ==========================================

import React, { Suspense, lazy, useDeferredValue, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Search, BookOpen, Filter, ChevronRight, ChevronLeft, ChevronDown,
  User, Settings, Edit3, Network, Plus, Trash2, Edit2,
  X, Save, Check, Sparkles, Cloud, History, LayoutGrid, Clock,
  AlignLeft, Shield, Link2, Download, Eye, TrendingUp, BarChart2, BookMarked, Users, Layers, Activity,
  GitBranch
} from 'lucide-react';
import {
  apiKey, FALLBACK_IMG, DEFAULT_ENTITY_FIELDS, GENRES, THEMES,
  INITIAL_TABS_CONFIG, MOCK_METADATA, MOCK_NOVEL_DATA,
  DEFAULT_FIELDS_MAP, DEFAULT_FIELDS_BY_PARENT,
  guessFieldsByLabel, isStockTemplate, mergeFieldsTemplate, lockFieldsTemplateIfFirstEntity,
  resolveFieldsTemplate
} from './MasterEngines.js';
import {
  generateId, safeString, getTerms, sortTabsAlphabetically,
  AsyncLocalImage, processPlainTextWithLinks, renderMarkdown,
  getIconComponent, handleToolbarClick,
  extractEntityAttributesWithAI, analyzeTextWithAI, generateReviewWithAI,
  analyzeCrossRefNoteWithAI, truncateForAI, mapGeminiErrorToUserMessage
} from './MasterUtils.jsx';
import {
  MarkdownToolbar, AppHeader, LandingScreen, DashboardScreen,
  ModalEntity, ModalMilestone, ModalQuickCreate, ModalSettings,
  ModalConfirm, ModalInsertImage, ModalAddNovel, ModalDeepSearch, ModalInNovelSearch
} from './MasterComponents.jsx';
import { AppCollectionListContent } from './AppCollectionListContent.jsx';
import { AppGalleryContent } from './AppGalleryContent.jsx';
import { AppCollectionTrackTabs } from './AppCollectionTrackTabs.jsx';
import { AppCollectionEmptyState } from './AppCollectionEmptyState.jsx';
import { AppEntitySummaryBlocks } from './AppEntitySummaryBlocks.jsx';
import { AppEntityDetailNotes } from './AppEntityDetailNotes.jsx';
import { AppEntityTimelinePanel } from './AppEntityTimelinePanel.jsx';
import { AppLibrarySidebar } from './AppLibrarySidebar.jsx';
import { MarkdownPreviewPane } from './MarkdownPreviewPane.jsx';
import {
  searchNovelData,
  dedupeDeepSearchResults,
  countEntitiesInNovel,
  metadataSearchHits,
} from './deepSearchCore.js';
import { computeRelatedEntities } from './lib/computeRelatedEntities.js';
import { findEntitiesByHintInNovel } from './appNhatKyVaGoiThe.js';
import { AppPhongChuVaTheme } from './AppPhongChuVaTheme.jsx';
import { migrateIndex, migrateBackup } from './dataMigration.js';
import { buildTabGroups } from './lib/appTabGroups.js';
import { computeDashboardStats } from './lib/appDashboardStats.js';
import { buildEntityLinkMap } from './lib/buildEntityLinkMap.js';
import { buildCurrentContextDirHandle } from './lib/buildCurrentContextDirHandle.js';
import { useAppPersistence } from './useAppPersistence.js';
import { AppShellOverlays } from './AppShellOverlays.jsx';
import { useAppPhimTatToanCuc } from './useAppPhimTatToanCuc.js';
import { useAppMotCuaCapNhat } from './useAppMotCuaCapNhat.js';
import { computeNovelQuickStats } from './lib/tinhThongKeNhanhTruyen.js';
import { buildCommandPaletteFiltered } from './lib/locLenhNhanhCommandPalette.js';
import { buildXrefEntityCatalogText } from './lib/xrefBangDanhMucThucThe.js';
import { resolveXrefTargetCollectionTab } from './lib/xrefChonMucThuThap.js';

const AdvancedFieldSelect = React.memo(function AdvancedFieldSelect({
  value,
  onChange,
  options,
  placeholder = 'Chọn',
  active = false,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selected = options.find((opt) => opt.value === value);
  useEffect(() => {
    if (!open) return undefined;
    const handleOutside = (event) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target)) setOpen(false);
    };
    const handleEsc = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('touchstart', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('touchstart', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [open]);
  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full border rounded-xl py-2 pl-3 pr-8 text-xs font-serif outline-none cursor-pointer transition-colors text-left truncate ${
          active
            ? 'bg-amber-900/30 border-amber-700/50 text-amber-100'
            : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700'
        }`}
      >
        {selected?.label || placeholder}
        <ChevronDown size={12} className={`absolute right-3 top-1/2 -translate-y-1/2 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-40 mt-1 w-full max-h-64 overflow-auto rounded-xl border border-slate-700 bg-slate-950 shadow-2xl custom-scrollbar animate-fade-in origin-top">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs font-serif transition-colors ${
                opt.value === value
                  ? 'bg-amber-700/30 text-amber-100'
                  : 'text-slate-200 hover:bg-slate-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

const AppModalMotCua = lazy(() => import('./AppModalMotCua.jsx').then((m) => ({ default: m.AppModalMotCua })));
const AppModalQuanLyTab = lazy(() => import('./AppModalQuanLyTab.jsx').then((m) => ({ default: m.AppModalQuanLyTab })));
const AppModalLenhNhanh = lazy(() => import('./AppModalLenhNhanh.jsx').then((m) => ({ default: m.AppModalLenhNhanh })));
const AppModalGoiYNoiTraCuu = lazy(() => import('./AppModalGoiYNoiTraCuu.jsx').then((m) => ({ default: m.AppModalGoiYNoiTraCuu })));

export default function App() {
  const [novelsMetadata, setNovelsMetadata] = useState(MOCK_METADATA);
  const [activeNovelData, setActiveNovelData] = useState(null); 

  const [globalTabsConfig, setGlobalTabsConfig] = useState(INITIAL_TABS_CONFIG);
  
  const [menu1Visible, setMenu1Visible] = useState(false);
  const [hoveredNovelId, setHoveredNovelId] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const hoverTooltipRafRef = useRef(null);
  const [menu2Expanded, setMenu2Expanded] = useState(true);
  const [collapsedTabGroups, setCollapsedTabGroups] = useState(() => new Set());
  const [sidebarGrouped, setSidebarGrouped] = useState(true);
  const lastSyncedActiveTabRef = useRef(null);
  const [activeTabLon, setActiveTabLon] = useState('tong-quan');
  const [activeTabNho, setActiveTabNho] = useState(null);
  const [activeTabCon, setActiveTabCon] = useState(null);
  
  const [selectedEntityId, setSelectedEntityId] = useState(null);
  const [entitySearch, setEntitySearch] = useState('');
  const deferredEntitySearch = useDeferredValue(entitySearch);
  const [entityFilterField, setEntityFilterField] = useState('none'); // none | field_id
  const [entityFilterValue, setEntityFilterValue] = useState('');
  const deferredEntityFilterValue = useDeferredValue(entityFilterValue);
  const [entitySortMode, setEntitySortMode] = useState('newest');
  const [entityGroupBy, setEntityGroupBy] = useState('none'); // none | field_id
  const [showEntityAdvanced, setShowEntityAdvanced] = useState(false);
  const entityAdvancedRef = useRef(null);
  const [entityPage, setEntityPage] = useState(1);
  const [groupVisibleCount, setGroupVisibleCount] = useState({});
  const ENTITY_PAGE_SIZE = 24; 
  
  const [collectionSubTab, setCollectionSubTab] = useState('list'); 
  const [galleryVisiblePage, setGalleryVisiblePage] = useState(1);
  const [navHistory, setNavHistory] = useState([]);
  const [expandedRelations, setExpandedRelations] = useState(false);
  
  const [selectedMilestoneId, setSelectedMilestoneId] = useState(null);
  const [editingMilestoneData, setEditingMilestoneData] = useState(null);

  const [isEntityEditing, setIsEntityEditing] = useState(false);
  const [isSplitPreview, setIsSplitPreview] = useState(false);
  const [recentlyMergedFields, setRecentlyMergedFields] = useState(new Set()); // track field vừa merge
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
  
  const [isAddNovelOpen, setIsAddNovelOpen] = useState(false);
  const [novelModalMode, setNovelModalMode] = useState("create");
  
  // BẢO VỆ CHỐNG CRASH CHO FORM
  const [novelForm, setNovelForm] = useState({ title: '', author: '', genres: (GENRES && GENRES.length > 0) ? [GENRES[0]] : [], theme: 'theme-tien-hiep', cover: '', status: 'Đang đọc', chaptersTotal: '' });
  
  const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);
  const [editingEntityData, setEditingEntityData] = useState(null);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [quickCreateData, setQuickCreateData] = useState(null); 
  
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [overviewForm, setOverviewForm] = useState(null);
  
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredLibrarySearch = useDeferredValue(searchQuery);
  const sidebarListRef = useRef(null);
  const sidebarScrollRafRef = useRef(null);
  const [sidebarScrollTop, setSidebarScrollTop] = useState(0);
  const [sidebarViewportHeight, setSidebarViewportHeight] = useState(0);
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const raw = localStorage.getItem('tangthu_lib_search_hist');
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  });
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
  const librarySearchInputRef = useRef(null);
  const commandPaletteOpenRef = useRef(false);
  commandPaletteOpenRef.current = isCommandPaletteOpen;
  
  const [dirHandle, setDirHandle] = useState(null);
  const [activeNovelDirHandle, setActiveNovelDirHandle] = useState(null);
  
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimerRef = useRef(null);
  /** options: { undoLabel, onUndo } — hiện nút hoàn tác, toast lâu hơn */
  const showToast = useCallback((msg, type = 'success', options = null) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    const hasUndo = options && typeof options.onUndo === 'function';
    setToastMessage({
      msg,
      type,
      undoLabel: hasUndo ? (options.undoLabel || 'Hoàn tác') : undefined,
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
      if (hoverTooltipRafRef.current) cancelAnimationFrame(hoverTooltipRafRef.current);
      if (sidebarScrollRafRef.current) cancelAnimationFrame(sidebarScrollRafRef.current);
    },
    []
  );

  const [lightboxSrc, setLightboxSrc] = useState(null); // null = đóng, string = URL/local_image
  const [isUploading, setIsUploading] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');
  const [isInsertImageModalOpen, setIsInsertImageModalOpen] = useState(false);
  const [imageForm, setImageForm] = useState({ url: '', alt: '', editorId: 'standard-editor' });
  
  const [editingTab, setEditingTab] = useState(null);
  const [isGenreFilterOpen, setIsGenreFilterOpen] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const SIDEBAR_ITEM_HEIGHT = 78;
  const SIDEBAR_OVERSCAN = 8;

  const [geminiApiKeys, setGeminiApiKeys] = useState(() => {
    try {
      const stored = localStorage.getItem('tangthu_apikeys');
      if (stored) { const arr = JSON.parse(stored); if (Array.isArray(arr) && arr.length > 0) return arr; }
    } catch(e) {}
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

  /** Tổng thực thể / mốc — lưu trong index.json, không preload toàn bộ novel */
  const [novelStatsById, setNovelStatsById] = useState({});
  const [isStatsBackfilling, setIsStatsBackfilling] = useState(false);
  const novelStatsByIdRef = useRef({});
  const novelsMetadataRef = useRef(novelsMetadata);
  const globalTabsConfigRef = useRef(globalTabsConfig);
  const dirHandleRef = useRef(dirHandle);
  const activeNovelDataRef = useRef(null);
  const confirmDeleteEntityRef = useRef(null);

  const { syncIndex, syncNovel, loadNovelData, syncNovelRef } = useAppPersistence({
    novelStatsByIdRef,
    novelsMetadataRef,
    globalTabsConfigRef,
    dirHandleRef,
    setNovelStatsById,
    showToast,
  });

  useEffect(() => {
    novelsMetadataRef.current = novelsMetadata;
    globalTabsConfigRef.current = globalTabsConfig;
    dirHandleRef.current = dirHandle;
  }, [novelsMetadata, globalTabsConfig, dirHandle]);

  useEffect(() => {
    activeNovelDataRef.current = activeNovelData;
  }, [activeNovelData]);

  useEffect(() => {
    novelStatsByIdRef.current = novelStatsById;
  }, [novelStatsById]);

  const dashboardStats = useMemo(
    () => computeDashboardStats(novelsMetadata, novelStatsById),
    [novelsMetadata, novelStatsById]
  );
  const novelMetaById = useMemo(() => {
    const map = new Map();
    (novelsMetadata || []).forEach((n) => map.set(n.id, n));
    return map;
  }, [novelsMetadata]);
  const hoveredNovelData = useMemo(
    () => (hoveredNovelId ? novelMetaById.get(hoveredNovelId) || null : null),
    [hoveredNovelId, novelMetaById]
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

  useEffect(() => {
    const labels = tabGroups.filter(g => g.groupLabel).map(g => g.groupLabel);
    setCollapsedTabGroups(new Set(labels));
    lastSyncedActiveTabRef.current = null;
  }, [activeNovelData?.id]);

  useEffect(() => {
    if (activeTabLon === lastSyncedActiveTabRef.current) return;
    lastSyncedActiveTabRef.current = activeTabLon;
    const grp = tabGroups.find(g => g.tabs.some(t => t.id === activeTabLon));
    if (grp?.groupLabel) {
      setCollapsedTabGroups(prev => {
        const next = new Set(prev);
        next.delete(grp.groupLabel);
        return next;
      });
    }
  }, [activeTabLon, tabGroups]);

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
    const templateFields = currentTabConfig?.fieldsTemplate || DEFAULT_ENTITY_FIELDS;
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
  }, [collectionEntitiesRaw, currentTabConfig]);
  useEffect(() => {
    if (entityGroupBy === 'none') return;
    const valid = entityFilterFields.some((f) => f?.id === entityGroupBy);
    if (!valid) setEntityGroupBy('none');
  }, [entityFilterFields, entityGroupBy]);
  useEffect(() => {
    if (entityFilterField === 'none') return;
    const valid = entityFilterFields.some((f) => f?.id === entityFilterField);
    if (!valid) setEntityFilterField('none');
  }, [entityFilterFields, entityFilterField]);
  const getEntityFieldValue = useCallback((ent, fieldId) => {
    if (!ent || !fieldId) return '';
    if (ent.dynamicData?.[fieldId]) return safeString(ent.dynamicData[fieldId]);
    if (fieldId === 'f_status') return safeString(ent.status || '');
    if (fieldId === 'f_title') return safeString(ent.title || ent.name || '');
    if (fieldId === 'f_desc') return safeString(ent.description || ent.info || '');
    return '';
  }, []);
  const entitySearchIndexById = useMemo(() => {
    const map = new Map();
    collectionEntitiesRaw.forEach((e) => {
      const dynamicPart = e.dynamicData
        ? Object.values(e.dynamicData).map((v) => safeString(v)).filter(Boolean).join(' ')
        : '';
      map.set(
        e.id,
        `${safeString(e.name)} ${safeString(e.title)} ${safeString(e.info)} ${dynamicPart}`.toLowerCase()
      );
    });
    return map;
  }, [collectionEntitiesRaw]);
  const entitiesList = useMemo(() => {
    let list = [...collectionEntitiesRaw];
    if (entityFilterField !== 'none' && deferredEntityFilterValue.trim()) {
      const q = deferredEntityFilterValue.toLowerCase();
      list = list.filter((e) =>
        getEntityFieldValue(e, entityFilterField).toLowerCase().includes(q)
      );
    }
    if (deferredEntitySearch.trim()) {
      const q = deferredEntitySearch.toLowerCase();
      list = list.filter((e) => {
        const haystack = entitySearchIndexById.get(e.id) || '';
        return haystack.includes(q);
      });
    }
    if (entitySortMode === 'name_asc') list.sort((a,b) => a.name.localeCompare(b.name, 'vi'));
    else if (entitySortMode === 'milestones') list.sort((a,b) => (b.milestones?.length || 0) - (a.milestones?.length || 0));
    else if (entitySortMode === 'newest') list.reverse();
    return list;
  }, [collectionEntitiesRaw, entitySearchIndexById, deferredEntitySearch, deferredEntityFilterValue, entityFilterField, entitySortMode, getEntityFieldValue]);
  const pagedEntitiesList = useMemo(
    () => entitiesList.slice((entityPage - 1) * ENTITY_PAGE_SIZE, entityPage * ENTITY_PAGE_SIZE),
    [entitiesList, entityPage]
  );
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
  }, [entitiesList, entityGroupBy, getEntityFieldValue]);
  const isEntityAdvancedActive = entityGroupBy !== 'none' || (entityFilterField !== 'none' && entityFilterValue.trim());
  const entityFilterOptions = useMemo(
    () => [
      { value: 'none', label: 'Không lọc theo trường' },
      ...entityFilterFields.map((f) => ({ value: f.id, label: `Lọc: ${f.label}` })),
    ],
    [entityFilterFields]
  );
  const entityGroupOptions = useMemo(
    () => [
      { value: 'none', label: 'Không nhóm' },
      ...entityFilterFields.map((f) => ({ value: f.id, label: `Nhóm: ${f.label}` })),
    ],
    [entityFilterFields]
  );
  const clearEntityAdvanced = useCallback(() => {
    setEntityGroupBy('none');
    setEntityFilterField('none');
    setEntityFilterValue('');
  }, []);

  const galleryPortraitEntries = useMemo(() => {
    if (!activeNovelData) return [];
    if (currentTabConfig?.viewType !== 'collection-track') return [];
    const cfg = activeNovelData.tabsConfig || globalTabsConfig;
    const out = [];
    (cfg || []).forEach((lon) => {
      (lon.subTabs || []).forEach((nho) => {
        if (nho.viewType !== 'collection-track') return;
        const tabData = activeNovelData.data?.[lon.id]?.[nho.id];
        (tabData?.entities || []).forEach((ent) => {
          if (ent.avatar && String(ent.avatar).trim()) {
            out.push({ ent, lonId: lon.id, nhoId: nho.id, sectionLabel: nho.label });
          }
        });
      });
    });
    return out;
  }, [activeNovelData, globalTabsConfig, currentTabConfig?.viewType]);
  const GALLERY_PAGE_SIZE = 60;
  const visibleGalleryEntries = useMemo(
    () => galleryPortraitEntries.slice(0, galleryVisiblePage * GALLERY_PAGE_SIZE),
    [galleryPortraitEntries, galleryVisiblePage]
  );
  const galleryHasMore = visibleGalleryEntries.length < galleryPortraitEntries.length;

  /** Thực thể có kỷ nguyên trong [neo−12, neo+30] — mọi mục sưu tập */
  const nearChapterEntitiesGlobal = useMemo(() => {
    if (!activeNovelData) return [];
    if (!overviewNeoOpen) return [];
    const anchor = Math.max(0, parseInt(activeNovelData.readingAnchorChapter ?? activeNovelData.chaptersRead ?? 0, 10) || 0);
    const lo = anchor - 12;
    const hi = anchor + 30;
    const cfg = activeNovelData.tabsConfig || globalTabsConfig;
    const seen = new Set();
    const out = [];
    (cfg || []).forEach((lon) => {
      (lon.subTabs || []).forEach((nho) => {
        if (nho.viewType !== 'collection-track') return;
        const tabData = activeNovelData.data?.[lon.id]?.[nho.id];
        (tabData?.entities || []).forEach((ent) => {
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

  const handleOpenEntityFromGallery = useCallback(
    (entry) => {
      const cfg = activeNovelData?.tabsConfig || globalTabsConfig;
      const lon = cfg.find((t) => t.id === entry.lonId);
      const sub = lon?.subTabs?.find((s) => s.id === entry.nhoId);
      if (!lon || !sub || !activeNovelData) return;
      setActiveTabLon(entry.lonId);
      setActiveTabNho(entry.nhoId);
      setActiveTabCon(null);
      setSelectedEntityId(entry.ent.id);
      setCollectionSubTab('detail');
      setIsEditingMode(false);
      setIsEntityEditing(false);
      setEntitySearch('');
    },
    [activeNovelData, globalTabsConfig]
  );

  // Reset page khi filter thay đổi
  useEffect(() => { setEntityPage(1); setGroupVisibleCount({}); }, [entitySearch, entityFilterField, entityFilterValue, entitySortMode, entityGroupBy, activeTabLon, activeTabNho]);
  useEffect(() => { setShowEntityAdvanced(false); }, [activeTabLon, activeTabNho, activeNovelData?.id]);
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
  }, [showEntityAdvanced]);
  useEffect(() => {
    if (collectionSubTab === 'gallery') setGalleryVisiblePage(1);
  }, [collectionSubTab, activeTabLon, activeTabNho, activeNovelData?.id]);
  useEffect(() => {
    const el = sidebarListRef.current;
    if (!el) return;
    const updateHeight = () => setSidebarViewportHeight(el.clientHeight || 0);
    updateHeight();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateHeight);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);
  useEffect(() => {
    const el = sidebarListRef.current;
    if (el) el.scrollTop = 0;
    setSidebarScrollTop(0);
  }, [searchQuery, selectedGenres]);

  /** Luôn resolve từ toàn bộ entities tab — không dùng entitiesList đã lọc theo ô tìm (tránh mất thẻ đang xem). */
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
  }, [activeNovelData, activeTabLon, activeTabNho, currentTabConfig, selectedEntityId]);

  const entityMap = useMemo(() => buildEntityLinkMap(activeNovelData), [activeNovelData]);
  const deferredEntityMap = useDeferredValue(entityMap);
  const shouldBuildGlobalRegex = useMemo(() => {
    if (isSplitPreview) return true;
    if (currentTabConfig?.viewType !== 'collection-track') return true;
    return collectionSubTab === 'detail' || collectionSubTab === 'timeline';
  }, [isSplitPreview, currentTabConfig?.viewType, collectionSubTab]);

  const globalLinkRegex = useMemo(() => {
     if (!shouldBuildGlobalRegex) return null;
     if (!deferredEntityMap || deferredEntityMap.length === 0) return null;
     const sortedNames = deferredEntityMap.map(e => e.name);
     if (sortedNames.length === 0) return null;
     const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
     return new RegExp(`(${sortedNames.map(escapeRegExp).join('|')})`, 'gi');
  }, [deferredEntityMap, shouldBuildGlobalRegex]);

  const [relatedEntities, setRelatedEntities] = useState([]);
  const [isCalculatingNetwork, setIsCalculatingNetwork] = useState(false);
  const handleSidebarNovelHover = useCallback((novelId, el) => {
    setHoveredNovelId(novelId);
    if (!el) return;
    if (hoverTooltipRafRef.current) cancelAnimationFrame(hoverTooltipRafRef.current);
    hoverTooltipRafRef.current = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      setTooltipPos({ x: rect.right + 8, y: Math.min(rect.top, window.innerHeight - 260) });
      hoverTooltipRafRef.current = null;
    });
  }, []);
  const handleSelectNovelRef = useRef(null);

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

  const librarySearchIndex = useMemo(
    () =>
      (novelsMetadata || []).map((n) => {
        let genres = [];
        if (Array.isArray(n.genres)) genres = n.genres;
        else if (typeof n.genres === 'string') genres = [n.genres];
        else if (n.genre) genres = [n.genre];
        return {
          id: n.id,
          text: `${safeString(n.title)} ${safeString(n.author)} ${(n.tags || []).join(' ')}`.toLowerCase(),
          genres,
        };
      }),
    [novelsMetadata]
  );
  const filteredNovelsList = useMemo(() => {
    const q = safeString(deferredLibrarySearch).toLowerCase().trim();
    const selected = selectedGenres || [];
    const byId = new Map((novelsMetadata || []).map((n) => [n.id, n]));
    return librarySearchIndex
      .filter((row) => {
        const matchSearch = !q || row.text.includes(q);
        const matchGenre = selected.length === 0 || selected.some((sg) => row.genres.includes(sg));
        return matchSearch && matchGenre;
      })
      .map((row) => byId.get(row.id))
      .filter(Boolean);
  }, [librarySearchIndex, novelsMetadata, deferredLibrarySearch, selectedGenres]);

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
          } catch(e) {}
       }
    }
  }, []);

  useEffect(() => {
    const timerId = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(timerId);
  }, [searchInput]);

  useEffect(() => {
    try {
      localStorage.setItem('tangthu_wiki_exact', wikiExactMatchOnly ? '1' : '0');
    } catch {}
  }, [wikiExactMatchOnly]);
  useEffect(() => {
    try {
      localStorage.setItem('tangthu_ai_mode', aiMode);
    } catch {}
  }, [aiMode]);
  useEffect(() => {
    try {
      localStorage.setItem('tangthu_perf_mode', performanceMode ? '1' : '0');
    } catch {}
  }, [performanceMode]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) return;
    try {
      const raw = localStorage.getItem('tangthu_lib_search_hist');
      let arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) arr = [];
      arr = [q, ...arr.filter((x) => safeString(x).toLowerCase() !== q.toLowerCase())].slice(0, 12);
      localStorage.setItem('tangthu_lib_search_hist', JSON.stringify(arr));
      setSearchHistory(arr);
    } catch {}
  }, [searchQuery]);

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
      setIsAddingTag(false); setNewTagValue('');
    }
  }, [activeNovelData]); 

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
    [activeNovelData?.tabsConfig, globalTabsConfig, activeTabLon, activeTabNho, activeTabCon, selectedEntityId, collectionSubTab, showToast]
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
    [activeTabLon, activeTabNho, activeTabCon, selectedEntityId, collectionSubTab, showToast]
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
                const d = await loadNovelData(meta, root);
                acc[meta.id] = d ? countEntitiesInNovel(d) : { entities: 0, milestones: 0, byTab: [] };
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
      if (typeof cancelIdleCallback === 'function') try { cancelIdleCallback(idleId); } catch (_) {}
      clearTimeout(idleId);
    };
  }, [novelsMetadata, dirHandle]);

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
        await Promise.all(
          batch.map(async (meta) => {
            if (signal?.aborted) return;
            let d = null;
            if (activeNovelData?.id === meta.id) d = activeNovelData;
            else d = await loadNovelData(meta, dirHandle);
            if (d && typeof d === 'object') {
              searchNovelData({ ...d, id: meta.id, title: d.title || meta.title }, q, res);
            }
          })
        );
        tick();
      }
      return dedupeDeepSearchResults(res);
    },
    [novelsMetadata, activeNovelData, dirHandle, loadNovelData]
  );

  const updateActiveNovelData = useCallback(
    (updateFn) => {
      if (!activeNovelData) return;
      const updatedData = structuredClone(activeNovelData);
      updateFn(updatedData);
      const nextStats = { ...novelStatsByIdRef.current, [updatedData.id]: countEntitiesInNovel(updatedData) };
      novelStatsByIdRef.current = nextStats;
      setNovelStatsById(nextStats);
      setActiveNovelData(updatedData);
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

  const handleNavigate = (dest) => {
     if (dest.type === 'QUICK_CREATE') { setQuickCreateData(dest.name); return; }
     setNavHistory(prev => [...prev, { lonId: activeTabLon, nhoId: activeTabNho, conId: activeTabCon, entityId: selectedEntityId, subTab: collectionSubTab }]);
     setEntitySearch('');
     setRecentlyMergedFields(new Set());
     setActiveTabLon(dest.lonId);
     if (dest.nhoId) setActiveTabNho(dest.nhoId);
     if (dest.conId) setActiveTabCon(dest.conId); else setActiveTabCon(null);
     if (dest.entityId) { setSelectedEntityId(dest.entityId); setCollectionSubTab('detail'); } 
     else { setSelectedEntityId(null); setCollectionSubTab('list'); }
     setIsEditingMode(false); setIsEntityEditing(false); setExpandedRelations(false);
  };

  const handleGoBack = useCallback(() => {
     if (navHistory.length === 0) return;
     const last = navHistory[navHistory.length - 1];
     setNavHistory(prev => prev.slice(0, -1));
     setActiveTabLon(last.lonId); setActiveTabNho(last.nhoId); setActiveTabCon(last.conId);
     setSelectedEntityId(last.entityId); setCollectionSubTab(last.subTab || 'list');
  }, [navHistory]);

  const handleConfirmQuickCreate = (name, path) => {
      const [lonId, nhoId] = path.split('|');
      const newEntityId = generateId('ent');
      updateActiveNovelData(nov => {
          if (!nov.data) nov.data = {}; if (!nov.data[lonId]) nov.data[lonId] = {};
          let tabData = nov.data[lonId][nhoId];
          if (!tabData || typeof tabData === 'string') tabData = { overview: '', entities: [] };
          if (!tabData.entities) tabData.entities = [];
          tabData.entities.push({ id: newEntityId, name: name, avatar: '', rawText: '', dynamicData: {}, info: '', milestones: [] });
          nov.data[lonId][nhoId] = tabData;
          lockFieldsTemplateIfFirstEntity(nov, lonId, nhoId);
      });
      showToast(`Đã ngưng tụ thành công ${name}!`);
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

  const handleConnectFolder = async () => {
    if (window.self !== window.top) {
       setDirHandle("LOCAL_STORAGE"); showToast("Preview: Đã chuyển sang Local Storage.");
       const local = localStorage.getItem('tangthu_index');
       if (local) { try { const p = migrateIndex(JSON.parse(local)); if (p.metadata) setNovelsMetadata(p.metadata); if (p.config) setGlobalTabsConfig(p.config); if (p.novelStats && typeof p.novelStats === 'object') { novelStatsByIdRef.current = p.novelStats; setNovelStatsById(p.novelStats); } } catch(e) {} }
       return;
    }
    try {
      const h = await window.showDirectoryPicker({ mode: 'readwrite' });
      let fileHandle, file, content;
      try {
        fileHandle = await h.getFileHandle('index.json');
        file = await fileHandle.getFile(); content = await file.text();
      } catch (readErr) {
         try {
             const oldHandle = await h.getFileHandle('db.json'); const oldFile = await oldHandle.getFile(); const oldContent = await oldFile.text(); const parsedOld = JSON.parse(oldContent);
             if (parsedOld.novels) {
                 showToast("Đang thực hiện độ kiếp (Migrate) cấu trúc thư mục...");
                 const newMeta = parsedOld.novels.map(n => ({ id: n.id, title: n.title, author: n.author, genres: n.genres || (n.genre ? [n.genre] : []), theme: n.theme || 'theme-tien-hiep', status: n.status, rating: n.rating, tags: n.tags || [], chaptersRead: n.chaptersRead, chaptersTotal: n.chaptersTotal, cover: n.cover, review: n.review }));
                 const novelsDir = await h.getDirectoryHandle('novels', { create: true });
                 for (const n of parsedOld.novels) {
                     const fh = await novelsDir.getFileHandle(`${n.id}.json`, { create: true }); const wr = await fh.createWritable();
                     await wr.write(JSON.stringify(n, null, 2)); await wr.close();
                 }
                 const ih = await h.getFileHandle('index.json', { create: true }); const iw = await ih.createWritable();
                 await iw.write(JSON.stringify({ metadata: newMeta, config: parsedOld.config || globalTabsConfig, novelStats: {} }, null, 2)); await iw.close();
                 setNovelsMetadata(newMeta); if (parsedOld.config) setGlobalTabsConfig(parsedOld.config);
                 setDirHandle(h); setActiveNovelData(null); setActiveNovelDirHandle(null); showToast("Độ kiếp thành công! Cấu trúc mới đã sẵn sàng."); return;
             }
         } catch(e) { setDirHandle(h); setActiveNovelData(null); setActiveNovelDirHandle(null); showToast("Thư mục trống. Đã kết nối Mệnh Bàn!"); return; }
      }
      if (content) {
        try {
          const parsed = JSON.parse(content);
          const index = migrateIndex(parsed);
          if (index.metadata) setNovelsMetadata(index.metadata);
          if (index.config) setGlobalTabsConfig(index.config);
          if (index.novelStats && typeof index.novelStats === 'object') {
            novelStatsByIdRef.current = index.novelStats;
            setNovelStatsById(index.novelStats);
          } else {
            setNovelStatsById({});
            novelStatsByIdRef.current = {};
          }
          setDirHandle(h);
          setActiveNovelData(null);
          setActiveNovelDirHandle(null);
          showToast("Đã tải Mệnh Bàn (Index) thành công!");
        } catch (parseErr) {
          showToast("LỖI CHÍ MẠNG: File index.json bị hỏng cấu trúc.", "error");
        }
      }
    } catch (e) {}
  };

  const handleExportBackup = async () => {
    showToast("Đang gom tụ linh khí, chuẩn bị xuất Mệnh Bàn...");
    try {
      const allData = {
        backupVersion: 2,
        exportedAt: new Date().toISOString(),
        config: globalTabsConfig,
        metadata: novelsMetadata,
        novelStats: { ...novelStatsById },
        novels: {},
      };
      for (const meta of novelsMetadata) {
        const data = await loadNovelData(meta, dirHandle);
        if (data) allData.novels[meta.id] = data;
      }
      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TangThuCac_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Đã xuất backup đầy đủ (index + thống kê + từng truyện).");
    } catch (e) {
      showToast("Lỗi khi xuất backup!", "error");
    }
  };

  /** Chỉ index + thống kê — không đọc từng file truyện (nhanh). */
  const handleExportIndexOnly = () => {
    try {
      const payload = {
        backupVersion: 2,
        indexOnly: true,
        exportedAt: new Date().toISOString(),
        config: globalTabsConfig,
        metadata: novelsMetadata,
        novelStats: { ...novelStatsById },
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TangThuCac_Index_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Đã xuất file index (mệnh bàn + thống kê).");
    } catch (e) {
      showToast("Lỗi xuất index!", "error");
    }
  };

  const handleImportBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportProgress({ stage: 'Đang đọc file...', current: 0, total: 1 });
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setImportProgress({ stage: 'Đang chuẩn hóa dữ liệu...', current: 0, total: 1 });
        const parsed = JSON.parse(event.target.result);
        const backup = migrateBackup(parsed);
        if (backup.metadata && backup.config) {
          setGlobalTabsConfig(backup.config);
          setNovelsMetadata(backup.metadata);
          novelsMetadataRef.current = backup.metadata;
          const stats = backup.novelStats && typeof backup.novelStats === 'object' ? backup.novelStats : {};
          novelStatsByIdRef.current = stats;
          setNovelStatsById(stats);
          setImportProgress({ stage: 'Đang ghi danh mục...', current: 0, total: 1 });
          await syncIndex(backup.metadata, backup.config, dirHandle, stats);
          const novelEntries = backup.novels && typeof backup.novels === 'object' ? Object.entries(backup.novels) : [];
          for (let i = 0; i < novelEntries.length; i++) {
            setImportProgress({ stage: `Đang ghi truyện ${i + 1}/${novelEntries.length}...`, current: i + 1, total: novelEntries.length });
            await syncNovel(novelEntries[i][1], dirHandle);
          }
          setImportProgress(null);
          showToast("Khôi phục thành công! Tải lại trang…");
          setTimeout(() => window.location.reload(), 1200);
        } else {
          setImportProgress(null);
          showToast("File không đúng cấu trúc Tàng Thư Các.", "error");
        }
      } catch (err) {
        setImportProgress(null);
        showToast("Lỗi đọc file backup!", "error");
      }
    };
    reader.onerror = () => { setImportProgress(null); showToast("Lỗi đọc file!", "error"); };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleOpenCreateNovel = () => {
    setNovelForm({ title: '', author: '', genres: (GENRES && GENRES.length > 0) ? [GENRES[0]] : [], theme: 'theme-tien-hiep', cover: '', status: 'Đang đọc', chaptersTotal: '', tabsConfig: undefined });
    setNovelModalMode('create'); setIsAddNovelOpen(true);
  };

  const handleOpenEditNovel = () => {
    if (!activeNovelData) return;
    let nGenres = [];
    if (Array.isArray(activeNovelData.genres)) nGenres = activeNovelData.genres;
    else if (typeof activeNovelData.genres === 'string') nGenres = [activeNovelData.genres];
    else if (activeNovelData.genre) nGenres = [activeNovelData.genre];

    setNovelForm({
      title: activeNovelData.title, author: activeNovelData.author, 
      genres: nGenres, theme: activeNovelData.theme || 'theme-tien-hiep',
      cover: activeNovelData.cover, status: activeNovelData.status, chaptersTotal: activeNovelData.chaptersTotal
    });
    setNovelModalMode('edit'); setIsAddNovelOpen(true);
  };

  const handleSaveNovelModal = async () => {
    if (!novelForm.title.trim()) return;
    if (novelModalMode === 'create') {
      const newId = generateId('novel');
      const safeTitle = novelForm.title.replace(/[\\/:*?"<>|]/g, '').trim() || newId; 
      const folderName = safeTitle;

      const newMeta = {
        id: newId, title: novelForm.title, author: novelForm.author || 'Vô Danh',
        genres: novelForm.genres || [], theme: novelForm.theme || 'theme-tien-hiep',
        tags: [], chaptersRead: 0, chaptersTotal: novelForm.chaptersTotal || '???', status: novelForm.status,
        rating: 0, review: '', ratingOpinion: '', cover: novelForm.cover, folderName: folderName
      };
      
      const tabsToUse = Array.isArray(novelForm.tabsConfig) && novelForm.tabsConfig.length > 0
        ? structuredClone(novelForm.tabsConfig)
        : structuredClone(INITIAL_TABS_CONFIG);
      const newFullData = { ...newMeta, data: {}, tabsConfig: tabsToUse, chapterCrossRefs: [], readingJournal: [] };
      const newMetaList = [newMeta, ...novelsMetadata];
      const nextStats = { ...novelStatsByIdRef.current, [newId]: { entities: 0, milestones: 0, byTab: [] } };
      novelStatsByIdRef.current = nextStats;
      setNovelStatsById(nextStats);
      setNovelsMetadata(newMetaList); setActiveNovelData(newFullData);
      novelsMetadataRef.current = newMetaList;
      setIsAddNovelOpen(false); setMenu1Visible(false); setActiveTabLon('tong-quan'); setActiveTabNho(null); setActiveTabCon(null);
      
      if (dirHandle && dirHandle !== 'LOCAL_STORAGE') {
          try { const nHandle = await dirHandle.getDirectoryHandle(folderName, { create: true }); setActiveNovelDirHandle(nHandle); } catch(e) {}
      }
      await syncIndex(newMetaList, globalTabsConfig, dirHandle, nextStats);
      await syncNovel(newFullData, dirHandle);
      showToast("Khai sinh thư tịch mới thành công!");
    } else {
      updateActiveNovelData(nov => { 
          nov.title = novelForm.title; nov.author = novelForm.author; 
          nov.genres = novelForm.genres; nov.theme = novelForm.theme;
          nov.cover = novelForm.cover; nov.status = novelForm.status; nov.chaptersTotal = novelForm.chaptersTotal; 
      });
      setIsAddNovelOpen(false); showToast("Đã tu bổ thông tin thư tịch!");
    }
  };

  const handleImageDrop = async (e, editorId = 'standard-editor') => {
    e.preventDefault();
    if (!isEditingMode && !isEntityEditing) return;
    if (!dirHandle) { showToast("Vui lòng kết nối Thư Mục trước để lưu ảnh!", "warning"); return; }
    const files = e.dataTransfer.files;
    if (files && files[0] && files[0].type.startsWith('image/')) {
      const file = files[0]; setIsUploading(true);
      if (dirHandle === "LOCAL_STORAGE") {
         const reader = new FileReader();
         reader.onload = (event) => { handleToolbarClick(`\n\n![${file.name}](${event.target.result})\n\n`, '', editorId); setIsUploading(false); showToast("Đã lưu ảnh dạng mã hóa Base64."); };
         reader.readAsDataURL(file); return;
      }
      try {
         const imagesDir = await currentContextDirHandle.getDirectoryHandle('images', { create: true });
         const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
         const imageFileHandle = await imagesDir.getFileHandle(fileName, { create: true });
         const writable = await imageFileHandle.createWritable();
         await writable.write(file); await writable.close();
         handleToolbarClick(`\n\n![${file.name}](local_image:${fileName})\n\n`, '', editorId); showToast("Linh ảnh đã được khảm vào local!");
      } catch (err) { showToast("Thất bại khi lưu ảnh!", "error"); } finally { setIsUploading(false); }
    }
  };

  const handleAvatarDrop = async (e, setAvatarCallback) => {
    e.preventDefault();
    if (!dirHandle) { showToast("Vui lòng kết nối Thư Mục trước để tải ảnh Local!", "warning"); return; }
    const files = e.dataTransfer.files;
    if (files && files[0] && files[0].type.startsWith('image/')) {
      const file = files[0]; setIsUploading(true);
      if (dirHandle === "LOCAL_STORAGE") {
         const reader = new FileReader();
         reader.onload = (event) => { setAvatarCallback(event.target.result); setIsUploading(false); showToast("Đã lưu Avatar dạng Base64."); };
         reader.readAsDataURL(file); return;
      }
      try {
         const imagesDir = await currentContextDirHandle.getDirectoryHandle('images', { create: true });
         const fileName = `avatar-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
         const imageFileHandle = await imagesDir.getFileHandle(fileName, { create: true });
         const writable = await imageFileHandle.createWritable();
         await writable.write(file); await writable.close();
         setAvatarCallback(`local_image:${fileName}`); showToast("Linh ảnh đã được khảm vào local!");
      } catch (err) { showToast("Thất bại khi lưu ảnh!", "error"); } finally { setIsUploading(false); }
    }
  };

  // Ảnh bìa luôn lưu vào ROOT/images/ vì cần hiển thị ngoài context truyện (sidebar, dashboard)
  const handlePickCoverImage = async (setAvatarCallback, novelTitle) => {
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{ description: 'Images', accept: { 'image/*': ['.png', '.gif', '.jpeg', '.jpg', '.webp'] } }],
        multiple: false
      });
      const file = await fileHandle.getFile();
      setIsUploading(true);

      if (!dirHandle || dirHandle === 'LOCAL_STORAGE') {
        const reader = new FileReader();
        reader.onload = (e) => { setAvatarCallback(e.target.result); setIsUploading(false); };
        reader.readAsDataURL(file);
        return;
      }

      // Lưu vào root/images/ để luôn accessible
      const imagesDir = await dirHandle.getDirectoryHandle('images', { create: true });
      const ext = file.name.split('.').pop().replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
      const fileName = `cover-${Date.now()}.${ext}`;
      const newFileHandle = await imagesDir.getFileHandle(fileName, { create: true });
      const writable = await newFileHandle.createWritable();
      await writable.write(file);
      await writable.close();
      setAvatarCallback(`local_image:${fileName}`);
      showToast('Ảnh bìa đã được lưu!');
    } catch(err) {
      if (err.name !== 'AbortError') showToast('Hủy chọn ảnh.', 'warning');
    } finally { setIsUploading(false); }
  };

  const handlePickLocalImage = async (setAvatarCallback, editorId = null, filePrefix = 'img') => {
    try {
        const [fileHandle] = await window.showOpenFilePicker({ types: [{ description: 'Images', accept: { 'image/*': ['.png', '.gif', '.jpeg', '.jpg', '.webp'] } }], multiple: false });
        const file = await fileHandle.getFile(); setIsUploading(true);
        if (!dirHandle || dirHandle === "LOCAL_STORAGE") {
             const reader = new FileReader();
             reader.onload = (event) => {
                if (editorId) handleToolbarClick(`\n\n![${file.name}](${event.target.result})\n\n`, '', editorId);
                else if (setAvatarCallback) setAvatarCallback(event.target.result);
                setIsUploading(false); showToast("Đã lưu ảnh dạng mã hóa Base64.");
             };
             reader.readAsDataURL(file); return;
        }
        const imagesDir = await currentContextDirHandle.getDirectoryHandle('images', { create: true });
        const ext = file.name.split('.').pop().replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
        const fileName = `${filePrefix}-${Date.now()}.${ext}`;
        const newFileHandle = await imagesDir.getFileHandle(fileName, { create: true });
        const writable = await newFileHandle.createWritable(); await writable.write(file); await writable.close();
        if (editorId) handleToolbarClick(`\n\n![${file.name}](local_image:${fileName})\n\n`, '', editorId);
        else if (setAvatarCallback) setAvatarCallback(`local_image:${fileName}`);
        showToast("Linh ảnh đã được khảm vào Tàng Thư Các!");
    } catch (err) { if (err.name !== 'AbortError') showToast("Hủy chọn ảnh."); } finally { setIsUploading(false); }
  };

  const handleConfirmInsertImage = () => {
    if (!imageForm.url.trim()) return;
    let finalUrl = imageForm.url.trim();
    const srcMatch = finalUrl.match(/src=["'](.*?)["']/);
    if (srcMatch && srcMatch[1]) finalUrl = srcMatch[1].replace(/&amp;/g, '&');
    if (/^javascript:/i.test(finalUrl)) { showToast('URL không hợp lệ!', 'error'); return; }
    handleToolbarClick(`\n\n![${imageForm.alt.trim() || 'Minh họa'}](${finalUrl})\n\n`, '', imageForm.editorId);
    setIsInsertImageModalOpen(false); setImageForm({ url: '', alt: '', editorId: 'standard-editor' });
  };

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
    setIsEditingMode(false); setIsSplitPreview(false); showToast("Khắc ấn đại đạo thành công!");
  };

  const handleOpenCreateEntity = () => { setEditingEntityData(null); setIsEntityModalOpen(true); };
  const handleOpenEditEntity = () => { if(selectedEntity) { setEditingEntityData({...selectedEntity}); setIsEntityModalOpen(true); } };

  const handleSaveEntity = (formData, dynamicData) => {
    const prev = activeNovelData ? structuredClone(activeNovelData) : null;
    updateActiveNovelData(nov => {
       if (!nov.data) nov.data = {}; if (!nov.data[activeTabLon]) nov.data[activeTabLon] = {};
       let tabData = nov.data[activeTabLon][activeTabNho || 'default'];
       if (typeof tabData === 'string' || !tabData) { tabData = { overview: typeof tabData === 'string' ? tabData : '', entities: [] }; }
       if (!tabData.entities) tabData.entities = [];
       if (formData.id) { 
          const idx = tabData.entities.findIndex(e => e.id === formData.id);
          if (idx > -1) { tabData.entities[idx] = { ...tabData.entities[idx], name: formData.name, avatar: formData.avatar, rawText: formData.rawText, dynamicData: dynamicData }; }
       } else {
          tabData.entities.push({ id: generateId('ent'), name: formData.name, avatar: formData.avatar, rawText: formData.rawText, dynamicData: dynamicData, info: '', milestones: [] });
          lockFieldsTemplateIfFirstEntity(nov, activeTabLon, activeTabNho || 'default');
       }
       nov.data[activeTabLon][activeTabNho || 'default'] = tabData;
    });
    showToast(formData.id ? "Đã tu bổ lại Thực Thể!" : "Đã ngưng tụ Thực Thể mới!", "success", prev ? {
      undoLabel: "Hoàn tác", onUndo: () => {
        setActiveNovelData(structuredClone(prev));
        void (syncNovelRef.current && syncNovelRef.current(prev, dirHandleRef.current));
      }
    } : null);
  };

  const handleUpdateEntityInfo = (content) => {
    updateActiveNovelData(nov => {
       if (!nov.data?.[activeTabLon]) return;
       const tabData = nov.data[activeTabLon][activeTabNho || 'default'];
       const ent = tabData?.entities?.find(e => e.id === selectedEntityId);
       if(ent) ent.info = content;
    });
    showToast("Ghi chép hồ sơ thành công!");
  };

  const handleSaveMilestone = (formData, snapshot) => {
    const prev = activeNovelData ? structuredClone(activeNovelData) : null;
    updateActiveNovelData(nov => {
       if (!nov.data?.[activeTabLon]) return;
       const tabData = nov.data[activeTabLon][activeTabNho || 'default'];
       const ent = tabData?.entities?.find(e => e.id === selectedEntityId);
       if(ent) {
         if (!ent.milestones) ent.milestones = [];
         if (formData.id) {
             const idx = ent.milestones.findIndex(m => m.id === formData.id);
             if (idx > -1) { ent.milestones[idx] = { ...ent.milestones[idx], chapter: parseInt(formData.chapter, 10), event: formData.event, snapshot: snapshot }; }
         } else { ent.milestones.push({ id: generateId('ms'), chapter: parseInt(formData.chapter, 10), event: formData.event, snapshot: snapshot }); }
         ent.milestones.sort((a,b) => a.chapter - b.chapter);
       }
    });
    showToast(formData.id ? "Đã tu bổ Kỷ Nguyên!" : "Đã khắc ghi Kỷ Nguyên mới!", "success", prev ? {
      undoLabel: "Hoàn tác", onUndo: () => {
        setActiveNovelData(structuredClone(prev));
        void (syncNovelRef.current && syncNovelRef.current(prev, dirHandleRef.current));
      }
    } : null);
  };

  const handleDeleteMilestone = (msId) => {
    setConfirmDialog({
       isOpen: true, title: 'Xóa Kỷ Nguyên', message: 'Xóa mốc thời gian này? Có thể hoàn tác ngay sau khi xóa.',
       onConfirm: () => {
          const prev = activeNovelData ? structuredClone(activeNovelData) : null;
          updateActiveNovelData(nov => {
             if (!nov.data?.[activeTabLon]) return;
             const tabData = nov.data[activeTabLon][activeTabNho || 'default'];
             const ent = tabData?.entities?.find(e => e.id === selectedEntityId);
             if (ent && ent.milestones) ent.milestones = ent.milestones.filter(m => m.id !== msId);
          });
          setSelectedMilestoneId(null);
          if (prev) {
            showToast('Đã xóa mốc.', 'success', {
              onUndo: () => {
                setActiveNovelData(structuredClone(prev));
                void (syncNovelRef.current && syncNovelRef.current(prev, dirHandleRef.current));
              },
            });
          }
       }
    });
  };

  const handleDeleteEntity = (id) => {
    const entityIdToDelete = id;
    const prevSelectedId = selectedEntityId;
    confirmDeleteEntityRef.current = () => {
      const data = activeNovelDataRef.current;
      if (!data?.data) return;
      const prev = structuredClone(data);
      const updated = structuredClone(data);
      let removed = false;
      for (const lonId of Object.keys(updated.data || {})) {
        const lonData = updated.data[lonId];
        if (!lonData || typeof lonData !== 'object') continue;
        for (const nhoId of Object.keys(lonData)) {
          const tabData = lonData[nhoId];
          if (!tabData?.entities) continue;
          const idx = tabData.entities.findIndex(e => e.id === entityIdToDelete);
          if (idx >= 0) {
            tabData.entities.splice(idx, 1);
            removed = true;
            break;
          }
        }
        if (removed) break;
      }
      if (removed) {
        const nextStats = { ...novelStatsByIdRef.current, [updated.id]: countEntitiesInNovel(updated) };
        novelStatsByIdRef.current = nextStats;
        setNovelStatsById(nextStats);
        setActiveNovelData(updated);
        syncNovelRef.current?.(updated, dirHandleRef.current);
        if (prevSelectedId === entityIdToDelete) setSelectedEntityId(null);
        showToast('Đã xóa thẻ.', 'success', {
          onUndo: () => {
            setActiveNovelData(prev);
            void (syncNovelRef.current && syncNovelRef.current(prev, dirHandleRef.current));
          },
        });
      }
      confirmDeleteEntityRef.current = null;
    };
    setConfirmDialog({
      isOpen: true,
      title: 'Hủy Diệt Thực Thể',
      message: 'Xóa vĩnh viễn hồ sơ này khỏi Tàng Thư Các?',
      onConfirm: () => {
        if (typeof confirmDeleteEntityRef.current === 'function') {
          confirmDeleteEntityRef.current();
        }
      },
    });
  };

  const onEntityCardSelect = useCallback((ent) => {
    handleNavigate({ lonId: activeTabLon, nhoId: activeTabNho, entityId: ent.id });
  }, [activeTabLon, activeTabNho]);
  const onEntityCardDelete = useCallback((ent) => handleDeleteEntity(ent.id), []);
  const onEntityCardAddMilestone = useCallback((ent) => {
    setSelectedEntityId(ent.id);
    setCollectionSubTab('timeline');
    setTimeout(() => { setEditingMilestoneData(null); setIsMilestoneModalOpen(true); }, 100);
  }, []);

  const handleAIExtractSuccess = (existingData, newFieldsArr) => {
    updateActiveNovelData(nov => {
       if (!nov.data?.[activeTabLon]) return;
       const tabData = nov.data[activeTabLon][activeTabNho || 'default'];
       if (!tabData?.entities) return;
       const ent = tabData.entities.find(e => e.id === selectedEntityId);
       if (!ent) return;
       if (!ent.dynamicData) ent.dynamicData = {};
       if (existingData) { Object.entries(existingData).forEach(([k, v]) => { ent.dynamicData[k] = safeString(v); }); }
       if (newFieldsArr && newFieldsArr.length > 0) {
          const lon = (nov.tabsConfig || globalTabsConfig || []).find(t => t.id === activeTabLon);
          const nho = lon?.subTabs?.find(s => s.id === activeTabNho);
          if (nho) {
             if (!nho.fieldsTemplate) nho.fieldsTemplate = [];
             newFieldsArr.forEach(nf => {
                if (nf.label && nf.value) {
                   const newId = generateId('f');
                   nho.fieldsTemplate.push({ id: newId, label: safeString(nf.label) });
                   ent.dynamicData[newId] = safeString(nf.value);
                }
             });
          }
       }
    });
    showToast("Thần thức AI đã lọc và tự cập nhật thẻ bài thành công!");
  };

  // === MERGE SNAPSHOT → HỒ SƠ ===
  const handleMergeSnapshotToProfile = (snapshot) => {
    if (!snapshot?.dynamicData && !snapshot?.avatar) {
      showToast('Mốc này chưa có snapshot để áp dụng!', 'warning');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: 'Áp Dụng Vào Hồ Sơ',
      message: 'Merge thông tin từ mốc này vào Nền Tảng Căn Cơ? Chỉ các trường <b>có giá trị</b> trong snapshot mới được cập nhật, các trường còn lại giữ nguyên.',
      onConfirm: () => {
        const prev = activeNovelData ? structuredClone(activeNovelData) : null;
        // Tính mergedKeys TRƯỚC khi updateActiveNovelData (tránh stale closure)
        const mergedKeys = new Set();
        if (snapshot.dynamicData) {
          Object.entries(snapshot.dynamicData).forEach(([key, val]) => {
            if (val && val.toString().trim()) mergedKeys.add(key);
          });
        }
        if (snapshot.avatar) mergedKeys.add('avatar');

        updateActiveNovelData(nov => {
          const tabData = nov.data[activeTabLon]?.[activeTabNho || 'default'];
          const ent = tabData?.entities?.find(e => e.id === selectedEntityId);
          if (!ent) return;
          if (!ent.dynamicData) ent.dynamicData = {};
          if (snapshot.dynamicData) {
            Object.entries(snapshot.dynamicData).forEach(([key, val]) => {
              if (val && val.toString().trim()) ent.dynamicData[key] = val;
            });
          }
          if (snapshot.avatar) ent.avatar = snapshot.avatar;
        });

        // Set merged fields và chuyển sang tab Hồ Sơ để thấy pill
        setRecentlyMergedFields(mergedKeys);
        setCollectionSubTab('detail'); // Chuyển về tab Hồ Sơ
        setTimeout(() => setRecentlyMergedFields(new Set()), 15000);
        showToast('Đã áp dụng snapshot vào Hồ Sơ.', 'success', {
          onUndo: prev
            ? () => {
                setRecentlyMergedFields(new Set());
                setActiveNovelData(structuredClone(prev));
                void (syncNovelRef.current && syncNovelRef.current(prev, dirHandleRef.current));
              }
            : undefined,
        });
      }
    });
  };

  const handleExportEntityPDF = (entity, tabConfig) => {
    if (!entity) return;
    const fields = tabConfig?.fieldsTemplate || [
      { id: 'f_status', label: 'Cảnh giới / Trạng thái' },
      { id: 'f_title', label: 'Danh hiệu / Phân loại' },
      { id: 'f_desc', label: 'Mô tả đặc trưng' }
    ];
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
      '<div class="milestone"><div class="ms-chapter">Chương ' + escHtml(ms.chapter) + '</div><div class="ms-event">' + escHtml(ms.event || '') + '</div></div>'
    ).join('');

    const infoHTML = escHtml(entity.info || '').replace(/\n/g, '<br/>');
    const novelTitle = activeNovelData?.title || '';
    const tabLabel = currentTabConfig?.label || '';
    const firstFieldVal = fields[0] ? getVal(fields[0].id) : '';

    const printWindow = window.open('', '_blank');
    if (!printWindow) { showToast('Trình duyệt chặn popup. Vui lòng cho phép popup!', 'warning'); return; }

    const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Hồ Sơ: ' + escHtml(entity.name || '') + '</title>'
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
      + '<div class="no-print"><span>📄 Xem trước — Nhấn In để lưu PDF</span>'
      + '<button class="print-btn" onclick="window.print()">🖨 In / Lưu PDF</button></div>'
      + '<div class="header">'
      + '<div class="novel-name">📚 ' + escHtml(novelTitle) + (tabLabel ? ' · ' + escHtml(tabLabel) : '') + '</div>'
      + '<div class="entity-name">' + escHtml(entity.name || 'Vô Danh') + '</div>'
      + (firstFieldVal ? '<div style="color:#64748b;font-size:12px;margin-top:6px;text-transform:uppercase;letter-spacing:.1em">' + escHtml(firstFieldVal) + '</div>' : '')
      + '</div>'
      + (fieldsHTML ? '<div class="section"><div class="section-title">Căn Cơ & Thuộc Tính</div>' + fieldsHTML + '</div>' : '')
      + (infoHTML ? '<div class="section"><div class="section-title">Ghi Chép Chi Tiết</div><div class="info-text">' + infoHTML + '</div></div>' : '')
      + (milestonesHTML ? '<div class="section"><div class="section-title">Dòng Thời Gian (' + (entity.milestones||[]).length + ' mốc)</div>' + milestonesHTML + '</div>' : '')
      + '<div class="footer">Xuất từ Tàng Thư Các · ' + new Date().toLocaleDateString('vi-VN') + '</div>'
      + '</body></html>';

    printWindow.document.write(html);
    printWindow.document.close();
  };

    const findDestination = (partName) => {
     if (!activeNovelData || !partName || partName.length < 2) return null;
     const query = partName.toLowerCase().trim();
     return entityMap.find(e => e.name.toLowerCase() === query)?.dest || null;
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
      const handleKeyDown = (e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); document.dispatchEvent(new CustomEvent('app-save-shortcut')); }
          if (e.key === 'Escape') {
            setLightboxSrc(null);
            if (isEditingMode) setIsEditingMode(false);
            if (isEntityEditing) setIsEntityEditing(false);
          }
      };
      window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditingMode, isEntityEditing]);

  useEffect(() => {
      const handleSave = () => { if (isEditingMode) document.getElementById('save-standard-btn')?.click(); if (isEntityEditing) document.getElementById('save-entity-btn')?.click(); };
      document.addEventListener('app-save-shortcut', handleSave); return () => document.removeEventListener('app-save-shortcut', handleSave);
  }, [isEditingMode, isEntityEditing]);

  useEffect(() => {
      const timer = setTimeout(() => {
          const mainScroller = document.getElementById('main-scroll-container'); const colScroller = document.getElementById('collection-scroll-container');
          if (mainScroller) mainScroller.scrollTo({ top: 0, behavior: 'smooth' }); if (colScroller) colScroller.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
      return () => clearTimeout(timer);
  }, [activeTabLon, activeTabNho, activeTabCon, selectedEntityId, collectionSubTab]);

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
  }, []);

  // Migration: gộp fieldsTemplate — thêm trường mới, giữ nhãn tùy chỉnh của người dùng
  const migrateTabsFieldTemplates = (novelData) => {
    if (!novelData?.tabsConfig) return novelData;
    let changed = false;
    const tabs = structuredClone(novelData.tabsConfig);
    tabs.forEach(lon => {
      (lon.subTabs || []).forEach(nho => {
        if (nho.viewType !== 'collection-track') return;
        const target =
          DEFAULT_FIELDS_MAP[nho.id] ||
          DEFAULT_FIELDS_BY_PARENT[lon.id] ||
          guessFieldsByLabel(nho.label || '') ||
          guessFieldsByLabel(lon.label || '');
        if (!target) return;
        const cur = nho.fieldsTemplate;
        const needsUpgrade = !cur || cur.length === 0 ||
          (cur.every(f => /^f_/.test(f.id)) && cur.length <= target.length);
        if (needsUpgrade) {
          nho.fieldsTemplate = mergeFieldsTemplate(cur, target);
          changed = true;
        }
      });
    });
    return changed ? { ...novelData, tabsConfig: tabs } : novelData;
  };

  const handleSelectNovel = async (meta, tabAt) => {
    setMenu1Visible(false);
    setSelectedEntityId(null);
    setNavHistory([]);
    setActiveTabLon(tabAt?.lonId || 'tong-quan');
    setActiveTabNho(tabAt?.nhoId || null);
    setActiveTabCon(null);
    setCollectionSubTab(tabAt ? 'list' : 'list');
    setIsEditingMode(false);
    setIsEntityEditing(false);
    setIsUploading(true);

    let novelDir = null;
    if (dirHandle && dirHandle !== 'LOCAL_STORAGE') {
      try {
        const folderName = meta.folderName || meta.title.replace(/[\\/:*?"<>|]/g, '').trim() || meta.id;
        novelDir = await dirHandle.getDirectoryHandle(folderName);
      } catch (e) {}
    }
    setActiveNovelDirHandle(novelDir);

    const data = await loadNovelData(meta, dirHandle);
    if (data) {
      if (!data.tabsConfig) data.tabsConfig = structuredClone(globalTabsConfig);
      const migrated = migrateTabsFieldTemplates(data);
      setActiveNovelData(migrated);
      const s = countEntitiesInNovel(migrated);
      const prevS = novelStatsByIdRef.current[migrated.id];
      const statsChanged = !prevS || prevS.entities !== s.entities || prevS.milestones !== s.milestones;
      const nextStats = { ...novelStatsByIdRef.current, [migrated.id]: s };
      novelStatsByIdRef.current = nextStats;
      setNovelStatsById(nextStats);
      if (statsChanged && dirHandle) {
        void syncIndex(novelsMetadataRef.current, globalTabsConfigRef.current, dirHandle, nextStats);
      }
      if (migrated !== data) syncNovel(migrated, dirHandle);
      if (tabAt?.lonId) {
        setActiveTabLon(tabAt.lonId);
        setActiveTabNho(tabAt.nhoId || null);
        setCollectionSubTab('list');
      }
    } else {
      const newData = { ...meta, data: {}, tabsConfig: structuredClone(globalTabsConfig) };
      setActiveNovelData(newData);
    }
    setIsUploading(false);
  };


  const toggleGenre = (genre) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const handleAddTag = () => {
    if (!newTagValue.trim() || !activeNovelData) return;
    const nextTag = newTagValue.trim();
    updateActiveNovelData(nov => {
      if (!nov.tags) nov.tags = [];
      if (!nov.tags.includes(nextTag)) nov.tags.push(nextTag);
    });
    setNewTagValue('');
    setIsAddingTag(false);
  };

  const handleRemoveTag = (tag) => {
    updateActiveNovelData(nov => {
      nov.tags = (nov.tags || []).filter(t => t !== tag);
    });
  };

  const handleDeleteNovel = async (id) => {
    const meta = novelsMetadata.find(m => m.id === id);
    const folderName = meta ? (meta.folderName || (meta.title || '').replace(/[\\/:*?"<>|]/g, '').trim() || meta.id) : null;
    const newMetaList = novelsMetadata.filter(m => m.id !== id);
    const nextStats = { ...novelStatsByIdRef.current };
    delete nextStats[id];
    novelStatsByIdRef.current = nextStats;
    setNovelStatsById(nextStats);
    setNovelsMetadata(newMetaList);
    novelsMetadataRef.current = newMetaList;
    syncIndex(newMetaList, globalTabsConfig, dirHandle, nextStats);
    if (dirHandle === 'LOCAL_STORAGE') {
      localStorage.removeItem(`tangthu_novel_${id}`);
    } else if (dirHandle && folderName) {
      try {
        await dirHandle.removeEntry(folderName, { recursive: true });
      } catch (e) {
        console.warn('[TTC] Không xóa được thư mục truyện:', folderName, e);
        setTimeout(() => showToast(`Đã xóa khỏi sổ nhưng không xóa được thư mục "${folderName}".`, 'warning'), 0);
      }
    }
    setActiveNovelData(null);
    setActiveNovelDirHandle(null);
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    showToast('Đã hủy diệt thư tịch!');
  };

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
    lon.subTabs.push({
      id: generateId('sub'),
      label: 'Chương Mục Mới',
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
    nho.tabCon.push({ id: generateId('con'), label: 'Tiểu Mục Mới' });
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
        // Tự sinh trường phù hợp khi đổi tên — chỉ áp nếu template chưa tùy chỉnh
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
      }
    }
    setTabsConfig(current);
  };

  const handleSelectTabLon = useCallback((tabId) => {
    if (activeTabLon !== tabId) {
      if (isEditingMode || isEntityEditing) {
        setConfirmDialog({ isOpen: true, title: 'Chưa Lưu Thay Đổi',
          message: 'Bạn có thay đổi chưa được lưu. Rời đi sẽ mất nội dung đang soạn. Tiếp tục?',
          onConfirm: () => {
            setConfirmDialog(prev => ({...prev, isOpen: false}));
            setIsEditingMode(false); setIsEntityEditing(false);
            setActiveTabLon(tabId); setActiveTabNho(null); setActiveTabCon(null);
            setSelectedEntityId(null); setEntitySearch(''); setMenu2Expanded(true);
          }
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
  }, [activeTabLon, isEditingMode, isEntityEditing]);

  const handleSelectTabNho = useCallback((e, lonId, sub) => {
    e.stopPropagation();
    setActiveTabLon(lonId);
    setActiveTabNho(sub.id);
    setActiveTabCon(null);
    setSelectedEntityId(null);
    setCollectionSubTab('list');
    setIsEditingMode(false);
    setIsEntityEditing(false);
    setEntitySearch('');
  }, []);

  // ==========================================

  const navFnRef = useRef(null);
  navFnRef.current = handleNavigate;

  // Lưu lại fieldsTemplate khi cần gộp — thêm trường mới, giữ nhãn tùy chỉnh
  useEffect(() => {
    if (!activeNovelData || !activeTabNho || !currentTabConfig) return;
    if (currentTabConfig.viewType !== 'collection-track') return;
    const targetTemplate = DEFAULT_FIELDS_MAP[activeTabNho] || DEFAULT_FIELDS_BY_PARENT[activeTabLon];
    if (!targetTemplate) return;
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
  }, [activeTabLon, activeTabNho, activeNovelData?.id]);

  const pendingNavRef = useRef(null);
  useEffect(() => {
    if (pendingNavRef.current && activeNovelData) {
      const dest = pendingNavRef.current;
      pendingNavRef.current = null;
      handleNavigate(dest);
    }
  }, [activeNovelData]);

  const memoizedEntityInfo = useMemo(() => {
      if (!selectedEntity || collectionSubTab !== 'detail' || isEntityEditing) return null;
      return <div className="font-serif prose prose-invert max-w-none animate-fade-in min-h-[200px]">{renderMarkdown(safeString(selectedEntity.info), currentContextDirHandle, entityMap, globalLinkRegex, (dest) => { if(navFnRef.current) navFnRef.current(dest); })}</div>;
  }, [selectedEntity?.info, collectionSubTab, isEntityEditing, currentContextDirHandle, entityMap, globalLinkRegex]);

  const memoizedStandardData = useMemo(() => {
      if (isEditingMode || currentTabConfig?.viewType === 'collection-track') return null;
      return <div className="font-serif animate-fade-in flex-1">{renderMarkdown(safeString(currentStandardData), currentContextDirHandle, entityMap, globalLinkRegex, (dest) => { if(navFnRef.current) navFnRef.current(dest); })}</div>;
  }, [currentStandardData, isEditingMode, currentTabConfig?.viewType, currentContextDirHandle, entityMap, globalLinkRegex]);

  const novelQuickStats = useMemo(
    () => computeNovelQuickStats(activeNovelData, safeString),
    [activeNovelData]
  );

  useAppPhimTatToanCuc({
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
  });

  const runCommandPaletteAction = useCallback((fn) => {
    setIsCommandPaletteOpen(false);
    setCommandPaletteQuery('');
    fn();
  }, []);

  const commandPaletteFiltered = useMemo(
    () => (isCommandPaletteOpen
      ? buildCommandPaletteFiltered(deferredCommandPaletteQuery, novelsMetadata, activeNovelData, safeString)
      : []),
    [isCommandPaletteOpen, deferredCommandPaletteQuery, novelsMetadata, activeNovelData]
  );
  useEffect(() => {
    handleSelectNovelRef.current = handleSelectNovel;
  }, [handleSelectNovel]);
  const totalSidebarItems = filteredNovelsList.length;
  const sidebarStartIndex = useMemo(
    () => Math.max(0, Math.floor(sidebarScrollTop / SIDEBAR_ITEM_HEIGHT) - SIDEBAR_OVERSCAN),
    [sidebarScrollTop]
  );
  const sidebarEndIndex = useMemo(() => {
    const visibleCount = Math.max(1, Math.ceil((sidebarViewportHeight || 0) / SIDEBAR_ITEM_HEIGHT));
    return Math.min(totalSidebarItems - 1, sidebarStartIndex + visibleCount + SIDEBAR_OVERSCAN * 2);
  }, [sidebarViewportHeight, totalSidebarItems, sidebarStartIndex]);
  const visibleSidebarNovels = useMemo(
    () => filteredNovelsList.slice(sidebarStartIndex, sidebarEndIndex + 1),
    [filteredNovelsList, sidebarStartIndex, sidebarEndIndex]
  );
  const handleSidebarScroll = useCallback((e) => {
    const nextTop = e.currentTarget.scrollTop || 0;
    if (sidebarScrollRafRef.current) cancelAnimationFrame(sidebarScrollRafRef.current);
    sidebarScrollRafRef.current = requestAnimationFrame(() => {
      setSidebarScrollTop(nextTop);
      sidebarScrollRafRef.current = null;
    });
  }, []);
  const sidebarNovelItems = useMemo(() => (
    visibleSidebarNovels.map((novel, idx) => {
      const realIndex = sidebarStartIndex + idx;
      let nGenres = [];
      if (Array.isArray(novel.genres)) nGenres = novel.genres;
      else if (typeof novel.genres === 'string') nGenres = [novel.genres];
      else if (novel.genre) nGenres = [novel.genre];
      return (
        <div
          key={novel.id}
          style={{ position: 'absolute', top: realIndex * SIDEBAR_ITEM_HEIGHT, left: 0, right: 0 }}
          onClick={() => { void handleSelectNovelRef.current?.(novel); }}
          onMouseEnter={(e) => {
            handleSidebarNovelHover(novel.id, e.currentTarget);
          }}
          onMouseLeave={() => { setHoveredNovelId(null); }}
          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors relative overflow-visible ${activeNovelData?.id === novel.id ? 'bg-amber-900/20 border border-amber-800/50' : 'hover:bg-slate-800 border border-transparent'}`}
        >
          <div className="w-10 h-14 bg-slate-800 rounded overflow-hidden border border-slate-700 flex-shrink-0">
            {novel.cover && (
              novel.cover.startsWith('local_image:') ? (
                <AsyncLocalImage filename={novel.cover.replace('local_image:', '')} alt="" dirHandle={dirHandle} className="w-full h-full object-cover" />
              ) : (
                <img src={novel.cover} loading="lazy" className="w-full h-full object-cover" alt="" onError={(e) => { e.target.onerror = null; }} />
              )
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-bold truncate font-serif ${activeNovelData?.id === novel.id ? 'text-amber-400' : 'group-hover:text-amber-500'}`}>{safeString(novel.title)}</h3>
            <p className="text-[10px] text-slate-500 uppercase truncate">{safeString(nGenres.join(', '))} • {safeString(novel.author)}</p>
          </div>
        </div>
      );
    })
  ), [visibleSidebarNovels, sidebarStartIndex, activeNovelData?.id, dirHandle, handleSidebarNovelHover]);

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
          SIDEBAR_ITEM_HEIGHT={SIDEBAR_ITEM_HEIGHT}
          sidebarNovelItems={sidebarNovelItems}
        />

        <div className={`flex-1 flex bg-slate-950 transition-opacity duration-300 ${menu1Visible ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          {!activeNovelData ? (
            novelsMetadata.length > 0 ? (
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
            )
          ) : (
            <>
              <div className={`bg-slate-900 border-r border-slate-800 transition-[width] duration-200 ease-out flex flex-col z-20 flex-shrink-0 h-full ${menu2Expanded ? 'w-64' : 'w-12'}`}>
                <div className="p-4 border-b border-slate-800 h-16 flex items-center justify-between overflow-hidden whitespace-nowrap"
                  onMouseEnter={() => setMenu2Expanded((prev) => (prev ? prev : true))}>
                   {/* Nút toggle cho mobile/tap */}
                   <button
                     onClick={() => setMenu2Expanded(p => !p)}
                     className={`font-serif text-amber-500 font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${menu2Expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                     Mục Lục
                   </button>
                   {!menu2Expanded && (
                     <button onClick={() => setMenu2Expanded(true)} className="w-8 h-8 flex items-center justify-center text-amber-600 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors mx-auto" title="Mở mục lục">
                       <ChevronRight size={16}/>
                     </button>
                   )}
                   {menu2Expanded && (
                     <div className="flex items-center gap-1">
                       <button
                         onClick={() => setSidebarGrouped(p => !p)}
                         className={`p-1.5 rounded-lg transition-colors ${sidebarGrouped ? 'text-amber-500 bg-amber-900/30' : 'text-slate-500 hover:text-amber-500 hover:bg-slate-800'}`}
                         title={sidebarGrouped ? 'Tắt gom nhóm' : 'Bật gom nhóm'}
                       >
                         <Layers size={16}/>
                       </button>
                       <button onClick={() => setIsManageTabsOpen(true)} className="p-1.5 text-amber-600 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition-colors"><Network size={18}/></button>
                     </div>
                   )}
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
                   <div className="py-3 flex flex-col">
                       {sidebarGrouped ? (
                         tabGroups.filter(grp => grp.tabs.length > 0).map((grp) => {
                           const isCollapsed = grp.groupLabel && collapsedTabGroups.has(grp.groupLabel);
                           return (
                             <div key={grp.groupLabel || 'tong-quan'} className="px-3 mb-1">
                               {grp.groupLabel ? (
                                 <button
                                   onClick={() => setCollapsedTabGroups(prev => {
                                     const next = new Set(prev);
                                     if (next.has(grp.groupLabel)) next.delete(grp.groupLabel);
                                     else next.add(grp.groupLabel);
                                     return next;
                                   })}
                                   className="w-full flex items-center gap-2 py-2 px-2 rounded-md text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-amber-500 hover:bg-slate-800/50 transition-colors"
                                 >
                                   {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                                   <span className="flex-1 text-left truncate">{grp.groupLabel}</span>
                                   <span className="text-slate-600">({grp.tabs.length})</span>
                                 </button>
                               ) : null}
                               {(!grp.groupLabel || !isCollapsed) && grp.tabs.map(tab => {
                                 const isActive = activeTabLon === tab.id;
                                 return (
                                   <div key={tab.id} className="mb-1">
                                     <button onClick={() => handleSelectTabLon(tab.id)} className={`w-full flex items-center p-3 rounded-lg transition-colors overflow-hidden whitespace-nowrap ${isActive && !activeTabNho ? 'bg-amber-900/20 text-amber-400 border-l-2 border-amber-500' : 'text-slate-500 hover:bg-slate-800 border-l-2 border-transparent'}`}>
                                       <div className="w-5 flex justify-center flex-shrink-0">{getIconComponent(tab.iconName)}</div>
                                       <span className={`ml-3 font-serif text-sm transition-opacity duration-200 ${menu2Expanded ? 'opacity-100' : 'opacity-0'}`}>{safeString(tab.label)}</span>
                                     </button>
                                     {isActive && tab.subTabs?.length > 0 && menu2Expanded && (
                                       <div className="mt-1 ml-6 border-l border-slate-700/50 pl-2 space-y-1 animate-fade-in">
                                         {tab.subTabs.map(sub => {
                                           const isActiveNho = activeTabNho === sub.id;
                                           const hasTabCon = sub.tabCon && sub.tabCon.length > 0;
                                           return (
                                             <div key={sub.id}>
                                               <button onClick={(e) => handleSelectTabNho(e, tab.id, sub)} className={`w-full text-left py-2 px-3 text-sm rounded-md font-serif flex items-center justify-between transition-colors ${isActiveNho ? 'bg-slate-800/80 text-amber-300' : 'text-slate-500 hover:text-slate-300'}`}>
                                                 <span className="flex items-center gap-2 truncate">
                                                   {sub.viewType === 'collection-track' && <LayoutGrid size={12} className="opacity-50 flex-shrink-0" />}
                                                   <span className="truncate">{safeString(sub.label)}</span>
                                                 </span>
                                                 {hasTabCon && <ChevronDown size={14} className={`flex-shrink-0 transition-transform ${isActiveNho ? 'text-amber-400' : 'text-slate-600 -rotate-90'}`} />}
                                               </button>
                                               {isActiveNho && hasTabCon && sub.viewType !== 'collection-track' && (
                                                 <div className="mt-1 ml-4 border-l border-dashed border-slate-700/50 pl-2 space-y-1 animate-fade-in">
                                                   {sub.tabCon.map(con => (
                                                     <button key={con.id} onClick={(e) => { e.stopPropagation(); setNavHistory(prev => [...prev, { lonId: activeTabLon, nhoId: activeTabNho, conId: activeTabCon, entityId: selectedEntityId, subTab: collectionSubTab }]); setActiveTabCon(con.id); setIsEditingMode(false); }} className={`w-full text-left py-1.5 px-3 text-xs rounded-md font-serif truncate transition-colors ${activeTabCon === con.id ? 'bg-amber-900/30 text-amber-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
                                                       {safeString(con.label)}
                                                     </button>
                                                   ))}
                                                 </div>
                                               )}
                                             </div>
                                           );
                                         })}
                                       </div>
                                     )}
                                   </div>
                                 );
                               })}
                             </div>
                           );
                         })
                       ) : (
                         sortedTabs.map(tab => {
                           const isActive = activeTabLon === tab.id;
                           return (
                             <div key={tab.id} className="px-3 mb-1">
                               <button onClick={() => handleSelectTabLon(tab.id)} className={`w-full flex items-center p-3 rounded-lg transition-colors overflow-hidden whitespace-nowrap ${isActive && !activeTabNho ? 'bg-amber-900/20 text-amber-400 border-l-2 border-amber-500' : 'text-slate-500 hover:bg-slate-800 border-l-2 border-transparent'}`}>
                                 <div className="w-5 flex justify-center flex-shrink-0">{getIconComponent(tab.iconName)}</div>
                                 <span className={`ml-3 font-serif text-sm transition-opacity duration-200 ${menu2Expanded ? 'opacity-100' : 'opacity-0'}`}>{safeString(tab.label)}</span>
                               </button>
                               {isActive && tab.subTabs?.length > 0 && menu2Expanded && (
                                 <div className="mt-1 ml-6 border-l border-slate-700/50 pl-2 space-y-1 animate-fade-in">
                                   {tab.subTabs.map(sub => {
                                     const isActiveNho = activeTabNho === sub.id;
                                     const hasTabCon = sub.tabCon && sub.tabCon.length > 0;
                                     return (
                                       <div key={sub.id}>
                                         <button onClick={(e) => handleSelectTabNho(e, tab.id, sub)} className={`w-full text-left py-2 px-3 text-sm rounded-md font-serif flex items-center justify-between transition-colors ${isActiveNho ? 'bg-slate-800/80 text-amber-300' : 'text-slate-500 hover:text-slate-300'}`}>
                                           <span className="flex items-center gap-2 truncate">
                                             {sub.viewType === 'collection-track' && <LayoutGrid size={12} className="opacity-50 flex-shrink-0" />}
                                             <span className="truncate">{safeString(sub.label)}</span>
                                           </span>
                                           {hasTabCon && <ChevronDown size={14} className={`flex-shrink-0 transition-transform ${isActiveNho ? 'text-amber-400' : 'text-slate-600 -rotate-90'}`} />}
                                         </button>
                                         {isActiveNho && hasTabCon && sub.viewType !== 'collection-track' && (
                                           <div className="mt-1 ml-4 border-l border-dashed border-slate-700/50 pl-2 space-y-1 animate-fade-in">
                                             {sub.tabCon.map(con => (
                                               <button key={con.id} onClick={(e) => { e.stopPropagation(); setNavHistory(prev => [...prev, { lonId: activeTabLon, nhoId: activeTabNho, conId: activeTabCon, entityId: selectedEntityId, subTab: collectionSubTab }]); setActiveTabCon(con.id); setIsEditingMode(false); }} className={`w-full text-left py-1.5 px-3 text-xs rounded-md font-serif truncate transition-colors ${activeTabCon === con.id ? 'bg-amber-900/30 text-amber-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
                                                 {safeString(con.label)}
                                               </button>
                                             ))}
                                           </div>
                                         )}
                                       </div>
                                     );
                                   })}
                                 </div>
                               )}
                             </div>
                           );
                         })
                       )}
                   </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-950">
                 <div id="main-scroll-container" className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <div className="max-w-6xl mx-auto h-full flex flex-col">
                       
                       {navHistory.length > 0 && (
                           <div className="mb-4">
                               <button onClick={handleGoBack} className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-400 transition-colors font-bold uppercase tracking-widest bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-800 w-fit shadow-sm"><ChevronLeft size={14}/> Quay Lại Dấu Vết Cũ</button>
                           </div>
                       )}
                       
                       {activeTabLon === 'tong-quan' ? (() => {
                          const anchor = Math.max(0, parseInt(activeNovelData.readingAnchorChapter ?? activeNovelData.chaptersRead ?? 0, 10) || 0);
                          const lo = Math.max(0, anchor - 12);
                          const hi = anchor + 30;
                          const totalChapters = Math.max(0, parseInt(activeNovelData.chaptersTotal, 10) || 0);
                          const readChapters = Math.max(0, parseInt(overviewForm?.chaptersRead, 10) || 0);
                          const progressPercent = totalChapters > 0
                            ? (readChapters >= totalChapters ? 100 : Math.max(0, Math.floor((readChapters / totalChapters) * 100)))
                            : 0;
                          const isReadingDone = totalChapters > 0 && readChapters === totalChapters;
                          const hasPersonalTags = (activeNovelData.tags || []).length > 0;
                          const xrefs = Array.isArray(activeNovelData.chapterCrossRefs) ? activeNovelData.chapterCrossRefs : [];
                          return (
                          <div className="space-y-7 animate-fade-in">
                             <section className="rounded-[28px] border border-slate-800/70 bg-gradient-to-b from-slate-900/35 to-slate-950/60 p-8 shadow-xl">
                             <div className="grid grid-cols-[260px_minmax(0,1fr)] gap-10 items-start">
                             <aside className="w-[260px] flex-shrink-0">
                                <div
                                   className="rounded-2xl overflow-hidden shadow-2xl border border-slate-800 relative group cursor-zoom-in"
                                   onClick={() => activeNovelData.cover && setLightboxSrc(activeNovelData.cover)}
                                   title="Nhấp để xem ảnh đầy đủ"
                                >
                                   {activeNovelData.cover ? (
                                      activeNovelData.cover.startsWith('local_image:') ? (
                                         <AsyncLocalImage
                                            filename={activeNovelData.cover.replace('local_image:', '')}
                                            alt={activeNovelData.title}
                                            dirHandle={currentContextDirHandle}
                                            className="w-full h-auto block object-contain"
                                         />
                                      ) : (
                                         <img
                                            src={activeNovelData.cover}
                                            className="w-full h-auto block object-contain"
                                            alt={activeNovelData.title}
                                            onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMG; }}
                                         />
                                      )
                                   ) : (
                                      <div className="aspect-[2/3] flex items-center justify-center bg-slate-900 text-slate-600">
                                         <BookOpen size={48} />
                                      </div>
                                   )}
                                   {activeNovelData.cover && (
                                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                         <span className="text-white text-xs font-bold bg-slate-900/80 px-3 py-1.5 rounded-full">Xem ảnh đầy đủ</span>
                                      </div>
                                   )}
                                </div>
                             </aside>
                             <div className="min-w-0 flex flex-col gap-5">
                                <header className="space-y-1">
                                <h1 className="text-5xl font-heading font-bold text-slate-100 leading-tight">{safeString(activeNovelData.title)}</h1>
                                <p className="text-xl text-slate-400 font-serif italic">Tác giả: {safeString(activeNovelData.author)}</p>
                                </header>

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                                  <div className="rounded-xl bg-slate-950/60 border border-amber-900/30 px-3 py-2">
                                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Tiến độ</div>
                                    <div className="text-sm font-bold text-amber-300 font-serif">{readChapters}/{totalChapters || '???'}</div>
                                  </div>
                                  <div className="rounded-xl bg-slate-950/60 border border-amber-900/30 px-3 py-2">
                                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Hoàn thành</div>
                                    <div className="text-sm font-bold text-amber-400 font-serif">{progressPercent}%</div>
                                  </div>
                                  <div className="rounded-xl bg-slate-950/60 border border-amber-900/30 px-3 py-2">
                                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Đánh giá</div>
                                    <div className="text-sm font-bold text-amber-400 font-serif">{Number(overviewForm?.rating || 0).toFixed(1)}/5</div>
                                  </div>
                                  <div className="rounded-xl bg-slate-950/60 border border-amber-900/30 px-3 py-2">
                                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Số tag</div>
                                    <div className="text-sm font-bold text-amber-200 font-serif">{(activeNovelData.tags || []).length}</div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                <div className="rounded-xl bg-slate-950/55 border border-slate-800/90 px-4 py-3">
                                        <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-2 flex items-center gap-1.5"><BookOpen size={12}/> Tiến độ đọc</label>
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                          <input type="number" min="0" className="w-24 bg-slate-900/50 border border-slate-800 rounded-lg p-2 text-slate-200 text-sm focus:outline-none focus:border-amber-600/50 font-serif" value={overviewForm?.chaptersRead || 0}
                                            onChange={e => setOverviewForm({...overviewForm, chaptersRead: parseInt(e.target.value,10)||0})}
                                            onBlur={() => updateActiveNovelData(n => n.chaptersRead = Math.max(0, parseInt(overviewForm?.chaptersRead, 10) || 0))} />
                                          <span className="text-slate-600 font-serif text-sm">/</span>
                                          <span className="text-slate-300 font-serif text-sm">{safeString(activeNovelData.chaptersTotal) || '???'}</span>
                                          <span className="ml-1 text-xs text-amber-500 font-bold font-serif">{progressPercent}%</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-slate-800 overflow-hidden mb-2">
                                          <div className="h-full bg-gradient-to-r from-amber-700 to-amber-500 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const next = readChapters + 1;
                                              setOverviewForm((prev) => ({ ...(prev || {}), chaptersRead: next }));
                                              updateActiveNovelData((n) => { n.chaptersRead = next; });
                                            }}
                                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-slate-700 text-slate-300 hover:text-slate-100 hover:border-slate-600 transition-colors"
                                          >
                                            +1 chương
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const next = readChapters + 5;
                                              setOverviewForm((prev) => ({ ...(prev || {}), chaptersRead: next }));
                                              updateActiveNovelData((n) => { n.chaptersRead = next; });
                                            }}
                                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-slate-700 text-slate-300 hover:text-slate-100 hover:border-slate-600 transition-colors"
                                          >
                                            +5 chương
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const done = totalChapters > 0 ? totalChapters : readChapters;
                                              setOverviewForm((prev) => ({ ...(prev || {}), chaptersRead: done }));
                                              updateActiveNovelData((n) => { n.chaptersRead = done; });
                                            }}
                                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${isReadingDone ? 'border-amber-500/70 bg-amber-500/15 text-amber-200' : 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'}`}
                                          >
                                            {isReadingDone ? '✓ Đã xong' : 'Đánh dấu đã xong'}
                                          </button>
                                        </div>
                                </div>
                                <div className="rounded-xl bg-slate-950/55 border border-slate-800/90 px-4 py-3">
                                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-2">Đánh giá 5 sao</label>
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {[1, 2, 3, 4, 5].map((star) => {
                                      const rating = Number(overviewForm?.rating || 0);
                                      const fill = Math.max(0, Math.min(1, rating - (star - 1)));
                                      return (
                                        <div key={star} className="relative w-7 h-7 select-none">
                                          <span className="absolute inset-0 text-2xl leading-7 text-slate-700">★</span>
                                          <span className="absolute inset-0 text-2xl leading-7 text-amber-400 overflow-hidden" style={{ width: `${fill * 100}%` }}>★</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const half = star - 0.5;
                                              setOverviewForm((prev) => ({ ...(prev || {}), rating: half }));
                                              updateActiveNovelData((n) => { n.rating = half; });
                                            }}
                                            className="absolute left-0 top-0 h-full w-1/2"
                                            aria-label={`Đánh giá ${star - 0.5} sao`}
                                            title={`${star - 0.5} sao`}
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setOverviewForm((prev) => ({ ...(prev || {}), rating: star }));
                                              updateActiveNovelData((n) => { n.rating = star; });
                                            }}
                                            className="absolute right-0 top-0 h-full w-1/2"
                                            aria-label={`Đánh giá ${star} sao`}
                                            title={`${star} sao`}
                                          />
                                        </div>
                                      );
                                    })}
                                    <span className="ml-2 text-xs text-slate-400 font-serif">{Number(overviewForm?.rating || 0).toFixed(1)}/5</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOverviewForm((prev) => ({ ...(prev || {}), rating: 0 }));
                                        updateActiveNovelData((n) => { n.rating = 0; });
                                      }}
                                      className="ml-2 px-2 py-1 rounded-lg text-[10px] font-bold border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
                                    >
                                      Bỏ đánh giá
                                    </button>
                                  </div>
                                  <textarea
                                    className="mt-3 w-full bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-slate-300 font-serif text-sm leading-relaxed focus:outline-none focus:border-amber-600/50 min-h-[80px] resize-none custom-scrollbar"
                                    value={safeString(overviewForm?.ratingOpinion)}
                                    onChange={(e) => setOverviewForm({ ...(overviewForm || {}), ratingOpinion: e.target.value })}
                                    onBlur={() => updateActiveNovelData((n) => { n.ratingOpinion = safeString(overviewForm?.ratingOpinion); })}
                                    placeholder="Ý kiến đánh giá của bạn về truyện này..."
                                  />
                                </div>
                                </div>

                                {hasPersonalTags || isAddingTag ? (
                                  <div className="rounded-xl bg-slate-950/45 border border-amber-900/30 px-4 py-3 mb-6">
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-3 uppercase tracking-widest"><BookOpen size={14} /> Nhãn cá nhân</label>
                                    <div className="flex flex-wrap gap-2.5 items-center">
                                      {(activeNovelData.tags || []).map(tag => (
                                        <span key={tag} className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-md text-sm text-slate-300 font-serif flex items-center gap-2 group/tag">
                                          {safeString(tag)}
                                          <button onClick={() => handleRemoveTag(tag)} className="text-slate-500 hover:text-rose-400 opacity-50 group-hover/tag:opacity-100 transition-opacity"><X size={12}/></button>
                                        </span>
                                      ))}
                                      {isAddingTag ? (
                                        <input 
                                          autoFocus type="text" placeholder="Nhập nhãn..."
                                          className="px-3 py-1.5 bg-slate-950 border border-amber-600/50 rounded-md text-sm text-slate-200 focus:outline-none w-32 font-serif"
                                          value={newTagValue} onChange={(e) => setNewTagValue(e.target.value)}
                                          onKeyDown={(e) => { if(e.key === 'Enter') handleAddTag() }}
                                          onBlur={() => { if(newTagValue.trim()) handleAddTag(); else setIsAddingTag(false); }}
                                        />
                                      ) : (
                                        <button onClick={() => setIsAddingTag(true)} className="px-3 py-1.5 bg-transparent border border-dashed border-slate-700 rounded-md text-sm text-slate-500 hover:text-amber-400 hover:border-amber-500/50 transition-colors font-serif flex items-center gap-1">
                                          <Plus size={14} /> Thêm nhãn
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mb-6">
                                    <button onClick={() => setIsAddingTag(true)} className="px-3 py-1.5 bg-slate-950/45 border border-dashed border-slate-700 rounded-md text-sm text-slate-500 hover:text-amber-400 hover:border-amber-500/50 transition-colors font-serif flex items-center gap-1">
                                      <Plus size={14} /> Thêm nhãn cá nhân
                                    </button>
                                  </div>
                                )}

                                {novelQuickStats && (novelQuickStats.totalEnt > 0 || novelQuickStats.totalMs > 0) && (
                                  <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
                                    <button
                                      type="button"
                                      onClick={() => setOverviewStatsOpen((o) => !o)}
                                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800/30 transition-colors"
                                    >
                                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <BarChart2 size={14} className="text-cyan-500/80" /> Thống kê truyện
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-serif">
                                        {novelQuickStats.totalEnt} thẻ · {novelQuickStats.totalMs} mốc
                                        <ChevronDown size={14} className={`inline ml-1 transition-transform ${overviewStatsOpen ? 'rotate-180' : ''}`} />
                                      </span>
                                    </button>
                                    {overviewStatsOpen && (
                                      <div className="px-4 pb-4 pt-0 border-t border-slate-800/80 animate-fade-in space-y-4">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3">
                                          <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3 text-center">
                                            <div className="text-xl font-heading font-bold text-indigo-300">{novelQuickStats.totalEnt}</div>
                                            <div className="text-[9px] text-slate-500 uppercase">Tổng thẻ</div>
                                          </div>
                                          <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3 text-center">
                                            <div className="text-xl font-heading font-bold text-emerald-300">{novelQuickStats.totalMs}</div>
                                            <div className="text-[9px] text-slate-500 uppercase">Tổng mốc</div>
                                          </div>
                                          <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3 text-center col-span-2 sm:col-span-1">
                                            <div className="text-sm font-bold text-amber-400/90">{novelQuickStats.byTab.length}</div>
                                            <div className="text-[9px] text-slate-500 uppercase">Mục có dữ liệu</div>
                                          </div>
                                        </div>
                                        {novelQuickStats.byTab.length > 0 && (
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Theo mục</p>
                                            <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar text-xs font-serif">
                                              {novelQuickStats.byTab.map((row) => (
                                                <div key={row.key} className="flex justify-between text-slate-400 border-b border-slate-800/50 pb-1">
                                                  <span className="truncate pr-2">{row.label}</span>
                                                  <span className="text-slate-500 flex-shrink-0">{row.entities} thẻ · {row.milestones} mốc</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        {novelQuickStats.topChapters.length > 0 && (
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Chương có nhiều mốc nhất</p>
                                            <div className="space-y-2">
                                              {novelQuickStats.topChapters.map(({ ch, n }) => (
                                                <div key={ch} className="flex items-center gap-2">
                                                  <span className="text-[10px] text-slate-500 w-10 tabular-nums">ch.{ch}</span>
                                                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                      className="h-full bg-gradient-to-r from-amber-700 to-amber-500 rounded-full"
                                                      style={{ width: `${Math.max(8, Math.round((n / novelQuickStats.maxBar) * 100))}%` }}
                                                    />
                                                  </div>
                                                  <span className="text-[10px] text-slate-400 w-6 text-right">{n}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                             </div>
                             </div>
                             </section>

                                   <section className="rounded-2xl border border-slate-800/70 bg-slate-900/25 p-6">
                                   <div className="flex justify-between items-center mb-3">
                                       <label className="text-xs text-slate-500 uppercase font-bold tracking-widest flex items-center gap-2"><BookOpen size={14}/> Giới thiệu truyện</label>
                                       <button onClick={async () => {
                                           if (geminiApiKeys.length === 0) { showToast("Vui lòng nhập API Key (trong mục Cài Đặt) để dùng AI", "warning"); return; }
                                           setIsGeneratingReview(true);
                                           try {
                                             const text = await generateReviewWithAI(activeNovelData, geminiApiKeys);
                                             if (text) { setOverviewForm({...overviewForm, review: text}); updateActiveNovelData(n => n.review = text); showToast("Đã lĩnh ngộ thành công!"); }
                                             else showToast("AI không trả về nội dung.", "warning");
                                           } catch (e) { showToast(mapGeminiErrorToUserMessage(e), "error"); }
                                           setIsGeneratingReview(false);
                                       }} disabled={isGeneratingReview} className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-bold bg-amber-950/30 px-3 py-1.5 rounded-lg border border-amber-900/50 transition-colors disabled:opacity-50">
                                           {isGeneratingReview ? <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"/> : <Sparkles size={14} />}
                                           {isGeneratingReview ? 'Đang tổng hợp...' : 'AI Tổng Hợp Đạo Tâm'}
                                       </button>
                                   </div>
                                   <textarea className="w-full flex-1 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 text-slate-300 font-serif text-lg leading-relaxed focus:outline-none focus:border-amber-600/50 min-h-[200px] resize-none custom-scrollbar" value={safeString(overviewForm?.review)} onChange={(e) => setOverviewForm({...overviewForm, review: e.target.value})} onBlur={() => updateActiveNovelData(n => n.review = overviewForm.review)} placeholder="Viết giới thiệu tổng quan về truyện... (Hệ thống tự động lưu khi bạn nhấp chuột ra khỏi đây)" />
                                   </section>

                                   <section className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-5">
                                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-3">Công cụ nhanh</label>
                                   <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
                                               <button
                                                 type="button"
                                                 onClick={() => setOverviewNeoOpen((o) => !o)}
                                                 className={`font-serif text-sm px-4 py-2.5 rounded-xl border flex items-center justify-center gap-2 transition-colors ${overviewNeoOpen ? 'bg-amber-950/50 border-amber-700/50 text-amber-200' : 'bg-slate-800/80 border-slate-600/50 text-slate-300 hover:border-amber-600/30'}`}
                                               >
                                                 <BookOpen size={15} className="opacity-80 flex-shrink-0" />
                                                 Ghi theo chương
                                                 <ChevronDown size={16} className={`opacity-60 transition-transform flex-shrink-0 ${overviewNeoOpen ? 'rotate-180' : ''}`} />
                                               </button>
                                               <button
                                                 type="button"
                                                 onClick={() => setIsInNovelSearchOpen(true)}
                                                 className="font-serif text-sm px-4 py-2.5 rounded-xl bg-cyan-950/50 border border-cyan-800/45 text-cyan-300 hover:bg-cyan-900/35 flex items-center justify-center gap-2 transition-colors"
                                               >
                                                 <Search size={15} className="opacity-80" /> Tra trong truyện
                                               </button>
                                               <button
                                                 type="button"
                                                 onClick={openOverviewHub}
                                                 className="font-serif text-sm px-4 py-2.5 rounded-xl bg-violet-950/55 border border-violet-700/40 text-violet-200 hover:bg-violet-900/40 flex items-center justify-center gap-2 transition-colors"
                                               >
                                                 <Layers size={15} className="opacity-90" /> Một cửa cập nhật
                                               </button>
                                               <button
                                                 type="button"
                                                 onClick={() => setNeoXrefSectionOpen((o) => !o)}
                                                 className={`font-serif text-sm px-4 py-2.5 rounded-xl border flex items-center justify-center gap-2 transition-colors ${neoXrefSectionOpen ? 'bg-amber-950/40 border-amber-800/50 text-amber-200' : 'bg-slate-800/80 border-slate-600/50 text-slate-300 hover:border-amber-600/25'}`}
                                               >
                                                 <GitBranch size={15} className="text-amber-500/80 flex-shrink-0" />
                                                 Nối tra cứu
                                                 {xrefs.length > 0 && (
                                                   <span className="font-sans text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-900/50 text-amber-400">{xrefs.length}</span>
                                                 )}
                                                 <ChevronDown size={16} className={`opacity-60 transition-transform flex-shrink-0 ${neoXrefSectionOpen ? 'rotate-180' : ''}`} />
                                               </button>
                                             </div>
                                   </section>

                                   <section className="rounded-2xl border border-amber-900/25 bg-gradient-to-br from-slate-950 via-slate-900/95 to-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] overflow-hidden">
                                         <div className="border-l-[5px] border-amber-500/85 pl-4 pr-3 py-4 sm:pl-5 sm:pr-4">
                                           <div className="min-w-0 mb-4">
                                               <h3 className="font-heading text-lg sm:text-xl text-amber-50 tracking-tight">Theo chương & công cụ</h3>
                                               <p className="font-serif text-xs text-slate-500 mt-1.5 max-w-3xl">
                                                 Neo <span className="text-amber-400 font-bold tabular-nums">ch.{anchor}</span>
                                                 <span className="text-slate-600"> · Mốc mới (khi tạo) theo chương neo. Cập nhật hàng loạt: «Một cửa» — dùng khối Công cụ nhanh phía trên.</span>
                                               </p>
                                           </div>

                                           {overviewNeoOpen && (
                                             <div className="mt-4 pt-4 border-t border-slate-800/80 animate-fade-in space-y-6">
                                               <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                                 <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-4">
                                                   <button type="button" aria-label="Giảm chương" onClick={() => updateActiveNovelData((n) => { const b = parseInt(n.readingAnchorChapter ?? n.chaptersRead ?? 0, 10) || 0; n.readingAnchorChapter = Math.max(0, b - 1); })} className="min-h-10 min-w-10 rounded-xl bg-slate-800/90 border border-slate-600/60 text-amber-400 text-lg font-medium hover:bg-slate-700 transition-all active:scale-95">−</button>
                                                   <div className="min-w-[3.5rem] text-center">
                                                     <span className="font-heading text-4xl sm:text-5xl text-amber-400 tabular-nums leading-none">{anchor}</span>
                                                     <div className="font-serif text-[10px] text-slate-600 mt-0.5">chương neo</div>
                                                    <input
                                                      type="number"
                                                      min="0"
                                                      value={anchor}
                                                      onChange={(e) => {
                                                        const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                                                        updateActiveNovelData((n) => { n.readingAnchorChapter = v; });
                                                      }}
                                                      className="mt-2 w-20 mx-auto bg-slate-950/70 border border-slate-700 rounded-lg px-2 py-1 text-xs text-amber-200/90 font-serif text-center focus:outline-none focus:border-amber-600/50"
                                                      aria-label="Nhập chương neo"
                                                      title="Nhập số chương neo"
                                                    />
                                                   </div>
                                                   <button type="button" aria-label="Tăng chương" onClick={() => updateActiveNovelData((n) => { const b = parseInt(n.readingAnchorChapter ?? n.chaptersRead ?? 0, 10) || 0; n.readingAnchorChapter = b + 1; })} className="min-h-10 min-w-10 rounded-xl bg-slate-800/90 border border-slate-600/60 text-amber-400 text-lg font-medium hover:bg-slate-700 transition-all active:scale-95">+</button>
                                                 </div>
                                                 <button type="button" onClick={() => updateActiveNovelData((n) => { n.readingAnchorChapter = parseInt(n.chaptersRead, 10) || 0; })} className="font-serif text-sm px-4 py-2 rounded-full bg-slate-800/80 border border-slate-600/50 text-cyan-300 hover:bg-slate-700/90 w-fit mx-auto sm:mx-0">
                                                   Đồng bộ theo tiến độ đọc
                                                 </button>
                                               </div>
                                               <div>
                                                 <h4 className="font-heading text-[10px] font-semibold text-amber-200/70 uppercase tracking-widest flex items-center gap-2 mb-2">
                                                   <Activity size={14} className="text-amber-500/90" /> Lối tắt ch.{lo}–{hi}
                                                 </h4>
                                                 <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar flex-nowrap -mx-1 px-1 snap-x">
                                                   {nearChapterEntitiesGlobal.map((row) => (
                                                     <button key={`${row.lonId}-${row.nhoId}-${row.ent.id}`} type="button" onClick={() => handleNavigate({ lonId: row.lonId, nhoId: row.nhoId, entityId: row.ent.id })} className="snap-start flex-shrink-0 text-left px-3 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/70 hover:border-amber-500/35 max-w-[200px] min-w-[120px]">
                                                       <span className="font-serif text-sm text-slate-100 line-clamp-2">{safeString(row.ent.name)}</span>
                                                       <span className="block font-sans text-[9px] uppercase text-slate-500 mt-1 truncate">{safeString(row.sectionLabel)}</span>
                                                     </button>
                                                   ))}
                                                 </div>
                                                 {nearChapterEntitiesGlobal.length === 0 && (
                                                   <p className="font-serif text-xs text-slate-600 italic">Chưa có mốc trong vùng này.</p>
                                                 )}
                                               </div>
                                             </div>
                                           )}

                                           {neoXrefSectionOpen && (
                                             <div className="mt-4 pt-4 border-t border-slate-800/80 animate-fade-in">
                                               <p className="font-serif text-xs text-slate-600 mb-3">Ch.X → Ch.Y + ghi chú. <Sparkles size={12} className="inline align-text-bottom text-amber-500/90" /> trên dòng để AI gợi ý.</p>
                                               <div className="mt-4 space-y-3 animate-fade-in">
                                                 <div className="flex flex-wrap gap-2 items-end">
                                                   <div className="flex flex-col gap-1">
                                                     <label className="font-sans text-[10px] uppercase tracking-wider text-slate-500">Đang đọc</label>
                                                     <input type="number" placeholder="vd. 200" className="w-20 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 font-serif text-sm text-amber-100/90 focus:outline-none focus:border-amber-600/50" value={xrefDraft.from} onChange={(e) => setXrefDraft((d) => ({ ...d, from: e.target.value }))} />
                                                   </div>
                                                   <span className="text-slate-600 pb-2 font-serif">→</span>
                                                   <div className="flex flex-col gap-1">
                                                     <label className="font-sans text-[10px] uppercase tracking-wider text-slate-500">Nhắc chương</label>
                                                     <input type="number" placeholder="vd. 15" className="w-20 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 font-serif text-sm text-cyan-200/90 focus:outline-none focus:border-cyan-700/50" value={xrefDraft.to} onChange={(e) => setXrefDraft((d) => ({ ...d, to: e.target.value }))} />
                                                   </div>
                                                   <input type="text" placeholder="Ghi chú (một dòng)" className="flex-1 min-w-[160px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 font-serif text-sm text-slate-200 focus:outline-none focus:border-amber-600/40" value={xrefDraft.note} onChange={(e) => setXrefDraft((d) => ({ ...d, note: e.target.value }))} />
                                                   <button type="button" onClick={() => {
                                                     const from = parseInt(xrefDraft.from, 10);
                                                     const to = parseInt(xrefDraft.to, 10);
                                                     if (isNaN(from) || isNaN(to) || !xrefDraft.note.trim()) { showToast('Nhập đủ hai chương và ghi chú.', 'warning'); return; }
                                                     updateActiveNovelData((n) => { if (!n.chapterCrossRefs) n.chapterCrossRefs = []; n.chapterCrossRefs.push({ id: generateId('xref'), fromCh: from, toCh: to, note: xrefDraft.note.trim() }); });
                                                     setXrefDraft({ from: '', to: '', note: '' });
                                                     showToast('Đã lưu nối tra cứu.');
                                                   }} className="font-heading text-sm px-5 py-2 rounded-full bg-amber-700 hover:bg-amber-600 text-white border border-amber-600/50 transition-colors">Thêm</button>
                                                 </div>
                                                 {xrefs.length > 0 ? (
                                                   <ul className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
                                                     {xrefs.map((x) => (
                                                       <li key={x.id} className="flex justify-between gap-2 items-start font-serif text-sm bg-slate-950/70 rounded-xl px-4 py-2.5 border border-slate-800/90">
                                                         <span className="text-slate-300 leading-relaxed min-w-0"><span className="text-amber-500 font-semibold tabular-nums">Ch.{x.fromCh}</span>
                                                           <span className="text-slate-600 mx-1">→</span>
                                                           <span className="text-cyan-400/90 font-semibold tabular-nums">Ch.{x.toCh}</span>
                                                           <span className="text-slate-500"> — </span>{safeString(x.note)}</span>
                                                         <div className="flex items-start gap-0.5 flex-shrink-0">
                                                           <button type="button" onClick={() => runXrefAiForRow(x)} className="text-amber-500/90 hover:text-amber-300 p-1.5 rounded-lg hover:bg-amber-950/40 transition-colors" title="AI: gợi ý thẻ mới / mốc / cập nhật" aria-label="Gợi ý AI"><Sparkles size={16} /></button>
                                                           <button type="button" onClick={() => updateActiveNovelData((n) => { if (!n.chapterCrossRefs) return; n.chapterCrossRefs = n.chapterCrossRefs.filter((r) => r.id !== x.id); })} className="text-rose-400/90 hover:text-rose-300 text-lg leading-none px-1" aria-label="Xóa">×</button>
                                                         </div>
                                                       </li>
                                                     ))}
                                                   </ul>
                                                 ) : (
                                                   <p className="font-serif text-sm text-slate-600 italic pl-1">Chưa có ghi chú — ví dụ: ch.200 nhắc sự kiện ch.15.</p>
                                                 )}
                                               </div>
                                             </div>
                                           )}
                                         </div>
                                   </section>

                                   <section className="rounded-2xl border border-slate-800/70 bg-slate-950/35 px-6 py-4">
                                      <div className="flex justify-between items-center gap-4">
                                         <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Quản lý thư tịch</p>
                                         <div className="flex gap-3">
                                            <button onClick={handleOpenEditNovel} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold flex items-center gap-2 transition-colors border border-slate-700"><Settings size={17}/> Thiết Lập Truyện</button>
                                            <button onClick={() => setConfirmDialog({
                                               isOpen: true, title: 'Hủy Diệt Thư Tịch', message: `Xóa sổ vĩnh viễn <b>${safeString(activeNovelData.title)}</b> cùng toàn bộ ảnh của nó? Hành động này không thể vãn hồi!`, 
                                               onConfirm: () => handleDeleteNovel(activeNovelData.id)
                                            })} className="px-5 py-2.5 bg-slate-900 text-rose-500 rounded-xl font-bold flex items-center gap-2 transition-colors border border-slate-800 hover:border-rose-900/50 hover:bg-rose-950/30"><Trash2 size={17} /> Hủy Diệt</button>
                                         </div>
                                      </div>
                                   </section>
                          </div>
                       ); })() : (
                          <div className="animate-fade-in flex flex-col h-full">
                             <div className="mb-6 flex justify-between items-end border-b border-slate-800 pb-6">
                                <div>
                                   <div className="text-[10px] text-amber-600 uppercase font-bold tracking-widest mb-1 flex items-center gap-2">
                                      <span className="opacity-50 cursor-pointer hover:opacity-80" onClick={() => handleSelectTabLon(activeTabLon)}>{safeString(sortedTabs.find(t=>t.id===activeTabLon)?.label || activeTabLon)}</span>
                                      {activeTabNho && <><ChevronRight size={10}/> {safeString(currentTabConfig?.label)}</>}
                                      {activeTabCon && <><ChevronRight size={10}/> <span className="text-amber-400">{safeString(currentTabConfig?.tabCon?.find(c=>c.id===activeTabCon)?.label)}</span></>}
                                   </div>
                                   <h2 className="text-4xl font-heading font-bold text-slate-100">{activeTabCon ? safeString(currentTabConfig?.tabCon?.find(c=>c.id===activeTabCon)?.label) : safeString(currentTabConfig?.label)}</h2>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                   {!activeTabNho && currentTabConfig?.subTabs?.length > 0 ? null : currentTabConfig?.viewType === 'collection-track' ? (
                                      <div ref={entityAdvancedRef} className="flex flex-col items-end gap-2">
                                        <div className="flex items-center gap-2 flex-wrap justify-end">
                                         {/* Nút thêm mới cố định trên header */}
                                         <button onClick={handleOpenCreateEntity} className="px-4 py-2 bg-amber-700/80 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md flex-shrink-0">
                                           <Plus size={13}/> {getTerms(activeTabLon).createNew}
                                         </button>
                                         <div className="relative">
                                            <input type="text" placeholder="Tìm kiếm nhanh..." value={entitySearch} onChange={e=>setEntitySearch(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs font-serif outline-none focus:border-amber-600/50 w-44" />
                                            <Search size={14} className="absolute left-3 top-2.5 text-slate-600"/>
                                         </div>
                                         <select value={entitySortMode} onChange={e=>setEntitySortMode(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs font-serif outline-none focus:border-amber-600/50 text-slate-300 cursor-pointer">
                                            <option value="newest">Mới nhất</option>
                                            <option value="name_asc">Tên (A-Z)</option>
                                            <option value="milestones">Nhiều sự kiện</option>
                                         </select>
                                         <button
                                           type="button"
                                           onClick={() => setShowEntityAdvanced((v) => !v)}
                                           className={`px-3 py-2 border rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${showEntityAdvanced ? 'bg-amber-900/30 border-amber-700/50 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}
                                         >
                                           <Filter size={13} />
                                           Nâng cao
                                         </button>
                                         {isEntityAdvancedActive && (
                                           <button type="button" onClick={clearEntityAdvanced} className="px-3 py-2 border rounded-xl text-xs font-bold bg-slate-900 border-slate-700 text-slate-300 hover:text-slate-100 transition-colors">
                                             Xóa lọc
                                           </button>
                                         )}
                                        </div>
                                        {isEntityAdvancedActive && (
                                          <div className="flex items-center gap-2 flex-wrap justify-end text-[11px]">
                                            {entityFilterField !== 'none' && entityFilterValue.trim() ? (
                                              <span className="px-2.5 py-1 rounded-full border border-cyan-700/50 bg-cyan-950/30 text-cyan-200">
                                                Lọc: {safeString(entityFilterFields.find((f) => f.id === entityFilterField)?.label || entityFilterField)} = "{entityFilterValue.trim()}"
                                              </span>
                                            ) : null}
                                            {entityGroupBy !== 'none' ? (
                                              <span className="px-2.5 py-1 rounded-full border border-amber-700/50 bg-amber-950/30 text-amber-200">
                                                Nhóm: {safeString(entityFilterFields.find((f) => f.id === entityGroupBy)?.label || entityGroupBy)}
                                              </span>
                                            ) : null}
                                          </div>
                                        )}
                                        {showEntityAdvanced && (
                                          <div className="w-full max-w-[760px] rounded-2xl border border-slate-800/90 bg-slate-950/90 p-3 shadow-xl space-y-2 animate-fade-in">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                              <AdvancedFieldSelect
                                                value={entityFilterField}
                                                onChange={setEntityFilterField}
                                                options={entityFilterOptions}
                                                active={entityFilterField !== 'none'}
                                              />
                                              <input type="text" placeholder={entityFilterField === 'none' ? 'Chọn trường rồi nhập giá trị lọc...' : 'Giá trị lọc theo trường...'} value={entityFilterValue} onChange={e=>setEntityFilterValue(e.target.value)} disabled={entityFilterField === 'none'} className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs font-serif outline-none focus:border-cyan-600/50 disabled:opacity-50 disabled:cursor-not-allowed" />
                                              <AdvancedFieldSelect
                                                value={entityGroupBy}
                                                onChange={setEntityGroupBy}
                                                options={entityGroupOptions}
                                                active={entityGroupBy !== 'none'}
                                              />
                                            </div>
                                            <p className="text-[11px] text-slate-500 font-serif">
                                              Lưu ý: <span className="text-slate-400">Tìm kiếm nhanh</span> và <span className="text-slate-400">Lọc theo trường</span> được áp dụng đồng thời.
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                   ) : (
                                      <button id="save-standard-btn" onClick={() => { if(isEditingMode) { handleSaveStandardEditor(); } else setIsEditingMode(true); const s = safeString(currentStandardData); setLivePreviewText(s); setDebouncedMarkdownPreview(s); }} className={`px-5 py-2 rounded-xl text-xs font-bold transition-colors shadow-lg flex items-center gap-2 ${isEditingMode ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-800 border border-slate-700 text-slate-300 hover:text-slate-100 hover:bg-slate-700'}`}>
                                         {isEditingMode ? <><Save size={16}/> Lưu (Ctrl+S)</> : <><Edit3 size={16}/> Chỉnh Sửa</>}
                                      </button>
                                   )}
                                </div>
                             </div>

                             {!activeTabNho && currentTabConfig?.subTabs?.length > 0 ? (
                                <div className="animate-fade-in mt-2">
                                   <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-6 flex items-center gap-2">
                                      <span className="w-4 h-px bg-slate-700"></span>
                                      Chọn chương mục để xem
                                      <span className="w-4 h-px bg-slate-700"></span>
                                   </p>
                                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                   {currentTabConfig.subTabs.map(sub => {
                                      const subData = activeNovelData?.data?.[activeTabLon]?.[sub.id];
                                      const entityCount = subData?.entities?.length || 0;
                                      const isCollection = sub.viewType === 'collection-track';
                                      return (
                                         <button key={sub.id} onClick={(e) => handleSelectTabNho(e, activeTabLon, sub)}
                                            className="bg-slate-900/60 border border-slate-800 hover:border-amber-600/40 rounded-2xl p-6 flex items-center gap-5 transition-all hover:shadow-[0_8px_24px_rgba(217,119,6,0.06)] group text-left">
                                            <div className="w-14 h-14 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 group-hover:text-amber-500 group-hover:border-amber-500/30 transition-all flex-shrink-0 shadow-inner group-hover:shadow-[0_0_12px_rgba(217,119,6,0.1)]">
                                               {isCollection ? <User size={26}/> : <BookOpen size={26}/>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                               <div className="font-heading text-lg text-slate-200 group-hover:text-amber-400 transition-colors truncate">{safeString(sub.label)}</div>
                                               <div className="text-xs text-slate-500 mt-1 font-serif flex items-center gap-2">
                                                  {isCollection ? (
                                                     <span className={`font-bold ${entityCount > 0 ? 'text-amber-600' : 'text-slate-600'}`}>{entityCount} thực thể</span>
                                                  ) : (
                                                     <span>{subData ? 'Có ghi chép' : 'Chưa có nội dung'}</span>
                                                  )}
                                               </div>
                                            </div>
                                            <ChevronRight size={18} className="text-slate-700 group-hover:text-amber-500 transition-colors flex-shrink-0" />
                                         </button>
                                      );
                                   })}
                                   </div>
                                </div>
                             ) : currentTabConfig?.viewType === 'collection-track' ? (
                                <div className="flex flex-col flex-1 h-full animate-fade-in">
                                  <AppCollectionTrackTabs
                                    collectionSubTab={collectionSubTab}
                                    setCollectionSubTab={setCollectionSubTab}
                                    galleryCount={galleryPortraitEntries.length}
                                    selectedEntityName={selectedEntity ? safeString(selectedEntity.name) : ''}
                                    selectedEntityMilestoneCount={selectedEntity?.milestones?.length || 0}
                                  />

                                   <div id="collection-scroll-container" className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
                                      <AppGalleryContent
                                        collectionSubTab={collectionSubTab}
                                        galleryPortraitEntries={galleryPortraitEntries}
                                        visibleGalleryEntries={visibleGalleryEntries}
                                        galleryHasMore={galleryHasMore}
                                        setGalleryVisiblePage={setGalleryVisiblePage}
                                        handleOpenEntityFromGallery={handleOpenEntityFromGallery}
                                        activeNovelDirHandle={activeNovelDirHandle}
                                        dirHandle={dirHandle}
                                      />
                                      <AppCollectionListContent
                                        collectionSubTab={collectionSubTab}
                                        entitiesList={entitiesList}
                                        entityPage={entityPage}
                                        setEntityPage={setEntityPage}
                                        entityGroupBy={entityGroupBy}
                                        pagedEntitiesList={pagedEntitiesList}
                                        groupedEntitiesList={groupedEntitiesList}
                                        groupVisibleCount={groupVisibleCount}
                                        setGroupVisibleCount={setGroupVisibleCount}
                                        currentTabConfig={currentTabConfig}
                                        onEntityCardSelect={onEntityCardSelect}
                                        onEntityCardDelete={onEntityCardDelete}
                                        onEntityCardAddMilestone={onEntityCardAddMilestone}
                                        currentContextDirHandle={currentContextDirHandle}
                                        activeTabLon={activeTabLon}
                                        entityPageSize={ENTITY_PAGE_SIZE}
                                      />

                                      <AppCollectionEmptyState
                                        show={(collectionSubTab === 'detail' || collectionSubTab === 'timeline') && !selectedEntity}
                                        onBackToList={() => setCollectionSubTab('list')}
                                      />

                                      {collectionSubTab === 'detail' && selectedEntity && (
                                         <div className="flex flex-col max-w-5xl mx-auto w-full animate-fade-in pb-10" onDragOver={e => e.preventDefault()} onDrop={e => handleImageDrop(e, 'entity-info-editor')}>
                                            <div className="flex justify-between items-start mb-8 pb-8 border-b border-slate-800/80">
                                               <div className="flex items-center gap-6">
                                                  <div
                                                     className="w-24 h-24 rounded-[40px] bg-slate-950 border-2 border-amber-500/40 overflow-hidden flex items-center justify-center text-4xl text-amber-500 font-bold shadow-[0_0_30px_rgba(245,158,11,0.15)] group cursor-zoom-in"
                                                     onClick={() => selectedEntity.avatar && setLightboxSrc(selectedEntity.avatar)}
                                                     title="Nhấp để xem ảnh đầy đủ"
                                                  >
                                                     {selectedEntity.avatar ? (
                                                        selectedEntity.avatar.startsWith('local_image:') ? (
                                                           <AsyncLocalImage filename={selectedEntity.avatar.replace('local_image:', '')} alt="avatar" dirHandle={currentContextDirHandle} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                        ) : <img src={selectedEntity.avatar} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMG; }} />
                                                     ) : safeString(selectedEntity.name).charAt(0).toUpperCase()}
                                                  </div>
                                                  <div className="flex flex-col">
                                                     <div className="flex items-center gap-3 mb-2">
                                                        <h2 className="text-4xl font-heading font-bold text-slate-100">{safeString(selectedEntity.name)}</h2>
                                                        <span className="px-3 py-1 bg-amber-900/30 text-amber-400 text-[10px] font-bold uppercase tracking-widest rounded-full border border-amber-700/30 shadow-inner">{safeString(selectedEntity.title) || 'Vô Danh'}</span>
                                                     </div>
                                                     <p className="text-slate-400 font-serif flex items-center gap-2"><Shield size={14} className="text-slate-500"/> {safeString(selectedEntity.status) || 'Chưa có trạng thái/cảnh giới'}</p>
                                                  </div>
                                               </div>
                                               <div className="flex items-center gap-2">
                                                 <button onClick={() => handleExportEntityPDF(selectedEntity, currentTabConfig)} className="px-4 py-2.5 bg-indigo-900/30 hover:bg-indigo-800/50 border border-indigo-700/40 text-indigo-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-md"><Download size={13}/> Xuất PDF</button>
                                                 <button onClick={handleOpenEditEntity} className="px-5 py-2.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-md"><Settings size={14}/> Thiết Lập Form</button>
                                               </div>
                                            </div>

                                            <AppEntitySummaryBlocks
                                              selectedEntity={selectedEntity}
                                              collectionSubTab={collectionSubTab}
                                              isEntityEditing={isEntityEditing}
                                              currentTabConfig={currentTabConfig}
                                              recentlyMergedFields={recentlyMergedFields}
                                              currentContextDirHandle={currentContextDirHandle}
                                              entityMap={entityMap}
                                              globalLinkRegex={globalLinkRegex}
                                              relatedEntities={relatedEntities}
                                              isCalculatingNetwork={isCalculatingNetwork}
                                              expandedRelations={expandedRelations}
                                              setExpandedRelations={setExpandedRelations}
                                              onNavigate={(dest) => navFnRef.current?.(dest)}
                                            />

                                            <AppEntityDetailNotes
                                              activeTabLon={activeTabLon}
                                              getTerms={getTerms}
                                              isEntityEditing={isEntityEditing}
                                              isExtractingAI={isExtractingAI}
                                              setIsExtractingAI={setIsExtractingAI}
                                              geminiApiKeys={geminiApiKeys}
                                              showToast={showToast}
                                              currentTabConfig={currentTabConfig}
                                              handleAIExtractSuccess={handleAIExtractSuccess}
                                              aiMode={aiMode}
                                              isSplitPreview={isSplitPreview}
                                              setLivePreviewText={setLivePreviewText}
                                              setDebouncedMarkdownPreview={setDebouncedMarkdownPreview}
                                              setIsSplitPreview={setIsSplitPreview}
                                              selectedEntity={selectedEntity}
                                              handleUpdateEntityInfo={handleUpdateEntityInfo}
                                              setIsEntityEditing={setIsEntityEditing}
                                              setImageForm={setImageForm}
                                              setIsInsertImageModalOpen={setIsInsertImageModalOpen}
                                              handlePickLocalImage={handlePickLocalImage}
                                              debouncedMarkdownPreview={debouncedMarkdownPreview}
                                              currentContextDirHandle={currentContextDirHandle}
                                              entityMap={entityMap}
                                              globalLinkRegex={globalLinkRegex}
                                              onNavigate={handleNavigate}
                                              memoizedEntityInfo={memoizedEntityInfo}
                                            />
                                         </div>
                                      )}

                                      <AppEntityTimelinePanel
                                        collectionSubTab={collectionSubTab}
                                        selectedEntity={selectedEntity}
                                        selectedMilestoneId={selectedMilestoneId}
                                        setSelectedMilestoneId={setSelectedMilestoneId}
                                        currentTabConfig={currentTabConfig}
                                        currentContextDirHandle={currentContextDirHandle}
                                        entityMap={entityMap}
                                        globalLinkRegex={globalLinkRegex}
                                        onNavigate={(dest) => navFnRef.current?.(dest)}
                                        setEditingMilestoneData={setEditingMilestoneData}
                                        setIsMilestoneModalOpen={setIsMilestoneModalOpen}
                                        handleMergeSnapshotToProfile={handleMergeSnapshotToProfile}
                                        handleDeleteMilestone={handleDeleteMilestone}
                                        getFieldValue={getFieldValue}
                                        setLightboxSrc={setLightboxSrc}
                                      />
                                   </div>
                                </div>
                             ) : (
                                <div className="flex-1 flex flex-col bg-slate-900/30 p-8 rounded-[40px] backdrop-blur-md border border-slate-800 min-h-[500px]" onDragOver={e => e.preventDefault()} onDrop={e => handleImageDrop(e, 'standard-editor')}>
                                   {isEditingMode ? (
                                      <div className="flex flex-col flex-1 animate-fade-in">
                                         <div className="flex items-center justify-between mb-1">
                                           <MarkdownToolbar editorId="standard-editor" onInsertImage={(eid) => { setImageForm({ url: '', alt: '', editorId: eid }); setIsInsertImageModalOpen(true); }} onPickLocalImage={handlePickLocalImage} />
                                           <button onClick={() => { const cur = document.getElementById('standard-editor')?.value; if(cur !== undefined) { setLivePreviewText(cur); setDebouncedMarkdownPreview(cur); } setIsSplitPreview(p => !p); }} className={`ml-2 px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0 transition-colors flex items-center gap-1.5 ${isSplitPreview ? 'bg-amber-700/30 text-amber-400 border border-amber-700/40' : 'bg-slate-800 text-slate-500 border border-slate-700 hover:text-slate-300'}`}>
                                             <Eye size={12}/> Preview
                                           </button>
                                         </div>
                                         <div className={`flex flex-1 gap-4 min-h-0 ${isSplitPreview ? 'flex-row' : 'flex-col'}`}>
                                           <textarea key={`${activeTabLon}-${activeTabNho}-${activeTabCon}`} id="standard-editor" className={`bg-transparent text-slate-200 font-serif text-lg leading-loose outline-none resize-none custom-scrollbar ${isSplitPreview ? 'w-1/2 flex-shrink-0' : 'flex-1'}`} defaultValue={safeString(currentStandardData)} placeholder="Hạ bút tại đây..." onChange={(e) => { if(isSplitPreview) setLivePreviewText(e.target.value); }} onPaste={() => { if(isSplitPreview) { setTimeout(() => { const v = document.getElementById('standard-editor')?.value; if (v !== undefined) setLivePreviewText(v); }, 0); } }} />
                                           {isSplitPreview && (
                                             <MarkdownPreviewPane
                                               text={debouncedMarkdownPreview}
                                               dirHandle={currentContextDirHandle}
                                               entityMap={entityMap}
                                               linkRegex={globalLinkRegex}
                                               onNavigate={handleNavigate}
                                               className="w-1/2 overflow-y-auto custom-scrollbar border-l border-slate-700 pl-4 font-serif"
                                             />
                                           )}
                                         </div>
                                      </div>
                                   ) : (
                                      <div className="font-serif animate-fade-in flex-1">
                                          {memoizedStandardData && <>{memoizedStandardData}</>}
                                      </div>
                                   )}
                                </div>
                             )}
                          </div>
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
        <ModalMilestone isOpen={isMilestoneModalOpen} onClose={() => setIsMilestoneModalOpen(false)} onSave={handleSaveMilestone} initialData={editingMilestoneData} defaultChapterWhenNew={editingMilestoneData ? undefined : String(Math.max(0, parseInt(activeNovelData?.readingAnchorChapter ?? activeNovelData?.chaptersRead ?? 0, 10) || 0))} tabConfig={currentTabConfig} onUpdateTemplate={handleUpdateTabTemplate} handleAvatarDrop={handleAvatarDrop} handlePickLocalImage={handlePickLocalImage} dirHandle={currentContextDirHandle} parentTabId={activeTabLon} parentLabel={currentTabConfig?._parentLabel} geminiApiKey={geminiApiKeys} geminiMode={aiMode} />
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
        <ModalAddNovel isOpen={isAddNovelOpen} onClose={() => setIsAddNovelOpen(false)} formData={novelForm} setFormData={setNovelForm} onSave={handleSaveNovelModal} mode={novelModalMode} handlePickLocalImage={(cb) => handlePickCoverImage(cb, novelForm.title)} dirHandle={currentContextDirHandle} />
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