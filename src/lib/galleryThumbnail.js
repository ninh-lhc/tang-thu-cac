/**
 * Build 512 px gallery previews from local originals, one decode at a time.
 * AsyncLocalImage supplies persistent cache access for the active storage mode.
 * A failed cache write still leaves the generated preview available for display.
 */
let pending = Promise.resolve();

export async function loadGalleryThumbnail({ read, write, original, active }) {
  const cached = await read().catch(() => null);
  if (cached?.size) return cached;
  const build = async () => {
    if (!active()) return null;
    const blob = await original();
    let bitmap;
    try {
      bitmap = await createImageBitmap(blob);
      if (!active()) return null;
      const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const preview = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.82));
      if (!preview) return blob;
      await write(preview).catch(() => {});
      return preview;
    } catch {
      return blob;
    } finally {
      bitmap?.close();
    }
  };
  const result = pending.then(build);
  pending = result.then(() => {}, () => {});
  return result;
}

export async function folderGalleryThumbnail(imagesDir, file, active) {
  // Include source metadata so replacing a file invalidates its previous preview.
  const identity = new TextEncoder().encode(JSON.stringify([file.name, file.size, file.lastModified]));
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', identity));
  const name = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('') + '.webp';
  return loadGalleryThumbnail({
    active,
    original: async () => file,
    read: async () => {
      const dir = await imagesDir.getDirectoryHandle('.tt-previews');
      const handle = await dir.getFileHandle(name);
      return handle.getFile();
    },
    write: async preview => {
      const dir = await imagesDir.getDirectoryHandle('.tt-previews', { create: true });
      const handle = await dir.getFileHandle(name, { create: true });
      const writer = await handle.createWritable();
      await writer.write(preview);
      await writer.close();
    },
  });
}
