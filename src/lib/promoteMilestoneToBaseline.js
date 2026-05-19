/**
 * Đặt mốc timeline làm Ghi chép Ban đầu (entity.info).
 * Ban đầu và mốc timeline là hai đối tượng: chỉ copy nội dung lên Ban đầu, không gỡ/sửa mốc.
 * Lần đầu (chưa có mốc archive ch.0): lưu ghi chép Ban đầu hiện tại vào mốc chương 0.
 */
import { parseMilestoneLabel } from './milestoneLabels.js';

const BASELINE_ARCHIVE_SOURCE = 'baseline-archive';

function safeString(value) {
  if (value == null || value === 'null' || value === 'undefined') return '';
  return String(value);
}

function parseChapter(value) {
  const n = typeof value === 'number' ? value : parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function cloneSnapshot(entity) {
  const dynamicData = entity?.dynamicData;
  return {
    dynamicData:
      dynamicData && typeof dynamicData === 'object'
        ? Object.fromEntries(
            Object.entries(dynamicData).map(([key, val]) => [key, safeString(val)])
          )
        : {},
    avatar: safeString(entity?.avatar).trim() || undefined,
  };
}

function sortMilestones(milestones) {
  return [...milestones].sort((a, b) => {
    const ca = parseChapter(a?.chapter);
    const cb = parseChapter(b?.chapter);
    if (ca !== cb) return ca - cb;
    return safeString(a?.id).localeCompare(safeString(b?.id));
  });
}

/** Đã có mốc lưu ghi chép nền gốc (chương 0, meta baseline-archive). */
export function hasBaselineArchiveAtChapterZero(milestones) {
  return (Array.isArray(milestones) ? milestones : []).some(
    (ms) =>
      ms?.meta?.source === BASELINE_ARCHIVE_SOURCE && parseChapter(ms?.chapter) === 0
  );
}

/** Chuyển nội dung mốc thành markdown ghi chép Ban đầu. */
export function buildBaselineNotesFromMilestone(milestone) {
  if (!milestone || typeof milestone !== 'object') return '';
  const parsed = parseMilestoneLabel(milestone.event);
  const title = safeString(milestone.title).trim();
  const chapter = safeString(milestone.chapter).trim();
  const body = safeString(parsed.body || milestone.event).trim();
  const parts = [];
  if (title) parts.push(`## ${title}`);
  else if (chapter) parts.push(`## Giai đoạn chương ${chapter}`);
  if (body) parts.push(body);
  return parts.join('\n\n').trim();
}

function applySnapshotToEntity(entity, snapshot) {
  if (!entity || !snapshot || typeof snapshot !== 'object') return;
  if (!entity.dynamicData) entity.dynamicData = {};
  if (snapshot.dynamicData && typeof snapshot.dynamicData === 'object') {
    Object.entries(snapshot.dynamicData).forEach(([key, val]) => {
      if (safeString(val).trim()) entity.dynamicData[key] = val;
    });
  }
  if (safeString(snapshot.avatar).trim()) entity.avatar = snapshot.avatar;
}

/**
 * @returns {{ changed: boolean, reason?: string, promotedChapter?: number, createdCh0Archive?: boolean }}
 */
export function promoteMilestoneToBaseline(entity, milestoneId, { generateId } = {}) {
  if (!entity || typeof entity !== 'object') {
    return { changed: false, reason: 'missing_entity' };
  }
  const targetId = safeString(milestoneId).trim();
  if (!targetId) return { changed: false, reason: 'missing_milestone_id' };

  const milestones = Array.isArray(entity.milestones) ? [...entity.milestones] : [];
  const target = milestones.find((ms) => safeString(ms?.id) === targetId);
  if (!target) return { changed: false, reason: 'milestone_not_found' };

  const promotedChapter = parseChapter(target.chapter);
  const nextNotes = buildBaselineNotesFromMilestone(target);
  if (!nextNotes) return { changed: false, reason: 'empty_milestone_body' };

  const currentBaseline = safeString(entity.info);
  let createdCh0Archive = false;

  if (!hasBaselineArchiveAtChapterZero(milestones) && currentBaseline.trim()) {
    milestones.push({
      id: typeof generateId === 'function' ? generateId('ms') : 'ms-archive-0',
      chapter: 0,
      title: 'Khởi tạo thẻ (ghi chép ban đầu)',
      event: currentBaseline,
      snapshot: cloneSnapshot(entity),
      meta: { source: BASELINE_ARCHIVE_SOURCE },
    });
    createdCh0Archive = true;
  }

  entity.milestones = sortMilestones(milestones);
  entity.info = nextNotes;
  entity.rawText = nextNotes;

  const promotedSnapshot = target.snapshot;
  if (promotedSnapshot) applySnapshotToEntity(entity, promotedSnapshot);

  entity.profileBaseline = {
    milestoneId: targetId,
    chapter: promotedChapter,
  };

  return {
    changed: true,
    promotedChapter,
    createdCh0Archive,
  };
}

export function readProfileBaselineMilestoneId(entity) {
  return safeString(entity?.profileBaseline?.milestoneId).trim();
}
