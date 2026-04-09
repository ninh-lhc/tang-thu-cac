// Muc dich: xac dinh trang danh sach chua entity dang duoc chon.
// Import boi: App.jsx de dong bo entityPage khi navigate/chon the.
// Luu y: chi dung cho che do phan trang list, khong ap dung cho grouped view.

export function resolveEntityPageForSelection(entitiesList, selectedEntityId, pageSize) {
  if (!Array.isArray(entitiesList) || entitiesList.length === 0) return null;
  if (!selectedEntityId || !Number.isFinite(pageSize) || pageSize <= 0) return null;
  const entityIndex = entitiesList.findIndex((entity) => entity?.id === selectedEntityId);
  if (entityIndex < 0) return null;
  return Math.floor(entityIndex / pageSize) + 1;
}
