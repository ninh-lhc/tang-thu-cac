/**
 * Bố cục lưu truyện trên ổ đĩa: manifest (file .json gốc) + shard theo tab nhỏ data/<lon>/<nho>.json.
 * Shard ghi đè in-place (tránh tmp+rename gây churn OneDrive).
 * localStorage vẫn một blob — chỉ thư mục truyện (File System Access) dùng sharded.
 * Ai gọi: useAppPersistence.js, useAppNovelCrud (xóa thư mục đúng id). Test: novelDiskLayout.test.js
 */

export const NOVEL_STORAGE_SHARDED = 'sharded';
export const DATA_DIR_NAME = 'data';
const shardWriteStateByDir = new WeakMap();

/** Tên thư mục / file an toàn trên Windows (id thường là uuid → không đổi). */
export function encodePathSegment(id) {
  return encodeURIComponent(String(id));
}

export function decodePathSegment(seg) {
  try {
    return decodeURIComponent(String(seg));
  } catch {
    return String(seg);
  }
}

export function listShardKeysFromData(data) {
  const keys = [];
  if (!data || typeof data !== 'object') return keys;
  for (const lonId of Object.keys(data)) {
    const inner = data[lonId];
    if (!inner || typeof inner !== 'object') continue;
    for (const nhoId of Object.keys(inner)) {
      keys.push({ lonId, nhoId });
    }
  }
  return keys;
}

/**
 * Các tên file manifest (không đuôi .json) thử lần lượt khi mở thư mục truyện.
 * Giảm lệch sau đổi tiêu đề / folderName trong index so với tên thư mục thật trên đĩa.
 */
export function novelManifestBaseNameCandidates(meta) {
  const fromFolder = String(meta?.folderName ?? '').trim();
  const fromTitle = String(meta?.title ?? '')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim();
  const fromId = String(meta?.id ?? '').trim();
  const out = [];
  for (const x of [fromFolder, fromTitle, fromId]) {
    if (x && !out.includes(x)) out.push(x);
  }
  return out;
}

/** Bản ghi manifest: data rỗng + cờ sharded (nội dung tab nằm trong thư mục data/). */
export function buildDiskManifest(novelData) {
  let m;
  try {
    m = typeof structuredClone === 'function' ? structuredClone(novelData) : JSON.parse(JSON.stringify(novelData));
  } catch {
    m = { ...novelData };
  }
  m.data = {};
  m.storageLayout = NOVEL_STORAGE_SHARDED;
  return m;
}

function shardKeyPath(lonId, nhoId) {
  return `${encodePathSegment(lonId)}/${encodePathSegment(nhoId)}.json`;
}

export function getShardState(dirHandle) {
  const cur = shardWriteStateByDir.get(dirHandle);
  if (cur && cur.hashes instanceof Map) return cur;
  const next = { hashes: new Map() };
  shardWriteStateByDir.set(dirHandle, next);
  return next;
}

/** Tính kế hoạch ghi shard dựa trên cache hash nội bộ (skip shard không đổi). */
export function buildShardWritePlan(data, previousHashes) {
  const keys = listShardKeysFromData(data);
  const writes = [];
  const nextHashes = new Map();
  const expected = new Set();
  for (const { lonId, nhoId } of keys) {
    const rel = shardKeyPath(lonId, nhoId);
    expected.add(rel);
    const jsonStr = JSON.stringify(data[lonId][nhoId], null, 2);
    nextHashes.set(rel, jsonStr);
    if (previousHashes.get(rel) !== jsonStr) {
      writes.push({ lonId, nhoId, rel, jsonStr });
    }
  }
  const removed = [];
  for (const rel of previousHashes.keys()) {
    if (!expected.has(rel)) removed.push(rel);
  }
  return { writes, removed, nextHashes, expected };
}

/**
 * Đọc toàn bộ shard vào một object data[lonId][nhoId] (chưa migrate).
 * @param {FileSystemDirectoryHandle} novelDirHandle
 */
export async function loadShardsFromNovelDir(novelDirHandle) {
  const data = {};
  let dataDir;
  try {
    dataDir = await novelDirHandle.getDirectoryHandle(DATA_DIR_NAME);
  } catch {
    return data;
  }
  for await (const [lonEnc, lonHandle] of dataDir.entries()) {
    if (lonHandle.kind !== 'directory') continue;
    const lonId = decodePathSegment(lonEnc);
    for await (const [fileName, fileHandle] of lonHandle.entries()) {
      if (fileHandle.kind !== 'file' || !/\.json$/i.test(fileName)) continue;
      if (fileName.toLowerCase().endsWith('.json.tmp')) continue;
      const nhoId = decodePathSegment(fileName.replace(/\.json$/i, ''));
      try {
        const file = await fileHandle.getFile();
        const text = await file.text();
        const tab = JSON.parse(text);
        if (!data[lonId]) data[lonId] = {};
        data[lonId][nhoId] = tab;
      } catch (e) {
        console.warn('[TTC] Shard JSON lỗi:', lonEnc, fileName, e);
      }
    }
  }
  return data;
}

/**
 * Đọc một phần shard theo danh sách {lonId,nhoId}.
 * Trả về object data cùng shape với loadShardsFromNovelDir.
 */
export async function loadShardSubsetFromNovelDir(novelDirHandle, shardKeys) {
  const data = {};
  const keys = Array.isArray(shardKeys) ? shardKeys : [];
  if (keys.length === 0) return data;
  let dataDir;
  try {
    dataDir = await novelDirHandle.getDirectoryHandle(DATA_DIR_NAME);
  } catch {
    return data;
  }
  for (const key of keys) {
    const lonId = key?.lonId;
    const nhoId = key?.nhoId;
    if (!lonId || !nhoId) continue;
    const lonSeg = encodePathSegment(lonId);
    const nhoSeg = encodePathSegment(nhoId);
    try {
      const lonDir = await dataDir.getDirectoryHandle(lonSeg);
      const fileHandle = await lonDir.getFileHandle(`${nhoSeg}.json`);
      const file = await fileHandle.getFile();
      const text = await file.text();
      const tab = JSON.parse(text);
      if (!data[lonId]) data[lonId] = {};
      data[lonId][nhoId] = tab;
    } catch {
      /* missing shard is acceptable */
    }
  }
  return data;
}

function pickShardSubsetFromData(data, shardKeys) {
  const subset = {};
  const keys = Array.isArray(shardKeys) ? shardKeys : [];
  for (const key of keys) {
    const lonId = key?.lonId;
    const nhoId = key?.nhoId;
    if (!lonId || !nhoId) continue;
    const tab = data?.[lonId]?.[nhoId];
    if (tab === undefined) continue;
    if (!subset[lonId]) subset[lonId] = {};
    subset[lonId][nhoId] = tab;
  }
  return subset;
}

async function hasAnyShardData(novelDirHandle) {
  try {
    const dataDir = await novelDirHandle.getDirectoryHandle(DATA_DIR_NAME);
    for await (const [, lonHandle] of dataDir.entries()) {
      if (lonHandle.kind !== 'directory') continue;
      for await (const [fileName, fh] of lonHandle.entries()) {
        if (fh.kind !== 'file' || !/\.json$/i.test(fileName)) continue;
        if (fileName.toLowerCase().endsWith('.json.tmp')) continue;
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Đọc `<manifestBaseName>.json` trong novelDir + (nếu sharded) ghép shard.
 * Trả về object đã parse (chưa migrateNovel), hoặc null.
 */
export async function readRawNovelPackageFromDir(novelDirHandle, manifestBaseName, options = {}) {
  const rawKeys = Array.isArray(options.shardKeys) ? options.shardKeys : null;
  const shardKeys = rawKeys && rawKeys.length > 0 ? rawKeys : null;
  try {
    const f = await novelDirHandle.getFileHandle(`${manifestBaseName}.json`);
    const text = await (await f.getFile()).text();
    const parsed = JSON.parse(text);
    const shouldUseShardedRead =
      parsed.storageLayout === NOVEL_STORAGE_SHARDED ||
      (!parsed?.storageLayout && await hasAnyShardData(novelDirHandle));
    if (shouldUseShardedRead) {
      const shardData = shardKeys
        ? await loadShardSubsetFromNovelDir(novelDirHandle, shardKeys)
        : await loadShardsFromNovelDir(novelDirHandle);
      parsed.data = shardData;
      parsed.storageLayout = NOVEL_STORAGE_SHARDED;
      if (shardKeys) parsed.__partialData = true;
    }
    let hasMainData = listShardKeysFromData(parsed.data || {}).length > 0;
    // Đọc đủ shard (không phải preload subset): nếu vẫn rỗng nhưng thư mục data/ còn file — thử đọc lại một lần (race FS hiếm gặp).
    if (!hasMainData && shouldUseShardedRead && !shardKeys) {
      const anyShards = await hasAnyShardData(novelDirHandle);
      if (anyShards) {
        parsed.data = await loadShardsFromNovelDir(novelDirHandle);
        hasMainData = listShardKeysFromData(parsed.data || {}).length > 0;
      }
    }
    // KHÔNG nạp `<manifest>.backup.json` khi đang preload một phần tab (`shardKeys`): subset rỗng (sai id tạm, shard chưa kịp ghi…)
    // từng bị coi là “mất data” → nạp backup cũ → syncNovel ghi đè shard mới (mất thẻ vừa tạo sau khi kết nối lại / reload dev).
    if (!hasMainData && !shardKeys) {
      try {
        const bf = await novelDirHandle.getFileHandle(`${manifestBaseName}.backup.json`);
        const bText = await (await bf.getFile()).text();
        const backupParsed = JSON.parse(bText);
        if (backupParsed && typeof backupParsed === 'object') {
          const backupData = shardKeys
            ? pickShardSubsetFromData(backupParsed.data || {}, shardKeys)
            : backupParsed.data || {};
          const backupKeys = listShardKeysFromData(backupData);
          if (backupKeys.length > 0) {
            parsed.data = backupData;
            if (!parsed.tabsConfig || parsed.tabsConfig.length === 0) {
              parsed.tabsConfig = backupParsed.tabsConfig || parsed.tabsConfig;
            }
            if (!parsed.storageLayout && backupParsed.storageLayout) {
              parsed.storageLayout = backupParsed.storageLayout;
            }
            parsed.__recoveredFromBackup = true;
          }
        }
      } catch {
        /* ignore missing/corrupt backup */
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Ghi một file .json trong data/<lon>/ — ghi đè in-place (ít churn hơn tmp+rename với OneDrive). */
async function writeShardFile(lonDirHandle, nhoSeg, jsonStr) {
  const mainFile = `${nhoSeg}.json`;
  const out = await lonDirHandle.getFileHandle(mainFile, { create: true });
  const w = await out.createWritable();
  await w.write(jsonStr);
  await w.close();
  // Dọn .tmp cũ từ lần ghi atomic trước (best-effort).
  try {
    await lonDirHandle.removeEntry(`${nhoSeg}.json.tmp`);
  } catch {
    /* ignore */
  }
}

/**
 * Ghi toàn bộ shard + xóa file shard thừa (tab đã xóa).
 * @param {FileSystemDirectoryHandle} novelDirHandle
 * @param {object} novelData — object đầy đủ trong memory (có .data)
 */
export async function writeShardTree(novelDirHandle, novelData) {
  const shardState = getShardState(novelDirHandle);
  const plan = buildShardWritePlan(novelData.data || {}, shardState.hashes);

  const dataDir = await novelDirHandle.getDirectoryHandle(DATA_DIR_NAME, { create: true });

  for (const w of plan.writes) {
    const { lonId, nhoId, rel, jsonStr } = w;
    const lonSeg = encodePathSegment(lonId);
    const nhoSeg = encodePathSegment(nhoId);
    const lonDir = await dataDir.getDirectoryHandle(lonSeg, { create: true });
    await writeShardFile(lonDir, nhoSeg, jsonStr);
    shardState.hashes.set(rel, jsonStr);
  }

  for await (const [lonEnc, lonHandle] of dataDir.entries()) {
    if (lonHandle.kind !== 'directory') continue;
    for await (const [fileName, fh] of lonHandle.entries()) {
      if (fh.kind !== 'file' || !/\.json$/i.test(fileName)) continue;
      if (fileName.toLowerCase().endsWith('.json.tmp')) continue;
      const rel = `${lonEnc}/${fileName}`;
      if (!plan.expected.has(rel)) {
        try {
          await lonHandle.removeEntry(fileName);
          shardState.hashes.delete(rel);
        } catch {
          /* ignore */
        }
      }
    }
  }
}

/** Đọc `id` từ nội dung file manifest JSON (không nạp shard). */
export function parseManifestIdFromJsonText(text) {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') return null;
    const id = parsed.id;
    if (id == null) return null;
    const s = String(id).trim();
    return s || null;
  } catch {
    return null;
  }
}

/** Giống useAppPersistence — xóa thư mục con cần quyền readwrite trên thư mục cha. */
export async function ensureFsDirectoryWritePermission(dirHandle) {
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

async function readManifestIdFromNovelDir(novelDirHandle, manifestBaseName) {
  try {
    const f = await novelDirHandle.getFileHandle(`${manifestBaseName}.json`);
    const text = await (await f.getFile()).text();
    return parseManifestIdFromJsonText(text);
  } catch {
    return null;
  }
}

async function hasMatchingManifestIdInDirectory(novelDirHandle, wantId) {
  if (!novelDirHandle || !wantId) return false;
  try {
    for await (const [entryName, entryHandle] of novelDirHandle.entries()) {
      if (entryHandle.kind !== 'file') continue;
      if (!/\.json$/i.test(entryName)) continue;
      if (/\.backup\.json$/i.test(entryName) || /\.json\.tmp$/i.test(entryName)) continue;
      try {
        const text = await (await entryHandle.getFile()).text();
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object') continue;
        const parsedId = String(parsed.id ?? '').trim();
        if (parsedId !== wantId) continue;
        // Chỉ coi là manifest truyện nếu có dấu hiệu cấu trúc truyện;
        // tránh match nhầm file json phụ trong thư mục images/cache.
        const isNovelLike =
          typeof parsed.title === 'string' ||
          typeof parsed.author === 'string' ||
          Array.isArray(parsed.tabsConfig) ||
          (parsed.data && typeof parsed.data === 'object') ||
          Array.isArray(parsed.genres) ||
          typeof parsed.genre === 'string' ||
          parsed.storageLayout === NOVEL_STORAGE_SHARDED;
        if (isNovelLike) return true;
      } catch {
        /* skip malformed file */
      }
    }
  } catch {
    /* unreadable dir */
  }
  return false;
}

async function removeDirectoryTreeManual(dirHandle) {
  for await (const [entryName, entryHandle] of dirHandle.entries()) {
    if (entryHandle.kind === 'file') {
      try {
        await dirHandle.removeEntry(entryName);
      } catch {
        /* keep going; caller will surface final failure */
      }
      continue;
    }
    if (entryHandle.kind === 'directory') {
      await removeDirectoryTreeManual(entryHandle);
      try {
        await dirHandle.removeEntry(entryName, { recursive: true });
      } catch {
        /* keep going; caller will surface final failure */
      }
    }
  }
}

async function tryRemoveFolderByName(rootDir, meta) {
  const names = novelManifestBaseNameCandidates(meta);
  for (const name of names) {
    if (!name) continue;
    try {
      await rootDir.removeEntry(name, { recursive: true });
      return { ok: true, removed: name, kind: 'folder_by_name' };
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

/**
 * Tìm tên thư mục con của root (Mệnh Bàn) chứa manifest trùng `meta.id`.
 * Khớp thứ tự với load: candidates → rồi quét toàn bộ thư mục (trừ `novels`).
 */
export async function findNovelFolderEntryNameOnRoot(rootDir, meta) {
  const wantId = String(meta?.id ?? '').trim();
  if (!wantId || !rootDir) return null;
  const candidates = novelManifestBaseNameCandidates(meta);

  for (const dirName of candidates) {
    try {
      const novelDir = await rootDir.getDirectoryHandle(dirName);
      const basesToTry = [...new Set([...candidates, dirName])];
      for (const base of basesToTry) {
        const pid = await readManifestIdFromNovelDir(novelDir, base);
        if (pid === wantId) return dirName;
      }
      if (await hasMatchingManifestIdInDirectory(novelDir, wantId)) return dirName;
    } catch {
      /* thử candidate kế */
    }
  }

  try {
    for await (const [entryName, handle] of rootDir.entries()) {
      if (handle.kind !== 'directory') continue;
      if (entryName === 'novels') continue;
      const basesToTry = [...new Set([entryName, ...candidates])];
      for (const base of basesToTry) {
        try {
          const pid = await readManifestIdFromNovelDir(handle, base);
          if (pid === wantId) return entryName;
        } catch {
          /* */
        }
      }
      if (await hasMatchingManifestIdInDirectory(handle, wantId)) return entryName;
    }
  } catch (e) {
    console.warn('[TTC] findNovelFolderEntryNameOnRoot scan', e);
  }
  return null;
}

/**
 * Xóa dữ liệu truyện trên đĩa: thư mục manifest (đệ quy) hoặc file legacy `novels/<id>.json`.
 * @returns {{ ok: true, removed: string, kind: 'folder'|'legacy_file' } | { ok: false, reason: string, attempted?: string, error?: unknown }}
 */
export async function removeNovelStorageFromRoot(rootDir, meta) {
  const wantId = String(meta?.id ?? '').trim();
  if (!rootDir || wantId === '') {
    return { ok: false, reason: 'bad_args' };
  }

  const perm = await ensureFsDirectoryWritePermission(rootDir);
  if (!perm.ok) {
    return { ok: false, reason: 'permission_denied', permission: perm };
  }

  const folderName = await findNovelFolderEntryNameOnRoot(rootDir, meta);
  if (folderName) {
    let lastErr;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 150));
      }
      try {
        await rootDir.removeEntry(folderName, { recursive: true });
        return { ok: true, removed: folderName, kind: 'folder' };
      } catch (error) {
        lastErr = error;
      }
    }
    try {
      const folderHandle = await rootDir.getDirectoryHandle(folderName);
      await removeDirectoryTreeManual(folderHandle);
      await rootDir.removeEntry(folderName, { recursive: true });
      return { ok: true, removed: folderName, kind: 'folder' };
    } catch (error) {
      lastErr = error || lastErr;
    }
    return { ok: false, reason: 'remove_failed', attempted: folderName, error: lastErr };
  }

  const byName = await tryRemoveFolderByName(rootDir, meta);
  if (byName?.ok) return byName;

  try {
    const novelsDir = await rootDir.getDirectoryHandle('novels');
    await novelsDir.removeEntry(`${wantId}.json`);
    return { ok: true, removed: `novels/${wantId}.json`, kind: 'legacy_file' };
  } catch {
    /* */
  }

  return { ok: false, reason: 'not_found' };
}
