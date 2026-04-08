/** Giống MasterUtils.safeString — tách ra để module này không import React. */
import { buildEntityNameLookup, resolveEntityLookup } from './entityWikiLookup.js';
import { buildConfiguredSubTabIdsByLon, isConfiguredNovelDataPath } from './novelTabDataPaths.js';

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
  const configuredPaths = buildConfiguredSubTabIdsByLon(activeNovelData?.tabsConfig);
  for (const [lonId, lonData] of Object.entries(novelData)) {
    const bySub = tabMetaMap.get(lonId);
    if (!bySub) continue;
    for (const [nhoId, nhoData] of Object.entries(lonData || {})) {
      if (!bySub.has(nhoId)) continue;
      if (!isConfiguredNovelDataPath(configuredPaths, lonId, nhoId)) continue;
      const tabMeta = bySub.get(nhoId);
      const tabLabel = tabMeta?.label || lonId;
      const entities = Array.isArray(nhoData?.entities) ? nhoData.entities : [];
      for (const ent of entities) {
        const dynamicStrings = [];
        for (const [fieldId, fieldVal] of Object.entries(ent?.dynamicData || {})) {
          if (typeof fieldVal === 'string' && fieldVal.trim()) {
            dynamicStrings.push({
              fieldId,
              text: fieldVal,
              lower: fieldVal.toLowerCase(),
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
          dynamicStrings,
          info: infoString,
          infoLower: infoString.toLowerCase(),
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
 * Tham số wikiExactMatchOnly (nếu caller truyền) được bỏ qua: [[...]] luôn resolve chặt, không substring.
 */
export function computeRelatedEntities({
  activeNovelData,
  selectedEntity,
  activeTabs,
  entityMap,
  scopeLonId,
  scopeNhoId,
  maxResults = 300,
}) {
  if (!activeNovelData || !selectedEntity || !entityMap?.length) return [];
  const novelIndex = buildFreshNovelIndex(activeNovelData, activeTabs);

  const relMap = new Map();
  const addRel = (entity, lonId, nhoId, tabLabel, ctx) => {
    if (!entity || entity.id === selectedEntity.id) return;
    if (!novelIndex.byEntityId.has(entity.id)) return;
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
    for (const rec of novelIndex.records) {
      if (!rec?.entity || rec.entityId === selectedEntity.id) continue;
      if (scopeLonId && rec.lonId !== scopeLonId) continue;
      if (scopeNhoId && rec.nhoId !== scopeNhoId) continue;

      let mentioned = false;
      let contextInfo = '';
      for (const f of rec.dynamicStrings) {
        if (!f?.lower) continue;
        for (const name of namesToMatch) {
          if (f.lower.includes(name)) {
            const fieldLabel = novelIndex.tabMetaMap.get(rec.lonId)?.get(rec.nhoId)?.fields?.get(f.fieldId);
            contextInfo = fieldLabel || 'Thuộc tính';
            mentioned = true;
            break;
          }
        }
        if (mentioned) break;
      }
      if (!mentioned && rec.infoLower) {
        for (const name of namesToMatch) {
          if (rec.infoLower.includes(name)) {
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
    // Không dùng substring trên entityMap: dễ khớp nhầm thẻ còn sống khi thẻ đích đã xóa (tên gần giống).
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
