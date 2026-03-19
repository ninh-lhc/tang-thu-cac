// ==========================================
// TRỤ 4: TRẬN NHÃN TRUNG TÂM
// File: App.jsx
// Vai trò: State toàn cục, điều phối, layout chính, Quản lý Thư mục Truyện
//
// Đã tách (cùng thư mục src/, tên dễ nhớ):
//   appNhatKyVaGoiThe.js     — findEntitiesByHintInNovel, mutateNovelJournalSelections
//   AppPhongChuVaTheme.jsx   — font + CSS theme toàn cục
//   AppModalMotCua.jsx       — Một cửa cập nhật (tạo thẻ / nhật ký batch)
//   AppModalQuanLyTab.jsx    — Trận pháp / quản lý tab
//   AppModalLenhNhanh.jsx    — Command palette
//   AppModalGoiYNoiTraCuu.jsx — Gợi ý AI nối tra cứu
//   lib/stripWikiBrackets.js, lib/computeRelatedEntities.js
// ==========================================

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Search, BookOpen, Filter, ChevronRight, ChevronLeft, ChevronDown,
  User, Hexagon, Settings, Edit3, Network, Plus, Trash2, Edit2,
  X, Save, Check, Library, Sparkles, Cloud, History, LayoutGrid, Clock,
  AlignLeft, Shield, Link2, Download, Eye, TrendingUp, BarChart2, BookMarked, Users, Layers, Activity,
  Images, GitBranch
} from 'lucide-react';
import {
  apiKey, FALLBACK_IMG, DEFAULT_ENTITY_FIELDS, GENRES, THEMES,
  INITIAL_TABS_CONFIG, MOCK_METADATA, MOCK_NOVEL_DATA,
  DEFAULT_FIELDS_MAP, DEFAULT_FIELDS_BY_PARENT,
  guessFieldsByLabel, isStockTemplate
} from './MasterEngines.js';
import {
  generateId, safeString, getTerms, sortTabsAlphabetically,
  AsyncLocalImage, processPlainTextWithLinks, renderMarkdown,
  getIconComponent, handleToolbarClick, processInline,
  extractEntityAttributesWithAI, analyzeTextWithAI, generateReviewWithAI,
  analyzeCrossRefNoteWithAI, analyzeReadingJournalWithAI, truncateForAI, mapGeminiErrorToUserMessage
} from './MasterUtils.jsx';
import {
  MarkdownToolbar, AppHeader, LandingScreen, DashboardScreen, EntityCard,
  ModalEntity, ModalMilestone, ModalQuickCreate, ModalSettings,
  ModalConfirm, ModalInsertImage, ModalAddNovel, ModalDeepSearch, ModalInNovelSearch
} from './MasterComponents.jsx';
import { MarkdownPreviewPane } from './MarkdownPreviewPane.jsx';
import {
  searchNovelData,
  dedupeDeepSearchResults,
  countEntitiesInNovel,
  metadataSearchHits,
} from './deepSearchCore.js';
import { stripWikiBracketSyntax } from './lib/stripWikiBrackets.js';
import { computeRelatedEntities } from './lib/computeRelatedEntities.js';
import { findEntitiesByHintInNovel, mutateNovelJournalSelections } from './appNhatKyVaGoiThe.js';
import { AppPhongChuVaTheme } from './AppPhongChuVaTheme.jsx';
import { AppModalMotCua } from './AppModalMotCua.jsx';
import { AppModalQuanLyTab } from './AppModalQuanLyTab.jsx';
import { AppModalLenhNhanh } from './AppModalLenhNhanh.jsx';
import { AppModalGoiYNoiTraCuu } from './AppModalGoiYNoiTraCuu.jsx';
import { migrateIndex, migrateNovel, migrateBackup } from './dataMigration.js';

export default function App() {
  const [novelsMetadata, setNovelsMetadata] = useState(MOCK_METADATA);
  const [activeNovelData, setActiveNovelData] = useState(null); 

  const [globalTabsConfig, setGlobalTabsConfig] = useState(INITIAL_TABS_CONFIG);
  
  const [menu1Visible, setMenu1Visible] = useState(false);
  const [hoveredNovelId, setHoveredNovelId] = useState(null);
  const [hoveredNovelData, setHoveredNovelData] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [menu2Expanded, setMenu2Expanded] = useState(true);
  const [activeTabLon, setActiveTabLon] = useState('tong-quan');
  const [activeTabNho, setActiveTabNho] = useState(null);
  const [activeTabCon, setActiveTabCon] = useState(null);
  
  const [selectedEntityId, setSelectedEntityId] = useState(null);
  const [entitySearch, setEntitySearch] = useState('');
  const [entitySortMode, setEntitySortMode] = useState('newest');
  const [entityGroupBy, setEntityGroupBy] = useState('none'); // none | field_id
  const [entityPage, setEntityPage] = useState(1);
  const ENTITY_PAGE_SIZE = 24; 
  
  const [collectionSubTab, setCollectionSubTab] = useState('list'); 
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
  const [overviewStatsOpen, setOverviewStatsOpen] = useState(false);
  const librarySearchInputRef = useRef(null);
  const commandPaletteOpenRef = useRef(false);
  commandPaletteOpenRef.current = isCommandPaletteOpen;
  
  const [dirHandle, setDirHandle] = useState(null);
  const [activeNovelDirHandle, setActiveNovelDirHandle] = useState(null);
  
  const [toastMessage, setToastMessage] = useState(null);
  const [lightboxSrc, setLightboxSrc] = useState(null); // null = đóng, string = URL/local_image
  const [isUploading, setIsUploading] = useState(false);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');
  const [isInsertImageModalOpen, setIsInsertImageModalOpen] = useState(false);
  const [imageForm, setImageForm] = useState({ url: '', alt: '', editorId: 'standard-editor' });
  
  const [editingTab, setEditingTab] = useState(null);
  const [isGenreFilterOpen, setIsGenreFilterOpen] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState([]);

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

  /** Tổng thực thể / mốc — lưu trong index.json, không preload toàn bộ novel */
  const [novelStatsById, setNovelStatsById] = useState({});
  const [isStatsBackfilling, setIsStatsBackfilling] = useState(false);
  const novelStatsByIdRef = useRef({});
  const novelsMetadataRef = useRef(novelsMetadata);
  const globalTabsConfigRef = useRef(globalTabsConfig);
  const dirHandleRef = useRef(dirHandle);
  const syncNovelRef = useRef(null);
  const persistIndexStatsTimerRef = useRef(null);

  useEffect(() => {
    novelsMetadataRef.current = novelsMetadata;
    globalTabsConfigRef.current = globalTabsConfig;
    dirHandleRef.current = dirHandle;
  }, [novelsMetadata, globalTabsConfig, dirHandle]);

  useEffect(() => {
    novelStatsByIdRef.current = novelStatsById;
  }, [novelStatsById]);
  useEffect(() => () => {
    if (persistIndexStatsTimerRef.current) clearTimeout(persistIndexStatsTimerRef.current);
  }, []);

  const dashboardStats = useMemo(() => {
    const total = novelsMetadata.length;
    const byStatus = { 'Đang đọc': 0, 'Hoàn thành': 0, 'Tạm ngưng': 0 };
    const byGenre = {};
    let totalChaptersRead = 0, totalChaptersAll = 0;
    novelsMetadata.forEach(n => {
      const s = n.status || 'Đang đọc';
      byStatus[s] = (byStatus[s] || 0) + 1;
      const genres = Array.isArray(n.genres) ? n.genres : (n.genre ? [n.genre] : []);
      genres.forEach(g => { byGenre[g] = (byGenre[g] || 0) + 1; });
      totalChaptersRead += parseInt(n.chaptersRead || 0);
      if (n.chaptersTotal && n.chaptersTotal !== '???') totalChaptersAll += parseInt(n.chaptersTotal || 0);
    });
    let totalEntities = 0, totalMilestones = 0;
    novelsMetadata.forEach((n) => {
      const st = novelStatsById[n.id];
      if (st) {
        totalEntities += st.entities || 0;
        totalMilestones += st.milestones || 0;
      }
    });
    const topGenre = Object.entries(byGenre).sort((a,b)=>b[1]-a[1])[0];
    const recentNovels = [...novelsMetadata].slice(0, 5);
    return { total, byStatus, byGenre, totalChaptersRead, totalChaptersAll, totalEntities, totalMilestones, recentNovels, topGenre };
  }, [novelsMetadata, novelStatsById]);

  const activeThemeClass = useMemo(() => {
      if (!activeNovelData) return 'theme-tien-hiep';
      return activeNovelData.theme || 'theme-tien-hiep';
  }, [activeNovelData]);

  const currentContextDirHandle = useMemo(() => {
      if (!dirHandle || dirHandle === 'LOCAL_STORAGE') return dirHandle;
      if (!activeNovelDirHandle) return dirHandle;

      return {
          getDirectoryHandle: async (name, options) => {
              if (name === 'images') {
                  let novelImagesDir;
                  try { novelImagesDir = await activeNovelDirHandle.getDirectoryHandle('images', options); } 
                  catch(e) { if (options?.create) novelImagesDir = await activeNovelDirHandle.getDirectoryHandle('images', { create: true }); }
                  let rootImagesDir;
                  try { rootImagesDir = await dirHandle.getDirectoryHandle('images'); } catch(e) {}

                  if (!novelImagesDir && !rootImagesDir) throw new Error("Images dir not found");

                  return {
                      getFileHandle: async (filename, fileOptions) => {
                          if (fileOptions?.create) {
                              if (!novelImagesDir) novelImagesDir = await activeNovelDirHandle.getDirectoryHandle('images', { create: true });
                              return novelImagesDir.getFileHandle(filename, fileOptions);
                          }
                          try {
                              if (novelImagesDir) return await novelImagesDir.getFileHandle(filename, fileOptions);
                              throw new Error();
                          } catch (e) {
                              if (rootImagesDir) return await rootImagesDir.getFileHandle(filename, fileOptions);
                              throw e;
                          }
                      }
                  };
              }
              return activeNovelDirHandle.getDirectoryHandle(name, options);
          },
          getFileHandle: (name, options) => activeNovelDirHandle.getFileHandle(name, options)
      };
  }, [dirHandle, activeNovelDirHandle]);

  const activeTabs = useMemo(() => activeNovelData?.tabsConfig || globalTabsConfig, [activeNovelData, globalTabsConfig]);
  const sortedTabs = useMemo(() => sortTabsAlphabetically(activeTabs), [activeTabs]);
  const dirName = typeof dirHandle === 'string' ? 'Bộ nhớ đệm' : (dirHandle?.name || '');
  
  const currentTabConfig = useMemo(() => {
    if (!activeTabLon) return null;
    const parent = sortedTabs.find(t => t.id === activeTabLon);
    const tab = parent?.subTabs?.find(s => s.id === activeTabNho) || parent;
    if (!tab) return null;
    // Tự động bổ sung/nâng cấp fieldsTemplate cho tab collection-track
    if (tab.viewType === 'collection-track') {
      const targetTemplate =
        DEFAULT_FIELDS_MAP[tab.id] ||
        DEFAULT_FIELDS_BY_PARENT[parent?.id] ||
        guessFieldsByLabel(tab.label || '') ||
        guessFieldsByLabel(parent?.label || '');
      if (targetTemplate) {
        const cur = tab.fieldsTemplate;
        // Nâng cấp khi: chưa có template, rỗng, hoặc toàn stock f_xxx và ngắn hơn/bằng target
        const needsUpgrade = !cur || cur.length === 0 ||
          (cur.every(f => /^f_/.test(f.id)) && cur.length <= targetTemplate.length);
        if (needsUpgrade) return { ...tab, fieldsTemplate: targetTemplate, _parentLabel: parent?.label || '' };
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

  const entitiesList = useMemo(() => {
    if (!activeNovelData || !activeTabLon || !currentTabConfig || currentTabConfig.viewType !== 'collection-track') return [];
    const tabData = activeNovelData.data?.[activeTabLon]?.[activeTabNho || 'default'];
    if (!tabData || typeof tabData === 'string') return [];
    let list = tabData.entities ? [...tabData.entities] : [];
    if (entitySearch.trim()) {
        const q = entitySearch.toLowerCase();
        list = list.filter(e => {
            if (e.name?.toLowerCase().includes(q)) return true;
            if (e.title?.toLowerCase().includes(q)) return true;
            if (e.info?.toLowerCase().includes(q)) return true;
            if (e.dynamicData && Object.values(e.dynamicData).some(v => typeof v === 'string' && v.toLowerCase().includes(q))) return true;
            return false;
        });
    }
    if (entitySortMode === 'name_asc') list.sort((a,b) => a.name.localeCompare(b.name, 'vi'));
    else if (entitySortMode === 'milestones') list.sort((a,b) => (b.milestones?.length || 0) - (a.milestones?.length || 0));
    else if (entitySortMode === 'newest') list.reverse();
    return list;
  }, [activeNovelData, activeTabLon, activeTabNho, currentTabConfig, entitySearch, entitySortMode]);

  const galleryPortraitEntries = useMemo(() => {
    if (!activeNovelData) return [];
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
  }, [activeNovelData, globalTabsConfig]);

  /** Thực thể có kỷ nguyên trong [neo−12, neo+30] — mọi mục sưu tập */
  const nearChapterEntitiesGlobal = useMemo(() => {
    if (!activeNovelData) return [];
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
  }, [activeNovelData, globalTabsConfig]);

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
  useEffect(() => { setEntityPage(1); }, [entitySearch, entitySortMode, entityGroupBy, activeTabLon, activeTabNho]);

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

  const entityMap = useMemo(() => {
    if (!activeNovelData) return [];
    let map = [];
    const addNames = (nameStr, dest) => {
        if (!nameStr || typeof nameStr !== 'string') return;
        nameStr.split(/[,/|()]/).forEach(n => {
            const cleanName = n.trim();
            if (cleanName.length >= 2 && cleanName.length <= 40) map.push({ name: cleanName, dest });
        });
    };
    Object.keys(activeNovelData.data || {}).forEach(lonId => {
        Object.keys(activeNovelData.data[lonId] || {}).forEach(nhoId => {
            const tabData = activeNovelData.data[lonId][nhoId];
            if (tabData && tabData.entities) {
                tabData.entities.forEach(ent => {
                    const dest = { lonId, nhoId, entityId: ent.id };
                    addNames(ent.name, dest);
                    if (ent.dynamicData) addNames(ent.dynamicData.f_alias, dest);
                });
            }
        });
    });
    
    const uniqueMap = [];
    const seen = new Set();
    map.forEach(item => {
        const lower = item.name.toLowerCase();
        if (!seen.has(lower)) { seen.add(lower); uniqueMap.push(item); }
    });
    return uniqueMap.sort((a,b) => b.name.length - a.name.length);
  }, [activeNovelData]);

  const globalLinkRegex = useMemo(() => {
     if (!entityMap || entityMap.length === 0) return null;
     const sortedNames = entityMap.map(e => e.name);
     if (sortedNames.length === 0) return null;
     const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
     return new RegExp(`(${sortedNames.map(escapeRegExp).join('|')})`, 'gi');
  }, [entityMap]);

  const [relatedEntities, setRelatedEntities] = useState([]);
  const [isCalculatingNetwork, setIsCalculatingNetwork] = useState(false);

  useEffect(() => {
    if (!activeNovelData || !selectedEntity) {
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
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      setIsCalculatingNetwork(false);
    };
  }, [activeNovelData, selectedEntity, activeTabs, entityMap, wikiExactMatchOnly]);

  // BẢO VỆ CHỐNG CRASH KHI LỌC THỂ LOẠI
  const filteredNovelsList = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return novelsMetadata.filter(n => {
      const t = safeString(n.title).toLowerCase();
      const au = safeString(n.author).toLowerCase();
      const matchSearch = !q || t.includes(q) || au.includes(q);
      
      let nGenres = [];
      if (Array.isArray(n.genres)) nGenres = n.genres;
      else if (typeof n.genres === 'string') nGenres = [n.genres];
      else if (n.genre) nGenres = [n.genre];

      const matchGenre = selectedGenres.length === 0 || selectedGenres.some(sg => nGenres.includes(sg));
      return matchSearch && matchGenre;
    });
  }, [novelsMetadata, searchQuery, selectedGenres]);

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
      setOverviewForm({ status: activeNovelData.status, chaptersRead: activeNovelData.chaptersRead, chaptersTotal: activeNovelData.chaptersTotal, rating: activeNovelData.rating, review: activeNovelData.review });
      setIsAddingTag(false); setNewTagValue('');
    }
  }, [activeNovelData]); 

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
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  const buildXrefEntityCatalog = useCallback(() => {
    if (!activeNovelData?.tabsConfig) return '';
    const lines = [];
    (activeNovelData.tabsConfig || []).forEach((lon) => {
      if (lon.id === 'tong-quan') return;
      (lon.subTabs || []).forEach((sub) => {
        if (sub.viewType !== 'collection-track') return;
        const ents = activeNovelData.data?.[lon.id]?.[sub.id]?.entities || [];
        const names = ents.map((e) => safeString(e.name)).filter(Boolean).slice(0, 100);
        lines.push(
          `${lon.id}|${sub.id} | ${safeString(lon.label)} › ${safeString(sub.label)} | ${names.join(', ') || '(chưa có thẻ)'}`
        );
      });
    });
    return lines.join('\n');
  }, [activeNovelData]);

  const findEntitiesByXrefHint = useCallback(
    (hint) => findEntitiesByHintInNovel(activeNovelData, hint),
    [activeNovelData]
  );

  const resolveXrefTargetCollectionTab = useCallback(
    (tabLonId, tabNhoId) => {
      const cfg = activeNovelData?.tabsConfig || globalTabsConfig || [];
      const lon = cfg.find((t) => t.id === tabLonId);
      const nho = lon?.subTabs?.find((s) => s.id === tabNhoId && s.viewType === 'collection-track');
      if (lon && nho) return { lonId: lon.id, nhoId: nho.id };
      const nv = cfg.find((t) => t.id === 'nhan-vat');
      const nvSub = nv?.subTabs?.find((s) => s.viewType === 'collection-track');
      if (nv && nvSub) return { lonId: nv.id, nhoId: nvSub.id };
      for (const L of cfg) {
        if (L.id === 'tong-quan') continue;
        const st = L.subTabs?.find((s) => s.viewType === 'collection-track');
        if (st) return { lonId: L.id, nhoId: st.id };
      }
      return null;
    },
    [activeNovelData, globalTabsConfig]
  );

  const runXrefAiForRow = useCallback(
    async (xref) => {
      if (!activeNovelData || geminiApiKeys.length === 0) {
        showToast('Cần API Key (Cài đặt) để gợi ý AI.', 'warning');
        return;
      }
      setXrefAiPanel({ xref, suggestions: [], loading: true, error: '' });
      try {
        const catalog = buildXrefEntityCatalog();
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
    [activeNovelData, geminiApiKeys, buildXrefEntityCatalog, showToast]
  );

  const applyXrefSuggestionNewEntity = useCallback(
    (s, xref) => {
      const path = resolveXrefTargetCollectionTab(s.tabLonId, s.tabNhoId);
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
      resolveXrefTargetCollectionTab,
      activeTabLon,
      activeTabNho,
      activeTabCon,
      selectedEntityId,
      collectionSubTab,
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

  const openOverviewHub = useCallback(() => {
    if (!activeNovelData) return;
    setOverviewHubOpen(true);
    setOverviewHubTab('create');
    setHubCreatePreview(null);
    setHubUpdatePanel(null);
    setHubCreateInput('');
    const a = Math.max(0, parseInt(activeNovelData.readingAnchorChapter ?? activeNovelData.chaptersRead ?? 0, 10) || 0);
    setHubUpdateChapter(String(a));
    let firstPath = '';
    (activeTabs || []).forEach((lon) => {
      if (lon.id === 'tong-quan') return;
      (lon.subTabs || []).forEach((nho) => {
        if (nho.viewType === 'collection-track' && !firstPath) firstPath = `${lon.id}|${nho.id}`;
      });
    });
    setHubCreatePath(firstPath);
  }, [activeNovelData, activeTabs]);

  const hubRunCreateAi = useCallback(async () => {
    if (!hubCreatePath) {
      showToast('Chọn mục sưu tập.', 'warning');
      return;
    }
    const raw = hubCreateInput.trim();
    if (!raw) {
      showToast('Nhập mô tả hoặc dán văn bản.', 'warning');
      return;
    }
    if (!activeNovelData || geminiApiKeys.length === 0) {
      showToast('Cần API Key (Cài đặt).', 'warning');
      return;
    }
    const [lonId, nhoId] = hubCreatePath.split('|');
    const lon = activeTabs.find((t) => t.id === lonId);
    const nho = lon?.subTabs?.find((s) => s.id === nhoId);
    const fieldsTemplate = nho?.fieldsTemplate || [];
    setHubCreateBusy(true);
    try {
      const result = await analyzeTextWithAI(raw, fieldsTemplate, geminiApiKeys);
      const dynamicData = {};
      (fieldsTemplate || []).forEach((f) => {
        if (result && result[f.id]) dynamicData[f.id] = safeString(result[f.id]);
      });
      const name = safeString(result?.name).trim() || 'Chưa đặt tên';
      const proc = safeString(result?.processedText);
      // "Một cửa" chỉ ghi nhanh: không lưu cú pháp [[wiki]] (link/ảnh làm trong đúng thẻ)
      const rawText = stripWikiBracketSyntax(proc || raw);
      const ents = activeNovelData.data?.[lonId]?.[nhoId]?.entities || [];
      if (ents.some((e) => safeString(e.name).trim().toLowerCase() === name.toLowerCase())) {
        showToast(`Đã có thẻ «${name}» — chuyển sang tab Cập nhật.`, 'warning');
        setOverviewHubTab('update');
        setHubUpdateText(`Cập nhật về «${name}»: ${raw.slice(0, 3500)}`);
        return;
      }
      setHubCreatePreview({ name, rawText, dynamicData });
    } catch (e) {
      showToast(mapGeminiErrorToUserMessage(e), 'error');
    } finally {
      setHubCreateBusy(false);
    }
  }, [hubCreatePath, hubCreateInput, activeNovelData, activeTabs, geminiApiKeys, showToast]);

  const hubSaveCreateEntity = useCallback(() => {
    if (!hubCreatePreview || !hubCreatePath.includes('|')) return;
    const [lonId, nhoId] = hubCreatePath.split('|');
    const name = safeString(hubCreatePreview.name).trim();
    if (!name || name === 'Chưa đặt tên') {
      showToast('Điền tên thẻ trước khi lưu.', 'warning');
      return;
    }
    const ents = activeNovelData?.data?.[lonId]?.[nhoId]?.entities || [];
    if (ents.some((e) => safeString(e.name).trim().toLowerCase() === name.toLowerCase())) {
      showToast('Thẻ đã tồn tại — dùng tab Cập nhật.', 'warning');
      setOverviewHubTab('update');
      setHubUpdateText((t) => (safeString(t).trim() ? t : `Cập nhật về «${name}»: `));
      return;
    }
    updateActiveNovelData((nov) => {
      if (!nov.data) nov.data = {};
      if (!nov.data[lonId]) nov.data[lonId] = {};
      let td = nov.data[lonId][nhoId];
      if (!td || typeof td === 'string') td = { overview: typeof td === 'string' ? td : '', entities: [] };
      if (!td.entities) td.entities = [];
      td.entities.push({
        id: generateId('ent'),
        name,
        avatar: '',
        rawText: stripWikiBracketSyntax(safeString(hubCreatePreview.rawText)),
        dynamicData: { ...hubCreatePreview.dynamicData },
        info: '',
        milestones: [],
      });
      nov.data[lonId][nhoId] = td;
    });
    showToast(`Đã tạo «${name}». Ảnh avatar: mở đúng mục → thẻ để thêm.`, 'success');
    setHubCreatePreview(null);
    setHubCreateInput('');
  }, [hubCreatePreview, hubCreatePath, activeNovelData, showToast]);

  const runHubUpdateAi = useCallback(async () => {
    const text = hubUpdateText.trim();
    if (!text) {
      showToast('Nhập nội dung cập nhật.', 'warning');
      return;
    }
    if (!activeNovelData || geminiApiKeys.length === 0) {
      showToast('Cần API Key (Cài đặt).', 'warning');
      return;
    }
    const ch = Math.max(
      0,
      parseInt(hubUpdateChapter, 10) ||
        parseInt(activeNovelData.readingAnchorChapter ?? activeNovelData.chaptersRead ?? 0, 10) ||
        0
    );
    setHubUpdatePanel({
      chapter: String(ch),
      sourceText: text,
      suggestions: [],
      selectedKeys: new Set(),
      loading: true,
      error: '',
    });
    try {
      const lines = [];
      (activeNovelData.tabsConfig || []).forEach((lon) => {
        if (lon.id === 'tong-quan') return;
        (lon.subTabs || []).forEach((sub) => {
          if (sub.viewType !== 'collection-track') return;
          const ents = activeNovelData.data?.[lon.id]?.[sub.id]?.entities || [];
          const names = ents.map((e) => safeString(e.name)).filter(Boolean).slice(0, 80);
          const fields = (sub.fieldsTemplate || [])
            .map((f) => safeString(f.label))
            .filter(Boolean)
            .join('; ');
          lines.push(
            `${lon.id}|${sub.id} | ${safeString(lon.label)} › ${safeString(sub.label)} | Thẻ: ${names.join(', ') || '—'} | Trường: ${fields || '—'}`
          );
        });
      });
      const { suggestions } = await analyzeReadingJournalWithAI(geminiApiKeys, {
        novelTitle: activeNovelData.title,
        chapter: ch,
        journalText: text,
        extendedCatalog: lines.join('\n'),
      });
      const list = Array.isArray(suggestions) ? suggestions : [];
      const normalized = list.map((sug) => ({
        ...sug,
        draftRawText: stripWikiBracketSyntax(safeString(sug.draftRawText)),
        eventText: stripWikiBracketSyntax(safeString(sug.eventText)),
        profileNote: stripWikiBracketSyntax(safeString(sug.profileNote)),
        why: stripWikiBracketSyntax(safeString(sug.why)),
        fieldPatches: Array.isArray(sug.fieldPatches)
          ? sug.fieldPatches.map((p) => ({
              ...p,
              value: stripWikiBracketSyntax(safeString(p.value)),
            }))
          : sug.fieldPatches,
      }));
      setHubUpdatePanel({
        chapter: String(ch),
        sourceText: text,
        suggestions: normalized,
        selectedKeys: new Set(list.map((_, i) => `j-${i}`)),
        loading: false,
        error: '',
      });
    } catch (e) {
      setHubUpdatePanel((p) =>
        p ? { ...p, loading: false, error: mapGeminiErrorToUserMessage(e) } : p
      );
    } finally {
      setHubUpdatePanel((p) => (p?.loading ? { ...p, loading: false } : p));
    }
  }, [hubUpdateText, hubUpdateChapter, activeNovelData, geminiApiKeys, showToast]);

  const applyHubUpdateSelected = useCallback(() => {
    if (!hubUpdatePanel?.suggestions?.length) return;
    if (!hubUpdatePanel.selectedKeys?.size) {
      showToast('Chọn ít nhất một dòng gợi ý.', 'warning');
      return;
    }
    const panel = hubUpdatePanel;
    const prevNovel = activeNovelData ? structuredClone(activeNovelData) : null;
    let ok = 0;
    let fails = [];
    updateActiveNovelData((nov) => {
      const r = mutateNovelJournalSelections(nov, panel);
      ok = r.ok;
      fails = r.fails;
      if (r.ok > 0 && panel.sourceText) {
        if (!nov.readingJournal) nov.readingJournal = [];
        nov.readingJournal.unshift({
          id: generateId('jr'),
          chapter: r.chapterCtx,
          text: `[Hub] ${panel.sourceText.slice(0, 7800)}`,
          at: Date.now(),
          appliedCount: ok,
        });
        if (nov.readingJournal.length > 50) nov.readingJournal.length = 50;
      }
    });
    setHubUpdatePanel(null);
    setHubUpdateText('');
    if (ok > 0) {
      showToast(`Đã áp dụng ${ok} thao tác (cập nhật).${fails.length ? ` (${fails.length} bỏ qua)` : ''}`, 'success', {
        onUndo:
          prevNovel
            ? () => {
                setActiveNovelData(structuredClone(prevNovel));
                void (syncNovelRef.current && syncNovelRef.current(prevNovel, dirHandleRef.current));
              }
            : undefined,
      });
    } else {
      showToast(fails.length ? fails.slice(0, 4).join('; ') : 'Không áp dụng được.', 'warning');
    }
    if (ok > 0 && fails.length) {
      setTimeout(() => showToast(`Một số dòng lỗi: ${fails.slice(0, 3).join('; ')}`, 'warning'), 400);
    }
  }, [hubUpdatePanel, showToast, activeNovelData]);

  useEffect(() => {
    if (!isSplitPreview) return;
    const delay = (livePreviewText || '').length > 40000 ? 800 : 300;
    const t = setTimeout(() => setDebouncedMarkdownPreview(livePreviewText), delay);
    return () => clearTimeout(t);
  }, [livePreviewText, isSplitPreview]);

  const syncIndex = async (newMetadata, newConfig, dir, novelStatsOverride) => {
    const novelStats =
      novelStatsOverride !== undefined && novelStatsOverride !== null
        ? novelStatsOverride
        : { ...novelStatsByIdRef.current };
    const payload = { metadata: newMetadata, config: newConfig, novelStats };
    if (!dir || dir === 'LOCAL_STORAGE') {
        try { localStorage.setItem('tangthu_index', JSON.stringify(payload)); }
        catch (e) { if (e.name === 'QuotaExceededError' || e.message.includes('quota')) setTimeout(() => { showToast("CẢNH BÁO: Bộ nhớ đệm đã đầy!", "warning"); }, 500); }
        return;
    }
    try {
        const f = await dir.getFileHandle('index.json', { create: true });
        const w = await f.createWritable();
        await w.write(JSON.stringify(payload, null, 2));
        await w.close();
    } catch (e) { setTimeout(() => { showToast("Lỗi đồng bộ danh mục!", "error"); }, 0); }
  };

  const queuePersistNovelStatsToIndex = () => {
    if (persistIndexStatsTimerRef.current) clearTimeout(persistIndexStatsTimerRef.current);
    persistIndexStatsTimerRef.current = setTimeout(() => {
      persistIndexStatsTimerRef.current = null;
      const d = dirHandleRef.current;
      if (!d) return;
      syncIndex(novelsMetadataRef.current, globalTabsConfigRef.current, d, { ...novelStatsByIdRef.current });
    }, 500);
  };

  const bumpNovelStatsAfterWrite = (novelData) => {
    const s = countEntitiesInNovel(novelData);
    const next = { ...novelStatsByIdRef.current, [novelData.id]: s };
    novelStatsByIdRef.current = next;
    setNovelStatsById(next);
    queuePersistNovelStatsToIndex();
  };

  const syncNovel = async (novelData, rootDir) => {
    if (!rootDir || rootDir === 'LOCAL_STORAGE') {
        try {
          localStorage.setItem(`tangthu_novel_${novelData.id}`, JSON.stringify(novelData));
          bumpNovelStatsAfterWrite(novelData);
        }
        catch (e) { if (e.name === 'QuotaExceededError' || e.message.includes('quota')) setTimeout(() => { showToast("CẢNH BÁO: Tràn bộ nhớ! Hãy dùng Thư Mục Máy Tính!", "warning"); }, 500); }
        return;
    }
    const folderName = novelData.folderName || novelData.title.replace(/[\\/:*?"<>|]/g, '').trim() || novelData.id;
    const jsonStr = JSON.stringify(novelData, null, 2);
    const mainFile = `${folderName}.json`;
    const tmpFile = `${folderName}.json.tmp`;
    const tryAtomic = async () => {
      const novelDir = await rootDir.getDirectoryHandle(folderName, { create: true });
      const tw = await novelDir.getFileHandle(tmpFile, { create: true });
      const w = await tw.createWritable();
      await w.write(jsonStr);
      await w.close();
      try { await novelDir.removeEntry(mainFile); } catch (_) { /* first save */ }
      const tmpAgain = await novelDir.getFileHandle(tmpFile);
      if (typeof tmpAgain.move === 'function') {
        await tmpAgain.move(mainFile);
      } else {
        const out = await novelDir.getFileHandle(mainFile, { create: true });
        const wo = await out.createWritable();
        await wo.write(jsonStr);
        await wo.close();
        try { await novelDir.removeEntry(tmpFile); } catch (_) {}
      }
      await novelDir.getDirectoryHandle('images', { create: true });
    };
    const tryDirect = async () => {
      const novelDir = await rootDir.getDirectoryHandle(folderName, { create: true });
      const f = await novelDir.getFileHandle(mainFile, { create: true });
      const w = await f.createWritable();
      await w.write(jsonStr);
      await w.close();
      await novelDir.getDirectoryHandle('images', { create: true });
    };
    try {
      await tryAtomic();
      bumpNovelStatsAfterWrite(novelData);
    } catch (e) {
      try {
        await tryDirect();
        bumpNovelStatsAfterWrite(novelData);
      } catch (e2) {
        setTimeout(() => { showToast(`Lỗi đồng bộ truyện ${novelData.title}!`, "error"); }, 0);
      }
    }
  };
  syncNovelRef.current = syncNovel;

  const loadNovelData = async (meta, rootDir) => {
    if (!rootDir || rootDir === 'LOCAL_STORAGE') {
        const data = localStorage.getItem(`tangthu_novel_${meta.id}`);
        if (!data) return null;
        try { return migrateNovel(JSON.parse(data)); } catch(e) { console.warn(`[TTC] Dữ liệu bị hỏng cho truyện ${meta.id}, bỏ qua.`, e); return null; }
    }
    const folderName = meta.folderName || meta.title.replace(/[\\/:*?"<>|]/g, '').trim() || meta.id;
    try {
        const novelDir = await rootDir.getDirectoryHandle(folderName);
        const f = await novelDir.getFileHandle(`${folderName}.json`);
        const file = await f.getFile();
        const text = await file.text();
        try { return migrateNovel(JSON.parse(text)); } catch(pe) { console.warn(`[TTC] File JSON bị hỏng: ${folderName}.json`, pe); return null; }
    } catch (e) {
        try {
            const novelsDir = await rootDir.getDirectoryHandle('novels');
            const f = await novelsDir.getFileHandle(`${meta.id}.json`);
            const file = await f.getFile();
            const text = await file.text();
            try { return migrateNovel(JSON.parse(text)); } catch(pe) { console.warn(`[TTC] File JSON bị hỏng: ${meta.id}.json`, pe); return null; }
        } catch(err2) { return null; }
    }
  };

  useEffect(() => {
    if (!dirHandle || novelsMetadata.length === 0) return;
    let cancelled = false;
    const root = dirHandle;
    const run = async () => {
      const need = novelsMetadata.filter((m) => !novelStatsByIdRef.current[m.id]);
      if (need.length === 0 || cancelled) return;
      setIsStatsBackfilling(true);
      try {
        const acc = { ...novelStatsByIdRef.current };
        const chunk = 2;
        for (let i = 0; i < need.length; i += chunk) {
          if (cancelled) return;
          const batch = need.slice(i, i + chunk);
          await Promise.all(
            batch.map(async (meta) => {
              try {
                const d = await loadNovelData(meta, root);
                acc[meta.id] = d ? countEntitiesInNovel(d) : { entities: 0, milestones: 0 };
              } catch {
                acc[meta.id] = { entities: 0, milestones: 0 };
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
    [novelsMetadata, activeNovelData, dirHandle]
  );

  const updateActiveNovelData = (updateFn) => {
    if (!activeNovelData) return;
    const updatedData = structuredClone(activeNovelData);
    updateFn(updatedData);
    const nextStats = { ...novelStatsByIdRef.current, [updatedData.id]: countEntitiesInNovel(updatedData) };
    novelStatsByIdRef.current = nextStats;
    setNovelStatsById(nextStats);
    setActiveNovelData(updatedData);
    syncNovel(updatedData, dirHandle);

    const newMetaStr = JSON.stringify({ title: updatedData.title, cover: updatedData.cover, tags: updatedData.tags, review: updatedData.review, status: updatedData.status, genres: updatedData.genres || [updatedData.genre], theme: updatedData.theme, author: updatedData.author, folderName: updatedData.folderName });
    const oldMetaStr = JSON.stringify({ title: activeNovelData.title, cover: activeNovelData.cover, tags: activeNovelData.tags, review: activeNovelData.review, status: activeNovelData.status, genres: activeNovelData.genres || [activeNovelData.genre], theme: activeNovelData.theme, author: activeNovelData.author, folderName: activeNovelData.folderName });

    if (oldMetaStr !== newMetaStr) {
        const newMetaList = novelsMetadata.map(m => m.id === updatedData.id ? {
            ...m, title: updatedData.title, cover: updatedData.cover, tags: updatedData.tags,
            review: updatedData.review, status: updatedData.status,
            genres: updatedData.genres || [updatedData.genre], theme: updatedData.theme || 'theme-tien-hiep',
            author: updatedData.author, chaptersTotal: updatedData.chaptersTotal, folderName: updatedData.folderName || m.folderName
        } : m);
        setNovelsMetadata(newMetaList);
        novelsMetadataRef.current = newMetaList;
        syncIndex(newMetaList, globalTabsConfig, dirHandle, nextStats);
    }
  };

  const scrollToTop = () => {
     setTimeout(() => {
         document.getElementById('main-scroll-container')?.scrollTo({ top: 0, behavior: 'smooth' });
         document.getElementById('collection-scroll-container')?.scrollTo({ top: 0, behavior: 'smooth' });
     }, 50);
  };

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

  const handleGoBack = () => {
     if (navHistory.length === 0) return;
     const last = navHistory[navHistory.length - 1];
     setNavHistory(prev => prev.slice(0, -1));
     setActiveTabLon(last.lonId); setActiveTabNho(last.nhoId); setActiveTabCon(last.conId);
     setSelectedEntityId(last.entityId); setCollectionSubTab(last.subTab || 'list');
  };

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
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const backup = migrateBackup(parsed);
        if (backup.metadata && backup.config) {
          setGlobalTabsConfig(backup.config);
          setNovelsMetadata(backup.metadata);
          novelsMetadataRef.current = backup.metadata;
          const stats = backup.novelStats && typeof backup.novelStats === 'object' ? backup.novelStats : {};
          novelStatsByIdRef.current = stats;
          setNovelStatsById(stats);
          await syncIndex(backup.metadata, backup.config, dirHandle, stats);
          if (backup.novels && typeof backup.novels === 'object') {
            for (const [, data] of Object.entries(backup.novels)) {
              await syncNovel(data, dirHandle);
            }
          }
          showToast("Khôi phục thành công! Tải lại trang…");
          setTimeout(() => window.location.reload(), 1200);
        } else {
          showToast("File không đúng cấu trúc Tàng Thư Các.", "error");
        }
      } catch (err) {
        showToast("Lỗi đọc file backup!", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleOpenCreateNovel = () => {
    setNovelForm({ title: '', author: '', genres: (GENRES && GENRES.length > 0) ? [GENRES[0]] : [], theme: 'theme-tien-hiep', cover: '', status: 'Đang đọc', chaptersTotal: '' });
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
        rating: 0, review: '', cover: novelForm.cover, folderName: folderName 
      };
      
      const newFullData = { ...newMeta, data: {}, tabsConfig: structuredClone(INITIAL_TABS_CONFIG), chapterCrossRefs: [], readingJournal: [] };
      const newMetaList = [newMeta, ...novelsMetadata];
      const nextStats = { ...novelStatsByIdRef.current, [newId]: { entities: 0, milestones: 0 } };
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
    updateActiveNovelData(nov => {
       if (!nov.data) nov.data = {}; if (!nov.data[activeTabLon]) nov.data[activeTabLon] = {};
       let tabData = nov.data[activeTabLon][activeTabNho || 'default'];
       if (typeof tabData === 'string' || !tabData) { tabData = { overview: typeof tabData === 'string' ? tabData : '', entities: [] }; }
       if (!tabData.entities) tabData.entities = [];
       if (formData.id) { 
          const idx = tabData.entities.findIndex(e => e.id === formData.id);
          if (idx > -1) { tabData.entities[idx] = { ...tabData.entities[idx], name: formData.name, avatar: formData.avatar, rawText: formData.rawText, dynamicData: dynamicData }; }
       } else { tabData.entities.push({ id: generateId('ent'), name: formData.name, avatar: formData.avatar, rawText: formData.rawText, dynamicData: dynamicData, info: '', milestones: [] }); }
       nov.data[activeTabLon][activeTabNho || 'default'] = tabData;
    });
    showToast(formData.id ? "Đã tu bổ lại Thực Thể!" : "Đã ngưng tụ Thực Thể mới!");
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
    showToast(formData.id ? "Đã tu bổ Kỷ Nguyên!" : "Đã khắc ghi Kỷ Nguyên mới!");
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
    setConfirmDialog({
       isOpen: true, title: 'Hủy Diệt Thực Thể', message: 'Xóa vĩnh viễn hồ sơ này khỏi Tàng Thư Các?',
       onConfirm: () => {
          const prev = activeNovelData ? structuredClone(activeNovelData) : null;
          updateActiveNovelData(nov => {
          if (!nov.data?.[activeTabLon]) return;
          const tabData = nov.data[activeTabLon][activeTabNho || 'default'];
          if(tabData && tabData.entities) { tabData.entities = tabData.entities.filter(e => e.id !== id); nov.data[activeTabLon][activeTabNho || 'default'] = tabData; }
          });
          if (selectedEntityId === id) setSelectedEntityId(null);
          if (prev) {
            showToast('Đã xóa thẻ.', 'success', {
              onUndo: () => {
                setActiveNovelData(structuredClone(prev));
                void (syncNovelRef.current && syncNovelRef.current(prev, dirHandleRef.current));
              },
            });
          }
       }
    });
  };

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

  const renderSmartValue = (val) => {
     if (!val) return <span className="text-slate-600 italic font-normal text-sm">Chưa có ghi chép</span>;
     return (
         <div className="font-serif text-[15px] leading-relaxed text-slate-300 mt-1.5 inline-block">
             {processInline(val, currentContextDirHandle, entityMap, globalLinkRegex, dest => navFnRef.current?.(dest))}
         </div>
     );
  };

  const getFieldValue = (fieldId, ent) => {
     if (!ent) return '';
     if (ent.dynamicData && ent.dynamicData[fieldId]) return ent.dynamicData[fieldId];
     if (fieldId === 'f_status') return ent.status;
     if (fieldId === 'f_title') return ent.title;
     if (fieldId === 'f_desc') return ent.description;
     return '';
  };

  const DISPLAY_LIMIT = 12;
  const displayedRelations = expandedRelations ? relatedEntities : relatedEntities.slice(0, DISPLAY_LIMIT);
  const hiddenCount = relatedEntities.length - DISPLAY_LIMIT;

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

  const handleGoHome = () => {
    setActiveNovelData(null);
    setActiveNovelDirHandle(null);
    setActiveTabLon('tong-quan');
    setActiveTabNho(null);
    setActiveTabCon(null);
    setSelectedEntityId(null);
    setNavHistory([]);
    setMenu1Visible(false);
  };

  // Migration: tự động nâng cấp fieldsTemplate cho tất cả sub-tab khi load truyện
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
        if (needsUpgrade) { nho.fieldsTemplate = structuredClone(target); changed = true; }
      });
    });
    return changed ? { ...novelData, tabsConfig: tabs } : novelData;
  };

  const handleSelectNovel = async (meta) => {
    setMenu1Visible(false);
    setSelectedEntityId(null);
    setNavHistory([]);
    setActiveTabLon('tong-quan');
    setActiveTabNho(null);
    setActiveTabCon(null);
    setCollectionSubTab('list');
    setIsEditingMode(false);
    setIsEntityEditing(false);
    setIsUploading(true); // dùng lại overlay loading

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
      // Lưu lại nếu có thay đổi migration
      if (migrated !== data) syncNovel(migrated, dirHandle);
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
    updateActiveNovelData(nov => {
      if (!nov.tags) nov.tags = [];
      if (!nov.tags.includes(newTagValue.trim())) nov.tags.push(newTagValue.trim());
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

  const handleSelectTabLon = (tabId) => {
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
  };

  const handleSelectTabNho = (e, lonId, sub) => {
    e.stopPropagation();
    setActiveTabLon(lonId);
    setActiveTabNho(sub.id);
    setActiveTabCon(null);
    setSelectedEntityId(null);
    setCollectionSubTab('list');
    setIsEditingMode(false);
    setIsEntityEditing(false);
    setEntitySearch('');
  };

  // ==========================================

  const navFnRef = useRef(null);
  navFnRef.current = handleNavigate;

  // Lưu lại fieldsTemplate khi currentTabConfig đã inject (để persist vào disk)
  useEffect(() => {
    if (!activeNovelData || !activeTabNho || !currentTabConfig) return;
    if (currentTabConfig.viewType !== 'collection-track') return;
    const targetTemplate = DEFAULT_FIELDS_MAP[activeTabNho] || DEFAULT_FIELDS_BY_PARENT[activeTabLon];
    if (!targetTemplate) return;
    // Chỉ persist nếu currentTabConfig đang dùng injected template (tức data chưa có đủ)
    updateActiveNovelData(nov => {
      if (!nov.tabsConfig) return;
      const lon = nov.tabsConfig.find(t => t.id === activeTabLon);
      const nho = lon?.subTabs?.find(s => s.id === activeTabNho);
      if (!nho) return;
      const cur = nho.fieldsTemplate;
      const needsUpgrade = !cur || cur.length === 0 ||
        (cur.every(f => /^f_/.test(f.id)) && cur.length < targetTemplate.length);
      if (needsUpgrade) nho.fieldsTemplate = structuredClone(targetTemplate);
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

  const novelQuickStats = useMemo(() => {
    if (!activeNovelData?.tabsConfig) return null;
    let totalEnt = 0;
    let totalMs = 0;
    const byTab = [];
    const chMap = {};
    (activeNovelData.tabsConfig || []).forEach((lon) => {
      if (lon.id === 'tong-quan') return;
      (lon.subTabs || []).forEach((nho) => {
        if (nho.viewType !== 'collection-track') return;
        const ents = activeNovelData.data?.[lon.id]?.[nho.id]?.entities || [];
        totalEnt += ents.length;
        let msHere = 0;
        ents.forEach((ent) => {
          (ent.milestones || []).forEach((m) => {
            msHere++;
            totalMs++;
            const c = parseInt(m.chapter, 10);
            if (!isNaN(c) && c >= 0) chMap[c] = (chMap[c] || 0) + 1;
          });
        });
        if (ents.length > 0 || msHere > 0) {
          byTab.push({
            key: `${lon.id}|${nho.id}`,
            label: `${safeString(lon.label)} › ${safeString(nho.label)}`,
            entities: ents.length,
            milestones: msHere,
          });
        }
      });
    });
    const topChapters = Object.entries(chMap)
      .map(([ch, n]) => ({ ch: parseInt(ch, 10), n }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 14);
    const maxBar = topChapters[0]?.n || 1;
    return { totalEnt, totalMs, byTab, topChapters, maxBar };
  }, [activeNovelData]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsCommandPaletteOpen((o) => !o);
        setCommandPaletteQuery('');
        return;
      }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable)) return;
        e.preventDefault();
        setMenu1Visible(true);
        setTimeout(() => librarySearchInputRef.current?.focus?.(), 0);
        return;
      }
      if (e.key === 'Escape') {
        if (commandPaletteOpenRef.current) {
          setIsCommandPaletteOpen(false);
          return;
        }
        setConfirmDialog((c) => (c.isOpen ? { ...c, isOpen: false } : c));
        setIsSettingsOpen(false);
        setOverviewHubOpen(false);
        setIsDeepSearchOpen(false);
        setIsInNovelSearchOpen(false);
        setIsAddNovelOpen(false);
        setIsEntityModalOpen(false);
        setIsMilestoneModalOpen(false);
        setIsInsertImageModalOpen(false);
        setIsManageTabsOpen(false);
        setIsGenreFilterOpen(false);
        setQuickCreateData(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const runCommandPaletteAction = useCallback((fn) => {
    setIsCommandPaletteOpen(false);
    setCommandPaletteQuery('');
    fn();
  }, []);

  const commandPaletteFiltered = useMemo(() => {
    const q = commandPaletteQuery.trim().toLowerCase();
    const m = (t) => !q || safeString(t).toLowerCase().includes(q);
    const actions = [
      { id: 'set', label: 'Cài đặt & API Key', sub: 'Gemini, wiki, backup' },
      { id: 'deep', label: 'Tìm toàn bộ thư viện', sub: 'Deep search' },
    ];
    if (activeNovelData) {
      actions.push(
        { id: 'innov', label: 'Tra trong truyện đang mở', sub: safeString(activeNovelData.title) },
        { id: 'hub', label: 'Một cửa cập nhật (Hub)', sub: 'Tạo thẻ / nhật ký AI' },
        { id: 'home', label: 'Về mệnh bàn', sub: 'Đóng truyện, xem dashboard' }
      );
    }
    const fa = actions.filter((a) => m(a.label) || m(a.sub));
    const fn = novelsMetadata.filter((n) => m(n.title) || m(n.author)).slice(0, 28);
    return { actions: fa, novels: fn };
  }, [commandPaletteQuery, novelsMetadata, activeNovelData]);

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans overflow-hidden relative theme-wrapper ${activeThemeClass}`}>
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
        onOpenCommandPalette={() => {
          setIsCommandPaletteOpen(true);
          setCommandPaletteQuery('');
        }}
      />

      <div className="flex-1 flex overflow-hidden">
        <div onMouseLeave={() => setMenu1Visible(false)} className={`absolute inset-y-0 left-0 z-40 bg-slate-900 border-r border-slate-800 shadow-2xl flex flex-col transition-transform duration-300 ease-out w-80 ${menu1Visible ? 'translate-x-0' : '-translate-x-full'}`}>
           <div className="p-5 border-b border-slate-800 flex flex-col gap-4">
              <div className="relative">
                <input ref={librarySearchInputRef} type="text" placeholder="Tìm kiếm thư tịch… (/)" className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 text-sm font-serif outline-none focus:border-amber-600/50" value={searchInput} onChange={e=>setSearchInput(e.target.value)}/>
                <Search className="absolute left-3 top-2.5 text-slate-600" size={16} />
              </div>
              {searchHistory.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[9px] text-slate-600 uppercase tracking-wider w-full">Gần đây</span>
                  {searchHistory.slice(0, 8).map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => { setSearchInput(h); setSearchQuery(h); }}
                      className="text-[10px] px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400 hover:border-amber-800/40 font-serif truncate max-w-full"
                    >
                      {safeString(h)}
                    </button>
                  ))}
                </div>
              )}

              <div className="relative">
                <button onClick={() => setIsGenreFilterOpen(!isGenreFilterOpen)} className="w-full bg-slate-950/50 border border-slate-700/80 hover:border-amber-600/50 rounded-lg py-2 pl-3 pr-4 text-sm flex items-center justify-between text-slate-300 font-serif shadow-inner">
                  <div className="flex items-center gap-2">
                    <Filter size={15} className={selectedGenres.length > 0 ? "text-amber-500" : "text-slate-500"} />
                    <span className={selectedGenres.length > 0 ? "text-amber-100" : "text-slate-400"}>{selectedGenres.length === 0 ? 'Tất cả thể loại' : `Đã chọn (${selectedGenres.length})`}</span>
                  </div>
                  <ChevronDown size={16} className={`text-slate-500 transition-transform ${isGenreFilterOpen ? 'rotate-180' : ''}`} />
                </button>
                {isGenreFilterOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-700/80 rounded-lg shadow-2xl z-30 p-2 max-h-56 overflow-y-auto custom-scrollbar animate-slide-down">
                    {(GENRES || []).map(g => (
                      <button key={g} onClick={() => toggleGenre(g)} className={`w-full text-left px-3 py-2 rounded-md text-sm font-serif flex items-center justify-between mb-1 ${selectedGenres.includes(g) ? 'bg-amber-900/40 text-amber-400 font-bold' : 'text-slate-300 hover:bg-slate-800'}`}>
                        {g} {selectedGenres.includes(g) && <Check size={14} />}
                      </button>
                    ))}
                    {selectedGenres.length > 0 && <button onClick={() => setSelectedGenres([])} className="w-full text-center mt-2 pt-2 border-t border-slate-800 text-xs text-rose-400">Xoá bộ lọc</button>}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                 <button onClick={handleOpenCreateNovel} className="flex-1 py-2 bg-amber-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors hover:bg-amber-600 shadow-md">
                    <Plus size={14}/> Thu Thập
                 </button>
                 <button onClick={() => setIsSettingsOpen(true)} className={`flex-1 py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-md ${dirHandle && dirHandle !== 'LOCAL_STORAGE' ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 border border-slate-700 text-slate-300 hover:text-amber-400'}`}>
                    <Cloud size={14}/> {dirHandle && dirHandle !== 'LOCAL_STORAGE' ? 'Đã Đồng Bộ' : 'Lưu Trữ'}
                 </button>
              </div>
           </div>
           
           <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar overflow-x-visible">
              {filteredNovelsList.length === 0 ? <div className="text-center text-slate-500 text-sm mt-10 font-serif italic">Không tìm thấy thư tịch...</div> : 
               filteredNovelsList.map(novel => {
                let nGenres = [];
                if (Array.isArray(novel.genres)) nGenres = novel.genres;
                else if (typeof novel.genres === 'string') nGenres = [novel.genres];
                else if (novel.genre) nGenres = [novel.genre];
                
                return (
                <div key={novel.id} onClick={() => handleSelectNovel(novel)} onMouseEnter={(e) => {
                    setHoveredNovelId(novel.id);
                    setHoveredNovelData(novel);
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltipPos({ x: rect.right + 8, y: Math.min(rect.top, window.innerHeight - 260) });
                  }} onMouseLeave={() => { setHoveredNovelId(null); setHoveredNovelData(null); }} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors relative overflow-visible ${activeNovelData?.id === novel.id ? 'bg-amber-900/20 border border-amber-800/50' : 'hover:bg-slate-800 border border-transparent'}`}>
                   <div className="w-10 h-14 bg-slate-800 rounded overflow-hidden border border-slate-700 flex-shrink-0">
                     {novel.cover && (
                       novel.cover.startsWith('local_image:') ? (
                         <AsyncLocalImage filename={novel.cover.replace('local_image:', '')} alt="" dirHandle={dirHandle} className="w-full h-full object-cover" />
                       ) : (
                         <img src={novel.cover} className="w-full h-full object-cover" alt="" onError={(e) => { e.target.onerror = null; }} />
                       )
                     )}
                   </div>
                   <div className="flex-1 min-w-0">
                     <h3 className={`text-sm font-bold truncate font-serif ${activeNovelData?.id === novel.id ? 'text-amber-400' : 'group-hover:text-amber-500'}`}>{safeString(novel.title)}</h3>
                     <p className="text-[10px] text-slate-500 uppercase truncate">{safeString(nGenres.join(', '))} • {safeString(novel.author)}</p>
                   </div>

                </div>
               )})}
           </div>
        </div>

        <div className={`flex-1 flex bg-slate-950 transition-opacity duration-300 ${menu1Visible ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          {!activeNovelData ? (
            novelsMetadata.length > 0 ? (
              <DashboardScreen
                novelsMetadata={novelsMetadata}
                stats={dashboardStats}
                isLoading={isStatsBackfilling}
                novelStatsById={novelStatsById}
                onSelectNovel={handleSelectNovel}
                onAddNovel={handleOpenCreateNovel}
              />
            ) : (
              <LandingScreen setIsAddNovelOpen={handleOpenCreateNovel} setIsManageTabsOpen={() => setIsManageTabsOpen(true)} />
            )
          ) : (
            <>
              <div className={`bg-slate-900 border-r border-slate-800 transition-[width] duration-200 ease-out flex flex-col z-20 flex-shrink-0 h-full ${menu2Expanded ? 'w-64' : 'w-12'}`}>
                <div className="p-4 border-b border-slate-800 h-16 flex items-center justify-between overflow-hidden whitespace-nowrap"
                  onMouseEnter={() => setMenu2Expanded(true)}>
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
                   {menu2Expanded && <button onClick={() => setIsManageTabsOpen(true)} className="text-amber-600 hover:text-amber-400 flex-shrink-0"><Network size={18}/></button>}
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
                   <div className="py-3 flex flex-col">
                       {sortedTabs.map(tab => {
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
                       })}
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
                       
                       {activeTabLon === 'tong-quan' ? (
                          <div className="flex flex-col md:flex-row gap-12 animate-fade-in">
                             <div className="w-full md:w-1/3 flex-shrink-0">
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
                             </div>
                             <div className="flex-1 flex flex-col">
                                <h1 className="text-5xl font-heading font-bold text-slate-100 mb-2 leading-tight">{safeString(activeNovelData.title)}</h1>
                                <p className="text-xl text-slate-400 font-serif italic mb-6">Tác giả: {safeString(activeNovelData.author)}</p>
                                
                                <div className="pt-2 mb-6">
                                  <label className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-3 uppercase tracking-widest"><BookOpen size={14} /> Đặc Trưng (Tags)</label>
                                  <div className="flex flex-wrap gap-2.5 items-center">
                                    {activeNovelData.tags?.map(tag => (
                                      <span key={tag} className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-md text-sm text-slate-300 font-serif flex items-center gap-2 group/tag">
                                        {safeString(tag)}
                                        <button onClick={() => handleRemoveTag(tag)} className="text-slate-500 hover:text-rose-400 opacity-50 group-hover/tag:opacity-100 transition-opacity"><X size={12}/></button>
                                      </span>
                                    ))}
                                    {isAddingTag ? (
                                      <input 
                                        autoFocus type="text" placeholder="Nhập tên tag..."
                                        className="px-3 py-1.5 bg-slate-950 border border-amber-600/50 rounded-md text-sm text-slate-200 focus:outline-none w-32 font-serif"
                                        value={newTagValue} onChange={(e) => setNewTagValue(e.target.value)}
                                        onKeyDown={(e) => { if(e.key === 'Enter') handleAddTag() }}
                                        onBlur={() => { if(newTagValue.trim()) handleAddTag(); else setIsAddingTag(false); }}
                                      />
                                    ) : (
                                      <button onClick={() => setIsAddingTag(true)} className="px-3 py-1.5 bg-transparent border border-dashed border-slate-700 rounded-md text-sm text-slate-500 hover:text-amber-400 hover:border-amber-500/50 transition-colors font-serif flex items-center gap-1">
                                        <Plus size={14} /> Thêm Tag
                                      </button>
                                    )}
                                  </div>
                                </div>

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

                                <div className="pt-6 border-t border-slate-800 flex-1 flex flex-col relative">
                                   <div className="flex gap-4 mb-4">
                                      <div className="flex-1">
                                        <label className="text-xs text-slate-500 uppercase font-bold tracking-widest block mb-1.5 flex items-center gap-1"><BookOpen size={12}/> Đã đọc / Tổng chương</label>
                                        <div className="flex items-center gap-2">
                                          <input type="number" min="0" className="w-24 bg-slate-900/50 border border-slate-800 rounded-lg p-2 text-slate-200 text-sm focus:outline-none focus:border-amber-600/50 font-serif" value={overviewForm?.chaptersRead || 0}
                                            onChange={e => setOverviewForm({...overviewForm, chaptersRead: parseInt(e.target.value,10)||0})}
                                            onBlur={() => updateActiveNovelData(n => n.chaptersRead = overviewForm?.chaptersRead || 0)} />
                                          <span className="text-slate-600 font-serif text-sm">/</span>
                                          <span className="text-slate-400 font-serif text-sm">{safeString(activeNovelData.chaptersTotal) || '???'}</span>
                                          {activeNovelData.chaptersTotal && parseInt(activeNovelData.chaptersTotal) > 0 && (
                                            <span className="ml-2 text-xs text-amber-600 font-bold font-serif">
                                              {Math.round(((overviewForm?.chaptersRead||0)/parseInt(activeNovelData.chaptersTotal))*100)}%
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                   </div>

                                   <div className="mb-8 rounded-2xl border border-amber-900/25 bg-gradient-to-br from-slate-950 via-slate-900/95 to-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] overflow-hidden">
                                     {(() => {
                                       const anchor = Math.max(0, parseInt(activeNovelData.readingAnchorChapter ?? activeNovelData.chaptersRead ?? 0, 10) || 0);
                                       const lo = Math.max(0, anchor - 12);
                                       const hi = anchor + 30;
                                       const xrefs = Array.isArray(activeNovelData.chapterCrossRefs) ? activeNovelData.chapterCrossRefs : [];
                                       return (
                                         <div className="border-l-[5px] border-amber-500/85 pl-4 pr-3 py-4 sm:pl-5 sm:pr-4">
                                           <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                             <div className="min-w-0">
                                               <h3 className="font-heading text-lg sm:text-xl text-amber-50 tracking-tight">Theo chương & công cụ</h3>
                                               <p className="font-serif text-xs text-slate-500 mt-1">
                                                 Neo <span className="text-amber-400 font-bold tabular-nums">ch.{anchor}</span>
                                                 {' · '}
                                                 <span className="text-slate-600">Mốc timeline mới (khi tạo) mặc định theo chương neo.</span>
                                                 {' · '}
                                                 <span className="text-slate-600">Cập nhật hàng loạt: «Một cửa».</span>
                                               </p>
                                             </div>
                                             <div className="flex flex-wrap gap-2">
                                               <button
                                                 type="button"
                                                 onClick={() => setOverviewNeoOpen((o) => !o)}
                                                 className={`font-serif text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-xl border flex items-center gap-2 transition-colors ${overviewNeoOpen ? 'bg-amber-950/50 border-amber-700/50 text-amber-200' : 'bg-slate-800/80 border-slate-600/50 text-slate-300 hover:border-amber-600/30'}`}
                                               >
                                                 <BookOpen size={15} className="opacity-80 flex-shrink-0" />
                                                 Ghi theo chương
                                                 <ChevronDown size={16} className={`opacity-60 transition-transform flex-shrink-0 ${overviewNeoOpen ? 'rotate-180' : ''}`} />
                                               </button>
                                               <button
                                                 type="button"
                                                 onClick={() => setIsInNovelSearchOpen(true)}
                                                 className="font-serif text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-xl bg-cyan-950/50 border border-cyan-800/45 text-cyan-300 hover:bg-cyan-900/35 flex items-center gap-2 transition-colors"
                                               >
                                                 <Search size={15} className="opacity-80" /> Tra trong truyện
                                               </button>
                                               <button
                                                 type="button"
                                                 onClick={openOverviewHub}
                                                 className="font-serif text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-xl bg-violet-950/55 border border-violet-700/40 text-violet-200 hover:bg-violet-900/40 flex items-center gap-2 transition-colors"
                                               >
                                                 <Layers size={15} className="opacity-90" /> Một cửa cập nhật
                                               </button>
                                               <button
                                                 type="button"
                                                 onClick={() => setNeoXrefSectionOpen((o) => !o)}
                                                 className={`font-serif text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-xl border flex items-center gap-2 transition-colors ${neoXrefSectionOpen ? 'bg-amber-950/40 border-amber-800/50 text-amber-200' : 'bg-slate-800/80 border-slate-600/50 text-slate-300 hover:border-amber-600/25'}`}
                                               >
                                                 <GitBranch size={15} className="text-amber-500/80 flex-shrink-0" />
                                                 Nối tra cứu
                                                 {xrefs.length > 0 && (
                                                   <span className="font-sans text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-900/50 text-amber-400">{xrefs.length}</span>
                                                 )}
                                                 <ChevronDown size={16} className={`opacity-60 transition-transform flex-shrink-0 ${neoXrefSectionOpen ? 'rotate-180' : ''}`} />
                                               </button>
                                             </div>
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
                                       );
                                     })()}
                                   </div>

                                   <div className="flex justify-between items-center mb-3">
                                       <label className="text-xs text-slate-500 uppercase font-bold tracking-widest flex items-center gap-2"><BookOpen size={14}/> Cảm ngộ / Review</label>
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
                                   <textarea className="w-full flex-1 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 text-slate-300 font-serif text-lg leading-relaxed focus:outline-none focus:border-amber-600/50 min-h-[200px] resize-none custom-scrollbar" value={safeString(overviewForm?.review)} onChange={(e) => setOverviewForm({...overviewForm, review: e.target.value})} onBlur={() => updateActiveNovelData(n => n.review = overviewForm.review)} placeholder="Hạ bút... (Hệ thống tự động lưu khi bạn nhấp chuột ra khỏi đây)" />
                                   
                                   <div className="mt-6 flex flex-wrap justify-between gap-4">
                                      <button onClick={handleOpenEditNovel} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold flex items-center gap-2 transition-colors border border-slate-700"><Settings size={18}/> Thiết Lập Truyện</button>
                                      <button onClick={() => setConfirmDialog({
                                         isOpen: true, title: 'Hủy Diệt Thư Tịch', message: `Xóa sổ vĩnh viễn <b>${safeString(activeNovelData.title)}</b> cùng toàn bộ ảnh của nó? Hành động này không thể vãn hồi!`, 
                                         onConfirm: () => handleDeleteNovel(activeNovelData.id)
                                      })} className="px-6 py-3 bg-slate-900 text-rose-500 rounded-lg font-bold flex items-center gap-2 transition-colors border border-slate-800 hover:border-rose-900/50 hover:bg-rose-950/30"><Trash2 size={18} /> Hủy Diệt</button>
                                   </div>
                                </div>
                             </div>
                          </div>
                       ) : (
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
                                      <div className="flex items-center gap-2 flex-wrap">
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
                                         {/* Group by */}
                                         <select value={entityGroupBy} onChange={e=>setEntityGroupBy(e.target.value)} className={`border rounded-xl py-2 px-3 text-xs font-serif outline-none cursor-pointer transition-colors ${entityGroupBy !== 'none' ? 'bg-amber-900/30 border-amber-700/50 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400 focus:border-amber-600/50'}`}>
                                            <option value="none">Không nhóm</option>
                                            {(currentTabConfig?.fieldsTemplate || DEFAULT_ENTITY_FIELDS).map(f => (
                                              <option key={f.id} value={f.id}>Nhóm: {f.label}</option>
                                            ))}
                                         </select>
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
                                   <div className="flex flex-wrap gap-6 border-b border-slate-800/80 mb-6 pb-3 items-end">
                                      <button type="button" onClick={() => setCollectionSubTab('list')} className={`text-sm font-bold uppercase tracking-widest pb-3 -mb-[13px] transition-colors ${collectionSubTab === 'list' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>Danh Sách</button>
                                      <button type="button" onClick={() => setCollectionSubTab('gallery')} className={`text-sm font-bold uppercase tracking-widest pb-3 -mb-[13px] transition-colors flex items-center gap-2 ${collectionSubTab === 'gallery' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>
                                        <Images size={14} className="opacity-70" /> Ảnh
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${collectionSubTab === 'gallery' ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-300'}`}>{galleryPortraitEntries.length}</span>
                                      </button>
                                      <button type="button" onClick={() => setCollectionSubTab('detail')} className={`text-sm font-bold uppercase tracking-widest pb-3 -mb-[13px] transition-colors ${collectionSubTab === 'detail' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>Hồ Sơ {selectedEntity ? `(${safeString(selectedEntity.name)})` : ''}</button>
                                      <button type="button" onClick={() => setCollectionSubTab('timeline')} className={`text-sm font-bold uppercase tracking-widest pb-3 -mb-[13px] transition-colors flex items-center gap-2 ${collectionSubTab === 'timeline' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>
                                        Dòng Thời Gian
                                        {selectedEntity && selectedEntity.milestones && selectedEntity.milestones.length > 0 && (
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${collectionSubTab === 'timeline' ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-300'}`}>{selectedEntity.milestones.length}</span>
                                        )}
                                      </button>
                                   </div>

                                   <div id="collection-scroll-container" className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
                                      {collectionSubTab === 'gallery' && (
                                        <div className="animate-fade-in pb-8">
                                          {galleryPortraitEntries.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                                              <Images size={48} className="mb-4 opacity-30" />
                                              <p className="font-serif italic text-center px-4">Chưa có ảnh đại diện nào trong các mục sưu tập.</p>
                                            </div>
                                          ) : (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                              {galleryPortraitEntries.map((row) => (
                                                <button type="button" key={`${row.lonId}-${row.nhoId}-${row.ent.id}`} onClick={() => handleOpenEntityFromGallery(row)} className="group flex flex-col items-center rounded-2xl border border-slate-800 bg-slate-900/50 p-3 hover:border-amber-600/40 hover:bg-slate-800/50 transition-all text-center">
                                                  <div className="w-full aspect-square rounded-xl overflow-hidden border border-slate-700 bg-slate-950 mb-2 shadow-inner">
                                                    {row.ent.avatar.startsWith('local_image:') ? (
                                                      <AsyncLocalImage filename={row.ent.avatar.replace('local_image:', '')} alt="" dirHandle={activeNovelDirHandle || dirHandle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                    ) : (
                                                      <img src={row.ent.avatar} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMG; }} />
                                                    )}
                                                  </div>
                                                  <span className="text-sm font-bold text-slate-200 font-serif truncate w-full">{safeString(row.ent.name)}</span>
                                                  <span className="text-[10px] text-slate-500 truncate w-full mt-0.5">{safeString(row.sectionLabel)}</span>
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      {collectionSubTab === 'list' && (() => {
                                         // === GROUP BY + PAGINATION ===
                                         const getFieldVal = (ent, fieldId) => {
                                           if (ent.dynamicData?.[fieldId]) return ent.dynamicData[fieldId];
                                           if (fieldId === 'f_status') return ent.status || '';
                                           if (fieldId === 'f_title') return ent.title || '';
                                           if (fieldId === 'f_desc') return ent.description || '';
                                           return '';
                                         };

                                         const renderGrid = (list) => (
                                           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 content-start">
                                             {list.map(ent => (
                                               <EntityCard key={ent.id} entity={ent} tabConfig={currentTabConfig}
                                                onSelect={() => { handleNavigate({ lonId: activeTabLon, nhoId: activeTabNho, entityId: ent.id }); }}
                                                onDelete={() => handleDeleteEntity(ent.id)}
                                                onAddMilestone={() => { setSelectedEntityId(ent.id); setCollectionSubTab('timeline'); setTimeout(() => { setEditingMilestoneData(null); setIsMilestoneModalOpen(true); }, 100); }}
                                                dirHandle={currentContextDirHandle} parentTabId={activeTabLon} parentLabel={currentTabConfig?._parentLabel} />
                                             ))}

                                           </div>
                                         );

                                         const renderPagination = (total, page, setPage) => {
                                           const totalPages = Math.ceil(total / ENTITY_PAGE_SIZE);
                                           if (totalPages <= 1) return null;
                                           return (
                                             <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-slate-800">
                                               <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors">← Trước</button>
                                               <div className="flex gap-1">
                                                 {Array.from({length: Math.min(totalPages, 7)}, (_, i) => {
                                                   const p = totalPages <= 7 ? i+1 : page <= 4 ? i+1 : page >= totalPages-3 ? totalPages-6+i : page-3+i;
                                                   return (
                                                     <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${p === page ? 'bg-amber-700 text-white' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-200'}`}>{p}</button>
                                                   );
                                                 })}
                                               </div>
                                               <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages} className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors">Sau →</button>
                                               <span className="text-xs text-slate-600 font-serif ml-2">{total} thực thể</span>
                                             </div>
                                           );
                                         };

                                         if (entityGroupBy === 'none') {
                                           // Không nhóm - pagination đơn giản
                                           const pagedList = entitiesList.slice((entityPage-1)*ENTITY_PAGE_SIZE, entityPage*ENTITY_PAGE_SIZE);
                                           return (
                                             <>
                                               {renderGrid(pagedList)}
                                               {renderPagination(entitiesList.length, entityPage, setEntityPage)}
                                             </>
                                           );
                                         } else {
                                           // Group by field
                                           const groups = {};
                                           entitiesList.forEach(ent => {
                                             const val = getFieldVal(ent, entityGroupBy).trim() || '— Chưa phân loại —';
                                             if (!groups[val]) groups[val] = [];
                                             groups[val].push(ent);
                                           });
                                           const sortedGroups = Object.entries(groups).sort((a,b) => {
                                             if (a[0] === '— Chưa phân loại —') return 1;
                                             if (b[0] === '— Chưa phân loại —') return -1;
                                             return a[0].localeCompare(b[0], 'vi');
                                           });
                                           return (
                                             <div className="space-y-8">
                                               {sortedGroups.map(([groupName, groupItems]) => (
                                                 <div key={groupName} className="animate-fade-in">
                                                   <div className="flex items-center gap-3 mb-4">
                                                     <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700/60 rounded-full px-4 py-1.5">
                                                       <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                                       <span className="text-sm font-bold text-amber-400 font-serif">{groupName}</span>
                                                       <span className="text-xs text-slate-600 font-serif">({groupItems.length})</span>
                                                     </div>
                                                     <div className="flex-1 h-px bg-slate-800"></div>
                                                   </div>
                                                   {renderGrid(groupItems)}
                                                 </div>
                                               ))}

                                             </div>
                                           );
                                         }
                                       })()}

                                      {(collectionSubTab === 'detail' || collectionSubTab === 'timeline') && !selectedEntity && (
                                         <div className="h-full flex flex-col items-center justify-center opacity-40">
                                            <Library size={64} className="mb-4 text-slate-600" />
                                            <p className="font-serif italic text-lg">Vui lòng chọn một đối tượng từ Danh Sách...</p>
                                            <button onClick={() => setCollectionSubTab('list')} className="mt-4 px-4 py-2 bg-slate-800 rounded-lg text-sm hover:bg-slate-700">Quay lại danh sách</button>
                                         </div>
                                      )}

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

                                            <div className="mb-10">
                                               <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-800/80">
                                                  <div className="flex items-center gap-3">
                                                     <div className="p-2 bg-amber-900/20 text-amber-500 rounded-lg border border-amber-700/30"><Hexagon size={18} /></div>
                                                     <h3 className="text-xl font-heading font-bold text-amber-100">Nền Tảng Căn Cơ</h3>
                                                  </div>
                                               </div>
                                               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                                  {(currentTabConfig?.fieldsTemplate || DEFAULT_ENTITY_FIELDS).map((f) => {
                                                     const val = safeString(getFieldValue(f.id, selectedEntity));
                                                     const isLong = val.length > 50; 
                                                     return (
                                                        <div key={f.id} className={`bg-slate-900/60 backdrop-blur-md border transition-all duration-300 group shadow-lg rounded-[40px] p-6
                                                          ${recentlyMergedFields.has(f.id)
                                                            ? 'border-emerald-600/50 bg-emerald-900/10 hover:border-emerald-500/60'
                                                            : 'border-slate-700/50 hover:bg-slate-800/80 hover:border-amber-500/40'}
                                                          ${isLong ? 'col-span-1 md:col-span-2 lg:col-span-3' : ''}`}>
                                                           <div className="flex items-center gap-2 mb-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                                                              <div className={`w-1.5 h-1.5 rounded-full transition-colors ${recentlyMergedFields.has(f.id) ? 'bg-emerald-400' : 'bg-slate-500 group-hover:bg-amber-400'}`}></div>
                                                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{safeString(f.label)}</span>
                                                           </div>
                                                           {/* Pill "Hiện tại" khi vừa merge từ Timeline */}
                                                           {recentlyMergedFields.has(f.id) && (
                                                             <div className="inline-flex items-center px-2.5 py-1 rounded-full border border-emerald-700/50 bg-emerald-950/40 mb-2">
                                                               <span className="text-[10px] font-serif italic text-emerald-400">● Vừa cập nhật từ dòng thời gian</span>
                                                             </div>
                                                           )}
                                                           <div className="pl-3 border-l border-slate-700 group-hover:border-amber-500/50 transition-colors mt-2">
                                                               {renderSmartValue(val)}
                                                           </div>
                                                        </div>
                                                     )
                                                  })}
                                               </div>
                                            </div>

                                            {(relatedEntities.length > 0 || isCalculatingNetwork) && (
                                               <div className="mb-10 animate-fade-in relative">
                                                  <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-800/80">
                                                     <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-indigo-900/20 text-indigo-400 rounded-lg border border-indigo-700/30"><Network size={18} /></div>
                                                        <div>
                                                           <div className="flex items-center gap-3">
                                                               <h3 className="text-xl font-heading font-bold text-indigo-100">Mạng Lưới Nhân Quả</h3>
                                                               {isCalculatingNetwork && <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>}
                                                           </div>
                                                           <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
                                                               {isCalculatingNetwork ? 'Thần thức đang dò xét...' : `Có ${relatedEntities.length} thực thể liên kết với ${safeString(selectedEntity.name)}`}
                                                           </p>
                                                        </div>
                                                     </div>
                                                  </div>
                                                  
                                                  {!isCalculatingNetwork && (
                                                      <div className="flex flex-wrap gap-4">
                                                         {displayedRelations.map((rel) => (
                                                             <button key={`${rel.lonId}|${rel.nhoId}|${rel.entity.id}`} onClick={() => handleNavigate({ lonId: rel.lonId, nhoId: rel.nhoId, entityId: rel.entity.id })} className="flex items-center gap-4 bg-slate-900/80 backdrop-blur-md border border-slate-700 hover:border-indigo-500/60 p-3 rounded-[24px] transition-all duration-300 shadow-md hover:shadow-[0_5px_20px_rgba(99,102,241,0.15)] hover:-translate-y-0.5 group w-full md:w-auto md:min-w-[280px]">
                                                                <div className="w-12 h-12 rounded-[16px] bg-slate-950 overflow-hidden flex-shrink-0 border border-slate-800 group-hover:border-indigo-400/50 transition-colors relative">
                                                                   {rel.entity.avatar ? (
                                                                      rel.entity.avatar.startsWith('local_image:') ? (
                                                                         <AsyncLocalImage filename={rel.entity.avatar.replace('local_image:', '')} alt="avatar" dirHandle={currentContextDirHandle} className="w-full h-full object-cover" />
                                                                      ) : <img src={rel.entity.avatar} className="w-full h-full object-cover" alt="" onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMG; }} />
                                                                   ) : <span className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-lg">{safeString(rel.entity.name).charAt(0)}</span>}
                                                                   <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                                </div>
                                                                <div className="text-left pr-4">
                                                                   <div className="text-base font-bold text-slate-200 group-hover:text-indigo-300 font-serif transition-colors">{safeString(rel.entity.name)}</div>
                                                                   <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                                                                      <span className="text-indigo-500/70">{safeString(rel.tabLabel)}</span> 
                                                                      <span className="w-1 h-1 bg-slate-700 rounded-full"></span> 
                                                                      <span>{safeString(rel.context)}</span>
                                                                   </div>
                                                                </div>
                                                             </button>
                                                         ))}
                                                         
                                                         {!expandedRelations && hiddenCount > 0 && (
                                                             <button onClick={() => setExpandedRelations(true)} className="flex items-center justify-center bg-slate-950/50 border border-dashed border-indigo-700/50 hover:border-indigo-400/80 p-3 rounded-[24px] transition-all duration-300 hover:bg-indigo-900/20 text-indigo-400/70 hover:text-indigo-300 text-sm font-serif group w-full md:w-auto md:px-8">
                                                                 <span className="flex items-center gap-2"><Network size={16} className="group-hover:scale-110 transition-transform" /> + {hiddenCount} liên kết khác đang bị ẩn...</span>
                                                             </button>
                                                         )}
                                                      </div>
                                                  )}
                                               </div>
                                            )}

                                            <div className="flex flex-col mt-4">
                                               <div className="flex justify-between items-end mb-6 pb-2 border-b border-slate-800/80">
                                                  <div className="flex items-center gap-3">
                                                     <div className="p-2 bg-amber-900/20 text-amber-500 rounded-lg border border-amber-700/30"><BookOpen size={18}/></div>
                                                     <div>
                                                        <h3 className="text-xl font-heading font-bold text-amber-100">Ghi Chép Chi Tiết</h3>
                                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{getTerms(activeTabLon).infoDesc}</p>
                                                     </div>
                                                  </div>
                                                  <div className="flex items-center gap-3">
                                                     {isEntityEditing && (
                                                        <>
                                                        <button 
                                                           disabled={isExtractingAI}
                                                           onClick={async () => {
                                                              if (geminiApiKeys.length === 0) { showToast("Vui lòng thiết lập API Key (trong Cài Đặt) để dùng tính năng AI."); return; }
                                                              const text = document.getElementById('entity-info-editor').value;
                                                              if (!text.trim()) return;
                                                              const { wasTruncated } = truncateForAI(text);
                                                              if (wasTruncated) showToast("Đoạn quá dài — chỉ gửi ~28.000 ký tự đầu cho AI.", "warning");
                                                              setIsExtractingAI(true);
                                                              try {
                                                                const res = await extractEntityAttributesWithAI(text, currentTabConfig?.fieldsTemplate || [], geminiApiKeys);
                                                                if (res) handleAIExtractSuccess(res.existingData, res.newFields);
                                                              } catch (e) { showToast(mapGeminiErrorToUserMessage(e), "error"); }
                                                              setIsExtractingAI(false);
                                                           }} 
                                                           className="px-4 py-2.5 rounded-[40px] text-xs font-bold transition-all shadow-md flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-slate-900 disabled:opacity-50"
                                                        >
                                                           {isExtractingAI ? <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> : <Sparkles size={16}/>}
                                                           {isExtractingAI ? 'Đang trích xuất...' : 'AI Lọc Thuộc Tính'}
                                                        </button>
                                                        {/* AI Tạo Link [[...]] cho tên riêng */}
                                                        <button
                                                           disabled={isExtractingAI}
                                                           onClick={async () => {
                                                              if (geminiApiKeys.length === 0) { showToast("Vui lòng thiết lập API Key để dùng AI."); return; }
                                                              const ta = document.getElementById('entity-info-editor');
                                                              const text = ta?.value;
                                                              if (!text?.trim()) return;
                                                              const { wasTruncated } = truncateForAI(text);
                                                              if (wasTruncated) showToast("Đoạn quá dài — chỉ gửi ~28.000 ký tự đầu cho AI.", "warning");
                                                              setIsExtractingAI(true);
                                                              try {
                                                                const res = await analyzeTextWithAI(text, currentTabConfig?.fieldsTemplate || [], geminiApiKeys);
                                                                if (res?.processedText) {
                                                                  ta.value = res.processedText;
                                                                  if (isSplitPreview) {
                                                                    setLivePreviewText(res.processedText);
                                                                    setDebouncedMarkdownPreview(res.processedText);
                                                                  }
                                                                  showToast('AI đã tạo liên kết cho các tên riêng!');
                                                                }
                                                              } catch(e) { showToast(mapGeminiErrorToUserMessage(e), 'error'); }
                                                              setIsExtractingAI(false);
                                                           }}
                                                           className="px-4 py-2.5 rounded-[40px] text-xs font-bold transition-all shadow-md flex items-center gap-2 bg-indigo-700 hover:bg-indigo-600 text-white disabled:opacity-50"
                                                           title="AI tự động bọc tên người, thế lực, công pháp... vào [[liên kết]]"
                                                        >
                                                           {isExtractingAI ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Link2 size={14}/>}
                                                           {isExtractingAI ? 'Đang xử lý...' : 'AI Tạo Link'}
                                                        </button>
                                                        </>
                                                     )}
                                                     <button id="save-entity-btn" onClick={() => { if(isEntityEditing) { handleUpdateEntityInfo(document.getElementById('entity-info-editor').value); setIsSplitPreview(false); } else { const s = safeString(selectedEntity?.info || ''); setLivePreviewText(s); setDebouncedMarkdownPreview(s); } setIsEntityEditing(!isEntityEditing); }} className={`px-5 py-2.5 rounded-[40px] text-xs font-bold transition-all shadow-md flex items-center gap-2 ${isEntityEditing ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'}`}>
                                                        {isEntityEditing ? <><Save size={16}/> Lưu (Ctrl+S)</> : <><Edit3 size={16}/> Viết Ghi Chép</>}
                                                     </button>
                                                  </div>
                                               </div>

                                               <div className={`flex flex-col transition-all duration-300 backdrop-blur-md ${isEntityEditing ? 'bg-slate-900 border border-amber-700/50 shadow-[0_0_15px_rgba(217,119,6,0.1)] p-6 rounded-[40px]' : 'bg-slate-900/30 border border-slate-800/60 p-8 rounded-[40px]'}`}>
                                                  {isEntityEditing ? (
                                                     <div className="flex flex-col flex-1 animate-fade-in min-h-[400px]">
                                                        <div className="flex items-center justify-between mb-1">
                                                          <MarkdownToolbar editorId="entity-info-editor" onInsertImage={(eid) => { setImageForm({ url: '', alt: '', editorId: eid }); setIsInsertImageModalOpen(true); }} onPickLocalImage={handlePickLocalImage} />
                                                          <button onClick={() => { const cur = document.getElementById('entity-info-editor')?.value; if(cur !== undefined) { setLivePreviewText(cur); setDebouncedMarkdownPreview(cur); } setIsSplitPreview(p => !p); }} className={`ml-2 px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0 transition-colors flex items-center gap-1.5 ${isSplitPreview ? 'bg-amber-700/30 text-amber-400 border border-amber-700/40' : 'bg-slate-800 text-slate-500 border border-slate-700 hover:text-slate-300'}`}>
                                                            <Eye size={12}/> Preview
                                                          </button>
                                                        </div>
                                                        <div className={`flex flex-1 gap-4 min-h-[300px] ${isSplitPreview ? 'flex-row' : 'flex-col'}`}>
                                                          <textarea id="entity-info-editor" className={`bg-transparent text-slate-200 font-serif text-lg leading-loose outline-none resize-none custom-scrollbar ${isSplitPreview ? 'w-1/2 flex-shrink-0' : 'flex-1 min-h-[300px]'}`} defaultValue={safeString(selectedEntity.info)} placeholder="Hạ bút khắc ấn..." onChange={(e) => { if(isSplitPreview) setLivePreviewText(e.target.value); }} onPaste={() => { if(isSplitPreview) { setTimeout(() => { const v = document.getElementById('entity-info-editor')?.value; if (v !== undefined) setLivePreviewText(v); }, 0); } }} />
                                                          {isSplitPreview && (
                                                            <MarkdownPreviewPane
                                                              text={debouncedMarkdownPreview}
                                                              dirHandle={currentContextDirHandle}
                                                              entityMap={entityMap}
                                                              linkRegex={globalLinkRegex}
                                                              onNavigate={handleNavigate}
                                                              className="w-1/2 overflow-y-auto custom-scrollbar border-l border-slate-700 pl-4 font-serif min-h-[300px]"
                                                            />
                                                          )}
                                                        </div>
                                                     </div>
                                                  ) : (
                                                     <div className="font-serif prose prose-invert max-w-none animate-fade-in min-h-[200px]">
                                                         {memoizedEntityInfo && <>{memoizedEntityInfo}</>}
                                                     </div>
                                                  )}
                                               </div>
                                            </div>
                                         </div>
                                      )}

                                      {collectionSubTab === 'timeline' && selectedEntity && (
                                         <div className="flex gap-8 overflow-hidden max-w-6xl mx-auto h-full flex-col md:flex-row pb-10">
                                            <div className="w-full md:w-1/3 border-r border-slate-800/80 pr-6 overflow-y-auto custom-scrollbar relative min-h-[200px] flex-shrink-0">
                                               <div className="flex justify-between items-center mb-6">
                                                  <h3 className="text-lg font-heading font-bold text-amber-500">Mốc Sự Kiện</h3>
                                                  <button onClick={() => { setEditingMilestoneData(null); setIsMilestoneModalOpen(true); }} className="p-2 bg-emerald-900/30 text-emerald-400 rounded-[40px] hover:bg-emerald-800/50 transition-colors" title="Thêm mốc mới"><Plus size={16}/></button>
                                               </div>
                                               
                                               {(!selectedEntity.milestones || selectedEntity.milestones.length === 0) ? (
                                                   <div className="flex flex-col items-center justify-center h-40 opacity-50 border border-dashed border-slate-700 rounded-[40px]">
                                                      <History size={24} className="text-slate-600 mb-2"/>
                                                      <p className="text-slate-500 italic font-serif text-xs">Chưa có Kỷ Nguyên nào...</p>
                                                   </div>
                                               ) : (
                                                   <>
                                                      <div className="absolute left-[15px] top-16 bottom-6 w-px bg-gradient-to-b from-amber-900/50 via-slate-700 to-transparent z-0"></div>
                                                      <div className="space-y-4 relative z-10 py-2">
                                                         {selectedEntity.milestones?.map(ms => {
                                                            const isSelected = selectedMilestoneId === ms.id;
                                                            return (
                                                             <button key={ms.id} onClick={() => setSelectedMilestoneId(ms.id)} className={`w-full text-left p-4 rounded-2xl flex items-start gap-4 transition-all duration-300 group ${isSelected ? 'bg-gradient-to-r from-amber-900/40 to-slate-900 border border-amber-700/50 shadow-lg translate-x-2' : 'bg-transparent border border-transparent hover:bg-slate-900 hover:border-slate-800'}`}>
                                                                 <div className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-amber-400 border-amber-900 shadow-[0_0_10px_var(--t-400)]' : 'bg-slate-800 border-slate-950 group-hover:bg-slate-600'}`}></div>
                                                                 <div className="flex-1 min-w-0">
                                                                    <div className={`text-sm font-bold uppercase tracking-widest font-heading mb-1 transition-colors ${isSelected ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-300'}`}>Chương {safeString(ms.chapter)}</div>
                                                                    <div className={`text-xs font-serif line-clamp-2 leading-relaxed ${isSelected ? 'text-slate-200' : 'text-slate-500 group-hover:text-slate-400'}`}>{safeString(ms.event)}</div>
                                                                 </div>
                                                             </button>
                                                            )
                                                         })}
                                                      </div>
                                                   </>
                                               )}
                                            </div>

                                            <div className="w-full md:w-2/3 overflow-y-auto custom-scrollbar pl-2 pr-2">
                                               {selectedMilestoneId && selectedEntity.milestones?.find(m => m.id === selectedMilestoneId) ? (() => {
                                                  const selectedMs = selectedEntity.milestones.find(m => m.id === selectedMilestoneId);
                                                  const fields = currentTabConfig?.fieldsTemplate || DEFAULT_ENTITY_FIELDS;
                                                  const mergedAvatar = selectedMs.snapshot?.avatar || selectedEntity.avatar;
                                                  
                                                  return (
                                                      <div className="animate-fade-in space-y-6">
                                                         <div className="relative bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-[40px] p-8 shadow-2xl overflow-hidden group">
                                                            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-600/5 rounded-bl-[40px] pointer-events-none transition-transform duration-700 group-hover:scale-110"></div>
                                                            <div className="flex justify-between items-start mb-6 relative z-10">
                                                               <div className="flex-1 pr-6">
                                                                  <div className="flex items-center gap-2 mb-2 text-amber-600/80">
                                                                     <History size={14}/> <span className="text-[10px] uppercase font-bold tracking-widest">Kỷ Nguyên / Sự kiện</span>
                                                                  </div>
                                                                  <h3 className="text-3xl font-heading font-bold text-amber-500">Giai đoạn chương {safeString(selectedMs.chapter)}</h3>
                                                               </div>
                                                               <div className="flex gap-2">
                                                                  {/* Nút merge snapshot → Hồ Sơ */}
                                                                  {selectedMs.snapshot && (Object.values(selectedMs.snapshot.dynamicData || {}).some(v => v) || selectedMs.snapshot.avatar) && (
                                                                    <button
                                                                      onClick={() => handleMergeSnapshotToProfile(selectedMs.snapshot)}
                                                                      className="px-3 py-2 bg-emerald-900/30 hover:bg-emerald-800/50 text-emerald-400 hover:text-emerald-300 rounded-xl transition-all border border-emerald-700/40 hover:border-emerald-500/60 shadow-sm text-xs font-bold flex items-center gap-1.5"
                                                                      title="Áp dụng thông tin mốc này vào Hồ Sơ hiện tại"
                                                                    >
                                                                      <Check size={14}/> Áp dụng vào Hồ Sơ
                                                                    </button>
                                                                  )}
                                                                  <button onClick={() => { setEditingMilestoneData(selectedMs); setIsMilestoneModalOpen(true); }} className="p-2.5 bg-slate-950/50 hover:bg-slate-800 hover:text-amber-400 text-slate-500 rounded-xl transition-all border border-slate-800 hover:border-amber-900/50 shadow-sm" title="Sửa lại nội dung"><Edit2 size={18}/></button>
                                                                  <button onClick={() => handleDeleteMilestone(selectedMs.id)} className="p-2.5 bg-slate-950/50 hover:bg-rose-950 hover:text-rose-400 text-slate-500 rounded-xl transition-all border border-slate-800 hover:border-rose-900/50 shadow-sm" title="Xóa mốc thời gian này"><Trash2 size={18}/></button>
                                                               </div>
                                                            </div>
                                                            <div className="prose prose-invert max-w-none relative z-10 text-[17px] text-slate-200 font-serif leading-loose whitespace-pre-wrap">
                                                               {renderMarkdown(safeString(selectedMs.event), currentContextDirHandle, entityMap, globalLinkRegex, (dest) => { if(navFnRef.current) navFnRef.current(dest); })}
                                                            </div>
                                                         </div>

                                                         <div className="relative mt-8 bg-amber-900/10 backdrop-blur-md border border-amber-700/30 rounded-[40px] p-8 pt-10 shadow-inner">
                                                            <div className="absolute -top-4 left-8 bg-slate-950 px-4 py-1.5 text-[10px] text-amber-500 tracking-widest uppercase font-bold border border-amber-900/50 rounded-full shadow-lg flex items-center gap-2">
                                                               <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div> Hồ Sơ Thời Kỳ Này
                                                            </div>
                                                            
                                                            <div className="flex flex-col md:flex-row gap-8 items-start mb-6 border-b border-amber-800/30 pb-6">
                                                               <div
                                                                  className="w-24 h-24 rounded-2xl bg-slate-950 border-2 border-amber-500/30 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-xl relative group/avatar cursor-zoom-in"
                                                                  onClick={() => mergedAvatar && setLightboxSrc(mergedAvatar)}
                                                                  title="Nhấp để xem ảnh đầy đủ"
                                                               >
                                                                  {mergedAvatar ? (
                                                                     mergedAvatar.startsWith('local_image:') ? (
                                                                        <AsyncLocalImage filename={mergedAvatar.replace('local_image:', '')} alt="avatar" dirHandle={currentContextDirHandle} className="w-full h-full object-cover transition-transform duration-500 group-hover/avatar:scale-110" />
                                                                     ) : <img src={mergedAvatar} className="w-full h-full object-cover transition-transform duration-500 group-hover/avatar:scale-110" alt="avatar" onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMG; }} />
                                                                  ) : (
                                                                     <span className="text-3xl font-bold text-amber-500">{safeString(selectedEntity.name).charAt(0)}</span>
                                                                  )}
                                                               </div>
                                                               <div>
                                                                   <h4 className="text-2xl font-heading font-bold text-amber-100 mb-1">{safeString(selectedEntity.name)}</h4>
                                                                   <p className="text-xs text-amber-600/80 font-serif italic mb-2">Trạng thái được ghi nhận lúc chương {safeString(selectedMs.chapter)}.</p>
                                                                   {selectedMs.snapshot?.avatar && <span className="px-2 py-1 bg-amber-900/30 text-amber-400 text-[10px] rounded border border-amber-700/50">Có thay đổi hình dáng</span>}
                                                               </div>
                                                            </div>
                                                            
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                               {fields.map(f => {
                                                                  const baseVal = safeString(getFieldValue(f.id, selectedEntity));
                                                                  const snapshotVal = safeString(selectedMs.snapshot?.dynamicData?.[f.id]);
                                                                  const finalVal = snapshotVal || baseVal;
                                                                  const isChanged = !!snapshotVal && snapshotVal !== baseVal;
                                                                  const isNew = !!snapshotVal && !baseVal;
                                                                  const isCurrent = !snapshotVal && !!baseVal;

                                                                  // Nhãn chú thích trạng thái
                                                                  const statusNote = isNew
                                                                    ? { text: '✦ Lần đầu xuất hiện', color: 'text-emerald-400', border: 'border-emerald-700/40', bg: 'bg-emerald-950/30' }
                                                                    : isChanged
                                                                    ? { text: '↑ Tiến bộ / Thay đổi', color: 'text-amber-400', border: 'border-amber-700/40', bg: 'bg-amber-950/20' }
                                                                    : isCurrent
                                                                    ? { text: '● Trạng thái hiện tại', color: 'text-slate-500', border: 'border-slate-700/40', bg: 'bg-slate-900/20' }
                                                                    : null;

                                                                  return (
                                                                     <div key={f.id} className={`rounded-2xl p-4 border transition-all ${
                                                                       isNew ? 'bg-emerald-900/10 border-emerald-800/40' :
                                                                       isChanged ? 'bg-amber-900/10 border-amber-800/40' :
                                                                       'bg-slate-900/30 border-slate-800/50'
                                                                     }`}>
                                                                        {/* Label */}
                                                                        <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500 block mb-2">{safeString(f.label)}</span>

                                                                        {/* Chú thích trạng thái — dạng pill nhỏ italic phía trên giá trị */}
                                                                        {statusNote && (
                                                                          <div className={`inline-flex items-center px-2.5 py-1 rounded-full border mb-2.5 ${statusNote.bg} ${statusNote.border}`}>
                                                                            <span className={`text-[10px] font-serif italic ${statusNote.color}`}>{statusNote.text}</span>
                                                                          </div>
                                                                        )}

                                                                        {/* Giá trị */}
                                                                        {isChanged && !isNew && baseVal ? (
                                                                          <div className="space-y-1">
                                                                            <div className="flex items-baseline gap-2">
                                                                              <span className="text-[9px] text-slate-600 uppercase font-bold flex-shrink-0">Cũ</span>
                                                                              <span className="text-sm font-serif text-slate-600 line-through leading-relaxed">{baseVal}</span>
                                                                            </div>
                                                                            <div className="flex items-baseline gap-2">
                                                                              <span className="text-[9px] text-amber-600 uppercase font-bold flex-shrink-0">Mới</span>
                                                                              <span className="text-sm font-serif text-amber-200 font-medium leading-relaxed">{snapshotVal}</span>
                                                                            </div>
                                                                          </div>
                                                                        ) : isNew ? (
                                                                          <span className="text-sm font-serif text-emerald-200 font-medium leading-relaxed">{snapshotVal}</span>
                                                                        ) : finalVal ? (
                                                                          <span className="text-sm font-serif text-slate-400 leading-relaxed">{finalVal}</span>
                                                                        ) : (
                                                                          <span className="text-sm font-serif text-slate-700 italic">Chưa ghi nhận</span>
                                                                        )}
                                                                     </div>
                                                                  )
                                                               })}
                                                            </div>
                                                         </div>
                                                      </div>
                                                  );
                                               })() : (
                                                   <div className="h-full flex flex-col items-center justify-center text-slate-600 font-serif italic pb-20">
                                                      <div className="relative mb-6">
                                                         <Clock size={64} className="text-slate-800" />
                                                         <Sparkles size={24} className="absolute -top-2 -right-2 text-amber-900/50" />
                                                      </div>
                                                      Chọn một Kỷ nguyên bên trái để lật giở trang sử...
                                                   </div>
                                               )}
                                            </div>
                                         </div>
                                      )}
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

      <ModalEntity isOpen={isEntityModalOpen} onClose={() => setIsEntityModalOpen(false)} onSave={handleSaveEntity} initialData={editingEntityData} tabConfig={currentTabConfig} onUpdateTemplate={handleUpdateTabTemplate} handleAvatarDrop={handleAvatarDrop} handlePickLocalImage={handlePickLocalImage} dirHandle={currentContextDirHandle} parentTabId={activeTabLon} parentLabel={currentTabConfig?._parentLabel} geminiApiKey={geminiApiKeys} />
      <ModalMilestone isOpen={isMilestoneModalOpen} onClose={() => setIsMilestoneModalOpen(false)} onSave={handleSaveMilestone} initialData={editingMilestoneData} defaultChapterWhenNew={editingMilestoneData ? undefined : String(Math.max(0, parseInt(activeNovelData?.readingAnchorChapter ?? activeNovelData?.chaptersRead ?? 0, 10) || 0))} tabConfig={currentTabConfig} onUpdateTemplate={handleUpdateTabTemplate} handleAvatarDrop={handleAvatarDrop} handlePickLocalImage={handlePickLocalImage} dirHandle={currentContextDirHandle} parentTabId={activeTabLon} parentLabel={currentTabConfig?._parentLabel} geminiApiKey={geminiApiKeys} />
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
        wikiExactMatchOnly={wikiExactMatchOnly}
        setWikiExactMatchOnly={setWikiExactMatchOnly}
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

      {/* LIGHTBOX */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[500] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 animate-fade-fast cursor-zoom-out"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full p-2 transition-colors z-10"
            onClick={() => setLightboxSrc(null)}
            title="Đóng (Esc)"
          >
            <X size={24} />
          </button>
          <div className="max-w-[90vw] max-h-[90vh] flex items-center justify-center" onClick={e => e.stopPropagation()}>
            {lightboxSrc.startsWith('local_image:') ? (
              <AsyncLocalImage
                filename={lightboxSrc.replace('local_image:', '')}
                alt="Xem ảnh"
                dirHandle={currentContextDirHandle}
                className="max-w-full max-h-[88vh] rounded-xl shadow-2xl object-contain border border-slate-700"
              />
            ) : (
              <img
                src={lightboxSrc}
                alt="Xem ảnh"
                className="max-w-full max-h-[88vh] rounded-xl shadow-2xl object-contain border border-slate-700"
                onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMG; }}
              />
            )}
          </div>
        </div>
      )}

      {/* HOVER NOVEL TOOLTIP - render ở root level tránh bị clip */}
      {hoveredNovelData && (
        <div
          className="fixed z-[500] w-60 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-3 pointer-events-none animate-fade-fast"
          style={{ left: tooltipPos.x + 'px', top: tooltipPos.y + 'px' }}
        >
          {hoveredNovelData.cover && !hoveredNovelData.cover.startsWith('local_image:') && (
            <img src={hoveredNovelData.cover} className="w-full h-28 object-cover rounded-lg mb-2" alt="" onError={e=>{e.target.style.display='none'}}/>
          )}
          <p className="text-sm font-bold text-amber-400 font-serif leading-tight mb-1">{safeString(hoveredNovelData.title)}</p>
          <p className="text-[10px] text-slate-500 mb-2">{safeString(hoveredNovelData.author)}</p>
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${hoveredNovelData.status === 'Hoàn thành' ? 'bg-emerald-900/40 text-emerald-400 border-emerald-700/40' : hoveredNovelData.status === 'Tạm ngưng' ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-amber-900/30 text-amber-400 border-amber-700/40'}`}>
              {hoveredNovelData.status || 'Đang đọc'}
            </span>
            {hoveredNovelData.chaptersRead > 0 && (
              <span className="text-[10px] text-slate-500 font-serif">
                Ch.{hoveredNovelData.chaptersRead}{hoveredNovelData.chaptersTotal && hoveredNovelData.chaptersTotal !== '???' ? `/${hoveredNovelData.chaptersTotal}` : ''}
              </span>
            )}
          </div>
          {hoveredNovelData.chaptersTotal && hoveredNovelData.chaptersTotal !== '???' && parseInt(hoveredNovelData.chaptersTotal) > 0 && (
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all" style={{width:`${Math.min(100, Math.round((parseInt(hoveredNovelData.chaptersRead||0)/parseInt(hoveredNovelData.chaptersTotal))*100))}%`}}></div>
            </div>
          )}
        </div>
      )}

      {toastMessage && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] animate-fade-fast px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border max-w-[min(96vw,520px)] ${
          toastMessage.type === 'error' ? 'bg-rose-950 border-rose-700 text-rose-100' :
          toastMessage.type === 'warning' ? 'bg-amber-950 border-amber-700 text-amber-100' :
          'bg-slate-800 border-slate-700 text-slate-100'
        }`}>
           <Sparkles size={18} className={`flex-shrink-0 animate-pulse ${toastMessage.type === 'error' ? 'text-rose-400' : toastMessage.type === 'warning' ? 'text-amber-400' : 'text-emerald-400'}`} />
           <span className="font-serif text-sm flex-1 min-w-0">{safeString(toastMessage.msg)}</span>
           {toastMessage.onUndo && (
             <button
               type="button"
               onClick={() => {
                 const fn = toastMessage.onUndo;
                 if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                 setToastMessage(null);
                 toastTimerRef.current = null;
                 try { fn(); } catch (_) {}
               }}
               className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold font-serif border border-indigo-500/50"
             >
               {safeString(toastMessage.undoLabel || 'Hoàn tác')}
             </button>
           )}
        </div>
      )}

      {isUploading && (
        <div className="fixed inset-0 z-[400] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-fast">
           <div className="w-16 h-16 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mb-4 shadow-xl"></div>
           <p className="text-amber-500 font-heading text-lg animate-pulse">Đang luân chuyển linh ảnh...</p>
        </div>
      )}

      <AppPhongChuVaTheme />
    </div>
  );
}