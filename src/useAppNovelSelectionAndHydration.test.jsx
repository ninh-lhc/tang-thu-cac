/**
 * AUD-003: lazy tab shard load must not mark dirty when only hydrating from disk.
 */
import React, { useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import * as dirtyShardTracker from './lib/dirtyShardTracker.js';
import {
  consumeDirtyShards,
  isShardDirty,
  markShardDirty,
} from './lib/dirtyShardTracker.js';
import { buildShardWritePlan } from './lib/novelDiskLayout.js';
import { useAppNovelSelectionAndHydration } from './useAppNovelSelectionAndHydration.js';

const mockDir = { queryPermission: async () => 'granted' };

function noop() {}

function makeShardedNovel(missingTab = true) {
  const data = {};
  if (!missingTab) {
    data.L = { S: { overview: 'cached', entities: [] } };
  } else {
    data.L = {};
  }
  return {
    id: 'novel-aud003',
    title: 'T',
    storageLayout: 'sharded',
    tabsConfig: [],
    data,
    __partialData: true,
  };
}

function LazyLoadHarness({ loadNovelData, initialNovel = makeShardedNovel(true) }) {
  const [activeNovelData, setActiveNovelData] = useState(initialNovel);
  const lazyTabLoadInFlightRef = useRef(new Set());
  const lazyFullHydrateInFlightRef = useRef(new Set());
  const novelsMetadataRef = useRef([]);
  const globalTabsConfigRef = useRef([]);
  const novelStatsByIdRef = useRef({});
  const deepSearchIndexByNovelIdRef = useRef(new Map());

  useAppNovelSelectionAndHydration({
    dirHandle: mockDir,
    activeNovelData,
    activeTabLon: 'L',
    activeTabNho: 'S',
    globalTabsConfig: [],
    loadNovelData,
    syncNovel: noop,
    syncIndex: noop,
    showToast: noop,
    setMenu1Visible: noop,
    setSelectedEntityId: noop,
    setNavHistory: noop,
    setActiveTabLon: noop,
    setActiveTabNho: noop,
    setActiveTabCon: noop,
    setCollectionSubTab: noop,
    setIsEditingMode: noop,
    setIsEntityEditing: noop,
    setIsUploading: noop,
    setActiveNovelData,
    setActiveNovelDirHandle: noop,
    novelsMetadataRef,
    globalTabsConfigRef,
    novelStatsByIdRef,
    setNovelStatsById: noop,
    lazyTabLoadInFlightRef,
    lazyFullHydrateInFlightRef,
    deepSearchIndexByNovelIdRef,
  });

  return null;
}

describe('useAppNovelSelectionAndHydration lazy shard load (AUD-003)', () => {
  beforeEach(() => {
    consumeDirtyShards();
  });

  afterEach(() => {
    cleanup();
  });

  it('does not mark shard dirty after read-only lazy-load merge', async () => {
    const tabPayload = { overview: 'from-disk', entities: [{ id: 'e1', name: 'A' }] };
    const loadNovelData = vi.fn(async () => ({
      novel: {
        data: { L: { S: tabPayload } },
        __partialData: true,
      },
      novelDir: null,
    }));

    render(<LazyLoadHarness loadNovelData={loadNovelData} />);

    await waitFor(() => expect(loadNovelData).toHaveBeenCalled());
    await waitFor(() => expect(isShardDirty('L', 'S')).toBe(false));
  });

  it('does not add lazy-loaded shard to write plan when dirty tracker is empty', async () => {
    const tabPayload = { overview: 'from-disk', entities: [] };
    const jsonStr = JSON.stringify(tabPayload, null, 2);
    const prevHashes = new Map([['L/S.json', jsonStr]]);
    const loadNovelData = vi.fn(async () => ({
      novel: { data: { L: { S: tabPayload } }, __partialData: true },
      novelDir: null,
    }));

    render(<LazyLoadHarness loadNovelData={loadNovelData} />);
    await waitFor(() => expect(loadNovelData).toHaveBeenCalled());

    const plan = buildShardWritePlan(
      { L: { S: tabPayload } },
      prevHashes,
      consumeDirtyShards()
    );
    expect(plan.writes.length).toBe(0);
  });

  it('preserves pre-existing dirty keys when lazy-loading another shard', async () => {
    markShardDirty('L', 'A');
    const loadNovelData = vi.fn(async () => ({
      novel: {
        data: { L: { S: { overview: '', entities: [] } } },
        __partialData: true,
      },
      novelDir: null,
    }));

    render(<LazyLoadHarness loadNovelData={loadNovelData} />);
    await waitFor(() => expect(loadNovelData).toHaveBeenCalled());

    expect(isShardDirty('L', 'A')).toBe(true);
    expect(isShardDirty('L', 'S')).toBe(false);
  });

  it('user edit path can still mark shard dirty after lazy-load', async () => {
    const loadNovelData = vi.fn(async () => ({
      novel: {
        data: { L: { S: { overview: '', entities: [] } } },
        __partialData: true,
      },
      novelDir: null,
    }));

    render(<LazyLoadHarness loadNovelData={loadNovelData} />);
    await waitFor(() => expect(loadNovelData).toHaveBeenCalled());
    expect(isShardDirty('L', 'S')).toBe(false);

    act(() => {
      markShardDirty('L', 'S');
    });
    expect(isShardDirty('L', 'S')).toBe(true);
  });
});

function FullHydrateHarness({ loadNovelData, initialNovel }) {
  const [activeNovelData, setActiveNovelData] = useState(initialNovel);
  const lazyTabLoadInFlightRef = useRef(new Set());
  const lazyFullHydrateInFlightRef = useRef(new Set());
  const novelsMetadataRef = useRef([]);
  const globalTabsConfigRef = useRef([{ id: 'tong-quan', label: 'Tổng quan', subTabs: [] }]);
  const novelStatsByIdRef = useRef({});
  const deepSearchIndexByNovelIdRef = useRef(new Map());

  useAppNovelSelectionAndHydration({
    dirHandle: mockDir,
    activeNovelData,
    activeTabLon: 'tong-quan',
    activeTabNho: null,
    globalTabsConfig: globalTabsConfigRef.current,
    loadNovelData,
    syncNovel: noop,
    syncIndex: noop,
    showToast: noop,
    setMenu1Visible: noop,
    setSelectedEntityId: noop,
    setNavHistory: noop,
    setActiveTabLon: noop,
    setActiveTabNho: noop,
    setActiveTabCon: noop,
    setCollectionSubTab: noop,
    setIsEditingMode: noop,
    setIsEntityEditing: noop,
    setIsUploading: noop,
    setActiveNovelData,
    setActiveNovelDirHandle: noop,
    novelsMetadataRef,
    globalTabsConfigRef,
    novelStatsByIdRef,
    setNovelStatsById: noop,
    lazyTabLoadInFlightRef,
    lazyFullHydrateInFlightRef,
    deepSearchIndexByNovelIdRef,
  });

  return null;
}

describe('useAppNovelSelectionAndHydration full hydrate (F-007)', () => {
  beforeEach(() => {
    consumeDirtyShards();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('does not mark all shards dirty on read-only full hydrate', async () => {
    const markSpy = vi.spyOn(dirtyShardTracker, 'markAllShardsDirty');
    const tabsConfig = [{ id: 'tong-quan', label: 'Tổng quan', subTabs: [] }];
    const partial = {
      id: 'novel-f007',
      title: 'T',
      storageLayout: 'sharded',
      tabsConfig,
      data: { L: { S: { entities: [] } } },
      __partialData: true,
    };
    const loadNovelData = vi.fn(async () => ({
      novel: {
        ...partial,
        data: { L: { S: { entities: [{ id: 'e1', name: 'A' }] } } },
        __partialData: undefined,
      },
      novelDir: null,
    }));

    render(<FullHydrateHarness loadNovelData={loadNovelData} initialNovel={partial} />);

    await waitFor(() => expect(loadNovelData).toHaveBeenCalled());
    await waitFor(() => expect(markSpy).not.toHaveBeenCalled());
  });
});
