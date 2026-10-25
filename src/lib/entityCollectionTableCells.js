/**
 * Giá trị ô bảng Danh sách AUTO — không mutate entity.
 */
import { getEntityFieldValue, safeString } from './entityFieldValue.js';
import { getEntityAutoDisplayString } from './collectionListCardSync.js';

export function readCollectionTableCellRaw(entity, fieldId) {
  const id = safeString(fieldId).trim();
  if (!entity) return '';
  if (id === 'entity') return safeString(entity.name);
  if (id === 'displayString') return getEntityAutoDisplayString(entity);
  const dyn = entity.dynamicData;
  if (dyn && typeof dyn === 'object' && Object.prototype.hasOwnProperty.call(dyn, id)) {
    const v = dyn[id];
    if (v == null || v === '') return '';
    if (Array.isArray(v)) return v.map((x) => safeString(x)).join(', ');
    if (typeof v === 'object') return safeString(v);
    return safeString(v);
  }
  const raw = getEntityFieldValue(entity, id);
  if (raw == null || raw === '') return '';
  return safeString(raw);
}

export function formatCollectionTableCellDisplay(entity, fieldId) {
  return readCollectionTableCellRaw(entity, fieldId);
}
