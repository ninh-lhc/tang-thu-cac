/**
 * Trích xuất block ```ttc-data (JSON) từ Markdown ghi chép entity — chỉ JSON.parse, không eval.
 */
import { safeString } from './entityFieldValue.js';

export const TTC_DATA_FENCE_LANG = 'ttc-data';
/** Giới hạn kích thước nội dung JSON trong một fence (tránh parse quá nặng). */
export const TTC_DATA_MAX_BODY_CHARS = 65536;
export const TTC_DATA_MAX_KEYS = 200;
const TTC_DATA_KEY_RE = /^[\w.-]{1,64}$/;

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeTtcDataObject(parsed) {
  if (!isPlainObject(parsed)) return null;
  const out = {};
  let count = 0;
  for (const key of Object.keys(parsed)) {
    if (count >= TTC_DATA_MAX_KEYS) break;
    const id = String(key || '').trim();
    if (!id || !TTC_DATA_KEY_RE.test(id)) continue;
    out[id] = parsed[key];
    count += 1;
  }
  return out;
}

/**
 * Gộp mọi block ```ttc-data trong Markdown (block sau ghi đè key trùng).
 * @returns {Record<string, unknown>}
 */
export function parseTtcDataBlocksFromMarkdown(markdown) {
  const text = safeString(markdown);
  if (!text) return {};

  const merged = {};
  const lines = text.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('```')) {
      const fenceLang = trimmed.slice(3).trim().toLowerCase();
      if (fenceLang === TTC_DATA_FENCE_LANG) {
        const bodyLines = [];
        i += 1;
        while (i < lines.length) {
          const line = lines[i];
          if (safeString(line).trim().startsWith('```')) {
            i += 1;
            break;
          }
          bodyLines.push(line);
          i += 1;
        }
        const body = bodyLines.join('\n').trim();
        if (body.length > TTC_DATA_MAX_BODY_CHARS) {
          continue;
        }
        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch {
          continue;
        }
        const sanitized = sanitizeTtcDataObject(parsed);
        if (sanitized) {
          Object.assign(merged, sanitized);
        }
        continue;
      }
    }
    i += 1;
  }
  return merged;
}

/** @param {{ info?: string }} ent */
export function extractTtcDataFromEntityNote(ent) {
  return parseTtcDataBlocksFromMarkdown(ent?.info);
}
