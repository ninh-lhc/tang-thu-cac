import { describe, expect, it } from 'vitest';
import { getQuickAuto3DefaultPair, validateQuickAuto3Pair } from './autoSyncQuickLinkSetup.js';

describe('autoSyncQuickLinkSetup', () => {
  it('returns empty target if only one collection tab (cannot pair)', () => {
    const sortedTabs = [
      {
        id: 'a',
        label: 'A',
        subTabs: [{ id: 'x', label: 'X', viewType: 'collection-track' }],
      },
    ];
    const pair = getQuickAuto3DefaultPair(sortedTabs);
    expect(pair.sourcePath).toBe('a::x');
    expect(pair.targetPath).toBe('');
  });

  it('picks a non-identical default source and target', () => {
    const sortedTabs = [
      {
        id: 'a',
        label: 'A',
        subTabs: [
          { id: 'x', label: 'X', viewType: 'collection-track', autoSyncRole: 'the-luc' },
        ],
      },
      {
        id: 'b',
        label: 'B',
        subTabs: [
          { id: 'y', label: 'Y', viewType: 'collection-track', autoSyncRole: 'ban-do' },
        ],
      },
    ];
    const pair = getQuickAuto3DefaultPair(sortedTabs);
    expect(pair.sourcePath).toBe('a::x');
    expect(pair.targetPath).toBe('b::y');
  });

  it('rejects identical paths', () => {
    const v = validateQuickAuto3Pair({ sourcePath: 'a::1', targetPath: 'a::1' });
    expect(v.ok).toBe(false);
  });
});
