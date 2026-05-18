/**
 * Mô tả vai trò AUTO của từng sub-tab collection trong cây mục lục.
 * Dùng để cấu hình đồng bộ tự động bám theo tabsConfig thay vì chỉ đoán tên.
 * Các sync hiện tại vẫn fallback về heuristics cũ nếu tab chưa có cấu hình.
 */
import { normalizeAsciiText } from './statusHierarchyParser.js';

export const AUTO_SYNC_ROLE_OFF = 'khong-tu-dong';
export const AUTO_SYNC_ROLE_FORCE = 'the-luc';
export const AUTO_SYNC_ROLE_MAP = 'ban-do';
export const AUTO_SYNC_ROLE_CULTIVATION_SYSTEM = 'he-thong-tu-luyen';
export const AUTO_SYNC_ROLE_CULTIVATION_REALM = 'canh-gioi-tu-vi';
export const AUTO_SYNC_ROLE_MAIN_CHARACTER = 'nhan-vat-chinh';
export const AUTO_SYNC_ROLE_CHARACTER_RELATED = 'nhan-vat-lien-quan';

const AUTO_SYNC_ROLE_SET = new Set([
  AUTO_SYNC_ROLE_OFF,
  AUTO_SYNC_ROLE_FORCE,
  AUTO_SYNC_ROLE_MAP,
  AUTO_SYNC_ROLE_CULTIVATION_SYSTEM,
  AUTO_SYNC_ROLE_CULTIVATION_REALM,
  AUTO_SYNC_ROLE_MAIN_CHARACTER,
  AUTO_SYNC_ROLE_CHARACTER_RELATED,
]);

const FEATURE_BY_ROLE = Object.freeze({
  [AUTO_SYNC_ROLE_FORCE]: ['force', 'relation'],
  [AUTO_SYNC_ROLE_MAP]: ['map', 'relation'],
  [AUTO_SYNC_ROLE_CULTIVATION_SYSTEM]: ['cultivation'],
  [AUTO_SYNC_ROLE_CULTIVATION_REALM]: ['cultivation'],
  [AUTO_SYNC_ROLE_MAIN_CHARACTER]: ['main_character'],
  [AUTO_SYNC_ROLE_CHARACTER_RELATED]: ['main_character'],
});

export const AUTO_SYNC_ROLE_OPTIONS = Object.freeze([
  { value: '', label: 'Tự nhận diện', hint: 'Đoán theo tên mục như cách cũ' },
  { value: AUTO_SYNC_ROLE_OFF, label: 'Tắt auto', hint: 'Không chạy đồng bộ tự động cho mục này' },
  { value: AUTO_SYNC_ROLE_FORCE, label: 'Thế lực', hint: 'Dùng cho đồng bộ Thế Lực ↔ Bản Đồ' },
  { value: AUTO_SYNC_ROLE_MAP, label: 'Bản đồ', hint: 'Dùng cho cây Bản Đồ và liên kết vị trí' },
  { value: AUTO_SYNC_ROLE_CULTIVATION_SYSTEM, label: 'Hệ thống tu luyện', hint: 'Ghép với Cảnh giới tu vi' },
  { value: AUTO_SYNC_ROLE_CULTIVATION_REALM, label: 'Cảnh giới tu vi', hint: 'Ghép với Hệ thống tu luyện' },
  { value: AUTO_SYNC_ROLE_MAIN_CHARACTER, label: 'Nhân vật chính', hint: 'Đồng bộ sang tab nhân vật phụ; hồ sơ chính dùng Mạng lưới nhân quả' },
  { value: AUTO_SYNC_ROLE_CHARACTER_RELATED, label: 'Nhân vật liên quan', hint: 'Đạo lữ, thân nhân, huynh đệ, nhân vật phụ...' },
]);

function cloneValue(value) {
  try {
    return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function normalizeKey(value) {
  return normalizeAsciiText(String(value || '').replace(/\[\[|\]\]/g, '').trim());
}

function looksLikeForceParent(value) {
  const key = normalizeKey(value).replace(/-/g, ' ').trim();
  if (!key) return false;
  // Không dùng includes: «Chư Thiên Thế Lực» → chu thien the luc chứa the luc nhưng không phải tab gốc Thế lực.
  return key === 'the luc';
}

function looksLikeMapSubTab(value) {
  const key = normalizeKey(value);
  return key === 'dia-danh' || key.includes('ban do') || key.includes('dia danh') || key.includes('bi canh');
}

function looksLikeMapParent(value) {
  return normalizeKey(value).includes('ban do');
}

function looksLikeCultivationSystem(value) {
  const key = normalizeKey(value);
  return key === 'he-thong-tu-luyen' || key.includes('he thong tu luyen');
}

function looksLikeCultivationRealm(value) {
  const key = normalizeKey(value);
  return (
    key === 'canh-gioi-tu-vi' ||
    key === 'canh-gioi' ||
    key.includes('canh gioi tu vi') ||
    key.includes('canh gioi')
  );
}

function looksLikeCharacterParent(value) {
  const key = normalizeKey(value);
  return key === 'nhan-vat' || key.includes('nhan vat');
}

function looksLikeMainCharacter(value) {
  const key = normalizeKey(value);
  return (
    key === 'nhan-vat-chinh' ||
    key.includes('nhan vat chinh') ||
    key.includes('chu nhan') ||
    key.includes('main char') ||
    key.includes('protagonist')
  );
}

function looksLikeRelatedCharacter(value) {
  const key = normalizeKey(value);
  return (
    key.includes('dao lu') ||
    key.includes('than nhan') ||
    key.includes('huynh de') ||
    key.includes('de tu') ||
    key.includes('su phu') ||
    key.includes('ban be') ||
    key.includes('bang huu')
  );
}

export function normalizeAutoSyncRole(value) {
  const raw = String(value || '').trim();
  return AUTO_SYNC_ROLE_SET.has(raw) ? raw : '';
}

export function readExplicitAutoSyncRole(tabConfig) {
  if (!tabConfig || typeof tabConfig !== 'object') return '';
  return normalizeAutoSyncRole(
    tabConfig.autoSyncRole ??
      tabConfig.autoSync?.role ??
      tabConfig.autoRole
  );
}

export function isAutoSyncExplicitlyOff(tabConfig) {
  return readExplicitAutoSyncRole(tabConfig) === AUTO_SYNC_ROLE_OFF;
}

export function getAutoSyncRoleLabel(role) {
  const found = AUTO_SYNC_ROLE_OPTIONS.find((item) => item.value === normalizeAutoSyncRole(role));
  return found?.label || 'Tự nhận diện';
}

export function guessAutoSyncRole({
  activeTabLon = '',
  activeTabNho = '',
  currentTabConfig = null,
  parentLabel = '',
} = {}) {
  if (currentTabConfig?.viewType && currentTabConfig.viewType !== 'collection-track') return '';

  const nhoId = activeTabNho || currentTabConfig?.id || '';
  const nhoLabel = currentTabConfig?.label || '';
  const parent = parentLabel || currentTabConfig?._parentLabel || '';

  if (looksLikeMainCharacter(nhoId) || looksLikeMainCharacter(nhoLabel)) {
    return AUTO_SYNC_ROLE_MAIN_CHARACTER;
  }
  if (looksLikeCultivationSystem(nhoId) || looksLikeCultivationSystem(nhoLabel)) {
    return AUTO_SYNC_ROLE_CULTIVATION_SYSTEM;
  }
  if (looksLikeCultivationRealm(nhoId) || looksLikeCultivationRealm(nhoLabel)) {
    return AUTO_SYNC_ROLE_CULTIVATION_REALM;
  }
  if (
    [parent, currentTabConfig?._parentLabel, activeTabLon, !currentTabConfig?.viewType ? activeTabNho : '']
      .filter(Boolean)
      .some((value) => looksLikeForceParent(value))
  ) {
    return AUTO_SYNC_ROLE_FORCE;
  }
  if (
    normalizeKey(activeTabLon) === 'ban-do' ||
    looksLikeMapSubTab(nhoId) ||
    looksLikeMapSubTab(nhoLabel) ||
    looksLikeMapParent(parent)
  ) {
    return AUTO_SYNC_ROLE_MAP;
  }
  if (
    looksLikeCharacterParent(activeTabLon) ||
    looksLikeCharacterParent(parent) ||
    looksLikeRelatedCharacter(nhoId) ||
    looksLikeRelatedCharacter(nhoLabel)
  ) {
    return AUTO_SYNC_ROLE_CHARACTER_RELATED;
  }
  return '';
}

export function getEffectiveAutoSyncRole(ctx = {}) {
  const explicit = readExplicitAutoSyncRole(ctx.currentTabConfig);
  if (explicit) return explicit;
  return guessAutoSyncRole(ctx);
}

export function hasAutoSyncFeature(ctx = {}, feature = '') {
  const role = getEffectiveAutoSyncRole(ctx);
  if (!role || role === AUTO_SYNC_ROLE_OFF) return false;
  return Boolean(FEATURE_BY_ROLE[role]?.includes(feature));
}

export function hydrateTabsAutoSyncRoles(tabsConfig) {
  if (!Array.isArray(tabsConfig) || tabsConfig.length === 0) {
    return { tabsConfig: Array.isArray(tabsConfig) ? tabsConfig : [], changed: false };
  }

  const nextTabs = cloneValue(tabsConfig);
  let changed = false;

  nextTabs.forEach((lon) => {
    const parentLabel = lon?.label || '';
    (lon?.subTabs || []).forEach((nho) => {
      if (nho?.viewType !== 'collection-track') return;
      const explicit = readExplicitAutoSyncRole(nho);
      if (explicit) return;
      const inferred = guessAutoSyncRole({
        activeTabLon: lon?.id || '',
        activeTabNho: nho?.id || '',
        currentTabConfig: nho,
        parentLabel,
      });
      if (!inferred) return;
      nho.autoSyncRole = inferred;
      changed = true;
    });
  });

  return { tabsConfig: changed ? nextTabs : tabsConfig, changed };
}
