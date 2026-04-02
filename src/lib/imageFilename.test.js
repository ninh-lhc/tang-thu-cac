import { describe, expect, it } from 'vitest';
import {
  buildScopedImageFileName,
  buildScopedImageStem,
  getScopedImageSequence,
  sanitizeImageFilePart,
} from './imageFilename.js';

describe('imageFilename', () => {
  it('builds entity-scoped numbered filenames', () => {
    const existing = [
      'Đạo lữ - Yên Nhược Tuyết -01.jpg',
      'Đạo lữ - Yên Nhược Tuyết -02.png',
      'Đạo lữ - Yên Nhược Tuyết -10.webp',
      'Đạo lữ - Khác -01.jpg',
    ];

    const fileName = buildScopedImageFileName({
      stemParts: ['Đạo lữ', 'Yên Nhược Tuyết'],
      originalFileName: 'my-image.PNG',
      existingFileNames: existing,
    });

    expect(fileName).toBe('Đạo lữ - Yên Nhược Tuyết -11.png');
  });

  it('sanitizes invalid filename characters without stripping Vietnamese text', () => {
    expect(sanitizeImageFilePart(' Đạo/lữ: Tuyết? ')).toBe('Đạo lữ Tuyết');
    expect(buildScopedImageStem(['Đạo lữ', 'Yên Nhược Tuyết'])).toBe('Đạo lữ - Yên Nhược Tuyết');
  });

  it('ignores files that do not match the current stem', () => {
    expect(getScopedImageSequence('Đạo lữ - Yên Nhược Tuyết -07.jpg', 'Đạo lữ - Yên Nhược Tuyết')).toBe(7);
    expect(getScopedImageSequence('Đạo lữ - Khác -03.jpg', 'Đạo lữ - Yên Nhược Tuyết')).toBeNull();
  });
});
