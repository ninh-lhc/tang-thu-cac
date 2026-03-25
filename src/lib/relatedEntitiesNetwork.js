/** Lọc / sắp xếp / gom nhóm danh sách relatedEntities đã tính sẵn (pure, không React).
 * Dùng cho UI “Mạng Lưới Nhân Quả”: không gọi lại computeRelatedEntities khi gõ lọc.
 * Ai gọi: AppEntitySummaryBlocks. Test: relatedEntitiesNetwork.test.js
 */

function safeString(val) {
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

function normalizeSearch(s) {
  return safeString(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * @param {Array<{ tabLabel?: string, entity?: { name?: string }, context?: string }>} items
 * @param {{ tabKey: string, searchQuery: string }} opts tabKey 'all' hoặc đúng nhãn tab (so khớp safeString)
 */
export function filterRelatedEntities(items, { tabKey, searchQuery }) {
  let out = items;
  if (tabKey && tabKey !== 'all') {
    out = out.filter((rel) => safeString(rel.tabLabel) === tabKey);
  }
  const q = normalizeSearch(searchQuery).trim();
  if (!q) return out;
  return out.filter((rel) => {
    const hay = normalizeSearch(
      [safeString(rel.entity?.name), safeString(rel.tabLabel), safeString(rel.context)].join(' ')
    );
    return hay.includes(q);
  });
}

export function sortRelatedEntitiesForDisplay(items) {
  return [...items].sort((a, b) => {
    const ta = safeString(a.tabLabel);
    const tb = safeString(b.tabLabel);
    if (ta !== tb) return ta.localeCompare(tb, 'vi');
    const na = safeString(a.entity?.name);
    const nb = safeString(b.entity?.name);
    return na.localeCompare(nb, 'vi');
  });
}

/** @returns {{ tabLabel: string, items: typeof items }[]} */
export function groupByTabLabel(items) {
  const map = new Map();
  for (const rel of items) {
    const key = safeString(rel.tabLabel) || '(Không nhãn)';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(rel);
  }
  return Array.from(map.entries()).map(([tabLabel, groupItems]) => ({ tabLabel, items: groupItems }));
}

export function uniqueTabLabels(items) {
  const set = new Set();
  for (const rel of items) {
    set.add(safeString(rel.tabLabel) || '(Không nhãn)');
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
}

/**
 * Cắt theo số thẻ tối đa, giữ thứ tự nhóm.
 * @returns {{ sections: { tabLabel: string, items: unknown[] }[], hasMore: boolean, totalShown: number, totalFiltered: number }}
 */
export function takeGroupedForDisplay(grouped, visibleCount) {
  const totalFiltered = grouped.reduce((s, g) => s + g.items.length, 0);
  let remaining = visibleCount;
  const sections = [];
  for (const { tabLabel, items } of grouped) {
    if (remaining <= 0) break;
    const slice = items.slice(0, remaining);
    if (slice.length === 0) continue;
    sections.push({ tabLabel, items: slice });
    remaining -= slice.length;
  }
  const totalShown = sections.reduce((s, sec) => s + sec.items.length, 0);
  return {
    sections,
    hasMore: totalShown < totalFiltered,
    totalShown,
    totalFiltered,
  };
}
