import { describe, expect, it } from 'vitest';
import {
  collectExplicitAutoSyncLinkSources,
  guessAutoSyncTargetPathsForTab,
  listAutoSyncTargetCandidates,
  normalizeAutoSyncTargetPaths,
} from './tabAutoSyncLinks.js';

function createTabs() {
  return [
    {
      id: 'the-luc',
      label: 'The Luc',
      subTabs: [
        { id: 'gia-toc', label: 'Gia Toc', viewType: 'collection-track', autoSyncRole: 'the-luc' },
      ],
    },
    {
      id: 'ban-do',
      label: 'Ban Do',
      subTabs: [
        { id: 'ha-gioi', label: 'Ha Gioi', viewType: 'collection-track', autoSyncRole: 'ban-do' },
      ],
    },
    {
      id: 'nhan-vat',
      label: 'Nhan Vat',
      subTabs: [
        { id: 'nhan-vat-chinh', label: 'Nhan Vat Chinh', viewType: 'collection-track', autoSyncRole: 'nhan-vat-chinh' },
        { id: 'dao-lu', label: 'Dao Lu', viewType: 'collection-track', autoSyncRole: 'nhan-vat-lien-quan' },
        { id: 'than-nhan', label: 'Than Nhan', viewType: 'collection-track', autoSyncRole: 'nhan-vat-lien-quan' },
      ],
    },
  ];
}

describe('tabAutoSyncLinks', () => {
  it('normalizes and de-duplicates target paths', () => {
    expect(
      normalizeAutoSyncTargetPaths([
        'ban-do::ha-gioi',
        { lonId: 'ban-do', nhoId: 'ha-gioi' },
        'lich-su-quy-tich::cung-bien-doạt-dich',
        'lich-su-quy-tich::cung-bien-doat-dich',
        '',
        null,
      ])
    ).toEqual(['ban-do::ha-gioi', 'lich-su-quy-tich::cung-bien-doat-dich']);
  });

  it('lists only compatible receiver tabs for a source role', () => {
    const tabs = createTabs();
    const candidates = listAutoSyncTargetCandidates(tabs, {
      activeTabLon: 'the-luc',
      activeTabNho: 'gia-toc',
      currentTabConfig: tabs[0].subTabs[0],
      parentLabel: 'The Luc',
    });

    expect(candidates.map((candidate) => candidate.pathKey)).toEqual(['ban-do::ha-gioi']);
  });

  it('keeps main-character role local by default (no auto level-3 target)', () => {
    const tabs = createTabs();
    const guessed = guessAutoSyncTargetPathsForTab(tabs, {
      activeTabLon: 'nhan-vat',
      activeTabNho: 'nhan-vat-chinh',
      currentTabConfig: tabs[2].subTabs[0],
      parentLabel: 'Nhan Vat',
    });

    expect(guessed).toEqual([]);
  });

  it('collects only explicit linked sources', () => {
    const tabs = createTabs();
    tabs[0].subTabs[0].autoSyncTargetPaths = ['ban-do::ha-gioi'];
    const sources = collectExplicitAutoSyncLinkSources(tabs, { sourceRoles: ['the-luc'] });

    expect(sources).toHaveLength(1);
    expect(sources[0].sourcePath.nhoId).toBe('gia-toc');
    expect(sources[0].targetPaths.map((item) => item.pathKey)).toEqual(['ban-do::ha-gioi']);
  });
});
