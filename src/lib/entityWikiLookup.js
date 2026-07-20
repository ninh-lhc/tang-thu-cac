/**
 * Lookup for internal wiki links.
 * Supports duplicate entity names, then chooses the best candidate by current entity context.
 * Preserves case-sensitive name intent for generic words versus proper nouns.
 */
import { buildEntityCanonicalFingerprint, buildEntityNameFingerprint } from './entityNameIdentity.js';
import { compareWikiNameSurfacePriority, matchesWikiNameSurface } from './wikiNameSurface.js';

const createLookupBucket = () => new Map();

const candidateEntityId = (candidate) => candidate?.dest?.entityId ?? candidate?.entityId ?? null;
const candidateLookupId = (candidate) => {
  const entityId = candidateEntityId(candidate);
  if (!entityId) return null;
  const memberId = candidate?.dest?.memberId ?? candidate?.memberId ?? null;
  return memberId ? `${entityId}::member::${memberId}` : entityId;
};

function pushLookupCandidate(bucket, key, candidate) {
  if (!key) return;
  const current = bucket.get(key) || [];
  const id = candidateLookupId(candidate);
  const surface = String(candidate?.name || '');
  // Giữ mọi biến thể bề mặt (tên chính + biệt danh) của CÙNG một thẻ:
  // chỉ bỏ khi trùng cả entityId LẪN bề mặt — nếu không, biệt danh viết thường
  // của thẻ sẽ bị tên hiển thị viết hoa nuốt mất, khiến nó không tự trỏ về chính nó.
  if (current.some((item) => candidateLookupId(item) === id && String(item?.name || '') === surface)) return;
  current.push(candidate);
  bucket.set(key, current);
}

function mergeLookupContextKeys(target, incoming) {
  const list = Array.isArray(incoming) ? incoming : [];
  list.forEach((key) => {
    if (!key || target.contextKeySet.has(key)) return;
    target.contextKeySet.add(key);
    target.contextKeys.push(key);
  });
}

export function buildEntityNameLookup(entityMap) {
  const lookup = {
    exactCase: createLookupBucket(),
    exact: createLookupBucket(),
    byFingerprint: createLookupBucket(),
    byCanonicalFingerprint: createLookupBucket(),
    byEntityId: new Map(),
    exactNameVariantsByLower: new Map(),
    retiredExact: new Set(),
    totalItems: 0,
    __isEntityLookup: true,
  };
  if (!entityMap) return lookup;

  const arr = Array.isArray(entityMap) ? entityMap : [];
  for (const entry of arr) {
    if (!entry?.name) continue;
    const name = String(entry.name).trim();
    if (!name) continue;
    const lower = name.toLowerCase();
    if (entry.retired) {
      lookup.retiredExact.add(lower);
      continue;
    }
    const candidate = {
      ...entry,
      name,
      lower,
      contextKeys: Array.isArray(entry.contextKeys) ? entry.contextKeys : [],
    };

    pushLookupCandidate(lookup.exactCase, name, candidate);
    pushLookupCandidate(lookup.exact, lower, candidate);
    const exactNameVariants = lookup.exactNameVariantsByLower.get(lower) || new Set();
    exactNameVariants.add(name);
    lookup.exactNameVariantsByLower.set(lower, exactNameVariants);

    const fp = buildEntityNameFingerprint(name);
    if (fp) pushLookupCandidate(lookup.byFingerprint, fp, candidate);

    const canonicalFp = buildEntityCanonicalFingerprint(name);
    if (canonicalFp) pushLookupCandidate(lookup.byCanonicalFingerprint, canonicalFp, candidate);

    lookup.totalItems += 1;

    const entityId = candidate?.dest?.entityId || candidate?.entityId;
    if (!entityId) continue;
    let entityMeta = lookup.byEntityId.get(entityId);
    if (!entityMeta) {
      entityMeta = {
        entityId,
        dest: candidate.dest || null,
        entityName: String(candidate.entityName || candidate.name || '').trim(),
        contextKeys: [],
        contextKeySet: new Set(),
      };
      lookup.byEntityId.set(entityId, entityMeta);
    }
    mergeLookupContextKeys(entityMeta, candidate.contextKeys);
    const nameKey = String(candidate.entityName || candidate.name || '').trim().toLowerCase();
    if (nameKey && !entityMeta.contextKeySet.has(nameKey)) {
      entityMeta.contextKeySet.add(nameKey);
      entityMeta.contextKeys.push(nameKey);
    }
  }

  return lookup;
}

function scoreLookupCandidate(candidate, sourceMeta) {
  if (!candidate) return Number.NEGATIVE_INFINITY;
  let score = 0;
  if (!sourceMeta) return score;
  if (candidate?.dest?.entityId && candidate.dest.entityId === sourceMeta.entityId) score += 100000;
  if (candidate?.dest?.lonId && candidate.dest.lonId === sourceMeta?.dest?.lonId) score += 6;
  if (candidate?.dest?.nhoId && candidate.dest.nhoId === sourceMeta?.dest?.nhoId) score += 12;

  const sourceKeys = sourceMeta?.contextKeySet;
  if (!sourceKeys || sourceKeys.size === 0) return score;
  const candidateKeys = Array.isArray(candidate.contextKeys) ? candidate.contextKeys : [];
  candidateKeys.forEach((key) => {
    if (!key || !sourceKeys.has(key)) return;
    score += 24 + Math.min(48, key.length * 2);
  });
  return score;
}

function pickLookupCandidate(candidates, sourceMeta) {
  const list = Array.isArray(candidates) ? candidates : [];
  if (list.length === 0) return null;
  if (list.length === 1) return list[0];

  let best = list[0];
  let bestScore = scoreLookupCandidate(best, sourceMeta);
  for (let i = 1; i < list.length; i += 1) {
    const next = list[i];
    const nextScore = scoreLookupCandidate(next, sourceMeta);
    if (nextScore > bestScore) {
      best = next;
      bestScore = nextScore;
    }
  }
  return best;
}

function getWordTokens(text) {
  return String(text || '').match(/[\p{L}\p{N}_]+/gu) || [];
}

function isUpperLetter(ch) {
  if (!ch) return false;
  return ch.toLocaleUpperCase('vi-VN') === ch && ch.toLocaleLowerCase('vi-VN') !== ch;
}

function computeCasePatternDistance(rawName, candidateName) {
  const rawTokens = getWordTokens(rawName);
  const candidateTokens = getWordTokens(candidateName);
  const maxLength = Math.max(rawTokens.length, candidateTokens.length);
  if (maxLength === 0) return Number.POSITIVE_INFINITY;
  let distance = 0;
  for (let index = 0; index < maxLength; index += 1) {
    const rawUpper = isUpperLetter(rawTokens[index]?.[0] || '');
    const candidateUpper = isUpperLetter(candidateTokens[index]?.[0] || '');
    if (rawUpper === candidateUpper) continue;
    distance += index === 0 ? 0.25 : 1;
  }
  return distance;
}

function filterLookupCandidatesBySurface(candidates, rawName) {
  const list = Array.isArray(candidates) ? candidates : [];
  if (list.length === 0) return list;

  const raw = String(rawName || '').trim();
  if (!raw) return list;

  const exactSurface = list.filter((candidate) => String(candidate?.name || '').trim() === raw);
  if (exactSurface.length > 0) return exactSurface;

  const compatible = list.filter((candidate) => {
    const candidateName = String(candidate?.name || '').trim();
    if (!candidateName) return false;
    if (candidateName.toLowerCase() !== raw.toLowerCase()) return true;
    return matchesWikiNameSurface(candidateName, raw);
  });
  if (compatible.length <= 1) return compatible;
  return compatible.sort((a, b) => compareWikiNameSurfacePriority(a?.name, b?.name));
}

/** Cùng một thẻ con (memberId) — dùng nới rule hoa thường cho biệt danh. */
function isUniqueMemberCandidateSet(candidates) {
  const list = Array.isArray(candidates) ? candidates : [];
  if (list.length === 0) return false;
  if (!list.every((item) => item?.dest?.memberId || item?.memberId)) return false;
  const ids = new Set(list.map(candidateLookupId).filter(Boolean));
  return ids.size === 1;
}

/** Token đầu khớp hoa thường — tránh «lôi gia» (viết thường hết) khớp «Lôi Gia». */
function firstTokenCaseMatches(rawName, candidateName) {
  const rawTokens = getWordTokens(rawName);
  const candidateTokens = getWordTokens(candidateName);
  if (!rawTokens[0] || !candidateTokens[0]) return false;
  if (rawTokens[0].toLocaleLowerCase('vi-VN') !== candidateTokens[0].toLocaleLowerCase('vi-VN')) {
    return false;
  }
  return isUpperLetter(rawTokens[0][0]) === isUpperLetter(candidateTokens[0][0]);
}

function pickCaseAwareLowerCandidate(lookup, rawName, sourceMeta) {
  const raw = String(rawName || '').trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  const rawBucket = lookup.exact?.get(lower) || [];
  let candidates = filterLookupCandidatesBySurface(rawBucket, raw);

  // Biệt danh thẻ con: «Lôi gia» phải trỏ về «Lôi Gia» khi đích unique.
  // Rule surface chữ hoa từng ký tự quá chặt với tên riêng 2 từ; vẫn từ chối
  // cụm viết thường hết và thẻ thường (vd. He thong → He Thong).
  if (candidates.length === 0 && isUniqueMemberCandidateSet(rawBucket)) {
    const relaxed = rawBucket.filter((candidate) =>
      firstTokenCaseMatches(raw, String(candidate?.name || '').trim())
    );
    if (relaxed.length > 0) candidates = relaxed;
  }

  if (candidates.length === 0) return null;

  const exactCaseCandidates = filterLookupCandidatesBySurface(lookup.exactCase?.get(raw), raw);
  if (exactCaseCandidates.length > 0) {
    return pickLookupCandidate(exactCaseCandidates, sourceMeta);
  }

  const variantNames = Array.from(lookup.exactNameVariantsByLower?.get(lower) || []);
  if (variantNames.length === 0) {
    return pickLookupCandidate(candidates, sourceMeta);
  }

  const rankedVariants = variantNames
    .map((name) => ({ name, distance: computeCasePatternDistance(raw, name) }))
    .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name, 'vi'));

  const best = rankedVariants[0];
  const next = rankedVariants[1];
  if (!best) return null;
  if (best.distance > 0.25) {
    const allowMemberAliasDrift =
      isUniqueMemberCandidateSet(candidates) && firstTokenCaseMatches(raw, best.name);
    if (!allowMemberAliasDrift) return null;
  }
  if (next && next.distance === best.distance) return null;

  return pickLookupCandidate(
    candidates.filter((candidate) => String(candidate?.name || '').trim() === best.name),
    sourceMeta
  );
}

export function resolveEntityLookup(lookup, rawName, { selfEntityId = null } = {}) {
  if (!lookup || !rawName) return null;
  const sourceMeta = selfEntityId ? lookup.byEntityId?.get(selfEntityId) || null : null;
  const raw = String(rawName).trim();
  if (!raw) return null;

  const exact = pickCaseAwareLowerCandidate(lookup, raw, sourceMeta);
  if (exact) return exact;

  const lower = raw.toLowerCase();
  if (lookup.retiredExact?.has(lower)) return null;
  if ((lookup.exactNameVariantsByLower?.get(lower)?.size || 0) > 0) return null;

  const fp = buildEntityNameFingerprint(raw);
  if (!fp) return null;
  const byFp = pickLookupCandidate(filterLookupCandidatesBySurface(lookup.byFingerprint?.get(fp), raw), sourceMeta);
  if (byFp) return byFp;

  const canonicalFp = buildEntityCanonicalFingerprint(raw);
  if (!canonicalFp) return null;
  return pickLookupCandidate(
    filterLookupCandidatesBySurface(lookup.byCanonicalFingerprint?.get(canonicalFp), raw),
    sourceMeta
  );
}
