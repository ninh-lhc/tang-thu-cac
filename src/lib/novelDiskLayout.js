/**
 * Bố cục lưu truyện trên ổ đĩa: manifest (file .json gốc) + shard theo tab nhỏ data/<lon>/<nho>.json.
 * localStorage vẫn một blob — chỉ thư mục truyện (File System Access) dùng sharded.
 * Ai gọi: useAppPersistence.js. Test: novelDiskLayout.test.js
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

function getShardState(dirHandle) {
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
    if (parsed.storageLayout === NOVEL_STORAGE_SHARDED) {
      const shardData = shardKeys
        ? await loadShardSubsetFromNovelDir(novelDirHandle, shardKeys)
        : await loadShardsFromNovelDir(novelDirHandle);
      parsed.data = shardData;
      if (shardKeys) parsed.__partialData = true;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Ghi một file .json trong data/<lon>/ với tmp + move khi có. */
async function writeShardAtomic(lonDirHandle, nhoSeg, jsonStr) {
  const mainFile = `${nhoSeg}.json`;
  const tmpFile = `${nhoSeg}.json.tmp`;
  const tw = await lonDirHandle.getFileHandle(tmpFile, { create: true });
  const w = await tw.createWritable();
  await w.write(jsonStr);
  await w.close();
  try {
    await lonDirHandle.removeEntry(mainFile);
  } catch {
    /* lần đầu */
  }
  const tmpAgain = await lonDirHandle.getFileHandle(tmpFile);
  if (typeof tmpAgain.move === 'function') {
    await tmpAgain.move(mainFile);
  } else {
    const out = await lonDirHandle.getFileHandle(mainFile, { create: true });
    const wo = await out.createWritable();
    await wo.write(jsonStr);
    await wo.close();
    try {
      await lonDirHandle.removeEntry(tmpFile);
    } catch {
      /* ignore */
    }
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
    await writeShardAtomic(lonDir, nhoSeg, jsonStr);
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
