// Mục đích: Lọc + sắp xếp danh sách thực thể sưu tập (tìm kiếm + lọc trường cùng lúc).
// Import bởi: App.jsx
// Lưu ý: Dùng trong useMemo; không chứa React. Thẻ Danh sách > user-ghim (A→Z) > sort mode.

import { getEntityFieldValue, safeString } from './entityFieldValue.js';
import { normalizeSearchText } from './normalizeSearchText.js';
import {
  isCatalogListCardEntity,
  isEntityListPinned,
} from './entityListPin.js';

function normalizeAscii(value) {
  return normalizeSearchText(value);
}

function isListCardEntity(entity) {
  return isCatalogListCardEntity(entity) || normalizeAscii(entity?.name).startsWith('danh sach');
}

/**
 * Thứ tự: thẻ Danh sách (luôn đầu) → thẻ user-ghim (A→Z) → còn lại theo sort mode.
 */
function compareListPriorityThen(a, b, nextCompare) {
  const aList = isListCardEntity(a);
  const bList = isListCardEntity(b);
  if (aList !== bList) return aList ? -1 : 1;

  const aPinned = !aList && isEntityListPinned(a);
  const bPinned = !bList && isEntityListPinned(b);
  if (aPinned !== bPinned) return aPinned ? -1 : 1;
  if (aPinned && bPinned) {
    const byName = safeString(a?.name).localeCompare(safeString(b?.name), 'vi');
    if (byName !== 0) return byName;
  }
  return nextCompare(a, b);
}

function comparePinnedListThenNameAsc(a, b) {
  return compareListPriorityThen(a, b, (x, y) =>
    safeString(x?.name).localeCompare(safeString(y?.name), 'vi')
  );
}

function comparePinnedListThenNameDesc(a, b) {
  return compareListPriorityThen(a, b, (x, y) =>
    safeString(y?.name).localeCompare(safeString(x?.name), 'vi')
  );
}

function comparePinnedListThenNewest(a, b) {
  return compareListPriorityThen(a, b, (x, y) =>
    safeString(y?.id).localeCompare(safeString(x?.id), 'vi')
  );
}

function comparePinnedListThenMilestones(a, b) {
  return compareListPriorityThen(a, b, (x, y) => {
    const am = Array.isArray(x?.milestones) ? x.milestones.length : 0;
    const bm = Array.isArray(y?.milestones) ? y.milestones.length : 0;
    if (am !== bm) return bm - am;
    return safeString(x?.name).localeCompare(safeString(y?.name), 'vi');
  });
}

// Chỉ mục tìm theo tên thẻ (name), không dùng info/title/dynamicData — tránh trúng từ trong dữ liệu dài.
export function buildEntitySearchIndexMap(collectionEntitiesRaw) {
  const map = new Map();
  collectionEntitiesRaw.forEach((e) => {
    map.set(e.id, normalizeSearchText(safeString(e.name)));
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
