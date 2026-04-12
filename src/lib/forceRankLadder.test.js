import { describe, expect, it } from 'vitest';

import {
  FORCE_SYSTEM_PRESETS,
  getForceRankOptionsForSystem,
  inferForceSystemKey,
  inferForceSystemLabel,
} from './forceRankLadder.js';

describe('forceRankLadder', () => {
  it('keeps the supported realm presets stable', () => {
    expect(FORCE_SYSTEM_PRESETS.map((item) => item.key)).toEqual([
      'cuu-cap',
      'vuong-gioi',
      'ton-gioi',
      'de-gioi',
    ]);
  });

  it('infers system keys from realm labels', () => {
    expect(inferForceSystemKey('Hoang Thú giới - Tôn giới')).toBe('ton-gioi');
    expect(inferForceSystemKey('Dạ Lang Tiên Tinh · Vương giới')).toBe('vuong-gioi');
    expect(inferForceSystemKey('Thiên vực Đế giới')).toBe('de-gioi');
    expect(inferForceSystemKey('Cửu cấp')).toBe('cuu-cap');
  });

  it('infers system keys from force rank labels too', () => {
    expect(inferForceSystemKey('Thiên Tôn cấp thế lực')).toBe('ton-gioi');
    expect(inferForceSystemKey('Địa Vương cấp thế lực')).toBe('vuong-gioi');
    expect(inferForceSystemKey('Đế Giả cấp thế lực')).toBe('de-gioi');
    expect(inferForceSystemLabel('Bát Cấp thế lực')).toBe('Cửu cấp');
  });

  it('returns the right ladder for each detected system', () => {
    expect(getForceRankOptionsForSystem('Tôn giới')).toEqual([
      'Thiên Tôn cấp thế lực',
      'Địa Tôn cấp thế lực',
      'Đại Tôn cấp thế lực',
      'Tôn Giả cấp thế lực',
      'Thiên Vương cấp thế lực',
      'Địa Vương cấp thế lực',
      'Đại Vương cấp thế lực',
      'Vương Giả cấp thế lực',
    ]);
    expect(getForceRankOptionsForSystem('Thiên Đế cấp thế lực')[0]).toBe('Thiên Đế cấp thế lực');
    expect(getForceRankOptionsForSystem('')).toEqual([]);
  });
});
