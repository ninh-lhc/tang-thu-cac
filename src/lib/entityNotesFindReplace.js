/**
 * Tìm & thay hàng loạt trong ghi chép chi tiết.
 * Tránh nhân đôi khi thay «Tần gia» → «Lĩnh Nam Tần gia» trên chỗ đã có tên đầy đủ.
 */

function safeString(value) {
  if (value == null || value === 'null' || value === 'undefined') return '';
  return String(value);
}

function escapeRegExp(value) {
  return safeString(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function equalsFold(a, b, caseSensitive) {
  if (caseSensitive) return a === b;
  return a.toLocaleLowerCase('vi-VN') === b.toLocaleLowerCase('vi-VN');
}

function buildFindRegex(find, { caseSensitive = false, wholeWord = true } = {}) {
  const needle = safeString(find);
  if (!needle) return null;
  const body = escapeRegExp(needle);
  const pattern = wholeWord
    ? `(?<![\\p{L}\\p{N}_])${body}(?![\\p{L}\\p{N}_])`
    : body;
  try {
    return new RegExp(pattern, caseSensitive ? 'gu' : 'gui');
  } catch {
    return new RegExp(escapeRegExp(needle), caseSensitive ? 'g' : 'gi');
  }
}

/**
 * Match đã nằm trong cụm «replaceWith» sẵn có (vd. «Tần gia» trong «Lĩnh Nam Tần gia»).
 */
function isAlreadyInsideReplacement(text, matchStart, matchEnd, find, replaceWith, caseSensitive) {
  const source = safeString(text);
  const needle = safeString(find);
  const replacement = safeString(replaceWith);
  if (!needle || !replacement || replacement.length < needle.length) return false;

  // Chỉ khi phần cuối của chuỗi thay thế khớp với cụm tìm (không phân biệt hoa thường nếu tắt).
  const suffix = replacement.slice(replacement.length - needle.length);
  const matched = source.slice(matchStart, matchEnd);
  if (!equalsFold(suffix, matched, caseSensitive) || !equalsFold(suffix, needle, caseSensitive)) {
    return false;
  }

  const prefixLen = replacement.length - needle.length;
  if (prefixLen <= 0) return false;
  if (matchStart < prefixLen) return false;

  const window = source.slice(matchStart - prefixLen, matchEnd);
  return equalsFold(window, replacement, caseSensitive);
}

function collectMatches(text, find, options = {}) {
  const source = safeString(text);
  const needle = safeString(find);
  const replacement = safeString(options.replaceWith ?? '');
  const caseSensitive = Boolean(options.caseSensitive);
  const wholeWord = options.wholeWord !== false;
  const re = buildFindRegex(needle, { caseSensitive, wholeWord });
  if (!re || !needle) return [];

  const out = [];
  let match = re.exec(source);
  while (match) {
    const start = match.index;
    const end = start + match[0].length;
    if (
      !isAlreadyInsideReplacement(source, start, end, needle, replacement, caseSensitive)
    ) {
      out.push({ start, end, matched: match[0] });
    }
    if (match[0].length === 0) {
      re.lastIndex += 1;
    }
    match = re.exec(source);
  }
  return out;
}

export function countEntityNotesFindMatches(text, find, options = {}) {
  return collectMatches(text, find, options).length;
}

/**
 * @returns {{ text: string, count: number }}
 */
export function replaceEntityNotesText(text, find, replaceWith, options = {}) {
  const source = safeString(text);
  const needle = safeString(find);
  const replacement = safeString(replaceWith);
  if (!needle) return { text: source, count: 0 };
  if (needle === replacement && options.caseSensitive !== false) {
    return { text: source, count: 0 };
  }

  const matches = collectMatches(source, needle, {
    ...options,
    replaceWith: replacement,
  });
  if (matches.length === 0) return { text: source, count: 0 };

  let out = '';
  let cursor = 0;
  matches.forEach((item) => {
    out += source.slice(cursor, item.start);
    out += replacement;
    cursor = item.end;
  });
  out += source.slice(cursor);
  return { text: out, count: matches.length };
}
