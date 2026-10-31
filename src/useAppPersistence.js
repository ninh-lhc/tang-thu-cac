/**
 * Đồng bộ index.json / localStorage + ghi file truyện (.json).
 * Shadow IndexedDB giữ bản nháp khi ghi thư mục (OneDrive) lỗi — khôi phục sau F5.
 * Debounce ~1s + retry khóa file; ghi in-place; backup.json throttle 60s.
 * Toast «Cho phép ghi lại» gọi requestPermission rồi flush immediate.
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
  buildShardWritePlan,
  getShardState,
  listShardKeysFromData,
  loadShardsFromNovelDir,
  novelManifestBaseNameCandidates,
  readRawNovelPackageFromDir,
  writeShardTree,
} from './lib/novelDiskLayout.js';
import {
  clearNovelShadow,
  loadNovelShadow,
  resolveNovelWithShadow,
  saveNovelShadow,
} from './lib/novelShadowStore.js';
import {
  NOVEL_BACKUP_MIN_INTERVAL_MS,
  NOVEL_DISK_DEBOUNCE_MS,
  isHardFsPermissionError,
  isTransientFsWriteError,
  withFsWriteRetry,
} from './lib/novelDiskWritePolicy.js';
import { clearDirtyShardKeys, snapshotDirtyShards } from './lib/dirtyShardTracker.js';

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

function isFsPermissionWriteError(err) {
  if (!err) return false;
  if (isHardFsPermissionError(err)) return true;
  const name = String(err?.name || '');
  if (name === 'NotAllowedError' || name === 'SecurityError') return true;
  const msgLower = String(err?.message || '').toLowerCase();
  return msgLower.includes('modifications are not allowed') || msgLower.includes('createwritable');
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

async function pruneLegacyIndexVariantFiles(dirHandle) {
  if (!dirHandle || dirHandle === 'LOCAL_STORAGE') return;
  try {
    for await (const [entryName, handle] of dirHandle.entries()) {
      if (handle.kind !== 'file') continue;
      const lower = String(entryName || '').toLowerCase();
      if (lower === 'index.json' || lower === 'index.backup.json') continue;
      // Dọn bản index legacy theo máy: index-*.json, index.backup-*.json...
      if (!/^index(?:[.-].+)?\.json$/i.test(lower)) continue;
      try {
        await dirHandle.removeEntry(entryName);
      } catch {
        /* best-effort cleanup */
      }
    }
  } catch {
    /* ignore cleanup errors */
  }
}

export function useAppPersistence({
  novelStatsByIdRef,
  genreTabsTemplatesRef,
  novelsMetadataRef,
  globalTabsConfigRef,
  dirHandleRef,
  activeNovelDataRef,
  setNovelStatsById,
  showToast,
  novelSessionLockRef = null,
}) {
  const persistIndexStatsTimerRef = useRef(null);
  const syncNovelRef = useRef(null);
  const recoveredNovelToastIdsRef = useRef(new Set());
  /** Tránh nhiều lần ghi truyện ra đĩa song song (xóa liên tiếp → lỗi khóa file / createWritable). */
  const novelDiskWriteChainRef = useRef(Promise.resolve());
  /** Debounce/coalesce theo id truyện trước khi ghi đĩa. */
  const pendingNovelDiskByIdRef = useRef(new Map());
  /** Số folder sync đang chạy (debounced flush hoặc chain). */
  const novelFolderSyncInFlightRef = useRef(0);
  /** Cache JSON cuối cùng để bỏ qua ghi index khi nội dung không đổi. */
  const lastIndexJsonByDirRef = useRef(new WeakMap());
  /** Cache JSON manifest cuối cùng theo id truyện để bỏ qua ghi đĩa khi không đổi. */
  const lastNovelManifestJsonByIdRef = useRef(new Map());
  /** Throttle .backup.json theo id truyện (giảm churn OneDrive). */
  const lastNovelBackupAtByIdRef = useRef(new Map());
  /** Tránh spam toast cấp quyền / đang chờ sync. */
  const permissionToastCooldownRef = useRef(0);
  const lockWaitToastCooldownRef = useRef(0);
  const otherTabToastAtRef = useRef(0);

  const otherTabBlocksWrite = useCallback((novelId) => {
    const lock = novelSessionLockRef?.current;
    if (!lock?.isLockSupported) return false;
    const id = String(novelId || '');
    if (!id) return false;
    return String(lock.novelId || '') === id && lock.hasLock === false;
  }, [novelSessionLockRef]);

  const mayClearNovelShadow = useCallback((novelId) => {
    const lock = novelSessionLockRef?.current;
    if (!lock?.isLockSupported) return true;
    const id = String(novelId || '');
    return lock.hasLock === true && String(lock.novelId || '') === id;
  }, [novelSessionLockRef]);

  const regrantDirectoryWriteAndFlush = useCallback(async () => {
    const dir = dirHandleRef.current;
    if (!dir || dir === 'LOCAL_STORAGE') {
      showToast('Chưa kết nối thư mục lưu trữ.', 'warning');
      return;
    }
    const perm = await ensureDirectoryWritePermission(dir);
    if (!perm.ok) {
      showToast(
        'Vẫn chưa có quyền ghi. Bấm lại «Cho phép ghi lại» hoặc mở Thư viện → Lưu Trữ và kết nối lại thư mục.',
        'warning',
        {
          undoLabel: 'Cho phép ghi lại',
          durationMs: 25000,
          onUndo: () => {
            void regrantDirectoryWriteAndFlush();
          },
        }
      );
      return;
    }
    const novel =
      activeNovelDataRef?.current && typeof activeNovelDataRef.current === 'object'
        ? activeNovelDataRef.current
        : null;
    if (!novel?.id) {
      showToast('Đã có quyền ghi. Mở lại truyện hoặc lưu một lần để đồng bộ lên thư mục.', 'success');
      return;
    }
    const syncFn = syncNovelRef.current;
    if (typeof syncFn !== 'function') return;
    const result = await syncFn(novel, dir, { immediate: true });
    if (result?.ok) {
      showToast(`Đã ghi lại «${novel.title || novel.id}» lên thư mục.`, 'success');
      return;
    }
    showToast(
      `Vẫn chưa ghi được «${novel.title || novel.id}». Bản nháp vẫn giữ trong trình duyệt — thử lại sau vài giây (OneDrive có thể đang khóa file).`,
      'warning',
      {
        undoLabel: 'Cho phép ghi lại',
        durationMs: 25000,
        onUndo: () => {
          void regrantDirectoryWriteAndFlush();
        },
      }
    );
  }, [activeNovelDataRef, dirHandleRef, showToast]);

  const showDirectoryWritePermissionToast = useCallback(
    (novelData, detailMsg) => {
      const now = Date.now();
      if (now - permissionToastCooldownRef.current < 4000) return;
      permissionToastCooldownRef.current = now;
      const title = novelData?.title || novelData?.id || '';
      showToast(
        detailMsg ||
          `Trình duyệt từ chối ghi «${title}». Bản nháp đã giữ trong trình duyệt — bấm nút để cấp quyền và lưu lại (không cần F5).`,
        'warning',
        {
          undoLabel: 'Cho phép ghi lại',
          durationMs: 25000,
          onUndo: () => {
            void regrantDirectoryWriteAndFlush();
          },
        }
      );
    },
    [regrantDirectoryWriteAndFlush, showToast]
  );

  useEffect(
    () => () => {
      if (persistIndexStatsTimerRef.current) clearTimeout(persistIndexStatsTimerRef.current);
      for (const entry of pendingNovelDiskByIdRef.current.values()) {
        if (entry?.timer) clearTimeout(entry.timer);
      }
      pendingNovelDiskByIdRef.current.clear();
    },
    []
  );

  const syncIndex = useCallback(
    async (newMetadata, newConfig, dir, novelStatsOverride) => {
      const novelStats =
        novelStatsOverride !== undefined && novelStatsOverride !== null
          ? novelStatsOverride
          : { ...novelStatsByIdRef.current };
      const genreTabsTemplates =
        genreTabsTemplatesRef?.current && typeof genreTabsTemplatesRef.current === 'object'
          ? { ...genreTabsTemplatesRef.current }
          : {};
      const payload = { metadata: newMetadata, config: newConfig, novelStats, genreTabsTemplates };
      if (!dir || dir === 'LOCAL_STORAGE') {
        const writeRes = writeLocalJsonWithBackup(INDEX_STORAGE_KEY, INDEX_STORAGE_BACKUP_KEY, payload);
        if (!writeRes.ok && isQuotaExceededError(writeRes.error)) {
          setTimeout(() => {
            showToast('CẢNH BÁO: Bộ nhớ đệm đã đầy!', 'warning');
          }, 500);
        }
        persistIndexShadow(payload);
        return { ok: Boolean(writeRes.ok), mode: 'local', error: writeRes.error || null };
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
        return { ok: false, mode: 'directory', reason: 'permission_denied' };
      }
      try {
        const payloadJson = JSON.stringify(payload, null, 2);
        const lastPayloadJson = lastIndexJsonByDirRef.current.get(dir) || '';
        if (lastPayloadJson === payloadJson) {
          return { ok: true, mode: 'directory', skipped: 'unchanged' };
        }
        const f = await dir.getFileHandle('index.json', { create: true });
        const w = await f.createWritable();
        await w.write(payloadJson);
        await w.close();
        // Lớp an toàn bổ sung: giữ bản dự phòng index gần nhất.
        try {
          const fb = await dir.getFileHandle('index.backup.json', { create: true });
          const wb = await fb.createWritable();
          await wb.write(payloadJson);
          await wb.close();
        } catch {
          /* backup là best-effort */
        }
        await pruneLegacyIndexVariantFiles(dir);
        lastIndexJsonByDirRef.current.set(dir, payloadJson);
        return { ok: true, mode: 'directory' };
      } catch {
        setTimeout(() => {
          showToast('Lỗi đồng bộ danh mục!', 'error');
        }, 0);
        return { ok: false, mode: 'directory', reason: 'write_failed' };
      } finally {
        persistIndexShadow(payload);
      }
    },
    [novelStatsByIdRef, genreTabsTemplatesRef, showToast]
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

  const cleanupLegacyIndexFiles = useCallback(async (dir) => {
    if (!dir || dir === 'LOCAL_STORAGE') return;
    await pruneLegacyIndexVariantFiles(dir);
  }, []);

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
    (novelData, rootDir, options = {}) => {
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
        return Promise.resolve({ ok: Boolean(writeRes.ok), mode: 'local', error: writeRes.error || null });
      }

      const immediate = Boolean(options?.immediate || options?.flush);
      const forceBackup = Boolean(options?.forceBackup);

      // Checkpoint ngay — debounce chỉ trì hoãn ghi đĩa, không trì hoãn shadow.
      // Tab không giữ session lock thì không ghi đè WAL của tab đang sửa.
      if (!otherTabBlocksWrite(novelData?.id)) {
        void saveNovelShadow(novelData);
      }

      const runFolderSync = async (payloadNovel, writeOpts = {}) => {
        novelFolderSyncInFlightRef.current += 1;
        try {
        const forceBackupWrite = Boolean(writeOpts.forceBackup);
        if (otherTabBlocksWrite(payloadNovel?.id)) {
          const now = Date.now();
          if (now - otherTabToastAtRef.current > 8000) {
            otherTabToastAtRef.current = now;
            setTimeout(() => {
              showToast('Truyện đang được mở và chỉnh sửa ở tab khác.', 'warning');
            }, 0);
          }
          return {
            ok: false,
            mode: 'directory',
            reason: 'locked_by_other_tab',
            message: 'Truyện đang được mở và chỉnh sửa ở tab khác.',
          };
        }

        await saveNovelShadow(payloadNovel);

        const perm = await ensureDirectoryWritePermission(rootDir);
        if (!perm.ok) {
          console.warn('[TTC] syncNovel: chưa có quyền readwrite trên thư mục gốc', perm);
          setTimeout(() => {
            showDirectoryWritePermissionToast(
              payloadNovel,
              `Không ghi được «${payloadNovel.title || payloadNovel.id || ''}»: cần quyền chỉnh sửa thư mục. Bản nháp đã giữ trong trình duyệt — bấm «Cho phép ghi lại» (không cần F5).`
            );
          }, 0);
          return { ok: false, mode: 'directory', reason: 'permission_denied' };
        }

        const folderName =
          payloadNovel.folderName ||
          payloadNovel.title.replace(/[\\/:*?"<>|]/g, '').trim() ||
          payloadNovel.id;
        let novelToWrite = payloadNovel;
        if (payloadNovel?.__partialData) {
          try {
            const novelDir = await rootDir.getDirectoryHandle(folderName, { create: true });
            const diskData = await loadShardsFromNovelDir(novelDir);
            const merged = {
              ...payloadNovel,
              data: { ...(diskData || {}) },
            };
            Object.entries(payloadNovel.data || {}).forEach(([lonId, lonData]) => {
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
              showToast(
                'Lỗi đọc dữ liệu trên đĩa — đã hủy lưu để tránh mất nội dung tab khác. Bản nháp vẫn giữ trong trình duyệt.',
                'error'
              );
            }, 0);
            return { ok: false, mode: 'directory', reason: 'partial_merge_failed', error: e };
          }
        }
        const memKeys = listShardKeysFromData(novelToWrite.data || {});
        if (memKeys.length === 0) {
          try {
            const novelDir = await rootDir.getDirectoryHandle(folderName, { create: true });
            const diskPkg = await readRawNovelPackageFromDir(novelDir, folderName);
            const diskData = diskPkg?.data || {};
            const diskKeys = listShardKeysFromData(diskData);
            if (diskKeys.length > 0) {
              console.warn(
                '[TTC] syncNovel: memory.data rỗng nhưng đĩa còn dữ liệu — gộp từ đĩa để tránh mất dữ liệu.'
              );
              novelToWrite = { ...novelToWrite, data: { ...(diskData || {}) } };
              if (diskPkg?.storageLayout === NOVEL_STORAGE_SHARDED) {
                novelToWrite.storageLayout = NOVEL_STORAGE_SHARDED;
              }
            }
          } catch (e) {
            console.warn('[TTC] syncNovel: không đọc được dữ liệu đĩa khi kiểm tra memory rỗng:', e);
          }
        }

        await saveNovelShadow(novelToWrite);

        let jsonStr;
        try {
          const manifest = buildDiskManifest(novelToWrite);
          jsonStr = JSON.stringify(manifest, null, 2);
        } catch (e) {
          console.error('[TTC] syncNovel: không tạo được manifest JSON', e);
          setTimeout(() => {
            showToast(
              `Lỗi chuẩn bị lưu truyện ${payloadNovel.title || payloadNovel.id || ''}.${describeNovelSyncFailure(e)}`,
              'error'
            );
          }, 0);
          return { ok: false, mode: 'directory', reason: 'manifest_build_failed', error: e };
        }
        const novelDir = await rootDir.getDirectoryHandle(folderName, { create: true });
        /** Snapshot dirty cho batch ghi — active set giữ key mới phát sinh trong lúc write (F-001). */
        const dirtyKeys = snapshotDirtyShards();
        const shardPlan = buildShardWritePlan(
          novelToWrite.data || {},
          getShardState(novelDir).hashes,
          dirtyKeys,
        );
        const mainFile = `${folderName}.json`;
        let cachedBackupJson = null;
        const getBackupJson = () => {
          if (cachedBackupJson != null) return cachedBackupJson;
          cachedBackupJson = JSON.stringify(novelToWrite, null, 2);
          return cachedBackupJson;
        };
        const maybeWriteNovelBackup = async (dir) => {
          const novelId = String(novelToWrite.id || '');
          const lastAt = lastNovelBackupAtByIdRef.current.get(novelId) || 0;
          if (!forceBackupWrite && Date.now() - lastAt < NOVEL_BACKUP_MIN_INTERVAL_MS) {
            return;
          }
          try {
            const bf = await dir.getFileHandle(`${folderName}.backup.json`, { create: true });
            const bw = await bf.createWritable();
            await bw.write(getBackupJson());
            await bw.close();
            if (novelId) lastNovelBackupAtByIdRef.current.set(novelId, Date.now());
          } catch {
            /* backup is best-effort */
          }
        };
        const markDiskSynced = async () => {
          lastNovelManifestJsonByIdRef.current.set(novelToWrite.id, jsonStr);
          bumpNovelStatsAfterWrite(novelToWrite);
          if (mayClearNovelShadow(novelToWrite.id)) {
            await clearNovelShadow(novelToWrite.id);
          }
          clearDirtyShardKeys(dirtyKeys);
        };
        // Ưu tiên ghi đè in-place — ít tạo/xóa file hơn tmp+rename (OneDrive).
        const writeInPlace = async () => {
          await writeShardTree(novelDir, novelToWrite, dirtyKeys);
          const f = await novelDir.getFileHandle(mainFile, { create: true });
          const w = await f.createWritable();
          await w.write(jsonStr);
          await w.close();
          await novelDir.getDirectoryHandle('images', { create: true });
          await maybeWriteNovelBackup(novelDir);
        };

        const lastManifestJson = lastNovelManifestJsonByIdRef.current.get(novelToWrite.id);
        if (
          lastManifestJson === jsonStr &&
          shardPlan.writes.length === 0 &&
          shardPlan.removed.length === 0
        ) {
          clearDirtyShardKeys(dirtyKeys);
          if (mayClearNovelShadow(novelToWrite.id)) {
            await clearNovelShadow(novelToWrite.id);
          }
          return { ok: true, mode: 'directory', skipped: 'unchanged' };
        }

        try {
          await withFsWriteRetry(
            async () => {
              await writeInPlace();
            },
            {
              isPermissionHardError: isHardFsPermissionError,
              onRetry: ({ attempt }) => {
                if (attempt < 2) return;
                const now = Date.now();
                if (now - lockWaitToastCooldownRef.current < 8000) return;
                lockWaitToastCooldownRef.current = now;
                setTimeout(() => {
                  showToast(
                    `Đang chờ OneDrive nhả khóa file để lưu «${payloadNovel.title || payloadNovel.id || ''}»…`,
                    'warning',
                    { durationMs: 5000 }
                  );
                }, 0);
              },
            }
          );
          await markDiskSynced();
          return { ok: true, mode: 'directory' };
        } catch (e2) {
          console.error('[TTC] syncNovel write failed after retries:', e2);
          if (isHardFsPermissionError(e2) || (isFsPermissionWriteError(e2) && !isTransientFsWriteError(e2))) {
            setTimeout(() => {
              showDirectoryWritePermissionToast(payloadNovel);
            }, 0);
            return {
              ok: false,
              mode: 'directory',
              reason: 'permission_denied_write',
              error: e2,
            };
          }
          if (isFsPermissionWriteError(e2)) {
            const retryPerm = await ensureDirectoryWritePermission(rootDir);
            if (!retryPerm.ok) {
              setTimeout(() => {
                showDirectoryWritePermissionToast(payloadNovel);
              }, 0);
              return {
                ok: false,
                mode: 'directory',
                reason: 'permission_denied_after_retry',
                error: e2,
              };
            }
            try {
              await writeInPlace();
              await markDiskSynced();
              return { ok: true, mode: 'directory', recoveredFrom: 'permission_recheck' };
            } catch (e3) {
              setTimeout(() => {
                showDirectoryWritePermissionToast(payloadNovel);
              }, 0);
              return {
                ok: false,
                mode: 'directory',
                reason: 'permission_denied_write',
                error: e3,
              };
            }
          }
          setTimeout(() => {
            showToast(
              `Lỗi đồng bộ truyện ${payloadNovel.title || payloadNovel.id || ''}!${describeNovelSyncFailure(e2)} Bản nháp vẫn giữ trong trình duyệt.`,
              'error',
              {
                undoLabel: 'Cho phép ghi lại',
                durationMs: 25000,
                onUndo: () => {
                  void regrantDirectoryWriteAndFlush();
                },
              }
            );
          }, 0);
          return {
            ok: false,
            mode: 'directory',
            reason: 'write_failed',
            error: e2,
          };
        }
        } finally {
          novelFolderSyncInFlightRef.current = Math.max(0, novelFolderSyncInFlightRef.current - 1);
        }
      };

      const enqueueFolderSync = (payloadNovel, writeOpts = {}) => {
        novelDiskWriteChainRef.current = novelDiskWriteChainRef.current
          .catch(() => {})
          .then(() => runFolderSync(payloadNovel, writeOpts));
        return novelDiskWriteChainRef.current;
      };

      const novelId = String(novelData?.id || '').trim();
      if (!novelId) {
        return enqueueFolderSync(novelData, { forceBackup: forceBackup || immediate });
      }

      if (immediate) {
        const pending = pendingNovelDiskByIdRef.current.get(novelId);
        if (pending?.timer) {
          clearTimeout(pending.timer);
          pending.timer = null;
        }
        const resolvers = pending?.resolvers || [];
        pendingNovelDiskByIdRef.current.delete(novelId);
        const writePromise = enqueueFolderSync(novelData, { forceBackup: true });
        for (const resolve of resolvers) {
          void writePromise.then(resolve, (err) =>
            resolve({ ok: false, mode: 'directory', reason: 'write_failed', error: err })
          );
        }
        return writePromise;
      }

      return new Promise((resolve) => {
        const prev = pendingNovelDiskByIdRef.current.get(novelId);
        if (prev?.timer) clearTimeout(prev.timer);
        const resolvers = prev?.resolvers || [];
        resolvers.push(resolve);
        const entry = {
          novelData,
          rootDir,
          resolvers,
          timer: null,
          forceBackup: Boolean(prev?.forceBackup) || forceBackup,
        };
        entry.timer = setTimeout(() => {
          const latest = pendingNovelDiskByIdRef.current.get(novelId);
          pendingNovelDiskByIdRef.current.delete(novelId);
          if (!latest) return;
          const writePromise = enqueueFolderSync(latest.novelData, {
            forceBackup: Boolean(latest.forceBackup),
          });
          for (const r of latest.resolvers) {
            void writePromise.then(r, (err) =>
              r({ ok: false, mode: 'directory', reason: 'write_failed', error: err })
            );
          }
        }, NOVEL_DISK_DEBOUNCE_MS);
        pendingNovelDiskByIdRef.current.set(novelId, entry);
      });
    },
    [bumpNovelStatsAfterWrite, mayClearNovelShadow, otherTabBlocksWrite, regrantDirectoryWriteAndFlush, showDirectoryWritePermissionToast, showToast]
  );

  useEffect(() => {
    syncNovelRef.current = syncNovel;
  }, [syncNovel]);

  const hasPendingNovelDiskWrite = useCallback(() => {
    return (
      pendingNovelDiskByIdRef.current.size > 0 || novelFolderSyncInFlightRef.current > 0
    );
  }, []);

  const awaitNovelDiskIdle = useCallback(async () => {
    const pendingEntries = [...pendingNovelDiskByIdRef.current.entries()];
    for (const [, entry] of pendingEntries) {
      if (entry?.timer) clearTimeout(entry.timer);
    }
    pendingNovelDiskByIdRef.current.clear();
    for (const [, entry] of pendingEntries) {
      if (!entry?.novelData || !syncNovelRef.current) continue;
      const writePromise = syncNovelRef.current(entry.novelData, entry.rootDir, {
        immediate: true,
        forceBackup: Boolean(entry.forceBackup),
      });
      for (const r of entry.resolvers || []) {
        void writePromise.then(r, (err) =>
          r({ ok: false, mode: 'directory', reason: 'write_failed', error: err })
        );
      }
    }
    await novelDiskWriteChainRef.current.catch(() => {});
  }, []);

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

    const applyPendingShadow = async (loaded) => {
      if (!wantId) return loaded;
      // Chỉ dùng shadow khi đang lưu thư mục — localStorage đã là nguồn chính.
      if (!rootDir || rootDir === 'LOCAL_STORAGE') return loaded;
      try {
        const shadow = await loadNovelShadow(wantId);
        const resolved = resolveNovelWithShadow(loaded?.novel || null, shadow);
        if (!resolved) return loaded;
        if (!resolved.fromShadow) return loaded;
        const novel = finalizeParsed(resolved.novel, `shadow:${wantId}`) || resolved.novel;
        novel.__recoveredFromShadow = true;
        const toastKey = `shadow:${wantId}`;
        if (!recoveredNovelToastIdsRef.current.has(toastKey)) {
          recoveredNovelToastIdsRef.current.add(toastKey);
          setTimeout(() => {
            showToast(
              'Đã khôi phục bản chưa kịp ghi lên thư mục (sau F5 / lỗi đồng bộ). Đang thử lưu lại…',
              'warning',
              {
                undoLabel: 'Cho phép ghi lại',
                durationMs: 25000,
                onUndo: () => {
                  void regrantDirectoryWriteAndFlush();
                },
              }
            );
          }, 0);
        }
        return { novel, novelDir: loaded?.novelDir ?? null };
      } catch (e) {
        console.warn('[TTC] Không đọc được novel shadow:', e);
        return loaded;
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
    const tryDirByManifestScan = async (novelDir) => {
      if (!wantId) return null;
      try {
        for await (const [entryName, entryHandle] of novelDir.entries()) {
          if (entryHandle.kind !== 'file') continue;
          if (!/\.json$/i.test(entryName)) continue;
          if (/\.backup\.json$/i.test(entryName) || /\.json\.tmp$/i.test(entryName)) continue;
          const baseName = String(entryName).replace(/\.json$/i, '').trim();
          if (!baseName) continue;
          const hit = await tryDirWithBase(novelDir, baseName);
          if (hit) return hit;
        }
      } catch {
        /* ignore scan errors for this folder */
      }
      return null;
    };

    for (const name of novelManifestBaseNameCandidates(meta)) {
      try {
        const novelDir = await rootDir.getDirectoryHandle(name);
        const hit = await tryDirWithBase(novelDir, name);
        if (hit) return applyPendingShadow(hit);
        for (const alt of novelManifestBaseNameCandidates(meta)) {
          if (alt === name) continue;
          const hitAlt = await tryDirWithBase(novelDir, alt);
          if (hitAlt) return applyPendingShadow(hitAlt);
        }
        const hitScan = await tryDirByManifestScan(novelDir);
        if (hitScan) return applyPendingShadow(hitScan);
      } catch {
        /* thử candidate kế */
      }
    }

    if (wantId) {
      try {
        const candidateBases = novelManifestBaseNameCandidates(meta);
        for await (const [entryName, h] of rootDir.entries()) {
          if (h.kind !== 'directory') continue;
          const basesToTry = [...new Set([entryName, ...candidateBases])];
          for (const base of basesToTry) {
            const hit = await tryDirWithBase(h, base);
            if (hit) return applyPendingShadow(hit);
          }
          const hitScan = await tryDirByManifestScan(h);
          if (hitScan) return applyPendingShadow(hitScan);
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
      if (wantId && pid && pid !== wantId) {
        return applyPendingShadow(null);
      }
      const novel = finalizeParsed(parsed, `novels/${meta.id}.json`);
      return applyPendingShadow(novel ? { novel, novelDir: null } : null);
    } catch (e) {
      if (e && e.name === 'NotFoundError') {
        return applyPendingShadow(null);
      }
      console.warn(`[TTC] Lỗi đọc novels/${meta.id}.json`, e);
      return applyPendingShadow(null);
    }
  }, [regrantDirectoryWriteAndFlush, showToast]);

  return {
    syncIndex,
    syncNovel,
    awaitNovelDiskIdle,
    hasPendingNovelDiskWrite,
    cleanupLegacyIndexFiles,
    loadNovelData,
    queuePersistNovelStatsToIndex,
    bumpNovelStatsAfterWrite,
    syncNovelRef,
    persistIndexStatsTimerRef,
  };
}
