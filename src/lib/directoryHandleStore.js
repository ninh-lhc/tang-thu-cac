/**
 * Persist the last connected folder handle in IndexedDB.
 * Chromium can structured-clone File System Access handles, which lets us
 * restore the connection after a reload without asking the user to re-pick.
 */

const DB_NAME = 'tangthu_directory_connection';
const DB_VERSION = 1;
const STORE_NAME = 'handles';
const LAST_HANDLE_KEY = 'last_root_directory';

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

    request.onerror = () => {
      reject(request.error || new Error('Failed to open directory handle store'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

function readValue(db, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => {
      resolve(request.result ?? null);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to read persisted directory handle'));
    };

    tx.onabort = () => {
      reject(tx.error || new Error('Directory handle read aborted'));
    };
  });
}

function writeValue(db, key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(value, key);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Failed to persist directory handle'));
    tx.onabort = () => reject(tx.error || new Error('Directory handle write aborted'));
  });
}

function deleteValue(db, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(key);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Failed to clear directory handle'));
    tx.onabort = () => reject(tx.error || new Error('Directory handle clear aborted'));
  });
}

export async function savePersistedDirectoryHandle(handle) {
  if (!handle || handle === 'LOCAL_STORAGE') return;

  const db = await openDatabase();
  if (!db) return;

  try {
    await writeValue(db, LAST_HANDLE_KEY, handle);
  } catch (error) {
    console.warn('[TTC] Failed to persist directory handle:', error);
  } finally {
    db.close();
  }
}

export async function loadPersistedDirectoryHandle() {
  const db = await openDatabase();
  if (!db) return null;

  try {
    return await readValue(db, LAST_HANDLE_KEY);
  } catch (error) {
    console.warn('[TTC] Failed to load persisted directory handle:', error);
    return null;
  } finally {
    db.close();
  }
}

export async function clearPersistedDirectoryHandle() {
  const db = await openDatabase();
  if (!db) return;

  try {
    await deleteValue(db, LAST_HANDLE_KEY);
  } catch (error) {
    console.warn('[TTC] Failed to clear persisted directory handle:', error);
  } finally {
    db.close();
  }
}

export async function isPersistedDirectoryHandleUsable(handle) {
  if (!handle || handle === 'LOCAL_STORAGE') return false;
  if (typeof handle.queryPermission !== 'function') return true;

  try {
    const permission = await handle.queryPermission({ mode: 'readwrite' });
    return permission !== 'denied';
  } catch {
    return true;
  }
}
