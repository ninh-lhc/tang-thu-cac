/**
 * Đổi tên entity: collision trong một bộ truyện (activeNovelData), alias, renameHistory.
 * Không rewrite wiki-link trong ghi chú — chỉ cập nhật name/alias trên thẻ.
 */
import { findEquivalentEntityByName, mergeAliasText } from './entityNameIdentity.js';
import { reconcileRetiredWikiAliases, splitWikiAliasNames } from './retiredWikiAliases.js';

export function forEachNovelEntity(activeNovelData, visitor) {
  const data = activeNovelData?.data;
  if (!data || typeof data !== 'object' || typeof visitor !== 'function') return;
  Object.keys(data).forEach((lonId) => {
    const lonBucket = data[lonId];
    if (!lonBucket || typeof lonBucket !== 'object') return;
    Object.keys(lonBucket).forEach((nhoId) => {
      const tabData = lonBucket[nhoId];
      const entities = tabData?.entities;
      if (!Array.isArray(entities)) return;
      entities.forEach((ent) => {
        if (!ent?.id) return;
        visitor(ent, { lonId, nhoId });
      });
    });
  });
}

export function entityNamesEquivalentForRename(currentName, candidateName) {
  const cur = String(currentName || '').trim();
  const next = String(candidateName || '').trim();
  if (!cur || !next) return false;
  if (cur === next) return true;
  return !!findEquivalentEntityByName(
    [{ id: '__self__', name: cur, dynamicData: {} }],
    next,
    { allowExactNameMatch: true }
  );
}

function collisionWithEntity(ent, candidate) {
  const hit = findEquivalentEntityByName([ent], candidate, { allowExactNameMatch: true });
  if (hit?.entity?.id) {
    const reason = String(hit.reason || 'exact');
    const conflictingField = reason.startsWith('alias') ? 'alias' : 'name';
    return {
      entityId: String(hit.entity.id),
      entityName: String(hit.entity.name || '').trim(),
      reason,
      conflictingField,
    };
  }
  for (const retired of splitWikiAliasNames(ent.wikiRetiredAliases)) {
    if (entityNamesEquivalentForRename(retired, candidate)) {
      return {
        entityId: String(ent.id),
        entityName: String(ent.name || '').trim(),
        reason: 'retired_alias',
        conflictingField: 'retiredAlias',
      };
    }
  }
  return null;
}

/**
 * Phạm vi collision: toàn bộ entity trong activeNovelData (một bộ truyện đang mở).
 * @returns {{ entityId, entityName, reason, conflictingField } | null}
 */
export function findEntityRenameCollision(activeNovelData, { excludeEntityId, candidateName } = {}) {
  const candidate = String(candidateName || '').trim();
  const excludeId = String(excludeEntityId || '').trim();
  if (!candidate) return null;

  let collision = null;
  forEachNovelEntity(activeNovelData, (ent) => {
    if (collision) return;
    if (String(ent.id) === excludeId) return;
    collision = collisionWithEntity(ent, candidate);
  });
  return collision;
}

export function validateEntityRename(activeNovelData, { entityId, currentName = null } = {}, candidateName) {
  const target = String(candidateName || '').trim();
  if (!target) {
    return { ok: false, code: 'empty', message: 'Tên mới không được để trống.' };
  }
  const cur = String(currentName || '').trim();
  if (cur && entityNamesEquivalentForRename(cur, target)) {
    return { ok: true, code: 'unchanged', renamed: false };
  }
  const collision = findEntityRenameCollision(activeNovelData, {
    excludeEntityId: entityId,
    candidateName: target,
  });
  if (collision) {
    return { ok: false, code: 'collision', collision };
  }
  return { ok: true, code: 'valid', renamed: true };
}

export function removeNameFromAliasText(aliasText, nameToRemove) {
  const removeKey = String(nameToRemove || '')
    .trim()
    .toLocaleLowerCase('vi-VN');
  if (!removeKey) return String(aliasText || '').trim();
  const kept = splitWikiAliasNames(aliasText).filter(
    (part) => part.toLocaleLowerCase('vi-VN') !== removeKey
  );
  return kept.join(', ');
}

export function purgeNamesFromWikiRetiredAliases(entity, names) {
  if (!entity) return;
  const drop = new Set(
    (Array.isArray(names) ? names : [])
      .map((n) => String(n || '').trim().toLocaleLowerCase('vi-VN'))
      .filter(Boolean)
  );
  if (drop.size === 0) return;
  const kept = splitWikiAliasNames(entity.wikiRetiredAliases).filter(
    (part) => !drop.has(part.toLocaleLowerCase('vi-VN'))
  );
  entity.wikiRetiredAliases = kept;
}

export function createDefaultAliasAccess(_entity) {
  return {
    read: (e) => String(e?.dynamicData?.f_alias || '').trim(),
    write: (e, value) => {
      if (!e.dynamicData || typeof e.dynamicData !== 'object') e.dynamicData = {};
      e.dynamicData.f_alias = String(value ?? '').trim();
    },
  };
}

/**
 * @param {object} entity
 * @param {{ newName, timelineEventId?, chapter?, changedAt?, aliasAccess? }} options
 * @returns {{ ok: boolean, renamed: boolean, code?: string, oldName?: string, newName?: string }}
 */
export function applyEntityRename(
  entity,
  { newName, timelineEventId = null, chapter = null, changedAt = null, aliasAccess = null } = {}
) {
  if (!entity) return { ok: false, renamed: false, code: 'no_entity' };

  const prevName = String(entity.name || '').trim();
  const target = String(newName || '').trim();
  if (!target) return { ok: false, renamed: false, code: 'empty' };
  if (entityNamesEquivalentForRename(prevName, target)) {
    if (target !== prevName) entity.name = target;
    return { ok: true, renamed: false, code: 'unchanged' };
  }

  const access = aliasAccess || createDefaultAliasAccess(entity);
  const prevAlias = access.read(entity);
  const strippedAlias = removeNameFromAliasText(prevAlias, target);
  access.write(entity, strippedAlias);

  entity.name = target;
  const mergedAlias = mergeAliasText(access.read(entity), prevName);
  const finalAlias = removeNameFromAliasText(mergedAlias, target);
  access.write(entity, finalAlias);

  entity.wikiRetiredAliases = reconcileRetiredWikiAliases(
    prevAlias,
    finalAlias,
    entity.wikiRetiredAliases
  );
  purgeNamesFromWikiRetiredAliases(entity, [target, prevName, ...splitWikiAliasNames(finalAlias)]);

  recordEntityRenameHistory(entity, {
    oldName: prevName,
    newName: target,
    milestoneId: timelineEventId,
    chapter,
    changedAt,
  });

  return { ok: true, renamed: true, code: 'renamed', oldName: prevName, newName: target };
}

export function recordEntityRenameHistory(
  entity,
  { oldName, newName, milestoneId = null, chapter = null, changedAt = null } = {}
) {
  if (!entity) return;
  const prev = String(oldName || '').trim();
  const next = String(newName || '').trim();
  if (!prev || !next || prev === next) return;

  const msId = String(milestoneId || '').trim();
  const history = Array.isArray(entity.renameHistory) ? [...entity.renameHistory] : [];
  const withoutDup = msId
    ? history.filter((row) => String(row?.timelineEventId || '') !== msId)
    : history;

  withoutDup.push({
    oldName: prev,
    newName: next,
    chapter: Number.isFinite(chapter) ? chapter : null,
    timelineEventId: msId || null,
    changedAt: changedAt || new Date().toISOString(),
  });
  entity.renameHistory = withoutDup;
}

export function getMilestoneRenameHistoryRow(entity, milestoneId) {
  const msId = String(milestoneId || '').trim();
  if (!msId) return null;
  const history = Array.isArray(entity?.renameHistory) ? entity.renameHistory : [];
  return history.find((row) => String(row?.timelineEventId || '') === msId) || null;
}

export function milestoneHasAppliedRename(entity, milestone) {
  if (!entity || !milestone?.id) return false;
  return !!getMilestoneRenameHistoryRow(entity, milestone.id);
}

export function formatEntityRenameCollisionMessage(candidateName, collision) {
  const name = String(candidateName || '').trim();
  const other = String(collision?.entityName || collision?.entityId || '').trim();
  if (other) {
    return `Không thể đổi tên thành “${name}”.\n\nTên này đang được sử dụng bởi thẻ “${other}”. Hãy chọn tên khác hoặc kiểm tra thẻ hiện có.`;
  }
  return `Không thể đổi tên thành “${name}”.\n\nTên này đang được sử dụng bởi entity khác.`;
}

export const MILESTONE_RENAME_LOCKED_MESSAGE =
  'Mốc này đã làm thay đổi tên entity. Việc sửa/xóa “Tên mới sau nâng cấp” hoặc xóa mốc chưa hỗ trợ hoàn tác đổi tên an toàn — hãy dùng Hoàn tác ngay sau khi lưu nếu cần.';
