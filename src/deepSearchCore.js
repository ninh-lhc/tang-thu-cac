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

/** Dựng chỉ mục tìm kiếm cho một truyện (dùng lại giữa nhiều query). */
export function buildNovelSearchIndex(novel) {
  const rows = [];
  if (!novel?.data) return rows;
  Object.keys(novel.data).forEach((lonId) => {
    const lonData = novel.data[lonId];
    if (typeof lonData !== 'object' || !lonData) return;
    Object.keys(lonData).forEach((nhoId) => {
      const nhoData = lonData[nhoId];
      if (typeof nhoData === 'string') {
        rows.push({
          haystack: nhoData.toLowerCase(),
          result: {
            novelId: novel.id,
            tabLonId: lonId,
            tabNhoId: nhoId,
            novelTitle: novel.title,
            location: 'Nội dung',
            snippet: nhoData,
          },
        });
        return;
      }
      if (!nhoData || typeof nhoData !== 'object') return;
      if (typeof nhoData.overview === 'string') {
        rows.push({
          haystack: nhoData.overview.toLowerCase(),
          result: {
            novelId: novel.id,
            tabLonId: lonId,
            tabNhoId: nhoId,
            novelTitle: novel.title,
            location: 'Tổng quan mục',
            snippet: nhoData.overview,
          },
        });
      }
      (nhoData.entities || []).forEach((ent) => {
        const chunks = [ent.name, ent.info];
        if (ent.dynamicData && typeof ent.dynamicData === 'object') {
          Object.values(ent.dynamicData).forEach((v) => {
            if (typeof v === 'string') chunks.push(v);
          });
        }
        const entityText = chunks.filter((x) => typeof x === 'string').join('\n').toLowerCase();
        rows.push({
          haystack: entityText,
          result: {
            novelId: novel.id,
            tabLonId: lonId,
            tabNhoId: nhoId,
            entityId: ent.id,
            novelTitle: novel.title,
            location: `Hồ sơ: ${ent.name}`,
            snippet: ent.info || ent.name,
          },
        });
        (ent.milestones || []).forEach((ms) => {
          if (typeof ms?.event !== 'string') return;
          rows.push({
            haystack: ms.event.toLowerCase(),
            result: {
              novelId: novel.id,
              tabLonId: lonId,
              tabNhoId: nhoId,
              entityId: ent.id,
              novelTitle: novel.title,
              location: `Sự kiện Ch.${ms.chapter} — ${ent.name}`,
              snippet: ms.event,
            },
          });
        });
      });
      Object.keys(nhoData).forEach((key) => {
        const v = nhoData[key];
        if (key === 'overview' || key === 'entities' || typeof v !== 'string') return;
        rows.push({
          haystack: v.toLowerCase(),
          result: {
            novelId: novel.id,
            tabLonId: lonId,
            tabNhoId: nhoId,
            tabConId: key,
            novelTitle: novel.title,
            location: 'Chi tiết mục',
            snippet: v,
          },
        });
      });
    });
  });
  return rows;
}

/** Tìm trong chỉ mục đã dựng sẵn của một truyện. */
export function searchNovelIndex(rows, q, res) {
  if (!Array.isArray(rows) || !q) return;
  for (const row of rows) {
    if (row?.haystack?.includes(q)) {
      res.push(row.result);
    }
  }
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

function safeStr(v) {
  return (v != null && String(v).trim()) || '';
}

/** Chỉ đếm từ các mục collection-track trong tabsConfig — tránh trùng khi data có cả 'default' và nho.id. Trả về byTab để hiển thị thống kê theo mục. */
export function countEntitiesInNovel(novelData) {
  let entities = 0;
  let milestones = 0;
  const byTab = [];
  if (!novelData?.data) return { entities: 0, milestones: 0, byTab: [] };
  const tabsConfig = novelData.tabsConfig || [];
  tabsConfig.forEach((lon) => {
    if (lon.id === 'tong-quan') return;
    (lon.subTabs || []).forEach((nho) => {
      if (nho.viewType !== 'collection-track') return;
      const tabData = novelData.data?.[lon.id]?.[nho.id];
      const ents = tabData?.entities || [];
      let msHere = 0;
      ents.forEach((e) => {
        msHere += (e.milestones?.length || 0);
      });
      entities += ents.length;
      milestones += msHere;
      if (ents.length > 0 || msHere > 0) {
        byTab.push({
          key: `${lon.id}|${nho.id}`,
          label: `${safeStr(lon.label)} › ${safeStr(nho.label)}`,
          entities: ents.length,
          milestones: msHere,
        });
      }
    });
  });
  return { entities, milestones, byTab };
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
