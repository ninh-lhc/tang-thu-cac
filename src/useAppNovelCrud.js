// ==========================================
// useAppNovelCrud.js
// Purpose: own add/edit/delete novel modal state and CRUD handlers.
// Imported by: App.jsx.
// Notes: keeps novel form defaults and metadata mutations out of the main shell.
// ==========================================

import { useCallback, useState } from 'react';
import { ensureCollectionListCardsForNovel } from './lib/collectionListCardSync.js';
import { hydrateTabsAutoSyncConfigs } from './lib/tabAutoSyncFieldMap.js';

const DEFAULT_THEME = 'theme-tien-hiep';
const DEFAULT_STATUS = 'Dang doc';
const DEFAULT_AUTHOR = 'Vo Danh';

function buildEmptyNovelForm(genres) {
  return {
    title: '',
    author: '',
    genres: Array.isArray(genres) && genres.length > 0 ? [genres[0]] : [],
    theme: DEFAULT_THEME,
    cover: '',
    status: DEFAULT_STATUS,
    chaptersTotal: '',
    tabsConfig: undefined,
  };
}

export function useAppNovelCrud({
  genres,
  initialTabsConfig,
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
}) {
  const [isAddNovelOpen, setIsAddNovelOpen] = useState(false);
  const [novelModalMode, setNovelModalMode] = useState('create');
  const [novelForm, setNovelForm] = useState(() => buildEmptyNovelForm(genres));

  const handleOpenCreateNovel = useCallback(() => {
    setNovelForm(buildEmptyNovelForm(genres));
    setNovelModalMode('create');
    setIsAddNovelOpen(true);
  }, [genres]);

  const handleOpenEditNovel = useCallback(() => {
    if (!activeNovelData) return;

    let normalizedGenres = [];
    if (Array.isArray(activeNovelData.genres)) normalizedGenres = activeNovelData.genres;
    else if (typeof activeNovelData.genres === 'string') normalizedGenres = [activeNovelData.genres];
    else if (activeNovelData.genre) normalizedGenres = [activeNovelData.genre];

    setNovelForm({
      title: activeNovelData.title,
      author: activeNovelData.author,
      genres: normalizedGenres,
      theme: activeNovelData.theme || DEFAULT_THEME,
      cover: activeNovelData.cover,
      status: activeNovelData.status,
      chaptersTotal: activeNovelData.chaptersTotal,
      tabsConfig: activeNovelData.tabsConfig,
    });
    setNovelModalMode('edit');
    setIsAddNovelOpen(true);
  }, [activeNovelData]);

  const handleSaveNovelModal = useCallback(async () => {
    if (!novelForm.title.trim()) return;

    if (novelModalMode === 'create') {
      const newId = generateId('novel');
      const safeTitle = novelForm.title.replace(/[\\/:*?"<>|]/g, '').trim() || newId;
      const folderName = safeTitle;

      const newMeta = {
        id: newId,
        title: novelForm.title,
        author: novelForm.author || DEFAULT_AUTHOR,
        genres: novelForm.genres || [],
        theme: novelForm.theme || DEFAULT_THEME,
        tags: [],
        chaptersRead: 0,
        chaptersTotal: novelForm.chaptersTotal || '???',
        status: novelForm.status,
        rating: 0,
        review: '',
        ratingOpinion: '',
        cover: novelForm.cover,
        folderName,
      };

      const tabsToUse =
        hydrateTabsAutoSyncConfigs(
          Array.isArray(novelForm.tabsConfig) && novelForm.tabsConfig.length > 0
            ? structuredClone(novelForm.tabsConfig)
            : structuredClone(initialTabsConfig)
        ).tabsConfig;
      const newFullData = {
        ...newMeta,
        data: {},
        tabsConfig: tabsToUse,
        chapterCrossRefs: [],
        readingJournal: [],
      };
      ensureCollectionListCardsForNovel(newFullData, { createMissingTabBuckets: true });
      const newMetaList = [newMeta, ...novelsMetadata];
      const nextStats = {
        ...novelStatsByIdRef.current,
        [newId]: { entities: 0, milestones: 0, byTab: [] },
      };

      novelStatsByIdRef.current = nextStats;
      setNovelStatsById(nextStats);
      setNovelsMetadata(newMetaList);
      setActiveNovelData(newFullData);
      novelsMetadataRef.current = newMetaList;
      setIsAddNovelOpen(false);
      setMenu1Visible(false);
      setActiveTabLon('tong-quan');
      setActiveTabNho(null);
      setActiveTabCon(null);

      if (dirHandle && dirHandle !== 'LOCAL_STORAGE') {
        try {
          const novelDirHandle = await dirHandle.getDirectoryHandle(folderName, { create: true });
          setActiveNovelDirHandle(novelDirHandle);
        } catch {
          void 0;
        }
      }

      await syncIndex(newMetaList, globalTabsConfig, dirHandle, nextStats);
      await syncNovel(newFullData, dirHandle);
      showToast('Khai sinh thu tich moi thanh cong!');
      return;
    }

    await updateActiveNovelData((novel) => {
      novel.title = novelForm.title;
      novel.author = novelForm.author;
      novel.genres = novelForm.genres;
      novel.theme = novelForm.theme;
      novel.cover = novelForm.cover;
      novel.status = novelForm.status;
      novel.chaptersTotal = novelForm.chaptersTotal;
    });
    setIsAddNovelOpen(false);
    showToast('Da tu bo thong tin thu tich!');
  }, [
    novelForm,
    novelModalMode,
    generateId,
    initialTabsConfig,
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
    novelsMetadataRef,
    novelStatsByIdRef,
  ]);

  const handleDeleteNovel = useCallback(async (id) => {
    const meta = novelsMetadata.find((item) => item.id === id);
    const folderName = meta
      ? meta.folderName || (meta.title || '').replace(/[\\/:*?"<>|]/g, '').trim() || meta.id
      : null;
    const newMetaList = novelsMetadata.filter((item) => item.id !== id);
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
      } catch (error) {
        console.warn('[TTC] Khong xoa duoc thu muc truyen:', folderName, error);
        setTimeout(() => {
          showToast(`Da xoa khoi so nhung khong xoa duoc thu muc "${folderName}".`, 'warning');
        }, 0);
      }
    }

    setActiveNovelData(null);
    setActiveNovelDirHandle(null);
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    showToast('Da huy diet thu tich!');
  }, [
    novelsMetadata,
    dirHandle,
    globalTabsConfig,
    syncIndex,
    showToast,
    setNovelStatsById,
    setNovelsMetadata,
    setActiveNovelData,
    setActiveNovelDirHandle,
    setConfirmDialog,
    novelsMetadataRef,
    novelStatsByIdRef,
  ]);

  return {
    isAddNovelOpen,
    setIsAddNovelOpen,
    novelModalMode,
    novelForm,
    setNovelForm,
    handleOpenCreateNovel,
    handleOpenEditNovel,
    handleSaveNovelModal,
    handleDeleteNovel,
  };
}
