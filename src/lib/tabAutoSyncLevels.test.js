import { describe, expect, it } from 'vitest';
import { getEffectiveTabAutoSyncLevelConfig } from './tabAutoSyncLevels.js';

describe('tabAutoSyncLevels', () => {
  it('defaults all 4 levels to enabled', () => {
    const cfg = getEffectiveTabAutoSyncLevelConfig({});
    expect(cfg.enabled).toBe(true);
    expect(cfg.levels).toEqual({
      level_1_card: true,
      level_2_list: true,
      level_3_linked: true,
      level_4_timeline: true,
    });
  });

  it('normalizes partial config safely', () => {
    const cfg = getEffectiveTabAutoSyncLevelConfig({
      autoSyncLevelConfig: {
        enabled: false,
        levels: {
          level_2_list: false,
        },
      },
    });
    expect(cfg.enabled).toBe(false);
    expect(cfg.levels.level_1_card).toBe(true);
    expect(cfg.levels.level_2_list).toBe(false);
    expect(cfg.levels.level_3_linked).toBe(true);
    expect(cfg.levels.level_4_timeline).toBe(true);
  });
});

