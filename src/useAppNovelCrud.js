// ==========================================
// useAppNovelCrud.js
// Purpose: own add/edit/delete novel modal state and CRUD handlers.
// Imported by: App.jsx.
// Notes: keeps novel form defaults and metadata mutations out of the main shell.
// ==========================================

import { useCallback, useState } from 'react';
import { ensureCollectionListCardsForNovel } from './lib/collectionListCardSync.js';
import { markAllShardsDirty } from './lib/dirtyShardTracker.js';
import { removeNovelStorageFromRoot } from './lib/novelDiskLayout.js';
import { clearNovelShadow } from './lib/novelShadowStore.js';
import { hydrateTabsAutoSyncConfigs } from './lib/tabAutoSyncFieldMap.js';
import { resolveTabsConfigForGenreSelection } from './lib/resolveTabsConfigForGenreSelection.js';
import { safeString, toDisplayTitleCase } from './MasterUtils.jsx';

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

function stripSuggestionSeedsFromTabsConfig(tabs) {
  if (!Array.isArray(tabs)) return [];
  return tabs.map((tab) => {
    const next = tab && typeof tab === 'object' ? { ...tab } : tab;
    if (!next || typeof next !== 'object') return next;
    delete next.fieldSuggestionLists;
    delete next.fieldSource;
    delete next.mapEntrySuggestions;
    if (Array.isArray(next.subTabs)) {
      next.subTabs = stripSuggestionSeedsFromTabsConfig(next.subTabs);
    }
    return next;
  });
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
  awaitNovelDiskIdle,
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
  activeNovelDataRef,
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
    const normalizedTitle = toDisplayTitleCase(novelForm.title);
    const normalizedAuthor = toDisplayTitleCase(novelForm.author || DEFAULT_AUTHOR);
    if (!normalizedTitle) return;

    if (novelModalMode === 'create') {
      const newId = generateId('novel');
      const safeTitle = safeString(normalizedTitle).replace(/[\\/:*?"<>|]/g, '').trim() || newId;
      const folderName = safeTitle;

      const newMeta = {
        id: newId,
        title: normalizedTitle,
        author: normalizedAuthor,
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

      const rawTabsForCreate =
        resolveTabsConfigForGenreSelection(novelForm.genres, novelForm.tabsConfig) ||
        structuredClone(initialTabsConfig);
      const tabsToUse = hydrateTabsAutoSyncConfigs(
        stripSuggestionSeedsFromTabsConfig(structuredClone(rawTabsForCreate))
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
      markAllShardsDirty(newFullData?.data);
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
      await syncNovel(newFullData, dirHandle, { immediate: true, forceBackup: true });
      showToast('Khai sinh thu tich moi thanh cong!');
      return;
    }

    await updateActiveNovelData((novel) => {
      novel.title = normalizedTitle;
      novel.author = normalizedAuthor;
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

    // Nhả FileSystemHandle trỏ vào thư mục truyện trước khi removeEntry — nếu không Chromium/Windows có thể khóa thư mục.
    if (activeNovelData?.id === id) {
      if (activeNovelDataRef) activeNovelDataRef.current = null;
      setActiveNovelData(null);
      setActiveNovelDirHandle(null);
      await new Promise((r) => setTimeout(r, 0));
    }

    const newMetaList = novelsMetadata.filter((item) => item.id !== id);
    const nextStats = { ...novelStatsByIdRef.current };

    delete nextStats[id];
    novelStatsByIdRef.current = nextStats;
    setNovelStatsById(nextStats);
    setNovelsMetadata(newMetaList);
    novelsMetadataRef.current = newMetaList;

    try {
      localStorage.removeItem(`tangthu_novel_${id}`);
    } catch {
      /* ignore */
    }
    void clearNovelShadow(id);

    try {
      if (dirHandle === 'LOCAL_STORAGE') {
        /* local keys cleared above */
      } else if (dirHandle && meta) {
        await awaitNovelDiskIdle?.();
        await new Promise((r) => setTimeout(r, 50));
        const diskResult = await removeNovelStorageFromRoot(dirHandle, meta);
        if (!diskResult.ok && diskResult.reason === 'remove_failed') {
          const label = diskResult.attempted || meta.id;
          console.warn('[TTC] Khong xoa duoc du lieu truyen tren dia:', label, diskResult.error);
          const reason = diskResult?.error?.name || String(diskResult?.error?.message || '').slice(0, 80) || 'unknown';
          setTimeout(() => {
            showToast(`Da xoa khoi so nhung khong xoa duoc du lieu «${label}» tren o (${reason}).`, 'warning');
          }, 0);
        } else if (!diskResult.ok && diskResult.reason === 'permission_denied') {
          setTimeout(() => {
            showToast(
              'Khong xoa duoc tren o: thieu quyen ghi thu muc — mo Cai dat va ket noi lai thu muc, chap nhan quyen chinh sua.',
              'warning'
            );
          }, 0);
        }
      }
    } catch (error) {
      console.warn('[TTC] Loi bat ngo khi xoa du lieu truyen tren dia:', error);
      setTimeout(() => {
        showToast('Xóa dữ liệu trên ổ có lỗi, nhưng vẫn tiếp tục cập nhật danh mục.', 'warning');
      }, 0);
    }

    const indexResult = await syncIndex(newMetaList, globalTabsConfig, dirHandle, nextStats);
    if (!indexResult?.ok) {
      setTimeout(() => {
        showToast('Đã xóa khỏi phiên hiện tại nhưng chưa ghi được index lên ổ. Hãy thử xóa lại sau khi kết nối lại thư mục.', 'warning');
      }, 0);
    }

    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    showToast('Da huy diet thu tich!');
  }, [
    novelsMetadata,
    dirHandle,
    globalTabsConfig,
    syncIndex,
    showToast,
    awaitNovelDiskIdle,
    setNovelStatsById,
    setNovelsMetadata,
    setActiveNovelData,
    setActiveNovelDirHandle,
    setConfirmDialog,
    novelsMetadataRef,
    novelStatsByIdRef,
    activeNovelData,
    activeNovelDataRef,
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
