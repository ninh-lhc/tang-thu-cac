/**
 * Danh sách tên → đích wiki (độ dài giảm dần để regex).
 * Dùng: liên kết nội bộ trong markdown.
 */
export function buildEntityLinkMap(activeNovelData) {
  if (!activeNovelData) return [];
  let map = [];
  const addNames = (nameStr, dest) => {
    if (!nameStr || typeof nameStr !== 'string') return;
    nameStr.split(/[,/|()]/).forEach((n) => {
      const cleanName = n.trim();
      if (cleanName.length >= 2 && cleanName.length <= 40) map.push({ name: cleanName, dest });
    });
  };
  Object.keys(activeNovelData.data || {}).forEach((lonId) => {
    Object.keys(activeNovelData.data[lonId] || {}).forEach((nhoId) => {
      const tabData = activeNovelData.data[lonId][nhoId];
      if (tabData && tabData.entities) {
        tabData.entities.forEach((ent) => {
          const dest = { lonId, nhoId, entityId: ent.id };
          addNames(ent.name, dest);
          if (ent.dynamicData) addNames(ent.dynamicData.f_alias, dest);
        });
      }
    });
  });

  const uniqueMap = [];
  const seen = new Set();
  map.forEach((item) => {
    const lower = item.name.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      uniqueMap.push(item);
    }
  });
  return uniqueMap.sort((a, b) => b.name.length - a.name.length);
}
