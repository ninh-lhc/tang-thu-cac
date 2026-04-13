/**
 * Full AUTO resync helper for a novel.
 * Legacy wrapper kept for callers that only need a full pass.
 * New selective/manual flows should use autoSyncManager directly.
 */
import { buildFullAutoSyncPlan, runNovelAutoSyncPlan } from './autoSyncManager.js';

export function syncFullNovelAutoBlocks(novelData) {
  return runNovelAutoSyncPlan(novelData, buildFullAutoSyncPlan(), { recordLog: false });
}
