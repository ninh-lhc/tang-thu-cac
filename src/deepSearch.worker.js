import { runDeepSearch } from './deepSearchCore.js';

self.onmessage = (e) => {
  try {
    const results = runDeepSearch(e.data || {});
    self.postMessage({ ok: true, results });
  } catch (err) {
    self.postMessage({ ok: false, results: [], error: String(err?.message || err) });
  }
};
