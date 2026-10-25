/**
 * Dấu vân tay rẻ cho buildEntityLinkMap — chỉ tên/alias/status/member/tabs,
 * không đọc ghi chú hay mốc. Dùng để bỏ qua rebuild map khi novel clone nhưng wiki không đổi.
 */
import { buildConfiguredSubTabIdsByLon, isConfiguredNovelDataPath } from './novelTabDataPaths.js';
import { readEntityMembers } from './entityMembers.js';

function push(parts, value) {
  if (value == null) {
    parts.push('');
    return;
  }
  parts.push(typeof value === 'string' ? value : String(value));
}

export function buildEntityLinkFingerprint(activeNovelData) {
  if (!activeNovelData) return '';
  const parts = [];
  const configuredPaths = buildConfiguredSubTabIdsByLon(activeNovelData.tabsConfig);
  const data = activeNovelData.data || {};

  Object.keys(data).forEach((lonId) => {
    const lon = data[lonId];
    if (!lon || typeof lon !== 'object') return;
    Object.keys(lon).forEach((nhoId) => {
      if (!isConfiguredNovelDataPath(configuredPaths, lonId, nhoId)) return;
      const entities = lon[nhoId]?.entities;
      if (!Array.isArray(entities)) return;
      parts.push(lonId, nhoId);
      entities.forEach((ent) => {
        push(parts, ent?.id);
        push(parts, ent?.name);
        push(parts, ent?.dynamicData?.f_alias);
        push(parts, ent?.dynamicData?.f_status);
        push(parts, ent?.status);
        push(parts, ent?.dynamicData?.f_vi_tri);
        parts.push(JSON.stringify(ent?.wikiRetiredAliases || ''));
        readEntityMembers(ent).forEach((member) => {
          push(parts, member?.id);
          push(parts, member?.name);
          push(parts, member?.alias);
          push(parts, member?.role);
          push(parts, member?.status);
          parts.push(JSON.stringify(member?.wikiRetiredAliases || ''));
        });
      });
    });
  });

  const tabs = Array.isArray(activeNovelData.tabsConfig) ? activeNovelData.tabsConfig : [];
  parts.push(
    JSON.stringify(
      tabs.map((t) => ({
        id: t?.id,
        subTabs: t?.subTabs?.map((s) => ({ id: s?.id, label: s?.label })),
      })),
    ),
  );

  return parts.join('\x00');
}
