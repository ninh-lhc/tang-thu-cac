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
import { cleanupAutoRelationLegacyInfoForNovel } from './lib/autoRelationDetailNote.js';
import { syncAllCollectionListCardsDetailed } from './lib/collectionListCardSync.js';
import { markAllShardsDirty } from './lib/dirtyShardTracker.js';
import { buildAutoSyncPlanFromTabsConfig, runNovelAutoSyncPlan } from './lib/autoSyncManager.js';
import { hydrateTabsAutoSyncConfigs } from './lib/tabAutoSyncFieldMap.js';

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
          cleanupAutoRelationLegacyInfoForNovel(data);
          const recoveredFromBackup = Boolean(data.__recoveredFromBackup);
          const recoveredFromShadow = Boolean(data.__recoveredFromShadow);
          if (recoveredFromBackup) delete data.__recoveredFromBackup;
          if (recoveredFromShadow) delete data.__recoveredFromShadow;
          setActiveNovelDirHandle(loaded.novelDir ?? null);
          let repairedEmptyTabsConfig = false;
          if (!Array.isArray(data.tabsConfig) || data.tabsConfig.length === 0) {
            data.tabsConfig = structuredClone(globalTabsConfig);
            repairedEmptyTabsConfig = true;
          }
          const partialListCardSync = data.__partialData ? syncAllCollectionListCardsDetailed(data) : null;
          const autoSyncResult = !data.__partialData
            ? runNovelAutoSyncPlan(data, buildAutoSyncPlanFromTabsConfig(data.tabsConfig || []), { recordLog: false })
            : { changed: partialListCardSync.changed, forceWarning: '' };
          const migrated = migrateTabsFieldTemplates(data);
          markAllShardsDirty(migrated?.data);
          setActiveNovelData(migrated);
          if (autoSyncResult.forceWarning) {
            showToast(autoSyncResult.forceWarning, 'warning');
          }
          if ((partialListCardSync?.recreatedCount || 0) > 0) {
            const firstTab = partialListCardSync.recreatedTabs[0] || {};
            const firstPath = [String(firstTab.lonLabel || '').trim(), String(firstTab.nhoLabel || '').trim()]
              .filter(Boolean)
              .join(' > ');
            const remainingCount = Math.max(0, partialListCardSync.recreatedCount - 1);
            const tabHint = firstPath
              ? ` (${firstPath}${remainingCount > 0 ? ` +${remainingCount} tab khác` : ''})`
              : '';
            showToast(
              `Đã tự tạo lại ${partialListCardSync.recreatedCount} thẻ Danh Sách bị thiếu${tabHint} để AUTO bậc 2 tiếp tục hoạt động.`,
              'success'
            );
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
          if (migrated !== data || recoveredFromBackup || recoveredFromShadow || repairedEmptyTabsConfig) {
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
          // Chỉ merge shard đã đọc vào memory — không coi là chỉnh sửa cần ghi đĩa (AUD-003).
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
          cleanupAutoRelationLegacyInfoForNovel(fullData);
          const recoveredFromBackup = Boolean(fullData.__recoveredFromBackup);
          const recoveredFromShadow = Boolean(fullData.__recoveredFromShadow);
          if (recoveredFromBackup) delete fullData.__recoveredFromBackup;
          if (recoveredFromShadow) delete fullData.__recoveredFromShadow;
          const missingTabsConfig = !Array.isArray(fullData.tabsConfig) || fullData.tabsConfig.length === 0;
          if (missingTabsConfig) fullData.tabsConfig = structuredClone(globalTabsConfig);
          const autoSyncResult = runNovelAutoSyncPlan(
            fullData,
            buildAutoSyncPlanFromTabsConfig(fullData.tabsConfig || []),
            { recordLog: false }
          );
          markAllShardsDirty(fullData?.data);
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
          if (missingTabsConfig || recoveredFromBackup || recoveredFromShadow) {
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
