import { describe, expect, it } from 'vitest';
import { commitNovelUpdate, patchNovelData } from '../lib/patchNovelData.js';

function buildNovel() {
  const otherEntity = { id: 'e2', name: 'Other' };
  const target = { id: 'e1', name: 'Target', info: 'old' };
  const otherNho = { overview: 'keep', entities: [{ id: 'e3', name: 'Side' }] };
  const nhoA = { overview: 'a', entities: [target, otherEntity] };
  const otherLon = { z: { overview: 'far', entities: [{ id: 'e4', name: 'Far' }] } };
  return {
    id: 'novel',
    title: 'T',
    data: {
      lonA: { nhoA, nhoB: otherNho },
      lonB: otherLon,
    },
  };
}

describe('patchNovelData', () => {
  it('clones only the path to the patched entity', () => {
    const oldNovel = buildNovel();
    const next = patchNovelData(oldNovel, {
      lonId: 'lonA',
      nhoId: 'nhoA',
      entityId: 'e1',
      updater: (entity) => ({ ...entity, info: 'new' }),
    });
    expect(next).not.toBe(oldNovel);
    expect(next.data).not.toBe(oldNovel.data);
    expect(next.data.lonA).not.toBe(oldNovel.data.lonA);
    expect(next.data.lonA.nhoA).not.toBe(oldNovel.data.lonA.nhoA);
    expect(next.data.lonA.nhoA.entities[0]).not.toBe(oldNovel.data.lonA.nhoA.entities[0]);
    expect(next.data.lonA.nhoA.entities[0].info).toBe('new');
  });

  it('keeps untouched branches and sibling entities', () => {
    const oldNovel = buildNovel();
    const next = patchNovelData(oldNovel, {
      lonId: 'lonA',
      nhoId: 'nhoA',
      entityId: 'e1',
      updater: (entity) => ({ ...entity, info: 'new' }),
    });
    expect(next.data.lonB).toBe(oldNovel.data.lonB);
    expect(next.data.lonA.nhoB).toBe(oldNovel.data.lonA.nhoB);
    expect(next.data.lonA.nhoA.entities[1]).toBe(oldNovel.data.lonA.nhoA.entities[1]);
    expect(next.title).toBe(oldNovel.title);
  });

  it('patches a whole nho when entityId is omitted', () => {
    const oldNovel = buildNovel();
    const replacement = { overview: 'rewritten', entities: [] };
    const next = patchNovelData(oldNovel, {
      lonId: 'lonA',
      nhoId: 'nhoA',
      updater: () => replacement,
    });
    expect(next.data.lonA).not.toBe(oldNovel.data.lonA);
    expect(next.data.lonA.nhoA).toBe(replacement);
    expect(next.data.lonA.nhoB).toBe(oldNovel.data.lonA.nhoB);
    expect(next.data.lonB).toBe(oldNovel.data.lonB);
  });

  it('returns the same novel when lonId is missing', () => {
    const oldNovel = buildNovel();
    const next = patchNovelData(oldNovel, {
      lonId: 'missing',
      updater: () => ({ overview: 'x' }),
    });
    expect(next).toBe(oldNovel);
  });

  it('returns the same novel when nhoId is missing inside the lon', () => {
    const oldNovel = buildNovel();
    const next = patchNovelData(oldNovel, {
      lonId: 'lonA',
      nhoId: 'missing',
      updater: () => ({ overview: 'x' }),
    });
    expect(next).toBe(oldNovel);
  });
});

describe('commitNovelUpdate fallback', () => {
  it('clones the whole novel and marks every shard for a callback update', () => {
    const oldNovel = buildNovel();
    const sibling = oldNovel.data.lonB;
    const { novel, dirty } = commitNovelUpdate(oldNovel, (draft) => {
      draft.data.lonA.nhoA.entities[0].info = 'via-callback';
    });
    expect(dirty).toBe('all');
    expect(novel).not.toBe(oldNovel);
    expect(novel.data.lonB).not.toBe(sibling);
    expect(novel.data.lonA.nhoA.entities[0].info).toBe('via-callback');
    expect(oldNovel.data.lonA.nhoA.entities[0].info).toBe('old');
  });
});
