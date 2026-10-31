/**
 * F-001: dirty snapshot — giữ active set khi write fail; clear sau flush OK.
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
import { clearNovelShadow, loadNovelShadow, resolveNovelWithShadow, saveNovelShadow } from './lib/novelShadowStore.js';
import { canonicalShardJson, quickHash, shardRelPath } from './shardIntegrity.js';
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

function makeWritable({ failOnWrite = false, sink = null, label = '' } = {}) {
  return {
    write: vi.fn(async (text) => {
      if (failOnWrite) throw new Error('manifest write failed');
      if (sink) sink.push({ label, text });
    }),
    close: vi.fn(async () => {}),
  };
}

function makeMockRootDir({ manifestWriteFails = false } = {}) {
  const diskWrites = [];
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
        return { createWritable: vi.fn(async () => makeWritable({ sink: diskWrites, label: name })) };
      }
      return {
        createWritable: vi.fn(async () =>
          makeWritable({ failOnWrite: manifestWriteFails, sink: diskWrites, label: name })
        ),
      };
    }),
  };
  const rootDir = {
    queryPermission: vi.fn(async () => 'granted'),
    requestPermission: vi.fn(async () => 'granted'),
    getDirectoryHandle: vi.fn(async () => novelDir),
  };
  return { rootDir, novelDir, dataDir, diskWrites };
}

function renderPersistenceHook(extra = {}) {
  const refs = {
    novelStatsByIdRef: { current: {} },
    genreTabsTemplatesRef: { current: {} },
    novelsMetadataRef: { current: [] },
    globalTabsConfigRef: { current: [] },
    dirHandleRef: { current: null },
    activeNovelDataRef: { current: null },
    setNovelStatsById: vi.fn(),
    showToast: vi.fn(),
    ...extra,
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

  it('keeps dirty keys in active set when writeShardTree throws (no pre-consume)', async () => {
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

  it('does not clear dirty keys when manifest build fails before write', async () => {
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

  it('keeps dirty keys when manifest write fails after shard write', async () => {
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

  it('clears dirty keys only after successful folder sync', async () => {
    const { rootDir } = makeMockRootDir();
    const { result } = renderPersistenceHook();
    markShardDirty('L', 'S');

    const syncResult = await result.current.syncNovel(makeNovel('flushed'), rootDir, {
      immediate: true,
    });

    expect(syncResult.ok).toBe(true);
    expect(isShardDirty('L', 'S')).toBe(false);
  });

  it('does not write shards or clear shadow when another tab holds the session lock', async () => {
    saveNovelShadow.mockClear();
    clearNovelShadow.mockClear();
    const { rootDir } = makeMockRootDir();
    const novelSessionLockRef = {
      current: {
        novelId: 'novel-dirty-restore',
        hasLock: false,
        isLockSupported: true,
        lockError: 'busy',
      },
    };
    const { result } = renderPersistenceHook({ novelSessionLockRef });
    markShardDirty('L', 'S');

    const syncResult = await result.current.syncNovel(makeNovel('blocked'), rootDir, {
      immediate: true,
    });

    expect(syncResult.ok).toBe(false);
    expect(syncResult.reason).toBe('locked_by_other_tab');
    expect(writeShardTreeMock).not.toHaveBeenCalled();
    expect(saveNovelShadow).not.toHaveBeenCalled();
    expect(clearNovelShadow).not.toHaveBeenCalled();
    expect(isShardDirty('L', 'S')).toBe(true);
  });

  it('writes shardCommit on the manifest and bumps generation', async () => {
    const { rootDir, diskWrites } = makeMockRootDir();
    const { result } = renderPersistenceHook();
    markShardDirty('L', 'S');

    const first = await result.current.syncNovel(makeNovel('g1'), rootDir, { immediate: true });
    expect(first.ok).toBe(true);
    const firstManifest = JSON.parse(diskWrites.find((w) => w.label === 'RestoreTest.json').text);
    const tab = { overview: 'g1', entities: [] };
    const path = shardRelPath('L', 'S');
    expect(firstManifest.data).toEqual({});
    expect(firstManifest.shardCommit.generation).toBe(1);
    expect(firstManifest.shardCommit.shardHashes[path]).toBe(quickHash(canonicalShardJson(tab)));

    markShardDirty('L', 'S');
    const second = await result.current.syncNovel(makeNovel('g2'), rootDir, { immediate: true });
    expect(second.ok).toBe(true);
    const manifests = diskWrites.filter((w) => w.label === 'RestoreTest.json').map((w) => JSON.parse(w.text));
    expect(manifests.at(-1).shardCommit.generation).toBe(2);
    expect(manifests.at(-1).shardCommit.shardHashes[path]).toBe(
      quickHash(canonicalShardJson({ overview: 'g2', entities: [] }))
    );
  });

  it('torn load without shadow warns and marks shards dirty', async () => {
    const readSpy = vi.spyOn(novelDiskLayout, 'readRawNovelPackageFromDir').mockResolvedValue({
      id: 'novel-dirty-restore',
      title: 'RestoreTest',
      folderName: 'RestoreTest',
      storageLayout: 'sharded',
      tabsConfig: [],
      data: { L: { S: { overview: 'torn', entities: [] } } },
      __integrityStatus: 'torn',
    });
    loadNovelShadow.mockResolvedValueOnce(null);
    const { rootDir } = makeMockRootDir();
    const { result, refs } = renderPersistenceHook();

    const loaded = await result.current.loadNovelData(
      { id: 'novel-dirty-restore', title: 'RestoreTest', folderName: 'RestoreTest' },
      rootDir
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(loaded.novel.data.L.S.overview).toBe('torn');
    expect(refs.showToast).toHaveBeenCalled();
    const message = refs.showToast.mock.calls.map((call) => call[0]).join('\n');
    expect(message).toMatch(/chưa đồng bộ/);
    expect(isShardDirty('L', 'S')).toBe(true);
    readSpy.mockRestore();
  });

  it('torn load with shadow restores the draft without forcing dirty', async () => {
    const readSpy = vi.spyOn(novelDiskLayout, 'readRawNovelPackageFromDir').mockResolvedValue({
      id: 'novel-dirty-restore',
      title: 'RestoreTest',
      folderName: 'RestoreTest',
      storageLayout: 'sharded',
      tabsConfig: [],
      data: { L: { S: { overview: 'disk', entities: [] } } },
      __integrityStatus: 'torn',
    });
    loadNovelShadow.mockResolvedValueOnce({
      novel: {
        id: 'novel-dirty-restore',
        title: 'RestoreTest',
        data: { L: { S: { overview: 'shadow', entities: [] } } },
      },
      updatedAt: 1,
    });
    resolveNovelWithShadow.mockImplementationOnce((disk, shadowRecord) => ({
      novel: shadowRecord.novel,
      fromShadow: true,
    }));
    const { rootDir } = makeMockRootDir();
    const { result, refs } = renderPersistenceHook();

    const loaded = await result.current.loadNovelData(
      { id: 'novel-dirty-restore', title: 'RestoreTest', folderName: 'RestoreTest' },
      rootDir
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(loaded.novel.data.L.S.overview).toBe('shadow');
    expect(loaded.novel.__recoveredFromShadow).toBe(true);
    const message = refs.showToast.mock.calls.map((call) => call[0]).join('\n');
    expect(message).toMatch(/bản nháp/);
    expect(isShardDirty('L', 'S')).toBe(false);
    readSpy.mockRestore();
  });

  it('syncNovel localStorage mode resolves ok without shard dirty tracker', async () => {
    const { result } = renderPersistenceHook();
    const novel = makeNovel('local');
    const syncResult = await result.current.syncNovel(novel, 'LOCAL_STORAGE');
    expect(syncResult.ok).toBe(true);
    expect(syncResult.mode).toBe('local');
  });
});
