import { describe, expect, it } from 'vitest';
import { resolveNovelWithShadow } from './novelShadowStore.js';

describe('resolveNovelWithShadow', () => {
  it('returns disk when no shadow', () => {
    const disk = { id: 'n1', data: { a: { b: { entities: [] } } } };
    const r = resolveNovelWithShadow(disk, null);
    expect(r).toEqual({ novel: disk, fromShadow: false });
  });

  it('uses shadow when disk missing', () => {
    const shadow = { id: 'n1', title: 'Shadow', data: {} };
    const r = resolveNovelWithShadow(null, { novel: shadow, updatedAt: 1 });
    expect(r.fromShadow).toBe(true);
    expect(r.novel.title).toBe('Shadow');
    expect(r.novel.__recoveredFromShadow).toBe(true);
  });

  it('prefers full shadow over disk', () => {
    const disk = { id: 'n1', title: 'Old', data: { lon: { nho: { entities: [{ id: '1' }] } } } };
    const shadow = {
      id: 'n1',
      title: 'New',
      data: { lon: { nho: { entities: [{ id: '1' }, { id: '2' }] } } },
    };
    const r = resolveNovelWithShadow(disk, { novel: shadow, updatedAt: 2 });
    expect(r.fromShadow).toBe(true);
    expect(r.novel.title).toBe('New');
    expect(r.novel.data.lon.nho.entities).toHaveLength(2);
  });

  it('merges partial shadow into disk tabs', () => {
    const disk = {
      id: 'n1',
      data: {
        lonA: { nho: { entities: [{ id: 'a' }] } },
        lonB: { nho: { entities: [{ id: 'b' }] } },
      },
    };
    const shadow = {
      id: 'n1',
      __partialData: true,
      data: {
        lonA: { nho: { entities: [{ id: 'a2' }] } },
      },
    };
    const r = resolveNovelWithShadow(disk, { novel: shadow, updatedAt: 3 });
    expect(r.fromShadow).toBe(true);
    expect(r.novel.data.lonA.nho.entities[0].id).toBe('a2');
    expect(r.novel.data.lonB.nho.entities[0].id).toBe('b');
  });

  it('ignores shadow with mismatched id', () => {
    const disk = { id: 'n1', title: 'Disk' };
    const r = resolveNovelWithShadow(disk, { novel: { id: 'other', title: 'X' }, updatedAt: 1 });
    expect(r).toEqual({ novel: disk, fromShadow: false });
  });
});
