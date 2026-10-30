import { describe, expect, it } from 'vitest';
import { awaitNovelUpdateSync, awaitSyncNovelResult, isNovelUpdatePersisted } from './patchNovelData.js';

describe('awaitNovelUpdateSync', () => {
  it('returns no_novel when outcome is false', async () => {
    const result = await awaitNovelUpdateSync(false);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('no_novel');
  });

  it('returns no_sync_needed when outcome is true', async () => {
    const result = await awaitNovelUpdateSync(true);
    expect(result.ok).toBe(true);
    expect(result.reason).toBe('no_sync_needed');
  });

  it('awaits sync promise and surfaces ok:false', async () => {
    const result = await awaitNovelUpdateSync(
      Promise.resolve({ ok: false, mode: 'directory', reason: 'write_failed' })
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('write_failed');
  });

  it('awaits sync promise before caller would toast success', async () => {
    const order = [];
    const syncPromise = new Promise((resolve) => {
      setTimeout(() => {
        order.push('sync_done');
        resolve({ ok: true, mode: 'directory' });
      }, 5);
    });
    const flow = awaitNovelUpdateSync(syncPromise).then((r) => {
      order.push('after_await');
      return r;
    });
    order.push('scheduled');
    const result = await flow;
    expect(result.ok).toBe(true);
    expect(order).toEqual(['scheduled', 'sync_done', 'after_await']);
  });

  it('handles rejected sync promise', async () => {
    const result = await awaitNovelUpdateSync(Promise.reject(new Error('disk')));
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('sync_rejected');
  });
});

describe('awaitSyncNovelResult', () => {
  it('returns true when sync resolves ok', async () => {
    expect(await awaitSyncNovelResult(Promise.resolve({ ok: true }))).toBe(true);
  });

  it('returns false when sync resolves not ok', async () => {
    expect(await awaitSyncNovelResult(Promise.resolve({ ok: false }))).toBe(false);
  });
});

describe('isNovelUpdatePersisted', () => {
  it('mirrors awaitNovelUpdateSync ok flag', async () => {
    expect(await isNovelUpdatePersisted(false)).toBe(false);
    expect(await isNovelUpdatePersisted(Promise.resolve({ ok: true }))).toBe(true);
  });
});
