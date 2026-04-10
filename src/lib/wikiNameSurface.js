/**
 * Shared surface/casing rules for wiki links and entity-name matching.
 * Used by auto-wrap, plain-text highlighting, [[resolve]], and fuzzy entity lookup.
 * Keeps title-cased entity names distinct from lowercased common phrases.
 */

const UPPER_CHAR_RE = /\p{Lu}/u;
const DIACRITIC_RE = /[\u0300-\u036f]/g;

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
