/**
 * AUD-001: dirty snapshot restore when folder sync fails after consumeDirtyShards.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  consumeDirtyShards,
  isShardDirty,
  markShardDirty,
} from './lib/dirtyShardTracker.js';

vi.mock('./lib/novelShadowStore.js', () => ({
  saveNovelShadow: vi.fn().mockResolvedValue(undefined),
  clearNovelShadow: vi.fn().mockResolvedValue(undefined),
  loadNovelShadow: vi.fn().mockResolvedValue(null),
  resolveNovelWithShadow: vi.fn((novel) => novel),
}));

const writeShardTreeMock = vi.fn();

vi.mock('./lib/novelDiskLayout.js', async (importOriginal) => {
  const mod = await importOriginal();
  return {
    ...mod,
    writeShardTree: (...args) => writeShardTreeMock(...args),
  };
});

vi.mock('./lib/novelDiskWritePolicy.js', async (importOriginal) => {
  const mod = await importOriginal();
  return {
    ...mod,
    withFsWriteRetry: (fn) => fn(1),
  };
});

import { useAppPersistence } from './useAppPersistence.js';
import * as novelDiskLayout from './lib/novelDiskLayout.js';

function makeNovel(overview = 'v1') {
  return {
    id: 'novel-dirty-restore',
    title: 'RestoreTest',
    folderName: 'RestoreTest',
    storageLayout: 'sharded',
    tabsConfig: [],
    data: {
      L: {
        S: { overview, entities: [] },
      },
    },
  };
}

function makeWritable({ failOnWrite = false } = {}) {
  return {
    write: failOnWrite
      ? vi.fn(async () => {
          throw new Error('manifest write failed');
        })
      : vi.fn(async () => {}),
    close: vi.fn(async () => {}),
  };
}

function makeMockRootDir({ manifestWriteFails = false } = {}) {
  const imagesDir = { kind: 'directory' };
  const dataDir = {
    kind: 'directory',
    entries: async function* entries() {},
    getDirectoryHandle: vi.fn(),
    removeEntry: vi.fn(),
  };
  const novelDir = {
    kind: 'directory',
    getDirectoryHandle: vi.fn(async (name) => {
      if (name === 'data') return dataDir;
      if (name === 'images') return imagesDir;
      throw new Error(`unexpected dir ${name}`);
    }),
    getFileHandle: vi.fn(async (name) => {
      if (name.endsWith('.backup.json')) {
        return { createWritable: vi.fn(async () => makeWritable()) };
      }
      return {
        createWritable: vi.fn(async () => makeWritable({ failOnWrite: manifestWriteFails })),
      };
    }),
  };
  const rootDir = {
    queryPermission: vi.fn(async () => 'granted'),
    requestPermission: vi.fn(async () => 'granted'),
    getDirectoryHandle: vi.fn(async () => novelDir),
  };
  return { rootDir, novelDir, dataDir };
}

function renderPersistenceHook() {
  const refs = {
    novelStatsByIdRef: { current: {} },
    genreTabsTemplatesRef: { current: {} },
    novelsMetadataRef: { current: [] },
    globalTabsConfigRef: { current: [] },
    dirHandleRef: { current: null },
    activeNovelDataRef: { current: null },
    setNovelStatsById: vi.fn(),
    showToast: vi.fn(),
  };
  const hook = renderHook(() => useAppPersistence(refs));
  return { ...hook, refs };
}

describe('useAppPersistence dirty restore (AUD-001)', () => {
  beforeEach(() => {
    consumeDirtyShards();
    writeShardTreeMock.mockReset();
    writeShardTreeMock.mockResolvedValue(undefined);
  });

  it('restores dirty keys when writeShardTree throws', async () => {
    writeShardTreeMock.mockRejectedValue(new Error('shard write failed'));
    const { rootDir } = makeMockRootDir();
    const { result } = renderPersistenceHook();
    markShardDirty('L', 'S');

    const syncResult = await result.current.syncNovel(makeNovel('after-edit'), rootDir, {
      immediate: true,
    });

    expect(syncResult.ok).toBe(false);
    expect(isShardDirty('L', 'S')).toBe(true);
  });

  it('retries write plan for dirty shard after failure (warm cache path)', async () => {
    writeShardTreeMock.mockRejectedValueOnce(new Error('first write failed'));
    writeShardTreeMock.mockResolvedValueOnce(undefined);
    const { rootDir } = makeMockRootDir();
    const { result } = renderPersistenceHook();
    markShardDirty('L', 'S');
    const novel = makeNovel('retry-content');

    const first = await result.current.syncNovel(novel, rootDir, { immediate: true });
    expect(first.ok).toBe(false);
    expect(isShardDirty('L', 'S')).toBe(true);

    const second = await result.current.syncNovel(novel, rootDir, { immediate: true });
    expect(second.ok).toBe(true);
    expect(writeShardTreeMock).toHaveBeenCalledTimes(2);
    const lastDirtyArg = writeShardTreeMock.mock.calls.at(-1)[2];
    expect(lastDirtyArg instanceof Set).toBe(true);
    expect(lastDirtyArg.has('L\x00S')).toBe(true);
  });

  it('keeps newly marked dirty keys when sync fails after consume', async () => {
    const gate = {};
    writeShardTreeMock.mockImplementation(
      () =>
        new Promise((resolve, reject) => {
          gate.resolve = resolve;
          gate.reject = reject;
        })
    );
    const { rootDir } = makeMockRootDir();
    const { result } = renderPersistenceHook();
    markShardDirty('L', 'A');
    const syncPromise = result.current.syncNovel(makeNovel('a'), rootDir, { immediate: true });
    await vi.waitFor(() => expect(writeShardTreeMock).toHaveBeenCalled());
    markShardDirty('L', 'B');
    gate.reject(new Error('write failed'));
    const syncResult = await syncPromise;

    expect(syncResult.ok).toBe(false);
    expect(isShardDirty('L', 'A')).toBe(true);
    expect(isShardDirty('L', 'B')).toBe(true);
  });

  it('leaves newly marked dirty keys after successful sync', async () => {
    const gate = {};
    writeShardTreeMock.mockImplementation(
      () =>
        new Promise((resolve, reject) => {
          gate.resolve = resolve;
          gate.reject = reject;
        })
    );
    const { rootDir } = makeMockRootDir();
    const { result } = renderPersistenceHook();
    markShardDirty('L', 'A');
    const syncPromise = result.current.syncNovel(makeNovel('ok'), rootDir, { immediate: true });
    await vi.waitFor(() => expect(writeShardTreeMock).toHaveBeenCalled());
    markShardDirty('L', 'B');
    gate.resolve();
    const syncResult = await syncPromise;

    expect(syncResult.ok).toBe(true);
    expect(isShardDirty('L', 'A')).toBe(false);
    expect(isShardDirty('L', 'B')).toBe(true);
  });

  it('does not consume dirty keys when manifest build fails before consume', async () => {
    const buildSpy = vi.spyOn(novelDiskLayout, 'buildDiskManifest').mockImplementation(() => {
      throw new Error('manifest build failed');
    });
    const { rootDir } = makeMockRootDir();
    const { result } = renderPersistenceHook();
    markShardDirty('L', 'S');

    const syncResult = await result.current.syncNovel(makeNovel(), rootDir, { immediate: true });

    expect(syncResult.ok).toBe(false);
    expect(syncResult.reason).toBe('manifest_build_failed');
    expect(isShardDirty('L', 'S')).toBe(true);
    buildSpy.mockRestore();
  });

  it('restores dirty keys when manifest write fails after shard write', async () => {
    const { rootDir } = makeMockRootDir({ manifestWriteFails: true });
    const { result } = renderPersistenceHook();
    markShardDirty('L', 'S');

    const syncResult = await result.current.syncNovel(makeNovel('manifest-fail'), rootDir, {
      immediate: true,
    });

    expect(syncResult.ok).toBe(false);
    expect(writeShardTreeMock).toHaveBeenCalled();
    expect(isShardDirty('L', 'S')).toBe(true);
  });
});
