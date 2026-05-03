import { describe, expect, it } from 'vitest';
import { composeForceQuickDisplayLine, extractForceQuickRankLabel } from './forceQuickDisplayParse.js';

describe('forceQuickDisplayParse', () => {
  it('extracts rank token from composed «Thế lực» status line', () => {
    const org = 'Đế Quốc';
    const realm = 'Hạ Giới';
    const rank = 'Cửu Cấp';
    const loc = 'Băng Thiên Đại Lục';
    const composed = composeForceQuickDisplayLine(org, realm, rank, loc);
    expect(composed).toContain('·');
    expect(extractForceQuickRankLabel(composed, org, realm, loc)).toBe(rank);
  });

  it('returns empty rank when status matches org·realm·loc only', () => {
    const org = 'Tông Môn';
    const realm = 'Thượng Giới';
    const loc = 'Thánh Địa';
    const composed = composeForceQuickDisplayLine(org, realm, '', loc);
    expect(extractForceQuickRankLabel(composed, org, realm, loc)).toBe('');
  });
});
