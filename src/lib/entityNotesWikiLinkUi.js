// ==========================================
// Nhãn a11y + tra cứu trùng tên cho wiki-link chưa có thẻ (QUICK_CREATE).
// Ai dùng: MasterUtils (render), ModalQuickCreate, App (navigate).
// ==========================================

import { findEquivalentEntityByName } from './entityNameIdentity.js';

export function buildPendingWikiLinkAriaLabel(name) {
  const label = String(name || '').trim();
  if (!label) return 'Tạo ghi chú cho wiki-link mới';
  return `Tạo ghi chú cho ${label}`;
}

export function buildPendingWikiLinkTitle(name) {
  const label = String(name || '').trim();
  if (!label) return 'Tạo ghi chú mới';
  return `Tạo ghi chú cho “${label}”`;
}

/** Tra cứu trùng trong một tab collection — O(n) entities tab, không quét ghi chú. */
export function findQuickCreateEquivalentInTab(activeNovelData, path, rawName, normalizeName) {
  const safePath = String(path || '').trim();
  const [lonId, nhoId] = safePath.split('|');
  if (!lonId || !nhoId) return null;
  const tabData = activeNovelData?.data?.[lonId]?.[nhoId];
  const entities = tabData?.entities;
  if (!Array.isArray(entities) || entities.length === 0) return null;
  const candidateName =
    typeof normalizeName === 'function' ? normalizeName(String(rawName || '').trim()) : String(rawName || '').trim();
  if (!candidateName) return null;
  const matched = findEquivalentEntityByName(entities, candidateName, { allowExactNameMatch: true });
  if (!matched?.entity?.id) return null;
  return {
    lonId,
    nhoId,
    entityId: matched.entity.id,
    entityName: String(matched.entity.name || '').trim(),
    reason: matched.reason,
  };
}
