/**
 * Lọc danh sách truyện theo ô tìm + thể loại đã chọn.
 * @param {string} searchField - 'all' | 'title' | 'author' | 'tag'
 */
export function filterNovelsForLibrary(novelsMetadata, searchQuery, selectedGenres, safeString, searchField = 'all') {
  const q = searchQuery.toLowerCase();
  return novelsMetadata.filter((n) => {
    let matchSearch = true;
    if (q) {
      const t = safeString(n.title).toLowerCase();
      const au = safeString(n.author).toLowerCase();
      const tags = (n.tags || []).map((tag) => safeString(tag).toLowerCase());
      if (searchField === 'title') {
        matchSearch = t.includes(q);
      } else if (searchField === 'author') {
        matchSearch = au.includes(q);
      } else if (searchField === 'tag') {
        matchSearch = tags.some((tag) => tag.includes(q));
      } else {
        matchSearch = t.includes(q) || au.includes(q) || tags.some((tag) => tag.includes(q));
      }
    }

    let nGenres = [];
    if (Array.isArray(n.genres)) nGenres = n.genres;
    else if (typeof n.genres === 'string') nGenres = [n.genres];
    else if (n.genre) nGenres = [n.genre];

    const matchGenre = selectedGenres.length === 0 || selectedGenres.some((sg) => nGenres.includes(sg));
    return matchSearch && matchGenre;
  });
}
