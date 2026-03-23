/**
 * Lọc danh sách truyện theo ô tìm + thể loại đã chọn.
 */
export function filterNovelsForLibrary(novelsMetadata, searchQuery, selectedGenres, safeString) {
  const q = searchQuery.toLowerCase();
  return novelsMetadata.filter((n) => {
    const t = safeString(n.title).toLowerCase();
    const au = safeString(n.author).toLowerCase();
    const matchSearch = !q || t.includes(q) || au.includes(q);

    let nGenres = [];
    if (Array.isArray(n.genres)) nGenres = n.genres;
    else if (typeof n.genres === 'string') nGenres = [n.genres];
    else if (n.genre) nGenres = [n.genre];

    const matchGenre = selectedGenres.length === 0 || selectedGenres.some((sg) => nGenres.includes(sg));
    return matchSearch && matchGenre;
  });
}
