import { findEquivalentEntityByName } from './entityNameIdentity.js';
import {
  isBeyondRankLabel,
  normalizeAsciiText,
  parseRankNumber as parseStatusRankNumber,
  parseStatusHierarchy,
  splitStatusHierarchyTokens,
} from './statusHierarchyParser.js';

const AUTO_REL_TITLE = '## Quan hệ bản đồ - thế lực (tự động)';
const AUTO_REL_END = '> (Khối tự động, không cần sửa tay)';
const RELATED_TITLE = '## Vị trí';
const RELATED_END = '> (Tự động cập nhật từ các thẻ liên quan)';

function escapeRegExp(text) {
  return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripMatchedBlocks(text, blockReGlobal) {
  const src = String(text || '');
  const matches = src.match(blockReGlobal) || [];
  if (matches.length === 0) return { cleaned: src, matches: [] };
  const cleaned = src
    .replace(blockReGlobal, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { cleaned, matches };
}

function dedupeRelatedEntriesByName(entries) {
  const byName = new Map();
  (entries || []).forEach((entry) => {
    const key = normalizeAsciiText(entry?.name);
    if (!key) return;
    // Keep the latest parsed row for a name when legacy data contains duplicates.
    byName.set(key, entry);
  });
  return [...byName.values()];
}

export function parseRelationHierarchyFromStatus(statusLine) {
  return parseStatusHierarchy(statusLine);
}

export function isAutoRelationScopeLonId(lonId, parentLabel = '') {
  const id = normalizeAsciiText(lonId);
  if (id === 'the-luc' || id === 'ban-do') return true;
  const parent = normalizeAsciiText(parentLabel);
  return parent === 'the luc' || parent === 'ban do';
}

function relationLabelAt(index) {
  if (index === 0) return 'Trực thuộc';
  if (index === 1) return 'Khu vực';
  if (index === 2) return 'Thế giới';
  return `Tầng mở rộng ${index - 2}`;
}

function rankScoreFromStatus(statusLine) {
  const parsed = parseRelationHierarchyFromStatus(statusLine);
  const source = parsed?.rankLabel || statusLine;
  if (isBeyondRankLabel(source)) return 9999;
  const rankNum = parseStatusRankNumber(source);
  if (Number.isFinite(rankNum)) return rankNum;
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
  const autoBlockReGlobal = new RegExp(`${escapeRegExp(AUTO_REL_TITLE)}[\\s\\S]*?${escapeRegExp(AUTO_REL_END)}`, 'g');
  const { cleaned, matches } = stripMatchedBlocks(src, autoBlockReGlobal);
  if (matches.length > 0) {
    return cleaned ? `${cleaned}\n\n${block}` : block;
  }

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
  const stripDuplicatedCategoryPrefix = (status, category) => {
    const raw = String(status || '').trim();
    if (!raw) return '';
    const catNorm = normalizeAsciiText(category);
    const tokens = splitStatusHierarchyTokens(raw);
    if (tokens.length <= 1) return raw;
    if (normalizeAsciiText(tokens[0]) !== catNorm) return raw;
    return tokens.slice(1).join(' - ');
  };
  const grouped = new Map();
  entries.forEach((e) => {
    const k = String(e.category || 'Khác').trim() || 'Khác';
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k).push(e);
  });
  const categories = [...grouped.keys()].sort((a, b) => normalizeAsciiText(a).localeCompare(normalizeAsciiText(b)));
  categories.forEach((cat) => {
    lines.push(`## ${cat}`);
    grouped.get(cat).forEach((e) => {
      const prettyStatus = stripDuplicatedCategoryPrefix(e.status, cat) || 'chuỗi phân tầng';
      lines.push(`- [[${e.name}]] (${prettyStatus})`);
    });
  });
  lines.push(RELATED_END);
  return lines.join('\n');
}

function parseRelatedBlockEntries(blockText) {
  const lines = String(blockText || '').split(/\r?\n/);
  const out = [];
  const re = /^\s*-\s*\[\[([^\]]+)\]\]\s*\((.*)\)\s*$/;
  const relatedTitle = normalizeAsciiText(RELATED_TITLE.replace(/^##\s*/, ''));
  let currentCategory = '';
  lines.forEach((line) => {
    const hm = line.match(/^\s*#{2,3}\s+(.+?)\s*$/);
    if (hm) {
      const heading = String(hm[1] || '').trim();
      // Ignore the block title heading itself; only keep real category headings.
      currentCategory = normalizeAsciiText(heading) === relatedTitle ? '' : heading;
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
    const c = normalizeAsciiText(a.category).localeCompare(normalizeAsciiText(b.category));
    if (c !== 0) return c;
    if (a.rank !== b.rank) return a.rank - b.rank;
    return normalizeAsciiText(a.name).localeCompare(normalizeAsciiText(b.name));
  });
}

function upsertRelatedBacklinkNote(infoText, sourceName, statusLine) {
  const source = String(sourceName || '').trim();
  if (!source) return String(infoText || '');
  const src = String(infoText || '').trimEnd();
  const nextEntry = buildRelatedEntry(source, statusLine);
  const blockPattern = `#{1,3}\\s*${escapeRegExp(RELATED_TITLE.replace(/^##\s*/, ''))}[\\s\\S]*?${escapeRegExp(RELATED_END)}`;
  const blockReGlobal = new RegExp(blockPattern, 'g');
  const legacyBlockPattern = `${escapeRegExp('## Liên kết liên quan (tự động)')}[\\s\\S]*?${escapeRegExp(RELATED_END)}`;
  const legacyBlockReGlobal = new RegExp(legacyBlockPattern, 'g');
  const currentBlocks = src.match(blockReGlobal) || [];
  const legacyBlocks = src.match(legacyBlockReGlobal) || [];

  if (currentBlocks.length === 0 && legacyBlocks.length === 0) {
    const block = renderRelatedBlock([nextEntry]);
    return src ? `${src}\n\n${block}` : block;
  }

  const existing = dedupeRelatedEntriesByName(
    [...currentBlocks, ...legacyBlocks].flatMap((blockText) => parseRelatedBlockEntries(blockText))
  );
  const byName = new Map(existing.map((entry) => [normalizeAsciiText(entry.name), entry]));
  byName.set(normalizeAsciiText(source), nextEntry);
  const mergedEntries = [...byName.values()];
  const sorted = sortRelatedEntries(mergedEntries);
  const merged = renderRelatedBlock(sorted);
  const cleanedSrc = src
    .replace(blockReGlobal, '')
    .replace(legacyBlockReGlobal, '')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
  return cleanedSrc ? `${cleanedSrc}\n\n${merged}` : merged;
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


