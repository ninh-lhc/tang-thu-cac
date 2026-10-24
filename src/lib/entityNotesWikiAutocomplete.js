// ==========================================
// Autocomplete [[wiki]] trong editor ghi chép — query + gợi ý từ entityMap.
// ==========================================

import { buildEntityNameLookup, resolveEntityLookup } from './entityWikiLookup.js';
import { replaceTextRange } from './entityNotesWikiEdit.js';

export function findOpenWikiBracketSession(text, caret) {
  const source = String(text ?? '');
  const pos = Math.max(0, Math.min(Number(caret) || 0, source.length));
  const lineStart = source.lastIndexOf('\n', Math.max(0, pos - 1)) + 1;
  const lineEndIdx = source.indexOf('\n', pos);
  const lineEnd = lineEndIdx === -1 ? source.length : lineEndIdx;
  const line = source.slice(lineStart, lineEnd);
  const caretInLine = pos - lineStart;
  const before = line.slice(0, caretInLine);
  const openIdx = before.lastIndexOf('[[');
  if (openIdx === -1) return null;
  const closeIdx = line.indexOf(']]', openIdx + 2);
  if (
    closeIdx !== -1 &&
    caretInLine > openIdx + 2 &&
    caretInLine <= closeIdx + 2
  ) {
    return null;
  }
  const between = line.slice(openIdx + 2, caretInLine);
  if (between.includes(']]')) return null;
  const query = between;
  if (query.includes('\n')) return null;
  return {
    triggerStart: lineStart + openIdx,
    queryStart: lineStart + openIdx + 2,
    queryEnd: pos,
    query,
  };
}

function normalizeQuery(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function buildWikiAutocompleteSuggestions(entityMap, query, selfEntityId = null, limit = 12) {
  const list = Array.isArray(entityMap) ? entityMap : [];
  const q = normalizeQuery(query);
  const seen = new Set();
  const lookup = list.length ? buildEntityNameLookup(list) : null;
  const scored = [];

  for (const item of list) {
    const name = String(item?.name || '').trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const nq = normalizeQuery(name);
    if (q && !nq.includes(q)) continue;
    let status = 'external';
    const directId = String(item?.dest?.entityId || item?.entityId || '').trim();
    if (directId) {
      status = selfEntityId && directId === selfEntityId ? 'self' : 'external';
    } else if (lookup) {
      const hit = resolveEntityLookup(lookup, name, { selfEntityId });
      const hitId = String(hit?.dest?.entityId || hit?.entityId || '').trim();
      if (hitId) {
        status = selfEntityId && hitId === selfEntityId ? 'self' : 'external';
      }
    }
    scored.push({ name, status, sortKey: nq.indexOf(q) });
  }

  scored.sort((a, b) => {
    if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
    return a.name.localeCompare(b.name, 'vi');
  });

  const items = scored.slice(0, limit).map(({ name, status }) => ({
    id: name,
    name,
    status,
    kind: 'entity',
  }));

  const trimmedQuery = String(query ?? '').trim();
  if (trimmedQuery) {
    const exact = items.some((it) => it.name === trimmedQuery);
    if (!exact) {
      items.push({
        id: `__create__:${trimmedQuery}`,
        name: trimmedQuery,
        status: 'pending',
        kind: 'create',
      });
    }
  }

  return items;
}

export function applyWikiAutocompleteSelection(text, session, selectedName) {
  if (!session) return null;
  const name = String(selectedName ?? '').trim();
  if (!name) return null;
  const { triggerStart, queryEnd } = session;
  return replaceTextRange(text, triggerStart, queryEnd, `[[${name}]]`);
}
