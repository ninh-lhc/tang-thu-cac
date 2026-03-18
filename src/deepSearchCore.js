/** Logic tìm kiếm thư viện — dùng chung cho Worker và fallback main thread */

export function searchNovelData(novel, q, res) {
  if (!novel?.data) return;
  Object.keys(novel.data).forEach((lonId) => {
    const lonData = novel.data[lonId];
    if (typeof lonData !== 'object' || !lonData) return;
    Object.keys(lonData).forEach((nhoId) => {
      const nhoData = lonData[nhoId];
      if (typeof nhoData === 'string' && nhoData.toLowerCase().includes(q)) {
        res.push({
          novelId: novel.id,
          tabLonId: lonId,
          tabNhoId: nhoId,
          novelTitle: novel.title,
          location: 'Nội dung',
          snippet: nhoData,
        });
      } else if (nhoData && typeof nhoData === 'object') {
        if (nhoData.overview?.toLowerCase().includes(q))
          res.push({
            novelId: novel.id,
            tabLonId: lonId,
            tabNhoId: nhoId,
            novelTitle: novel.title,
            location: 'Tổng quan mục',
            snippet: nhoData.overview,
          });
        if (nhoData.entities) {
          nhoData.entities.forEach((ent) => {
            const hit =
              ent.name?.toLowerCase().includes(q) ||
              ent.info?.toLowerCase().includes(q) ||
              (ent.dynamicData &&
                Object.values(ent.dynamicData).some(
                  (v) => typeof v === 'string' && v.toLowerCase().includes(q)
                ));
            if (hit)
              res.push({
                novelId: novel.id,
                tabLonId: lonId,
                tabNhoId: nhoId,
                entityId: ent.id,
                novelTitle: novel.title,
                location: `Hồ sơ: ${ent.name}`,
                snippet: ent.info || ent.name,
              });
            ent.milestones?.forEach((ms) => {
              if (ms.event?.toLowerCase().includes(q))
                res.push({
                  novelId: novel.id,
                  tabLonId: lonId,
                  tabNhoId: nhoId,
                  entityId: ent.id,
                  novelTitle: novel.title,
                  location: `Sự kiện Ch.${ms.chapter} — ${ent.name}`,
                  snippet: ms.event,
                });
            });
          });
        }
        Object.keys(nhoData).forEach((key) => {
          if (
            key !== 'overview' &&
            key !== 'entities' &&
            typeof nhoData[key] === 'string' &&
            nhoData[key].toLowerCase().includes(q)
          )
            res.push({
              novelId: novel.id,
              tabLonId: lonId,
              tabNhoId: nhoId,
              tabConId: key,
              novelTitle: novel.title,
              location: 'Chi tiết mục',
              snippet: nhoData[key],
            });
        });
      }
    });
  });
}

export function runDeepSearch({ novelsMetadata, allNovelsCache, activeNovelData, query }) {
  const q = String(query || '')
    .trim()
    .toLowerCase();
  if (!q) return [];
  const res = [];
  (novelsMetadata || []).forEach((novel) => {
    if (
      novel.title?.toLowerCase().includes(q) ||
      novel.author?.toLowerCase().includes(q) ||
      novel.review?.toLowerCase().includes(q) ||
      novel.tags?.some((t) => t.toLowerCase().includes(q))
    )
      res.push({
        novelId: novel.id,
        novelTitle: novel.title,
        location: 'Thông tin truyện',
        snippet: novel.review || novel.title,
      });
  });
  const searchedIds = new Set();
  Object.values(allNovelsCache || {}).forEach((nd) => {
    searchedIds.add(nd.id);
    searchNovelData(nd, q, res);
  });
  if (activeNovelData && !searchedIds.has(activeNovelData.id))
    searchNovelData(activeNovelData, q, res);
  return dedupeDeepSearchResults(res);
}

export function countEntitiesInNovel(novelData) {
  let entities = 0;
  let milestones = 0;
  if (!novelData?.data) return { entities: 0, milestones: 0 };
  Object.values(novelData.data).forEach((lonData) => {
    if (typeof lonData !== 'object' || !lonData) return;
    Object.values(lonData).forEach((nhoData) => {
      if (!nhoData?.entities) return;
      entities += nhoData.entities.length;
      nhoData.entities.forEach((e) => {
        milestones += e.milestones?.length || 0;
      });
    });
  });
  return { entities, milestones };
}

export function dedupeDeepSearchResults(res) {
  const seen = new Set();
  return res
    .filter((r) => {
      const key = `${r.novelId}__${r.location}__${(r.snippet || '').substring(0, 30)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 80);
}

/** Kết quả trùng metadata (tiêu đề/tác giả/...) trước khi đọc từng file */
export function metadataSearchHits(novelsMetadata, q) {
  const ql = String(q || '')
    .trim()
    .toLowerCase();
  if (!ql) return [];
  const res = [];
  (novelsMetadata || []).forEach((novel) => {
    if (
      novel.title?.toLowerCase().includes(ql) ||
      novel.author?.toLowerCase().includes(ql) ||
      novel.review?.toLowerCase().includes(ql) ||
      novel.tags?.some((t) => t.toLowerCase().includes(ql))
    ) {
      res.push({
        novelId: novel.id,
        novelTitle: novel.title,
        location: 'Thông tin truyện',
        snippet: novel.review || novel.title,
      });
    }
  });
  return res;
}
