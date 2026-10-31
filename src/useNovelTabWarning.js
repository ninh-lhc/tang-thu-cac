/**
 * Cảnh báo tab khác đang mở cùng truyện qua BroadcastChannel (F-004).
 * Không chặn ghi — Web Locks mới chặn. Không có API thì im lặng.
 * Ai gọi: App.jsx.
 */
import { useEffect, useRef, useState } from 'react';

export const NOVEL_TAB_CHANNEL = 'ttc-novel-tabs';
export const NOVEL_TAB_HEARTBEAT_MS = 10_000;
export const NOVEL_TAB_STALE_MS = 15_000;

function createTabId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `tab-${Math.random().toString(36).slice(2)}`;
}

export function useNovelTabWarning(novelId) {
  const tabIdRef = useRef(createTabId());
  const peersRef = useRef(new Map());
  const [otherTabDetected, setOtherTabDetected] = useState(false);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined;
    const id = novelId != null && String(novelId).length > 0 ? String(novelId) : '';
    const peers = peersRef.current;
    peers.clear();
    const resetTimer = setTimeout(() => {
      setOtherTabDetected(peers.size > 0);
    }, 0);
    if (!id) return () => clearTimeout(resetTimer);

    const channel = new BroadcastChannel(NOVEL_TAB_CHANNEL);
    const tabId = tabIdRef.current;

    const publishPresence = () => {
      const now = Date.now();
      for (const [peer, seen] of peersRef.current) {
        if (now - seen >= NOVEL_TAB_STALE_MS) peersRef.current.delete(peer);
      }
      setOtherTabDetected(peersRef.current.size > 0);
    };

    channel.onmessage = (event) => {
      const data = event?.data;
      if (!data || data.novelId !== id || data.tabId === tabId) return;
      if (data.type === 'novel-close') peersRef.current.delete(data.tabId);
      else if (data.type === 'novel-open' || data.type === 'heartbeat') {
        peersRef.current.set(data.tabId, Date.now());
      }
      publishPresence();
    };

    const send = (type) => {
      channel.postMessage({ type, novelId: id, tabId });
    };

    send('novel-open');
    const timer = setInterval(() => {
      send('heartbeat');
      publishPresence();
    }, NOVEL_TAB_HEARTBEAT_MS);

    return () => {
      clearTimeout(resetTimer);
      clearInterval(timer);
      try {
        send('novel-close');
      } catch {
        /* channel already closed */
      }
      channel.onmessage = null;
      channel.close();
      peers.clear();
    };
  }, [novelId]);

  return { otherTabDetected };
}
