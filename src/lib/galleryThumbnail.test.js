/**
 * Gallery preview cache, scaling, fallback and unmount regressions.
 * The browser smoke test separately exercises PNG decoding with real files.
 */
import { afterEach, expect, it, vi } from 'vitest';
import { loadGalleryThumbnail } from './galleryThumbnail.js';

afterEach(() => vi.unstubAllGlobals());

it('reuses a persisted preview without reading the original', async () => {
  const cached = new Blob(['preview']);
  const original = vi.fn();
  expect(await loadGalleryThumbnail({ read: async () => cached, original })).toBe(cached);
  expect(original).not.toHaveBeenCalled();
});

it('scales a portrait to 341 × 512 and releases its decoded bitmap even if caching fails', async () => {
  const bitmap = { width: 1024, height: 1536, close: vi.fn() };
  const preview = new Blob(['preview']);
  const canvas = { getContext: () => ({ drawImage: vi.fn() }), toBlob: done => done(preview) };
  vi.stubGlobal('createImageBitmap', async () => bitmap);
  vi.stubGlobal('document', { createElement: () => canvas });
  const write = vi.fn().mockRejectedValue(new Error('quota'));
  expect(await loadGalleryThumbnail({
    read: async () => null, original: async () => new Blob(), active: () => true, write,
  })).toBe(preview);
  expect([canvas.width, canvas.height]).toEqual([341, 512]);
  expect(write).toHaveBeenCalledWith(preview);
  expect(bitmap.close).toHaveBeenCalledOnce();
});

it('skips queued work after leaving the album', async () => {
  const original = vi.fn();
  expect(await loadGalleryThumbnail({ read: async () => null, original, active: () => false })).toBeNull();
  expect(original).not.toHaveBeenCalled();
});
