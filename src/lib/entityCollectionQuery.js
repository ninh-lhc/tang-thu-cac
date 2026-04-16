// Mục đích: Lọc + sắp xếp danh sách thực thể sưu tập (tìm kiếm + lọc trường cùng lúc).
// Import bởi: App.jsx
// Lưu ý: Dùng trong useMemo; không chứa React.

import { getEntityFieldValue, safeString } from './entityFieldValue.js';
import { normalizeSearchText } from './normalizeSearchText.js';

function normalizeAscii(value) {
  return normalizeSearchText(value);
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

function comparePinnedListThenNameDesc(a, b) {
  const aPinned = isListCardEntity(a);
  const bPinned = isListCardEntity(b);
  if (aPinned !== bPinned) return aPinned ? -1 : 1;
  return safeString(b?.name).localeCompare(safeString(a?.name), 'vi');
}

function comparePinnedListThenNewest(a, b) {
  const aPinned = isListCardEntity(a);
  const bPinned = isListCardEntity(b);
  if (aPinned !== bPinned) return aPinned ? -1 : 1;
  return safeString(b?.id).localeCompare(safeString(a?.id), 'vi');
}

function comparePinnedListThenMilestones(a, b) {
  const aPinned = isListCardEntity(a);
  const bPinned = isListCardEntity(b);
  if (aPinned !== bPinned) return aPinned ? -1 : 1;
  const am = Array.isArray(a?.milestones) ? a.milestones.length : 0;
  const bm = Array.isArray(b?.milestones) ? b.milestones.length : 0;
  if (am !== bm) return bm - am;
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
      normalizeSearchText(`${safeString(e.name)} ${safeString(e.title)} ${safeString(e.info)} ${dynamicPart}`)
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
    const q = normalizeSearchText(entityFilterValue);
    list = list.filter((e) =>
      normalizeSearchText(getEntityFieldValue(e, entityFilterField)).includes(q)
    );
  }
  if (entitySearchQuery.trim()) {
    const q = normalizeSearchText(entitySearchQuery);
    list = list.filter((e) => {
      const haystack = entitySearchIndexById.get(e.id) || '';
      return haystack.includes(q);
    });
  }
  if (entitySortMode === 'name_desc') list.sort(comparePinnedListThenNameDesc);
  else if (entitySortMode === 'newest') list.sort(comparePinnedListThenNewest);
  else if (entitySortMode === 'milestones') list.sort(comparePinnedListThenMilestones);
  else list.sort(comparePinnedListThenNameAsc);
  return list;
}
