import { describe, it, expect } from 'vitest';
import { resolveXrefTargetCollectionTab } from './xrefChonMucThuThap.js';

describe('resolveXrefTargetCollectionTab', () => {
  it('khớp lon/nho collection', () => {
    const cfg = [
      {
        id: 'a',
        subTabs: [{ id: 'x', viewType: 'collection-track' }],
      },
    ];
    expect(resolveXrefTargetCollectionTab('a', 'x', cfg)).toEqual({ lonId: 'a', nhoId: 'x' });
  });
});
