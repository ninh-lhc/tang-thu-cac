/**
 * Nhận diện tên thực thể tương đương (khác hoa/thường, dấu câu, thứ tự từ).
 * Dùng để chặn tạo trùng thẻ và chuyển biến thể tên vào alias.
 */

import { matchesWikiNameWordStartSurface } from './wikiNameSurface.js';

function normalizePlain(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u0111\u0110]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const TIER_STOP_WORDS = new Set([
  'ha',
  'trung',
  'thuong',
  'cuc',
  'pham',
  'cap',
  'bac',
]);

function stripTierWords(normalized) {
  if (!normalized) return '';
  const words = normalized.split(' ').filter(Boolean);
  const filtered = words.filter((w) => !TIER_STOP_WORDS.has(w));
  // Tránh rút gọn quá đà về chuỗi rỗng.
  if (filtered.length === 0) return normalized;
  return filtered.join(' ');
}

function fingerprintFromNormalized(normalized) {
  if (!normalized) return '';
  const words = normalized.split(' ').filter(Boolean);
  if (words.length === 0) return '';
  return words.sort().join(' ');
}

export function buildEntityNameFingerprint(value) {
  return fingerprintFromNormalized(normalizePlain(value));
}

export function buildEntityCanonicalFingerprint(value) {
  const normalized = normalizePlain(value);
  const stripped = stripTierWords(normalized);
  return fingerprintFromNormalized(stripped);
}

const REASON_SCORE = {
  exact: 6,
  alias: 5,
  fingerprint: 4,
  alias_fingerprint: 3,
  canonical_fingerprint: 2,
  alias_canonical_fingerprint: 1,
};

function splitAliasValues(aliasText) {
  return String(aliasText || '')
    .split(/[,/|()]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function mergeAliasText(currentAlias, newAlias) {
  const existing = splitAliasValues(currentAlias);
  const incoming = splitAliasValues(newAlias);
  if (incoming.length === 0) return String(currentAlias || '').trim();
  const out = [...existing];
  const seen = new Set(existing.map((x) => x.toLowerCase()));
  incoming.forEach((item) => {
    const k = item.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(item);
    }
  });
  return out.join(', ');
}

function pickBetterReason(currentReason, nextReason) {
  const currentScore = REASON_SCORE[currentReason] ?? 0;
  const nextScore = REASON_SCORE[nextReason] ?? 0;
  return nextScore > currentScore ? nextReason : currentReason;
}

function isSurfaceCompatibleSamePhrase(entityName, candidateName) {
  const entityPlain = normalizePlain(entityName);
  const candidatePlain = normalizePlain(candidateName);
  if (!entityPlain || !candidatePlain) return false;
  if (entityPlain !== candidatePlain) return true;
  return matchesWikiNameWordStartSurface(entityName, candidateName);
}

export function findEquivalentEntitiesByName(entities, candidateName, options = {}) {
  const candidateRaw = String(candidateName || '').trim();
  if (!candidateRaw) return [];
  const allowExactNameMatch = options.allowExactNameMatch !== false;
  const candidateLower = candidateRaw.toLowerCase();
  const candidatePlain = normalizePlain(candidateRaw);
  const candidateFp = buildEntityNameFingerprint(candidateRaw);
  const candidateCanonicalFp = buildEntityCanonicalFingerprint(candidateRaw);
  if (!candidateFp) return [];
  const list = Array.isArray(entities) ? entities : [];
  const results = [];
  for (let i = 0; i < list.length; i += 1) {
    const ent = list[i];
    const baseName = String(ent?.name || '').trim();
    if (!baseName) continue;
    let bestReason = null;
    const baseLower = baseName.toLowerCase();
    if (baseLower === candidateLower) {
      if (allowExactNameMatch && isSurfaceCompatibleSamePhrase(baseName, candidateRaw)) {
        bestReason = pickBetterReason(bestReason, 'exact');
      }
    } else if (buildEntityNameFingerprint(baseName) === candidateFp) {
      if (normalizePlain(baseName) !== candidatePlain || isSurfaceCompatibleSamePhrase(baseName, candidateRaw)) {
        bestReason = pickBetterReason(bestReason, 'fingerprint');
      }
    } else if (candidateCanonicalFp && buildEntityCanonicalFingerprint(baseName) === candidateCanonicalFp) {
      if (normalizePlain(baseName) !== candidatePlain || isSurfaceCompatibleSamePhrase(baseName, candidateRaw)) {
        bestReason = pickBetterReason(bestReason, 'canonical_fingerprint');
      }
    }
    const aliases = splitAliasValues(ent?.dynamicData?.f_alias);
    for (const alias of aliases) {
      const aliasLower = alias.toLowerCase();
      if (aliasLower === candidateLower) {
        if (allowExactNameMatch && isSurfaceCompatibleSamePhrase(alias, candidateRaw)) {
          bestReason = pickBetterReason(bestReason, 'alias');
        }
        continue;
      }
      if (buildEntityNameFingerprint(alias) === candidateFp) {
        if (normalizePlain(alias) !== candidatePlain || isSurfaceCompatibleSamePhrase(alias, candidateRaw)) {
          bestReason = pickBetterReason(bestReason, 'alias_fingerprint');
        }
        continue;
      }
      if (candidateCanonicalFp && buildEntityCanonicalFingerprint(alias) === candidateCanonicalFp) {
        if (normalizePlain(alias) !== candidatePlain || isSurfaceCompatibleSamePhrase(alias, candidateRaw)) {
          bestReason = pickBetterReason(bestReason, 'alias_canonical_fingerprint');
        }
      }
    }
    if (!bestReason) continue;
    results.push({ index: i, entity: ent, reason: bestReason });
  }
  return results;
}

export function findEquivalentEntityByName(entities, candidateName, options = {}) {
  const matches = findEquivalentEntitiesByName(entities, candidateName, options);
  return matches[0] || null;
}
