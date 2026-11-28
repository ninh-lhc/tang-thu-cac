// ==========================================
// useAppNovelCrud.js
// Purpose: own add/edit/delete novel modal state and CRUD handlers.
// Imported by: App.jsx.
// Notes: keeps novel form defaults and metadata mutations out of the main shell.
// ==========================================

import { useCallback, useRef, useState } from 'react';
import { ensureCollectionListCardsForNovel } from './lib/collectionListCardSync.js';
import { markAllShardsDirty } from './lib/dirtyShardTracker.js';
import { removeNovelStorageFromRoot } from './lib/novelDiskLayout.js';
import { deleteBrowserRecord } from './lib/browserLibraryStore.js';
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
  const creatingNovelRef = useRef(false);
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
      if (creatingNovelRef.current) return;
      creatingNovelRef.current = true;
      try {
        const newId = generateId('novel');
        const safeTitle = safeString(normalizedTitle).replace(/[\\/:*?"<>|]/g, '').trim() || newId;
        let folderName = safeTitle;
        const diskRoot = dirHandle && dirHandle !== 'LOCAL_STORAGE' ? dirHandle : null;
        if (diskRoot) {
          try {
            await diskRoot.getDirectoryHandle(safeTitle);
            folderName = `${safeTitle} - ${newId}`;
          } catch (error) {
            if (error?.name === 'TypeMismatchError') folderName = `${safeTitle} - ${newId}`;
            else if (error?.name !== 'NotFoundError') throw error;
          }
        }

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
        markAllShardsDirty(newFullData?.data);
        const novelResult = await syncNovel(newFullData, dirHandle, { immediate: true, forceBackup: true });
        if (!novelResult?.ok) {
          showToast('Chưa lưu được truyện. Hãy kiểm tra quyền ghi và thử lại.', 'error');
          return;
        }
        const novelDir = diskRoot ? await diskRoot.getDirectoryHandle(folderName).catch(() => null) : null;
        const newMetaList = [newMeta, ...novelsMetadataRef.current];
        const nextStats = {
          ...novelStatsByIdRef.current,
          [newId]: { entities: 0, milestones: 0, byTab: [] },
        };

        novelStatsByIdRef.current = nextStats;
        setNovelStatsById(nextStats);
        setNovelsMetadata(newMetaList);
        setActiveNovelData(newFullData);
        setActiveNovelDirHandle(novelDir);
        novelsMetadataRef.current = newMetaList;
        setIsAddNovelOpen(false);
        setMenu1Visible(false);
        setActiveTabLon('tong-quan');
        setActiveTabNho(null);
        setActiveTabCon(null);

        const indexResult = await syncIndex(newMetaList, globalTabsConfig, dirHandle, nextStats);
        if (!indexResult?.ok) {
          showToast('Đã lưu truyện nhưng chưa ghi được danh mục.', 'warning');
          return;
        }
        showToast('Khai sinh thu tich moi thanh cong!');
        return;
      } catch (error) {
        console.warn('[TTC] Không thể tạo truyện:', error);
        showToast('Không thể tạo truyện. Hãy kiểm tra thư mục lưu và thử lại.', 'error');
        return;
      } finally {
        creatingNovelRef.current = false;
      }
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

    try {
      if (!dirHandle || dirHandle === 'LOCAL_STORAGE') await deleteBrowserRecord(`tangthu_novel_${id}`);
      if (dirHandle && dirHandle !== 'LOCAL_STORAGE' && meta) {
        await awaitNovelDiskIdle?.();
        await new Promise((resolve) => setTimeout(resolve, 50));
        const result = await removeNovelStorageFromRoot(dirHandle, meta);
        if (!result.ok && result.reason !== 'not_found') {
          showToast('Ch?a x?a ???c d? li?u truy?n kh?i th? m?c l?u.', 'error');
          return;
        }
      }
    } catch (error) {
      console.warn('[TTC] Kh?ng th? x?a truy?n:', error);
      showToast('Ch?a x?a ???c d? li?u truy?n kh?i th? m?c l?u.', 'error');
      return;
    }

    const newMetaList = novelsMetadataRef.current.filter((item) => item.id !== id);
    const nextStats = { ...novelStatsByIdRef.current };

    delete nextStats[id];
    novelStatsByIdRef.current = nextStats;
    setNovelStatsById(nextStats);
    setNovelsMetadata(newMetaList);
    novelsMetadataRef.current = newMetaList;

    void clearNovelShadow(id);

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
