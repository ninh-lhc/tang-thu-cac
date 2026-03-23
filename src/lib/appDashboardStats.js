/**
 * Thống kê dashboard từ metadata + novelStats (không preload novel).
 * Dùng: App.jsx.
 */
export function computeDashboardStats(novelsMetadata, novelStatsById) {
  const total = novelsMetadata.length;
  const byStatus = { 'Đang đọc': 0, 'Hoàn thành': 0, 'Tạm ngưng': 0 };
  const byGenre = {};
  let totalChaptersRead = 0;
  let totalChaptersAll = 0;
  novelsMetadata.forEach((n) => {
    const s = n.status || 'Đang đọc';
    byStatus[s] = (byStatus[s] || 0) + 1;
    const genres = Array.isArray(n.genres) ? n.genres : n.genre ? [n.genre] : [];
    genres.forEach((g) => {
      byGenre[g] = (byGenre[g] || 0) + 1;
    });
    totalChaptersRead += parseInt(n.chaptersRead || 0);
    if (n.chaptersTotal && n.chaptersTotal !== '???') totalChaptersAll += parseInt(n.chaptersTotal || 0);
  });
  let totalEntities = 0;
  let totalMilestones = 0;
  novelsMetadata.forEach((n) => {
    const st = novelStatsById[n.id];
    if (st) {
      totalEntities += st.entities || 0;
      totalMilestones += st.milestones || 0;
    }
  });
  const topGenre = Object.entries(byGenre).sort((a, b) => b[1] - a[1])[0];
  const recentNovels = [...novelsMetadata].slice(0, 24);
  return {
    total,
    byStatus,
    byGenre,
    totalChaptersRead,
    totalChaptersAll,
    totalEntities,
    totalMilestones,
    recentNovels,
    topGenre,
  };
}
