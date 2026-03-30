import { describe, expect, it } from 'vitest';
import {
  buildEntityCanonicalFingerprint,
  findEquivalentEntityByName,
} from './entityNameIdentity.js';

describe('entityNameIdentity', () => {
  it('matches reversed word order via canonical fingerprint', () => {
    const entities = [{ id: 'e1', name: 'Huyền Cấp Vũ Kỹ', dynamicData: {} }];
    const hit = findEquivalentEntityByName(entities, 'Vũ Kỹ Huyền Cấp');
    expect(hit?.entity?.id).toBe('e1');
  });

  it('matches tier variants to base name', () => {
    const entities = [{ id: 'e1', name: 'Vũ Kỹ Huyền Cấp', dynamicData: {} }];
    const hit = findEquivalentEntityByName(entities, 'Vũ Kỹ Huyền Cấp Cực Phẩm');
    expect(hit?.entity?.id).toBe('e1');
  });

  it('canonical fingerprint drops tier words only', () => {
    const a = buildEntityCanonicalFingerprint('Vũ Kỹ Huyền Cấp Trung Phẩm');
    const b = buildEntityCanonicalFingerprint('Huyền Cấp Vũ Kỹ');
    expect(a).toBe(b);
  });
});
