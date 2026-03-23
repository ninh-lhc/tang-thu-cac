/**
 * Chọn mục collection-track khi AI gợi ý lonId/nhoId (fallback: nhân vật, rồi tab đầu có collection).
 *
 * tabsConfig: thường là activeNovelData.tabsConfig || globalTabsConfig.
 */
export function resolveXrefTargetCollectionTab(tabLonId, tabNhoId, tabsConfig) {
  const cfg = tabsConfig || [];
  const lon = cfg.find((t) => t.id === tabLonId);
  const nho = lon?.subTabs?.find((s) => s.id === tabNhoId && s.viewType === 'collection-track');
  if (lon && nho) return { lonId: lon.id, nhoId: nho.id };
  const nv = cfg.find((t) => t.id === 'nhan-vat');
  const nvSub = nv?.subTabs?.find((s) => s.viewType === 'collection-track');
  if (nv && nvSub) return { lonId: nv.id, nhoId: nvSub.id };
  for (const L of cfg) {
    if (L.id === 'tong-quan') continue;
    const st = L.subTabs?.find((s) => s.viewType === 'collection-track');
    if (st) return { lonId: L.id, nhoId: st.id };
  }
  return null;
}
