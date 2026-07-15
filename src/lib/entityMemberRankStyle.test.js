import { describe, expect, it } from 'vitest';
import { resolveMemberRankStyle } from './entityMemberRankStyle.js';

describe('resolveMemberRankStyle', () => {
  it('maps role text to rank colors', () => {
    expect(resolveMemberRankStyle({ role: 'Tông chủ' }).id).toBe('leader');
    expect(resolveMemberRankStyle({ role: 'Cung Chủ' }).id).toBe('leader');
    expect(resolveMemberRankStyle({ role: 'Trưởng lão' }).id).toBe('elder');
    expect(resolveMemberRankStyle({ role: 'Đệ tử nội môn' }).id).toBe('disciple');
    expect(resolveMemberRankStyle({ role: 'Hộ pháp' }).id).toBe('guard');
  });

  it('falls back to tree depth when role is empty', () => {
    expect(resolveMemberRankStyle({ depth: 0 }).id).toBe('leader');
    expect(resolveMemberRankStyle({ depth: 1 }).id).toBe('elder');
    expect(resolveMemberRankStyle({ depth: 2 }).id).toBe('disciple');
    expect(resolveMemberRankStyle({ depth: 5 }).id).toBe('guard');
  });

  it('uses kind-based fallback for non-person members', () => {
    expect(resolveMemberRankStyle({ kind: 'asset', depth: 0 }).id).toBe('asset');
    expect(resolveMemberRankStyle({ kind: 'org', depth: 0 }).id).toBe('org');
    expect(resolveMemberRankStyle({ kind: 'person', depth: 0 }).id).toBe('leader');
  });
});
