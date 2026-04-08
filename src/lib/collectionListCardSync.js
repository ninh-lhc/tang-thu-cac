/**
 * Auto-sync list-card notes inside each collection tab.
 * A list card is any entity whose name starts with "Danh sach".
 * The helper keeps manual notes intact and only rewrites its AUTO block.
 * Ranh giới khối: dòng tiêu đề # Danh mục thẻ (AUTO) (không dùng <!-- --> để giao diện gọn).
 * Dữ liệu cũ có <!-- AUTO_COLLECTION_LIST:... --> vẫn được đọc và xóa khi đồng bộ lại.
 */

import { normalizeAsciiText, parseRankNumber } from './statusHierarchyParser.js';
import { parseOwnerTimelineHint } from './autoOwnerMilestone.js';
import { findEquivalentEntityByName } from './entityNameIdentity.js';

const LEGACY_AUTO_LIST_START = '<!-- AUTO_COLLECTION_LIST:START -->';
const LEGACY_AUTO_LIST_END = '<!-- AUTO_COLLECTION_LIST:END -->';
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

const TIER_LEVEL_ORDER = [
  'hoang cap',
  'huyen cap',
  'dia cap',
  'thien cap',
  'linh cap',
  'chan cap',
  'cuc cap',
  'at cap',
  'ngoc cap',
  'vuong cap',
  'ton cap',
  'de cap',
  'cam ky',
];

const TIER_SUB_ORDER = ['ha pham', 'trung pham', 'thuong pham', 'cuc pham'];

function computeTierOrder(label) {
  const normalized = normalize(label);
  if (!normalized) return null;
  const levelIdx = TIER_LEVEL_ORDER.findIndex((token) => normalized.includes(token));
  if (levelIdx < 0) return null;
  const subIdx = TIER_SUB_ORDER.findIndex((token) => normalized.includes(token));
  return levelIdx * 100 + (subIdx >= 0 ? subIdx : 50);
}

function safeString(value) {
  if (value == null || value === 'null' || value === 'undefined') return '';
  return String(value);
}

function normalize(value) {
  return normalizeAsciiText(value);
}

function normalizeGroupKey(label) {
  return normalize(label).replace(/\s+/g, ' ').trim();
}

function findLegacyAutoListRange(text) {
  const s = text.indexOf(LEGACY_AUTO_LIST_START);
  const e = text.indexOf(LEGACY_AUTO_LIST_END);
  if (s < 0 || e <= s) return null;
  return { start: s, end: e + LEGACY_AUTO_LIST_END.length };
}

/** Khối danh sách AUTO (định dạng mới): từ dòng tiêu đề tới hết các dòng trống / ## / - */
function findTitleAutoListRange(text) {
  const title = AUTO_LIST_TITLE;
  let pos = 0;
  while (pos < text.length) {
    const nl = text.indexOf('\n', pos);
    const lineEnd = nl === -1 ? text.length : nl;
    let line = text.slice(pos, lineEnd);
    if (line.endsWith('\r')) line = line.slice(0, -1);
    if (line === title) {
      const blockStart = pos;
      let scan = nl === -1 ? text.length : nl + 1;
      while (scan < text.length) {
        const nl2 = text.indexOf('\n', scan);
        const le = nl2 === -1 ? text.length : nl2;
        let ln = text.slice(scan, le);
        if (ln.endsWith('\r')) ln = ln.slice(0, -1);
        const trimmed = ln.trimEnd();
        if (trimmed === '') {
          scan = nl2 === -1 ? text.length : nl2 + 1;
          continue;
        }
        if (trimmed.startsWith('## ') || trimmed.startsWith('- ') || /^\d+\.\s/.test(trimmed)) {
          scan = nl2 === -1 ? text.length : nl2 + 1;
          continue;
        }
        break;
      }
      return { start: blockStart, end: scan };
    }
    if (nl === -1) break;
    pos = nl + 1;
  }
  return null;
}

function removeCollectionListAutoBlock(baseText) {
  let text = safeString(baseText);
  const legacy = findLegacyAutoListRange(text);
  if (legacy) {
    text = `${text.slice(0, legacy.start)}${text.slice(legacy.end)}`;
  }
  const titleRange = findTitleAutoListRange(text);
  if (titleRange) {
    text = `${text.slice(0, titleRange.start)}${text.slice(titleRange.end)}`;
  }
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

function mergeCollectionListAutoBlock(baseText, blockBody) {
  const body = safeString(blockBody).trim();
  const cleaned = removeCollectionListAutoBlock(baseText);
  const prefix = cleaned.trimEnd();
  const sep = prefix ? '\n\n' : '';
  return `${prefix}${sep}${body}`.trim();
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
  return base.replace(/^[^\p{L}\p{N}\u005b]+/u, '').trim();
}

function resolveOwnerLabel(entity, ownerLookupEntities = []) {
  const rawDirect = pickFirstFilled(entity, [
    'f_chu',
    'f_owner',
    'f_phai',
    'f_mon_phai',
    'f_tong_phai',
    'f_tong_mon',
    'f_to_chuc',
    'f_the_luc',
    'f_phe',
    'f_nguoi_so_huu',
    'f_nguoi_su_dung',
    'f_nguoi_tu_luyen',
    'f_truyen_nhan',
    'f_khe_chu',
  ]);
  let raw = rawDirect;
  if (!safeString(raw).trim()) {
    const dyn = entity?.dynamicData && typeof entity.dynamicData === 'object' ? entity.dynamicData : {};
    for (const [key, value] of Object.entries(dyn)) {
      if (!safeString(value).trim()) continue;
      if (/(chu|owner|so_huu|phai|to_chuc|the_luc|phe)/i.test(safeString(key))) {
        raw = value;
        break;
      }
    }
  }
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

  const anyTierOrder = computeTierOrder(label);
  if (anyTierOrder != null) return anyTierOrder;

  if (kind === 'attribute') {
    const idx = ATTRIBUTE_GROUP_ORDER.findIndex((token) => normalized.includes(token));
    return idx >= 0 ? idx : 9_000;
  }

  if (kind === 'tier') {
    const parsed = parseRankNumber(label);
    if (Number.isFinite(parsed)) return 8_000 + parsed;
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
    const rawLabel = safeString(strategy.getGroupLabel(entity)).trim();
    const groupLabel = rawLabel || 'Ch\u01b0a ph\u00e2n lo\u1ea1i';
    const groupKey = normalizeGroupKey(groupLabel) || 'chua phan loai';
    if (!grouped.has(groupKey)) grouped.set(groupKey, { label: groupLabel, entities: [] });
    grouped.get(groupKey).entities.push(entity);
  });

  const groupEntries = Array.from(grouped.values()).sort((a, b) => {
    const orderDiff = computeGroupOrder(strategy.kind, a.label) - computeGroupOrder(strategy.kind, b.label);
    if (orderDiff !== 0) return orderDiff;
    return a.label.localeCompare(b.label, 'vi');
  });

  groupEntries.forEach(({ label: groupLabel, entities }, index) => {
    if (index > 0) lines.push('');
    lines.push(`## ${groupLabel} (${entities.length})`);
    lines.push('');
    let visibleIdx = 0;
    [...entities]
      .sort((a, b) => safeString(a?.name).localeCompare(safeString(b?.name), 'vi'))
      .forEach((entity) => {
        const name = safeString(entity?.name).trim();
        if (!name) return;
        visibleIdx += 1;
        const owner = resolveOwnerLabel(entity, ownerLookupEntities);
        const ownerSuffix = owner ? ` - [[${owner}]]` : '';
        lines.push(`${visibleIdx}. [[${name}]]${ownerSuffix}`);
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
    const nextInfo = mergeCollectionListAutoBlock(listCard.info, blockText);
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
