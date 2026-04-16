/** Giống MasterUtils.safeString — tách ra để module này không import React. */
import { buildEntityNameLookup, resolveEntityLookup } from './entityWikiLookup.js';
import { containsWikiNameWordStartSurface } from './wikiNameSurface.js';

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

function buildTabMetadataMap(activeTabs) {
  const out = new Map();
  for (const tL of activeTabs || []) {
    const bySub = new Map();
    for (const tN of tL?.subTabs || []) {
      const fields = new Map();
      for (const f of tN?.fieldsTemplate || []) {
        if (f?.id) fields.set(f.id, f.label || 'Thuộc tính');
      }
      bySub.set(tN.id, { label: tN.label || tN.id, fields });
    }
    out.set(tL.id, bySub);
  }
  return out;
}

function buildNovelSearchIndex(activeNovelData, tabMetaMap) {
  const records = [];
  const byEntityId = new Map();
  const novelData = activeNovelData?.data || {};
  for (const [lonId, lonData] of Object.entries(novelData)) {
    const bySub = tabMetaMap.get(lonId);
    if (!bySub) continue;
    for (const [nhoId, nhoData] of Object.entries(lonData || {})) {
      if (!bySub.has(nhoId)) continue;
      const tabMeta = bySub.get(nhoId);
      const tabLabel = tabMeta?.label || lonId;
      const fieldLabelById = tabMeta?.fields || new Map();
      const entities = Array.isArray(nhoData?.entities) ? nhoData.entities : [];
      for (const ent of entities) {
        const dynamicStrings = [];
        for (const [fieldId, fieldVal] of Object.entries(ent?.dynamicData || {})) {
          if (typeof fieldVal === 'string' && fieldVal.trim()) {
            dynamicStrings.push({
              fieldId,
              text: fieldVal,
            });
          }
        }
        const infoString = typeof ent?.info === 'string' ? ent.info : '';
        const rec = {
          entity: ent,
          entityId: ent?.id,
          lonId,
          nhoId,
          tabLabel,
          fieldLabelById,
          dynamicStrings,
          info: infoString,
        };
        records.push(rec);
        if (ent?.id) byEntityId.set(ent.id, rec);
      }
    }
  }
  return { records, byEntityId };
}

/** Luôn build lại index — không cache theo reference novel vì state hay mutate tại chỗ (xóa thẻ/tab). */
function buildFreshNovelIndex(activeNovelData, activeTabs) {
  if (!activeNovelData) return { records: [], byEntityId: new Map(), tabMetaMap: new Map() };
  const tabMetaMap = buildTabMetadataMap(activeTabs);
  const novelIndex = buildNovelSearchIndex(activeNovelData, tabMetaMap);
  return { ...novelIndex, tabMetaMap };
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
  scopeLonId,
  scopeNhoId,
  maxResults = 300,
}) {
  if (!activeNovelData || !selectedEntity || !entityMap?.length) return [];
  const novelIndex = buildFreshNovelIndex(activeNovelData, activeTabs);

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
      if (clean.length >= 2) namesToMatch.add(clean);
    });
  };
  extractNames(selectedEntity.name);
  if (selectedEntity.dynamicData?.f_alias) extractNames(selectedEntity.dynamicData.f_alias);

  if (namesToMatch.size > 0) {
    const names = [...namesToMatch];
    for (const rec of novelIndex.records) {
      if (!rec?.entity || rec.entityId === selectedEntity.id) continue;
      if (scopeLonId && rec.lonId !== scopeLonId) continue;
      if (scopeNhoId && rec.nhoId !== scopeNhoId) continue;

      let mentioned = false;
      let contextInfo = '';
      for (const f of rec.dynamicStrings) {
        if (!f?.text) continue;
        for (const name of names) {
          if (containsWikiNameWordStartSurface(f.text, name)) {
            const fieldLabel = rec.fieldLabelById.get(f.fieldId);
            contextInfo = fieldLabel || 'Thuộc tính';
            mentioned = true;
            break;
          }
        }
        if (mentioned) break;
      }
      if (!mentioned && rec.info) {
        for (const name of names) {
          if (containsWikiNameWordStartSurface(rec.info, name)) {
            contextInfo = 'Trong ghi chép';
            mentioned = true;
            break;
          }
        }
      }
      if (mentioned) addRel(rec.entity, rec.lonId, rec.nhoId, rec.tabLabel, contextInfo);
    }
  }

  const wikiLookup = buildEntityNameLookup(entityMap);
  const resolveWikiDest = (linkInner) => {
    const label = safeString(linkInner).trim();
    if (!label) return null;
    const resolved = resolveEntityLookup(wikiLookup, label, { selfEntityId: selectedEntity.id });
    if (resolved) return { dest: resolved.dest, matched: resolved.name };
    if (wikiExactMatchOnly) return null;
    for (const item of entityMap) {
      const en = safeString(item?.name).trim();
      if (en.length < 2) continue;
      if (containsWikiNameWordStartSurface(label, en) || containsWikiNameWordStartSurface(en, label)) {
        return { dest: item.dest, matched: item.name };
      }
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
      const ent = novelIndex.byEntityId.get(dest.entityId)?.entity;
      if (!ent) continue;
      const tabLabel = novelIndex.tabMetaMap.get(dest.lonId)?.get(dest.nhoId)?.label || dest.lonId;
      addRel(ent, dest.lonId, dest.nhoId, tabLabel, `${ctxLead}[[${matched}]]`);
    }
  };

  // Ưu tiên ghi chú hiện tại (info). rawText cũ có thể bị stale sau các luồng chỉnh form.
  const selectedWikiSource = safeString(selectedEntity.info || selectedEntity.rawText);
  absorbWikiText(selectedWikiSource, 'Bản thảo · ');
  (selectedEntity.milestones || []).forEach((ms) => {
    absorbWikiText(ms.event, `Mốc ch.${safeString(ms.chapter)} · `);
  });

  return Array.from(relMap.values()).slice(0, Math.max(0, maxResults)).map((v) => ({
    entity: v.entity,
    lonId: v.lonId,
    nhoId: v.nhoId,
    tabLabel: v.tabLabel,
    context: [...v.parts].join(' · '),
  }));
}
