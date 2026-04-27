/**
 * Gom gợi ý cho form Bản đồ (modal thẻ): tên thẻ + tầng trực thuộc từ `f_vi_tri` cũ.
 * Dùng trong `MasterComponents` — chỉ tên thẻ **khớp bản thân** (card) mới lọt danh sách; token
 * trong chuỗi vị trí cũ không tương ứng thẻ nào thì bỏ (tránh lệch với lưới tab).
 * Khi truyền `mapNhoScopeId`, chỉ tính thẻ trong **tab bản đồ nhỏ** đang mở.
 */
import { safeString } from '../MasterUtils.jsx';
import { suggestionRowsToValues } from './suggestionRowFormat.js';
import { isMapCollectionScope } from './mapHierarchySync.js';
import { inferForceSystemLabel } from './forceRankLadder.js';
import { resolveMapFieldPresetFlavor } from './mapEntityFieldPresets.js';
import { normalizeAsciiText, splitStatusHierarchyTokens } from './statusHierarchyParser.js';

function dedupeCaseInsensitive(values) {
  const out = [];
  const seen = new Set();
  (values || []).forEach((value) => {
    const raw = safeString(value).trim();
    const key = normalizeAsciiText(raw);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(raw);
  });
  return out;
}

function normalizeNovelGenresForMapPresets(novel) {
  if (!novel || typeof novel !== 'object') return [];
  if (Array.isArray(novel.genres)) return novel.genres.filter(Boolean);
  if (typeof novel.genre === 'string' && novel.genre.trim()) return [novel.genre.trim()];
  return [];
}

function makeEntityNameKeySet(nameList) {
  const s = new Set();
  (nameList || []).forEach((n) => {
    const k = normalizeAsciiText(safeString(n).trim());
    if (k) s.add(k);
  });
  return s;
}

function filterTiersToKnownEntityNames(tierLists, nameKeySet) {
  return tierLists.map((list) =>
    (list || []).filter((t) => {
      const k = normalizeAsciiText(safeString(t).trim());
      return k && nameKeySet.has(k);
    })
  );
}

/**
 * Lọc theo «Quy mô địa vực» (`f_he_gioi_ban_do`, rồi `f_title`, rồi suy từ tên thẻ).
 * Ô Tinh cầu cha: ưu tiên hành tinh / giới; ô Đại lục: ưu tiên lục–châu–khu, không lẫn thành trì.
 */
function normalizeMapQuyMoKey(value) {
  return normalizeAsciiText(safeString(value).trim());
}

function isMapTypeCityOrTownScale(mapType) {
  const k = normalizeMapQuyMoKey(mapType);
  if (!k) return false;
  return /(thanh|tran|do thanh|thanh tri|khu dan cu|lang|dao|phuong|quan|huyen|khu pho|toa nha|trung tam|landmark|pho(?!\s*mat))/.test(
    k
  );
}

function isMapTypeContinentOrRegionScale(mapType) {
  const k = normalizeMapQuyMoKey(mapType);
  if (!k) return false;
  if (isMapTypeCityOrTownScale(mapType)) return false;
  return /(dai luc|dai duong|chau(?!.[\s\x2F])|khu vuc|vuc(?!.[\s\x2F])|de quoc|quoc gia|lien bang|bo lac|khu\sdac)/.test(
    k
  );
}

function isMapTypePlanetOrWorldScale(mapType) {
  const k = normalizeMapQuyMoKey(mapType);
  if (!k) return false;
  if (isMapTypeCityOrTownScale(mapType) || isMapTypeContinentOrRegionScale(mapType)) return false;
  return /(tinh cau|tien tinh|hanh tinh|tinh vuc|thien ha|mat trang|ve tinh|tieu the|the gioi|vi dien)/.test(
    k
  );
}

/**
 * Quy mô cấp thẻ: ưu tiên `f_he_gioi_ban_do` (ô «Quy mô địa vực» = Tinh cầu / Đại lục / Thành…), sau đó mới `f_title`.
 */
function getEntityRealmScaleForQuyFilter(dynamic) {
  const dyn = dynamic && typeof dynamic === 'object' ? dynamic : {};
  return safeString(
    dyn.f_he_gioi_ban_do || dyn.f_he_phan_cap || dyn.f_title || ''
  ).trim();
}

/**
 * Bổ sung khi thẻ chưa lưu f_he: suy từ tên (Đại lục / Tinh / Thành / Vực…), thứ tự ưu tiên tránh lẫn.
 */
function inferQuyMoFromMapEntityName(name) {
  const k = normalizeAsciiText(safeString(name).trim());
  if (!k) return '';
  if (/(dai luc|dai duong)/.test(k)) return 'Đại lục';
  if (/(tinh cau|tien tinh|hanh tinh|thien ha)/.test(k) || k.endsWith('tinh')) return 'Tinh cầu';
  if (/(^|\s|\b)(thanh|tran|khu pho|khu dan cu|lang|dao|phuong|quan|huyen)\b/.test(k)) return 'Thành Trì';
  if (/(khu vuc|vuc$|chau(?!.[\s\x2F])|de quoc|quoc gia|lien bang|bo lac)/.test(k)) return 'Khu vực';
  return '';
}

/**
 * Tầng 1 = cha Tinh cầu: bỏ lục/châu/thành.
 * Nếu chưa gán cả f_he lẫn f_title: không tự mở hết mọi tên từ f_vi_tri (tránh lẫn loại).
 * @param {'tier1'|'tier2'|'tier3'} slot
 */
function isTokenAllowedForTrucThuocPathSlot(mapType, slot) {
  const m = safeString(mapType).trim();
  if (!m) return false;
  if (slot === 'tier1') {
    if (isMapTypeCityOrTownScale(m)) return false;
    if (isMapTypeContinentOrRegionScale(m)) return false;
    return isMapTypePlanetOrWorldScale(m);
  }
  if (slot === 'tier2') {
    if (isMapTypeCityOrTownScale(m)) return false;
    if (isMapTypePlanetOrWorldScale(m)) return false;
    return isMapTypeContinentOrRegionScale(m);
  }
  if (slot === 'tier3') {
    if (isMapTypePlanetOrWorldScale(m)) return false;
    return isMapTypeCityOrTownScale(m) || isMapTypeContinentOrRegionScale(m);
  }
  return true;
}

/**
 * @param {object|null} activeNovelData
 * @param {object|null} mapTabConfig — tab bản đồ nhỏ (entityQuickEntry, mapEntrySuggestions)
 * @param {string} mapLonScopeId — id tab lớn; rỗng = không lọc theo lon
 * @param {string} [mapNhoScopeId] — id tab nhỏ; nếu có, chỉ gom tên thẻ cùng tab (khớp lưới «Danh sách»)
 */
export function collectMapEntityHints(
  activeNovelData,
  mapTabConfig = null,
  mapLonScopeId = '',
  mapNhoScopeId = ''
) {
  const mapNameList = [];
  const parentTier1List = [];
  const parentTier2List = [];
  const parentTier3List = [];
  const presetFlavor = resolveMapFieldPresetFlavor(normalizeNovelGenresForMapPresets(activeNovelData));
  const trucParent1Names = [];
  const trucParent2Names = [];
  const trucParent3Names = [];
  const mapTypeList = [];
  let forceSystemList = [];
  const recordsByName = new Map();
  for (const lon of activeNovelData?.tabsConfig || []) {
    if (mapLonScopeId && lon?.id !== mapLonScopeId) continue;
    for (const nho of lon?.subTabs || []) {
      if (mapNhoScopeId && nho?.id !== mapNhoScopeId) continue;
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
      const entities = activeNovelData?.data?.[lon.id]?.[nho.id]?.entities || [];
      entities.forEach((entity) => {
        const name = safeString(entity?.name).trim();
        if (!name) return;
        if (normalizeAsciiText(name).startsWith('danh sach')) return;
        mapNameList.push(name);
        const dyn = entity?.dynamicData || {};
        const gioiDien = safeString(dyn.f_title).trim();
        const quyMoHe = getEntityRealmScaleForQuyFilter(dyn);
        const quyKey = quyMoHe || gioiDien || inferQuyMoFromMapEntityName(name);
        const locationRaw = safeString(dyn.f_vi_tri).trim();
        const parentTokens = splitStatusHierarchyTokens(locationRaw);
        if (parentTokens.length > 0) parentTier1List.push(parentTokens[0]);
        if (parentTokens.length > 1) parentTier2List.push(parentTokens[1]);
        if (parentTokens.length > 2) parentTier3List.push(parentTokens[2]);
        if (isMapTypePlanetOrWorldScale(quyKey)) trucParent1Names.push(name);
        if (isMapTypeContinentOrRegionScale(quyKey)) trucParent2Names.push(name);
        if (isMapTypeCityOrTownScale(quyKey)) trucParent3Names.push(name);
        const key = normalizeAsciiText(name);
        const nextList = recordsByName.get(key) || [];
        nextList.push({
          name,
          tabLabel: safeString(nho.label || nho.id),
          statusLine: safeString(dyn.f_status || entity?.status).trim(),
          mapType: gioiDien,
          realmScale: quyMoHe,
          mapQuyForFilter: quyKey,
          systemLabel: inferForceSystemLabel(dyn.f_status || entity?.status),
        });
        recordsByName.set(key, nextList);
      });
    }
  }
  const nameKeySet = makeEntityNameKeySet(mapNameList);
  const [f1, f2, f3] = filterTiersToKnownEntityNames(
    [parentTier1List, parentTier2List, parentTier3List],
    nameKeySet
  );
  const filterPathTiersToQuyMo = (pathTierList, slot) =>
    (pathTierList || []).filter((token) => {
      const k = normalizeAsciiText(safeString(token).trim());
      if (!k || !nameKeySet.has(k)) return false;
      const rec = recordsByName.get(k)?.[0];
      const m = safeString(rec?.mapQuyForFilter || rec?.realmScale || rec?.mapType).trim();
      return isTokenAllowedForTrucThuocPathSlot(m, slot);
    });
  const p1 = filterPathTiersToQuyMo(f1, 'tier1');
  const p2 = filterPathTiersToQuyMo(f2, 'tier2');
  const p3 = filterPathTiersToQuyMo(f3, 'tier3');
  const extraMap = mapTabConfig?.mapEntrySuggestions;
  if (extraMap && typeof extraMap === 'object') {
    if (Array.isArray(extraMap.hierarchy)) {
      forceSystemList.push(...suggestionRowsToValues(extraMap.hierarchy));
    }
  }
  return {
    mapNames: dedupeCaseInsensitive(mapNameList),
    parentTier1Options: dedupeCaseInsensitive(p1),
    parentTier2Options: dedupeCaseInsensitive(p2),
    parentTier3Options: dedupeCaseInsensitive(p3),
    mapNamesTrucParent1: dedupeCaseInsensitive(trucParent1Names),
    mapNamesTrucParent2: dedupeCaseInsensitive(trucParent2Names),
    mapNamesTrucParent3: dedupeCaseInsensitive(trucParent3Names),
    mapTypes: dedupeCaseInsensitive(mapTypeList),
    forceSystems: dedupeCaseInsensitive(forceSystemList),
    presetFlavor,
    recordsByName,
  };
}

