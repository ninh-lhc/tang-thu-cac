/**
 * Ánh xạ trường cho từng vai trò AUTO trong tabsConfig.
 * Mục tiêu: các sync AUTO đọc theo field map đã cấu hình thay vì phụ thuộc id cứng.
 */
import { normalizeAsciiText } from './statusHierarchyParser.js';
import {
  AUTO_SYNC_ROLE_CHARACTER_RELATED,
  AUTO_SYNC_ROLE_CULTIVATION_REALM,
  AUTO_SYNC_ROLE_CULTIVATION_SYSTEM,
  AUTO_SYNC_ROLE_FORCE,
  AUTO_SYNC_ROLE_MAIN_CHARACTER,
  AUTO_SYNC_ROLE_MAP,
  AUTO_SYNC_ROLE_OFF,
  getEffectiveAutoSyncRole,
  hydrateTabsAutoSyncRoles,
} from './tabAutoSyncRole.js';

function normalizeText(value) {
  return normalizeAsciiText(String(value || '').replace(/\[\[|\]\]/g, '').trim());
}

function safeString(value) {
  if (value == null || value === 'null' || value === 'undefined') return '';
  return String(value);
}

function cloneValue(value) {
  try {
    return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

// Bộ trường cơ bản dùng chung cho tab chưa có vai trò auto rõ ràng.
// Giúp người dùng vẫn cấu hình được "cột trạng thái" / "cột tiêu đề"
// trước khi bật auto, cấu hình này tự động dùng lại khi về sau gán vai trò.
const GENERIC_FIELD_DEFS = Object.freeze([
  {
    key: 'status',
    label: 'Cột trạng thái / cấp bậc',
    hint: 'Trường hiển thị cấp bậc hoặc trạng thái chính của thẻ (Cảnh giới, Hạng, Cấp...).',
    defaultId: 'f_status',
    candidateIds: ['f_status', 'f_cap'],
    keywordHints: ['trang thai', 'cap', 'rank', 'canh gioi', 'status', 'hang'],
  },
  {
    key: 'title',
    label: 'Cột tiêu đề / phân loại',
    hint: 'Trường mô tả loại hoặc danh xưng chính (Loại, Danh xưng, Phân loại).',
    defaultId: 'f_title',
    candidateIds: ['f_title', 'f_ten', 'f_loai'],
    keywordHints: ['ten', 'loai', 'title', 'danh xung', 'phan loai'],
  },
]);

const FIELD_DEFS_BY_ROLE = Object.freeze({
  [AUTO_SYNC_ROLE_FORCE]: [
    {
      key: 'status',
      label: 'Chuỗi cấp bậc / trạng thái',
      hint: 'Thường là trường đang chứa cấp bậc hoặc chuỗi Thế lực - Cấp - Địa bàn.',
      defaultId: 'f_status',
      candidateIds: ['f_status', 'f_cap'],
      keywordHints: ['cap bac', 'trang thai', 'cap', 'rank', 'canh gioi'],
    },
    {
      key: 'location',
      label: 'Địa bàn / vị trí',
      hint: 'Dùng để suy ra nơi đặt thế lực nếu bạn tách riêng khỏi chuỗi trạng thái.',
      defaultId: 'f_dia_ban',
      candidateIds: ['f_dia_ban', 'f_vi_tri'],
      keywordHints: ['dia ban', 'vi tri', 'dia diem'],
    },
    {
      key: 'type',
      label: 'Loại / phân loại thế lực',
      hint: 'Ví dụ: Tông môn, Gia tộc, Đế quốc, Chính/Tà...',
      defaultId: 'f_title',
      candidateIds: ['f_title', 'f_loai_to_chuc', 'f_loai', 'f_to_chuc'],
      keywordHints: ['loai', 'phan loai', 'to chuc', 'chinh ta', 'danh hieu'],
    },
  ],
  [AUTO_SYNC_ROLE_MAP]: [
    {
      key: 'title',
      label: 'Loại địa danh',
      hint: 'Ví dụ: Đại lục, Tinh cầu, Giới, Thành/Trấn...',
      defaultId: 'f_title',
      candidateIds: ['f_title'],
      keywordHints: ['loai dia danh', 'loai', 'phan loai'],
    },
    {
      key: 'status',
      label: 'Quy mô / hệ phân cấp',
      hint: 'Ví dụ: Tiểu thế giới, Tôn giới, hệ phân cấp của địa danh.',
      defaultId: 'f_status',
      candidateIds: ['f_status'],
      keywordHints: ['muc nguy hiem', 'quy mo', 'he phan cap', 'status', 'cap'],
    },
    {
      key: 'parent_path',
      label: 'Vị trí / bản đồ cha',
      hint: 'Chuỗi map cha trực tiếp hoặc nhiều tầng lớn hơn.',
      defaultId: 'f_vi_tri',
      candidateIds: ['f_vi_tri', 'f_dia_ban'],
      keywordHints: ['vi tri', 'truc thuoc', 'map cha', 'dia ban'],
    },
  ],
  [AUTO_SYNC_ROLE_CULTIVATION_SYSTEM]: [
    {
      key: 'status',
      label: 'Chuỗi hệ thống',
      hint: 'Dùng để ghép hệ thống với các cảnh giới tương ứng.',
      defaultId: 'f_status',
      candidateIds: ['f_status'],
      keywordHints: ['so cap bac', 'he thong', 'trang thai', 'cap'],
    },
    {
      key: 'alias',
      label: 'Bí danh / tên khác',
      hint: 'Dùng để match tên hệ thống khi cảnh giới ghi cách gọi khác.',
      defaultId: 'f_alias',
      candidateIds: ['f_alias'],
      keywordHints: ['biet danh', 'ten khac', 'alias'],
    },
  ],
  [AUTO_SYNC_ROLE_CULTIVATION_REALM]: [
    {
      key: 'status',
      label: 'Chuỗi cảnh giới',
      hint: 'Dùng để tách ra hệ thống và thứ tự cảnh giới.',
      defaultId: 'f_status',
      candidateIds: ['f_status'],
      keywordHints: ['thuoc he thong', 'canh gioi', 'trang thai', 'cap'],
    },
  ],
  [AUTO_SYNC_ROLE_MAIN_CHARACTER]: [
    {
      key: 'status',
      label: 'Trạng thái chính',
      hint: 'Dùng để ghi chú hiển thị của nhân vật chính nếu cần.',
      defaultId: 'f_status',
      candidateIds: ['f_status'],
      keywordHints: ['canh gioi', 'trang thai', 'danh hieu'],
    },
  ],
  [AUTO_SYNC_ROLE_CHARACTER_RELATED]: [
    {
      key: 'relation',
      label: 'Quan hệ với nhân vật chính',
      hint: 'Ví dụ: Đạo lữ, Thân nhân, Huynh đệ...',
      defaultId: 'f_quan_he',
      candidateIds: ['f_quan_he'],
      keywordHints: ['quan he'],
    },
    {
      key: 'status',
      label: 'Trạng thái chính',
      hint: 'Dùng cho hiển thị bổ sung của nhân vật liên quan.',
      defaultId: 'f_status',
      candidateIds: ['f_status'],
      keywordHints: ['canh gioi', 'trang thai', 'danh hieu'],
    },
  ],
});

function getTemplateFields(tabConfig) {
  const fields = Array.isArray(tabConfig?.fieldsTemplate) ? tabConfig.fieldsTemplate : [];
  return fields.filter((field) => field && typeof field === 'object' && safeString(field.id).trim());
}

function findFieldIdByHints(templateFields, def) {
  const byId = new Map(templateFields.map((field) => [safeString(field.id).trim(), field]));
  for (const id of def.candidateIds || []) {
    if (byId.has(id)) return id;
  }
  const keywordHints = Array.isArray(def.keywordHints) ? def.keywordHints : [];
  if (keywordHints.length > 0) {
    for (const field of templateFields) {
      const labelNorm = normalizeText(field.label || field.id || '');
      if (!labelNorm) continue;
      if (keywordHints.some((hint) => labelNorm.includes(hint))) {
        return safeString(field.id).trim();
      }
    }
  }
  return def.defaultId || '';
}

export function getAutoSyncFieldDefs(role) {
  // Tab đã chọn "Tắt auto" thì không cần bộ trường nào.
  if (role === AUTO_SYNC_ROLE_OFF) return [];
  // Vai trò có profile riêng (Thế lực / Bản đồ / Hệ tu luyện / NVC ...).
  if (role && FIELD_DEFS_BY_ROLE[role]) return FIELD_DEFS_BY_ROLE[role];
  // Tab chưa gán vai trò hoặc vai trò lạ: dùng bộ trường chung để UI vẫn
  // hiển thị được phần "Chỉnh trường nâng cao" cho 12 thể loại.
  return GENERIC_FIELD_DEFS;
}

export function normalizeAutoSyncFieldMap(fieldMap, role = '') {
  const defs = getAutoSyncFieldDefs(role);
  const allowedKeys = new Set(defs.map((item) => item.key));
  const out = {};
  if (!fieldMap || typeof fieldMap !== 'object') return out;
  Object.entries(fieldMap).forEach(([key, value]) => {
    if (!allowedKeys.has(key)) return;
    const text = safeString(value).trim();
    if (!text) return;
    out[key] = text;
  });
  return out;
}

export function readExplicitAutoSyncFieldMap(tabConfig, role = '') {
  if (!tabConfig || typeof tabConfig !== 'object') return {};
  return normalizeAutoSyncFieldMap(
    tabConfig.autoSyncFieldMap ??
      tabConfig.autoSync?.fieldMap ??
      tabConfig.autoFieldMap,
    role
  );
}

export function guessAutoSyncFieldMap({ role = '', currentTabConfig = null } = {}) {
  if (role === AUTO_SYNC_ROLE_OFF) return {};
  const defs = getAutoSyncFieldDefs(role);
  if (defs.length === 0) return {};
  const templateFields = getTemplateFields(currentTabConfig);
  const out = {};
  defs.forEach((def) => {
    const fieldId = findFieldIdByHints(templateFields, def);
    if (fieldId) out[def.key] = fieldId;
  });
  return out;
}

export function getEffectiveAutoSyncFieldMap(ctx = {}) {
  const role = ctx.role || getEffectiveAutoSyncRole(ctx);
  if (role === AUTO_SYNC_ROLE_OFF) return {};
  // role có thể rỗng — vẫn đoán theo bộ trường chung để UI hiện được lựa chọn gợi ý.
  return {
    ...guessAutoSyncFieldMap({ ...ctx, role: role || '' }),
    ...readExplicitAutoSyncFieldMap(ctx.currentTabConfig, role || ''),
  };
}

export function getAutoSyncFieldId(ctx = {}, fieldKey = '') {
  const map = getEffectiveAutoSyncFieldMap(ctx);
  return safeString(map[fieldKey]).trim();
}

export function getEntityAutoFieldValue(entity, ctx = {}, fieldKey = '', options = {}) {
  const fieldId = getAutoSyncFieldId(ctx, fieldKey);
  const dyn = entity?.dynamicData && typeof entity.dynamicData === 'object' ? entity.dynamicData : {};
  const value = fieldId ? safeString(dyn[fieldId]).trim() : '';
  if (value) return value;
  if (options.fallbackToStatus) return safeString(entity?.status).trim();
  return '';
}

export function setEntityAutoFieldValue(entity, ctx = {}, fieldKey = '', value = '') {
  const fieldId = getAutoSyncFieldId(ctx, fieldKey);
  if (!fieldId || !entity || typeof entity !== 'object') return false;
  if (!entity.dynamicData || typeof entity.dynamicData !== 'object') entity.dynamicData = {};
  const next = safeString(value).trim();
  if (safeString(entity.dynamicData[fieldId]).trim() === next) return false;
  entity.dynamicData[fieldId] = next;
  return true;
}

export function hasAnyAutoSyncFieldChanged(ctx = {}, changedFieldIds, fieldKeys = []) {
  const changed = changedFieldIds instanceof Set ? changedFieldIds : new Set(changedFieldIds || []);
  if (changed.size === 0) return false;
  return (fieldKeys || []).some((fieldKey) => {
    const fieldId = getAutoSyncFieldId(ctx, fieldKey);
    return fieldId ? changed.has(fieldId) : false;
  });
}

export function hydrateTabsAutoSyncFieldMaps(tabsConfig) {
  if (!Array.isArray(tabsConfig) || tabsConfig.length === 0) {
    return { tabsConfig: Array.isArray(tabsConfig) ? tabsConfig : [], changed: false };
  }

  const nextTabs = cloneValue(tabsConfig);
  let changed = false;

  nextTabs.forEach((lon) => {
    const parentLabel = lon?.label || '';
    (lon?.subTabs || []).forEach((nho) => {
      if (nho?.viewType !== 'collection-track') return;
      const role = getEffectiveAutoSyncRole({
        activeTabLon: lon?.id || '',
        activeTabNho: nho?.id || '',
        currentTabConfig: nho,
        parentLabel,
      });
      if (!role) return;
      const explicitMap = readExplicitAutoSyncFieldMap(nho, role);
      const guessedMap = guessAutoSyncFieldMap({ role, currentTabConfig: nho });
      const merged = { ...guessedMap, ...explicitMap };
      const current = normalizeAutoSyncFieldMap(nho.autoSyncFieldMap, role);
      const mergedKeys = Object.keys(merged).sort();
      const currentKeys = Object.keys(current).sort();
      const sameKeys =
        mergedKeys.length === currentKeys.length &&
        mergedKeys.every((key, index) => key === currentKeys[index] && merged[key] === current[currentKeys[index]]);
      if (sameKeys || mergedKeys.length === 0) return;
      nho.autoSyncFieldMap = merged;
      changed = true;
    });
  });

  return { tabsConfig: changed ? nextTabs : tabsConfig, changed };
}

export function hydrateTabsAutoSyncConfigs(tabsConfig) {
  const roleHydrated = hydrateTabsAutoSyncRoles(tabsConfig);
  const fieldHydrated = hydrateTabsAutoSyncFieldMaps(roleHydrated.tabsConfig);
  return {
    tabsConfig: fieldHydrated.tabsConfig,
    changed: roleHydrated.changed || fieldHydrated.changed,
  };
}
