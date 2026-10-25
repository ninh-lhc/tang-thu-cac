/**
 * Cấu hình optional listViewConfig trên tab con (collection-track).
 */
import { safeString } from './entityFieldValue.js';

export const DEFAULT_LIST_VIEW_COLUMNS = Object.freeze(['entity', 'displayString', 'f_alias']);

export function normalizeListViewConfig(raw) {
  const cfg = raw && typeof raw === 'object' ? raw : {};
  const mode = cfg.mode === 'table' ? 'table' : 'list';
  let columns = Array.isArray(cfg.columns)
    ? cfg.columns.map((id) => safeString(id).trim()).filter(Boolean)
    : [...DEFAULT_LIST_VIEW_COLUMNS];
  if (!columns.includes('entity')) columns = ['entity', ...columns.filter((id) => id !== 'entity')];
  const pageSize = Number(cfg.pageSize);
  return {
    mode,
    columns,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? Math.min(Math.trunc(pageSize), 500) : null,
    sortField: safeString(cfg.sortField).trim() || null,
    sortDirection: cfg.sortDirection === 'desc' ? 'desc' : 'asc',
  };
}
