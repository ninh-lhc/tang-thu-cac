import { findEquivalentEntityByName } from './entityNameIdentity.js';

const AUTO_REL_TITLE = '## Quan hệ bản đồ - thế lực (tự động)';
const AUTO_REL_END = '> (Khối tự động, không cần sửa tay)';
const RELATED_TITLE = '## Vị trí';
const RELATED_END = '> (Tự động cập nhật từ các thẻ liên quan)';

function normalizeToken(text) {
  return String(text || '')
    .replace(/\[\[|\]\]/g, '')
    .trim();
}

function splitStatusTokens(statusLine) {
  return String(statusLine || '')
    .split(/\s*[—–-]\s*/g)
    .map((s) => normalizeToken(s))
    .filter(Boolean);
}

export function parseRelationHierarchyFromStatus(statusLine) {
  const tokens = splitStatusTokens(statusLine);
  if (tokens.length < 2) return null;
  let categoryLabel = '';
  let rankLabel = '';
  let chain = [];
  if (tokens.length >= 3) {
    categoryLabel = tokens[0];
    rankLabel = tokens[1];
    chain = tokens.slice(2);
  } else {
    rankLabel = tokens[0];
    chain = tokens.slice(1);
  }
  if (chain.length === 0) return null;
  return { categoryLabel, rankLabel, chain };
}

function normalizeAscii(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();
}

export function isAutoRelationScopeLonId(lonId, parentLabel = '') {
  const id = normalizeAscii(lonId);
  if (id === 'the-luc' || id === 'ban-do') return true;
  const parent = normalizeAscii(parentLabel);
  return parent === 'the luc' || parent === 'ban do';
}

function relationLabelAt(index) {
  if (index === 0) return 'Trực thuộc';
  if (index === 1) return 'Khu vực';
  if (index === 2) return 'Thế giới';
  return `Tầng mở rộng ${index - 2}`;
}

const RANK_WORD_SCORE = new Map([
  ['nhat', 1],
  ['mot', 1],
  ['nhi', 2],
  ['hai', 2],
  ['tam', 3],
  ['ba', 3],
  ['tu', 4],
  ['bon', 4],
  ['ngu', 5],
  ['nam', 5],
  ['luc', 6],
  ['sau', 6],
  ['that', 7],
  ['bay', 7],
  ['bat', 8],
  ['chin', 9],
  ['cuu', 9],
]);

function rankScoreFromStatus(statusLine) {
  const parsed = parseRelationHierarchyFromStatus(statusLine);
  const source = parsed?.rankLabel || statusLine;
  const s = normalizeAscii(source);
  if (!s) return Number.POSITIVE_INFINITY;
  if (s.includes('bat cap')) return 9999;
  const mNum = s.match(/(\d{1,3})\s*cap/);
  if (mNum) return parseInt(mNum[1], 10);
  const mWord = s.match(/\b(nhat|mot|nhi|hai|tam|ba|tu|bon|ngu|nam|luc|sau|that|bay|bat|chin|cuu)\b/);
  if (mWord) return RANK_WORD_SCORE.get(mWord[1]) || Number.POSITIVE_INFINITY;
  return Number.POSITIVE_INFINITY;
}

function buildAutoRelationBlock(parsed) {
  const lines = [
    AUTO_REL_TITLE,
    parsed.categoryLabel ? `- Loại hình: ${parsed.categoryLabel}` : null,
    `- Cấp bậc: ${parsed.rankLabel}`,
  ].filter(Boolean);
  parsed.chain.forEach((name, idx) => {
    lines.push(`- ${relationLabelAt(idx)}: [[${name}]]`);
  });
  lines.push(AUTO_REL_END);
  return lines.join('\n');
}

export function upsertAutoRelationDetailNote(infoText, statusLine) {
  const parsed = parseRelationHierarchyFromStatus(statusLine);
  if (!parsed) return String(infoText || '');

  const src = String(infoText || '')
    .replace(/<!--ttc:auto-rel:start-->/g, '')
    .replace(/<!--ttc:auto-rel:end-->/g, '')
    .trimEnd();
  const block = buildAutoRelationBlock(parsed);
  const replaceRe = /## Quan hệ bản đồ - thế lực \(tự động\)[\s\S]*?> \(Khối tự động, không cần sửa tay\)/;
  if (replaceRe.test(src)) return src.replace(replaceRe, block);

  if (!src) return block;
  return `${src}\n\n${block}`;
}

function buildRelatedEntry(sourceName, statusLine) {
  const parsed = parseRelationHierarchyFromStatus(statusLine);
  const category = String(parsed?.categoryLabel || 'Khác').trim() || 'Khác';
  return {
    name: String(sourceName || '').trim(),
    status: String(statusLine || '').trim(),
    rank: rankScoreFromStatus(statusLine),
    category,
  };
}

function renderRelatedBlock(entries) {
  const lines = [RELATED_TITLE];
  const grouped = new Map();
  entries.forEach((e) => {
    const k = String(e.category || 'Khác').trim() || 'Khác';
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k).push(e);
  });
  const categories = [...grouped.keys()].sort((a, b) => normalizeAscii(a).localeCompare(normalizeAscii(b)));
  categories.forEach((cat) => {
    lines.push(`## ${cat}`);
    grouped.get(cat).forEach((e) => {
      lines.push(`- [[${e.name}]] (${e.status || 'chuỗi phân tầng'})`);
    });
  });
  lines.push(RELATED_END);
  return lines.join('\n');
}

function parseRelatedBlockEntries(blockText) {
  const lines = String(blockText || '').split(/\r?\n/);
  const out = [];
  const re = /^\s*-\s*\[\[([^\]]+)\]\]\s*\((.*)\)\s*$/;
  let currentCategory = '';
  lines.forEach((line) => {
    const hm = line.match(/^\s*##\s+(.+?)\s*$/);
    if (hm) {
      currentCategory = hm[1];
      return;
    }
    const m = line.match(re);
    if (!m) return;
    const row = buildRelatedEntry(m[1], m[2]);
    if (currentCategory) row.category = currentCategory;
    out.push(row);
  });
  return out;
}

function sortRelatedEntries(entries) {
  return [...entries].sort((a, b) => {
    const c = normalizeAscii(a.category).localeCompare(normalizeAscii(b.category));
    if (c !== 0) return c;
    if (a.rank !== b.rank) return a.rank - b.rank;
    return normalizeAscii(a.name).localeCompare(normalizeAscii(b.name));
  });
}

function upsertRelatedBacklinkNote(infoText, sourceName, statusLine) {
  const source = String(sourceName || '').trim();
  if (!source) return String(infoText || '');
  const src = String(infoText || '').trimEnd();
  const nextEntry = buildRelatedEntry(source, statusLine);
  const blockRe = /#{1,3}\s*Vị trí[\s\S]*?> \(Tự động cập nhật từ các thẻ liên quan\)/;
  const legacyBlockRe = /## Liên kết liên quan \(tự động\)[\s\S]*?> \(Tự động cập nhật từ các thẻ liên quan\)/;

  if (!blockRe.test(src) && !legacyBlockRe.test(src)) {
    const block = renderRelatedBlock([nextEntry]);
    return src ? `${src}\n\n${block}` : block;
  }

  const oldBlock = src.match(blockRe)?.[0] || src.match(legacyBlockRe)?.[0] || '';
  const existing = parseRelatedBlockEntries(oldBlock);
  const hasSource = existing.some((x) => normalizeAscii(x.name) === normalizeAscii(source));
  const mergedEntries = hasSource
    ? existing.map((x) => (normalizeAscii(x.name) === normalizeAscii(source) ? nextEntry : x))
    : [...existing, nextEntry];
  const sorted = sortRelatedEntries(mergedEntries);
  const merged = renderRelatedBlock(sorted);
  if (blockRe.test(src)) return src.replace(blockRe, merged);
  return src.replace(legacyBlockRe, merged);
}

function iterAllCollectionEntities(novelData, cb) {
  const data = novelData?.data || {};
  for (const [, lonData] of Object.entries(data)) {
    for (const [, nhoData] of Object.entries(lonData || {})) {
      const entities = Array.isArray(nhoData?.entities) ? nhoData.entities : [];
      cb(entities);
    }
  }
}

function findEntityGlobalByName(novelData, name) {
  let hit = null;
  iterAllCollectionEntities(novelData, (entities) => {
    if (hit) return;
    const matched = findEquivalentEntityByName(entities, name);
    if (matched?.entity) hit = matched.entity;
  });
  return hit;
}

export function applyAutoRelationNotesForEntity(novelData, options) {
  const sourceEntity = options?.sourceEntity || null;
  const sourceLonId = options?.sourceLonId || '';
  const sourceParentLabel = options?.sourceParentLabel || '';
  const statusLine = String(options?.statusLine || '').trim();
  if (!sourceEntity) return { applied: false, touchedTargets: 0 };
  if (!isAutoRelationScopeLonId(sourceLonId, sourceParentLabel)) return { applied: false, touchedTargets: 0 };

  const parsed = parseRelationHierarchyFromStatus(statusLine);
  if (!parsed) return { applied: false, touchedTargets: 0 };

  sourceEntity.info = upsertAutoRelationDetailNote(sourceEntity.info || '', statusLine);

  let touchedTargets = 0;
  parsed.chain.forEach((name) => {
    const target = findEntityGlobalByName(novelData, name);
    if (!target || target.id === sourceEntity.id) return;
    const before = String(target.info || '');
    const after = upsertRelatedBacklinkNote(before, sourceEntity.name, statusLine);
    if (after !== before) {
      target.info = after;
      touchedTargets++;
    }
  });

  return { applied: true, touchedTargets };
}
