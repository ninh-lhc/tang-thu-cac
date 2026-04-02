import { findEquivalentEntityByName } from './entityNameIdentity.js';
import {
  isBeyondRankLabel,
  normalizeAsciiText,
  parseRankNumber as parseStatusRankNumber,
  parseStatusHierarchy,
  splitStatusHierarchyTokens,
} from './statusHierarchyParser.js';

const AUTO_REL_TITLE = '## Quan há»‡ báº£n Ä‘á»“ - tháº¿ lá»±c (tá»± Ä‘á»™ng)';
const AUTO_REL_END = '> (Khá»‘i tá»± Ä‘á»™ng, khÃ´ng cáº§n sá»­a tay)';
const RELATED_TITLE = '## Vá»‹ trÃ­';
const RELATED_END = '> (Tá»± Ä‘á»™ng cáº­p nháº­t tá»« cÃ¡c tháº» liÃªn quan)';

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

function buildAutoRelationBlockRegexGlobal() {
  return new RegExp(`${escapeRegExp(AUTO_REL_TITLE)}[\\s\\S]*?${escapeRegExp(AUTO_REL_END)}`, 'g');
}

function buildRelatedBlockRegexGlobal() {
  const blockPattern = `#{1,3}\\s*${escapeRegExp(RELATED_TITLE.replace(/^##\s*/, ''))}[\\s\\S]*?${escapeRegExp(RELATED_END)}`;
  return new RegExp(blockPattern, 'g');
}

function buildLegacyRelatedBlockRegexGlobal() {
  const legacyBlockPattern = `${escapeRegExp('## LiÃªn káº¿t liÃªn quan (tá»± Ä‘á»™ng)')}[\\s\\S]*?${escapeRegExp(RELATED_END)}`;
  return new RegExp(legacyBlockPattern, 'g');
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
  if (index === 0) return 'Trá»±c thuá»™c';
  if (index === 1) return 'Khu vá»±c';
  if (index === 2) return 'Tháº¿ giá»›i';
  return `Táº§ng má»Ÿ rá»™ng ${index - 2}`;
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
    parsed.categoryLabel ? `- Loáº¡i hÃ¬nh: ${parsed.categoryLabel}` : null,
    `- Cáº¥p báº­c: ${parsed.rankLabel}`,
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
  const autoBlockReGlobal = buildAutoRelationBlockRegexGlobal();
  const { cleaned, matches } = stripMatchedBlocks(src, autoBlockReGlobal);
  if (matches.length > 0) {
    return cleaned ? `${cleaned}\n\n${block}` : block;
  }

  if (!src) return block;
  return `${src}\n\n${block}`;
}

function buildRelatedEntry(sourceName, statusLine) {
  const parsed = parseRelationHierarchyFromStatus(statusLine);
  const category = String(parsed?.categoryLabel || 'KhÃ¡c').trim() || 'KhÃ¡c';
  return {
    name: String(sourceName || '').trim(),
    status: String(statusLine || '').trim(),
    rank: rankScoreFromStatus(statusLine),
    category,
  };
}

function compareNormalizedText(a, b) {
  return normalizeAsciiText(a).localeCompare(normalizeAsciiText(b));
}

function stripDuplicatedCategoryPrefix(status, category) {
  const raw = String(status || '').trim();
  if (!raw) return '';
  const catNorm = normalizeAsciiText(category);
  const tokens = splitStatusHierarchyTokens(raw);
  if (tokens.length <= 1) return raw;
  if (normalizeAsciiText(tokens[0]) !== catNorm) return raw;
  return tokens.slice(1).join(' - ');
}

function buildRelatedRenderContext(entry, targetName) {
  const parsed = parseRelationHierarchyFromStatus(entry?.status);
  const chain = Array.isArray(parsed?.chain) ? parsed.chain : [];
  const targetNorm = normalizeAsciiText(targetName);
  const targetIndex = targetNorm
    ? chain.findIndex((name) => normalizeAsciiText(name) === targetNorm)
    : -1;
  return {
    ...entry,
    parsed,
    targetIndex,
    descendants: targetIndex > 0 ? chain.slice(0, targetIndex).reverse() : [],
  };
}

function sortTreeItems(items) {
  return [...items].sort((a, b) => {
    const categoryCmp = compareNormalizedText(a.category, b.category);
    if (categoryCmp !== 0) return categoryCmp;
    if (a.rank !== b.rank) return a.rank - b.rank;
    return compareNormalizedText(a.name, b.name);
  });
}

function buildTreeItemMeta(entry) {
  return [entry.category, entry.parsed?.rankLabel].filter(Boolean).join(' - ');
}

function renderTreeRelatedBlock(entries, targetName) {
  const lines = [RELATED_TITLE];
  const root = { children: new Map(), items: [] };

  const getOrCreateChildNode = (parent, label) => {
    const key = normalizeAsciiText(label);
    if (!parent.children.has(key)) {
      parent.children.set(key, { label, children: new Map(), items: [] });
    }
    return parent.children.get(key);
  };

  entries
    .map((entry) => buildRelatedRenderContext(entry, targetName))
    .forEach((entry) => {
      if (entry.descendants.length === 0) {
        root.items.push(entry);
        return;
      }
      let cursor = root;
      entry.descendants.forEach((nodeLabel) => {
        cursor = getOrCreateChildNode(cursor, nodeLabel);
      });
      cursor.items.push(entry);
    });

  const renderNode = (node, depth) => {
    const indent = '  '.repeat(depth);
    lines.push(`${indent}- [[${node.label}]]`);
    [...node.children.values()]
      .sort((a, b) => compareNormalizedText(a.label, b.label))
      .forEach((child) => renderNode(child, depth + 1));
    sortTreeItems(node.items).forEach((entry) => {
      const itemIndent = '  '.repeat(depth + 1);
      lines.push(`${itemIndent}- [[${entry.name}]] (${buildTreeItemMeta(entry)})`);
    });
  };

  sortTreeItems(root.items).forEach((entry) => {
    lines.push(`- [[${entry.name}]] (${buildTreeItemMeta(entry)})`);
  });
  [...root.children.values()]
    .sort((a, b) => compareNormalizedText(a.label, b.label))
    .forEach((child) => renderNode(child, 0));

  lines.push(RELATED_END);
  return lines.join('\n');
}

function renderFlatRelatedBlock(entries) {
  const lines = [RELATED_TITLE];
  const grouped = new Map();
  entries.forEach((e) => {
    const k = String(e.category || 'Khác').trim() || 'Khác';
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k).push(e);
  });
  const categories = [...grouped.keys()].sort((a, b) => compareNormalizedText(a, b));
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

function renderRelatedBlock(entries, targetName = '') {
  const hasNestedHierarchy = (entries || []).some((entry) => {
    const context = buildRelatedRenderContext(entry, targetName);
    return context.targetIndex > 0 && context.descendants.length > 0;
  });
  if (hasNestedHierarchy) return renderTreeRelatedBlock(entries, targetName);
  return renderFlatRelatedBlock(entries);
}

function parseRelatedBlockEntries(blockText, targetName = '') {
  const lines = String(blockText || '').split(/\r?\n/);
  const out = [];
  const itemRe = /^(\s*)-\s*\[\[([^\]]+)\]\]\s*\((.*)\)\s*$/;
  const nodeRe = /^(\s*)-\s*\[\[([^\]]+)\]\]\s*$/;
  const relatedTitle = normalizeAsciiText(RELATED_TITLE.replace(/^##\s*/, ''));
  const legacyRelatedTitle = normalizeAsciiText('LiÃªn káº¿t liÃªn quan (tá»± Ä‘á»™ng)');
  let currentCategory = '';
  const locationStack = [];

  const getDepth = (indentText) => {
    const normalizedIndent = String(indentText || '').replace(/\t/g, '  ');
    return Math.floor(normalizedIndent.length / 2);
  };

  lines.forEach((line) => {
    const hm = line.match(/^\s*#{2,3}\s+(.+?)\s*$/);
    if (hm) {
      const heading = String(hm[1] || '').trim();
      // Ignore the block title heading itself; only keep real category headings.
      const headingNorm = normalizeAsciiText(heading);
      currentCategory =
        headingNorm === relatedTitle || headingNorm === legacyRelatedTitle ? '' : heading;
      return;
    }

    const nodeMatch = line.match(nodeRe);
    if (nodeMatch) {
      const depth = getDepth(nodeMatch[1]);
      locationStack.length = depth;
      locationStack[depth] = String(nodeMatch[2] || '').trim();
      return;
    }

    const itemMatch = line.match(itemRe);
    if (!itemMatch) return;
    const depth = getDepth(itemMatch[1]);
    const pathLabels = locationStack.slice(0, depth).filter(Boolean);
    let statusText = String(itemMatch[3] || '').trim();
    const parsedStatus = parseRelationHierarchyFromStatus(statusText);
    const shouldReconstructStatus =
      !!targetName && (pathLabels.length > 0 || (!currentCategory && !parsedStatus));
    if (shouldReconstructStatus) {
      const rebuiltTail = [...pathLabels].reverse();
      rebuiltTail.push(targetName);
      statusText = [statusText, ...rebuiltTail].filter(Boolean).join(' - ');
    }

    const row = buildRelatedEntry(itemMatch[2], statusText);
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

function upsertRelatedBacklinkNote(infoText, targetName, sourceName, statusLine) {
  const source = String(sourceName || '').trim();
  if (!source) return String(infoText || '');
  const src = String(infoText || '').trimEnd();
  const nextEntry = buildRelatedEntry(source, statusLine);
  const blockReGlobal = buildRelatedBlockRegexGlobal();
  const legacyBlockReGlobal = buildLegacyRelatedBlockRegexGlobal();
  const currentBlocks = src.match(blockReGlobal) || [];
  const legacyBlocks = src.match(legacyBlockReGlobal) || [];

  if (currentBlocks.length === 0 && legacyBlocks.length === 0) {
    const block = renderRelatedBlock([nextEntry], targetName);
    return src ? `${src}\n\n${block}` : block;
  }

  const existing = dedupeRelatedEntriesByName(
    [...currentBlocks, ...legacyBlocks].flatMap((blockText) => parseRelatedBlockEntries(blockText, targetName))
  );
  const byName = new Map(existing.map((entry) => [normalizeAsciiText(entry.name), entry]));
  byName.set(normalizeAsciiText(source), nextEntry);
  const mergedEntries = [...byName.values()];
  const sorted = sortRelatedEntries(mergedEntries);
  const merged = renderRelatedBlock(sorted, targetName);
  const cleanedSrc = src
    .replace(blockReGlobal, '')
    .replace(legacyBlockReGlobal, '')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
  return cleanedSrc ? `${cleanedSrc}\n\n${merged}` : merged;
}

export function cleanupAutoRelationLegacyInfoText(infoText, targetName = '') {
  let next = String(infoText || '')
    .replace(/<!--ttc:auto-rel:start-->/g, '')
    .replace(/<!--ttc:auto-rel:end-->/g, '')
    .trimEnd();

  const autoBlockReGlobal = buildAutoRelationBlockRegexGlobal();
  const autoBlocks = next.match(autoBlockReGlobal) || [];
  if (autoBlocks.length > 1) {
    const kept = autoBlocks[autoBlocks.length - 1].trim();
    const base = next
      .replace(autoBlockReGlobal, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    next = base ? `${base}\n\n${kept}` : kept;
  }

  const blockReGlobal = buildRelatedBlockRegexGlobal();
  const legacyBlockReGlobal = buildLegacyRelatedBlockRegexGlobal();
  const relatedBlocks = next.match(blockReGlobal) || [];
  const legacyRelatedBlocks = next.match(legacyBlockReGlobal) || [];
  if (relatedBlocks.length > 0 || legacyRelatedBlocks.length > 0) {
    const allEntries = [...relatedBlocks, ...legacyRelatedBlocks]
      .flatMap((blockText) => parseRelatedBlockEntries(blockText, targetName));
    const deduped = dedupeRelatedEntriesByName(allEntries);
    const merged = deduped.length > 0
      ? renderRelatedBlock(sortRelatedEntries(deduped), targetName)
      : [...relatedBlocks, ...legacyRelatedBlocks].slice(-1)[0];
    const base = next
      .replace(blockReGlobal, '')
      .replace(legacyBlockReGlobal, '')
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd();
    const normalized = merged ? merged.trim() : '';
    next = normalized ? (base ? `${base}\n\n${normalized}` : normalized) : base.trim();
  }

  return next;
}

export function cleanupAutoRelationLegacyInfoForNovel(novelData) {
  const data = novelData?.data;
  if (!data || typeof data !== 'object') return 0;
  let touched = 0;
  for (const lonData of Object.values(data)) {
    if (!lonData || typeof lonData !== 'object') continue;
    for (const nhoData of Object.values(lonData)) {
      const entities = Array.isArray(nhoData?.entities) ? nhoData.entities : [];
      entities.forEach((entity) => {
        if (!entity || typeof entity !== 'object') return;
        const before = String(entity.info || '');
        const after = cleanupAutoRelationLegacyInfoText(before, entity.name || '');
        if (after !== before) {
          entity.info = after;
          touched += 1;
        }
      });
    }
  }
  return touched;
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
    const after = upsertRelatedBacklinkNote(before, target.name || '', sourceEntity.name, statusLine);
    if (after !== before) {
      target.info = after;
      touchedTargets++;
    }
  });

  return { applied: true, touchedTargets };
}


