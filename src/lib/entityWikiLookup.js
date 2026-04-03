/**
 * Lookup cho wiki-link noi bo.
 * Ho tro nhieu entity cung ten, sau do chon ung vien tot nhat theo boi canh entity dang mo.
 */
import { buildEntityCanonicalFingerprint, buildEntityNameFingerprint } from './entityNameIdentity.js';

const createLookupBucket = () => new Map();

function pushLookupCandidate(bucket, key, candidate) {
  if (!key) return;
  const current = bucket.get(key) || [];
  if (current.some((item) => item?.dest?.entityId === candidate?.dest?.entityId)) return;
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
    exact: createLookupBucket(),
    byFingerprint: createLookupBucket(),
    byCanonicalFingerprint: createLookupBucket(),
    byEntityId: new Map(),
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
    const candidate = {
      ...entry,
      name,
      lower,
      contextKeys: Array.isArray(entry.contextKeys) ? entry.contextKeys : [],
    };

    pushLookupCandidate(lookup.exact, lower, candidate);

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

export function resolveEntityLookup(lookup, rawName, { selfEntityId = null } = {}) {
  if (!lookup || !rawName) return null;
  const sourceMeta = selfEntityId ? lookup.byEntityId?.get(selfEntityId) || null : null;
  const lower = String(rawName).trim().toLowerCase();

  const exact = pickLookupCandidate(lookup.exact?.get(lower), sourceMeta);
  if (exact) return exact;

  const fp = buildEntityNameFingerprint(rawName);
  if (!fp) return null;
  const byFp = pickLookupCandidate(lookup.byFingerprint?.get(fp), sourceMeta);
  if (byFp) return byFp;

  const canonicalFp = buildEntityCanonicalFingerprint(rawName);
  if (!canonicalFp) return null;
  return pickLookupCandidate(lookup.byCanonicalFingerprint?.get(canonicalFp), sourceMeta);
}
