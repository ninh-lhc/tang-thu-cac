// Gom handler Entity + Milestone khỏi App.jsx để giảm độ phình trục app.
// Hook này giữ nguyên logic mutate/undo và cảnh báo dữ liệu như phiên bản cũ.
// App.jsx truyền toàn bộ state/ref/setter cần thiết, hook không giữ source state riêng.
// Mục tiêu: tách gọn code mà không đổi hành vi runtime.
import { useCallback, useMemo } from 'react';
import { lockFieldsTemplateIfFirstEntity, resolveFieldsTemplate } from './MasterEngines.js';
import { generateId, safeString, toDisplayTitleCase } from './MasterUtils.jsx';
import { countEntitiesInNovel } from './deepSearchCore.js';
import { findEquivalentEntityByName, mergeAliasText } from './lib/entityNameIdentity.js';
import { applyAutoRelationNotesForEntity, isAutoRelationScopeLonId, syncAllAutoRelationNotesForNovel } from './lib/autoRelationDetailNote.js';
import { isListCardEntity, syncAllCollectionListCards, syncAllCollectionListCardsDetailed } from './lib/collectionListCardSync.js';
import { markAllShardsDirty } from './lib/dirtyShardTracker.js';
import { isCultivationRelationScope, syncAllCultivationRelationBlocks } from './lib/cultivationRelationSync.js';
import { isMainCharacterRelationScope, syncAllMainCharacterRelationBlocks } from './lib/mainCharacterRelationSync.js';
import { buildScopedEntityImageStemParts } from './lib/imageFilename.js';
import {
  AUTO_SYNC_ENGINE_COLLECTION_CARDS,
  getAutoSyncEngineLabel,
  setEntityAutoSyncState,
} from './lib/autoSyncEntityPrefs.js';
import { runNovelAutoSyncPlan } from './lib/autoSyncManager.js';
import {
  appendOwnerAcquisitionMilestoneDetailed,
  ownerMilestoneApplyReasonToMessage,
  parseOwnerTimelineHintDetailed,
  ownerTimelineHintReasonToMessage,
  removeOwnerAcquisitionMilestonesByItem,
  syncAutoOwnerMilestonesItemRename,
} from './lib/autoOwnerMilestone.js';
import {
  isMapCollectionScope,
  syncAllMapHierarchyAutoBlocks,
  syncMapHierarchyNameReferences,
  TTC_MAP_ANCHOR_STUB_KEY,
} from './lib/mapHierarchySync.js';
import { detachMapChildrenOnDelete } from './lib/mapEntityTree.js';
import {
  getEntityAutoFieldValue,
  hasAnyAutoSyncFieldChanged,
  setEntityAutoFieldValue,
} from './lib/tabAutoSyncFieldMap.js';
import { normalizeTabAutoSyncLevelConfig } from './lib/tabAutoSyncLevels.js';
import {
  isForceCollectionScope,
  summarizeTheLucMapSyncWarnings,
  syncAllTheLucMapAutoBlocksDetailed,
  syncTheLucMapAutoBlocksDetailed,
} from './lib/theLucBanDoSync.js';
import { buildEntityNoteTemplate, mergeEntityNoteDetailSectionFromDynamicData } from './lib/entityNoteTemplateVi.js';
import { getEffectiveAutoSyncRole } from './lib/tabAutoSyncRole.js';
import { reconcileRetiredWikiAliases } from './lib/retiredWikiAliases.js';
import {
  applyEntityRename,
  entityNamesEquivalentForRename,
  formatEntityRenameCollisionMessage,
  milestoneHasAppliedRename,
  MILESTONE_RENAME_LOCKED_MESSAGE,
  RENAME_CHAPTER_ORDER_BLOCK_MESSAGE,
  validateEntityRename,
  validateMilestoneChapterEdit,
  validateTimelineRenameChapter,
} from './lib/entityRename.js';
import {
  hasBaselineArchiveAtChapterZero,
  promoteMilestoneToBaseline,
  readProfileBaselineMilestoneId,
} from './lib/promoteMilestoneToBaseline.js';

export function useAppEntityMilestoneActions({
  activeNovelData,
  activeNovelDataRef,
  activeTabLon,
  activeTabNho,
  currentTabConfig,
  selectedEntity,
  selectedEntityId,
  selectedMilestoneId,
  selectedDescriptionId,
  updateActiveNovelData,
  handlePickLocalImage,
  setActiveNovelData,
  setSelectedEntityId,
  setSelectedMilestoneId,
  setEditingMilestoneData,
  setSelectedDescriptionId,
  setCollectionSubTab,
  setIsEditingMode,
  setIsEntityEditing,
  setConfirmDialog,
  setRecentlyMergedFields,
  setEditingEntityData,
  setIsEntityModalOpen,
  setActiveTabNho,
  showToast,
  syncNovelRef,
  dirHandleRef,
  novelStatsByIdRef,
  setNovelStatsById,
  confirmDeleteEntityRef,
}) {
  const handleOpenCreateEntity = useCallback(() => {
    if (!activeTabNho && Array.isArray(currentTabConfig?.subTabs) && currentTabConfig.subTabs.length > 0) {
      const first =
        currentTabConfig.subTabs.find((s) => s.viewType === 'collection-track') || currentTabConfig.subTabs[0];
      if (first?.id) setActiveTabNho(first.id);
    }
    setEditingEntityData(null);
    setIsEntityModalOpen(true);
  }, [
    activeTabNho,
    currentTabConfig,
    setActiveTabNho,
    setEditingEntityData,
    setIsEntityModalOpen,
  ]);

  const handleOpenEditEntity = useCallback(() => {
    if (!selectedEntity) return;
    setEditingEntityData({ ...selectedEntity });
    setIsEntityModalOpen(true);
  }, [selectedEntity, setEditingEntityData, setIsEntityModalOpen]);

  const entityImageScopeLabel = safeString(currentTabConfig?.label);
  const entityImageName = safeString(selectedEntity?.name);
  const currentTabEntities = useMemo(() => {
    const tabData = activeNovelData?.data?.[activeTabLon]?.[activeTabNho || 'default'];
    return Array.isArray(tabData?.entities) ? tabData.entities : [];
  }, [activeNovelData, activeTabLon, activeTabNho]);
  const entityImageStemParts = useMemo(
    () =>
      buildScopedEntityImageStemParts({
        tabLabel: entityImageScopeLabel,
        entityName: entityImageName,
        entityId: selectedEntity?.id,
        siblingEntities: currentTabEntities,
      }),
    [entityImageName, entityImageScopeLabel, currentTabEntities, selectedEntity?.id]
  );
  const currentAutoFieldContext = useMemo(
    () => ({
      activeTabLon,
      activeTabNho: activeTabNho || 'default',
      currentTabConfig: currentTabConfig || null,
      parentLabel: currentTabConfig?._parentLabel || '',
    }),
    [activeTabLon, activeTabNho, currentTabConfig]
  );
  const getStatusLineForCurrentTab = useCallback(
    (entityLike) =>
      getEntityAutoFieldValue(entityLike, currentAutoFieldContext, 'status', {
        fallbackToStatus: true,
      }) || safeString(entityLike?.dynamicData?.f_status || entityLike?.status).trim(),
    [currentAutoFieldContext]
  );
  const mergeAliasForCurrentTab = useCallback(
    (entity, nextAlias) => {
      if (!entity || !safeString(nextAlias).trim()) return;
      const prevAlias =
        getEntityAutoFieldValue(entity, currentAutoFieldContext, 'alias') ||
        safeString(entity.dynamicData?.f_alias);
      const mergedAlias = mergeAliasText(prevAlias, nextAlias);
      if (mergedAlias === prevAlias) return;
      const updated = setEntityAutoFieldValue(entity, currentAutoFieldContext, 'alias', mergedAlias);
      if (!updated) {
        if (!entity.dynamicData || typeof entity.dynamicData !== 'object') entity.dynamicData = {};
        entity.dynamicData.f_alias = mergedAlias;
      }
    },
    [currentAutoFieldContext]
  );
  const buildEntityAliasAccess = useCallback(
    () => ({
      read: (entity) =>
        getEntityAutoFieldValue(entity, currentAutoFieldContext, 'alias') ||
        safeString(entity?.dynamicData?.f_alias),
      write: (entity, value) => {
        const updated = setEntityAutoFieldValue(entity, currentAutoFieldContext, 'alias', value);
        if (!updated) {
          if (!entity.dynamicData || typeof entity.dynamicData !== 'object') entity.dynamicData = {};
          entity.dynamicData.f_alias = value;
        }
      },
    }),
    [currentAutoFieldContext]
  );
  const syncRenameSideEffects = useCallback(
    (nov, ent, entPrevName, renameTarget) => {
      let ownerMilestoneRenameSynced = 0;
      let mapHierarchyRenameSynced = 0;
      if (activeTabLon !== 'nhan-vat') {
        ownerMilestoneRenameSynced = syncAutoOwnerMilestonesItemRename(nov, {
          entityId: ent.id,
          oldName: entPrevName,
          newName: renameTarget,
        });
      }
      if (isMapCollectionScope({ activeTabLon, activeTabNho, currentTabConfig })) {
        mapHierarchyRenameSynced = syncMapHierarchyNameReferences(nov, {
          entityId: ent.id,
          oldName: entPrevName,
          newName: renameTarget,
        });
      }
      syncAllCollectionListCards(nov);
      return { ownerMilestoneRenameSynced, mapHierarchyRenameSynced };
    },
    [activeTabLon, activeTabNho, currentTabConfig]
  );
  const hasCurrentAutoFieldChange = useCallback(
    (changedFieldIds, fieldKeys, fallbackFieldIds = []) =>
      hasAnyAutoSyncFieldChanged(currentAutoFieldContext, changedFieldIds, fieldKeys) ||
      fallbackFieldIds.some((fieldId) => changedFieldIds?.has?.(fieldId)),
    [currentAutoFieldContext]
  );
  const currentAutoSyncRole = useMemo(
    () => getEffectiveAutoSyncRole(currentAutoFieldContext),
    [currentAutoFieldContext]
  );

  const handleSetSelectedEntityAutoSyncState = useCallback(
    (engineId, kind, enabled) => {
      if (!selectedEntityId || !activeTabLon) return;
      let prefsChanged = false;
      let forceWarning = '';
      const entityName = safeString(selectedEntity?.name).trim() || 'Thẻ đang chọn';
      const engineLabel = getAutoSyncEngineLabel(engineId);

      updateActiveNovelData((nov) => {
        const tabData = nov.data?.[activeTabLon]?.[activeTabNho || 'default'];
        const ent = tabData?.entities?.find((item) => item.id === selectedEntityId);
        if (!ent) return;
        prefsChanged = setEntityAutoSyncState(ent, engineId, kind, enabled) || prefsChanged;
        if (!prefsChanged) return;
        const autoSyncResult = runNovelAutoSyncPlan(
          nov,
          { engines: [engineId, AUTO_SYNC_ENGINE_COLLECTION_CARDS] },
          {
            recordLog: true,
            reason: kind === 'locked' ? 'entity_lock' : 'entity_disable',
            scopeLabel: `${safeString(currentTabConfig?.label || currentAutoSyncRole || 'AUTO')} > ${entityName}`,
          }
        );
        forceWarning = autoSyncResult.forceWarning || '';
      });

      if (!prefsChanged) return;
      const actionLabel = kind === 'locked' ? 'khóa' : 'tắt riêng';
      showToast(
        enabled
          ? `Đã ${actionLabel} AUTO "${engineLabel}" cho ${entityName}.`
          : `Đã bật lại AUTO "${engineLabel}" cho ${entityName}.`,
        'success'
      );
      if (forceWarning) showToast(forceWarning, 'warning');
    },
    [
      selectedEntityId,
      activeTabLon,
      activeTabNho,
      selectedEntity?.name,
      currentTabConfig,
      currentAutoSyncRole,
      updateActiveNovelData,
      showToast,
    ]
  );

  const handleSaveEntity = useCallback(
    (formData, dynamicData, opts = null) => {
      const copyRawToInfo = Boolean(opts && opts.copyRawToInfo);
      const normalizedEntityName = toDisplayTitleCase(formData?.name);
      if (!normalizedEntityName) {
        showToast('Điền Danh xưng / Tên gọi trước khi lưu.', 'warning');
        return;
      }
      if (!activeTabNho && Array.isArray(currentTabConfig?.subTabs) && currentTabConfig.subTabs.length > 0) {
        showToast(
          'Chưa chọn chương mục con (vd. Chủng Tộc) — bấm vào tab con trên mục lục rồi lưu lại; hoặc đóng modal và mở «Tạo mới» từ danh sách.',
          'warning'
        );
        return;
      }
      const prev = activeNovelData ? structuredClone(activeNovelData) : null;
      const isCreate = !formData.id;
      const newEntityId = isCreate ? generateId('ent') : formData.id;
      const ownerTimelineHintDetail = isCreate
        ? parseOwnerTimelineHintDetailed({
            dynamicData,
            fieldsTemplate: currentTabConfig?.fieldsTemplate || [],
            rawText: formData.rawText,
          })
        : { hint: null, reason: 'no_owner_hint' };
      const ownerTimelineHint = ownerTimelineHintDetail?.hint || null;
      let createTargetEntityId = null;
      let createMergedToExisting = false;
      let ownerMilestoneAutoApplied = false;
      let ownerMilestoneApplyWarning = '';
      let ownerMilestoneRenameSynced = 0;
      let forceMapAutoApplied = false;
      let forceMapAutoWarning = '';
      let relationAutoResynced = false;
      let mainCharacterRelationResynced = false;
      let cultivationRelationAutoResynced = false;
      let mapHierarchyAutoApplied = false;
      let mapHierarchyRenameSynced = 0;

      if (formData.id) {
        const previewTab = activeNovelData?.data?.[activeTabLon]?.[activeTabNho || 'default'];
        const previewEnt = previewTab?.entities?.find((e) => e.id === formData.id);
        const prevNamePreview = safeString(previewEnt?.name).trim();
        if (
          previewEnt &&
          !entityNamesEquivalentForRename(prevNamePreview, normalizedEntityName)
        ) {
          const validation = validateEntityRename(activeNovelData, {
            entityId: formData.id,
            currentName: prevNamePreview,
          }, normalizedEntityName);
          if (!validation.ok) {
            if (validation.code === 'collision') {
              showToast(
                formatEntityRenameCollisionMessage(normalizedEntityName, validation.collision),
                'warning'
              );
            } else if (validation.message) {
              showToast(validation.message, 'warning');
            }
            return;
          }
        }
      }

      let saveOk = false;
      try {
        saveOk = updateActiveNovelData((nov) => {
        if (!nov.data) nov.data = {};
        if (!nov.data[activeTabLon]) nov.data[activeTabLon] = {};
        let tabData = nov.data[activeTabLon][activeTabNho || 'default'];
        if (typeof tabData === 'string' || !tabData) {
          tabData = { overview: typeof tabData === 'string' ? tabData : '', entities: [] };
        }
        if (!tabData.entities) tabData.entities = [];

        if (formData.id) {
          const idx = tabData.entities.findIndex((e) => e.id === formData.id);
          if (idx > -1) {
            const prevImages = Array.isArray(tabData.entities[idx].images)
              ? tabData.entities[idx].images
              : [];
            const prevDyn = tabData.entities[idx].dynamicData || {};
            const mergedDyn = { ...prevDyn, ...dynamicData };
            const wikiRetiredAliases = reconcileRetiredWikiAliases(
              prevDyn.f_alias,
              mergedDyn.f_alias,
              tabData.entities[idx].wikiRetiredAliases
            );
            delete mergedDyn[TTC_MAP_ANCHOR_STUB_KEY];
            const statusLine = getStatusLineForCurrentTab({
              ...tabData.entities[idx],
              dynamicData: mergedDyn,
              wikiRetiredAliases,
            });
            const preservedInfo = safeString(tabData.entities[idx].info);
            const mergedInfo = copyRawToInfo
              ? preservedInfo
              : mergeEntityNoteDetailSectionFromDynamicData(preservedInfo, {
                  entityName: normalizedEntityName,
                  fieldsTemplate: resolveFieldsTemplate(
                    currentTabConfig,
                    activeTabLon,
                    currentTabConfig?._parentLabel || ''
                  ),
                  dynamicData: mergedDyn,
                });
            tabData.entities[idx] = {
              ...tabData.entities[idx],
              name: tabData.entities[idx].name,
              avatar: formData.avatar,
              rawText: formData.rawText,
              status: statusLine,
              dynamicData: mergedDyn,
              images: prevImages,
              info: mergedInfo,
              wikiRetiredAliases,
            };
            const entRef = tabData.entities[idx];
            const renameResult = applyEntityRename(entRef, {
              newName: normalizedEntityName,
              aliasAccess: buildEntityAliasAccess(),
              reason: 'direct-form',
            });
            if (renameResult.renamed) {
              const side = syncRenameSideEffects(nov, entRef, renameResult.oldName, renameResult.newName);
              ownerMilestoneRenameSynced = side.ownerMilestoneRenameSynced;
              mapHierarchyRenameSynced = side.mapHierarchyRenameSynced;
            }
            applyAutoRelationNotesForEntity(nov, {
              sourceEntity: entRef,
              sourceLonId: activeTabLon,
              sourceNhoId: activeTabNho || 'default',
              sourceNhoConfig: currentTabConfig,
              sourceParentLabel: currentTabConfig?._parentLabel || '',
              statusLine,
            });
          }
        } else {
          const mergedNew = { ...dynamicData };
          delete mergedNew[TTC_MAP_ANCHOR_STUB_KEY];
          const statusLine = getStatusLineForCurrentTab({
            dynamicData: mergedNew,
            status: '',
          });
          const canonicalName = normalizedEntityName;
          const matched = findEquivalentEntityByName(tabData.entities, canonicalName, {
            allowExactNameMatch: false,
          });
          if (matched?.entity) {
            createTargetEntityId = matched.entity.id;
            createMergedToExisting = true;
            mergeAliasForCurrentTab(matched.entity, canonicalName);
            applyAutoRelationNotesForEntity(nov, {
              sourceEntity: matched.entity,
              sourceLonId: activeTabLon,
              sourceNhoId: activeTabNho || 'default',
              sourceNhoConfig: currentTabConfig,
              sourceParentLabel: currentTabConfig?._parentLabel || '',
              statusLine: getStatusLineForCurrentTab(matched.entity),
            });
          } else {
            const createInfoTemplate = buildEntityNoteTemplate({
              entityName: canonicalName,
              tabLabel: currentTabConfig?.label || '',
              parentLabel: currentTabConfig?._parentLabel || '',
              fieldsTemplate: resolveFieldsTemplate(currentTabConfig, activeTabLon, currentTabConfig?._parentLabel || ''),
              dynamicData: mergedNew,
            });
            const baseInfo = copyRawToInfo ? formData.rawText : createInfoTemplate;
            tabData.entities.push({
              id: newEntityId,
              name: canonicalName,
              avatar: formData.avatar,
              rawText: formData.rawText,
              status: statusLine,
              dynamicData: mergedNew,
              info: baseInfo,
              milestones: [],
              images: [],
            });
            const created = tabData.entities[tabData.entities.length - 1];
            applyAutoRelationNotesForEntity(nov, {
              sourceEntity: created,
              sourceLonId: activeTabLon,
              sourceNhoId: activeTabNho || 'default',
              sourceNhoConfig: currentTabConfig,
              sourceParentLabel: currentTabConfig?._parentLabel || '',
              statusLine,
            });
            createTargetEntityId = newEntityId;
            lockFieldsTemplateIfFirstEntity(nov, activeTabLon, activeTabNho || 'default');
            if (activeTabLon !== 'nhan-vat' && ownerTimelineHint) {
              const ownerApplyResult = appendOwnerAcquisitionMilestoneDetailed(nov, ownerTimelineHint, {
                name: canonicalName,
                entityId: newEntityId,
              });
              ownerMilestoneAutoApplied = ownerApplyResult.applied;
              ownerMilestoneApplyWarning =
                ownerMilestoneApplyReasonToMessage(ownerApplyResult) || ownerMilestoneApplyWarning;
            }
          }
        }

        // Nếu user bật tùy chọn copy: thay thế info để hiển thị wiki link đầy đủ ở tab Ghi Chép Chi Tiết.
        if (copyRawToInfo && formData.id) {
          const idx2 = tabData.entities.findIndex((e) => e.id === formData.id);
          if (idx2 > -1) tabData.entities[idx2].info = formData.rawText;
        }

        nov.data[activeTabLon][activeTabNho || 'default'] = tabData;
        const targetIdForSync = formData.id || createTargetEntityId;
        if (
          isForceCollectionScope({
            activeTabLon,
            activeTabNho,
            currentTabConfig,
            parentLabel: currentTabConfig?._parentLabel || '',
          }) &&
          targetIdForSync
        ) {
          const forceSyncResult = syncTheLucMapAutoBlocksDetailed(nov, {
            sourceLonId: activeTabLon,
            sourceNhoId: activeTabNho || 'default',
            entityId: targetIdForSync,
          });
          forceMapAutoApplied = forceSyncResult.changed || forceMapAutoApplied;
          forceMapAutoWarning =
            summarizeTheLucMapSyncWarnings(forceSyncResult.warnings) || forceMapAutoWarning;
        }
        if (
          isAutoRelationScopeLonId(
            activeTabLon,
            currentTabConfig?._parentLabel || '',
            currentTabConfig,
            activeTabNho || 'default'
          )
        ) {
          relationAutoResynced = syncAllAutoRelationNotesForNovel(nov) || relationAutoResynced;
        }
        if (isCultivationRelationScope({ activeTabLon, activeTabNho, currentTabConfig })) {
          cultivationRelationAutoResynced =
            syncAllCultivationRelationBlocks(nov) || cultivationRelationAutoResynced;
        }
        if (
          isMainCharacterRelationScope({
            activeTabLon,
            activeTabNho,
            currentTabConfig,
            parentLabel: currentTabConfig?._parentLabel || '',
          })
        ) {
          mainCharacterRelationResynced =
            syncAllMainCharacterRelationBlocks(nov) || mainCharacterRelationResynced;
        }
        if (isMapCollectionScope({ activeTabLon, activeTabNho, currentTabConfig })) {
          mapHierarchyAutoApplied = syncAllMapHierarchyAutoBlocks(nov) || mapHierarchyAutoApplied;
        }
        syncAllCollectionListCards(nov);
      });
      } catch (err) {
        console.error('[TTC] handleSaveEntity', err);
        showToast(
          `Không lưu được thẻ (lỗi nội bộ): ${safeString(err?.message || err).slice(0, 200)}`,
          'error'
        );
        return;
      }
      if (saveOk === false) {
        showToast('Không lưu được — chưa có dữ liệu truyện đang mở.', 'error');
        return;
      }

      // UX: tạo thẻ xong thì tự vào tab Hồ Sơ + bật chế độ ghi chép chi tiết.
      if (isCreate && createTargetEntityId) {
        setSelectedEntityId(createTargetEntityId);
        setSelectedMilestoneId(null);
        setEditingMilestoneData(null);
        setCollectionSubTab('detail');
        setIsEditingMode(false);
        setIsEntityEditing(true);
      }

      const saveToastMsg = formData.id
        ? 'Đã tu bổ lại Thực Thể!'
        : createMergedToExisting
          ? 'Tên mới trùng thẻ cũ - đã thêm vào bí danh và liên kết về thẻ hiện có.'
          : ownerMilestoneAutoApplied
            ? 'Đã ngưng tụ Thực Thể mới và tự ghi mốc cho Nhân Vật sở hữu.'
            : 'Đã ngưng tụ Thực Thể mới!';
      const saveToastLevel = formData.id || !createMergedToExisting ? 'success' : 'warning';
      showToast(
        saveToastMsg,
        saveToastLevel,
        prev
          ? {
              undoLabel: 'Hoàn tác',
              onUndo: () => {
                markAllShardsDirty(prev?.data);
                setActiveNovelData(structuredClone(prev));
                void (syncNovelRef.current && syncNovelRef.current(prev, dirHandleRef.current));
              },
            }
          : null
      );
      if (ownerMilestoneRenameSynced > 0) {
        showToast(
          `Đã đồng bộ ${ownerMilestoneRenameSynced} mốc auto theo tên mới của thẻ.`,
          'success'
        );
      }
      if (forceMapAutoApplied) {
        showToast('Đã đồng bộ quan hệ Thế Lực ↔ Bản đồ (AUTO).', 'success');
      }
      if (relationAutoResynced) {
        showToast('Đã đồng bộ lại liên kết Thế Lực ↔ Bản đồ trên toàn bộ thẻ.', 'success');
      }
      if (mainCharacterRelationResynced) {
        showToast('Đã đồng bộ quan hệ Nhân Vật Chính ↔ các tab nhân vật liên quan (AUTO).', 'success');
      }
      if (mapHierarchyAutoApplied) {
        showToast('Đã đồng bộ cây Bản đồ (AUTO).', 'success');
      }
      if (mapHierarchyRenameSynced > 0) {
        showToast(`Đã cập nhật ${mapHierarchyRenameSynced} thẻ Bản đồ theo tên mới.`, 'success');
      }
      if (cultivationRelationAutoResynced) {
        showToast('Đã đồng bộ lại liên kết Hệ Thống Tu Luyện ↔ Cảnh Giới Tu Vi (AUTO).', 'success');
      }
      if (forceMapAutoWarning) {
        showToast(forceMapAutoWarning, 'warning');
      }
      const ownerWarn =
        ownerMilestoneApplyWarning || ownerTimelineHintReasonToMessage(ownerTimelineHintDetail?.reason);
      if (!ownerMilestoneAutoApplied && ownerWarn && activeTabLon !== 'nhan-vat') {
        showToast(ownerWarn, 'warning');
      }
    },
    [
      activeNovelData,
      activeTabLon,
      activeTabNho,
      currentTabConfig,
      getStatusLineForCurrentTab,
      mergeAliasForCurrentTab,
      buildEntityAliasAccess,
      syncRenameSideEffects,
      updateActiveNovelData,
      setSelectedEntityId,
      setSelectedMilestoneId,
      setEditingMilestoneData,
      setCollectionSubTab,
      setIsEditingMode,
      setIsEntityEditing,
      showToast,
      setActiveNovelData,
      syncNovelRef,
      dirHandleRef,
    ]
  );

  const handleAddImageToSelectedEntity = useCallback(async () => {
    if (!selectedEntityId) {
      showToast('Vui lòng chọn thẻ trước khi thêm ảnh.', 'warning');
      return;
    }
      await handlePickLocalImage(
      (url) => {
        updateActiveNovelData((nov) => {
          if (!nov.data?.[activeTabLon]) return;
          const tabData = nov.data[activeTabLon][activeTabNho || 'default'];
          const ent = tabData?.entities?.find((e) => e.id === selectedEntityId);
          if (!ent) return;
          if (!Array.isArray(ent.images)) ent.images = [];
          ent.images.push(safeString(url));
        });
      },
      null,
      {
        filePrefix: 'gallery',
        fileStemParts: entityImageStemParts,
      }
    );
  }, [
    selectedEntityId,
    showToast,
    handlePickLocalImage,
    updateActiveNovelData,
    activeTabLon,
    activeTabNho,
    entityImageStemParts,
  ]);

  const handleRemoveImageFromSelectedEntity = useCallback(
    (imageIndex) => {
      if (!selectedEntityId) return;
      updateActiveNovelData((nov) => {
        if (!nov.data?.[activeTabLon]) return;
        const tabData = nov.data[activeTabLon][activeTabNho || 'default'];
        const ent = tabData?.entities?.find((e) => e.id === selectedEntityId);
        if (!ent || !Array.isArray(ent.images)) return;
        ent.images = ent.images.filter((_, idx) => idx !== imageIndex);
      });
      showToast('Đã xóa ảnh khỏi BST thẻ.');
    },
    [selectedEntityId, updateActiveNovelData, activeTabLon, activeTabNho, showToast]
  );

  const handleUpdateEntityInfo = useCallback(
    (content, opts = {}) => {
      const ownerTimelineHintDetail =
        activeTabLon !== 'nhan-vat'
          ? parseOwnerTimelineHintDetailed({
              dynamicData: selectedEntity?.dynamicData || {},
              fieldsTemplate: currentTabConfig?.fieldsTemplate || [],
              rawText: content,
            })
          : { hint: null, reason: 'no_owner_hint' };
      const ownerTimelineHint = ownerTimelineHintDetail?.hint || null;
      let ownerMilestoneAutoApplied = false;
      let ownerMilestoneApplyWarning = '';

      if (ownerTimelineHint) {
        updateActiveNovelData((nov) => {
          if (!nov.data?.[activeTabLon]) return;
          const tabData = nov.data[activeTabLon][activeTabNho || 'default'];
          const ent = tabData?.entities?.find((e) => e.id === selectedEntityId);
          if (ent) {
            ent.info = content;
            ent.rawText = content;
            if (Array.isArray(opts.wikiLinkOptOuts)) {
              ent.wikiLinkOptOuts = opts.wikiLinkOptOuts;
            }
            const ownerApplyResult = appendOwnerAcquisitionMilestoneDetailed(nov, ownerTimelineHint, {
              name: ent.name,
              entityId: ent.id,
            });
            ownerMilestoneAutoApplied = ownerApplyResult.applied;
            ownerMilestoneApplyWarning =
              ownerMilestoneApplyReasonToMessage(ownerApplyResult) || ownerMilestoneApplyWarning;
          }
          syncAllCollectionListCards(nov);
        });
      } else {
        updateActiveNovelData({
          lonId: activeTabLon,
          nhoId: activeTabNho || 'default',
          entityId: selectedEntityId,
          updater: (ent) => {
            const next = { ...ent, info: content, rawText: content };
            if (Array.isArray(opts.wikiLinkOptOuts)) next.wikiLinkOptOuts = opts.wikiLinkOptOuts;
            return next;
          },
        });
      }

      showToast(
        ownerMilestoneAutoApplied
          ? 'Ghi chép hồ sơ thành công! Đã tự ghi mốc sở hữu vào timeline Nhân Vật.'
          : 'Ghi chép hồ sơ thành công!'
      );
      const ownerWarn =
        ownerMilestoneApplyWarning || ownerTimelineHintReasonToMessage(ownerTimelineHintDetail?.reason);
      if (!ownerMilestoneAutoApplied && ownerWarn && activeTabLon !== 'nhan-vat') {
        showToast(ownerWarn, 'warning');
      }
    },
    [
      activeTabLon,
      selectedEntity,
      currentTabConfig,
      updateActiveNovelData,
      activeTabNho,
      selectedEntityId,
      showToast,
    ]
  );

  const handleSaveMilestone = useCallback(
    (formData, snapshot) => {
      const prev = activeNovelData ? structuredClone(activeNovelData) : null;
      let timelineNameUpdated = false;
      let ownerMilestoneRenameSynced = 0;
      let mapHierarchyRenameSynced = 0;

      const previewTab = activeNovelData?.data?.[activeTabLon]?.[activeTabNho || 'default'];
      const previewEnt = previewTab?.entities?.find((e) => e.id === selectedEntityId);
      const prevName = safeString(previewEnt?.name).trim();
      const nextRaw = safeString(formData?.nextEntityName).trim();
      const nextEntityName = nextRaw ? toDisplayTitleCase(nextRaw) : '';
      const willRename = !!(
        nextEntityName &&
        prevName &&
        !entityNamesEquivalentForRename(prevName, nextEntityName)
      );

      if (formData.id && previewEnt) {
        const existingMs = (previewEnt.milestones || []).find((m) => m.id === formData.id);
        if (existingMs) {
          const chapterEdit = validateMilestoneChapterEdit(previewEnt, existingMs, formData.chapter);
          if (!chapterEdit.ok) {
            showToast(chapterEdit.message, 'warning');
            return;
          }
          if (milestoneHasAppliedRename(previewEnt, existingMs)) {
            const oldNext = safeString(existingMs.nextEntityName).trim();
            const newNext = safeString(formData.nextEntityName).trim();
            const oldNorm = oldNext ? toDisplayTitleCase(oldNext) : '';
            const newNorm = newNext ? toDisplayTitleCase(newNext) : '';
            if (oldNorm !== newNorm) {
              showToast(MILESTONE_RENAME_LOCKED_MESSAGE, 'warning');
              return;
            }
          }
        }
      }

      if (willRename) {
        const validation = validateEntityRename(
          activeNovelData,
          { entityId: selectedEntityId, currentName: prevName },
          nextEntityName
        );
        if (!validation.ok) {
          if (validation.code === 'collision') {
            showToast(formatEntityRenameCollisionMessage(nextEntityName, validation.collision), 'warning');
          } else if (validation.message) {
            showToast(validation.message, 'warning');
          }
          return;
        }
        const retro = validateTimelineRenameChapter(previewEnt, formData.chapter, {
          excludeTimelineEventId: formData.id || null,
        });
        if (!retro.ok) {
          showToast(retro.message || RENAME_CHAPTER_ORDER_BLOCK_MESSAGE, 'warning');
          return;
        }
      }

      updateActiveNovelData((nov) => {
        if (!nov.data?.[activeTabLon]) return;
        const tabData = nov.data[activeTabLon][activeTabNho || 'default'];
        const ent = tabData?.entities?.find((e) => e.id === selectedEntityId);
        if (ent) {
          const entPrevName = safeString(ent.name).trim();
          const renameTarget = nextEntityName;
          const shouldRename = !!(
            renameTarget &&
            entPrevName &&
            !entityNamesEquivalentForRename(entPrevName, renameTarget)
          );
          if (!ent.milestones) ent.milestones = [];
          const milestoneId = formData.id || generateId('ms');
          if (formData.id) {
            const idx = ent.milestones.findIndex((m) => m.id === formData.id);
            if (idx > -1) {
              ent.milestones[idx] = {
                ...ent.milestones[idx],
                chapter: parseInt(formData.chapter, 10),
                title: safeString(formData.title).trim(),
                nextEntityName: safeString(formData.nextEntityName).trim(),
                event: formData.event,
                snapshot,
              };
            }
          } else {
            ent.milestones.push({
              id: milestoneId,
              chapter: parseInt(formData.chapter, 10),
              title: safeString(formData.title).trim(),
              nextEntityName: safeString(formData.nextEntityName).trim(),
              event: formData.event,
              snapshot,
            });
          }
          ent.milestones.sort((a, b) => a.chapter - b.chapter);
          if (shouldRename) {
            const renameResult = applyEntityRename(ent, {
              newName: renameTarget,
              timelineEventId: formData.id || milestoneId,
              chapter: parseInt(formData.chapter, 10),
              reason: 'timeline',
              aliasAccess: buildEntityAliasAccess(),
            });
            if (renameResult.renamed) {
              timelineNameUpdated = true;
              const side = syncRenameSideEffects(nov, ent, renameResult.oldName, renameResult.newName);
              ownerMilestoneRenameSynced = side.ownerMilestoneRenameSynced;
              mapHierarchyRenameSynced = side.mapHierarchyRenameSynced;
            }
          }
        }
      });
      showToast(
        formData.id ? 'Đã tu bổ Kỷ Nguyên!' : 'Đã khắc ghi Kỷ Nguyên mới!',
        'success',
        prev
          ? {
              undoLabel: 'Hoàn tác',
              onUndo: () => {
                markAllShardsDirty(prev?.data);
                setActiveNovelData(structuredClone(prev));
                void (syncNovelRef.current && syncNovelRef.current(prev, dirHandleRef.current));
              },
            }
          : null
      );
      if (timelineNameUpdated) {
        showToast(
          'Đã đổi tên thẻ theo mốc timeline. Tên cũ được giữ làm tên gọi khác; [[tên cũ]] trong ghi chú không bị đổi.',
          'success'
        );
      }
      if (ownerMilestoneRenameSynced > 0) {
        showToast(
          `Đã đồng bộ ${ownerMilestoneRenameSynced} mốc auto theo tên mới của thẻ.`,
          'success'
        );
      }
      if (mapHierarchyRenameSynced > 0) {
        showToast(`Đã cập nhật ${mapHierarchyRenameSynced} thẻ Bản đồ theo tên mới.`, 'success');
      }
    },
    [
      activeNovelData,
      updateActiveNovelData,
      activeTabLon,
      activeTabNho,
      selectedEntityId,
      buildEntityAliasAccess,
      syncRenameSideEffects,
      showToast,
      setActiveNovelData,
      syncNovelRef,
      dirHandleRef,
    ]
  );

  const handleDeleteMilestone = useCallback(
    (msId) => {
      const previewTab = activeNovelData?.data?.[activeTabLon]?.[activeTabNho || 'default'];
      const previewEnt = previewTab?.entities?.find((e) => e.id === selectedEntityId);
      const targetMs = (previewEnt?.milestones || []).find((m) => m.id === msId);
      if (previewEnt && targetMs && milestoneHasAppliedRename(previewEnt, targetMs)) {
        showToast(MILESTONE_RENAME_LOCKED_MESSAGE, 'warning');
        return;
      }
      setConfirmDialog({
        isOpen: true,
        title: 'Xóa Kỷ Nguyên',
        message: 'Xóa mốc thời gian này? Có thể hoàn tác ngay sau khi xóa.',
        onConfirm: () => {
          const prev = activeNovelData ? structuredClone(activeNovelData) : null;
          const prevMilestoneId = selectedMilestoneId;
          updateActiveNovelData((nov) => {
            if (!nov.data?.[activeTabLon]) return;
            const tabData = nov.data[activeTabLon][activeTabNho || 'default'];
            const ent = tabData?.entities?.find((e) => e.id === selectedEntityId);
            if (ent && ent.milestones) ent.milestones = ent.milestones.filter((m) => m.id !== msId);
          });
          setSelectedMilestoneId(null);
          if (prev) {
            showToast('Đã xóa mốc.', 'success', {
              undoLabel: 'Hoàn tác xóa',
              onUndo: () => {
                markAllShardsDirty(prev?.data);
                setActiveNovelData(structuredClone(prev));
                setSelectedMilestoneId(prevMilestoneId || null);
                void (syncNovelRef.current && syncNovelRef.current(prev, dirHandleRef.current));
              },
            });
          }
        },
      });
    },
    [
      setConfirmDialog,
      activeNovelData,
      selectedMilestoneId,
      updateActiveNovelData,
      activeTabLon,
      activeTabNho,
      selectedEntityId,
      setSelectedMilestoneId,
      showToast,
      setActiveNovelData,
      syncNovelRef,
      dirHandleRef,
    ]
  );

  const handleSaveDescription = useCallback(
    (formData) => {
      if (!selectedEntityId) {
        showToast?.('Hãy chọn một thẻ trước khi ghi miêu tả.', 'warning');
        return;
      }
      const prev = activeNovelData ? structuredClone(activeNovelData) : null;
      let savedId = formData?.id || null;
      updateActiveNovelData((nov) => {
        if (!nov.data?.[activeTabLon]) return;
        const tabData = nov.data[activeTabLon][activeTabNho || 'default'];
        const ent = tabData?.entities?.find((e) => e.id === selectedEntityId);
        if (!ent) return;
        if (!Array.isArray(ent.descriptions)) ent.descriptions = [];
        const chapterNum = parseInt(formData.chapter, 10) || 0;
        const content = safeString(formData.content).trim();
        if (formData.id) {
          const idx = ent.descriptions.findIndex((d) => d.id === formData.id);
          if (idx > -1) {
            ent.descriptions[idx] = {
              ...ent.descriptions[idx],
              chapter: chapterNum,
              content,
            };
          }
        } else {
          const newId = generateId('desc');
          ent.descriptions.push({ id: newId, chapter: chapterNum, content });
          savedId = newId;
        }
        ent.descriptions.sort((a, b) => (a.chapter || 0) - (b.chapter || 0));
      });
      if (savedId && setSelectedDescriptionId) setSelectedDescriptionId(savedId);
      showToast(
        formData.id ? 'Đã tu bổ Miêu Tả!' : 'Đã khắc ghi Miêu Tả mới!',
        'success',
        prev
          ? {
              undoLabel: 'Hoàn tác',
              onUndo: () => {
                markAllShardsDirty(prev?.data);
                setActiveNovelData(structuredClone(prev));
                void (syncNovelRef.current && syncNovelRef.current(prev, dirHandleRef.current));
              },
            }
          : null
      );
    },
    [
      activeNovelData,
      updateActiveNovelData,
      activeTabLon,
      activeTabNho,
      selectedEntityId,
      setSelectedDescriptionId,
      showToast,
      setActiveNovelData,
      syncNovelRef,
      dirHandleRef,
    ]
  );

  const handleDeleteDescription = useCallback(
    (descId) => {
      setConfirmDialog({
        isOpen: true,
        title: 'Xóa Miêu Tả',
        message: 'Xóa miêu tả này? Có thể hoàn tác ngay sau khi xóa.',
        onConfirm: () => {
          const prev = activeNovelData ? structuredClone(activeNovelData) : null;
          const prevDescId = selectedDescriptionId;
          updateActiveNovelData((nov) => {
            if (!nov.data?.[activeTabLon]) return;
            const tabData = nov.data[activeTabLon][activeTabNho || 'default'];
            const ent = tabData?.entities?.find((e) => e.id === selectedEntityId);
            if (ent && Array.isArray(ent.descriptions)) {
              ent.descriptions = ent.descriptions.filter((d) => d.id !== descId);
            }
          });
          setSelectedDescriptionId?.(null);
          if (prev) {
            showToast('Đã xóa miêu tả.', 'success', {
              undoLabel: 'Hoàn tác xóa',
              onUndo: () => {
                markAllShardsDirty(prev?.data);
                setActiveNovelData(structuredClone(prev));
                setSelectedDescriptionId?.(prevDescId || null);
                void (syncNovelRef.current && syncNovelRef.current(prev, dirHandleRef.current));
              },
            });
          }
        },
      });
    },
    [
      setConfirmDialog,
      activeNovelData,
      selectedDescriptionId,
      updateActiveNovelData,
      activeTabLon,
      activeTabNho,
      selectedEntityId,
      setSelectedDescriptionId,
      showToast,
      setActiveNovelData,
      syncNovelRef,
      dirHandleRef,
    ]
  );

  const handleReplaceMilestones = useCallback(
    (nextMilestones, toastMessage = 'Đã cập nhật mốc.') => {
      const prev = activeNovelData ? structuredClone(activeNovelData) : null;
      const nextArr = Array.isArray(nextMilestones) ? nextMilestones : [];

      updateActiveNovelData((nov) => {
        if (!nov.data?.[activeTabLon]) return;
        const tabData = nov.data[activeTabLon][activeTabNho || 'default'];
        const ent = tabData?.entities?.find((e) => e.id === selectedEntityId);
        if (!ent) return;
        ent.milestones = nextArr;
      });

      if (selectedMilestoneId && !nextArr.some((m) => m?.id === selectedMilestoneId)) {
        setSelectedMilestoneId(null);
      }

      if (toastMessage && typeof showToast === 'function') {
        showToast(
          toastMessage,
          'success',
          prev
            ? {
                undoLabel: 'Hoàn tác',
                onUndo: () => {
                  markAllShardsDirty(prev?.data);
                  setActiveNovelData(structuredClone(prev));
                  void (syncNovelRef.current && syncNovelRef.current(prev, dirHandleRef.current));
                },
              }
            : null
        );
      }
    },
    [
      activeNovelData,
      updateActiveNovelData,
      activeTabLon,
      activeTabNho,
      selectedEntityId,
      selectedMilestoneId,
      setSelectedMilestoneId,
      showToast,
      setActiveNovelData,
      syncNovelRef,
      dirHandleRef,
    ]
  );

  const handleDeleteEntity = useCallback(
    (id) => {
      const entityIdToDelete = id;
      const prevSelectedId = selectedEntityId;
      confirmDeleteEntityRef.current = () => {
        const data = activeNovelDataRef.current;
        if (!data?.data) return;
        const prev = structuredClone(data);
        const updated = structuredClone(data);
        let removed = false;
        let removedEntityName = '';
        let removedWasListCard = false;
        let removedLonId = '';
        let removedNhoId = '';
        for (const lonId of Object.keys(updated.data || {})) {
          const lonData = updated.data[lonId];
          if (!lonData || typeof lonData !== 'object') continue;
          for (const nhoId of Object.keys(lonData)) {
            const tabData = lonData[nhoId];
            if (!tabData?.entities) continue;
            const idx = tabData.entities.findIndex((e) => e.id === entityIdToDelete);
            if (idx >= 0) {
              removedEntityName = safeString(tabData.entities[idx]?.name).trim();
              removedWasListCard = isListCardEntity(tabData.entities[idx]);
              detachMapChildrenOnDelete(tabData.entities, entityIdToDelete);
              tabData.entities.splice(idx, 1);
              removedLonId = lonId;
              removedNhoId = nhoId;
              removed = true;
              break;
            }
          }
          if (removed) break;
        }
        let forceMapWarning = '';
        if (removed) {
          let removedAutoMsCount = 0;
          let forceMapResynced = false;
          forceMapWarning = '';
          let relationAutoResynced = false;
          let mainCharacterRelationResynced = false;
          let cultivationRelationResynced = false;
          let mapHierarchyResynced = false;
          let autoLevel2DisabledByListCardDelete = false;
          if (removedEntityName) {
            removedAutoMsCount = removeOwnerAcquisitionMilestonesByItem(updated, {
              name: removedEntityName,
              entityId: entityIdToDelete,
            });
          }
          const removedLonConfig = (updated.tabsConfig || []).find((tab) => tab.id === removedLonId);
          const removedNhoConfig = removedLonConfig?.subTabs?.find((tab) => tab.id === removedNhoId) || null;
          if (removedWasListCard && removedNhoConfig) {
            const levelCfg = normalizeTabAutoSyncLevelConfig(removedNhoConfig.autoSyncLevelConfig);
            if (levelCfg.levels.level_2_list !== false) {
              removedNhoConfig.autoSyncLevelConfig = {
                ...levelCfg,
                levels: {
                  ...levelCfg.levels,
                  level_2_list: false,
                },
              };
              autoLevel2DisabledByListCardDelete = true;
            }
          }
          if (
            isForceCollectionScope({
              activeTabLon: removedLonId,
              activeTabNho: removedNhoId,
              currentTabConfig: removedNhoConfig,
              parentLabel: removedLonConfig?.label || '',
            })
          ) {
            const forceSyncResult = syncAllTheLucMapAutoBlocksDetailed(updated, {
              sourceLonId: removedLonId,
            });
            forceMapResynced = forceSyncResult.changed || forceMapResynced;
            forceMapWarning =
              summarizeTheLucMapSyncWarnings(forceSyncResult.warnings) || forceMapWarning;
          }
          // Xóa thẻ có thể tạo liên kết ma ở các block AUTO nằm ngoài tab nguồn
          // (đặc biệt thẻ Danh Sách tổng hợp), nên luôn resync toàn cục sau khi xóa.
          relationAutoResynced = syncAllAutoRelationNotesForNovel(updated) || relationAutoResynced;
          cultivationRelationResynced =
            syncAllCultivationRelationBlocks(updated) || cultivationRelationResynced;
          mainCharacterRelationResynced =
            syncAllMainCharacterRelationBlocks(updated) || mainCharacterRelationResynced;
          mapHierarchyResynced = syncAllMapHierarchyAutoBlocks(updated) || mapHierarchyResynced;
          const listCardSyncResult = syncAllCollectionListCardsDetailed(updated);
          if (listCardSyncResult.recreatedCount > 0) {
            const firstTab = listCardSyncResult.recreatedTabs[0] || {};
            const firstPath = [safeString(firstTab.lonLabel).trim(), safeString(firstTab.nhoLabel).trim()]
              .filter(Boolean)
              .join(' > ');
            const remainingCount = Math.max(0, listCardSyncResult.recreatedCount - 1);
            const tabHint = firstPath
              ? ` (${firstPath}${remainingCount > 0 ? ` +${remainingCount} tab khác` : ''})`
              : '';
            showToast(
              `Đã tự tạo lại ${listCardSyncResult.recreatedCount} thẻ Danh Sách${tabHint} để AUTO bậc 2 tiếp tục hoạt động.`,
              'success'
            );
          }
          const nextStats = { ...novelStatsByIdRef.current, [updated.id]: countEntitiesInNovel(updated) };
          novelStatsByIdRef.current = nextStats;
          setNovelStatsById(nextStats);
          markAllShardsDirty(updated?.data);
          setActiveNovelData(updated);
          syncNovelRef.current?.(updated, dirHandleRef.current);
          if (prevSelectedId === entityIdToDelete) setSelectedEntityId(null);
          const deleteMsg =
            removedAutoMsCount > 0
              ? `Đã xóa thẻ và dọn ${removedAutoMsCount} mốc auto liên quan.`
              : 'Đã xóa thẻ.';
          showToast(deleteMsg, 'success', {
            undoLabel: 'Hoàn tác xóa',
            onUndo: () => {
              markAllShardsDirty(prev?.data);
              setActiveNovelData(prev);
              if (prevSelectedId) setSelectedEntityId(prevSelectedId);
              void (syncNovelRef.current && syncNovelRef.current(prev, dirHandleRef.current));
            },
          });
          if (forceMapResynced) {
            showToast('Đã đồng bộ lại AUTO Thế Lực ↔ Bản đồ sau khi xóa thẻ.', 'success');
          }
          if (relationAutoResynced) {
            showToast('Đã dọn và đồng bộ lại liên kết AUTO trên các thẻ liên quan.', 'success');
          }
          if (mainCharacterRelationResynced) {
            showToast('Đã đồng bộ lại quan hệ Nhân Vật Chính ↔ các tab nhân vật liên quan.', 'success');
          }
          if (cultivationRelationResynced) {
            showToast('Đã đồng bộ lại liên kết Hệ Thống Tu Luyện ↔ Cảnh Giới Tu Vi (AUTO).', 'success');
          }
          if (mapHierarchyResynced) {
            showToast('Đã đồng bộ lại AUTO cây Bản đồ sau khi xóa thẻ.', 'success');
          }
          if (autoLevel2DisabledByListCardDelete) {
            showToast('Đã tắt AUTO bậc 2 cho tab này vì bạn đã xóa thẻ Danh Sách.', 'success');
          }
        }
        if (removed && forceMapWarning) {
          showToast(forceMapWarning, 'warning');
        }
        confirmDeleteEntityRef.current = null;
      };
      setConfirmDialog({
        isOpen: true,
        title: 'Hủy Diệt Thực Thể',
        message: 'Xóa vĩnh viễn hồ sơ này khỏi Tàng Thư Các?',
        onConfirm: () => {
          if (typeof confirmDeleteEntityRef.current === 'function') {
            confirmDeleteEntityRef.current();
          }
        },
      });
    },
    [
      selectedEntityId,
      confirmDeleteEntityRef,
      activeNovelDataRef,
      novelStatsByIdRef,
      setNovelStatsById,
      setActiveNovelData,
      syncNovelRef,
      dirHandleRef,
      setSelectedEntityId,
      showToast,
      setConfirmDialog,
    ]
  );

  const runSnapshotProfileSideEffects = useCallback(
    (nov, ent, snapshot, mergedKeys) => {
      const keys = mergedKeys || new Set();
      if (snapshot?.dynamicData) {
        Object.entries(snapshot.dynamicData).forEach(([key, val]) => {
          if (val && val.toString().trim()) keys.add(key);
        });
      }
      if (snapshot?.avatar) keys.add('avatar');
      if (hasCurrentAutoFieldChange(keys, ['status'], ['f_status'])) {
        ent.status = getStatusLineForCurrentTab(ent);
      }
      let relationAutoResynced = false;
      let mainCharacterRelationResynced = false;
      let cultivationRelationAutoResynced = false;
      let forceMapAutoApplied = false;
      let forceMapAutoWarning = '';
      let mapHierarchyAutoApplied = false;
      if (
        isAutoRelationScopeLonId(
          activeTabLon,
          currentTabConfig?._parentLabel || '',
          currentTabConfig,
          activeTabNho || 'default'
        ) &&
        hasCurrentAutoFieldChange(keys, ['status'], ['f_status'])
      ) {
        relationAutoResynced = syncAllAutoRelationNotesForNovel(nov) || relationAutoResynced;
      }
      if (
        isCultivationRelationScope({ activeTabLon, activeTabNho, currentTabConfig }) &&
        hasCurrentAutoFieldChange(keys, ['status', 'alias'], ['f_status', 'f_alias'])
      ) {
        cultivationRelationAutoResynced =
          syncAllCultivationRelationBlocks(nov) || cultivationRelationAutoResynced;
      }
      if (
        isForceCollectionScope({
          activeTabLon,
          activeTabNho,
          currentTabConfig,
          parentLabel: currentTabConfig?._parentLabel || '',
        }) &&
        hasCurrentAutoFieldChange(keys, ['status', 'location'], ['f_status', 'f_dia_ban', 'f_vi_tri'])
      ) {
        const forceSyncResult = syncTheLucMapAutoBlocksDetailed(nov, {
          sourceLonId: activeTabLon,
          sourceNhoId: activeTabNho || 'default',
          entityId: selectedEntityId,
        });
        forceMapAutoApplied = forceSyncResult.changed || forceMapAutoApplied;
        forceMapAutoWarning = summarizeTheLucMapSyncWarnings(forceSyncResult.warnings) || forceMapAutoWarning;
      }
      if (
        isMainCharacterRelationScope({
          activeTabLon,
          activeTabNho,
          currentTabConfig,
          parentLabel: currentTabConfig?._parentLabel || '',
        }) &&
        hasCurrentAutoFieldChange(keys, ['relation'], ['f_quan_he'])
      ) {
        mainCharacterRelationResynced =
          syncAllMainCharacterRelationBlocks(nov) || mainCharacterRelationResynced;
      }
      if (
        isMapCollectionScope({ activeTabLon, activeTabNho, currentTabConfig }) &&
        hasCurrentAutoFieldChange(keys, ['title', 'status', 'parent_path'], ['f_title', 'f_status', 'f_vi_tri'])
      ) {
        mapHierarchyAutoApplied = syncAllMapHierarchyAutoBlocks(nov) || mapHierarchyAutoApplied;
      }
      syncAllCollectionListCards(nov);
      return {
        mergedKeys: keys,
        relationAutoResynced,
        mainCharacterRelationResynced,
        cultivationRelationAutoResynced,
        forceMapAutoApplied,
        forceMapAutoWarning,
        mapHierarchyAutoApplied,
      };
    },
    [
      activeTabLon,
      activeTabNho,
      currentTabConfig,
      selectedEntityId,
      getStatusLineForCurrentTab,
      hasCurrentAutoFieldChange,
    ]
  );

  const handlePromoteMilestoneToBaseline = useCallback(
    (milestoneId, onDone) => {
      const targetId = safeString(milestoneId).trim();
      if (!targetId || !selectedEntityId) return;
      const targetMs = (selectedEntity?.milestones || []).find((ms) => safeString(ms?.id) === targetId);
      if (!targetMs) {
        showToast('Không tìm thấy mốc timeline.', 'warning');
        return;
      }
      const chapterLabel = safeString(targetMs.chapter).trim() || '?';
      const titleLabel = safeString(targetMs.title).trim() || `Chương ${chapterLabel}`;
      const isRefreshBaseline = readProfileBaselineMilestoneId(selectedEntity) === targetId;
      const firstArchiveNote =
        !hasBaselineArchiveAtChapterZero(selectedEntity?.milestones) &&
        safeString(selectedEntity?.info).trim()
          ? ' Lần đầu: ghi chép Ban đầu hiện tại sẽ lưu thêm mốc <b>chương 0</b> trên Timeline.'
          : '';
      setConfirmDialog({
        isOpen: true,
        title: isRefreshBaseline ? 'Cập nhật Ghi chép Ban đầu từ mốc' : 'Đặt mốc làm Ghi chép Ban đầu',
        message:
          (isRefreshBaseline
            ? `Đồng bộ lại tab <b>Hồ sơ → Ban đầu</b> từ mốc <b>${titleLabel}</b> (ch. ${chapterLabel}). `
            : `Nội dung mốc <b>${titleLabel}</b> (ch. ${chapterLabel}) sẽ <b>ghi đè</b> Ghi chép Ban đầu; ` +
              `mốc timeline <b>giữ nguyên</b>. Form/ảnh từ snapshot mốc được áp dụng.`) +
          firstArchiveNote +
          ` Sau đó mở tab <b>Hồ sơ → Ban đầu</b>.`,
        onConfirm: () => {
          const prev = activeNovelData ? structuredClone(activeNovelData) : null;
          let promoteResult = { changed: false };
          let sideEffects = null;
          updateActiveNovelData((nov) => {
            const tabData = nov.data[activeTabLon]?.[activeTabNho || 'default'];
            const ent = tabData?.entities?.find((e) => e.id === selectedEntityId);
            if (!ent) return;
            promoteResult = promoteMilestoneToBaseline(ent, targetId, { generateId });
            if (!promoteResult.changed) return;
            sideEffects = runSnapshotProfileSideEffects(nov, ent, targetMs.snapshot, new Set());
          });
          if (!promoteResult.changed) {
            const reason = promoteResult.reason || 'unknown';
            if (reason === 'empty_milestone_body') {
              showToast('Mốc chưa có nội dung sự kiện — hãy ghi chép trong mốc trước.', 'warning');
            } else {
              showToast('Không đặt được mốc làm Ban đầu.', 'warning');
            }
            return;
          }
          if (sideEffects?.mergedKeys) {
            setRecentlyMergedFields(sideEffects.mergedKeys);
            setTimeout(() => setRecentlyMergedFields(new Set()), 15000);
          }
          setCollectionSubTab('detail');
          showToast(
            promoteResult.createdCh0Archive
              ? `Đã đặt mốc ch. ${promoteResult.promotedChapter ?? chapterLabel} làm Ghi chép Ban đầu. Bản nền cũ đã lưu mốc chương 0.`
              : `Đã đặt mốc ch. ${promoteResult.promotedChapter ?? chapterLabel} làm Ghi chép Ban đầu (mốc timeline không đổi).`,
            'success',
            prev
              ? {
                  undoLabel: 'Hoàn tác',
                  onUndo: () => {
                    setRecentlyMergedFields(new Set());
                    markAllShardsDirty(prev?.data);
                    setActiveNovelData(structuredClone(prev));
                    void (syncNovelRef.current && syncNovelRef.current(prev, dirHandleRef.current));
                  },
                }
              : undefined
          );
          if (sideEffects?.mapHierarchyAutoApplied) {
            showToast('Đã đồng bộ cây Bản đồ (AUTO).', 'success');
          }
          if (sideEffects?.relationAutoResynced) {
            showToast('Đã đồng bộ lại liên kết AUTO trên các thẻ liên quan.', 'success');
          }
          if (sideEffects?.mainCharacterRelationResynced) {
            showToast('Đã đồng bộ quan hệ Nhân Vật Chính ↔ các tab nhân vật liên quan (AUTO).', 'success');
          }
          if (sideEffects?.cultivationRelationAutoResynced) {
            showToast('Đã đồng bộ lại liên kết Hệ Thống Tu Luyện ↔ Cảnh Giới Tu Vi (AUTO).', 'success');
          }
          if (typeof onDone === 'function') onDone();
        },
      });
    },
    [
      selectedEntity,
      selectedEntityId,
      activeNovelData,
      setConfirmDialog,
      showToast,
      updateActiveNovelData,
      activeTabLon,
      activeTabNho,
      runSnapshotProfileSideEffects,
      setRecentlyMergedFields,
      setCollectionSubTab,
      setActiveNovelData,
      syncNovelRef,
      dirHandleRef,
    ]
  );

  const handleMergeSnapshotToProfile = useCallback(
    (snapshot) => {
      if (!snapshot?.dynamicData && !snapshot?.avatar) {
        showToast('Mốc này chưa có snapshot để áp dụng!', 'warning');
        return;
      }
      setConfirmDialog({
        isOpen: true,
        title: 'Áp Dụng Vào Hồ Sơ',
        message:
          'Merge thông tin từ mốc này vào Nền Tảng Căn Cơ? Chỉ các trường <b>có giá trị</b> trong snapshot mới được cập nhật, các trường còn lại giữ nguyên.',
        onConfirm: () => {
          const prev = activeNovelData ? structuredClone(activeNovelData) : null;
          // Tính mergedKeys trước khi updateActiveNovelData để tránh stale closure.
          const mergedKeys = new Set();
          let sideEffects = null;
          updateActiveNovelData((nov) => {
            const tabData = nov.data[activeTabLon]?.[activeTabNho || 'default'];
            const ent = tabData?.entities?.find((e) => e.id === selectedEntityId);
            if (!ent) return;
            if (!ent.dynamicData) ent.dynamicData = {};
            if (snapshot.dynamicData) {
              Object.entries(snapshot.dynamicData).forEach(([key, val]) => {
                if (val && val.toString().trim()) ent.dynamicData[key] = val;
              });
            }
            if (snapshot.avatar) ent.avatar = snapshot.avatar;
            sideEffects = runSnapshotProfileSideEffects(nov, ent, snapshot, mergedKeys);
          });

          setRecentlyMergedFields(sideEffects?.mergedKeys || mergedKeys);
          setCollectionSubTab('detail');
          setTimeout(() => setRecentlyMergedFields(new Set()), 15000);
          showToast('Đã áp dụng snapshot vào Hồ Sơ.', 'success', {
            onUndo: prev
              ? () => {
                  setRecentlyMergedFields(new Set());
                  markAllShardsDirty(prev?.data);
                  setActiveNovelData(structuredClone(prev));
                  void (syncNovelRef.current && syncNovelRef.current(prev, dirHandleRef.current));
                }
              : undefined,
          });
          if (sideEffects?.mapHierarchyAutoApplied) {
            showToast('Đã đồng bộ cây Bản đồ (AUTO).', 'success');
          }
          if (sideEffects?.relationAutoResynced) {
            showToast('Đã đồng bộ lại liên kết AUTO trên các thẻ liên quan.', 'success');
          }
          if (sideEffects?.mainCharacterRelationResynced) {
            showToast('Đã đồng bộ quan hệ Nhân Vật Chính ↔ các tab nhân vật liên quan (AUTO).', 'success');
          }
          if (sideEffects?.cultivationRelationAutoResynced) {
            showToast('Đã đồng bộ lại liên kết Hệ Thống Tu Luyện ↔ Cảnh Giới Tu Vi (AUTO).', 'success');
          }
        },
      });
    },
    [
      showToast,
      setConfirmDialog,
      activeNovelData,
      updateActiveNovelData,
      activeTabLon,
      activeTabNho,
      selectedEntityId,
      runSnapshotProfileSideEffects,
      setRecentlyMergedFields,
      setCollectionSubTab,
      setActiveNovelData,
      syncNovelRef,
      dirHandleRef,
    ]
  );

  return {
    handleOpenCreateEntity,
    handleOpenEditEntity,
    handleSaveEntity,
    handleSetSelectedEntityAutoSyncState,
    handleAddImageToSelectedEntity,
    handleRemoveImageFromSelectedEntity,
    handleUpdateEntityInfo,
    handleSaveMilestone,
    handleDeleteMilestone,
    handleReplaceMilestones,
    handleSaveDescription,
    handleDeleteDescription,
    handleDeleteEntity,
    handleMergeSnapshotToProfile,
    handlePromoteMilestoneToBaseline,
  };
}
