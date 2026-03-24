// Mục đích: Lọc + sắp xếp danh sách thực thể sưu tập (tìm kiếm + lọc trường cùng lúc).
// Import bởi: App.jsx
// Lưu ý: Dùng trong useMemo; không chứa React.

import { getEntityFieldValue, safeString } from './entityFieldValue.js';

export function buildEntitySearchIndexMap(collectionEntitiesRaw) {
  const map = new Map();
  collectionEntitiesRaw.forEach((e) => {
    const dynamicPart = e.dynamicData
      ? Object.values(e.dynamicData).map((v) => safeString(v)).filter(Boolean).join(' ')
      : '';
    map.set(
      e.id,
      `${safeString(e.name)} ${safeString(e.title)} ${safeString(e.info)} ${dynamicPart}`.toLowerCase()
    );
  });
  return map;
}

/**
 * @param {object} opts
 * @param {string} opts.entityFilterField - 'none' | field id
 * @param {string} opts.entityFilterValue
 * @param {string} opts.entitySearchQuery - deferred search
 * @param {Map} opts.entitySearchIndexById
 * @param {string} opts.entitySortMode - 'newest' | 'name_asc' | 'milestones'
 */
export function applyEntityCollectionFilters(listIn, opts) {
  const {
    entityFilterField,
    entityFilterValue,
    entitySearchQuery,
    entitySearchIndexById,
    entitySortMode,
  } = opts;
  let list = [...listIn];
  if (entityFilterField !== 'none' && entityFilterValue.trim()) {
    const q = entityFilterValue.toLowerCase();
    list = list.filter((e) =>
      getEntityFieldValue(e, entityFilterField).toLowerCase().includes(q)
    );
  }
  if (entitySearchQuery.trim()) {
    const q = entitySearchQuery.toLowerCase();
    list = list.filter((e) => {
      const haystack = entitySearchIndexById.get(e.id) || '';
      return haystack.includes(q);
    });
  }
  if (entitySortMode === 'name_asc') list.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  else if (entitySortMode === 'milestones') {
    list.sort((a, b) => (b.milestones?.length || 0) - (a.milestones?.length || 0));
  } else if (entitySortMode === 'newest') list.reverse();
  return list;
}
