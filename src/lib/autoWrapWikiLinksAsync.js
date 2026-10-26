/**
 * Auto-wrap qua Web Worker khi Lưu; fallback sync nếu Worker không dùng được.
 */
import { autoWrapWikiLinksByEntityMapWithCount } from './autoWrapWikiLinks.js';

let worker = null;
let nextRequestId = 1;
const pending = new Map();

export function serializeAutoWrapOptions(options = {}) {
  const optOuts = Array.isArray(options?.optOuts) ? options.optOuts : [];
  const tierLabelSet =
    options?.tierLabelSet instanceof Set ? [...options.tierLabelSet] : options?.tierLabelSet ?? null;
  return { optOuts, tierLabelSet };
}

function canUseWorker() {
  if (import.meta.env?.VITEST) return false;
  return typeof Worker !== 'undefined';
}

function getWorker() {
  if (worker) return worker;
  if (!canUseWorker()) return null;

  worker = new Worker(new URL('../workers/autoWrapWikiLinks.worker.js', import.meta.url), { type: 'module' });

  worker.addEventListener('message', ({ data }) => {
    const entry = pending.get(data?.requestId);
    if (!entry) return;
    pending.delete(data.requestId);
    if (data.ok) {
      entry.resolve(data.result);
    } else {
      entry.reject(new Error(data.error || 'autoWrap worker failed'));
    }
  });

  worker.addEventListener('error', (error) => {
    for (const entry of pending.values()) {
      entry.reject(error);
    }
    pending.clear();
    worker = null;
  });

  return worker;
}

export function autoWrapWikiLinksByEntityMapAsync(text, entityMap, options = {}) {
  const w = getWorker();
  if (!w) {
    return Promise.resolve(autoWrapWikiLinksByEntityMapWithCount(text, entityMap, options));
  }

  return new Promise((resolve, reject) => {
    const requestId = nextRequestId++;
    pending.set(requestId, { resolve, reject });
    try {
      w.postMessage({
        requestId,
        text,
        entityMap,
        options: serializeAutoWrapOptions(options),
      });
    } catch (error) {
      pending.delete(requestId);
      reject(error);
    }
  });
}

/** Dùng trên save path: Worker trước, sync fallback nếu lỗi. */
export async function autoWrapWikiLinksForSave(text, entityMap, options = {}) {
  try {
    return await autoWrapWikiLinksByEntityMapAsync(text, entityMap, options);
  } catch {
    return autoWrapWikiLinksByEntityMapWithCount(text, entityMap, options);
  }
}
