/**
 * Chuỗi catalog thẻ cho AI nối tra cứu (mỗi dòng: lon|nho | nhãn | tên thẻ...).
 *
 * Thuần. Dùng: App.jsx → analyzeCrossRefNoteWithAI.
 */
export function buildXrefEntityCatalogText(activeNovelData, safeString) {
  if (!activeNovelData?.tabsConfig) return '';
  const lines = [];
  (activeNovelData.tabsConfig || []).forEach((lon) => {
    if (lon.id === 'tong-quan') return;
    (lon.subTabs || []).forEach((sub) => {
      if (sub.viewType !== 'collection-track') return;
      const ents = activeNovelData.data?.[lon.id]?.[sub.id]?.entities || [];
      const names = ents.map((e) => safeString(e.name)).filter(Boolean).slice(0, 100);
      lines.push(
        `${lon.id}|${sub.id} | ${safeString(lon.label)} › ${safeString(sub.label)} | ${names.join(', ') || '(chưa có thẻ)'}`
      );
    });
  });
  return lines.join('\n');
}
