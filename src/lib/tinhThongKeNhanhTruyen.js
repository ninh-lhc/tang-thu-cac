/**
 * Thống kê nhanh trong tab Tổng quan: tổng thẻ / mốc, theo mục, top chương có nhiều mốc.
 *
 * Thuần (không React). Dùng: App.jsx (modal thống kê / biểu đồ).
 */
export function computeNovelQuickStats(activeNovelData, safeString) {
  if (!activeNovelData?.tabsConfig) return null;
  let totalEnt = 0;
  let totalMs = 0;
  const byTab = [];
  const chMap = {};
  (activeNovelData.tabsConfig || []).forEach((lon) => {
    if (lon.id === 'tong-quan') return;
    (lon.subTabs || []).forEach((nho) => {
      if (nho.viewType !== 'collection-track') return;
      const ents = activeNovelData.data?.[lon.id]?.[nho.id]?.entities || [];
      totalEnt += ents.length;
      let msHere = 0;
      ents.forEach((ent) => {
        (ent.milestones || []).forEach((m) => {
          msHere++;
          totalMs++;
          const c = parseInt(m.chapter, 10);
          if (!isNaN(c) && c >= 0) chMap[c] = (chMap[c] || 0) + 1;
        });
      });
      if (ents.length > 0 || msHere > 0) {
        byTab.push({
          key: `${lon.id}|${nho.id}`,
          label: `${safeString(lon.label)} › ${safeString(nho.label)}`,
          entities: ents.length,
          milestones: msHere,
        });
      }
    });
  });
  const topChapters = Object.entries(chMap)
    .map(([ch, n]) => ({ ch: parseInt(ch, 10), n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 14);
  const maxBar = topChapters[0]?.n || 1;
  return { totalEnt, totalMs, byTab, topChapters, maxBar };
}
