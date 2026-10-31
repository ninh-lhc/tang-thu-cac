/**
 * F-004: BroadcastChannel presence — open, close, heartbeat stale, missing API.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NOVEL_TAB_CHANNEL, useNovelTabWarning } from './useNovelTabWarning.js';

class MockChannel {
  static byName = new Map();
  static posts = [];

  constructor(name) {
    this.name = name;
    this.onmessage = null;
    if (!MockChannel.byName.has(name)) MockChannel.byName.set(name, new Set());
    MockChannel.byName.get(name).add(this);
  }

  postMessage(data) {
    MockChannel.posts.push({ name: this.name, data });
    for (const peer of MockChannel.byName.get(this.name) || []) {
      if (peer !== this) peer.onmessage?.({ data });
    }
  }

  close() {
    MockChannel.byName.get(this.name)?.delete(this);
  }
}

describe('useNovelTabWarning', () => {
  beforeEach(() => {
    MockChannel.byName = new Map();
    MockChannel.posts = [];
    vi.stubGlobal('BroadcastChannel', MockChannel);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('broadcasts novel-open when novelId is set', () => {
    renderHook(() => useNovelTabWarning('novel-a'));
    expect(MockChannel.posts.some((p) => p.data.type === 'novel-open' && p.data.novelId === 'novel-a')).toBe(
      true
    );
  });

  it('detects another tab on the same novel', () => {
    const { result } = renderHook(() => useNovelTabWarning('novel-a'));
    const peer = new MockChannel(NOVEL_TAB_CHANNEL);
    act(() => {
      peer.postMessage({ type: 'novel-open', novelId: 'novel-a', tabId: 'other-tab' });
    });
    expect(result.current.otherTabDetected).toBe(true);
  });

  it('clears otherTabDetected when that tab closes', () => {
    const { result } = renderHook(() => useNovelTabWarning('novel-a'));
    const peer = new MockChannel(NOVEL_TAB_CHANNEL);
    act(() => {
      peer.postMessage({ type: 'novel-open', novelId: 'novel-a', tabId: 'other-tab' });
    });
    act(() => {
      peer.postMessage({ type: 'novel-close', novelId: 'novel-a', tabId: 'other-tab' });
    });
    expect(result.current.otherTabDetected).toBe(false);
  });

  it('drops a peer that stops heartbeating', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useNovelTabWarning('novel-a'));
    const peer = new MockChannel(NOVEL_TAB_CHANNEL);
    act(() => {
      peer.postMessage({ type: 'heartbeat', novelId: 'novel-a', tabId: 'other-tab' });
    });
    expect(result.current.otherTabDetected).toBe(true);
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(result.current.otherTabDetected).toBe(false);
  });

  it('does nothing when BroadcastChannel is missing', () => {
    vi.unstubAllGlobals();
    delete globalThis.BroadcastChannel;
    const { result } = renderHook(() => useNovelTabWarning('novel-a'));
    expect(result.current.otherTabDetected).toBe(false);
  });

  it('broadcasts close for the old novel and open for the next', () => {
    const { rerender } = renderHook(({ id }) => useNovelTabWarning(id), {
      initialProps: { id: 'a' },
    });
    rerender({ id: 'b' });
    const events = MockChannel.posts.map((p) => `${p.data.type}:${p.data.novelId}`);
    expect(events).toContain('novel-close:a');
    expect(events).toContain('novel-open:b');
  });
});
