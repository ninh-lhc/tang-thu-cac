/**
 * Lọc danh sách truyện theo ô tìm + thể loại đã chọn.
 * @param {string} searchField - 'all' | 'title' | 'author' | 'tag'
 */
import { safeString } from './entityFieldValue.js';
import { normalizeSearchText } from './normalizeSearchText.js';

function extractNovelGenres(novel) {
  if (Array.isArray(novel?.genres)) return novel.genres;
  if (typeof novel?.genres === 'string') return [novel.genres];
  if (novel?.genre) return [novel.genre];
  return [];
}

/** Thứ tự hiển thị sidebar thư viện: A→Z theo tiêu đề (tiếng Việt). */
export function compareLibraryNovelTitles(a, b) {
  const byTitle = safeString(a?.title).localeCompare(safeString(b?.title), 'vi', {
    sensitivity: 'base',
    numeric: true,
  });
  if (byTitle !== 0) return byTitle;
  return safeString(a?.id).localeCompare(safeString(b?.id), 'vi');
}

export function buildLibrarySearchIndex(novelsMetadata) {
  return (novelsMetadata || []).map((novel) => {
    const titleText = normalizeSearchText(novel?.title);
    const authorText = normalizeSearchText(novel?.author);
    const tagText = normalizeSearchText((novel?.tags || []).map((tag) => safeString(tag)).join(' '));

    return {
      id: novel.id,
      text: normalizeSearchText(`${titleText} ${authorText} ${tagText}`),
      titleText,
      authorText,
      tagText,
      genres: extractNovelGenres(novel),
    };
  });
}

export function filterNovelsForLibrary(
  novelsMetadata,
  searchQuery,
  selectedGenres,
  searchField = 'all',
  librarySearchIndex = null
) {
  const q = normalizeSearchText(searchQuery);
  const byId = new Map((novelsMetadata || []).map((novel) => [novel.id, novel]));
  const rows = Array.isArray(librarySearchIndex) ? librarySearchIndex : buildLibrarySearchIndex(novelsMetadata);

  return rows
    .filter((row) => {
      let matchSearch = true;
      if (q) {
        if (searchField === 'title') matchSearch = row.titleText.includes(q);
        else if (searchField === 'author') matchSearch = row.authorText.includes(q);
        else if (searchField === 'tag') matchSearch = row.tagText.includes(q);
        else matchSearch = row.text.includes(q);
      }

      const matchGenre =
        (selectedGenres || []).length === 0 ||
        selectedGenres.some((selectedGenre) => row.genres.includes(selectedGenre));

      return matchSearch && matchGenre;
    })
    .map((row) => byId.get(row.id))
    .filter(Boolean)
    .sort(compareLibraryNovelTitles);
}
