import { describe, expect, it } from 'vitest';
import {
  clearDirtyShardKeys,
  consumeDirtyShards,
  isShardDirty,
  markAllShardsDirty,
  markShardDirty,
  restoreDirtyShards,
  snapshotDirtyShards,
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

  it('restoreDirtyShards merges consumed snapshot after simulated write failure', () => {
    consumeDirtyShards();
    markShardDirty('lon', 'nho');
    const consumed = consumeDirtyShards();
    expect(isShardDirty('lon', 'nho')).toBe(false);
    restoreDirtyShards(consumed);
    expect(isShardDirty('lon', 'nho')).toBe(true);
    const again = consumeDirtyShards();
    expect(again.has('lon\x00nho')).toBe(true);
  });

  it('restoreDirtyShards keeps newly marked keys during pending write (A fail + B new)', () => {
    consumeDirtyShards();
    markShardDirty('L', 'A');
    const consumed = consumeDirtyShards();
    markShardDirty('L', 'B');
    restoreDirtyShards(consumed);
    expect(isShardDirty('L', 'A')).toBe(true);
    expect(isShardDirty('L', 'B')).toBe(true);
    const snap = consumeDirtyShards();
    expect(snap.has('L\x00A')).toBe(true);
    expect(snap.has('L\x00B')).toBe(true);
  });

  it('successful consume does not restore — new dirty B survives alone', () => {
    consumeDirtyShards();
    markShardDirty('L', 'A');
    consumeDirtyShards();
    markShardDirty('L', 'B');
    expect(isShardDirty('L', 'A')).toBe(false);
    expect(isShardDirty('L', 'B')).toBe(true);
    const snap = consumeDirtyShards();
    expect(snap.has('L\x00B')).toBe(true);
    expect(snap.has('L\x00A')).toBe(false);
  });

  it('restoreDirtyShards is idempotent and accepts empty/undefined', () => {
    consumeDirtyShards();
    markShardDirty('x', 'y');
    const consumed = consumeDirtyShards();
    restoreDirtyShards(undefined);
    restoreDirtyShards(new Set());
    restoreDirtyShards(consumed);
    restoreDirtyShards(consumed);
    expect(isShardDirty('x', 'y')).toBe(true);
  });

  it('markShardDirty duplicate marks do not duplicate restore entries', () => {
    consumeDirtyShards();
    markShardDirty('d', 'e');
    markShardDirty('d', 'e');
    const consumed = consumeDirtyShards();
    expect(consumed.size).toBe(1);
    restoreDirtyShards(consumed);
    const snap = consumeDirtyShards();
    expect(snap.size).toBe(1);
  });

  it('snapshotDirtyShards copies without clearing active set', () => {
    consumeDirtyShards();
    markShardDirty('lon', 'nho');
    const snap = snapshotDirtyShards();
    expect(snap.has('lon\x00nho')).toBe(true);
    expect(isShardDirty('lon', 'nho')).toBe(true);
    markShardDirty('lon', 'other');
    expect(snap.size).toBe(1);
    expect(isShardDirty('lon', 'other')).toBe(true);
  });

  it('clearDirtyShardKeys removes only flushed keys', () => {
    consumeDirtyShards();
    markShardDirty('L', 'A');
    markShardDirty('L', 'B');
    const snap = snapshotDirtyShards();
    clearDirtyShardKeys(snap);
    expect(isShardDirty('L', 'A')).toBe(false);
    expect(isShardDirty('L', 'B')).toBe(false);
    markShardDirty('L', 'C');
    clearDirtyShardKeys(snap);
    expect(isShardDirty('L', 'C')).toBe(true);
  });
});
