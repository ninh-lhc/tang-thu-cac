import { autoWrapWikiLinksByEntityMapWithCountCore } from '../lib/autoWrapWikiLinksCore.js';

self.onmessage = ({ data }) => {
  const { requestId, text, entityMap, options } = data || {};
  try {
    const result = autoWrapWikiLinksByEntityMapWithCountCore(text, entityMap, options || {});
    self.postMessage({ requestId, ok: true, result });
  } catch (error) {
    self.postMessage({
      requestId,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
