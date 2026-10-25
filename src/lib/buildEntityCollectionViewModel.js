/**
 * View-model chung List/Table Danh sách AUTO — pagination trên filtered list.
 */
import { formatCollectionTableCellDisplay } from './entityCollectionTableCells.js';
import { safeString } from './entityFieldValue.js';

export function buildEntityCollectionViewModel({
  allEntities = [],
  filteredEntities = [],
  columns = [],
  columnMetaById = new Map(),
  page = 1,
  pageSize = 12,
}) {
  const allCount = allEntities.length;
  const filteredCount = filteredEntities.length;
  const size = Math.max(1, Math.trunc(pageSize) || 12);
  const pageCount = Math.max(1, Math.ceil(filteredCount / size) || 1);
  const safePage = Math.min(Math.max(1, Math.trunc(page) || 1), pageCount);

  const columnIds = columns.map((id) => safeString(id).trim()).filter(Boolean);
  const columnsResolved = columnIds.map((id) => ({
    id,
    label: columnMetaById.get(id)?.label || id,
  }));

  const start = (safePage - 1) * size;
  const pageEntities = filteredEntities.slice(start, start + size);

  const rows = pageEntities.map((entity) => ({
    entityId: entity.id,
    entityName: safeString(entity.name),
    entity,
    cells: columnsResolved.map((col) => ({
      fieldId: col.id,
      display: formatCollectionTableCellDisplay(entity, col.id),
      isEntityLink: col.id === 'entity',
    })),
  }));

  return {
    allCount,
    filteredCount,
    page: safePage,
    pageSize: size,
    pageCount,
    columns: columnsResolved,
    rows,
  };
}
