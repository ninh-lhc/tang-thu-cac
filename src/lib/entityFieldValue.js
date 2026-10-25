// Mục đích: Đọc giá trị trường thực thể (template + dynamic) — dùng lọc/nhóm thẻ.
// Import bởi: App.jsx, entityCollectionQuery.js
// Lưu ý: Giữ đồng bộ với logic cũ trong App (trước khi tách).

export function safeString(val) {
  if (val == null || val === 'null' || val === 'undefined') return '';
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return '[Object]';
    }
  }
  return String(val);
}

export function getEntityFieldValue(ent, fieldId) {
  if (!ent || !fieldId) return '';
  const dyn = ent.dynamicData;
  if (dyn && typeof dyn === 'object' && Object.prototype.hasOwnProperty.call(dyn, fieldId)) {
    return safeString(dyn[fieldId]);
  }
  if (fieldId === 'f_status') return safeString(ent.status || '');
  if (fieldId === 'f_title') return safeString(ent.title || ent.name || '');
  if (fieldId === 'f_desc') return safeString(ent.description || ent.info || '');
  return '';
}
