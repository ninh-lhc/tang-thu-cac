/**
 * Normalize legacy sub-tab ids to canonical ASCII slugs.
 * Keep this in one place so map presets, AUTO links, and migrations
 * always agree on the same id compatibility rules.
 */
const LEGACY_SUBTAB_ID_ALIASES = Object.freeze({
  'cung-dau-doạt-dich': 'cung-dau-doat-dich',
  'cung-bien-doạt-dich': 'cung-bien-doat-dich',
});

export function normalizeGenreSubTabId(subId = '') {
  const raw = String(subId || '').trim();
  if (!raw) return '';
  return LEGACY_SUBTAB_ID_ALIASES[raw] || raw;
}

