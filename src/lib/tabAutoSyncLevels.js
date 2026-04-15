export const AUTO_SYNC_LEVEL_1 = 'level_1_card';
export const AUTO_SYNC_LEVEL_2 = 'level_2_list';
export const AUTO_SYNC_LEVEL_3 = 'level_3_linked';
export const AUTO_SYNC_LEVEL_4 = 'level_4_timeline';

export const AUTO_SYNC_LEVEL_ORDER = Object.freeze([
  AUTO_SYNC_LEVEL_1,
  AUTO_SYNC_LEVEL_2,
  AUTO_SYNC_LEVEL_3,
  AUTO_SYNC_LEVEL_4,
]);

const DEFAULT_LEVELS = Object.freeze({
  [AUTO_SYNC_LEVEL_1]: true,
  [AUTO_SYNC_LEVEL_2]: true,
  [AUTO_SYNC_LEVEL_3]: false,
  [AUTO_SYNC_LEVEL_4]: false,
});

export function normalizeTabAutoSyncLevelConfig(value) {
  const raw = value && typeof value === 'object' ? value : {};
  const rawLevels = raw.levels && typeof raw.levels === 'object' ? raw.levels : {};
  const levels = {};
  AUTO_SYNC_LEVEL_ORDER.forEach((levelKey) => {
    const hasExplicit = Object.prototype.hasOwnProperty.call(rawLevels, levelKey);
    levels[levelKey] = hasExplicit ? Boolean(rawLevels[levelKey]) : DEFAULT_LEVELS[levelKey];
  });
  return {
    enabled: raw.enabled !== false,
    levels,
  };
}

export function getEffectiveTabAutoSyncLevelConfig(tabConfig) {
  return normalizeTabAutoSyncLevelConfig(tabConfig?.autoSyncLevelConfig);
}

