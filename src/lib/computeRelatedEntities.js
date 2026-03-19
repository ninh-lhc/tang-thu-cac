/** Giống MasterUtils.safeString — tách ra để module này không import React. */
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

/**
 * Tính danh sách thực thể liên quan (nhắc tên + wiki [[...]] resolve được).
 * Thuần hàm — dễ test, không phụ thuộc React.
 *
 * Ai gọi: App.jsx (effect mạng lưới nhân quả). Test: computeRelatedEntities.test.js
 */
export function computeRelatedEntities({
  activeNovelData,
  selectedEntity,
  activeTabs,
  entityMap,
  wikiExactMatchOnly,
}) {
  if (!activeNovelData || !selectedEntity || !entityMap?.length) return [];

  const relMap = new Map();
  const addRel = (entity, lonId, nhoId, tabLabel, ctx) => {
    if (!entity || entity.id === selectedEntity.id) return;
    const k = `${lonId}|${nhoId}|${entity.id}`;
    if (!relMap.has(k)) relMap.set(k, { entity, lonId, nhoId, tabLabel, parts: new Set([ctx]) });
    else relMap.get(k).parts.add(ctx);
  };

  const namesToMatch = new Set();
  const extractNames = (str) => {
    if (!str) return;
    str.split(/[,/|()]/).forEach((n) => {
      const clean = n.trim();
      if (clean.length >= 2) namesToMatch.add(clean.toLowerCase());
    });
  };
  extractNames(selectedEntity.name);
  if (selectedEntity.dynamicData?.f_alias) extractNames(selectedEntity.dynamicData.f_alias);

  if (namesToMatch.size > 0) {
    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexStr = Array.from(namesToMatch).map(escapeRegExp).join('|');
    const combinedRegex = new RegExp(`(${regexStr})`, 'i');

    Object.entries(activeNovelData.data || {}).forEach(([lonId, lonData]) => {
      const tL = activeTabs.find((t) => t.id === lonId);
      Object.entries(lonData || {}).forEach(([nhoId, nhoData]) => {
        const tN = tL?.subTabs?.find((s) => s.id === nhoId);
        if (nhoData && nhoData.entities) {
          nhoData.entities.forEach((otherEnt) => {
            if (otherEnt.id === selectedEntity.id) return;
            let mentioned = false;
            let contextInfo = '';
            if (otherEnt.dynamicData) {
              Object.entries(otherEnt.dynamicData).forEach(([fId, fVal]) => {
                if (typeof fVal === 'string') {
                  combinedRegex.lastIndex = 0;
                  if (combinedRegex.test(fVal)) {
                    mentioned = true;
                    const f = tN?.fieldsTemplate?.find((field) => field.id === fId);
                    contextInfo = f ? f.label : 'Thuộc tính';
                  }
                }
              });
            }
            if (!mentioned && typeof otherEnt.info === 'string') {
              combinedRegex.lastIndex = 0;
              if (combinedRegex.test(otherEnt.info)) {
                mentioned = true;
                contextInfo = 'Trong ghi chép';
              }
            }
            if (mentioned) addRel(otherEnt, lonId, nhoId, tN ? tN.label : lonId, contextInfo);
          });
        }
      });
    });
  }

  const resolveWikiDest = (linkInner) => {
    const label = safeString(linkInner).trim();
    if (!label) return null;
    const low = label.toLowerCase();
    const exact = entityMap.find((e) => e.name.toLowerCase() === low);
    if (exact) return { dest: exact.dest, matched: exact.name };
    if (wikiExactMatchOnly) return null;
    for (const e of entityMap) {
      const en = e.name.toLowerCase();
      if (en.length < 2) continue;
      if (low.includes(en) || en.includes(low)) return { dest: e.dest, matched: e.name };
    }
    return null;
  };

  const wikiRe = /\[\[([^\]]+)\]\]/g;
  const absorbWikiText = (text, ctxLead) => {
    if (!text || typeof text !== 'string') return;
    let m;
    wikiRe.lastIndex = 0;
    while ((m = wikiRe.exec(text)) !== null) {
      const resolved = resolveWikiDest(m[1]);
      if (!resolved) continue;
      const { dest, matched } = resolved;
      if (dest.entityId === selectedEntity.id) continue;
      const td = activeNovelData.data?.[dest.lonId]?.[dest.nhoId];
      const ent = td?.entities?.find((e) => e.id === dest.entityId);
      if (!ent) continue;
      const tN = activeTabs.find((t) => t.id === dest.lonId)?.subTabs?.find((s) => s.id === dest.nhoId);
      addRel(ent, dest.lonId, dest.nhoId, tN ? tN.label : dest.lonId, `${ctxLead}[[${matched}]]`);
    }
  };

  absorbWikiText(selectedEntity.rawText, 'Bản thảo · ');
  (selectedEntity.milestones || []).forEach((ms) => {
    absorbWikiText(ms.event, `Mốc ch.${safeString(ms.chapter)} · `);
  });

  return Array.from(relMap.values()).map((v) => ({
    entity: v.entity,
    lonId: v.lonId,
    nhoId: v.nhoId,
    tabLabel: v.tabLabel,
    context: [...v.parts].join(' · '),
  }));
}
