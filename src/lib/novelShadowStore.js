/**
 * Bản nháp truyện trên IndexedDB khi ghi thư mục (OneDrive) thất bại / chưa xong.
 * Giữ dữ liệu qua F5; xóa shadow khi sync đĩa thành công.
 * Ai gọi: useAppPersistence (sync/load), useAppNovelCrud (xóa).
 */

const DB_NAME = 'tangthu_novel_shadow';
const DB_VERSION = 1;
const STORE_NAME = 'novels';
const OPEN_DB_TIMEOUT_MS = 4000;

function openDatabase() {
  if (typeof indexedDB === 'undefined') return null;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    let timeoutId = null;
    let settled = false;

    const settle = (handler, value) => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      handler(value);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onerror = () => {
      settle(reject, request.error || new Error('Failed to open novel shadow store'));
    };

    request.onblocked = () => {
      settle(reject, new Error('Opening novel shadow store was blocked by another browser context'));
    };

    request.onsuccess = () => {
      settle(resolve, request.result);
    };

    timeoutId = setTimeout(() => {
      settle(reject, new Error('Timed out while opening novel shadow store'));
    }, OPEN_DB_TIMEOUT_MS);
  });
}

async function withDb(action, fallback = null) {
  let db = null;
  try {
    db = await openDatabase();
    if (!db) return fallback;
    return await action(db);
  } catch (error) {
    console.warn('[TTC] novel shadow store error:', error);
    return fallback;
  } finally {
    try {
      db?.close();
    } catch {
      void 0;
    }
  }
}

function cloneNovelForShadow(novelData) {
  if (!novelData || typeof novelData !== 'object') return null;
  try {
    if (typeof structuredClone === 'function') return structuredClone(novelData);
    return JSON.parse(JSON.stringify(novelData));
  } catch {
    return null;
  }
}

function mergePartialDataIntoDisk(diskNovel, shadowNovel) {
  const merged = {
    ...diskNovel,
    ...shadowNovel,
    data: { ...(diskNovel.data || {}) },
  };
  Object.entries(shadowNovel.data || {}).forEach(([lonId, lonData]) => {
    if (!merged.data[lonId]) merged.data[lonId] = {};
    Object.entries(lonData || {}).forEach(([nhoId, nhoData]) => {
      merged.data[lonId][nhoId] = nhoData;
    });
  });
  return merged;
}

/**
 * Khi còn shadow pending: ưu tiên shadow (đã lưu trước khi ghi đĩa fail / F5).
 * @returns {{ novel: object, fromShadow: boolean } | null}
 */
export function resolveNovelWithShadow(diskNovel, shadowRecord) {
  const shadowNovel = shadowRecord?.novel;
  if (!shadowNovel || typeof shadowNovel !== 'object') {
    return diskNovel ? { novel: diskNovel, fromShadow: false } : null;
  }

  const shadowId = String(shadowNovel.id ?? '').trim();
  if (diskNovel) {
    const diskId = String(diskNovel.id ?? '').trim();
    if (shadowId && diskId && shadowId !== diskId) {
      return { novel: diskNovel, fromShadow: false };
    }
  }

  let next;
  if (!diskNovel) {
    next = { ...shadowNovel };
  } else if (shadowNovel.__partialData) {
    next = mergePartialDataIntoDisk(diskNovel, shadowNovel);
  } else {
    next = { ...shadowNovel };
    if (diskNovel.storageLayout && !next.storageLayout) {
      next.storageLayout = diskNovel.storageLayout;
    }
  }

  next.__recoveredFromShadow = true;
  return { novel: next, fromShadow: true };
}

export async function saveNovelShadow(novelData) {
  const id = String(novelData?.id ?? '').trim();
  if (!id) return false;
  const cloned = cloneNovelForShadow(novelData);
  if (!cloned) return false;

  return withDb(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(
          {
            novel: cloned,
            updatedAt: Date.now(),
          },
          id
        );
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error || new Error('Failed to write novel shadow'));
        tx.onabort = () => reject(tx.error || new Error('Novel shadow write aborted'));
      }),
    false
  );
}

export async function loadNovelShadow(novelId) {
  const id = String(novelId ?? '').trim();
  if (!id) return null;

  return withDb(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(id);
        request.onsuccess = () => {
          const value = request.result;
          if (!value || typeof value !== 'object' || !value.novel) {
            resolve(null);
            return;
          }
          resolve(value);
        };
        request.onerror = () => reject(request.error || new Error('Failed to read novel shadow'));
        tx.onabort = () => reject(tx.error || new Error('Novel shadow read aborted'));
      }),
    null
  );
}

export async function clearNovelShadow(novelId) {
  const id = String(novelId ?? '').trim();
  if (!id) return false;

  return withDb(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(id);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error || new Error('Failed to clear novel shadow'));
        tx.onabort = () => reject(tx.error || new Error('Novel shadow clear aborted'));
      }),
    false
  );
}
