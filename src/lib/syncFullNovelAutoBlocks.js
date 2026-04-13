/**
 * Full AUTO resync helper for a novel.
 * Runs every auto engine after tabsConfig/data changes so the tree config becomes the source of truth.
 * Returns whether anything changed plus the summarized force/map warning for UI to surface.
 */
import { syncAllAutoRelationNotesForNovel } from './autoRelationDetailNote.js';
import { syncAllCollectionListCards } from './collectionListCardSync.js';
import { syncAllCultivationRelationBlocks } from './cultivationRelationSync.js';
import { syncAllMainCharacterRelationBlocks } from './mainCharacterRelationSync.js';
import { syncAllMapHierarchyAutoBlocks } from './mapHierarchySync.js';
import {
  summarizeTheLucMapSyncWarnings,
  syncAllTheLucMapAutoBlocksDetailed,
} from './theLucBanDoSync.js';

export function syncFullNovelAutoBlocks(novelData) {
  let changed = false;
  const forceSyncResult = syncAllTheLucMapAutoBlocksDetailed(novelData);
  changed = forceSyncResult.changed || changed;
  changed = syncAllAutoRelationNotesForNovel(novelData) || changed;
  changed = syncAllMainCharacterRelationBlocks(novelData) || changed;
  changed = syncAllCultivationRelationBlocks(novelData) || changed;
  changed = syncAllMapHierarchyAutoBlocks(novelData) || changed;
  changed = syncAllCollectionListCards(novelData) || changed;
  return {
    changed,
    forceWarning: summarizeTheLucMapSyncWarnings(forceSyncResult.warnings),
  };
}
