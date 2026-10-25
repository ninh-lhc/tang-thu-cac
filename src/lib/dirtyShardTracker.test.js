import { describe, expect, it } from 'vitest';
import {
  consumeDirtyShards,
  isShardDirty,
  markAllShardsDirty,
  markShardDirty,
} from './dirtyShardTracker.js';

describe('dirtyShardTracker', () => {
  it('marks, reads, and clears on consume', () => {
    consumeDirtyShards();
    markShardDirty('lon', 'nho');
    expect(isShardDirty('lon', 'nho')).toBe(true);
    expect(isShardDirty('lon', 'other')).toBe(false);
    const snap = consumeDirtyShards();
    expect(snap.has('lon\x00nho')).toBe(true);
    expect(isShardDirty('lon', 'nho')).toBe(false);
  });

  it('markAllShardsDirty covers every tab bucket', () => {
    consumeDirtyShards();
    markAllShardsDirty({
      a: { one: { entities: [] }, two: { entities: [] } },
      b: { three: {} },
    });
    const snap = consumeDirtyShards();
    expect(snap.has('a\x00one')).toBe(true);
    expect(snap.has('a\x00two')).toBe(true);
    expect(snap.has('b\x00three')).toBe(true);
    expect(snap.size).toBe(3);
  });
});
