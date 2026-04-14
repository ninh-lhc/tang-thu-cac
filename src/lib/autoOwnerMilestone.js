import { findEquivalentEntitiesByName, findEquivalentEntityByName } from './entityNameIdentity.js';
import { applyMilestoneLabel, parseMilestoneLabel } from './milestoneLabels.js';

const OWNER_LABEL_RE = /(nguoi\s*so\s*huu|ch[uủ]\s*nh[aâ]n)/i;
const OWNER_LINE_PREFIX_RE = /^\s*[-*]?\s*(nguoi\s*so\s*huu|chu\s*nhan)\s*:\s*/i;
const OWNER_VALUE_RE = /^(.*?)\s*\((\d{1,6})\)\s*(\[(?:!!|!|\?|\.\.\.|x)\]|!!|!|\?|\.\.\.|x)?\s*$/i;
const OWNER_ALLOWED_SUFFIX_RE = /^\s*(\[(?:!!|!|\?|\.\.\.|x)\]|!!|!|\?|\.\.\.|x)?\s*$/i;
const OWNER_LABEL_FLEX_RE =
  /(nguoi\s*so\s*huu|chu\s*nhan|nguoi\s*su\s*dung|nguoi\s*tu\s*luyen|truyen\s*nhan|khe\s*chu)/i;
const OWNER_LINE_PREFIX_FLEX_RE =
  /^\s*[-*]?\s*(nguoi\s*so\s*huu|chu\s*nhan|nguoi\s*su\s*dung|nguoi\s*tu\s*luyen|truyen\s*nhan|khe\s*chu)\s*:\s*/i;
const OWNER_LABEL_EFFECTIVE_RE = OWNER_LABEL_FLEX_RE || OWNER_LABEL_RE;
const OWNER_LINE_PREFIX_EFFECTIVE_RE = OWNER_LINE_PREFIX_FLEX_RE || OWNER_LINE_PREFIX_RE;
const OWNER_FALLBACK_FIELD_IDS = new Set([
  'f_chu',
  'f_owner',
  'f_nguoi_so_huu',
  'f_nguoi_su_dung',
  'f_nguoi_tu_luyen',
  'f_truyen_nhan',
  'f_khe_chu',
]);

const LABEL_RANK = {
  critical: 5,
  important: 4,
  uncertain: 3,
  ongoing: 2,
  drop: 1,
  null: 0,
};

function normalizeAscii(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function tokenToLabelId(tokenRaw) {
  const t = String(tokenRaw || '').trim().replace(/^\[|\]$/g, '').toLowerCase();
  if (t === '!!') return 'critical';
  if (t === '!') return 'important';
  if (t === '...') return 'ongoing';
  if (t === 'x') return 'drop';
  return 'uncertain';
}

function parseOwnerValue(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  const m = text.match(OWNER_VALUE_RE);
  if (!m) return null;
  const ownerName = String(m[1] || '')
    .trim()
    .replace(/^\[\[|\]\]$/g, '')
    .replace(/^[^\p{L}\p{N}\u005b]+/u, '')
    .trim();
  if (!ownerName) return null;
  const chapter = parseInt(m[2], 10);
  if (!Number.isFinite(chapter) || chapter < 0) return null;
  const labelId = tokenToLabelId(m[3]);
  return { ownerName, chapter, labelId };
}

function parseOwnerValueWithReason(raw) {
  const text = String(raw || '').trim();
  if (!text) return { hint: null, reason: 'empty' };
  const parsed = parseOwnerValue(text);
  if (parsed) return { hint: parsed, reason: null };

  const chapterMatch = text.match(/\(([^)]*)\)/);
  if (!chapterMatch) return { hint: null, reason: 'missing_chapter' };
  const chapterRaw = String(chapterMatch[1] || '').trim();
  if (!/^\d{1,6}$/.test(chapterRaw)) return { hint: null, reason: 'invalid_chapter' };

  const ownerRaw = text.slice(0, chapterMatch.index).trim().replace(/^\[\[|\]\]$/g, '').trim();
  if (!ownerRaw) return { hint: null, reason: 'empty_owner' };

  const suffix = text.slice(chapterMatch.index + chapterMatch[0].length);
  if (!OWNER_ALLOWED_SUFFIX_RE.test(suffix)) return { hint: null, reason: 'invalid_label_token' };
  return { hint: null, reason: 'invalid_format' };
}

function buildOwnerFallbackCandidatesFromLine(rawLine) {
  const line = String(rawLine || '').trim();
  if (!line) return [];
  const candidates = [];
  const pushUnique = (value) => {
    const next = String(value || '').trim();
    if (!next) return;
    if (!candidates.includes(next)) candidates.push(next);
  };

  const withoutBullet = line.replace(/^\s*[-*+]\s*(?:\[[ xX]\]\s*)?/, '').trim();
  pushUnique(withoutBullet);
  const colonIdx = withoutBullet.indexOf(':');
  if (colonIdx >= 0) {
    pushUnique(withoutBullet.slice(colonIdx + 1));
    return candidates;
  }
  pushUnique(line);
  return candidates;
}

export function parseOwnerTimelineHint({ dynamicData, fieldsTemplate, rawText }) {
  const out = parseOwnerTimelineHintDetailed({ dynamicData, fieldsTemplate, rawText });
  return out.hint;
}

export function parseOwnerTimelineHintDetailed({ dynamicData, fieldsTemplate, rawText }) {
  const dyn = dynamicData && typeof dynamicData === 'object' ? dynamicData : {};
  const fields = Array.isArray(fieldsTemplate) ? fieldsTemplate : [];

  let sawOwnerField = false;
  for (const f of fields) {
    const label = normalizeAscii(f?.label || '');
    if (!OWNER_LABEL_EFFECTIVE_RE.test(label)) continue;
    sawOwnerField = true;
    const rawVal = String(dyn?.[f.id] || '').trim();
    if (!rawVal) continue;
    const parsed = parseOwnerValueWithReason(rawVal);
    if (parsed.hint) return { hint: parsed.hint, reason: null, source: 'field' };
    return { hint: null, reason: parsed.reason || 'invalid_owner_format', source: 'field' };
  }

  // Fallback cho tab/field custom: khong can trung label, chi can key quen thuoc.
  for (const fieldId of OWNER_FALLBACK_FIELD_IDS) {
    const rawVal = String(dyn?.[fieldId] || '').trim();
    if (!rawVal) continue;
    sawOwnerField = true;
    const parsed = parseOwnerValueWithReason(rawVal);
    if (parsed.hint) return { hint: parsed.hint, reason: null, source: 'field-id' };
    return { hint: null, reason: parsed.reason || 'invalid_owner_format', source: 'field-id' };
  }

  const lines = String(rawText || '').split(/\r?\n/);
  let sawOwnerLine = false;
  for (const line of lines) {
    const normalized = normalizeAscii(line);
    if (!OWNER_LINE_PREFIX_EFFECTIVE_RE.test(normalized)) continue;
    sawOwnerLine = true;
    const value = line.replace(/^\s*[-*]?\s*[^:]+:\s*/, '');
    const parsed = parseOwnerValueWithReason(value);
    if (parsed.hint) return { hint: parsed.hint, reason: null, source: 'line' };
    return { hint: null, reason: parsed.reason || 'invalid_owner_format', source: 'line' };
  }
  for (const line of lines) {
    const candidates = buildOwnerFallbackCandidatesFromLine(line);
    for (const candidate of candidates) {
      if (candidate.includes(':')) continue;
      const parsed = parseOwnerValueWithReason(candidate);
      if (parsed.hint) return { hint: parsed.hint, reason: null, source: 'line-fallback' };
    }
  }
  if (sawOwnerField || sawOwnerLine) return { hint: null, reason: 'invalid_owner_format', source: sawOwnerField ? 'field' : 'line' };
  return { hint: null, reason: 'no_owner_hint', source: null };
}

export function ownerTimelineHintReasonToMessage(reason) {
  if (!reason || reason === 'no_owner_hint' || reason === 'empty') return '';
  const sample = 'Lạc Nam (26) ?';
  switch (reason) {
    case 'missing_chapter':
      return `Không tự tạo mốc được: thiếu chương. Mẫu: ${sample}`;
    case 'invalid_chapter':
      return `Không tự tạo mốc được: chương chưa đúng dạng (số trong ngoặc). Mẫu: ${sample}`;
    case 'empty_owner':
      return `Không tự tạo mốc được: thiếu tên nhân vật (phần trước ngoặc). Mẫu: ${sample}`;
    case 'invalid_label_token':
      return `Không tự tạo mốc được: nhãn chỉ nhận ?, !, !!, ..., x. Mẫu: ${sample}`;
    default:
      return `Không tự tạo mốc được: định dạng chưa đúng. Mẫu: ${sample}`;
  }
}

export function ownerMilestoneApplyReasonToMessage(result) {
  if (!result || result.applied) return '';
  const ownerName = String(result.ownerName || '').trim();
  switch (result.reason) {
    case 'owner_ambiguous':
      return ownerName
        ? `Khong tu tao moc AUTO: "${ownerName}" dang khop nhieu the nhan vat. Hay doi ten/alias ro hon.`
        : 'Khong tu tao moc AUTO: ten nhan vat dang khop nhieu the.';
    case 'owner_not_found':
      return ownerName
        ? `Khong tu tao moc AUTO: khong tim thay the nhan vat "${ownerName}".`
        : 'Khong tu tao moc AUTO: khong tim thay the nhan vat.';
    default:
      return '';
  }
}

function strongerLabelId(a, b) {
  const ra = LABEL_RANK[a ?? 'null'] ?? 0;
  const rb = LABEL_RANK[b ?? 'null'] ?? 0;
  return rb > ra ? b : a;
}

function splitEventParts(body) {
  return String(body || '')
    .split(' · ')
    .map((x) => x.trim())
    .filter(Boolean);
}

function isAutoOwnerMilestone(ms) {
  if (!ms || typeof ms !== 'object') return false;
  if (ms.meta?.source === 'auto-owner') return true;
  return typeof ms.id === 'string' && ms.id.startsWith('ms-auto-');
}

function normalizeItemRef(itemRef) {
  if (itemRef && typeof itemRef === 'object' && !Array.isArray(itemRef)) {
    const itemName = String(itemRef.name || '').trim();
    const itemEntityId = String(itemRef.entityId || '').trim();
    return { itemName, itemEntityId };
  }
  return { itemName: String(itemRef || '').trim(), itemEntityId: '' };
}

function milestoneMatchesItem(ms, itemPart, itemEntityId) {
  if (!ms || !isAutoOwnerMilestone(ms)) return false;
  const msItemId = String(ms.meta?.itemEntityId || '').trim();
  if (itemEntityId) return msItemId === itemEntityId;
  const parsed = parseMilestoneLabel(ms?.event);
  const parts = splitEventParts(parsed.body || ms?.event);
  return parts.includes(itemPart);
}

function backfillLegacyAutoOwnerMilestonesForItem(entity, itemPart, itemEntityId, itemWiki) {
  if (!entity || !Array.isArray(entity.milestones) || !itemEntityId) return 0;
  let patched = 0;
  entity.milestones = entity.milestones.map((ms) => {
    if (!isAutoOwnerMilestone(ms)) return ms;
    const msItemId = String(ms.meta?.itemEntityId || '').trim();
    if (msItemId) return ms;
    const parsed = parseMilestoneLabel(ms?.event);
    const parts = splitEventParts(parsed.body || ms?.event);
    if (!parts.includes(itemPart)) return ms;
    patched += 1;
    return {
      ...ms,
      meta: {
        ...(ms.meta || {}),
        source: 'auto-owner',
        itemWiki: String(ms.meta?.itemWiki || itemWiki || '').trim() || undefined,
        itemEntityId,
      },
    };
  });
  return patched;
}

function cleanupOwnerMilestonePartsByItem(entity, itemPart, options = {}) {
  if (!entity || !Array.isArray(entity.milestones) || !itemPart) return 0;
  const onlyAuto = options.onlyAuto !== false;
  const itemEntityId = String(options.itemEntityId || '').trim();
  let removedParts = 0;
  const nextMilestones = [];
  for (const ms of entity.milestones) {
    if (onlyAuto && !isAutoOwnerMilestone(ms)) {
      nextMilestones.push(ms);
      continue;
    }
    if (onlyAuto && !milestoneMatchesItem(ms, itemPart, itemEntityId)) {
      nextMilestones.push(ms);
      continue;
    }
    const parsed = parseMilestoneLabel(ms?.event);
    const parts = splitEventParts(parsed.body || ms?.event);
    const kept = parts.filter((p) => {
      const isTarget = p === itemPart;
      if (isTarget) removedParts += 1;
      return !isTarget;
    });
    if (kept.length === 0) continue;
    if (kept.length === parts.length) {
      nextMilestones.push(ms);
      continue;
    }
    nextMilestones.push({ ...ms, event: applyMilestoneLabel(kept.join(' · '), parsed.labelId || null) });
  }
  entity.milestones = nextMilestones;
  return removedParts;
}

export function appendOwnerAcquisitionMilestone(novelData, hint, itemRef) {
  const { itemName, itemEntityId } = normalizeItemRef(itemRef);
  if (!novelData?.data || !hint?.ownerName || !Number.isFinite(hint?.chapter) || !itemName) return false;
  const tabsConfig = Array.isArray(novelData.tabsConfig) ? novelData.tabsConfig : [];
  const tabLabelByLonId = new Map();
  for (const t of tabsConfig) {
    if (t?.id) tabLabelByLonId.set(t.id, String(t.label || t.id));
  }
  const entryCandidates = [];
  for (const [lonId, lonData] of Object.entries(novelData.data || {})) {
    for (const [nhoId, tabData] of Object.entries(lonData || {})) {
      const entities = Array.isArray(tabData?.entities) ? tabData.entities : [];
      if (entities.length === 0) continue;
      const lonLabel = String(tabLabelByLonId.get(lonId) || lonId || '');
      const normLabel = normalizeAscii(lonLabel);
      const priority = lonId === 'nhan-vat' || /nhan\s*vat/.test(normLabel) ? 0 : 1;
      entryCandidates.push({ priority, entities, lonId, nhoId });
    }
  }
  entryCandidates.sort((a, b) => a.priority - b.priority);

  let targetEntity = null;
  for (const entry of entryCandidates) {
    const matched = findEquivalentEntityByName(entry.entities, hint.ownerName);
    if (matched?.entity) {
      targetEntity = matched.entity;
      break;
    }
  }
  if (!targetEntity) return false;

  if (!Array.isArray(targetEntity.milestones)) targetEntity.milestones = [];
  const chapterNum = parseInt(hint.chapter, 10) || 0;
  const itemWiki = `[[${itemName}]]`;
  if (!itemWiki.includes('[[') || itemWiki === '[[]]') return false;
  const itemPart = `Nhận được ${itemWiki}`;
  backfillLegacyAutoOwnerMilestonesForItem(targetEntity, itemPart, itemEntityId, itemWiki);

  // Upsert theo item: một item chỉ có 1 mốc auto trong timeline của nhân vật này.
  cleanupOwnerMilestonePartsByItem(targetEntity, itemPart, { onlyAuto: true, itemEntityId });

  const existingAtChapter = targetEntity.milestones.find(
    (m) =>
      milestoneMatchesItem(m, itemPart, itemEntityId) &&
      (parseInt(m?.chapter, 10) || 0) === chapterNum
  );
  if (!existingAtChapter) {
    targetEntity.milestones.push({
      id: `ms-auto-${Math.random().toString(36).slice(2, 9)}`,
      chapter: chapterNum,
      event: applyMilestoneLabel(itemPart, hint.labelId || 'uncertain'),
      snapshot: null,
      meta: { source: 'auto-owner', itemWiki, itemEntityId: itemEntityId || undefined },
    });
  } else {
    const parsed = parseMilestoneLabel(existingAtChapter.event);
    let body = String(parsed.body || existingAtChapter.event || '').trim();
    if (!body.includes(itemWiki) && !splitEventParts(body).includes(itemPart)) {
      body = body ? `${body} · ${itemPart}` : itemPart;
    }
    const nextLabel = strongerLabelId(parsed.labelId, hint.labelId || 'uncertain');
    existingAtChapter.event = applyMilestoneLabel(body, nextLabel || null);
  }

  targetEntity.milestones.sort((a, b) => (parseInt(a?.chapter, 10) || 0) - (parseInt(b?.chapter, 10) || 0));
  return true;
}

export function appendOwnerAcquisitionMilestoneDetailed(novelData, hint, itemRef) {
  const { itemName, itemEntityId } = normalizeItemRef(itemRef);
  if (!novelData?.data || !hint?.ownerName || !Number.isFinite(hint?.chapter) || !itemName) {
    return { applied: false, reason: 'invalid_input', ownerName: String(hint?.ownerName || '').trim() };
  }
  const tabsConfig = Array.isArray(novelData.tabsConfig) ? novelData.tabsConfig : [];
  const tabLabelByLonId = new Map();
  for (const t of tabsConfig) {
    if (t?.id) tabLabelByLonId.set(t.id, String(t.label || t.id));
  }
  const entryCandidates = [];
  for (const [lonId, lonData] of Object.entries(novelData.data || {})) {
    for (const [nhoId, tabData] of Object.entries(lonData || {})) {
      const entities = Array.isArray(tabData?.entities) ? tabData.entities : [];
      if (entities.length === 0) continue;
      const lonLabel = String(tabLabelByLonId.get(lonId) || lonId || '');
      const normLabel = normalizeAscii(lonLabel);
      const priority = lonId === 'nhan-vat' || /nhan\s*vat/.test(normLabel) ? 0 : 1;
      entryCandidates.push({ priority, entities, lonId, nhoId });
    }
  }
  entryCandidates.sort((a, b) => a.priority - b.priority);

  let bestPriority = Number.POSITIVE_INFINITY;
  const matchedEntities = [];
  const seenEntities = new Set();
  for (const entry of entryCandidates) {
    const matches = findEquivalentEntitiesByName(entry.entities, hint.ownerName);
    if (matches.length === 0) continue;
    if (entry.priority > bestPriority) break;
    bestPriority = entry.priority;
    matches.forEach((match) => {
      const key = String(match?.entity?.id || `${entry.lonId}|${entry.nhoId}|${match?.index ?? ''}`);
      if (!key || seenEntities.has(key)) return;
      seenEntities.add(key);
      matchedEntities.push(match.entity);
    });
  }

  if (matchedEntities.length === 0) {
    return { applied: false, reason: 'owner_not_found', ownerName: String(hint.ownerName || '').trim() };
  }
  if (matchedEntities.length > 1) {
    return {
      applied: false,
      reason: 'owner_ambiguous',
      ownerName: String(hint.ownerName || '').trim(),
      candidateNames: matchedEntities.map((entity) => String(entity?.name || '').trim()).filter(Boolean),
    };
  }

  const ok = appendOwnerAcquisitionMilestone(novelData, hint, { name: itemName, entityId: itemEntityId });
  return {
    applied: ok,
    reason: ok ? null : 'owner_not_found',
    ownerName: String(hint.ownerName || '').trim(),
    ownerEntityId: ok ? String(matchedEntities[0]?.id || '').trim() : '',
  };
}

export function removeOwnerAcquisitionMilestonesByItem(novelData, itemRef) {
  const { itemName, itemEntityId } = normalizeItemRef(itemRef);
  if (!novelData?.data || !itemName) return 0;
  const itemWiki = `[[${itemName}]]`;
  if (!itemWiki.includes('[[') || itemWiki === '[[]]') return 0;
  const itemPart = `Nhận được ${itemWiki}`;
  let removedTotal = 0;
  for (const lonData of Object.values(novelData.data || {})) {
    if (!lonData || typeof lonData !== 'object') continue;
    for (const tabData of Object.values(lonData)) {
      const entities = Array.isArray(tabData?.entities) ? tabData.entities : [];
      for (const ent of entities) {
        removedTotal += cleanupOwnerMilestonePartsByItem(ent, itemPart, { onlyAuto: true, itemEntityId });
      }
    }
  }
  return removedTotal;
}

export function syncAutoOwnerMilestonesItemRename(novelData, itemRef) {
  const { itemName: oldName, itemEntityId } = normalizeItemRef({
    name: itemRef?.oldName,
    entityId: itemRef?.entityId,
  });
  const nextName = String(itemRef?.newName || '').trim();
  if (!novelData?.data || !nextName) return 0;

  const oldWiki = oldName ? `[[${oldName}]]` : '';
  const nextWiki = `[[${nextName}]]`;
  const oldPart = oldWiki ? `Nhận được ${oldWiki}` : '';
  const nextPart = `Nhận được ${nextWiki}`;
  let changed = 0;

  for (const lonData of Object.values(novelData.data || {})) {
    if (!lonData || typeof lonData !== 'object') continue;
    for (const tabData of Object.values(lonData)) {
      const entities = Array.isArray(tabData?.entities) ? tabData.entities : [];
      for (const ent of entities) {
        if (!Array.isArray(ent?.milestones)) continue;
        ent.milestones = ent.milestones.map((ms) => {
          if (!isAutoOwnerMilestone(ms)) return ms;
          const msItemId = String(ms.meta?.itemEntityId || '').trim();
          const byId = itemEntityId && msItemId && msItemId === itemEntityId;
          const byLegacyWiki = !itemEntityId && oldWiki && String(ms.meta?.itemWiki || '').trim() === oldWiki;
          if (!byId && !byLegacyWiki) return ms;

          const parsed = parseMilestoneLabel(ms?.event);
          const parts = splitEventParts(parsed.body || ms?.event);
          const mapped = parts.map((p) => (oldPart && p === oldPart ? nextPart : p));
          const nextEvent = applyMilestoneLabel(mapped.join(' · '), parsed.labelId || null);
          changed += 1;
          return {
            ...ms,
            event: nextEvent,
            meta: {
              ...(ms.meta || {}),
              source: 'auto-owner',
              itemWiki: nextWiki,
              itemEntityId: itemEntityId || msItemId || undefined,
            },
          };
        });
      }
    }
  }
  return changed;
}

function buildTabConfigLookupMap(tabsConfig = []) {
  const map = new Map();
  (Array.isArray(tabsConfig) ? tabsConfig : []).forEach((lonTab) => {
    const lonId = String(lonTab?.id || '').trim();
    if (!lonId) return;
    (lonTab?.subTabs || []).forEach((nhoTab) => {
      const nhoId = String(nhoTab?.id || '').trim();
      if (!nhoId) return;
      map.set(`${lonId}::${nhoId}`, nhoTab);
    });
  });
  return map;
}

export function syncAllAutoOwnerTimelineMilestonesForNovel(novelData) {
  if (!novelData?.data || typeof novelData.data !== 'object') {
    return { changed: false, appliedCount: 0, warningCount: 0 };
  }
  const tabConfigLookup = buildTabConfigLookupMap(novelData.tabsConfig || []);
  let appliedCount = 0;
  let warningCount = 0;

  Object.entries(novelData.data || {}).forEach(([lonId, lonData]) => {
    if (!lonData || typeof lonData !== 'object') return;
    if (lonId === 'nhan-vat') return;
    Object.entries(lonData).forEach(([nhoId, tabData]) => {
      const entities = Array.isArray(tabData?.entities) ? tabData.entities : [];
      if (entities.length === 0) return;
      const tabConfig = tabConfigLookup.get(`${lonId}::${nhoId}`) || null;
      const fieldsTemplate = Array.isArray(tabConfig?.fieldsTemplate) ? tabConfig.fieldsTemplate : [];
      entities.forEach((entity) => {
        if (!entity || typeof entity !== 'object') return;
        const hintDetail = parseOwnerTimelineHintDetailed({
          dynamicData: entity.dynamicData || {},
          fieldsTemplate,
          rawText: entity.rawText || entity.info || '',
        });
        const hint = hintDetail?.hint || null;
        if (!hint) return;
        const result = appendOwnerAcquisitionMilestoneDetailed(
          novelData,
          hint,
          { name: String(entity.name || '').trim(), entityId: String(entity.id || '').trim() }
        );
        if (result.applied) {
          appliedCount += 1;
        } else if (result.reason === 'owner_ambiguous' || result.reason === 'owner_not_found') {
          warningCount += 1;
        }
      });
    });
  });

  return {
    changed: appliedCount > 0,
    appliedCount,
    warningCount,
  };
}

export const OWNER_TOKEN_GUIDE_TEXT =
  '[?] Chưa rõ · [!] Quan trọng · [!!] Bước ngoặt · [...] Xuyên suốt · [x] Tạm bỏ';

export const OWNER_HINT_INPUT_FORMAT_TEXT = 'Định dạng chung: Tên nhân vật (số chương) ?';
export const OWNER_HINT_PREFIX_GUIDE_TEXT =
  'Prefix hỗ trợ: Người sở hữu:, Chủ nhân:, Người sử dụng:, Người tu luyện:, Truyền nhân:, Khế chủ:';
