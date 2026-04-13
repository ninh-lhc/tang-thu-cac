import { describe, expect, it } from 'vitest';
import {
  buildAutoSyncPlanFromTabContext,
  buildAutoSyncPlanFromTabDiff,
  buildFullAutoSyncPlan,
  runNovelAutoSyncPlan,
} from './autoSyncManager.js';
import { AUTO_SYNC_ROLE_FORCE, AUTO_SYNC_ROLE_OFF } from './tabAutoSyncRole.js';

function createNovel() {
  return {
    id: 'nov-1',
    title: 'Test Novel',
    tabsConfig: [
      {
        id: 'the-luc',
        label: 'The Luc',
        subTabs: [{ id: 'gia-toc', label: 'Gia Toc', viewType: 'collection-track', autoSyncRole: AUTO_SYNC_ROLE_FORCE }],
      },
      {
        id: 'ban-do',
        label: 'Ban Do',
        subTabs: [{ id: 'ha-gioi', label: 'Ha Gioi', viewType: 'collection-track' }],
      },
    ],
    data: {
      'the-luc': {
        'gia-toc': {
          overview: '',
          entities: [
            {
              id: 'force-1',
              name: 'Huyet Linh Tong',
              dynamicData: { f_status: 'Tong Mon - Bat Cap the luc - Huyet Gioi' },
              info: '',
            },
          ],
        },
      },
    },
  };
}

describe('autoSyncManager', () => {
  it('keeps collection AUTO local by default until a linked target is chosen', () => {
    const localPlan = buildAutoSyncPlanFromTabContext({
      activeTabLon: 'the-luc',
      activeTabNho: 'gia-toc',
      currentTabConfig: { id: 'gia-toc', label: 'Gia Toc', viewType: 'collection-track', autoSyncRole: AUTO_SYNC_ROLE_FORCE },
      parentLabel: 'The Luc',
    });
    expect(localPlan.engines).toEqual(['collection_cards']);

    const linkedPlan = buildAutoSyncPlanFromTabContext({
      activeTabLon: 'the-luc',
      activeTabNho: 'gia-toc',
      currentTabConfig: {
        id: 'gia-toc',
        label: 'Gia Toc',
        viewType: 'collection-track',
        autoSyncRole: AUTO_SYNC_ROLE_FORCE,
        autoSyncTargetPaths: ['ban-do::ha-gioi'],
      },
      parentLabel: 'The Luc',
    });
    expect(linkedPlan.engines).toEqual(['force_map', 'relation_notes', 'collection_cards']);
  });

  it('builds a cleanup-aware plan when a tab changes from AUTO role to off', () => {
    const plan = buildAutoSyncPlanFromTabDiff({
      previousTabContext: {
        activeTabLon: 'the-luc',
        activeTabNho: 'gia-toc',
        currentTabConfig: { id: 'gia-toc', label: 'Gia Toc', viewType: 'collection-track', autoSyncRole: AUTO_SYNC_ROLE_FORCE },
        parentLabel: 'The Luc',
      },
      nextTabContext: {
        activeTabLon: 'the-luc',
        activeTabNho: 'gia-toc',
        currentTabConfig: { id: 'gia-toc', label: 'Gia Toc', viewType: 'collection-track', autoSyncRole: AUTO_SYNC_ROLE_OFF },
        parentLabel: 'The Luc',
      },
    });

    expect(plan.engines).toEqual(['force_map', 'relation_notes', 'collection_cards']);
  });

  it('runs the full AUTO plan and records a compact sync log entry', () => {
    const novel = createNovel();

    const result = runNovelAutoSyncPlan(novel, buildFullAutoSyncPlan(), {
      recordLog: true,
      reason: 'test_run',
      scopeLabel: 'Toan bo truyen',
    });

    expect(result.changed).toBe(true);
    expect(result.diffSummary.touchedEntityCount).toBeGreaterThan(0);
    expect(Array.isArray(novel.autoSyncLog)).toBe(true);
    expect(novel.autoSyncLog).toHaveLength(1);
    expect(novel.autoSyncLog[0].reason).toBe('test_run');
    expect(novel.autoSyncLog[0].scopeLabel).toBe('Toan bo truyen');
  });
});
