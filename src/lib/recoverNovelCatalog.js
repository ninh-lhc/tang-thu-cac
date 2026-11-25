/**
 * Đối chiếu danh mục với các manifest truyện còn trên đĩa.
 * Dùng khi khôi phục thư mục lúc mở app hoặc khi người dùng chọn lại thư mục.
 * Chỉ đọc file mô tả truyện, không đọc shard nội dung.
 */
import { NOVEL_STORAGE_SHARDED } from './novelDiskLayout.js';

export async function readNovelCatalog(root) {
  let snapshot;
  let backup;
  let readError;
  for (const name of ['index.json', 'index.backup.json']) {
    try {
      const handle = await root.getFileHandle(name);
      const candidate = JSON.parse((await (await handle.getFile()).text()).replace(/^\uFEFF/, ''));
      if (!Array.isArray(candidate?.metadata)) throw new Error('Invalid story catalog');
      if (name === 'index.json') snapshot = candidate;
      else backup = candidate;
    } catch (error) {
      if (error?.name !== 'NotFoundError') readError ??= error;
    }
  }

  const diskMetadata = await recoverNovelCatalog(root);
  const base = snapshot || backup;
  if (!base && !diskMetadata.length) return { snapshot: null, readError };

  const metadata = [...(base?.metadata ?? [])];
  const known = new Set(metadata.map((meta) => meta?.id));
  const backupById = new Map(backup?.metadata.filter((meta) => meta?.id).map((meta) => [meta.id, meta]));
  for (const meta of diskMetadata) {
    if (known.has(meta.id)) continue;
    metadata.push({ ...meta, ...backupById.get(meta.id), folderName: meta.folderName });
  }
  return { snapshot: { ...base, metadata }, readError };
}

async function readMetadata(file, folderName) {
  try {
    const novel = JSON.parse((await (await file.getFile()).text()).replace(/^\uFEFF/, ''));
    if (typeof novel?.id !== 'string' || !novel.id.trim()) return null;
    if (typeof novel.title !== 'string' || !novel.title.trim()) return null;
    if (novel.storageLayout !== NOVEL_STORAGE_SHARDED &&
        !Array.isArray(novel.tabsConfig) && !novel.data) return null;
    const {
      id, title, author, genres, genre, theme, tags, chaptersRead, chaptersTotal,
      status, rating, review, ratingOpinion, cover,
    } = novel;
    return Object.fromEntries(Object.entries({
      id, title, author, genres, genre, theme, tags, chaptersRead, chaptersTotal,
      status, rating, review, ratingOpinion, cover, folderName,
    }).filter(([, value]) => value !== undefined));
  } catch {
    return null;
  }
}

export async function recoverNovelCatalog(root) {
  const byId = new Map();
  if (typeof root.entries !== 'function') return [];

  for await (const [folderName, folder] of root.entries()) {
    if (folder.kind !== 'directory' || folderName === 'images') continue;
    try {
      const files = [];
      for await (const [name, handle] of folder.entries()) {
        if (handle.kind === 'file' && /\.json$/i.test(name) &&
            !/\.backup(?:-[^.]+)?\.json$/i.test(name)) {
          files.push([name, handle]);
        }
      }
      // Ưu tiên manifest trùng tên thư mục trước các bản đồng bộ trùng tên của OneDrive.
      files.sort(([a], [b]) =>
        Number(b === `${folderName}.json`) - Number(a === `${folderName}.json`));
      for (const [name, file] of files) {
        const legacy = folderName === 'novels';
        const meta = await readMetadata(file, legacy ? undefined : folderName);
        if (!meta || (legacy && name !== `${meta.id}.json`)) continue;
        if (!byId.has(meta.id)) byId.set(meta.id, meta);
        if (!legacy) break;
      }
    } catch {
      // Có thể vẫn phục hồi truyện từ các thư mục con đọc được.
    }
  }

  return [...byId.values()];
}
