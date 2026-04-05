/**
 * Central shell state for App.jsx.
 * Owns the big pile of top-level UI state, localStorage-backed settings,
 * and the refs that other hooks need to share.
 * Keeps App.jsx focused on orchestration instead of state wiring.
 */
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { INITIAL_TABS_CONFIG, MOCK_METADATA } from './MasterEngines.js';
import { migrateIndex } from './dataMigration.js';
import { safeString } from './MasterUtils.jsx';
import {
  readLocalBooleanSafe,
  readLocalJsonWithBackup,
  readLocalStringSafe,
  writeLocalJsonWithBackup,
  writeLocalStringSafe,
} from './storageSafe.js';
import {
  clearPersistedDirectoryHandle,
  isPersistedDirectoryHandleUsable,
  loadPersistedDirectoryHandle,
} from './lib/directoryHandleStore.js';
import { useToast } from './useToast.js';

function readLocalString(key, fallback = '') {
  return readLocalStringSafe(key, fallback);
}

function readLocalBoolean(key, fallback = false) {
  return readLocalBooleanSafe(key, fallback);
}

function readGeminiApiKeys() {
  const { value: parsed } = readLocalJsonWithBackup('tangthu_apikeys', 'tangthu_apikeys_backup', []);
  if (Array.isArray(parsed) && parsed.length > 0) return parsed;

  const legacyKey = readLocalString('tangthu_apikey', '');
  return legacyKey ? [legacyKey] : [];
}

function isEmbeddedPreview() {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return false;
  }
}

export function useAppShellState() {
  const embeddedPreviewBootstrap = useMemo(() => {
    if (!isEmbeddedPreview()) return null;
    const { value: parsed } = readLocalJsonWithBackup('tangthu_index', 'tangthu_index_backup', null);
    if (!parsed) return null;
    try {
      return migrateIndex(parsed);
    } catch {
      return null;
    }
  }, []);

  const embeddedPreviewMetadata =
    Array.isArray(embeddedPreviewBootstrap?.metadata) && embeddedPreviewBootstrap.metadata.length > 0
      ? embeddedPreviewBootstrap.metadata
      : MOCK_METADATA;
  const embeddedPreviewConfig = Array.isArray(embeddedPreviewBootstrap?.config)
    ? embeddedPreviewBootstrap.config
    : INITIAL_TABS_CONFIG;
  const embeddedPreviewStats =
    embeddedPreviewBootstrap?.novelStats && typeof embeddedPreviewBootstrap.novelStats === 'object'
      ? embeddedPreviewBootstrap.novelStats
      : {};

  const [novelsMetadata, setNovelsMetadata] = useState(embeddedPreviewMetadata);
  const [activeNovelData, setActiveNovelData] = useState(null);
  const [globalTabsConfig, setGlobalTabsConfig] = useState(embeddedPreviewConfig);

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
  const [recentlyMergedFields, setRecentlyMergedFields] = useState(new Set());
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

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  const [overviewForm, setOverviewForm] = useState(null);

  const [wikiExactMatchOnly, setWikiExactMatchOnly] = useState(() => readLocalBoolean('tangthu_wiki_exact', false));
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPaletteQuery, setCommandPaletteQuery] = useState('');
  const deferredCommandPaletteQuery = useDeferredValue(commandPaletteQuery);
  const [overviewStatsOpen, setOverviewStatsOpen] = useState(false);
  const commandPaletteOpenRef = useRef(false);

  const [dirHandle, setDirHandle] = useState(embeddedPreviewBootstrap ? 'LOCAL_STORAGE' : null);
  const [activeNovelDirHandle, setActiveNovelDirHandle] = useState(null);
  const isDirectoryConnectionBootstrapping = false;
  const setIsDirectoryConnectionBootstrapping = () => {};
  const shouldAutoRestoreDirectory = false;

  const { toastMessage, setToastMessage, toastTimerRef, showToast } = useToast();

  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [editingTab, setEditingTab] = useState(null);

  const [geminiApiKeys, setGeminiApiKeys] = useState(() => readGeminiApiKeys());
  const handleSaveApiKeys = useCallback((keys) => {
    const filtered = keys.map((k) => k.trim()).filter(Boolean);
    setGeminiApiKeys(filtered);
    writeLocalJsonWithBackup('tangthu_apikeys', 'tangthu_apikeys_backup', filtered);
    if (filtered.length > 0) writeLocalStringSafe('tangthu_apikey', filtered[0]);
  }, []);
  const [aiMode, setAiMode] = useState(() => {
    const saved = readLocalString('tangthu_ai_mode', 'standard');
    return saved === 'quick' ? 'quick' : 'standard';
  });
  const [performanceMode, setPerformanceMode] = useState(() => readLocalBoolean('tangthu_perf_mode', false));
  const [autoLinkToastEnabled, setAutoLinkToastEnabled] = useState(() => {
    const saved = readLocalString('tangthu_autolink_toast', '1');
    return saved !== '0';
  });

  const [novelStatsById, setNovelStatsById] = useState(embeddedPreviewStats);
  const [isStatsBackfilling, setIsStatsBackfilling] = useState(false);
  const novelStatsByIdRef = useRef({});
  const novelsMetadataRef = useRef(novelsMetadata);
  const globalTabsConfigRef = useRef(globalTabsConfig);
  const dirHandleRef = useRef(dirHandle);
  const activeNovelDataRef = useRef(activeNovelData);
  const deepSearchIndexByNovelIdRef = useRef(new Map());
  const deepSearchWorkerRef = useRef(null);
  const deepSearchWorkerReqIdRef = useRef(0);
  const lazyTabLoadInFlightRef = useRef(new Set());
  const lazyFullHydrateInFlightRef = useRef(new Set());
  const confirmDeleteEntityRef = useRef(null);
  const directoryRestoreAttemptedRef = useRef(false);

  useEffect(() => {
    commandPaletteOpenRef.current = isCommandPaletteOpen;
    novelsMetadataRef.current = novelsMetadata;
    globalTabsConfigRef.current = globalTabsConfig;
    dirHandleRef.current = dirHandle;
    activeNovelDataRef.current = activeNovelData;
    novelStatsByIdRef.current = novelStatsById;
  }, [
    activeNovelData,
    dirHandle,
    globalTabsConfig,
    isCommandPaletteOpen,
    novelStatsById,
    novelsMetadata,
  ]);

  useEffect(() => {
    if (directoryRestoreAttemptedRef.current) return;
    directoryRestoreAttemptedRef.current = true;
    if (shouldAutoRestoreDirectory) {
    if (isEmbeddedPreview()) {
      directoryRestoreAttemptedRef.current = true;
      setIsDirectoryConnectionBootstrapping(false);
      return;
    }
    if (dirHandle) {
      directoryRestoreAttemptedRef.current = true;
      setIsDirectoryConnectionBootstrapping(false);
      return;
    }

    directoryRestoreAttemptedRef.current = true;
    let cancelled = false;

    const applySnapshot = (snapshot) => {
      if (!snapshot || typeof snapshot !== 'object') return false;
      try {
        const parsed = migrateIndex(snapshot);
        const nextMetadata = Array.isArray(parsed.metadata) ? parsed.metadata : [];
        const nextConfig = Array.isArray(parsed.config) && parsed.config.length > 0
          ? parsed.config
          : INITIAL_TABS_CONFIG;
        const nextStats =
          parsed.novelStats && typeof parsed.novelStats === 'object' ? parsed.novelStats : {};
        setNovelsMetadata(nextMetadata);
        setGlobalTabsConfig(nextConfig);
        setNovelStatsById(nextStats);
        setActiveNovelData(null);
        setActiveNovelDirHandle(null);
        novelsMetadataRef.current = nextMetadata;
        globalTabsConfigRef.current = nextConfig;
        novelStatsByIdRef.current = nextStats;
        return true;
      } catch {
        return false;
      }
    };

    const loadSnapshotFromHandle = async (handle) => {
      for (const filename of ['index.json', 'index.backup.json']) {
        try {
          const fileHandle = await handle.getFileHandle(filename);
          const file = await fileHandle.getFile();
          const snapshot = JSON.parse(await file.text());
          if (applySnapshot(snapshot)) return true;
        } catch {
          /* try next source */
        }
      }
      return false;
    };

    const loadShadowSnapshot = () => {
      try {
        const raw = localStorage.getItem('tangthu_index_shadow');
        if (!raw) return false;
        return applySnapshot(JSON.parse(raw));
      } catch {
        return false;
      }
    };

    const run = async () => {
      let storedHandle = null;
      let restoredConnection = false;
      let hydratedFromDisk = false;

      try {
        storedHandle = await loadPersistedDirectoryHandle();
        if (cancelled) return;

        if (storedHandle) {
          const usable = await isPersistedDirectoryHandleUsable(storedHandle);
          if (cancelled) return;
          if (usable) {
            restoredConnection = true;
            setDirHandle(storedHandle);
            hydratedFromDisk = await loadSnapshotFromHandle(storedHandle);
            if (cancelled) return;
          } else {
            await clearPersistedDirectoryHandle();
          }
        }

        if (!cancelled && !hydratedFromDisk) {
          loadShadowSnapshot();
        }
      } catch (error) {
        console.warn('[TTC] Failed to restore directory connection:', error);
        if (!cancelled) loadShadowSnapshot();
      } finally {
        if (!cancelled) {
          setIsDirectoryConnectionBootstrapping(false);
          if (restoredConnection) {
            const restoredLabel = safeString(storedHandle?.name || '').trim();
            showToast(
              restoredLabel
                ? `Đã khôi phục thư mục "${restoredLabel}" từ lần trước.`
                : 'Đã khôi phục thư mục đã kết nối từ lần trước.',
              'success'
            );
          }
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
    }
  }, [
    dirHandle,
    globalTabsConfigRef,
    novelStatsByIdRef,
    novelsMetadataRef,
    shouldAutoRestoreDirectory,
    showToast,
    setDirHandle,
    setGlobalTabsConfig,
    setNovelStatsById,
    setNovelsMetadata,
  ]);

  useEffect(() => {
    writeLocalStringSafe('tangthu_wiki_exact', wikiExactMatchOnly ? '1' : '0');
  }, [wikiExactMatchOnly]);

  useEffect(() => {
    writeLocalStringSafe('tangthu_ai_mode', aiMode);
  }, [aiMode]);

  useEffect(() => {
    writeLocalStringSafe('tangthu_perf_mode', performanceMode ? '1' : '0');
  }, [performanceMode]);

  useEffect(() => {
    writeLocalStringSafe('tangthu_autolink_toast', autoLinkToastEnabled ? '1' : '0');
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

  useEffect(() => {
    if (!Array.isArray(novelsMetadata)) return;
    const keep = new Set(novelsMetadata.map((n) => n.id));
    const idx = deepSearchIndexByNovelIdRef.current;
    for (const k of idx.keys()) {
      if (!keep.has(k)) idx.delete(k);
    }
  }, [novelsMetadata]);

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

  return {
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
    isDirectoryConnectionBootstrapping,
    toastMessage,
    setToastMessage,
    toastTimerRef,
    showToast,
    lightboxSrc,
    setLightboxSrc,
    editingTab,
    setEditingTab,
    geminiApiKeys,
    setGeminiApiKeys,
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
  };
}
