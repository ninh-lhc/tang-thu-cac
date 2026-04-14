// ==========================================
// appCollectionTimelineProfile.js
// Mục đích: dựng trạng thái "hiện tại" của hồ sơ từ mốc timeline mới nhất
//   và chuỗi snapshot timeline đi kèm.
// Import bởi: AppCollectionSection và test riêng cho detail/timeline toggle.
// Lưu ý: chỉ overlay avatar + dynamicData có giá trị, không ghi ngược vào entity gốc.
// ==========================================

import { safeString } from './MasterUtils.jsx';
import { parseMilestoneLabel } from './lib/milestoneLabels.js';

export function buildTimelineCurrentProfileView(entity) {
  if (!entity || typeof entity !== 'object') {
    return {
      entity: entity || null,
      latestMilestone: null,
      hasTimelineCurrentView: false,
      hasSnapshotOverlay: false,
    };
  }

  const milestones = Array.isArray(entity.milestones)
    ? [...entity.milestones].sort((a, b) => {
        const chapterA = typeof a?.chapter === 'number' ? a.chapter : parseInt(a?.chapter, 10) || 0;
        const chapterB = typeof b?.chapter === 'number' ? b.chapter : parseInt(b?.chapter, 10) || 0;
        if (chapterA !== chapterB) return chapterA - chapterB;
        return String(a?.id || '').localeCompare(String(b?.id || ''));
      })
    : [];

  if (milestones.length === 0) {
    return {
      entity,
      latestMilestone: null,
      hasTimelineCurrentView: false,
      hasSnapshotOverlay: false,
    };
  }

  const nextEntity = {
    ...entity,
    dynamicData: { ...(entity.dynamicData || {}) },
  };
  const latestMilestone = milestones[milestones.length - 1] || null;
  let hasSnapshotOverlay = false;

  milestones.forEach((milestone) => {
    const snapshot = milestone?.snapshot;
    if (!snapshot || typeof snapshot !== 'object') return;

    let touched = false;
    if (snapshot.dynamicData && typeof snapshot.dynamicData === 'object') {
      Object.entries(snapshot.dynamicData).forEach(([key, value]) => {
        if (!safeString(value).trim()) return;
        nextEntity.dynamicData[key] = value;
        touched = true;
      });
    }

    const nextAvatar = safeString(snapshot.avatar).trim();
    if (nextAvatar) {
      nextEntity.avatar = nextAvatar;
      touched = true;
    }

    if (touched) hasSnapshotOverlay = true;
  });

  const derivedTitle = safeString(nextEntity.dynamicData?.f_title).trim();
  if (derivedTitle) nextEntity.title = derivedTitle;
  const derivedStatus = safeString(nextEntity.dynamicData?.f_status).trim();
  if (derivedStatus) nextEntity.status = derivedStatus;

  return {
    entity: hasSnapshotOverlay ? nextEntity : entity,
    latestMilestone,
    hasTimelineCurrentView: !!latestMilestone,
    hasSnapshotOverlay,
  };
}

export function buildTimelineCurrentNotesText(entity) {
  const currentView = buildTimelineCurrentProfileView(entity);
  const milestone = currentView.latestMilestone;
  if (!milestone) return safeString(entity?.info);

  const chapter = safeString(milestone.chapter).trim();
  const title = safeString(milestone.title).trim();
  const parsed = parseMilestoneLabel(milestone.event);
  const body = safeString(parsed.body || milestone.event).trim();
  const parts = ['## Dữ kiện timeline hiện tại'];

  if (chapter) parts.push(`**Mốc chương:** ${chapter}`);
  if (title) parts.push(`### ${title}`);
  if (body) parts.push(body);

  return parts.join('\n\n').trim();
}
