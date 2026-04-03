/**
 * Tao nhan wiki "co ngu canh" cho cac entity trung ten.
 * Du lieu AUTO co the dung nhan nay de tro dung den entity dich mong muon.
 */
import { parseStatusHierarchy, splitStatusHierarchyTokens } from './statusHierarchyParser.js';

function safeString(value) {
  if (value == null || value === 'null' || value === 'undefined') return '';
  return String(value);
}

function pushUnique(out, seen, value) {
  const text = safeString(value).replace(/\[\[|\]\]/g, '').trim();
  const key = text.toLowerCase();
  if (!text || seen.has(key)) return;
  seen.add(key);
  out.push(text);
}

function buildContextualVariants(baseName, chain, out, seen) {
  const base = safeString(baseName).trim();
  const parts = (Array.isArray(chain) ? chain : []).map((item) => safeString(item).trim()).filter(Boolean);
  if (!base || parts.length === 0) return;
  pushUnique(out, seen, `${base} - ${parts[0]}`);
  if (parts.length > 1) {
    pushUnique(out, seen, `${base} - ${parts.join(' - ')}`);
  }
}

export function buildSyntheticWikiNames({ name = '', statusLine = '', pathLine = '' } = {}) {
  const out = [];
  const seen = new Set();
  const base = safeString(name).trim();
  if (!base) return out;

  const parsedStatus = parseStatusHierarchy(statusLine);
  buildContextualVariants(base, parsedStatus?.chain || [], out, seen);
  buildContextualVariants(base, splitStatusHierarchyTokens(pathLine), out, seen);

  return out;
}

export function buildPreferredWikiName(input) {
  return buildSyntheticWikiNames(input)[0] || safeString(input?.name).trim();
}
