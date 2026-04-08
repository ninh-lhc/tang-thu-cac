/**
 * Lọc bucket `novel.data[lonId][nhoId]` theo tabsConfig hiện có.
 * Tránh wiki / chỉ mục nhắc thẻ "mồ côi" khi tab đã gỡ khỏi cấu hình nhưng data cũ còn sót.
 *
 * Ai dùng: buildEntityLinkMap, computeRelatedEntities. Test: entityWikiLookup.test.js
 */

/** @param {Array<{ id?: string, subTabs?: Array<{ id?: string }> }>} tabsConfig */
export function buildConfiguredSubTabIdsByLon(tabsConfig) {
  const out = new Map();
  for (const lon of tabsConfig || []) {
    if (!lon?.id) continue;
    const subIds = new Set();
    for (const nho of lon.subTabs || []) {
      if (nho?.id) subIds.add(nho.id);
    }
    out.set(lon.id, subIds);
  }
  return out;
}

/**
 * @param {Map<string, Set<string>>|null|undefined} configuredSubTabsByLon
 * @param {string} lonId
 * @param {string} nhoId
 */
export function isConfiguredNovelDataPath(configuredSubTabsByLon, lonId, nhoId) {
  if (!configuredSubTabsByLon || configuredSubTabsByLon.size === 0) return true;
  const set = configuredSubTabsByLon.get(lonId);
  if (!set) return false;
  return set.has(nhoId);
}
