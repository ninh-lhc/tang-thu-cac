/**
 * Shared surface/casing rules for wiki links and entity-name matching.
 * Used by auto-wrap, plain-text highlighting, [[resolve]], and fuzzy entity lookup.
 * Keeps title-cased entity names distinct from lowercased common phrases.
 */

const UPPER_CHAR_RE = /\p{Lu}/u;
const DIACRITIC_RE = /[\u0300-\u036f]/g;
const WORD_CHAR_RE = /[\p{L}\p{N}_]/u;
const NEXT_TOKEN_AFTER_NAME_RE = /^\s+([^\s,.;:!?)\]»\n]+)/u;
const WIKI_LINK_IMMEDIATELY_AFTER_RE = /^\s*\[\[([^\]]+?)\]\]/u;

function isWordChar(ch) {
  if (!ch) return false;
  return WORD_CHAR_RE.test(ch);
}

export function isWikiNameWordBoundary(text, start, end) {
  const left = start > 0 ? text[start - 1] : '';
  const right = end < text.length ? text[end] : '';
  return !isWordChar(left) && !isWordChar(right);
}

function isUpperChar(ch) {
  if (!ch) return false;
  return UPPER_CHAR_RE.test(ch);
}

export function normalizeWikiNameSurface(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(DIACRITIC_RE, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function countWikiNameUppercaseChars(value) {
  let count = 0;
  const text = String(value || '');
  for (let i = 0; i < text.length; i += 1) {
    if (isUpperChar(text[i])) count += 1;
  }
  return count;
}

export function compareWikiNameSurfacePriority(a, b) {
  const aText = String(a || '');
  const bText = String(b || '');
  const lenDiff = bText.length - aText.length;
  if (lenDiff !== 0) return lenDiff;

  const upperDiff = countWikiNameUppercaseChars(bText) - countWikiNameUppercaseChars(aText);
  if (upperDiff !== 0) return upperDiff;

  return aText.localeCompare(bText);
}

export function matchesWikiNameSurface(candidate, source) {
  const candidateText = String(candidate || '');
  const sourceText = String(source || '');
  if (!candidateText || !sourceText) return false;
  if (candidateText.toLowerCase() !== sourceText.toLowerCase()) return false;

  for (let i = 0; i < candidateText.length; i += 1) {
    if (!isUpperChar(candidateText[i])) continue;
    if (!isUpperChar(sourceText[i])) return false;
  }
  return true;
}

export function matchesWikiNameWordStartSurface(candidate, source) {
  const candidateText = normalizeWikiNameSurface(candidate);
  const sourceText = normalizeWikiNameSurface(source);
  if (!candidateText || !sourceText) return false;

  const candidateTokens = candidateText.split(' ').filter(Boolean);
  const sourceTokens = sourceText.split(' ').filter(Boolean);
  if (candidateTokens.length !== sourceTokens.length) return false;

  for (let i = 0; i < candidateTokens.length; i += 1) {
    if (candidateTokens[i].toLowerCase() !== sourceTokens[i].toLowerCase()) return false;
    if (isUpperChar(candidateTokens[i][0]) !== isUpperChar(sourceTokens[i][0])) return false;
  }
  return true;
}

/** Từ/cụm ngay sau tên (kể cả [[đã bọc]] để auto-wrap idempotent). */
export function peekWikiContinuationAfterName(text, end) {
  const tail = String(text || '').slice(end);
  const wiki = tail.match(WIKI_LINK_IMMEDIATELY_AFTER_RE);
  if (wiki?.[1]) {
    const inner = wiki[1].trim();
    const firstWord = inner.split(/\s+/).filter(Boolean)[0] || inner;
    return { token: firstWord, spanLength: wiki[0].length };
  }
  const plain = tail.match(NEXT_TOKEN_AFTER_NAME_RE);
  if (!plain?.[1]) return null;
  return { token: plain[1], spanLength: plain[0].length };
}

/**
 * Không match tên thẻ ngắn khi văn bản là cụm danh từ riêng dài hơn (vd. thẻ «Hồng Lâu» trong «Hồng Lâu Mộng»).
 * Chỉ áp khi từ ngay sau có chữ cái HOA đầu (gợi ý tiếp tục tên riêng), không chặn «Hồng Lâu đã…».
 */
export function isWikiSurfacePrefixOfLongerProperPhrase(text, start, end, entityName, allNames = []) {
  const source = String(text || '');
  const matched = source.slice(start, end);
  const name = String(entityName || '').trim();
  if (!name || matched.length !== name.length) return false;
  if (matched.toLowerCase() !== name.toLowerCase()) return false;
  // Chỉ chặn với tên ngắn (1-2 từ) để giảm bỏ sót với tên nhân vật dài.
  // Ví dụ: "Diệp Thiên Dật Khẳng định..." vẫn nên bọc [[Diệp Thiên Dật]].
  if (name.split(/\s+/).filter(Boolean).length >= 3) return false;

  const cont = peekWikiContinuationAfterName(source, end);
  if (!cont?.token) return false;

  const matchedNorm = normalizeWikiNameSurface(matched);
  const contNorm = normalizeWikiNameSurface(cont.token);
  // "Cổ Minh Cổ Minh" — không chặn lần lặp cùng tên.
  if (contNorm && contNorm === matchedNorm) return false;

  if (!isUpperChar(cont.token[0])) return false;

  const afterName = source.slice(end).replace(/^\s+/, '');
  if (afterName.toLowerCase().startsWith(name.toLowerCase())) return false;

  const extendedPlain = normalizeWikiNameSurface(source.slice(start, end + cont.spanLength));
  for (const registered of allNames || []) {
    const reg = String(registered || '').trim();
    if (!reg || reg.length <= name.length) continue;
    if (!reg.toLowerCase().startsWith(name.toLowerCase())) continue;
    if (normalizeWikiNameSurface(reg) === extendedPlain) return true;
  }

  const extended = source.slice(start, end + cont.spanLength).trim();
  return extended.length > name.length;
}

/** Có tên thẻ đăng ký dài hơn khớp cùng vị trí bắt đầu. */
export function hasLongerRegisteredWikiNameAt(text, start, matchedName, allNames) {
  const source = String(text || '');
  const base = String(matchedName || '').trim();
  if (!base) return false;

  for (const name of allNames || []) {
    const candidate = String(name || '').trim();
    if (!candidate || candidate.length <= base.length) continue;
    const end = start + candidate.length;
    if (source.slice(start, end).toLowerCase() !== candidate.toLowerCase()) continue;
    if (!isWikiNameWordBoundary(source, start, end)) continue;
    if (!matchesWikiNameSurface(candidate, source.slice(start, end))) continue;
    return true;
  }
  return false;
}

export function containsWikiNameWordStartSurface(candidate, source) {
  const candidateText = normalizeWikiNameSurface(candidate);
  const sourceText = normalizeWikiNameSurface(source);
  if (!candidateText || !sourceText) return false;

  const candidateTokens = candidateText.split(' ').filter(Boolean);
  const sourceTokens = sourceText.split(' ').filter(Boolean);
  if (sourceTokens.length === 0 || sourceTokens.length > candidateTokens.length) return false;

  for (let start = 0; start <= candidateTokens.length - sourceTokens.length; start += 1) {
    let matched = true;
    for (let offset = 0; offset < sourceTokens.length; offset += 1) {
      const candidateToken = candidateTokens[start + offset];
      const sourceToken = sourceTokens[offset];
      if (candidateToken.toLowerCase() !== sourceToken.toLowerCase()) {
        matched = false;
        break;
      }
      if (isUpperChar(candidateToken[0]) !== isUpperChar(sourceToken[0])) {
        matched = false;
        break;
      }
    }
    if (matched) return true;
  }
  return false;
}
