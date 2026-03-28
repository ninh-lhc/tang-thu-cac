/**
 * Đồng bộ index.json / localStorage + ghi file truyện (.json).
 * Tách khỏi App.jsx — refs do App giữ để handler khác dùng chung.
 */
import { useCallback, useEffect, useRef } from 'react';
import { migrateNovel } from './dataMigration.js';
import { countEntitiesInNovel } from './deepSearchCore.js';
import {
  NOVEL_STORAGE_SHARDED,
  buildDiskManifest,
  listShardKeysFromData,
  loadShardsFromNovelDir,
  novelManifestBaseNameCandidates,
  readRawNovelPackageFromDir,
  writeShardTree,
} from './lib/novelDiskLayout.js';

/** migrateNovel luôn xóa storageLayout; khi novel đang lưu dạng shard trên đĩa thì phải gắn lại để lazy-load + sync an toàn. */
function restoreShardedLayoutIfNeeded(parsedBeforeMigrate, migrated) {
  if (parsedBeforeMigrate?.storageLayout === NOVEL_STORAGE_SHARDED) {
    migrated.storageLayout = NOVEL_STORAGE_SHARDED;
  }
  return migrated;
}

export function useAppPersistence({
  novelStatsByIdRef,
  novelsMetadataRef,
  globalTabsConfigRef,
  dirHandleRef,
  setNovelStatsById,
  showToast,
}) {
  const persistIndexStatsTimerRef = useRef(null);
  const syncNovelRef = useRef(null);

  useEffect(
    () => () => {
      if (persistIndexStatsTimerRef.current) clearTimeout(persistIndexStatsTimerRef.current);
    },
    []
  );

  const syncIndex = useCallback(
    async (newMetadata, newConfig, dir, novelStatsOverride) => {
      const novelStats =
        novelStatsOverride !== undefined && novelStatsOverride !== null
          ? novelStatsOverride
          : { ...novelStatsByIdRef.current };
      const payload = { metadata: newMetadata, config: newConfig, novelStats };
      if (!dir || dir === 'LOCAL_STORAGE') {
        try {
          localStorage.setItem('tangthu_index', JSON.stringify(payload));
        } catch (e) {
          if (e.name === 'QuotaExceededError' || e.message.includes('quota'))
            setTimeout(() => {
              showToast('CẢNH BÁO: Bộ nhớ đệm đã đầy!', 'warning');
            }, 500);
        }
        return;
      }
      try {
        const f = await dir.getFileHandle('index.json', { create: true });
        const w = await f.createWritable();
        await w.write(JSON.stringify(payload, null, 2));
        await w.close();
      } catch {
        setTimeout(() => {
          showToast('Lỗi đồng bộ danh mục!', 'error');
        }, 0);
      }
    },
    [novelStatsByIdRef, showToast]
  );

  const queuePersistNovelStatsToIndex = useCallback(() => {
    if (persistIndexStatsTimerRef.current) clearTimeout(persistIndexStatsTimerRef.current);
    persistIndexStatsTimerRef.current = setTimeout(() => {
      persistIndexStatsTimerRef.current = null;
      const d = dirHandleRef.current;
      if (!d) return;
      syncIndex(novelsMetadataRef.current, globalTabsConfigRef.current, d, { ...novelStatsByIdRef.current });
    }, 500);
  }, [dirHandleRef, globalTabsConfigRef, novelsMetadataRef, novelStatsByIdRef, syncIndex]);

  const bumpNovelStatsAfterWrite = useCallback(
    (novelData) => {
      const s = countEntitiesInNovel(novelData);
      const next = { ...novelStatsByIdRef.current, [novelData.id]: s };
      novelStatsByIdRef.current = next;
      setNovelStatsById(next);
      queuePersistNovelStatsToIndex();
    },
    [novelStatsByIdRef, queuePersistNovelStatsToIndex, setNovelStatsById]
  );

  const syncNovel = useCallback(
    async (novelData, rootDir) => {
      if (!rootDir || rootDir === 'LOCAL_STORAGE') {
        try {
          localStorage.setItem(`tangthu_novel_${novelData.id}`, JSON.stringify(novelData));
          bumpNovelStatsAfterWrite(novelData);
        } catch (e) {
          if (e.name === 'QuotaExceededError' || e.message.includes('quota'))
            setTimeout(() => {
              showToast('CẢNH BÁO: Tràn bộ nhớ! Hãy dùng Thư Mục Máy Tính!', 'warning');
            }, 500);
        }
        return;
      }
      const folderName = novelData.folderName || novelData.title.replace(/[\\/:*?"<>|]/g, '').trim() || novelData.id;
      let novelToWrite = novelData;
      // Đang giữ data partial (lazy-shard): BẮT BUỘC merge từ đĩa trước khi ghi — nếu không writeShardTree sẽ xóa mọi shard không nằm trong memory.
      // (migrateNovel từng xóa storageLayout nên không được phụ thuộc vào storageLayout tại đây.)
      if (novelData?.__partialData) {
        try {
          const novelDir = await rootDir.getDirectoryHandle(folderName, { create: true });
          const diskData = await loadShardsFromNovelDir(novelDir);
          const merged = {
            ...novelData,
            data: { ...(diskData || {}) },
          };
          Object.entries(novelData.data || {}).forEach(([lonId, lonData]) => {
            if (!merged.data[lonId]) merged.data[lonId] = {};
            Object.entries(lonData || {}).forEach(([nhoId, nhoData]) => {
              merged.data[lonId][nhoId] = nhoData;
            });
          });
          delete merged.__partialData;
          novelToWrite = merged;
        } catch (e) {
          console.warn('[TTC] Không merge shard trước khi lưu (tránh ghi đè/xóa shard):', e);
          setTimeout(() => {
            showToast('Lỗi đọc dữ liệu trên đĩa — đã hủy lưu để tránh mất nội dung tab khác.', 'error');
          }, 0);
          return;
        }
      }
      // Chống wipe toàn bộ shard: object trong memory không có tab nào nhưng thư mục data/ vẫn có file
      // (lỗi load / F5 trước khi hydrate — tránh writeShardTree xóa hết file).
      const memKeys = listShardKeysFromData(novelToWrite.data || {});
      if (memKeys.length === 0) {
        try {
          const novelDir = await rootDir.getDirectoryHandle(folderName, { create: true });
          const diskData = await loadShardsFromNovelDir(novelDir);
          const diskKeys = listShardKeysFromData(diskData || {});
          if (diskKeys.length > 0) {
            console.warn('[TTC] syncNovel: memory.data rỗng nhưng đĩa còn shard — gộp từ đĩa để tránh mất dữ liệu.');
            novelToWrite = { ...novelToWrite, data: { ...(diskData || {}) } };
          }
        } catch (e) {
          console.warn('[TTC] syncNovel: không đọc được shard khi kiểm tra memory rỗng:', e);
        }
      }
      const manifest = buildDiskManifest(novelToWrite);
      const jsonStr = JSON.stringify(manifest, null, 2);
      const mainFile = `${folderName}.json`;
      const tmpFile = `${folderName}.json.tmp`;
      const tryAtomic = async () => {
        const novelDir = await rootDir.getDirectoryHandle(folderName, { create: true });
        await writeShardTree(novelDir, novelToWrite);
        const tw = await novelDir.getFileHandle(tmpFile, { create: true });
        const w = await tw.createWritable();
        await w.write(jsonStr);
        await w.close();
        try {
          await novelDir.removeEntry(mainFile);
        } catch {
          /* first save */
        }
        const tmpAgain = await novelDir.getFileHandle(tmpFile);
        if (typeof tmpAgain.move === 'function') {
          await tmpAgain.move(mainFile);
        } else {
          const out = await novelDir.getFileHandle(mainFile, { create: true });
          const wo = await out.createWritable();
          await wo.write(jsonStr);
          await wo.close();
          try {
            await novelDir.removeEntry(tmpFile);
          } catch { /* ignore */ }
        }
        await novelDir.getDirectoryHandle('images', { create: true });
      };
      const tryDirect = async () => {
        const novelDir = await rootDir.getDirectoryHandle(folderName, { create: true });
        await writeShardTree(novelDir, novelToWrite);
        const f = await novelDir.getFileHandle(mainFile, { create: true });
        const w = await f.createWritable();
        await w.write(jsonStr);
        await w.close();
        await novelDir.getDirectoryHandle('images', { create: true });
      };
      try {
        await tryAtomic();
        bumpNovelStatsAfterWrite(novelToWrite);
      } catch {
        try {
          await tryDirect();
          bumpNovelStatsAfterWrite(novelToWrite);
        } catch {
          setTimeout(() => {
            showToast(`Lỗi đồng bộ truyện ${novelData.title}!`, 'error');
          }, 0);
        }
      }
    },
    [bumpNovelStatsAfterWrite, showToast]
  );

  useEffect(() => {
    syncNovelRef.current = syncNovel;
  }, [syncNovel]);

  const loadNovelData = useCallback(async (meta, rootDir, options = {}) => {
    const raw = Array.isArray(options.shardKeys) ? options.shardKeys : null;
    const shardKeysOpt = raw && raw.length > 0 ? { shardKeys: raw } : {};
    const wantId = String(meta?.id ?? '').trim();

    const finalizeParsed = (parsed, label) => {
      try {
        const migrated = migrateNovel(parsed);
        return restoreShardedLayoutIfNeeded(parsed, migrated);
      } catch (pe) {
        console.warn(`[TTC] JSON truyện bị hỏng sau migrate: ${label}`, pe);
        return null;
      }
    };

    if (!rootDir || rootDir === 'LOCAL_STORAGE') {
      const data = localStorage.getItem(`tangthu_novel_${meta.id}`);
      if (!data) return null;
      try {
        const parsed = JSON.parse(data);
        const novel = finalizeParsed(parsed, `LS:${meta.id}`);
        return novel ? { novel, novelDir: null } : null;
      } catch (e) {
        console.warn(`[TTC] Dữ liệu bị hỏng cho truyện ${meta.id}, bỏ qua.`, e);
        return null;
      }
    }

    const tryDirWithBase = async (novelDir, manifestBaseName) => {
      const parsed = await readRawNovelPackageFromDir(novelDir, manifestBaseName, shardKeysOpt);
      if (!parsed) return null;
      const pid = String(parsed.id ?? '').trim();
      if (wantId && pid && pid !== wantId) return null;
      const novel = finalizeParsed(parsed, `${manifestBaseName}.json`);
      return novel ? { novel, novelDir } : null;
    };

    for (const name of novelManifestBaseNameCandidates(meta)) {
      try {
        const novelDir = await rootDir.getDirectoryHandle(name);
        const hit = await tryDirWithBase(novelDir, name);
        if (hit) return hit;
        for (const alt of novelManifestBaseNameCandidates(meta)) {
          if (alt === name) continue;
          const hitAlt = await tryDirWithBase(novelDir, alt);
          if (hitAlt) return hitAlt;
        }
      } catch {
        /* thử candidate kế */
      }
    }

    if (wantId) {
      try {
        for await (const [entryName, h] of rootDir.entries()) {
          if (h.kind !== 'directory') continue;
          const hit = await tryDirWithBase(h, entryName);
          if (hit) return hit;
        }
      } catch (e) {
        console.warn('[TTC] Quét thư mục gốc tìm truyện theo id:', e);
      }
    }

    try {
      const novelsDir = await rootDir.getDirectoryHandle('novels');
      const f = await novelsDir.getFileHandle(`${meta.id}.json`);
      const text = await (await f.getFile()).text();
      const parsed = JSON.parse(text);
      const pid = String(parsed.id ?? '').trim();
      if (wantId && pid && pid !== wantId) return null;
      const novel = finalizeParsed(parsed, `novels/${meta.id}.json`);
      return novel ? { novel, novelDir: null } : null;
    } catch (e) {
      if (e && e.name === 'NotFoundError') return null;
      console.warn(`[TTC] Lỗi đọc novels/${meta.id}.json`, e);
      return null;
    }
  }, []);

  return {
    syncIndex,
    syncNovel,
    loadNovelData,
    queuePersistNovelStatsToIndex,
    bumpNovelStatsAfterWrite,
    syncNovelRef,
    persistIndexStatsTimerRef,
  };
}
