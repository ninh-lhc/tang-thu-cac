/**
 * localStorage safety helpers: read/write wrappers + JSON backup fallback.
 * Used by shell state + persistence to survive malformed JSON or quota issues.
 * No React dependency; pure functions only.
 */

export function isQuotaExceededError(error) {
  if (!error) return false;
  const msg = String(error?.message || '').toLowerCase();
  return error?.name === 'QuotaExceededError' || msg.includes('quota');
}

export function readLocalStringSafe(key, fallback = '') {
  try {
    const value = localStorage.getItem(key);
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

export function readLocalBooleanSafe(key, fallback = false) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return raw === '1';
  } catch {
    return fallback;
  }
}

export function writeLocalStringSafe(key, value) {
  try {
    localStorage.setItem(key, String(value));
    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error };
  }
}

function tryParseJson(raw) {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (error) {
    return { ok: false, error, value: null };
  }
}

export function readLocalJsonWithBackup(primaryKey, backupKey, fallback = null) {
  const primaryRaw = readLocalStringSafe(primaryKey, null);
  if (typeof primaryRaw === 'string') {
    const parsedPrimary = tryParseJson(primaryRaw);
    if (parsedPrimary.ok) {
      return { value: parsedPrimary.value, source: 'primary' };
    }
  }

  const backupRaw = backupKey ? readLocalStringSafe(backupKey, null) : null;
  if (typeof backupRaw === 'string') {
    const parsedBackup = tryParseJson(backupRaw);
    if (parsedBackup.ok) {
      // Best-effort self-heal: restore primary from backup to avoid repeated parse errors.
      if (primaryRaw !== backupRaw) writeLocalStringSafe(primaryKey, backupRaw);
      return { value: parsedBackup.value, source: 'backup' };
    }
  }

  return { value: fallback, source: 'fallback' };
}

export function writeLocalJsonWithBackup(primaryKey, backupKey, value) {
  let serialized = '';
  try {
    serialized = JSON.stringify(value);
  } catch (error) {
    return { ok: false, error };
  }

  const primaryRes = writeLocalStringSafe(primaryKey, serialized);
  if (!primaryRes.ok) return primaryRes;

  // Backup is best-effort; do not fail primary save when backup write fails.
  if (backupKey) writeLocalStringSafe(backupKey, serialized);
  return { ok: true, error: null };
}
