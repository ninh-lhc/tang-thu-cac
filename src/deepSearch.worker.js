import { runDeepSearch, searchNovelIndex, dedupeDeepSearchResults } from './deepSearchCore.js';

self.onmessage = (e) => {
  try {
    const msg = e.data || {};
    if (msg.type === 'searchRows') {
      const q = String(msg.query || '').trim().toLowerCase();
      const out = [];
      const rowsByNovel = msg.rowsByNovel || {};
      Object.values(rowsByNovel).forEach((rows) => {
        searchNovelIndex(rows, q, out);
      });
      self.postMessage({ ok: true, reqId: msg.reqId, results: dedupeDeepSearchResults(out) });
      return;
    }

    const results = runDeepSearch(msg);
    self.postMessage({ ok: true, reqId: msg.reqId, results });
  } catch (err) {
    const reqId = e?.data?.reqId;
    self.postMessage({ ok: false, reqId, results: [], error: String(err?.message || err) });
  }
};
