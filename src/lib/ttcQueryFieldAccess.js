/**
 * Đọc giá trị field cho TTC-Query (precedence thống nhất engine + diagnostics).
 */
import { safeString } from './entityFieldValue.js';
import { extractTtcDataFromEntityNote } from './ttcDataBlock.js';
import {
  isTtcVirtualField,
  ttcRawVirtualValue,
} from './ttcQueryVirtualFields.js';

export function normalizeTtcFieldId(fieldId) {
  return String(fieldId || '').trim();
}

export function isTtcFieldValueEmpty(value) {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * Precedence: dynamicData (kể cả chuỗi rỗng) → ttc-data → legacy f_status/f_title/f_desc.
 */
export function readTtcFieldValue(row, fieldId) {
  const id = normalizeTtcFieldId(fieldId);
  if (isTtcVirtualField(id)) return ttcRawVirtualValue(row, id);
  const ent = row?.entity;
  if (!ent) return undefined;
  const dyn = ent.dynamicData;
  if (dyn && typeof dyn === 'object' && Object.prototype.hasOwnProperty.call(dyn, id)) {
    return dyn[id];
  }
  const noteData = row?.noteTtcData ?? extractTtcDataFromEntityNote(ent);
  if (noteData && Object.prototype.hasOwnProperty.call(noteData, id)) {
    return noteData[id];
  }
  if (id === 'f_status') return ent.status ?? '';
  if (id === 'f_title') return ent.title ?? ent.name ?? '';
  if (id === 'f_desc') return ent.description ?? ent.info ?? '';
  return undefined;
}

export function readTtcFieldValueAsString(row, fieldId) {
  const raw = readTtcFieldValue(row, fieldId);
  if (isTtcFieldValueEmpty(raw)) return '';
  if (typeof raw === 'object') return safeString(raw);
  return safeString(raw);
}
