/**
 * Danh sach ten -> dich wiki (do dai giam dan de matcher nhanh).
 * Giu lai ca cac ten trung nhau, kem "dau vet boi canh" de resolver
 * co the chon dung dich khi mot wiki-link bi mo ho.
 */
import { normalizeAsciiText, parseStatusHierarchy, splitStatusHierarchyTokens } from './statusHierarchyParser.js';

const NAME_SPLIT_RE = /[,/|()]/;

function splitNames(nameText) {
  return String(nameText || '')
    .split(NAME_SPLIT_RE)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2 && part.length <= 80);
}

function normalizeContextKey(value) {
  return normalizeAsciiText(String(value || '').replace(/\[\[|\]\]/g, '').trim()).replace(/\s+/g, ' ');
}

function collectEntityContextKeys(entity) {
  const seen = new Set();
  const out = [];

  const push = (value) => {
    const clean = String(value || '').replace(/\[\[|\]\]/g, '').trim();
    const key = normalizeContextKey(clean);
    if (!clean || !key || seen.has(key)) return;
    seen.add(key);
    out.push(key);
  };

  push(entity?.name);
  splitNames(entity?.dynamicData?.f_alias).forEach(push);
  splitStatusHierarchyTokens(entity?.dynamicData?.f_vi_tri || '').forEach(push);

  const statusText = String(entity?.dynamicData?.f_status || entity?.status || '').trim();
  const parsedStatus = parseStatusHierarchy(statusText);
  if (parsedStatus?.chain?.length) {
    parsedStatus.chain.forEach(push);
  } else {
    const statusTokens = splitStatusHierarchyTokens(statusText);
    if (statusTokens.length > 1) statusTokens.forEach(push);
  }

  return out;
}

export function buildEntityLinkMap(activeNovelData) {
  if (!activeNovelData) return [];
  const map = [];

  const addNames = (nameStr, sharedMeta) => {
    splitNames(nameStr).forEach((cleanName) => {
      map.push({ name: cleanName, ...sharedMeta });
    });
  };

  Object.keys(activeNovelData.data || {}).forEach((lonId) => {
    Object.keys(activeNovelData.data[lonId] || {}).forEach((nhoId) => {
      const tabData = activeNovelData.data[lonId][nhoId];
      if (!tabData?.entities) return;
      tabData.entities.forEach((ent) => {
        const sharedMeta = {
          dest: { lonId, nhoId, entityId: ent.id },
          entityId: ent.id,
          entityName: String(ent?.name || '').trim(),
          contextKeys: collectEntityContextKeys(ent),
        };
        addNames(ent.name, sharedMeta);
        if (ent.dynamicData) addNames(ent.dynamicData.f_alias, sharedMeta);
      });
    });
  });

  return map.sort((a, b) => b.name.length - a.name.length);
}
