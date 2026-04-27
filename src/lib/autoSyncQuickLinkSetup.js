/**
 * Tối giản cấu hình Auto 3: chọn tab nguồn (Thế lực) + tab đích (Bản đồ) rồi áp path target.
 * Dùng bởi AppModalQuanLyTab; logic thuần để dễ test.
 */
import { getEffectiveAutoSyncRole } from './tabAutoSyncRole.js';

function safeString(v) {
  if (v == null || v === 'null' || v === 'undefined') return '';
  return String(v);
}

function walkCollectionTrackSubTabs(sortedTabs) {
  const out = [];
  (Array.isArray(sortedTabs) ? sortedTabs : []).forEach((lon) => {
    (lon?.subTabs || []).forEach((nho) => {
      if (nho?.viewType !== 'collection-track') return;
      out.push({
        pathKey: `${lon.id}::${nho.id}`,
        lonId: lon.id,
        nhoId: nho.id,
        nho,
        parentLabel: safeString(lon?.label || lon?.id),
        label: `${safeString(lon?.label || lon.id)} > ${safeString(nho?.label || nho.id)}`,
      });
    });
  });
  return out;
}

function effectiveRoleForSubTab(lon, nho) {
  return getEffectiveAutoSyncRole({
    activeTabLon: lon?.id,
    activeTabNho: nho?.id,
    currentTabConfig: nho,
    parentLabel: safeString(lon?.label || ''),
  });
}

/**
 * Các mục collection-track ứng với nguồn/gợi ý nguồn Auto 3.
 */
export function getQuickAuto3SourceOptions(sortedTabs) {
  return walkCollectionTrackSubTabs(sortedTabs).filter((row) => {
    const role = effectiveRoleForSubTab(
      (sortedTabs || []).find((lon) => safeString(lon?.id) === safeString(row.lonId)),
      row.nho
    );
    return role === 'the-luc' || role === '' || role === 'khong-tu-dong';
  });
}

/**
 * Các mục collection-track ứng với đích/gợi ý đích Auto 3.
 */
export function getQuickAuto3TargetOptions(sortedTabs) {
  return walkCollectionTrackSubTabs(sortedTabs).filter((row) => {
    const lon = (sortedTabs || []).find((item) => safeString(item?.id) === safeString(row.lonId));
    const role = effectiveRoleForSubTab(lon, row.nho);
    return role === 'ban-do' || role === '' || role === 'khong-tu-dong';
  });
}

/**
 * Gợi ý cặp path mặc định: ưu tiên cùng tồn tại, khác pathKey.
 */
export function getQuickAuto3DefaultPair(sortedTabs) {
  const sourceOpts = getQuickAuto3SourceOptions(sortedTabs);
  const targetOpts = getQuickAuto3TargetOptions(sortedTabs);
  if (sourceOpts.length === 0 || targetOpts.length === 0) {
    return { sourcePath: '', targetPath: '' };
  }
  const sourcePath = sourceOpts[0].pathKey;
  const alt = targetOpts.find((t) => t.pathKey !== sourcePath) || null;
  if (!alt) {
    return { sourcePath, targetPath: '' };
  }
  return { sourcePath, targetPath: alt.pathKey };
}

export function validateQuickAuto3Pair({ sourcePath, targetPath } = {}) {
  const a = safeString(sourcePath).trim();
  const b = safeString(targetPath).trim();
  if (!a || !b) {
    return { ok: false, message: 'Chọn đủ tab nguồn và tab đích trước khi áp dụng Auto 3.' };
  }
  if (a === b) {
    return { ok: false, message: 'Tab nguồn và tab đích không được trùng nhau.' };
  }
  return { ok: true, message: '' };
}

export function buildQuickAuto3TabLabel(sortedTabs, pathKey) {
  const [lonId, nhoId] = safeString(pathKey).split('::');
  const lon = (sortedTabs || []).find((t) => safeString(t?.id) === safeString(lonId));
  const nho = lon?.subTabs?.find((s) => safeString(s?.id) === safeString(nhoId));
  if (!lon || !nho) return pathKey;
  return `${safeString(lon.label || lon.id)} > ${safeString(nho.label || nho.id)}`;
}
