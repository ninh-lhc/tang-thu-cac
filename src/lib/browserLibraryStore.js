/**
 * Browser library persistence for catalog records, novels and original image blobs.
 * The shell reads legacy snapshots until their first successful IndexedDB save.
 * Backup exports expand browser-only image references into portable data URLs.
 */
import { readLocalJsonWithBackup } from '../storageSafe.js';
import { loadGalleryThumbnail } from './galleryThumbnail.js';

const DATABASE = 'tangthu_browser_library';
const IMAGE_PREFIX = 'local_image:idb/';

async function access(store, mode, action) {
  const db = await new Promise((resolve, reject) => {
    const open = indexedDB.open(DATABASE, 1);
    open.onupgradeneeded = () => {
      open.result.createObjectStore('records');
      open.result.createObjectStore('images');
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const request = action(tx.objectStore(store));
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = () => reject(tx.error || new Error('Giao dịch bị hủy.'));
    });
  } finally {
    db.close();
  }
}

export async function readBrowserRecord(key) {
  const value = await access('records', 'readonly', store => store.get(key));
  if (value !== undefined) return { value, source: 'indexeddb' };
  const legacy = readLocalJsonWithBackup(key, key + '_backup', null);
  if (legacy.value == null) return legacy;
  const migrated = await importBrowserImages(legacy.value);
  const current = await access('records', 'readwrite', store => {
    const lookup = store.get(key);
    lookup.onsuccess = () => {
      if (lookup.result === undefined) store.put(migrated, key);
    };
    return lookup;
  });
  return { ...legacy, value: current ?? migrated };
}

export async function writeBrowserRecord(key, value) {
  await access('records', 'readwrite', store => store.put(value, key));
}

export async function deleteBrowserRecord(key) {
  await access('records', 'readwrite', store => store.delete(key));
  localStorage.removeItem(key);
  localStorage.removeItem(key + '_backup');
}

export async function saveBrowserImage(file) {
  const key = crypto.randomUUID();
  await access('images', 'readwrite', store => store.add(file, key));
  return IMAGE_PREFIX + key;
}

export async function readBrowserImage(key) {
  const blob = await access('images', 'readonly', store => store.get(key));
  if (!blob) throw new Error('Không tìm thấy ảnh trong thư viện trình duyệt.');
  return blob;
}

export function browserGalleryThumbnail(key, active) {
  const previewKey = 'preview-512/' + key;
  return loadGalleryThumbnail({
    active,
    original: () => readBrowserImage(key),
    read: () => access('images', 'readonly', store => store.get(previewKey)),
    write: preview => access('images', 'readwrite', store => store.put(preview, previewKey)),
  });
}

// Old snapshots and portable backups may contain images in plain fields or Markdown.
export async function importBrowserImages(payload) {
  const refs = new Map();
  async function saveUrl(url) {
    if (refs.has(url)) return refs.get(url);
    const comma = url.indexOf(',');
    const bytes = Uint8Array.from(atob(url.slice(comma + 1)), char => char.charCodeAt(0));
    const blob = new Blob([bytes], { type: url.slice(5, url.indexOf(';')) });
    const ref = await saveBrowserImage(blob);
    refs.set(url, ref);
    return ref;
  }
  async function visit(value, field) {
    if (Array.isArray(value)) {
      const result = [];
      for (const child of value) result.push(await visit(child, field));
      return result;
    }
    if (value && typeof value === 'object') {
      const entries = [];
      for (const [key, child] of Object.entries(value)) entries.push([key, await visit(child, key)]);
      return Object.fromEntries(entries);
    }
    if (typeof value !== 'string' || !value.includes('data:image/')) return value;
    if (['cover', 'avatar', 'images'].includes(field) && /^data:image\/[\w.+-]+;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) {
      return saveUrl(value);
    }
    const markdown = /(!\[[^\]\n]*\]\()(data:image\/[\w.+-]+;base64,[A-Za-z0-9+/]+={0,2})(?=\))/g;
    for (const match of value.matchAll(markdown)) await saveUrl(match[2]);
    return value.replace(markdown, (_, prefix, url) => prefix + refs.get(url));
  }
  return visit(payload, '');
}

export async function portableBrowserSnapshot(payload) {
  const urls = new Map();
  const pattern = /local_image:idb\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  const json = JSON.stringify(payload);
  for (const [ref] of json.matchAll(pattern)) {
    if (urls.has(ref)) continue;
    const blob = await readBrowserImage(ref.slice(IMAGE_PREFIX.length));
    const url = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    urls.set(ref, url);
  }
  return urls.size ? JSON.parse(json.replace(pattern, ref => urls.get(ref))) : payload;
}
