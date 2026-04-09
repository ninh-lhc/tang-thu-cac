import { describe, expect, it } from 'vitest';
import { buildLibrarySearchIndex, filterNovelsForLibrary } from './filterNovelsForLibrary.js';

const novels = [
  {
    id: 'n1',
    title: '\u0110\u1EBF V\u01B0\u01A1ng K\u00FD',
    author: 'Linh S\u01A1n',
    tags: ['Ki\u1EBFm \u0110\u1EA1o'],
    genres: ['Tien Hiep'],
  },
  {
    id: 'n2',
    title: 'Tinh Khong',
    author: 'Tac Gia',
    tags: ['Phieu Luu'],
    genres: ['Khoa Huyen'],
  },
];

describe('filterNovelsForLibrary', () => {
  it('matches Vietnamese text with or without accents across fields', () => {
    const index = buildLibrarySearchIndex(novels);

    expect(
      filterNovelsForLibrary(novels, 'de vuong', [], 'title', index).map((item) => item.id)
    ).toEqual(['n1']);
    expect(
      filterNovelsForLibrary(novels, 'linh son', [], 'author', index).map((item) => item.id)
    ).toEqual(['n1']);
    expect(
      filterNovelsForLibrary(novels, 'kiem dao', [], 'tag', index).map((item) => item.id)
    ).toEqual(['n1']);
  });
});
