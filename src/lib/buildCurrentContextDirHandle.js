/**
 * Proxy thư mục: ảnh ưu tiên trong thư mục truyện, fallback root/images.
 * Trả về dirHandle gốc nếu không có active novel dir.
 */
export function buildCurrentContextDirHandle(dirHandle, activeNovelDirHandle) {
  if (!dirHandle || dirHandle === 'LOCAL_STORAGE') return dirHandle;
  if (!activeNovelDirHandle) return dirHandle;

  return {
    getDirectoryHandle: async (name, options) => {
      if (name === 'images') {
        let novelImagesDir;
        try {
          novelImagesDir = await activeNovelDirHandle.getDirectoryHandle('images', options);
        } catch {
          if (options?.create) novelImagesDir = await activeNovelDirHandle.getDirectoryHandle('images', { create: true });
        }
        let rootImagesDir;
        try {
          rootImagesDir = await dirHandle.getDirectoryHandle('images');
        } catch {
          /* no root images */
        }

        if (!novelImagesDir && !rootImagesDir) throw new Error('Images dir not found');
        const resolveEntries = async function* () {
          const seen = new Set();
          for (const candidate of [novelImagesDir, rootImagesDir]) {
            if (!candidate || typeof candidate.entries !== 'function') continue;
            for await (const [entryName, entryHandle] of candidate.entries()) {
              if (seen.has(entryName)) continue;
              seen.add(entryName);
              yield [entryName, entryHandle];
            }
          }
        };

        return {
          getFileHandle: async (filename, fileOptions) => {
            if (fileOptions?.create) {
              if (!novelImagesDir) novelImagesDir = await activeNovelDirHandle.getDirectoryHandle('images', { create: true });
              return novelImagesDir.getFileHandle(filename, fileOptions);
            }
            try {
              if (novelImagesDir) return await novelImagesDir.getFileHandle(filename, fileOptions);
              throw new Error();
            } catch (e) {
              if (rootImagesDir) return await rootImagesDir.getFileHandle(filename, fileOptions);
              throw e;
            }
          },
          entries: resolveEntries,
        };
      }
      return activeNovelDirHandle.getDirectoryHandle(name, options);
    },
    getFileHandle: (name, options) => activeNovelDirHandle.getFileHandle(name, options),
  };
}
