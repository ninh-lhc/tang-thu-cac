/**
 * Nối tab con Bản đồ ↔ gợi ý nhanh Thế lực (modal Khởi tạo thực thể).
 * Chỉ lon nhánh «Bản đồ» (id/label), không gom tab `dia-danh` / map-scope ở tab lớn khác.
 * «Cấp bậc»: mapEntrySuggestions.forceRanks trên từng tab con Bản đồ — chỉnh trong Quản lý tab / JSON tab config.
 */
import { normalizeAsciiText } from './statusHierarchyParser.js';
import { isMapCollectionScope } from './mapHierarchySync.js';

function safeString(v) {
  if (v == null || v === 'null' || v === 'undefined') return '';
  return String(v);
}

/** Tab lớn Bản đồ — tránh nhầm với tab con map-like (vd. id dia-danh) dưới Thế lực / Chủng tộc. */
export function isBanDoLonBranch(lon) {
  if (!lon) return false;
  const label = normalizeAsciiText(lon.label || '');
  const id = normalizeAsciiText(lon.id || '');
  if (label.includes('ban do')) return true;
  if (id.includes('ban-do') || id.includes('ban do')) return true;
  return false;
}

/** Các tab con collection thuộc lon Bản đồ (nhãn = thẻ nhỏ trên UI chọn mục). */
export function collectMapSubTabsForForceUi(activeNovelData) {
  const out = [];
  for (const lon of activeNovelData?.tabsConfig || []) {
    if (!isBanDoLonBranch(lon)) continue;
    for (const nho of lon?.subTabs || []) {
      if (nho.viewType !== 'collection-track') continue;
      if (
        !isMapCollectionScope({
          activeTabLon: lon.id,
          activeTabNho: nho.id,
          currentTabConfig: nho,
          parentLabel: lon.label || '',
        })
      ) {
        continue;
      }
      const label = safeString(nho.label || nho.id).trim();
      if (!label) continue;
      out.push({ lonId: lon.id, nhoId: nho.id, label });
    }
  }
  return out;
}

/**
 * Khớp ô «Hệ cấp bậc» với một tab Bản đồ (chuỗi gõ / datalist).
 */
export function matchMapSubTabByRealmInput(realmInput, mapSubTabs) {
  const raw = safeString(realmInput).trim();
  if (!raw || !Array.isArray(mapSubTabs) || mapSubTabs.length === 0) return null;
  const key = normalizeAsciiText(raw);
  const exact = mapSubTabs.find((t) => normalizeAsciiText(t.label) === key);
  if (exact) return exact;
  return (
    mapSubTabs.find((t) => {
      const tl = normalizeAsciiText(t.label);
      return tl.includes(key) || key.includes(tl);
    }) || null
  );
}

/** Tên thẻ (trừ thẻ Danh sách) trong một tab Bản đồ — dùng cho gợi ý Địa chỉ. */
export function listMapTabEntityNames(activeNovelData, lonId, nhoId) {
  const ents = activeNovelData?.data?.[lonId]?.[nhoId]?.entities || [];
  return ents
    .filter((e) => e && !normalizeAsciiText(safeString(e.name)).startsWith('danh sach'))
    .map((e) => safeString(e.name).trim())
    .filter(Boolean);
}

/** List cấp bậc Thế lực tùy chỉnh theo tab con Bản đồ (`mapEntrySuggestions.forceRanks`). */
export function getMapSubTabForceRankSuggestions(activeNovelData, lonId, nhoId) {
  const lon = activeNovelData?.tabsConfig?.find((t) => t.id === lonId);
  const nho = lon?.subTabs?.find((s) => s.id === nhoId);
  const arr = nho?.mapEntrySuggestions?.forceRanks;
  if (!Array.isArray(arr)) return [];
  return arr.map((s) => safeString(s).trim()).filter(Boolean);
}
