/**
 * Nhận diện tên thực thể tương đương (khác hoa/thường, dấu câu, thứ tự từ).
 * Dùng để chặn tạo trùng thẻ và chuyển biến thể tên vào alias.
 */

function normalizePlain(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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

export function findEquivalentEntityByName(entities, candidateName) {
  const candidateRaw = String(candidateName || '').trim();
  if (!candidateRaw) return null;
  const candidateLower = candidateRaw.toLowerCase();
  const candidateFp = buildEntityNameFingerprint(candidateRaw);
  const candidateCanonicalFp = buildEntityCanonicalFingerprint(candidateRaw);
  if (!candidateFp) return null;
  const list = Array.isArray(entities) ? entities : [];
  for (let i = 0; i < list.length; i += 1) {
    const ent = list[i];
    const baseName = String(ent?.name || '').trim();
    if (!baseName) continue;
    if (baseName.toLowerCase() === candidateLower) return { index: i, entity: ent, reason: 'exact' };
    if (buildEntityNameFingerprint(baseName) === candidateFp) return { index: i, entity: ent, reason: 'fingerprint' };
    if (candidateCanonicalFp && buildEntityCanonicalFingerprint(baseName) === candidateCanonicalFp) {
      return { index: i, entity: ent, reason: 'canonical_fingerprint' };
    }
    const aliases = splitAliasValues(ent?.dynamicData?.f_alias);
    for (const alias of aliases) {
      if (alias.toLowerCase() === candidateLower) return { index: i, entity: ent, reason: 'alias' };
      if (buildEntityNameFingerprint(alias) === candidateFp) return { index: i, entity: ent, reason: 'alias_fingerprint' };
      if (candidateCanonicalFp && buildEntityCanonicalFingerprint(alias) === candidateCanonicalFp) {
        return { index: i, entity: ent, reason: 'alias_canonical_fingerprint' };
      }
    }
  }
  return null;
}
