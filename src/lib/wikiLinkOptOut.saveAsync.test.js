import { describe, expect, it, vi } from 'vitest';
import * as wikiLinkOptOut from './wikiLinkOptOut.js';
import { applyWikiLinkOptOutsForSave, applyWikiLinkOptOutsForSaveAsync } from './wikiLinkOptOut.js';
import { autoWrapWikiLinksByEntityMapWithCount } from './autoWrapWikiLinks.js';

describe('applyWikiLinkOptOutsForSaveAsync', () => {
  const map = [{ name: 'Linh Gioi Chau', dest: { entityId: 'entity-1' } }];

  it('matches sync save output when wrap fn is sync', async () => {
    const prepared = 'Linh Gioi Chau xuat hien giua troi.';
    const sync = applyWikiLinkOptOutsForSave({
      savedInfo: prepared,
      preparedText: prepared,
      wikiLinkOptOuts: [],
      entityMap: map,
      autoWrapWikiLinksByEntityMapWithCount,
      autoWrapOnSave: true,
    });
    const asyncResult = await applyWikiLinkOptOutsForSaveAsync({
      savedInfo: prepared,
      preparedText: prepared,
      wikiLinkOptOuts: [],
      entityMap: map,
      autoWrapWikiLinksByEntityMapWithCount,
      autoWrapOnSave: true,
    });
    expect(asyncResult).toEqual(sync);
  });

  it('calls auto-wrap exactly once on save path', async () => {
    const wrapFn = vi.fn(async (text, entityMap, options) =>
      autoWrapWikiLinksByEntityMapWithCount(text, entityMap, options)
    );
    await applyWikiLinkOptOutsForSaveAsync({
      savedInfo: '',
      preparedText: 'Linh Gioi Chau.',
      wikiLinkOptOuts: [],
      entityMap: map,
      autoWrapWikiLinksByEntityMapWithCount: wrapFn,
      autoWrapOnSave: true,
    });
    expect(wrapFn).toHaveBeenCalledTimes(1);
    expect(wrapFn.mock.calls[0][2]).toEqual(expect.objectContaining({ optOuts: [] }));
  });

  it('skips opt-out apply when no known opt-outs and plain detect is empty', async () => {
    const applySpy = vi.spyOn(wikiLinkOptOut, 'applyMergedOptOutsToAutoWrappedText');
    const prepared = 'Linh Gioi Chau xuat hien giua troi.';
    const asyncResult = await applyWikiLinkOptOutsForSaveAsync({
      savedInfo: prepared,
      preparedText: prepared,
      wikiLinkOptOuts: [],
      entityMap: map,
      autoWrapWikiLinksByEntityMapWithCount,
      autoWrapOnSave: true,
    });
    const sync = applyWikiLinkOptOutsForSave({
      savedInfo: prepared,
      preparedText: prepared,
      wikiLinkOptOuts: [],
      entityMap: map,
      autoWrapWikiLinksByEntityMapWithCount,
      autoWrapOnSave: true,
    });
    expect(asyncResult).toEqual(sync);
    expect(applySpy).not.toHaveBeenCalled();
    applySpy.mockRestore();
  });

  it('skips plain detect when wrap leaves text unchanged and no opt-outs', async () => {
    const detectSpy = vi.spyOn(wikiLinkOptOut, 'detectWikiLinkOptOutsFromPlainText');
    const text = 'Khong co ten thuc the trong doan nay.';
    await applyWikiLinkOptOutsForSaveAsync({
      savedInfo: text,
      preparedText: text,
      wikiLinkOptOuts: [],
      entityMap: map,
      autoWrapWikiLinksByEntityMapWithCount,
      autoWrapOnSave: true,
    });
    expect(detectSpy).not.toHaveBeenCalled();
    detectSpy.mockRestore();
  });
});
