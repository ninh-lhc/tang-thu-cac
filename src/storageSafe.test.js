import { beforeEach, describe, expect, it } from 'vitest';
import {
  isQuotaExceededError,
  readLocalBooleanSafe,
  readLocalJsonWithBackup,
  readLocalStringSafe,
  writeLocalJsonWithBackup,
  writeLocalStringSafe,
} from './storageSafe.js';

describe('storageSafe', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('writes json to primary and backup keys', () => {
    const payload = { a: 1, b: 'ok' };
    const result = writeLocalJsonWithBackup('primary', 'backup', payload);
    expect(result.ok).toBe(true);
    expect(localStorage.getItem('primary')).toBe(JSON.stringify(payload));
    expect(localStorage.getItem('backup')).toBe(JSON.stringify(payload));
  });

  it('reads from backup when primary json is corrupt and restores primary', () => {
    localStorage.setItem('primary', '{bad');
    localStorage.setItem('backup', JSON.stringify({ v: 42 }));

    const out = readLocalJsonWithBackup('primary', 'backup', null);
    expect(out.source).toBe('backup');
    expect(out.value).toEqual({ v: 42 });
    expect(localStorage.getItem('primary')).toBe(JSON.stringify({ v: 42 }));
  });

  it('returns fallback when both primary and backup are missing', () => {
    const out = readLocalJsonWithBackup('primary', 'backup', { empty: true });
    expect(out.source).toBe('fallback');
    expect(out.value).toEqual({ empty: true });
  });

  it('safe string write/read works without throwing', () => {
    const wr = writeLocalStringSafe('k', 'v');
    expect(wr.ok).toBe(true);
    expect(readLocalStringSafe('k', 'x')).toBe('v');
    expect(readLocalStringSafe('missing', 'x')).toBe('x');
  });

  it('returns boolean fallback only when the key is missing', () => {
    expect(readLocalBooleanSafe('missing-enabled', true)).toBe(true);
    localStorage.setItem('missing-enabled', '0');
    expect(readLocalBooleanSafe('missing-enabled', true)).toBe(false);
    localStorage.setItem('missing-enabled', '1');
    expect(readLocalBooleanSafe('missing-enabled', false)).toBe(true);
  });

  it('detects quota errors by name or message', () => {
    expect(isQuotaExceededError({ name: 'QuotaExceededError', message: '' })).toBe(true);
    expect(isQuotaExceededError({ name: 'Error', message: 'quota exceeded' })).toBe(true);
    expect(isQuotaExceededError({ name: 'Error', message: 'other' })).toBe(false);
  });
});
