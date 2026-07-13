/**
 * Tránh bọc / highlight wiki cho tên cấp bậc trong chuỗi phân cấp (f_status).
 * Ví dụ: «Tu Luyện - Bạch ngân - Sơ Kỳ» — «Bạch ngân» là cấp, không phải thẻ vật liệu.
 */
import { normalizeAsciiText, splitMapHierarchyTokens, splitStatusHierarchyTokens } from './statusHierarchyParser.js';

function safeString(value) {
  if (value == null || value === 'null' || value === 'undefined') return '';
  return String(value);
}

function isHierarchyDelimiterChar(text, index) {
  const ch = text[index];
  if (!ch) return false;
  const prev = index > 0 ? text[index - 1] : '';
  const next = index + 1 < text.length ? text[index + 1] : '';
  if (ch === '-' && (/\s/.test(prev) || /\s/.test(next))) return true;
  if (ch === '\u2014' || ch === '\u2013') return true;
  if (ch === '·' || ch === '•') return true;
  if ((ch === '>' || ch === '→' || ch === '»' || ch === '|' || ch === '/') && /\s/.test(prev) && /\s/.test(next)) {
    return true;
  }
  return false;
}

/** Tách dòng phân cấp, giữ vị trí ký tự tuyệt đối từng token. */
export function tokenizeHierarchyLineWithSpans(source, rangeStart = 0, rangeEnd = source.length) {
  const text = safeString(source).slice(rangeStart, rangeEnd);
  const tokens = [];
  let part = '';
  let partStart = 0;

  for (let i = 0; i < text.length; i += 1) {
    if (!isHierarchyDelimiterChar(text, i)) {
      if (!part) partStart = i;
      part += text[i];
      continue;
    }

    const trimmed = part.trim();
    if (trimmed) {
      const lead = part.length - part.trimStart().length;
      const trail = part.trimEnd().length;
      tokens.push({
        text: trimmed,
        start: rangeStart + partStart + lead,
        end: rangeStart + partStart + trail,
      });
    }
    part = '';
    partStart = i + 1;
  }

  const tail = part.trim();
  if (tail) {
    const lead = part.length - part.trimStart().length;
    const trail = part.trimEnd().length;
    tokens.push({
      text: tail,
      start: rangeStart + partStart + lead,
      end: rangeStart + partStart + trail,
    });
  }

  return tokens;
}

function collectNormalizedTokens(value, bucket) {
  const raw = safeString(value).trim();
  if (!raw) return;
  const seen = new Set();
  for (const token of [...splitStatusHierarchyTokens(raw), ...splitMapHierarchyTokens(raw)]) {
    const key = normalizeAsciiText(token);
    if (!key || key.length < 2 || seen.has(key)) continue;
    seen.add(key);
    bucket.add(key);
  }
}

/** Tập nhãn cấp / phẩm từ gợi ý f_status và các chuỗi f_status đã nhập trong truyện. */
export function buildStatusTierLabelSet(activeNovelData) {
  const out = new Set();
  if (!activeNovelData) return out;

  for (const lon of activeNovelData.tabsConfig || []) {
    for (const sub of lon.subTabs || []) {
      const list = sub.fieldSuggestionLists?.f_status;
      if (!Array.isArray(list)) continue;
      list.forEach((line) => collectNormalizedTokens(line, out));
    }
  }

  for (const lonId of Object.keys(activeNovelData.data || {})) {
    for (const nhoId of Object.keys(activeNovelData.data[lonId] || {})) {
      const entities = activeNovelData.data[lonId][nhoId]?.entities || [];
      for (const ent of entities) {
        collectNormalizedTokens(ent?.dynamicData?.f_status || ent?.status || '', out);
      }
    }
  }

  return out;
}

export function findHierarchyChainAround(text, matchStart, matchEnd) {
  const source = safeString(text);
  if (matchStart < 0 || matchEnd <= matchStart || matchEnd > source.length) return null;

  const lineStart = source.lastIndexOf('\n', matchStart - 1) + 1;
  const lineEndRaw = source.indexOf('\n', matchEnd);
  const lineEnd = lineEndRaw < 0 ? source.length : lineEndRaw;
  const tokens = tokenizeHierarchyLineWithSpans(source, lineStart, lineEnd);
  if (tokens.length < 2) return null;

  const matchedNorm = normalizeAsciiText(source.slice(matchStart, matchEnd));
  if (!matchedNorm) return null;

  const matchedToken = tokens.find((token) => {
    if (matchStart < token.start || matchEnd > token.end) return false;
    return normalizeAsciiText(token.text) === matchedNorm;
  });
  if (!matchedToken) return null;

  return { tokens, matchedToken, tokenCount: tokens.length };
}

/**
 * Không auto-link / auto-wrap khi tên trùng thẻ vật liệu nhưng đang là mẩu trong chuỗi phân cấp.
 * Quy tắc:
 * - ≥2 mẩu và nhãn thuộc tập cấp bậc (gợi ý / f_status đã dùng) → bỏ qua
 * - ≥3 mẩu (chuỗi cấp dài) → bỏ qua mọi mẩu (metadata phân cấp, không phải wiki prose)
 */
export function shouldSkipWikiLinkInHierarchyContext(text, matchStart, matchEnd, options = {}) {
  const chain = findHierarchyChainAround(text, matchStart, matchEnd);
  if (!chain) return false;

  const normalized = normalizeAsciiText(safeString(text).slice(matchStart, matchEnd));
  if (!normalized) return false;

  const tierLabelSet = options.tierLabelSet;
  if (tierLabelSet instanceof Set && tierLabelSet.size > 0 && tierLabelSet.has(normalized)) {
    return true;
  }

  return chain.tokenCount >= 3;
}
