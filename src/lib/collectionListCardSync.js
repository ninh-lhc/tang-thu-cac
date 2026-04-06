/**
 * Auto-sync list-card notes inside each collection tab.
 * A list card is any entity whose name starts with "Danh sach".
 * The helper keeps manual notes intact and only rewrites its AUTO block.
 */

import { normalizeAsciiText, parseRankNumber } from './statusHierarchyParser.js';
import { parseOwnerTimelineHint } from './autoOwnerMilestone.js';
import { findEquivalentEntityByName } from './entityNameIdentity.js';

const AUTO_LIST_START = '<!-- AUTO_COLLECTION_LIST:START -->';
const AUTO_LIST_END = '<!-- AUTO_COLLECTION_LIST:END -->';
const AUTO_LIST_TITLE = '# Danh m\u1ee5c th\u1ebb (AUTO)';

const ATTRIBUTE_GROUP_ORDER = [
  'bang',
  'hoa',
  'phong',
  'loi',
  'moc',
  'thuy',
  'tho',
  'am',
  'duong',
];

const TIER_GROUP_ORDER = [
  'than',
  'thien',
  'dia',
  'huyen',
  'linh',
  'hoang',
  'vu',
  'truc',
  'pham',
];

function safeString(value) {
  if (value == null || value === 'null' || value === 'undefined') return '';
  return String(value);
}

function normalize(value) {
  return normalizeAsciiText(value);
}

function mergeAutoBlock(baseText, start, end, blockBody) {
  const text = safeString(baseText);
  const sIdx = text.indexOf(start);
  const eIdx = text.indexOf(end);
  const payload = `${start}\n${blockBody}\n${end}`;
  if (sIdx >= 0 && eIdx > sIdx) {
    return `${text.slice(0, sIdx)}${payload}${text.slice(eIdx + end.length)}`.trim();
  }
  return `${text.trim()}\n\n${payload}`.trim();
}

function removeAutoBlock(baseText, start, end) {
  const text = safeString(baseText);
  const sIdx = text.indexOf(start);
  const eIdx = text.indexOf(end);
  if (sIdx < 0 || eIdx <= sIdx) return text.trim();
  return `${text.slice(0, sIdx)}${text.slice(eIdx + end.length)}`.trim();
}

function isCollectionTab(tabConfig) {
  return tabConfig?.viewType === 'collection-track';
}

function isListCardEntity(entity) {
  return normalize(entity?.name).startsWith('danh sach');
}

function pickFirstFilled(entity, fieldIds) {
  for (const fieldId of fieldIds) {
    const value = safeString(entity?.dynamicData?.[fieldId] || entity?.[fieldId]).trim();
    if (value) return value;
  }
  return '';
}

function extractOwnerName(rawValue) {
  const raw = safeString(rawValue).trim();
  if (!raw) return '';
  const noWiki = raw.replace(/^\[\[|\]\]$/g, '').trim();
  const chapterIdx = noWiki.search(/\(\d{1,6}\)/);
  const base = chapterIdx > 0 ? noWiki.slice(0, chapterIdx).trim() : noWiki;
  return base.replace(/^[^\p{L}\p{N}\[]+/u, '').trim();
}

function resolveOwnerLabel(entity, ownerLookupEntities = []) {
  const raw = pickFirstFilled(entity, [
    'f_chu',
    'f_owner',
    'f_nguoi_so_huu',
    'f_nguoi_su_dung',
    'f_nguoi_tu_luyen',
    'f_truyen_nhan',
    'f_khe_chu',
  ]);
  const ownerFromFields = extractOwnerName(raw);
  let ownerName = ownerFromFields;
  if (!ownerName) {
    const parsed = parseOwnerTimelineHint({
      dynamicData: entity?.dynamicData || {},
      fieldsTemplate: [],
      rawText: safeString(entity?.info || entity?.rawText),
    });
    ownerName = safeString(parsed?.ownerName).trim();
  }
  if (!ownerName) return '';
  const matched = findEquivalentEntityByName(ownerLookupEntities, ownerName);
  return safeString(matched?.entity?.name).trim() || ownerName;
}

function detectGroupingStrategy({ lonId = '', nhoId = '', tabLabel = '', parentLabel = '' } = {}) {
  const scope = normalize([lonId, nhoId, tabLabel, parentLabel].filter(Boolean).join(' '));

  if (scope.includes('di thuoc tinh')) {
    return {
      kind: 'attribute',
      getGroupLabel: (entity) => pickFirstFilled(entity, ['f_title', 'f_loai', 'f_status']),
    };
  }

  if (
    scope.includes('cong phap') ||
    scope.includes('vu ky') ||
    scope.includes('bi thuat') ||
    scope.includes('cam thuat') ||
    scope.includes('phap bao') ||
    scope.includes('binh khi') ||
    scope.includes('dan duoc') ||
    scope.includes('tran phap') ||
    scope.includes('goi qua') ||
    scope.includes('cua hang')
  ) {
    return {
      kind: 'tier',
      getGroupLabel: (entity) => pickFirstFilled(entity, ['f_cap', 'f_status', 'f_title']),
    };
  }

  if (scope.includes('canh gioi')) {
    return {
      kind: 'text',
      getGroupLabel: (entity) => pickFirstFilled(entity, ['f_status', 'f_title']),
    };
  }

  if (scope.includes('he thong tu luyen')) {
    return {
      kind: 'text',
      getGroupLabel: (entity) => pickFirstFilled(entity, ['f_title', 'f_status']),
    };
  }

  if (scope.includes('nhan vat')) {
    return {
      kind: 'text',
      getGroupLabel: (entity) => pickFirstFilled(entity, ['f_quan_he', 'f_title', 'f_status']),
    };
  }

  if (scope.includes('the luc')) {
    return {
      kind: 'text',
      getGroupLabel: (entity) => pickFirstFilled(entity, ['f_title', 'f_cap', 'f_status']),
    };
  }

  if (scope.includes('ban do') || scope.includes('dia danh') || scope.includes('bi canh')) {
    return {
      kind: 'text',
      getGroupLabel: (entity) => pickFirstFilled(entity, ['f_title', 'f_status']),
    };
  }

  return {
    kind: 'text',
    getGroupLabel: (entity) => pickFirstFilled(entity, ['f_title', 'f_cap', 'f_status']),
  };
}

function computeGroupOrder(kind, label) {
  const normalized = normalize(label);
  if (!normalized) return 10_000;

  if (kind === 'attribute') {
    const idx = ATTRIBUTE_GROUP_ORDER.findIndex((token) => normalized.includes(token));
    return idx >= 0 ? idx : 9_000;
  }

  if (kind === 'tier') {
    const tierIdx = TIER_GROUP_ORDER.findIndex((token) => normalized.includes(token));
    if (tierIdx >= 0) return tierIdx;
    const parsed = parseRankNumber(label);
    if (Number.isFinite(parsed)) return 100 + parsed;
    return 9_000;
  }

  return 5_000;
}

function buildAutoLines(records, strategy, ownerLookupEntities = []) {
  const items = Array.isArray(records) ? records : [];
  const lines = [AUTO_LIST_TITLE, '', `- T\u1ed5ng s\u1ed1 th\u1ebb: ${items.length}`, ''];

  if (items.length === 0) {
    lines.push('## Ch\u01b0a ph\u00e2n lo\u1ea1i (0)');
    lines.push('');
    lines.push('- Ch\u01b0a c\u00f3 th\u1ebb n\u00e0o trong tab n\u00e0y.');
    return lines;
  }

  const grouped = new Map();
  items.forEach((entity) => {
    const groupLabel = safeString(strategy.getGroupLabel(entity)).trim() || 'Ch\u01b0a ph\u00e2n lo\u1ea1i';
    if (!grouped.has(groupLabel)) grouped.set(groupLabel, []);
    grouped.get(groupLabel).push(entity);
  });

  const groupEntries = Array.from(grouped.entries()).sort((a, b) => {
    const orderDiff = computeGroupOrder(strategy.kind, a[0]) - computeGroupOrder(strategy.kind, b[0]);
    if (orderDiff !== 0) return orderDiff;
    return a[0].localeCompare(b[0], 'vi');
  });

  groupEntries.forEach(([groupLabel, entities], index) => {
    if (index > 0) lines.push('');
    lines.push(`## ${groupLabel} (${entities.length})`);
    lines.push('');
    [...entities]
      .sort((a, b) => safeString(a?.name).localeCompare(safeString(b?.name), 'vi'))
      .forEach((entity) => {
        const name = safeString(entity?.name).trim();
        if (!name) return;
        const owner = resolveOwnerLabel(entity, ownerLookupEntities);
        const ownerSuffix = owner ? ` - ${owner}` : '';
        lines.push(`- [[${name}]]${ownerSuffix}`);
      });
  });

  return lines;
}

function syncListCardsInTab(tabData, context, ownerLookupEntities) {
  const entities = Array.isArray(tabData?.entities) ? tabData.entities : [];
  const listCards = entities.filter(isListCardEntity);
  if (listCards.length === 0) return false;

  const normalEntities = entities.filter((entity) => !isListCardEntity(entity));
  const strategy = detectGroupingStrategy(context);
  const blockText = buildAutoLines(normalEntities, strategy, ownerLookupEntities).join('\n');
  let changed = false;

  listCards.forEach((listCard) => {
    const nextInfo = mergeAutoBlock(
      removeAutoBlock(listCard.info, AUTO_LIST_START, AUTO_LIST_END),
      AUTO_LIST_START,
      AUTO_LIST_END,
      blockText
    );
    if (safeString(nextInfo) !== safeString(listCard.info)) {
      listCard.info = nextInfo;
      changed = true;
    }
  });

  return changed;
}

export function syncAllCollectionListCards(nov) {
  if (!nov?.data || !Array.isArray(nov?.tabsConfig)) return false;
  let changed = false;
  const ownerLookupEntities = [];
  for (const lonData of Object.values(nov.data || {})) {
    if (!lonData || typeof lonData !== 'object') continue;
    for (const tabData of Object.values(lonData)) {
      const entities = Array.isArray(tabData?.entities) ? tabData.entities : [];
      ownerLookupEntities.push(...entities);
    }
  }

  (nov.tabsConfig || []).forEach((lon) => {
    (lon?.subTabs || []).forEach((nho) => {
      if (!isCollectionTab(nho)) return;
      const tabData = nov?.data?.[lon.id]?.[nho.id];
      if (!tabData || typeof tabData !== 'object' || !Array.isArray(tabData.entities)) return;
      changed = syncListCardsInTab(
        tabData,
        {
          lonId: lon.id,
          nhoId: nho.id,
          tabLabel: nho.label || '',
          parentLabel: lon.label || '',
        },
        ownerLookupEntities
      ) || changed;
    });
  });

  return changed;
}
