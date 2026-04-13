import { describe, expect, it } from 'vitest';
import {
  AUTO_SYNC_ENGINE_FORCE_MAP,
  AUTO_SYNC_ENGINE_MAP_HIERARCHY,
  getAutoSyncEnginesForRole,
  isEntityAutoSyncDisabled,
  isEntityAutoSyncLocked,
  setEntityAutoSyncState,
} from './autoSyncEntityPrefs.js';
import { AUTO_SYNC_ROLE_MAP } from './tabAutoSyncRole.js';

describe('autoSyncEntityPrefs', () => {
  it('maps AUTO roles to the expected engine list', () => {
    expect(getAutoSyncEnginesForRole(AUTO_SYNC_ROLE_MAP)).toEqual([
      AUTO_SYNC_ENGINE_FORCE_MAP,
      AUTO_SYNC_ENGINE_MAP_HIERARCHY,
      'relation_notes',
    ]);
  });

  it('keeps disabled/locked states mutually exclusive per engine', () => {
    const entity = {};

    expect(setEntityAutoSyncState(entity, AUTO_SYNC_ENGINE_FORCE_MAP, 'disabled', true)).toBe(true);
    expect(isEntityAutoSyncDisabled(entity, AUTO_SYNC_ENGINE_FORCE_MAP)).toBe(true);
    expect(isEntityAutoSyncLocked(entity, AUTO_SYNC_ENGINE_FORCE_MAP)).toBe(false);

    expect(setEntityAutoSyncState(entity, AUTO_SYNC_ENGINE_FORCE_MAP, 'locked', true)).toBe(true);
    expect(isEntityAutoSyncDisabled(entity, AUTO_SYNC_ENGINE_FORCE_MAP)).toBe(false);
    expect(isEntityAutoSyncLocked(entity, AUTO_SYNC_ENGINE_FORCE_MAP)).toBe(true);

    expect(setEntityAutoSyncState(entity, AUTO_SYNC_ENGINE_FORCE_MAP, 'locked', false)).toBe(true);
    expect(isEntityAutoSyncLocked(entity, AUTO_SYNC_ENGINE_FORCE_MAP)).toBe(false);
    expect(entity.autoSyncPrefs).toBeUndefined();
  });
});
