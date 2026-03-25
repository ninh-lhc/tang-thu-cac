/**
 * Bố cục lưu truyện trên ổ đĩa: manifest (file .json gốc) + shard theo tab nhỏ data/<lon>/<nho>.json.
 * localStorage vẫn một blob — chỉ thư mục truyện (File System Access) dùng sharded.
 * Ai gọi: useAppPersistence.js. Test: novelDiskLayout.test.js
 */

export const NOVEL_STORAGE_SHARDED = 'sharded';
export const DATA_DIR_NAME = 'data';

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
  const keys = listShardKeysFromData(novelData.data);
  const expected = new Set(keys.map(({ lonId, nhoId }) => shardKeyPath(lonId, nhoId)));

  const dataDir = await novelDirHandle.getDirectoryHandle(DATA_DIR_NAME, { create: true });

  for (const { lonId, nhoId } of keys) {
    const tab = novelData.data[lonId][nhoId];
    const jsonStr = JSON.stringify(tab, null, 2);
    const lonSeg = encodePathSegment(lonId);
    const nhoSeg = encodePathSegment(nhoId);
    const lonDir = await dataDir.getDirectoryHandle(lonSeg, { create: true });
    await writeShardAtomic(lonDir, nhoSeg, jsonStr);
  }

  for await (const [lonEnc, lonHandle] of dataDir.entries()) {
    if (lonHandle.kind !== 'directory') continue;
    for await (const [fileName, fh] of lonHandle.entries()) {
      if (fh.kind !== 'file' || !/\.json$/i.test(fileName)) continue;
      if (fileName.toLowerCase().endsWith('.json.tmp')) continue;
      const rel = `${lonEnc}/${fileName}`;
      if (!expected.has(rel)) {
        try {
          await lonHandle.removeEntry(fileName);
        } catch {
          /* ignore */
        }
      }
    }
  }
}
