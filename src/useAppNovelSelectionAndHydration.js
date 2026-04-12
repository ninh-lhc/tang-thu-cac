// Hook nạp dữ liệu truyện + hydrate shard cho App.jsx.
// Gom logic chọn truyện, migrate fieldsTemplate và lazy load tab.
// Hook này chỉ điều phối state, không giữ source of truth riêng.
// Dùng để giảm độ dài App.jsx nhưng vẫn giữ nguyên hành vi runtime.
import { useCallback, useEffect } from 'react';
import {
  DEFAULT_FIELDS_BY_PARENT,
  DEFAULT_FIELDS_MAP,
  guessFieldsByLabel,
  mergeFieldsTemplate,
} from './MasterEngines.js';
import { buildNovelSearchIndex, countEntitiesInNovel } from './deepSearchCore.js';
import { cleanupAutoRelationLegacyInfoForNovel, syncAllAutoRelationNotesForNovel } from './lib/autoRelationDetailNote.js';
import { syncAllCollectionListCards } from './lib/collectionListCardSync.js';
import { syncAllCultivationRelationBlocks } from './lib/cultivationRelationSync.js';
import { syncAllMainCharacterRelationBlocks } from './lib/mainCharacterRelationSync.js';
import { syncAllMapHierarchyAutoBlocks } from './lib/mapHierarchySync.js';
import {
  summarizeTheLucMapSyncWarnings,
  syncAllTheLucMapAutoBlocksDetailed,
} from './lib/theLucBanDoSync.js';
import { hydrateTabsAutoSyncConfigs } from './lib/tabAutoSyncFieldMap.js';

function syncFullNovelAutoBlocks(novelData) {
  let changed = false;
  const forceSyncResult = syncAllTheLucMapAutoBlocksDetailed(novelData);
  changed = forceSyncResult.changed || changed;
  changed = syncAllAutoRelationNotesForNovel(novelData) || changed;
  changed = syncAllMainCharacterRelationBlocks(novelData) || changed;
  changed = syncAllCultivationRelationBlocks(novelData) || changed;
  changed = syncAllMapHierarchyAutoBlocks(novelData) || changed;
  changed = syncAllCollectionListCards(novelData) || changed;
  return {
    changed,
    forceWarning: summarizeTheLucMapSyncWarnings(forceSyncResult.warnings),
  };
}

export function useAppNovelSelectionAndHydration({
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
}) {
  const migrateTabsFieldTemplates = useCallback((novelData) => {
    if (!novelData?.tabsConfig) return novelData;
    let changed = false;
    const tabs = structuredClone(novelData.tabsConfig);
    tabs.forEach((lon) => {
      (lon.subTabs || []).forEach((nho) => {
        if (nho.viewType !== 'collection-track') return;
        const target =
          DEFAULT_FIELDS_MAP[nho.id] ||
          DEFAULT_FIELDS_BY_PARENT[lon.id] ||
          guessFieldsByLabel(nho.label || '') ||
          guessFieldsByLabel(lon.label || '');
        if (!target) return;
        const cur = nho.fieldsTemplate;
        const needsUpgrade =
          !cur ||
          cur.length === 0 ||
          (cur.every((f) => /^f_/.test(f.id)) && cur.length <= target.length);
        if (needsUpgrade) {
          nho.fieldsTemplate = mergeFieldsTemplate(cur, target);
          changed = true;
        }
      });
    });
    const hydratedTabs = hydrateTabsAutoSyncConfigs(tabs);
    return changed || hydratedTabs.changed ? { ...novelData, tabsConfig: hydratedTabs.tabsConfig } : novelData;
  }, []);

  const handleSelectNovel = useCallback(
    async (meta, tabAt) => {
      setMenu1Visible(false);
      setSelectedEntityId(null);
      setNavHistory([]);
      setActiveTabLon(tabAt?.lonId || 'tong-quan');
      setActiveTabNho(tabAt?.nhoId || null);
      setActiveTabCon(null);
      setCollectionSubTab('list');
      setIsEditingMode(false);
      setIsEntityEditing(false);
      setIsUploading(true);

      try {
        // Chỉ preload một tab khi có tabAt; KHÔNG dùng mảng rỗng [] vì [] truthy.
        const loadNovelOpts =
          tabAt?.lonId != null && String(tabAt.lonId).length > 0
            ? { shardKeys: [{ lonId: tabAt.lonId, nhoId: tabAt.nhoId || 'default' }] }
            : undefined;
        const loaded = await loadNovelData(meta, dirHandle, loadNovelOpts);
        if (loaded?.novel) {
          const data = loaded.novel;
          const legacyAutoInfoCleanedCount = cleanupAutoRelationLegacyInfoForNovel(data);
          const recoveredFromBackup = Boolean(data.__recoveredFromBackup);
          if (recoveredFromBackup) delete data.__recoveredFromBackup;
          setActiveNovelDirHandle(loaded.novelDir ?? null);
          if (!data.tabsConfig) data.tabsConfig = structuredClone(globalTabsConfig);
          const autoSyncResult = !data.__partialData
            ? syncFullNovelAutoBlocks(data)
            : { changed: syncAllCollectionListCards(data), forceWarning: '' };
          const autoBlocksResynced = autoSyncResult.changed;
          const migrated = migrateTabsFieldTemplates(data);
          setActiveNovelData(migrated);
          if (autoSyncResult.forceWarning) {
            showToast(autoSyncResult.forceWarning, 'warning');
          }
          if (recoveredFromBackup) {
            showToast('Đã tự khôi phục dữ liệu truyện từ file backup.', 'warning');
          }
          if (!migrated.__partialData) {
            const s = countEntitiesInNovel(migrated);
            const prevS = novelStatsByIdRef.current[migrated.id];
            const statsChanged =
              !prevS || prevS.entities !== s.entities || prevS.milestones !== s.milestones;
            const nextStats = { ...novelStatsByIdRef.current, [migrated.id]: s };
            novelStatsByIdRef.current = nextStats;
            setNovelStatsById(nextStats);
            if (statsChanged && dirHandle) {
              void syncIndex(
                novelsMetadataRef.current,
                globalTabsConfigRef.current,
                dirHandle,
                nextStats
              );
            }
          }
          if (migrated !== data || legacyAutoInfoCleanedCount > 0 || autoBlocksResynced) {
            void syncNovel(migrated, dirHandle);
          }
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
      } finally {
        setIsUploading(false);
      }
    },
    [
      dirHandle,
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
      migrateTabsFieldTemplates,
    ]
  );

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
        const partialLoaded = await loadNovelData(activeNovelData, dirHandle, {
          shardKeys: [{ lonId, nhoId }],
        });
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
  }, [
    activeNovelData,
    activeTabLon,
    activeTabNho,
    dirHandle,
    loadNovelData,
    setActiveNovelData,
    lazyTabLoadInFlightRef,
  ]);

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
          const legacyAutoInfoCleanedCount = cleanupAutoRelationLegacyInfoForNovel(fullData);
          if (!fullData.tabsConfig) fullData.tabsConfig = structuredClone(globalTabsConfig);
          const autoSyncResult = syncFullNovelAutoBlocks(fullData);
          const autoBlocksResynced = autoSyncResult.changed;
          setActiveNovelData((prev) => {
            if (!prev || prev.id !== key) return prev;
            return fullData;
          });
          deepSearchIndexByNovelIdRef.current.set(fullData.id, buildNovelSearchIndex(fullData));
          const s = countEntitiesInNovel(fullData);
          const nextStats = { ...novelStatsByIdRef.current, [fullData.id]: s };
          novelStatsByIdRef.current = nextStats;
          setNovelStatsById(nextStats);
          void syncIndex(novelsMetadataRef.current, globalTabsConfigRef.current, dirHandle, nextStats);
          if (legacyAutoInfoCleanedCount > 0 || autoBlocksResynced) {
            void syncNovel(fullData, dirHandle);
          }
          if (autoSyncResult.forceWarning) {
            showToast(autoSyncResult.forceWarning, 'warning');
          }
        }
      } finally {
        lazyFullHydrateInFlightRef.current.delete(key);
      }
    };
    void run();
  }, [
    activeNovelData,
    activeTabLon,
    dirHandle,
    globalTabsConfig,
    loadNovelData,
    syncIndex,
    syncNovel,
    setActiveNovelData,
    deepSearchIndexByNovelIdRef,
    novelStatsByIdRef,
    setNovelStatsById,
    novelsMetadataRef,
    globalTabsConfigRef,
    lazyFullHydrateInFlightRef,
    showToast,
  ]);

  return {
    handleSelectNovel,
  };
}
