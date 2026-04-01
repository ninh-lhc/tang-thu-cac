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
//   lib/stripWikiBrackets.js, lib/computeRelatedEntities.js, lib/entityFieldValue.js, lib/entityCollectionQuery.js
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
  FALLBACK_IMG, DEFAULT_ENTITY_FIELDS, GENRES, THEMES,
  INITIAL_TABS_CONFIG, MOCK_METADATA, MOCK_NOVEL_DATA,
  DEFAULT_FIELDS_MAP, DEFAULT_FIELDS_BY_PARENT,
  guessFieldsByLabel, isStockTemplate, mergeFieldsTemplate, lockFieldsTemplateIfFirstEntity,
  resolveFieldsTemplate,
} from './MasterEngines.js';
import {
  generateId, safeString, getTerms, sortTabsAlphabetically,
  AsyncLocalImage, renderMarkdown,
  getIconComponent, handleToolbarClick,
  analyzeCrossRefNoteWithAI, mapGeminiErrorToUserMessage
} from './MasterUtils.jsx';
import {
  MarkdownToolbar, AppHeader, LandingScreen, DashboardScreen,
  ModalEntity, ModalMilestone, ModalQuickCreate, ModalSettings,
  ModalConfirm, ModalInsertImage, ModalAddNovel, ModalDeepSearch, ModalInNovelSearch
} from './MasterComponents.jsx';
import { AppLibrarySidebar } from './AppLibrarySidebar.jsx';
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
import { migrateIndex, migrateBackup, migrateNovel } from './dataMigration.js';
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
import { buildWikiLinkMatcher } from './lib/wikiLinkMatcher.js';
import { findEquivalentEntityByName, mergeAliasText } from './lib/entityNameIdentity.js';
<<<<<<< HEAD
import { appendOwnerAcquisitionMilestone, parseOwnerTimelineHint } from './lib/autoOwnerMilestone.js';
import { applyAutoRelationNotesForEntity } from './lib/autoRelationDetailNote.js';
=======
import {
  appendOwnerAcquisitionMilestone,
  parseOwnerTimelineHint,
  parseOwnerTimelineHintDetailed,
  ownerTimelineHintReasonToMessage,
  removeOwnerAcquisitionMilestonesByItem,
  syncAutoOwnerMilestonesItemRename,
} from './lib/autoOwnerMilestone.js';
>>>>>>> 4b35a301709b800cf2b267f743bf440221e9b066

const AdvancedFieldSelect = React.memo(function AdvancedFieldSelect({
  value,
  onChange,
  options,
  placeholder = 'Chọn',
  active = false,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const optionRefs = useRef([]);
  const selected = options.find((opt) => opt.value === value);
  const selectedIndex = Math.max(0, options.findIndex((opt) => opt.value === value));
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
  useEffect(() => {
    if (!open) return;
    const next = optionRefs.current[selectedIndex] || optionRefs.current[0];
    if (next) next.focus();
  }, [open, selectedIndex]);

  const focusOptionByIndex = (idx) => {
    const max = options.length - 1;
    if (max < 0) return;
    const clamped = Math.max(0, Math.min(max, idx));
    optionRefs.current[clamped]?.focus();
  };
  return (
    <div ref={rootRef} className="relative min-w-0 z-40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(true);
          } else if (event.key === 'Escape' || event.key === 'Tab') {
            setOpen(false);
          }
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
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
        <div role="listbox" className="absolute z-[60] mt-1 w-full max-h-64 overflow-auto rounded-xl border border-slate-700 bg-slate-950 shadow-2xl custom-scrollbar animate-fade-in origin-top">
          {options.map((opt, idx) => (
            <button
              key={opt.value}
              ref={(el) => { optionRefs.current[idx] = el; }}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  focusOptionByIndex(idx + 1);
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  focusOptionByIndex(idx - 1);
                } else if (event.key === 'Home') {
                  event.preventDefault();
                  focusOptionByIndex(0);
                } else if (event.key === 'End') {
                  event.preventDefault();
                  focusOptionByIndex(options.length - 1);
                } else if (event.key === 'Escape' || event.key === 'Tab') {
                  setOpen(false);
                }
              }}
              role="option"
              aria-selected={opt.value === value}
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
  const menu2LeaveCollapseTimeoutRef = useRef(null);
  const [collapsedTabGroups, setCollapsedTabGroups] = useState(() => new Set());
  const [sidebarGrouped, setSidebarGrouped] = useState(true);
  const lastSyncedActiveTabRef = useRef(null);
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

  const handleMenu2MouseEnter = () => {
    if (menu2LeaveCollapseTimeoutRef.current) {
      clearTimeout(menu2LeaveCollapseTimeoutRef.current);
      menu2LeaveCollapseTimeoutRef.current = null;
    }
    setMenu2Expanded(true);
  };

  const handleMenu2MouseLeave = () => {
    if (menu2LeaveCollapseTimeoutRef.current) clearTimeout(menu2LeaveCollapseTimeoutRef.current);
    // Hysteresis để chuyển qua lại mượt hơn (giảm jitter khi hit-area đổi do transition)
    menu2LeaveCollapseTimeoutRef.current = setTimeout(() => {
      setMenu2Expanded(false);
      menu2LeaveCollapseTimeoutRef.current = null;
    }, 140);
  };

  useEffect(() => {
    return () => {
      if (menu2LeaveCollapseTimeoutRef.current) {
        clearTimeout(menu2LeaveCollapseTimeoutRef.current);
        menu2LeaveCollapseTimeoutRef.current = null;
      }
    };
  }, []);
  const [overviewForm, setOverviewForm] = useState(null);
  
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('all'); // 'all' | 'title' | 'author' | 'tag'
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
  const [showConnectReminder, setShowConnectReminder] = useState(false);
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

  /** Tổng thực thể / mốc — lưu trong index.json, không preload toàn bộ novel */
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
  }, [activeNovelData?.id, tabGroups]);

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

  /** Thực thể có kỷ nguyên trong [neo−12, neo+30] — mọi mục sưu tập */
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

  // Global map — toàn bộ truyện, dùng để resolve [[...]] link và renderMarkdown lookup.
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

  const librarySearchIndex = useMemo(
    () =>
      (novelsMetadata || []).map((n) => {
        let genres = [];
        if (Array.isArray(n.genres)) genres = n.genres;
        else if (typeof n.genres === 'string') genres = [n.genres];
        else if (n.genre) genres = [n.genre];
        const titleText = safeString(n.title).toLowerCase();
        const authorText = safeString(n.author).toLowerCase();
        const tagText = (n.tags || []).map((t) => safeString(t)).join(' ').toLowerCase();
        return {
          id: n.id,
          text: `${titleText} ${authorText} ${tagText}`,
          titleText,
          authorText,
          tagText,
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
        let matchSearch = true;
        if (q) {
          if (searchField === 'title') matchSearch = row.titleText.includes(q);
          else if (searchField === 'author') matchSearch = row.authorText.includes(q);
          else if (searchField === 'tag') matchSearch = row.tagText.includes(q);
          else matchSearch = row.text.includes(q);
        }
        const matchGenre = selected.length === 0 || selected.some((sg) => row.genres.includes(sg));
        return matchSearch && matchGenre;
      })
      .map((row) => byId.get(row.id))
      .filter(Boolean);
  }, [librarySearchIndex, novelsMetadata, deferredLibrarySearch, selectedGenres, searchField]);

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
    const timerId = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(timerId);
  }, [searchInput]);

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
    const q = searchQuery.trim();
    if (q.length < 2) return;
    try {
      const raw = localStorage.getItem('tangthu_lib_search_hist');
      let arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) arr = [];
      arr = [q, ...arr.filter((x) => safeString(x).toLowerCase() !== q.toLowerCase())].slice(0, 12);
      localStorage.setItem('tangthu_lib_search_hist', JSON.stringify(arr));
      setSearchHistory(arr);
    } catch { void 0; }
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

  const handleNavigate = useCallback((dest) => {
     if (dest.type === 'QUICK_CREATE') { setQuickCreateData(dest.name); return; }
     setNavHistory(prev => {
       const next = [...prev, { lonId: activeTabLon, nhoId: activeTabNho, conId: activeTabCon, entityId: selectedEntityId, subTab: collectionSubTab }];
       // Giữ lịch sử trong ngưỡng an toàn để tránh phình bộ nhớ khi điều hướng liên tục.
       return next.length > 120 ? next.slice(next.length - 120) : next;
     });
     setEntitySearch('');
     setRecentlyMergedFields(new Set());
     setActiveTabLon(dest.lonId);
     if (dest.nhoId) setActiveTabNho(dest.nhoId);
     if (dest.conId) setActiveTabCon(dest.conId); else setActiveTabCon(null);
     if (dest.entityId) { setSelectedEntityId(dest.entityId); setCollectionSubTab('detail'); } 
     else { setSelectedEntityId(null); setCollectionSubTab('list'); }
     setIsEditingMode(false); setIsEntityEditing(false);
  }, [activeTabLon, activeTabNho, activeTabCon, selectedEntityId, collectionSubTab, setEntitySearch]);

  const handleGoBack = useCallback(() => {
     if (navHistory.length === 0) return;
     const last = navHistory[navHistory.length - 1];
     setNavHistory(prev => prev.slice(0, -1));
     setActiveTabLon(last.lonId); setActiveTabNho(last.nhoId); setActiveTabCon(last.conId);
     setSelectedEntityId(last.entityId); setCollectionSubTab(last.subTab || 'list');
  }, [navHistory]);

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
        showToast(`«${quickName}» đã trùng thẻ có sẵn — đã thêm vào bí danh và liên kết về thẻ cũ.`, 'warning');
        handleNavigate({ lonId, nhoId, entityId: targetExistingId });
        return;
      }
      showToast(`Đã ngưng tụ thành công ${quickName}!`);
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
       setDirHandle("LOCAL_STORAGE"); setShowConnectReminder(true); showToast("Preview: Đã chuyển sang Local Storage.");
       const local = localStorage.getItem('tangthu_index');
      if (local) { try { const p = migrateIndex(JSON.parse(local)); if (p.metadata) setNovelsMetadata(p.metadata); const safeConfig = resolveSafeTabsConfig(p.config); setGlobalTabsConfig(safeConfig); const stats = p.novelStats && typeof p.novelStats === 'object' ? p.novelStats : {}; if (p.novelStats && typeof p.novelStats === 'object') { novelStatsByIdRef.current = p.novelStats; setNovelStatsById(p.novelStats); } if (!Array.isArray(p.config) || p.config.length === 0) void syncIndex(p.metadata || [], safeConfig, 'LOCAL_STORAGE', stats); } catch { void 0; } }
       return;
    }
    try {
      const h = await window.showDirectoryPicker({ mode: 'readwrite' });
      let fileHandle, file, content;
      try {
        fileHandle = await h.getFileHandle('index.json');
        file = await fileHandle.getFile(); content = await file.text();
      } catch {
         try {
             const oldHandle = await h.getFileHandle('db.json'); const oldFile = await oldHandle.getFile(); const oldContent = await oldFile.text(); const parsedOld = JSON.parse(oldContent);
             if (parsedOld.novels) {
                 showToast("Đang thực hiện độ kiếp (Migrate) cấu trúc thư mục...");
                 const newMeta = parsedOld.novels.map(n => ({ id: n.id, title: n.title, author: n.author, genres: n.genres || (n.genre ? [n.genre] : []), theme: n.theme || 'theme-tien-hiep', status: n.status, rating: n.rating, tags: n.tags || [], chaptersRead: n.chaptersRead, chaptersTotal: n.chaptersTotal, cover: n.cover, review: n.review }));
                 const novelsDir = await h.getDirectoryHandle('novels', { create: true });
                for (const n of parsedOld.novels) {
                    const migratedNovel = migrateNovel(n);
                     const fh = await novelsDir.getFileHandle(`${n.id}.json`, { create: true }); const wr = await fh.createWritable();
                    await wr.write(JSON.stringify(migratedNovel, null, 2)); await wr.close();
                 }
                 const ih = await h.getFileHandle('index.json', { create: true }); const iw = await ih.createWritable();
                const safeConfig = resolveSafeTabsConfig(parsedOld.config);
                await iw.write(JSON.stringify({ metadata: newMeta, config: safeConfig, novelStats: {} }, null, 2)); await iw.close();
                setNovelsMetadata(newMeta); setGlobalTabsConfig(safeConfig);
                setDirHandle(h); setShowConnectReminder(true); setActiveNovelData(null); setActiveNovelDirHandle(null); showToast("Độ kiếp thành công! Cấu trúc mới đã sẵn sàng."); return;
             }
         } catch { setDirHandle(h); setShowConnectReminder(true); setActiveNovelData(null); setActiveNovelDirHandle(null); showToast("Thư mục trống. Đã kết nối Mệnh Bàn!"); return; }
      }
      if (content) {
        try {
          const parsed = JSON.parse(content);
          const index = migrateIndex(parsed);
          if (index.metadata) setNovelsMetadata(index.metadata);
          const safeConfig = resolveSafeTabsConfig(index.config);
          setGlobalTabsConfig(safeConfig);
          const stats = index.novelStats && typeof index.novelStats === 'object' ? index.novelStats : {};
          if (index.novelStats && typeof index.novelStats === 'object') {
            novelStatsByIdRef.current = index.novelStats;
            setNovelStatsById(index.novelStats);
          } else {
            setNovelStatsById({});
            novelStatsByIdRef.current = {};
          }
          if (!Array.isArray(index.config) || index.config.length === 0) {
            void syncIndex(index.metadata || [], safeConfig, h, stats);
          }
          setDirHandle(h);
          setShowConnectReminder(true);
          setActiveNovelData(null);
          setActiveNovelDirHandle(null);
          showToast("Đã tải Mệnh Bàn (Index) thành công!");
        } catch {
          showToast("LỖI CHÍ MẠNG: File index.json bị hỏng cấu trúc.", "error");
        }
      }
    } catch { void 0; }
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
        const loaded = await loadNovelData(meta, dirHandle);
        if (loaded?.novel) allData.novels[meta.id] = loaded.novel;
      }
      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TangThuCac_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Đã xuất backup đầy đủ (index + thống kê + từng truyện).");
    } catch {
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
    } catch {
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
          const safeConfig = resolveSafeTabsConfig(backup.config);
          setGlobalTabsConfig(safeConfig);
          setNovelsMetadata(backup.metadata);
          novelsMetadataRef.current = backup.metadata;
          const stats = backup.novelStats && typeof backup.novelStats === 'object' ? backup.novelStats : {};
          novelStatsByIdRef.current = stats;
          setNovelStatsById(stats);
          setImportProgress({ stage: 'Đang ghi danh mục...', current: 0, total: 1 });
          await syncIndex(backup.metadata, safeConfig, dirHandle, stats);
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
      } catch {
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
          try { const nHandle = await dirHandle.getDirectoryHandle(folderName, { create: true }); setActiveNovelDirHandle(nHandle); } catch { void 0; }
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
      } catch { showToast("Thất bại khi lưu ảnh!", "error"); } finally { setIsUploading(false); }
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
      } catch { showToast("Thất bại khi lưu ảnh!", "error"); } finally { setIsUploading(false); }
    }
  };

  // Ảnh bìa luôn lưu vào ROOT/images/ vì cần hiển thị ngoài context truyện (sidebar, dashboard)
  const handlePickCoverImage = async (setAvatarCallback) => {
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

  const handleSaveEntity = (formData, dynamicData, opts = null) => {
    const copyRawToInfo = Boolean(opts && opts.copyRawToInfo);
    const prev = activeNovelData ? structuredClone(activeNovelData) : null;
    const isCreate = !formData.id;
    const newEntityId = isCreate ? generateId('ent') : formData.id;
    const ownerTimelineHintDetail = isCreate
      ? parseOwnerTimelineHintDetailed({
        dynamicData,
        fieldsTemplate: currentTabConfig?.fieldsTemplate || [],
        rawText: formData.rawText,
      })
      : { hint: null, reason: 'no_owner_hint' };
    const ownerTimelineHint = ownerTimelineHintDetail?.hint || null;
    let createTargetEntityId = null;
    let createMergedToExisting = false;
    let ownerMilestoneAutoApplied = false;
    let ownerMilestoneRenameSynced = 0;
    updateActiveNovelData(nov => {
       if (!nov.data) nov.data = {}; if (!nov.data[activeTabLon]) nov.data[activeTabLon] = {};
       let tabData = nov.data[activeTabLon][activeTabNho || 'default'];
       if (typeof tabData === 'string' || !tabData) { tabData = { overview: typeof tabData === 'string' ? tabData : '', entities: [] }; }
       if (!tabData.entities) tabData.entities = [];
       if (formData.id) { 
          const idx = tabData.entities.findIndex(e => e.id === formData.id);
         if (idx > -1) {
          const prevName = safeString(tabData.entities[idx].name).trim();
           const prevImages = Array.isArray(tabData.entities[idx].images) ? tabData.entities[idx].images : [];
           const prevDyn = tabData.entities[idx].dynamicData || {};
           const mergedDyn = { ...prevDyn, ...dynamicData };
           const statusLine = safeString(mergedDyn.f_status).trim();
           tabData.entities[idx] = {
             ...tabData.entities[idx],
             name: formData.name,
             avatar: formData.avatar,
             rawText: formData.rawText,
             status: statusLine,
             dynamicData: mergedDyn,
             images: prevImages,
           };
<<<<<<< HEAD
           applyAutoRelationNotesForEntity(nov, {
             sourceEntity: tabData.entities[idx],
             sourceLonId: activeTabLon,
             sourceParentLabel: currentTabConfig?._parentLabel || '',
             statusLine,
           });
=======
          const nextName = safeString(formData.name).trim();
          if (activeTabLon !== 'nhan-vat' && prevName && nextName && prevName !== nextName) {
            ownerMilestoneRenameSynced = syncAutoOwnerMilestonesItemRename(nov, {
              entityId: formData.id,
              oldName: prevName,
              newName: nextName,
            });
          }
>>>>>>> 4b35a301709b800cf2b267f743bf440221e9b066
         }
       } else {
         const mergedNew = { ...dynamicData };
         const statusLine = safeString(mergedNew.f_status).trim();
        const canonicalName = safeString(formData.name).trim();
        const matched = findEquivalentEntityByName(tabData.entities, canonicalName);
        if (matched?.entity) {
          createTargetEntityId = matched.entity.id;
          createMergedToExisting = true;
          const prevAlias = safeString(matched.entity.dynamicData?.f_alias);
          const mergedAlias = mergeAliasText(prevAlias, canonicalName);
          if (mergedAlias !== prevAlias) {
            if (!matched.entity.dynamicData) matched.entity.dynamicData = {};
            matched.entity.dynamicData.f_alias = mergedAlias;
          }
          applyAutoRelationNotesForEntity(nov, {
            sourceEntity: matched.entity,
            sourceLonId: activeTabLon,
            sourceParentLabel: currentTabConfig?._parentLabel || '',
            statusLine,
          });
        } else {
          const baseInfo = copyRawToInfo ? formData.rawText : '';
          tabData.entities.push({ id: newEntityId, name: canonicalName, avatar: formData.avatar, rawText: formData.rawText, status: statusLine, dynamicData: mergedNew, info: baseInfo, milestones: [], images: [] });
          const created = tabData.entities[tabData.entities.length - 1];
          applyAutoRelationNotesForEntity(nov, {
            sourceEntity: created,
            sourceLonId: activeTabLon,
            sourceParentLabel: currentTabConfig?._parentLabel || '',
            statusLine,
          });
          createTargetEntityId = newEntityId;
          lockFieldsTemplateIfFirstEntity(nov, activeTabLon, activeTabNho || 'default');
          if (activeTabLon !== 'nhan-vat' && ownerTimelineHint) {
            ownerMilestoneAutoApplied = appendOwnerAcquisitionMilestone(nov, ownerTimelineHint, {
              name: canonicalName,
              entityId: newEntityId,
            });
          }
        }
       }

        // Nếu user bật tùy chọn copy: thay thế info để hiển thị wiki link đầy đủ ở tab Ghi Chép Chi Tiết.
        if (copyRawToInfo && formData.id) {
          const idx2 = tabData.entities.findIndex(e => e.id === formData.id);
          if (idx2 > -1) tabData.entities[idx2].info = formData.rawText;
        }

       nov.data[activeTabLon][activeTabNho || 'default'] = tabData;
    });

    // UX: tạo thẻ xong thì tự vào tab Hồ Sơ + bật chế độ ghi chép chi tiết.
    if (isCreate && createTargetEntityId) {
      setSelectedEntityId(createTargetEntityId);
      setSelectedMilestoneId(null);
      setEditingMilestoneData(null);
      setCollectionSubTab('detail');
      setIsEditingMode(false);
      setIsEntityEditing(true);
    }

    const saveToastMsg = formData.id
      ? "Đã tu bổ lại Thực Thể!"
      : createMergedToExisting
        ? "Tên mới trùng thẻ cũ — đã thêm vào bí danh và liên kết về thẻ hiện có."
        : ownerMilestoneAutoApplied
          ? "Đã ngưng tụ Thực Thể mới và tự ghi mốc cho Nhân Vật sở hữu."
          : "Đã ngưng tụ Thực Thể mới!";
    const saveToastLevel = formData.id || !createMergedToExisting ? "success" : "warning";
    showToast(saveToastMsg, saveToastLevel, prev ? {
      undoLabel: "Hoàn tác", onUndo: () => {
        setActiveNovelData(structuredClone(prev));
        void (syncNovelRef.current && syncNovelRef.current(prev, dirHandleRef.current));
      }
    } : null);
    if (ownerMilestoneRenameSynced > 0) {
      showToast(`Đã đồng bộ ${ownerMilestoneRenameSynced} mốc auto theo tên mới của thẻ.`, 'success');
    }
    const ownerWarn = ownerTimelineHintReasonToMessage(ownerTimelineHintDetail?.reason);
    if (!ownerMilestoneAutoApplied && ownerWarn && activeTabLon !== 'nhan-vat') {
      showToast(ownerWarn, 'warning');
    }
  };

  const handleAddImageToSelectedEntity = async () => {
    if (!selectedEntityId) {
      showToast('Vui lòng chọn thẻ trước khi thêm ảnh.', 'warning');
      return;
    }
    await handlePickLocalImage((url) => {
      updateActiveNovelData((nov) => {
        if (!nov.data?.[activeTabLon]) return;
        const tabData = nov.data[activeTabLon][activeTabNho || 'default'];
        const ent = tabData?.entities?.find((e) => e.id === selectedEntityId);
        if (!ent) return;
        if (!Array.isArray(ent.images)) ent.images = [];
        ent.images.push(safeString(url));
      });
    }, null, 'gallery');
  };

  const handleRemoveImageFromSelectedEntity = (imageIndex) => {
    if (!selectedEntityId) return;
    updateActiveNovelData((nov) => {
      if (!nov.data?.[activeTabLon]) return;
      const tabData = nov.data[activeTabLon][activeTabNho || 'default'];
      const ent = tabData?.entities?.find((e) => e.id === selectedEntityId);
      if (!ent || !Array.isArray(ent.images)) return;
      ent.images = ent.images.filter((_, idx) => idx !== imageIndex);
    });
    showToast('Đã xóa ảnh khỏi BST thẻ.');
  };

  const handleUpdateEntityInfo = (content) => {
    const ownerTimelineHintDetail = activeTabLon !== 'nhan-vat'
      ? parseOwnerTimelineHintDetailed({
        dynamicData: selectedEntity?.dynamicData || {},
        fieldsTemplate: currentTabConfig?.fieldsTemplate || [],
        rawText: content,
      })
      : { hint: null, reason: 'no_owner_hint' };
    const ownerTimelineHint = ownerTimelineHintDetail?.hint || null;
    let ownerMilestoneAutoApplied = false;

    updateActiveNovelData(nov => {
       if (!nov.data?.[activeTabLon]) return;
       const tabData = nov.data[activeTabLon][activeTabNho || 'default'];
       const ent = tabData?.entities?.find(e => e.id === selectedEntityId);
       if(ent) {
         ent.info = content;
         // Network “Mạng Lưới Nhân Quả” đang đọc [[...]] từ rawText của thẻ.
         // Đồng bộ để network vẫn tròn khi bạn viết ở “Ghi Chép Chi Tiết”.
         ent.rawText = content;
         if (ownerTimelineHint) {
          ownerMilestoneAutoApplied = appendOwnerAcquisitionMilestone(nov, ownerTimelineHint, {
            name: ent.name,
            entityId: ent.id,
          });
         }
       }
    });
    showToast(
      ownerMilestoneAutoApplied
        ? "Ghi chép hồ sơ thành công! Đã tự ghi mốc sở hữu vào timeline Nhân Vật."
        : "Ghi chép hồ sơ thành công!"
    );
    const ownerWarn = ownerTimelineHintReasonToMessage(ownerTimelineHintDetail?.reason);
    if (!ownerMilestoneAutoApplied && ownerWarn && activeTabLon !== 'nhan-vat') {
      showToast(ownerWarn, 'warning');
    }
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
          const prevMilestoneId = selectedMilestoneId;
          updateActiveNovelData(nov => {
             if (!nov.data?.[activeTabLon]) return;
             const tabData = nov.data[activeTabLon][activeTabNho || 'default'];
             const ent = tabData?.entities?.find(e => e.id === selectedEntityId);
             if (ent && ent.milestones) ent.milestones = ent.milestones.filter(m => m.id !== msId);
          });
          setSelectedMilestoneId(null);
          if (prev) {
            showToast('Đã xóa mốc.', 'success', {
              undoLabel: 'Hoàn tác xóa',
              onUndo: () => {
                setActiveNovelData(structuredClone(prev));
                setSelectedMilestoneId(prevMilestoneId || null);
                void (syncNovelRef.current && syncNovelRef.current(prev, dirHandleRef.current));
              },
            });
          }
       }
    });
  };

  const handleReplaceMilestones = (nextMilestones, toastMessage = 'Đã cập nhật mốc.') => {
    const prev = activeNovelData ? structuredClone(activeNovelData) : null;
    const nextArr = Array.isArray(nextMilestones) ? nextMilestones : [];

    updateActiveNovelData((nov) => {
      if (!nov.data?.[activeTabLon]) return;
      const tabData = nov.data[activeTabLon][activeTabNho || 'default'];
      const ent = tabData?.entities?.find((e) => e.id === selectedEntityId);
      if (!ent) return;
      ent.milestones = nextArr;
    });

    if (selectedMilestoneId && !nextArr.some((m) => m?.id === selectedMilestoneId)) {
      setSelectedMilestoneId(null);
    }

    if (toastMessage && typeof showToast === 'function') {
      showToast(toastMessage, 'success', prev
        ? {
          undoLabel: 'Hoàn tác',
          onUndo: () => {
            setActiveNovelData(structuredClone(prev));
            void (syncNovelRef.current && syncNovelRef.current(prev, dirHandleRef.current));
          },
        }
        : null
      );
    }
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
      let removedEntityName = '';
      for (const lonId of Object.keys(updated.data || {})) {
        const lonData = updated.data[lonId];
        if (!lonData || typeof lonData !== 'object') continue;
        for (const nhoId of Object.keys(lonData)) {
          const tabData = lonData[nhoId];
          if (!tabData?.entities) continue;
          const idx = tabData.entities.findIndex(e => e.id === entityIdToDelete);
          if (idx >= 0) {
            removedEntityName = safeString(tabData.entities[idx]?.name).trim();
            tabData.entities.splice(idx, 1);
            removed = true;
            break;
          }
        }
        if (removed) break;
      }
      if (removed) {
        let removedAutoMsCount = 0;
        if (removedEntityName) {
          removedAutoMsCount = removeOwnerAcquisitionMilestonesByItem(updated, {
            name: removedEntityName,
            entityId: entityIdToDelete,
          });
        }
        const nextStats = { ...novelStatsByIdRef.current, [updated.id]: countEntitiesInNovel(updated) };
        novelStatsByIdRef.current = nextStats;
        setNovelStatsById(nextStats);
        setActiveNovelData(updated);
        syncNovelRef.current?.(updated, dirHandleRef.current);
        if (prevSelectedId === entityIdToDelete) setSelectedEntityId(null);
        const deleteMsg = removedAutoMsCount > 0
          ? `Đã xóa thẻ và dọn ${removedAutoMsCount} mốc auto liên quan.`
          : 'Đã xóa thẻ.';
        showToast(deleteMsg, 'success', {
          undoLabel: 'Hoàn tác xóa',
          onUndo: () => {
            setActiveNovelData(prev);
            if (prevSelectedId) setSelectedEntityId(prevSelectedId);
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
  }, [activeTabLon, activeTabNho, handleNavigate]);
  const onEntityCardDelete = (ent) => {
    handleDeleteEntity(ent.id);
  };
  const onEntityCardAddMilestone = useCallback((ent) => {
    setSelectedEntityId(ent.id);
    setCollectionSubTab('timeline');
    setTimeout(() => { setEditingMilestoneData(null); setIsMilestoneModalOpen(true); }, 100);
  }, []);

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
          if (mergedKeys.has('f_status')) {
            ent.status = safeString(ent.dynamicData.f_status).trim();
          }
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
          // Tránh tích lũy nhiều animation "smooth" khi người dùng chuyển tab nhanh.
          if (mainScroller) mainScroller.scrollTo({ top: 0, behavior: 'auto' });
          if (colScroller) colScroller.scrollTo({ top: 0, behavior: 'auto' });
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

    // Chỉ preload một tab khi có tabAt; KHÔNG dùng mảng rỗng [] — [] truthy sẽ gửi shardKeys rỗng và loadNovel chỉ nạp 0 shard (mất dữ liệu trong RAM).
    const loadNovelOpts =
      tabAt?.lonId != null && String(tabAt.lonId).length > 0
        ? { shardKeys: [{ lonId: tabAt.lonId, nhoId: tabAt.nhoId || 'default' }] }
        : undefined;
    const loaded = await loadNovelData(meta, dirHandle, loadNovelOpts);
    if (loaded?.novel) {
      const data = loaded.novel;
      const recoveredFromBackup = Boolean(data.__recoveredFromBackup);
      if (recoveredFromBackup) delete data.__recoveredFromBackup;
      setActiveNovelDirHandle(loaded.novelDir ?? null);
      if (!data.tabsConfig) data.tabsConfig = structuredClone(globalTabsConfig);
      const migrated = migrateTabsFieldTemplates(data);
      setActiveNovelData(migrated);
      if (recoveredFromBackup) {
        showToast('Đã tự khôi phục dữ liệu truyện từ file backup.', 'warning');
      }
      if (!migrated.__partialData) {
        const s = countEntitiesInNovel(migrated);
        const prevS = novelStatsByIdRef.current[migrated.id];
        const statsChanged = !prevS || prevS.entities !== s.entities || prevS.milestones !== s.milestones;
        const nextStats = { ...novelStatsByIdRef.current, [migrated.id]: s };
        novelStatsByIdRef.current = nextStats;
        setNovelStatsById(nextStats);
        if (statsChanged && dirHandle) {
          void syncIndex(novelsMetadataRef.current, globalTabsConfigRef.current, dirHandle, nextStats);
        }
      }
      if (migrated !== data) syncNovel(migrated, dirHandle);
      if (tabAt?.lonId) {
        setActiveTabLon(tabAt.lonId);
        setActiveTabNho(tabAt.nhoId || null);
        setCollectionSubTab('list');
      }
    } else {
      setActiveNovelDirHandle(null);
      if (dirHandle && dirHandle !== 'LOCAL_STORAGE') {
        showToast(
          'Không đọc được dữ liệu truyện trên đĩa. Hãy mở đúng thư mục Mệnh Bàn đã dùng khi lưu; kiểm tra thư mục con trùng folderName/id trong index. Không tạo hồ sơ rỗng để tránh ghi đè mất dữ liệu.',
          'error'
        );
        setActiveNovelData(null);
      } else {
        const newData = { ...meta, data: {}, tabsConfig: structuredClone(globalTabsConfig) };
        setActiveNovelData(newData);
      }
    }
    setIsUploading(false);
  };

  useEffect(() => {
    const run = async () => {
      if (!activeNovelData || !dirHandle || dirHandle === 'LOCAL_STORAGE') return;
      if (activeNovelData.storageLayout !== 'sharded') return;
      const lonId = activeTabLon;
      const nhoId = activeTabNho || 'default';
      if (!lonId || !nhoId) return;
      if (activeNovelData.data?.[lonId]?.[nhoId]) return;
      const key = `${activeNovelData.id}|${lonId}|${nhoId}`;
      if (lazyTabLoadInFlightRef.current.has(key)) return;
      lazyTabLoadInFlightRef.current.add(key);
      try {
        const partialLoaded = await loadNovelData(activeNovelData, dirHandle, { shardKeys: [{ lonId, nhoId }] });
        const partial = partialLoaded?.novel;
        if (partial?.data?.[lonId]?.[nhoId]) {
          setActiveNovelData((prev) => {
            if (!prev || prev.id !== activeNovelData.id) return prev;
            const next = structuredClone(prev);
            if (!next.data) next.data = {};
            if (!next.data[lonId]) next.data[lonId] = {};
            next.data[lonId][nhoId] = partial.data[lonId][nhoId];
            return next;
          });
        }
      } finally {
        lazyTabLoadInFlightRef.current.delete(key);
      }
    };
    void run();
  }, [activeNovelData, activeTabLon, activeTabNho, dirHandle, loadNovelData]);

  useEffect(() => {
    const run = async () => {
      if (!activeNovelData || !dirHandle || dirHandle === 'LOCAL_STORAGE') return;
      if (activeNovelData.storageLayout !== 'sharded' || !activeNovelData.__partialData) return;
      if (activeTabLon !== 'tong-quan') return;
      const key = activeNovelData.id;
      if (lazyFullHydrateInFlightRef.current.has(key)) return;
      lazyFullHydrateInFlightRef.current.add(key);
      try {
        const fullLoaded = await loadNovelData(activeNovelData, dirHandle);
        const fullData = fullLoaded?.novel;
        if (fullData && !fullData.__partialData) {
          setActiveNovelData((prev) => {
            if (!prev || prev.id !== key) return prev;
            return fullData;
          });
          deepSearchIndexByNovelIdRef.current.set(
            fullData.id,
            buildNovelSearchIndex(fullData)
          );
          const s = countEntitiesInNovel(fullData);
          const nextStats = { ...novelStatsByIdRef.current, [fullData.id]: s };
          novelStatsByIdRef.current = nextStats;
          setNovelStatsById(nextStats);
          void syncIndex(novelsMetadataRef.current, globalTabsConfigRef.current, dirHandle, nextStats);
        }
      } finally {
        lazyFullHydrateInFlightRef.current.delete(key);
      }
    };
    void run();
  }, [activeNovelData, activeTabLon, dirHandle, loadNovelData, syncIndex]);


  const toggleGenre = (genre) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
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
  }, [activeTabLon, isEditingMode, isEntityEditing, setEntitySearch]);

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
  }, [setEntitySearch]);

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
  handleSelectNovelRef.current = handleSelectNovel;
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
          SIDEBAR_ITEM_HEIGHT={SIDEBAR_ITEM_HEIGHT}
          sidebarNovelItems={sidebarNovelItems}
        />

        <div className={`flex-1 flex bg-slate-950 transition-opacity duration-300 ${menu1Visible ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          {!activeNovelData ? (
            <>
              {showConnectReminder && !!dirHandle && (
                <div className="mx-10 mt-6 mb-0 rounded-2xl border border-amber-700/40 bg-amber-900/20 px-5 py-4 text-sm text-amber-100 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold uppercase tracking-widest text-[11px] text-amber-300 mb-1">Nhắc nhở vận hành</p>
                    <p className="font-serif text-amber-100/90">Đã kết nối thư mục. Nên backup thư mục lưu trữ định kỳ (tuần/tháng), và thử restore trên bản sao trước khi cập nhật lớn.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowConnectReminder(false)}
                    className="px-3 py-1.5 rounded-lg border border-amber-600/40 text-amber-200 hover:bg-amber-800/30 text-xs font-bold"
                  >
                    Đã rõ
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
              <div
                className={`bg-slate-900 border-r border-slate-800 transition-[width] duration-200 ease-out flex flex-col z-20 flex-shrink-0 h-full ${menu2Expanded ? 'w-64' : 'w-12'}`}
                onMouseEnter={handleMenu2MouseEnter}
                onMouseLeave={handleMenu2MouseLeave}
              >
                <div className="p-4 border-b border-slate-800 h-16 flex items-center justify-between overflow-hidden whitespace-nowrap"
                >
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
                            <div
                              key={grp.groupLabel || 'tong-quan'}
                              className={`${menu2Expanded ? 'px-3' : 'px-1'} mb-1`}
                            >
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
                                   <span
                                     className={`flex-1 min-w-0 text-left truncate transition-[opacity,max-width] duration-150 ${
                                       menu2Expanded ? 'opacity-100 max-w-[999px]' : 'opacity-0 max-w-0 overflow-hidden'
                                     }`}
                                   >
                                     {grp.groupLabel}
                                   </span>
                                   <span
                                     className={`text-slate-600 transition-[opacity,max-width] duration-150 ${
                                       menu2Expanded ? 'opacity-100 max-w-[999px]' : 'opacity-0 max-w-0 overflow-hidden'
                                     }`}
                                   >
                                     ({grp.tabs.length})
                                   </span>
                                 </button>
                               ) : null}
                               {(!grp.groupLabel || !isCollapsed) && grp.tabs.map(tab => {
                                 const isActive = activeTabLon === tab.id;
                                 return (
                                   <div key={tab.id} className="mb-1">
                                    <button
                                      onClick={() => handleSelectTabLon(tab.id)}
                                      className={`w-full flex items-center rounded-lg transition-colors overflow-hidden whitespace-nowrap ${
                                        menu2Expanded ? 'p-3 justify-start' : 'p-2 justify-center'
                                      } ${isActive && !activeTabNho ? 'bg-amber-900/20 text-amber-400 border-l-2 border-amber-500' : 'text-slate-500 hover:bg-slate-800 border-l-2 border-transparent'}`}
                                    >
                                       <div className="w-5 flex justify-center flex-shrink-0">{getIconComponent(tab.iconName)}</div>
                                       <span
                                         className={`font-serif text-sm transition-[opacity,max-width,margin-left] duration-200 ${
                                           menu2Expanded
                                             ? 'ml-3 opacity-100 max-w-[999px]'
                                             : 'ml-0 opacity-0 max-w-0 overflow-hidden'
                                         }`}
                                       >
                                         {safeString(tab.label)}
                                       </span>
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
                            <div key={tab.id} className={`${menu2Expanded ? 'px-3' : 'px-1'} mb-1`}>
                              <button
                                onClick={() => handleSelectTabLon(tab.id)}
                                className={`w-full flex items-center rounded-lg transition-colors overflow-hidden whitespace-nowrap ${
                                  menu2Expanded ? 'p-3 justify-start' : 'p-2 justify-center'
                                } ${isActive && !activeTabNho ? 'bg-amber-900/20 text-amber-400 border-l-2 border-amber-500' : 'text-slate-500 hover:bg-slate-800 border-l-2 border-transparent'}`}
                              >
                                 <div className="w-5 flex justify-center flex-shrink-0">{getIconComponent(tab.iconName)}</div>
                                 <span
                                   className={`font-serif text-sm transition-[opacity,max-width,margin-left] duration-200 ${
                                     menu2Expanded
                                       ? 'ml-3 opacity-100 max-w-[999px]'
                                       : 'ml-0 opacity-0 max-w-0 overflow-hidden'
                                   }`}
                                 >
                                   {safeString(tab.label)}
                                 </span>
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
                               <button onClick={handleGoBack} className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-400 transition-colors font-bold uppercase tracking-widest bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-800 w-fit shadow-sm"><ChevronLeft size={14}/> Quay Lại Dấu Vết Cũ</button>
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
                            handleSelectTabNho={handleSelectTabNho}
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
