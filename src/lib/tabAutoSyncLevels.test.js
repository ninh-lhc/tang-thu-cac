import { describe, expect, it } from 'vitest';
import { getEffectiveTabAutoSyncLevelConfig } from './tabAutoSyncLevels.js';

describe('tabAutoSyncLevels', () => {
  it('defaults local levels on and linked levels off', () => {
    const cfg = getEffectiveTabAutoSyncLevelConfig({});
    expect(cfg.enabled).toBe(true);
    expect(cfg.levels).toEqual({
      level_1_card: true,
      level_2_list: true,
      level_3_linked: false,
      level_4_timeline: false,
    });
  });

  it('respects explicit level settings for special tabs', () => {
    const cfg = getEffectiveTabAutoSyncLevelConfig({
      autoSyncLevelConfig: {
        enabled: false,
        levels: {
          level_1_card: false,
          level_2_list: false,
        },
      },
    });
    expect(cfg.enabled).toBe(false);
    expect(cfg.levels.level_1_card).toBe(false);
    expect(cfg.levels.level_2_list).toBe(false);
    expect(cfg.levels.level_3_linked).toBe(false);
    expect(cfg.levels.level_4_timeline).toBe(false);
  });
});

