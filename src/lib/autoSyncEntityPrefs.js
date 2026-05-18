/**
 * Entity-level AUTO sync preferences for tree-driven engines.
 * Used by sync engines, diagnostics, and detail UI so one entity can opt out
 * or freeze a specific AUTO block without disabling the whole tab.
 */
import {
  AUTO_SYNC_ROLE_CHARACTER_RELATED,
  AUTO_SYNC_ROLE_CULTIVATION_REALM,
  AUTO_SYNC_ROLE_CULTIVATION_SYSTEM,
  AUTO_SYNC_ROLE_FORCE,
  AUTO_SYNC_ROLE_MAIN_CHARACTER,
  AUTO_SYNC_ROLE_MAP,
  normalizeAutoSyncRole,
} from './tabAutoSyncRole.js';

export const AUTO_SYNC_ENGINE_FORCE_MAP = 'force_map';
export const AUTO_SYNC_ENGINE_MAP_HIERARCHY = 'map_hierarchy';
export const AUTO_SYNC_ENGINE_RELATION_NOTES = 'relation_notes';
export const AUTO_SYNC_ENGINE_CULTIVATION = 'cultivation_relation';
export const AUTO_SYNC_ENGINE_MAIN_CHARACTER = 'main_character_relation';
export const AUTO_SYNC_ENGINE_OWNER_TIMELINE = 'owner_timeline';
export const AUTO_SYNC_ENGINE_COLLECTION_CARDS = 'collection_cards';

const ENGINE_LABELS = Object.freeze({
  [AUTO_SYNC_ENGINE_FORCE_MAP]: 'Thế lực -> Bản đồ',
  [AUTO_SYNC_ENGINE_MAP_HIERARCHY]: 'Cây bản đồ',
  [AUTO_SYNC_ENGINE_RELATION_NOTES]: 'Liên kết vị trí/liên quan',
  [AUTO_SYNC_ENGINE_CULTIVATION]: 'Tu luyện',
  [AUTO_SYNC_ENGINE_MAIN_CHARACTER]: 'Nhân vật',
  [AUTO_SYNC_ENGINE_OWNER_TIMELINE]: 'Mốc timeline sở hữu',
  [AUTO_SYNC_ENGINE_COLLECTION_CARDS]: 'Danh sách thẻ',
});

const ENGINE_DESCRIPTIONS = Object.freeze({
  [AUTO_SYNC_ENGINE_FORCE_MAP]: 'Sinh block AUTO giữa thực thể Thế lực và mục Bản đồ liên quan.',
  [AUTO_SYNC_ENGINE_MAP_HIERARCHY]: 'Dựng lại phân tầng map cha/con và danh sách map trực thuộc.',
  [AUTO_SYNC_ENGINE_RELATION_NOTES]: 'Đồng bộ block quan hệ giữa Thế lực/Bản đồ và các mục liên quan.',
  [AUTO_SYNC_ENGINE_CULTIVATION]: 'Ghép Hệ thống Tu luyện <-> Cảnh giới Tu Vi.',
  [AUTO_SYNC_ENGINE_MAIN_CHARACTER]: 'Ghi block liên kết ngược lên thẻ nhân vật phụ (tab Đạo lữ, thân nhân…). Thẻ nhân vật chính dùng Mạng lưới nhân quả.',
  [AUTO_SYNC_ENGINE_OWNER_TIMELINE]: 'Tự tạo mốc timeline sở hữu từ dữ kiện Chủ nhân/Người sở hữu.',
  [AUTO_SYNC_ENGINE_COLLECTION_CARDS]: 'Làm mới các thẻ Danh sách (AUTO).',
});

const VALID_ENGINE_IDS = new Set(Object.keys(ENGINE_LABELS));

const ROLE_TO_ENGINES = Object.freeze({
  [AUTO_SYNC_ROLE_FORCE]: [
    AUTO_SYNC_ENGINE_FORCE_MAP,
    AUTO_SYNC_ENGINE_RELATION_NOTES,
  ],
  [AUTO_SYNC_ROLE_MAP]: [
    AUTO_SYNC_ENGINE_FORCE_MAP,
    AUTO_SYNC_ENGINE_MAP_HIERARCHY,
    AUTO_SYNC_ENGINE_RELATION_NOTES,
  ],
  [AUTO_SYNC_ROLE_CULTIVATION_SYSTEM]: [AUTO_SYNC_ENGINE_CULTIVATION],
  [AUTO_SYNC_ROLE_CULTIVATION_REALM]: [AUTO_SYNC_ENGINE_CULTIVATION],
  [AUTO_SYNC_ROLE_MAIN_CHARACTER]: [],
  [AUTO_SYNC_ROLE_CHARACTER_RELATED]: [AUTO_SYNC_ENGINE_MAIN_CHARACTER],
});

function safeString(value) {
  if (value == null || value === 'null' || value === 'undefined') return '';
  return String(value);
}

function normalizeEngineList(value) {
  const seen = new Set();
  const out = [];
  (Array.isArray(value) ? value : []).forEach((item) => {
    const key = safeString(item).trim();
    if (!VALID_ENGINE_IDS.has(key) || seen.has(key)) return;
    seen.add(key);
    out.push(key);
  });
  return out;
}

function buildPrefsShape(value) {
  const raw = value && typeof value === 'object' ? value : {};
  return {
    disabledEngines: normalizeEngineList(raw.disabledEngines),
    lockedEngines: normalizeEngineList(raw.lockedEngines),
  };
}

export function normalizeAutoSyncEngineId(value = '') {
  const key = safeString(value).trim();
  return VALID_ENGINE_IDS.has(key) ? key : '';
}

export function getAutoSyncEngineLabel(engineId = '') {
  return ENGINE_LABELS[normalizeAutoSyncEngineId(engineId)] || 'AUTO';
}

export function getAutoSyncEngineDescription(engineId = '') {
  return ENGINE_DESCRIPTIONS[normalizeAutoSyncEngineId(engineId)] || '';
}

export function getAllAutoSyncEngineIds() {
  return [...VALID_ENGINE_IDS];
}

export function getAutoSyncEnginesForRole(role = '') {
  return ROLE_TO_ENGINES[normalizeAutoSyncRole(role)] || [];
}

export function getEntityAutoSyncPrefs(entity) {
  return buildPrefsShape(entity?.autoSyncPrefs);
}

export function isEntityAutoSyncDisabled(entity, engineId = '') {
  const key = normalizeAutoSyncEngineId(engineId);
  if (!key) return false;
  return getEntityAutoSyncPrefs(entity).disabledEngines.includes(key);
}

export function isEntityAutoSyncLocked(entity, engineId = '') {
  const key = normalizeAutoSyncEngineId(engineId);
  if (!key) return false;
  return getEntityAutoSyncPrefs(entity).lockedEngines.includes(key);
}

export function canEntityAutoSyncApply(entity, engineId = '') {
  const key = normalizeAutoSyncEngineId(engineId);
  if (!key) return true;
  return !isEntityAutoSyncDisabled(entity, key) && !isEntityAutoSyncLocked(entity, key);
}

export function updateEntityAutoSyncPrefs(entity, updater) {
  if (!entity || typeof entity !== 'object') return false;
  const current = getEntityAutoSyncPrefs(entity);
  const draft = typeof updater === 'function' ? updater(current) : updater;
  const next = buildPrefsShape(draft);
  const sameDisabled =
    current.disabledEngines.length === next.disabledEngines.length &&
    current.disabledEngines.every((value, index) => value === next.disabledEngines[index]);
  const sameLocked =
    current.lockedEngines.length === next.lockedEngines.length &&
    current.lockedEngines.every((value, index) => value === next.lockedEngines[index]);
  if (sameDisabled && sameLocked) return false;

  if (next.disabledEngines.length === 0 && next.lockedEngines.length === 0) {
    delete entity.autoSyncPrefs;
    return true;
  }
  entity.autoSyncPrefs = next;
  return true;
}

export function setEntityAutoSyncState(entity, engineId, kind, enabled) {
  const key = normalizeAutoSyncEngineId(engineId);
  const mode = safeString(kind).trim();
  if (!key || (mode !== 'disabled' && mode !== 'locked')) return false;
  return updateEntityAutoSyncPrefs(entity, (current) => {
    const nextDisabled = [...current.disabledEngines];
    const nextLocked = [...current.lockedEngines];

    const removeFrom = (list) => {
      const index = list.indexOf(key);
      if (index >= 0) list.splice(index, 1);
    };
    const addTo = (list) => {
      if (!list.includes(key)) list.push(key);
    };

    if (mode === 'disabled') {
      if (enabled) {
        addTo(nextDisabled);
        removeFrom(nextLocked);
      } else {
        removeFrom(nextDisabled);
      }
    }

    if (mode === 'locked') {
      if (enabled) {
        addTo(nextLocked);
        removeFrom(nextDisabled);
      } else {
        removeFrom(nextLocked);
      }
    }

    return {
      disabledEngines: nextDisabled,
      lockedEngines: nextLocked,
    };
  });
}

export function summarizeEntityAutoSyncPrefs(entities, engineIds = []) {
  const keys = normalizeEngineList(engineIds);
  const summary = {
    disabledCount: 0,
    lockedCount: 0,
  };
  if (keys.length === 0) return summary;
  (Array.isArray(entities) ? entities : []).forEach((entity) => {
    if (keys.some((key) => isEntityAutoSyncDisabled(entity, key))) summary.disabledCount += 1;
    if (keys.some((key) => isEntityAutoSyncLocked(entity, key))) summary.lockedCount += 1;
  });
  return summary;
}
