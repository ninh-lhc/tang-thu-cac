import { findEquivalentEntityByName } from './entityNameIdentity.js';
import { applyMilestoneLabel, parseMilestoneLabel } from './milestoneLabels.js';

const OWNER_LABEL_RE = /(nguoi\s*so\s*huu|ch[uủ]\s*nh[aâ]n)/i;
const OWNER_LINE_PREFIX_RE = /^\s*[-*]?\s*(nguoi\s*so\s*huu)\s*:\s*/i;
const OWNER_VALUE_RE = /^(.*?)\s*\((\d{1,6})\)\s*(\[(?:!!|!|\?|\.\.\.|x)\]|!!|!|\?|\.\.\.|x)?\s*$/i;

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
  const ownerName = String(m[1] || '').trim();
  if (!ownerName) return null;
  const chapter = parseInt(m[2], 10);
  if (!Number.isFinite(chapter) || chapter < 0) return null;
  const labelId = tokenToLabelId(m[3]);
  return { ownerName, chapter, labelId };
}

export function parseOwnerTimelineHint({ dynamicData, fieldsTemplate, rawText }) {
  const dyn = dynamicData && typeof dynamicData === 'object' ? dynamicData : {};
  const fields = Array.isArray(fieldsTemplate) ? fieldsTemplate : [];

  for (const f of fields) {
    const label = normalizeAscii(f?.label || '');
    if (!OWNER_LABEL_RE.test(label)) continue;
    const parsed = parseOwnerValue(dyn?.[f.id]);
    if (parsed) return parsed;
  }

  const lines = String(rawText || '').split(/\r?\n/);
  for (const line of lines) {
    const normalized = normalizeAscii(line);
    if (!OWNER_LINE_PREFIX_RE.test(normalized)) continue;
    const value = line.replace(/^\s*[-*]?\s*[^:]+:\s*/, '');
    const parsed = parseOwnerValue(value);
    if (parsed) return parsed;
  }
  return null;
}

function strongerLabelId(a, b) {
  const ra = LABEL_RANK[a ?? 'null'] ?? 0;
  const rb = LABEL_RANK[b ?? 'null'] ?? 0;
  return rb > ra ? b : a;
}

export function appendOwnerAcquisitionMilestone(novelData, hint, itemName) {
  if (!novelData?.data || !hint?.ownerName || !Number.isFinite(hint?.chapter) || !itemName) return false;
  const nhanVatRoot = novelData.data['nhan-vat'];
  if (!nhanVatRoot || typeof nhanVatRoot !== 'object') return false;

  let targetEntity = null;
  for (const [, tabData] of Object.entries(nhanVatRoot)) {
    const entities = Array.isArray(tabData?.entities) ? tabData.entities : [];
    const matched = findEquivalentEntityByName(entities, hint.ownerName);
    if (matched?.entity) {
      targetEntity = matched.entity;
      break;
    }
  }
  if (!targetEntity) return false;

  if (!Array.isArray(targetEntity.milestones)) targetEntity.milestones = [];
  const chapterNum = parseInt(hint.chapter, 10) || 0;
  const itemWiki = `[[${String(itemName).trim()}]]`;
  if (!itemWiki.includes('[[') || itemWiki === '[[]]') return false;

  const existingAtChapter = targetEntity.milestones.find((m) => (parseInt(m?.chapter, 10) || 0) === chapterNum);
  if (!existingAtChapter) {
    targetEntity.milestones.push({
      id: `ms-auto-${Math.random().toString(36).slice(2, 9)}`,
      chapter: chapterNum,
      event: applyMilestoneLabel(`Nhận được ${itemWiki}`, hint.labelId || 'uncertain'),
      snapshot: null,
    });
  } else {
    const parsed = parseMilestoneLabel(existingAtChapter.event);
    let body = String(parsed.body || existingAtChapter.event || '').trim();
    if (!body.includes(itemWiki)) {
      body = body ? `${body} · Nhận được ${itemWiki}` : `Nhận được ${itemWiki}`;
    }
    const nextLabel = strongerLabelId(parsed.labelId, hint.labelId || 'uncertain');
    existingAtChapter.event = applyMilestoneLabel(body, nextLabel || null);
  }

  targetEntity.milestones.sort((a, b) => (parseInt(a?.chapter, 10) || 0) - (parseInt(b?.chapter, 10) || 0));
  return true;
}

export const OWNER_TOKEN_GUIDE_TEXT =
  '[?] Chưa rõ · [!] Quan trọng · [!!] Bước ngoặt · [...] Xuyên suốt · [x] Tạm bỏ';

