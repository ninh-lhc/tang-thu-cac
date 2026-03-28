/**
 * Ghép gợi ý [[wiki link]] lên văn bản gốc — chỉ chèn [[ ]], không đổi ký tự khác.
 * Ai dùng: AppEntityDetailNotes (AI Tạo Link), có thể tái dùng cho modal khác.
 */

function hasAdjacentWikiWrap(original, tStart, tEnd) {
  return (
    tStart >= 2 &&
    original.slice(tStart - 2, tStart) === '[[' &&
    tEnd + 2 <= original.length &&
    original.slice(tEnd, tEnd + 2) === ']]'
  );
}

/** true nếu [tStart, tEnd) nằm trong một khối [[...]] đã có (tránh [[ lồng ]] sai). */
function isInsideExistingWikiLink(original, tStart, tEnd) {
  let searchEnd = tStart;
  while (searchEnd > 0) {
    const open = original.lastIndexOf('[[', searchEnd - 1);
    if (open === -1) return false;
    const close = original.indexOf(']]', open + 2);
    if (close === -1) return false;
    if (open < tStart && close >= tEnd) return true;
    searchEnd = open;
  }
  return false;
}

/**
 * @param {string} original
 * @param {Array<{ before?: string, target?: string, after?: string }>} linkSpots
 * @returns {string}
 */
export function applyWikiLinkSpots(original, linkSpots) {
  if (typeof original !== 'string' || !Array.isArray(linkSpots) || linkSpots.length === 0) {
    return original;
  }

  const ranges = [];
  const seen = new Set();

  for (const raw of linkSpots) {
    const before = raw?.before != null ? String(raw.before) : '';
    const target = raw?.target != null ? String(raw.target) : '';
    const after = raw?.after != null ? String(raw.after) : '';
    if (!target) continue;

    const needle = before + target + after;
    const idx = original.indexOf(needle);
    if (idx === -1) continue;

    const tStart = idx + before.length;
    const tEnd = tStart + target.length;
    const key = `${tStart},${tEnd}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (hasAdjacentWikiWrap(original, tStart, tEnd)) continue;
    if (isInsideExistingWikiLink(original, tStart, tEnd)) continue;

    ranges.push({ tStart, tEnd });
  }

  ranges.sort((a, b) => a.tStart - b.tStart || b.tEnd - a.tEnd);
  const merged = [];
  for (const r of ranges) {
    if (merged.length > 0) {
      const prev = merged[merged.length - 1];
      if (r.tStart < prev.tEnd) continue;
    }
    merged.push(r);
  }

  let out = '';
  let cursor = 0;
  for (const { tStart, tEnd } of merged) {
    out += original.slice(cursor, tStart);
    out += '[[' + original.slice(tStart, tEnd) + ']]';
    cursor = tEnd;
  }
  out += original.slice(cursor);
  return out;
}
