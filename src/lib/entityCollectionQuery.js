// Mục đích: Lọc + sắp xếp danh sách thực thể sưu tập (tìm kiếm + lọc trường cùng lúc).
// Import bởi: App.jsx
// Lưu ý: Dùng trong useMemo; không chứa React.

import { getEntityFieldValue, safeString } from './entityFieldValue.js';

function normalizeAscii(value) {
  return safeString(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isListCardEntity(entity) {
  return normalizeAscii(entity?.name).startsWith('danh sach');
}

function comparePinnedListThenNameAsc(a, b) {
  const aPinned = isListCardEntity(a);
  const bPinned = isListCardEntity(b);
  if (aPinned !== bPinned) return aPinned ? -1 : 1;
  return safeString(a?.name).localeCompare(safeString(b?.name), 'vi');
}

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
  void entitySortMode;
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
  list.sort(comparePinnedListThenNameAsc);
  return list;
}
