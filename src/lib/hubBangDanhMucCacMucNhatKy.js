/**
 * Dựng chuỗi "extended catalog" cho AI nhật ký đọc (Hub → tab Cập nhật):
 * mỗi dòng = mục collection + danh sách tên thẻ + mô tả trường (id:nhãn).
 *
 * Thuần. Phụ thuộc: resolveFieldsTemplate từ MasterEngines (truyền vào để tránh vòng import lạ).
 */
export function buildHubExtendedCatalogLines(activeNovelData, safeString, resolveFieldsTemplate) {
  const lines = [];
  (activeNovelData.tabsConfig || []).forEach((lon) => {
    if (lon.id === 'tong-quan') return;
    (lon.subTabs || []).forEach((sub) => {
      if (sub.viewType !== 'collection-track') return;
      const ents = activeNovelData.data?.[lon.id]?.[sub.id]?.entities || [];
      const names = ents.map((e) => safeString(e.name)).filter(Boolean).slice(0, 80);
      const resolved = resolveFieldsTemplate(sub, lon.id, lon?.label || '');
      const fields = resolved.map((f) => `${safeString(f.id)}:${safeString(f.label)}`).join('; ');
      lines.push(
        `${lon.id}|${sub.id} | ${safeString(lon.label)} › ${safeString(sub.label)} | Thẻ: ${names.join(', ') || '—'} | Trường (id:nhãn): ${fields || '—'}`
      );
    });
  });
  return lines;
}
