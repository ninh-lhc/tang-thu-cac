/**
 * Gom tab lớn theo nhóm (Tổng quan tách riêng).
 * Dùng: App.jsx sidebar.
 */
import { TAB_GROUP_MAP, TAB_GROUP_ORDER } from '../genreTabsMap.js';

export function buildTabGroups(sortedTabs) {
  const tongQuan = sortedTabs.find((t) => t.id === 'tong-quan');
  const rest = sortedTabs.filter((t) => t.id !== 'tong-quan');
  if (rest.length === 0) return tongQuan ? [{ groupLabel: null, tabs: [tongQuan] }] : [];
  const byGroup = new Map();
  rest.forEach((t) => {
    const g = t._group || TAB_GROUP_MAP[t.id] || 'Khác';
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g).push(t);
  });
  const ordered = [];
  for (const gl of TAB_GROUP_ORDER) {
    if (byGroup.has(gl)) ordered.push({ groupLabel: gl, tabs: byGroup.get(gl) });
  }
  const remaining = [...byGroup.entries()].filter(([g]) => !TAB_GROUP_ORDER.includes(g));
  remaining.forEach(([g, tabs]) => ordered.push({ groupLabel: g, tabs }));
  return [{ groupLabel: null, tabs: tongQuan ? [tongQuan] : [] }, ...ordered];
}
