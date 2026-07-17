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

/** Bỏ [[ ]] bọc ngoài nếu người dùng dán sẵn wiki vào ô thay thế. */
export function stripWikiBracketLabel(value) {
  const raw = safeString(value).trim();
  if (!raw) return '';
  if (raw.startsWith('[[') && raw.endsWith(']]')) {
    return raw.slice(2, -2).trim();
  }
  return raw;
}

export function formatWikiLinkLabel(value) {
  const inner = stripWikiBracketLabel(value);
  if (!inner) return '';
  return `[[${inner}]]`;
}

function collectWikiRanges(text) {
  const source = safeString(text);
  const ranges = [];
  const wikiRe = /\[\[[\s\S]*?\]\]/g;
  let match;
  while ((match = wikiRe.exec(source)) !== null) {
    ranges.push({
      start: match.index,
      end: match.index + match[0].length,
      innerStart: match.index + 2,
      innerEnd: match.index + match[0].length - 2,
    });
  }
  return ranges;
}

function findContainingWikiRange(ranges, matchStart, matchEnd) {
  return ranges.find((range) => matchStart >= range.innerStart && matchEnd <= range.innerEnd) || null;
}

/** Cụm tìm thấy đã nằm trong [[…]] — không bọc lại. */
function isInsideWikiLink(ranges, matchStart, matchEnd) {
  return Boolean(findContainingWikiRange(ranges, matchStart, matchEnd));
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
  const skipAlreadyWiki = Boolean(options.wrapMatched);
  const wrapReplacement = Boolean(options.wrapReplacement);
  const wikiRanges = skipAlreadyWiki || wrapReplacement ? collectWikiRanges(source) : [];
  const re = buildFindRegex(needle, { caseSensitive, wholeWord });
  if (!re || !needle) return [];

  const out = [];
  let match = re.exec(source);
  while (match) {
    const start = match.index;
    const end = start + match[0].length;
    const containingWiki = wikiRanges.length ? findContainingWikiRange(wikiRanges, start, end) : null;
    if (skipAlreadyWiki && isInsideWikiLink(wikiRanges, start, end)) {
      if (match[0].length === 0) re.lastIndex += 1;
      match = re.exec(source);
      continue;
    }
    if (
      !isAlreadyInsideReplacement(source, start, end, needle, replacement, caseSensitive)
    ) {
      if (
        wrapReplacement &&
        containingWiki &&
        start === containingWiki.innerStart &&
        end === containingWiki.innerEnd
      ) {
        out.push({
          start: containingWiki.start,
          end: containingWiki.end,
          matched: match[0],
          replaceWholeWikiLink: true,
        });
      } else {
        out.push({ start, end, matched: match[0], insideWikiLink: Boolean(containingWiki) });
      }
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

function resolveReplacementText(matched, replaceWith, options = {}) {
  const replacement = safeString(replaceWith);
  if (replacement) {
    if (options.insideWikiLink) return stripWikiBracketLabel(replacement);
    if (options.wrapReplacement) return formatWikiLinkLabel(replacement);
    return replacement;
  }
  if (options.wrapMatched) return formatWikiLinkLabel(matched);
  return matched;
}

/**
 * @returns {{ text: string, count: number }}
 */
export function replaceEntityNotesText(text, find, replaceWith, options = {}) {
  const source = safeString(text);
  const needle = safeString(find);
  const replacement = safeString(replaceWith);
  const wrapMatched = Boolean(options.wrapMatched);
  const wrapReplacement = Boolean(options.wrapReplacement);

  if (!needle) return { text: source, count: 0 };
  if (!replacement && !wrapMatched && !wrapReplacement) {
    return { text: source, count: 0 };
  }
  if (
    replacement === needle &&
    !wrapReplacement &&
    !wrapMatched &&
    options.caseSensitive !== false
  ) {
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
    out += resolveReplacementText(item.matched, replacement, {
      wrapMatched,
      wrapReplacement,
      insideWikiLink: item.insideWikiLink && wrapReplacement,
    });
    cursor = item.end;
  });
  out += source.slice(cursor);
  if (out === source) return { text: source, count: 0 };
  return { text: out, count: matches.length };
}

/** Bọc [[wiki]] hàng loạt cho mọi cụm khớp (giữ nguyên chữ trong văn bản). */
export function wrapEntityNotesWikiMatches(text, find, options = {}) {
  return replaceEntityNotesText(text, find, '', { ...options, wrapMatched: true });
}
