// ==========================================
// useAppDirectoryBackup.js
// Purpose: own folder connect, backup export, and backup import handlers.
// Imported by: App.jsx.
// Notes: keeps file-system side effects and import progress out of the main shell.
// ==========================================

import { useCallback, useState } from 'react';
import { migrateIndex, migrateBackup, migrateNovel } from './dataMigration.js';
import { clearPersistedDirectoryHandle, savePersistedDirectoryHandle } from './lib/directoryHandleStore.js';

function downloadJsonFile(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function useAppDirectoryBackup({
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
}) {
  const [showConnectReminder, setShowConnectReminder] = useState(false);
  const [importProgress, setImportProgress] = useState(null);

  const dismissConnectReminder = useCallback(() => {
    setShowConnectReminder(false);
  }, []);

  const handleConnectFolder = useCallback(async () => {
    if (window.self !== window.top) {
      await clearPersistedDirectoryHandle();
      setDirHandle('LOCAL_STORAGE');
      setShowConnectReminder(true);
      showToast('Preview: da chuyen sang Local Storage.');

      const local = localStorage.getItem('tangthu_index');
      if (local) {
        try {
          const parsed = migrateIndex(JSON.parse(local));
          if (parsed.metadata) setNovelsMetadata(parsed.metadata);
          const safeConfig = resolveSafeTabsConfig(parsed.config);
          setGlobalTabsConfig(safeConfig);
          const stats =
            parsed.novelStats && typeof parsed.novelStats === 'object' ? parsed.novelStats : {};
          if (parsed.novelStats && typeof parsed.novelStats === 'object') {
            novelStatsByIdRef.current = parsed.novelStats;
            setNovelStatsById(parsed.novelStats);
          }
          if (!Array.isArray(parsed.config) || parsed.config.length === 0) {
            void syncIndex(parsed.metadata || [], safeConfig, 'LOCAL_STORAGE', stats);
          }
        } catch {
          void 0;
        }
      }
      return;
    }

    try {
      const pickedDirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      let fileContent = '';

      try {
        const fileHandle = await pickedDirHandle.getFileHandle('index.json');
        const file = await fileHandle.getFile();
        fileContent = await file.text();
      } catch {
        try {
          const oldHandle = await pickedDirHandle.getFileHandle('db.json');
          const oldFile = await oldHandle.getFile();
          const oldContent = await oldFile.text();
          const parsedOld = JSON.parse(oldContent);

          if (parsedOld.novels) {
            showToast('Dang migrate cau truc thu muc...');
            const newMeta = parsedOld.novels.map((novel) => ({
              id: novel.id,
              title: novel.title,
              author: novel.author,
              genres: novel.genres || (novel.genre ? [novel.genre] : []),
              theme: novel.theme || 'theme-tien-hiep',
              status: novel.status,
              rating: novel.rating,
              tags: novel.tags || [],
              chaptersRead: novel.chaptersRead,
              chaptersTotal: novel.chaptersTotal,
              cover: novel.cover,
              review: novel.review,
            }));
            const novelsDir = await pickedDirHandle.getDirectoryHandle('novels', {
              create: true,
            });

            for (const novel of parsedOld.novels) {
              const migrated = migrateNovel(novel);
              const novelFileHandle = await novelsDir.getFileHandle(`${novel.id}.json`, {
                create: true,
              });
              const writer = await novelFileHandle.createWritable();
              await writer.write(JSON.stringify(migrated, null, 2));
              await writer.close();
            }

            const indexHandle = await pickedDirHandle.getFileHandle('index.json', {
              create: true,
            });
            const indexWriter = await indexHandle.createWritable();
            const safeConfig = resolveSafeTabsConfig(parsedOld.config);
            await indexWriter.write(
              JSON.stringify({ metadata: newMeta, config: safeConfig, novelStats: {} }, null, 2)
            );
            await indexWriter.close();

            setNovelsMetadata(newMeta);
            setGlobalTabsConfig(safeConfig);
            setDirHandle(pickedDirHandle);
            await savePersistedDirectoryHandle(pickedDirHandle);
            setShowConnectReminder(true);
            setActiveNovelData(null);
            setActiveNovelDirHandle(null);
            showToast('Migrate thanh cong! Cau truc moi da san sang.');
            return;
          }
        } catch {
          setDirHandle(pickedDirHandle);
          setShowConnectReminder(true);
          setActiveNovelData(null);
          setActiveNovelDirHandle(null);
          showToast('Thu muc trong. Da ket noi menh ban!');
          return;
        }
      }

      if (!fileContent) return;

      try {
        const parsed = JSON.parse(fileContent);
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
          void syncIndex(index.metadata || [], safeConfig, pickedDirHandle, stats);
        }

        setDirHandle(pickedDirHandle);
        await savePersistedDirectoryHandle(pickedDirHandle);
        setShowConnectReminder(true);
        setActiveNovelData(null);
        setActiveNovelDirHandle(null);
        showToast('Da tai menh ban (index) thanh cong!');
      } catch {
        showToast('Loi: file index.json bi hong cau truc.', 'error');
      }
    } catch {
      void 0;
    }
  }, [
    novelStatsByIdRef,
    resolveSafeTabsConfig,
    setActiveNovelData,
    setActiveNovelDirHandle,
    setDirHandle,
    setGlobalTabsConfig,
    setNovelStatsById,
    setNovelsMetadata,
    showToast,
    syncIndex,
  ]);

  const handleExportBackup = useCallback(async () => {
    showToast('Dang chuan bi xuat menh ban backup...');
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

      downloadJsonFile(
        `TangThuCac_Backup_${new Date().toISOString().slice(0, 10)}.json`,
        allData
      );
      showToast('Da xuat backup day du.');
    } catch {
      showToast('Loi khi xuat backup!', 'error');
    }
  }, [dirHandle, globalTabsConfig, loadNovelData, novelStatsById, novelsMetadata, showToast]);

  const handleExportIndexOnly = useCallback(() => {
    try {
      downloadJsonFile(`TangThuCac_Index_${new Date().toISOString().slice(0, 10)}.json`, {
        backupVersion: 2,
        indexOnly: true,
        exportedAt: new Date().toISOString(),
        config: globalTabsConfig,
        metadata: novelsMetadata,
        novelStats: { ...novelStatsById },
      });
      showToast('Da xuat file index.');
    } catch {
      showToast('Loi xuat index!', 'error');
    }
  }, [globalTabsConfig, novelStatsById, novelsMetadata, showToast]);

  const handleImportBackup = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImportProgress({ stage: 'Dang doc file...', current: 0, total: 1 });
    const reader = new FileReader();

    reader.onload = async (loadEvent) => {
      try {
        setImportProgress({ stage: 'Dang chuan hoa du lieu...', current: 0, total: 1 });
        const parsed = JSON.parse(loadEvent.target.result);
        const backup = migrateBackup(parsed);

        if (!(backup.metadata && backup.config)) {
          setImportProgress(null);
          showToast('File khong dung cau truc Tang Thu Cac.', 'error');
          return;
        }

        const safeConfig = resolveSafeTabsConfig(backup.config);
        const stats = backup.novelStats && typeof backup.novelStats === 'object' ? backup.novelStats : {};

        setImportProgress({ stage: 'Dang ghi danh muc...', current: 0, total: 1 });
        const indexResult = await syncIndex(backup.metadata, safeConfig, dirHandle, stats);
        if (!indexResult?.ok) {
          setImportProgress(null);
          showToast('Khôi phục thất bại: không ghi được danh mục vào thư mục lưu.', 'error');
          return;
        }

        const novelEntries =
          backup.novels && typeof backup.novels === 'object' ? Object.entries(backup.novels) : [];
        for (let i = 0; i < novelEntries.length; i += 1) {
          setImportProgress({
            stage: `Dang ghi truyen ${i + 1}/${novelEntries.length}...`,
            current: i + 1,
            total: novelEntries.length,
          });
          const novelResult = await syncNovel(novelEntries[i][1], dirHandle);
          if (!novelResult?.ok) {
            setImportProgress(null);
            showToast(
              `Khôi phục thất bại ở truyện ${i + 1}/${novelEntries.length}. Dữ liệu trên đĩa chưa hoàn chỉnh, chưa áp dụng import vào app.`,
              'error'
            );
            return;
          }
        }

        setGlobalTabsConfig(safeConfig);
        setNovelsMetadata(backup.metadata);
        novelsMetadataRef.current = backup.metadata;
        novelStatsByIdRef.current = stats;
        setNovelStatsById(stats);

        setImportProgress(null);
        showToast('Khoi phuc thanh cong! Tai lai trang...');
        setTimeout(() => window.location.reload(), 1200);
      } catch {
        setImportProgress(null);
        showToast('Loi doc file backup!', 'error');
      }
    };

    reader.onerror = () => {
      setImportProgress(null);
      showToast('Loi doc file!', 'error');
    };

    reader.readAsText(file);
    event.target.value = '';
  }, [
    dirHandle,
    novelStatsByIdRef,
    novelsMetadataRef,
    resolveSafeTabsConfig,
    setGlobalTabsConfig,
    setNovelStatsById,
    setNovelsMetadata,
    showToast,
    syncIndex,
    syncNovel,
  ]);

  return {
    showConnectReminder,
    dismissConnectReminder,
    importProgress,
    handleConnectFolder,
    handleExportBackup,
    handleExportIndexOnly,
    handleImportBackup,
  };
}
