const DB_NAME = 'tangthu_deep_search_cache';
const DB_VERSION = 1;
const STORE_NAME = 'novel_indexes';
const MAX_CACHE_ENTRIES_PER_NAMESPACE = 120;

function openDatabase() {
  if (typeof indexedDB === 'undefined') return null;
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open deep search cache store'));
    request.onblocked = () => reject(new Error('Deep search cache store is blocked by another browser context'));
  });
}

function buildCacheKey(namespace, novelId) {
  return `${String(namespace || 'default')}::${String(novelId || '')}`;
}

async function withDb(action, fallback = null) {
  let db = null;
  try {
    db = await openDatabase();
    if (!db) return fallback;
    return await action(db);
  } catch (error) {
    console.warn('[TTC] deep search cache store error:', error);
    return fallback;
  } finally {
    try {
      db?.close();
    } catch {
      void 0;
    }
  }
}

function pruneNamespaceEntries(db, namespace) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.openCursor();
    const matches = [];

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        const overflow = Math.max(0, matches.length - MAX_CACHE_ENTRIES_PER_NAMESPACE);
        if (overflow > 0) {
          matches
            .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
            .slice(MAX_CACHE_ENTRIES_PER_NAMESPACE)
            .forEach((entry) => {
              store.delete(entry.key);
            });
        }
        return;
      }

      const key = String(cursor.key || '');
      if (key.startsWith(`${String(namespace || 'default')}::`)) {
        const value = cursor.value || {};
        matches.push({
          key,
          updatedAt: Number(value.updatedAt) || 0,
        });
      }
      cursor.continue();
    };

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error || new Error('Failed to prune deep search cache'));
    tx.onabort = () => reject(tx.error || new Error('Deep search cache prune aborted'));
  });
}

export function getDeepSearchCacheNamespace(dirHandle) {
  if (!dirHandle || dirHandle === 'LOCAL_STORAGE') return 'local-storage';
  const name = String(dirHandle?.name || '').trim() || 'fs-root';
  return `fs:${name}`;
}

export async function loadPersistedDeepSearchIndex(namespace, novelId) {
  if (!novelId) return null;
  return withDb(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const key = buildCacheKey(namespace, novelId);
        const req = store.get(key);
        req.onsuccess = () => {
          const value = req.result;
          if (value && typeof value === 'object') {
            store.put(
              {
                ...value,
                updatedAt: Date.now(),
              },
              key
            );
          }
          resolve(Array.isArray(value?.rows) ? value.rows : null);
        };
        req.onerror = () => reject(req.error || new Error('Failed to read deep search cache'));
        tx.onabort = () => reject(tx.error || new Error('Deep search cache read aborted'));
      }),
    null
  );
}

export async function savePersistedDeepSearchIndex(namespace, novelId, rows) {
  if (!novelId || !Array.isArray(rows)) return false;
  return withDb(
    async (db) => {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(
          {
            rows,
            updatedAt: Date.now(),
          },
          buildCacheKey(namespace, novelId)
        );
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error || new Error('Failed to write deep search cache'));
        tx.onabort = () => reject(tx.error || new Error('Deep search cache write aborted'));
      });
      await pruneNamespaceEntries(db, namespace);
      return true;
    },
    false
  );
}
