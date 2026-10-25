import { describe, expect, it } from 'vitest';
import {
  buildTtcEntityRowContext,
  ttcRawVirtualValue,
  ttcDisplayVirtualValue,
  ttcTypeMatches,
  ttcLonIdMatches,
  ttcNhoIdMatches,
} from './ttcQueryVirtualFields.js';

describe('ttcQueryVirtualFields', () => {
  const ent = { id: 'e1', name: 'Ten Hien Tai' };
  const tabsConfig = {
    tabs: [
      {
        id: 'do-thi-nhan-vat',
        subTabs: [{ id: 'long-ngao-thien', label: 'Long Ngạo Thiên' }],
      },
    ],
  };
  const row = buildTtcEntityRowContext(ent, { lonId: 'do-thi-nhan-vat', nhoId: 'long-ngao-thien' }, tabsConfig);

  it('maps type/nhoId to nhoId slug, not Vietnamese label', () => {
    expect(ttcRawVirtualValue(row, 'type')).toBe('long-ngao-thien');
    expect(ttcDisplayVirtualValue(row, 'type')).toBe('Long Ngạo Thiên');
    expect(ttcTypeMatches(row, 'Long Ngạo Thiên')).toBe(false);
    expect(ttcTypeMatches(row, 'long-ngao-thien')).toBe(true);
  });

  it('folderPath and folder alias lon/nho path', () => {
    expect(ttcRawVirtualValue(row, 'folderPath')).toBe('do-thi-nhan-vat/long-ngao-thien');
    expect(ttcRawVirtualValue(row, 'folder')).toBe('do-thi-nhan-vat/long-ngao-thien');
    expect(ttcRawVirtualValue(row, 'parentFolder')).toBe('do-thi-nhan-vat');
    expect(ttcRawVirtualValue(row, 'lonId')).toBe('do-thi-nhan-vat');
  });

  it('type/nhoId only match tab con; lonId is separate', () => {
    expect(ttcNhoIdMatches(row, 'long-ngao-thien')).toBe(true);
    expect(ttcNhoIdMatches(row, 'do-thi-nhan-vat')).toBe(false);
    expect(ttcTypeMatches(row, 'long-ngao-thien')).toBe(true);
    expect(ttcLonIdMatches(row, 'do-thi-nhan-vat')).toBe(true);
    expect(ttcLonIdMatches(row, 'long-ngao-thien')).toBe(false);
  });
});
