/**
 * Đồng bộ index.json / localStorage + ghi file truyện (.json).
 * Tách khỏi App.jsx — refs do App giữ để handler khác dùng chung.
 */
import { useCallback, useEffect, useRef } from 'react';
import { migrateNovel } from './dataMigration.js';
import { countEntitiesInNovel } from './deepSearchCore.js';
import {
  isQuotaExceededError,
  readLocalJsonWithBackup,
  writeLocalJsonWithBackup,
} from './storageSafe.js';
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

const INDEX_STORAGE_KEY = 'tangthu_index';
const INDEX_STORAGE_BACKUP_KEY = 'tangthu_index_backup';
const NOVEL_STORAGE_PREFIX = 'tangthu_novel_';

function novelStorageKey(id) {
  return `${NOVEL_STORAGE_PREFIX}${id}`;
}

function novelStorageBackupKey(id) {
  return `${NOVEL_STORAGE_PREFIX}${id}_backup`;
}

/** Gợi ý ngắn cho toast khi ghi đĩa / JSON thất bại (File System Access API). */
function describeNovelSyncFailure(err) {
  if (!err) return '';
  const msgLower = String(err.message || '').toLowerCase();
  if (msgLower.includes('modifications are not allowed') || msgLower.includes('createwritable')) {
    return ' Thường do thiếu quyền ghi hoặc nhiều lần lưu cùng lúc (khóa file). Đợi vài giây rồi thử lại; hoặc kết nối lại thư mục (Cho phép chỉnh sửa); tắt đồng bộ mây (OneDrive) đối với thư mục truyện nếu vẫn lỗi.';
  }
  const name = err.name || '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return ' Trình duyệt từ chối ghi — kết nối lại thư mục truyện hoặc kiểm tra quyền thư mục.';
  }
  if (name === 'QuotaExceededError') {
    return ' Hết dung lượng — giải phóng ổ đĩa hoặc chọn thư mục khác.';
  }
  if (name === 'InvalidStateError') {
    return ' Thư mục không còn hợp lệ — chọn lại thư mục gốc trong Thư viện.';
  }
  if (name === 'NotFoundError') {
    return ' Không tìm thấy file/thư mục — kiểm tra ổ/USB còn gắn.';
  }
  if (name === 'InvalidModificationError') {
    return ' File đang bị khóa hoặc không thể thay thế — đóng chương trình đang mở file .json / tạm tắt đồng bộ mây (OneDrive) cho thư mục truyện.';
  }
  const msg = String(err.message || err)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
  return msg ? ` ${msg}` : '';
}

/**
 * Handle thư mục khôi phục từ IndexedDB thường queryPermission = "prompt" — createWritable() sẽ lỗi
 * cho đến khi requestPermission({ mode: 'readwrite' }) được gọi (ưu tiên trong cùng cử chỉ user).
 */
async function ensureDirectoryWritePermission(dirHandle) {
  if (!dirHandle || dirHandle === 'LOCAL_STORAGE') return { ok: true };
  if (typeof dirHandle.queryPermission !== 'function' || typeof dirHandle.requestPermission !== 'function') {
    return { ok: true };
  }
  try {
    let status = await dirHandle.queryPermission({ mode: 'readwrite' });
    if (status === 'denied') return { ok: false, status: 'denied' };
    if (status === 'prompt') {
      status = await dirHandle.requestPermission({ mode: 'readwrite' });
    }
    if (status !== 'granted') return { ok: false, status: status || 'not_granted' };
    return { ok: true };
  } catch (e) {
    return { ok: false, status: 'error', error: e };
  }
}

function persistIndexShadow(payload) {
  try {
    localStorage.setItem('tangthu_index_shadow', JSON.stringify(payload));
  } catch {
    /* best-effort shadow copy */
  }
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
  const recoveredNovelToastIdsRef = useRef(new Set());
  /** Tránh nhiều lần ghi truyện ra đĩa song song (xóa liên tiếp → lỗi khóa file / createWritable). */
  const novelDiskWriteChainRef = useRef(Promise.resolve());

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
        const writeRes = writeLocalJsonWithBackup(INDEX_STORAGE_KEY, INDEX_STORAGE_BACKUP_KEY, payload);
        if (!writeRes.ok && isQuotaExceededError(writeRes.error)) {
          setTimeout(() => {
            showToast('CẢNH BÁO: Bộ nhớ đệm đã đầy!', 'warning');
          }, 500);
        }
        persistIndexShadow(payload);
        return;
      }
      const indexPerm = await ensureDirectoryWritePermission(dir);
      if (!indexPerm.ok) {
        setTimeout(() => {
          showToast(
            'Không ghi được danh mục (index): thiếu quyền ghi thư mục — kết nối lại **Lưu Trữ** và chọn cho phép chỉnh sửa.',
            'warning'
          );
        }, 0);
        persistIndexShadow(payload);
        return;
      }
      try {
        const f = await dir.getFileHandle('index.json', { create: true });
        const w = await f.createWritable();
        await w.write(JSON.stringify(payload, null, 2));
        await w.close();
        // Lớp an toàn bổ sung: giữ bản dự phòng index gần nhất.
        try {
          const fb = await dir.getFileHandle('index.backup.json', { create: true });
          const wb = await fb.createWritable();
          await wb.write(JSON.stringify(payload, null, 2));
          await wb.close();
        } catch {
          /* backup là best-effort */
        }
      } catch {
        setTimeout(() => {
          showToast('Lỗi đồng bộ danh mục!', 'error');
        }, 0);
      } finally {
        persistIndexShadow(payload);
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
    (novelData, rootDir) => {
      if (!rootDir || rootDir === 'LOCAL_STORAGE') {
        const writeRes = writeLocalJsonWithBackup(
          novelStorageKey(novelData.id),
          novelStorageBackupKey(novelData.id),
          novelData
        );
        if (writeRes.ok) bumpNovelStatsAfterWrite(novelData);
        if (!writeRes.ok && isQuotaExceededError(writeRes.error)) {
          setTimeout(() => {
            showToast('CẢNH BÁO: Tràn bộ nhớ! Hãy dùng Thư Mục Máy Tính!', 'warning');
          }, 500);
        }
        return Promise.resolve();
      }

      const runFolderSync = async () => {
      const perm = await ensureDirectoryWritePermission(rootDir);
      if (!perm.ok) {
        console.warn('[TTC] syncNovel: chưa có quyền readwrite trên thư mục gốc', perm);
        setTimeout(() => {
          showToast(
            `Không ghi được «${novelData.title || novelData.id || ''}»: cần quyền chỉnh sửa thư mục. Mở Thư viện → **Lưu Trữ / Kết nối thư mục** và chấp nhận quyền ghi, rồi xóa hoặc lưu lại.`,
            'warning'
          );
        }, 0);
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
          const diskPkg = await readRawNovelPackageFromDir(novelDir, folderName);
          const diskData = diskPkg?.data || {};
          const diskKeys = listShardKeysFromData(diskData);
          if (diskKeys.length > 0) {
            console.warn('[TTC] syncNovel: memory.data rỗng nhưng đĩa còn dữ liệu — gộp từ đĩa để tránh mất dữ liệu.');
            novelToWrite = { ...novelToWrite, data: { ...(diskData || {}) } };
            if (diskPkg?.storageLayout === NOVEL_STORAGE_SHARDED) {
              novelToWrite.storageLayout = NOVEL_STORAGE_SHARDED;
            }
          }
        } catch (e) {
          console.warn('[TTC] syncNovel: không đọc được dữ liệu đĩa khi kiểm tra memory rỗng:', e);
        }
      }
      let jsonStr;
      try {
        const manifest = buildDiskManifest(novelToWrite);
        jsonStr = JSON.stringify(manifest, null, 2);
      } catch (e) {
        console.error('[TTC] syncNovel: không tạo được manifest JSON', e);
        setTimeout(() => {
          showToast(
            `Lỗi chuẩn bị lưu truyện ${novelData.title || novelData.id || ''}.${describeNovelSyncFailure(e)}`,
            'error'
          );
        }, 0);
        return;
      }
      const mainFile = `${folderName}.json`;
      const tmpFile = `${folderName}.json.tmp`;
      const writeNovelBackup = async (novelDir) => {
        try {
          const bf = await novelDir.getFileHandle(`${folderName}.backup.json`, { create: true });
          const bw = await bf.createWritable();
          await bw.write(JSON.stringify(novelToWrite, null, 2));
          await bw.close();
        } catch {
          /* backup is best-effort */
        }
      };
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
        await writeNovelBackup(novelDir);
      };
      const tryDirect = async () => {
        const novelDir = await rootDir.getDirectoryHandle(folderName, { create: true });
        await writeShardTree(novelDir, novelToWrite);
        const f = await novelDir.getFileHandle(mainFile, { create: true });
        const w = await f.createWritable();
        await w.write(jsonStr);
        await w.close();
        await novelDir.getDirectoryHandle('images', { create: true });
        await writeNovelBackup(novelDir);
      };
      try {
        await tryAtomic();
        bumpNovelStatsAfterWrite(novelToWrite);
      } catch (e1) {
        console.warn('[TTC] syncNovel tryAtomic failed:', e1);
        try {
          await tryDirect();
          bumpNovelStatsAfterWrite(novelToWrite);
        } catch (e2) {
          console.error('[TTC] syncNovel tryDirect failed:', e2);
          setTimeout(() => {
            showToast(
              `Lỗi đồng bộ truyện ${novelData.title || novelData.id || ''}!${describeNovelSyncFailure(e2)}`,
              'error'
            );
          }, 0);
        }
      }
      };

      novelDiskWriteChainRef.current = novelDiskWriteChainRef.current
        .catch(() => {})
        .then(() => runFolderSync());
      return novelDiskWriteChainRef.current;
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
      const { value: parsed, source } = readLocalJsonWithBackup(
        novelStorageKey(meta.id),
        novelStorageBackupKey(meta.id),
        null
      );
      if (!parsed) return null;
      const novel = finalizeParsed(parsed, `LS:${meta.id}:${source}`);
      if (!novel) return null;
      if (source === 'backup') {
        const id = String(meta?.id || '');
        if (id && !recoveredNovelToastIdsRef.current.has(id)) {
          recoveredNovelToastIdsRef.current.add(id);
          setTimeout(() => {
            showToast('Đã khôi phục dữ liệu truyện từ bản dự phòng local.', 'warning');
          }, 0);
        }
      }
      return { novel, novelDir: null };
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
  }, [showToast]);

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
