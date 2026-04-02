/**
 * Shared helpers for local image naming.
 * Keeps entity-scoped filenames stable and human-readable.
 * Pure functions only, so we can test the naming rules in isolation.
 */

const INVALID_IMAGE_NAME_CHARS = /[<>:"/\\|?*]/g;

function removeControlChars(value) {
  let out = '';
  for (const ch of String(value ?? '')) {
    if (ch < ' ' || ch === '\u007f') continue;
    out += ch;
  }
  return out;
}
const TRAILING_DOTS_AND_SPACES = /[. ]+$/;

export function sanitizeImageFilePart(value) {
  return removeControlChars(value)
    .trim()
    .replace(INVALID_IMAGE_NAME_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .replace(TRAILING_DOTS_AND_SPACES, '')
    .trim();
}

export function buildScopedImageStem(stemParts) {
  return (Array.isArray(stemParts) ? stemParts : [])
    .map(sanitizeImageFilePart)
    .filter(Boolean)
    .join(' - ');
}

function normalizeStemKey(value) {
  return buildScopedImageStem([value]).toLowerCase();
}

function buildStableDisambiguator(entityId) {
  return sanitizeImageFilePart(entityId)
    .replace(/\s+/g, '')
    .slice(-6);
}

export function buildScopedEntityImageStemParts({
  tabLabel,
  entityName,
  entityId,
  siblingEntities = [],
}) {
  const parts = [tabLabel, entityName].filter(Boolean);
  const baseStem = buildScopedImageStem(parts);
  if (!baseStem) return parts;

  const baseKey = normalizeStemKey(baseStem);
  const list = Array.isArray(siblingEntities) ? siblingEntities : [];
  const hasCollision = list.some((sibling) => {
    if (!sibling || sibling.id === entityId) return false;
    const siblingStem = buildScopedImageStem([tabLabel, sibling.name]);
    return siblingStem && normalizeStemKey(siblingStem) === baseKey;
  });

  if (!hasCollision) return parts;

  const disambiguator = buildStableDisambiguator(entityId);
  if (!disambiguator) return parts;
  return [...parts, disambiguator];
}

export function getImageFileExtension(fileName) {
  const raw = String(fileName ?? '').trim();
  const match = raw.match(/(\.[^.]+)$/);
  if (!match) return '.jpg';
  const ext = match[1].replace(/[^.\w-]/g, '');
  return ext ? ext.toLowerCase() : '.jpg';
}

export function getScopedImageSequence(fileName, stem) {
  const baseName = String(fileName ?? '').replace(/\.[^.]+$/, '');
  const prefix = `${stem} -`;
  if (!baseName.startsWith(prefix)) return null;
  const seq = baseName.slice(prefix.length);
  if (!/^\d+$/.test(seq)) return null;
  return Number(seq);
}

export function buildScopedImageFileName({ stemParts, originalFileName, existingFileNames = [] }) {
  const stem = buildScopedImageStem(stemParts);
  if (!stem) return null;

  const ext = getImageFileExtension(originalFileName);
  let maxSequence = 0;
  for (const name of existingFileNames) {
    const seq = getScopedImageSequence(name, stem);
    if (seq && seq > maxSequence) maxSequence = seq;
  }

  const nextSequence = String(maxSequence + 1).padStart(2, '0');
  return `${stem} -${nextSequence}${ext}`;
}

export async function listDirectoryFileNames(dirHandle) {
  const names = [];
  if (!dirHandle || typeof dirHandle.entries !== 'function') return names;

  try {
    for await (const [name, entry] of dirHandle.entries()) {
      if (entry?.kind === 'file') names.push(name);
    }
  } catch {
    return names;
  }

  return names;
}
