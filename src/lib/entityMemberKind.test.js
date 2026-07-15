import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MEMBER_KIND,
  MEMBER_KIND_FILTER_ALL,
  MEMBER_KINDS,
  countMembersByKind,
  filterMembersByKind,
  normalizeMemberKind,
  readMemberKind,
  resolveMemberKindDef,
} from './entityMemberKind.js';
import { normalizeEntityMemberInput } from './entityMembers.js';

describe('entityMemberKind', () => {
  it('normalizes known kinds and defaults unknown', () => {
    expect(normalizeMemberKind('asset')).toBe('asset');
    expect(normalizeMemberKind('ORG')).toBe('org');
    expect(normalizeMemberKind('')).toBe(DEFAULT_MEMBER_KIND);
    expect(normalizeMemberKind('invalid')).toBe(DEFAULT_MEMBER_KIND);
  });

  it('counts members by kind', () => {
    const members = [
      { id: 'a', name: 'A', kind: 'person' },
      { id: 'b', name: 'B', kind: 'asset' },
      { id: 'c', name: 'C' },
      { id: 'd', name: 'D', kind: 'asset' },
    ];
    expect(countMembersByKind(members)).toEqual({
      person: 2,
      asset: 2,
      org: 0,
      folder: 0,
      other: 0,
    });
  });

  it('filters by kind and keeps ancestor chain', () => {
    const members = [
      { id: 'root', name: 'Tài sản', kind: 'folder' },
      { id: 'mine', name: 'Mỏ A', kind: 'asset', parentId: 'root' },
      { id: 'boss', name: 'Tông chủ', kind: 'person' },
    ];
    const filtered = filterMembersByKind(members, 'asset');
    expect(filtered?.map((m) => m.id)).toEqual(['root', 'mine']);
    expect(filterMembersByKind(members, MEMBER_KIND_FILTER_ALL)).toBeNull();
  });

  it('persists kind through normalizeEntityMemberInput', () => {
    const out = normalizeEntityMemberInput({ name: 'Mỏ', kind: 'asset' }, { generateId: () => 'x' });
    expect(out.kind).toBe('asset');
    expect(readMemberKind(out)).toBe('asset');
  });

  it('exposes labels for each kind', () => {
    expect(MEMBER_KINDS.length).toBeGreaterThanOrEqual(4);
    expect(resolveMemberKindDef('asset').label).toMatch(/Tài sản/);
  });
});
