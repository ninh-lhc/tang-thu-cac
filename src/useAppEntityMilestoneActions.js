// Gom handler Entity + Milestone khỏi App.jsx để giảm độ phình trục app.
// Hook này giữ nguyên logic mutate/undo và cảnh báo dữ liệu như phiên bản cũ.
// App.jsx truyền toàn bộ state/ref/setter cần thiết, hook không giữ source state riêng.
// Mục tiêu: tách gọn code mà không đổi hành vi runtime.
import { useCallback, useMemo } from 'react';
import { lockFieldsTemplateIfFirstEntity } from './MasterEngines.js';
import { generateId, safeString } from './MasterUtils.jsx';
import { countEntitiesInNovel } from './deepSearchCore.js';
import { findEquivalentEntityByName, mergeAliasText } from './lib/entityNameIdentity.js';
import { applyAutoRelationNotesForEntity } from './lib/autoRelationDetailNote.js';
import { buildScopedEntityImageStemParts } from './lib/imageFilename.js';
import {
  appendOwnerAcquisitionMilestone,
  parseOwnerTimelineHintDetailed,
  ownerTimelineHintReasonToMessage,
  removeOwnerAcquisitionMilestonesByItem,
  syncAutoOwnerMilestonesItemRename,
} from './lib/autoOwnerMilestone.js';
import { syncAllTheLucMapAutoBlocks, syncTheLucMapAutoBlocks } from './lib/theLucBanDoSync.js';

export function useAppEntityMilestoneActions({
  activeNovelData,
  activeNovelDataRef,
  activeTabLon,
  activeTabNho,
  currentTabConfig,
  selectedEntity,
  selectedEntityId,
  selectedMilestoneId,
  updateActiveNovelData,
  handlePickLocalImage,
  setActiveNovelData,
  setSelectedEntityId,
  setSelectedMilestoneId,
  setEditingMilestoneData,
  setCollectionSubTab,
  setIsEditingMode,
  setIsEntityEditing,
  setConfirmDialog,
  setRecentlyMergedFields,
  setEditingEntityData,
  setIsEntityModalOpen,
  showToast,
  syncNovelRef,
  dirHandleRef,
  novelStatsByIdRef,
  setNovelStatsById,
  confirmDeleteEntityRef,
}) {
  const handleOpenCreateEntity = useCallback(() => {
    setEditingEntityData(null);
    setIsEntityModalOpen(true);
  }, [setEditingEntityData, setIsEntityModalOpen]);

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

  const handleSaveEntity = useCallback(
    (formData, dynamicData, opts = null) => {
      const copyRawToInfo = Boolean(opts && opts.copyRawToInfo);
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
      let ownerMilestoneRenameSynced = 0;
      let forceMapAutoApplied = false;

      updateActiveNovelData((nov) => {
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
            const prevName = safeString(tabData.entities[idx].name).trim();
            const prevImages = Array.isArray(tabData.entities[idx].images)
              ? tabData.entities[idx].images
              : [];
            const prevDyn = tabData.entities[idx].dynamicData || {};
            const mergedDyn = { ...prevDyn, ...dynamicData };
            const statusLine = safeString(mergedDyn.f_status).trim();
            tabData.entities[idx] = {
              ...tabData.entities[idx],
              name: formData.name,
              avatar: formData.avatar,
              rawText: formData.rawText,
              status: statusLine,
              dynamicData: mergedDyn,
              images: prevImages,
            };
            applyAutoRelationNotesForEntity(nov, {
              sourceEntity: tabData.entities[idx],
              sourceLonId: activeTabLon,
              sourceParentLabel: currentTabConfig?._parentLabel || '',
              statusLine,
            });
            const nextName = safeString(formData.name).trim();
            if (activeTabLon !== 'nhan-vat' && prevName && nextName && prevName !== nextName) {
              ownerMilestoneRenameSynced = syncAutoOwnerMilestonesItemRename(nov, {
                entityId: formData.id,
                oldName: prevName,
                newName: nextName,
              });
            }
          }
        } else {
          const mergedNew = { ...dynamicData };
          const statusLine = safeString(mergedNew.f_status).trim();
          const canonicalName = safeString(formData.name).trim();
          const matched = findEquivalentEntityByName(tabData.entities, canonicalName, {
            allowExactNameMatch: false,
          });
          if (matched?.entity) {
            createTargetEntityId = matched.entity.id;
            createMergedToExisting = true;
            const prevAlias = safeString(matched.entity.dynamicData?.f_alias);
            const mergedAlias = mergeAliasText(prevAlias, canonicalName);
            if (mergedAlias !== prevAlias) {
              if (!matched.entity.dynamicData) matched.entity.dynamicData = {};
              matched.entity.dynamicData.f_alias = mergedAlias;
            }
            applyAutoRelationNotesForEntity(nov, {
              sourceEntity: matched.entity,
              sourceLonId: activeTabLon,
              sourceParentLabel: currentTabConfig?._parentLabel || '',
              statusLine,
            });
          } else {
            const baseInfo = copyRawToInfo ? formData.rawText : '';
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
              sourceParentLabel: currentTabConfig?._parentLabel || '',
              statusLine,
            });
            createTargetEntityId = newEntityId;
            lockFieldsTemplateIfFirstEntity(nov, activeTabLon, activeTabNho || 'default');
            if (activeTabLon !== 'nhan-vat' && ownerTimelineHint) {
              ownerMilestoneAutoApplied = appendOwnerAcquisitionMilestone(nov, ownerTimelineHint, {
                name: canonicalName,
                entityId: newEntityId,
              });
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
        if (activeTabLon === 'the-luc' && targetIdForSync) {
          forceMapAutoApplied =
            syncTheLucMapAutoBlocks(nov, {
              sourceLonId: activeTabLon,
              sourceNhoId: activeTabNho || 'default',
              entityId: targetIdForSync,
            }) || forceMapAutoApplied;
        }
      });

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
      const ownerWarn = ownerTimelineHintReasonToMessage(ownerTimelineHintDetail?.reason);
      if (!ownerMilestoneAutoApplied && ownerWarn && activeTabLon !== 'nhan-vat') {
        showToast(ownerWarn, 'warning');
      }
    },
    [
      activeNovelData,
      activeTabLon,
      activeTabNho,
      currentTabConfig,
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
    (content) => {
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

      updateActiveNovelData((nov) => {
        if (!nov.data?.[activeTabLon]) return;
        const tabData = nov.data[activeTabLon][activeTabNho || 'default'];
        const ent = tabData?.entities?.find((e) => e.id === selectedEntityId);
        if (ent) {
          ent.info = content;
          // Network "Mạng Lưới Nhân Quả" đọc [[...]] từ rawText, cần đồng bộ theo info.
          ent.rawText = content;
          if (ownerTimelineHint) {
            ownerMilestoneAutoApplied = appendOwnerAcquisitionMilestone(nov, ownerTimelineHint, {
              name: ent.name,
              entityId: ent.id,
            });
          }
        }
      });

      showToast(
        ownerMilestoneAutoApplied
          ? 'Ghi chép hồ sơ thành công! Đã tự ghi mốc sở hữu vào timeline Nhân Vật.'
          : 'Ghi chép hồ sơ thành công!'
      );
      const ownerWarn = ownerTimelineHintReasonToMessage(ownerTimelineHintDetail?.reason);
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
      updateActiveNovelData((nov) => {
        if (!nov.data?.[activeTabLon]) return;
        const tabData = nov.data[activeTabLon][activeTabNho || 'default'];
        const ent = tabData?.entities?.find((e) => e.id === selectedEntityId);
        if (ent) {
          if (!ent.milestones) ent.milestones = [];
          if (formData.id) {
            const idx = ent.milestones.findIndex((m) => m.id === formData.id);
            if (idx > -1) {
              ent.milestones[idx] = {
                ...ent.milestones[idx],
                chapter: parseInt(formData.chapter, 10),
                event: formData.event,
                snapshot,
              };
            }
          } else {
            ent.milestones.push({
              id: generateId('ms'),
              chapter: parseInt(formData.chapter, 10),
              event: formData.event,
              snapshot,
            });
          }
          ent.milestones.sort((a, b) => a.chapter - b.chapter);
        }
      });
      showToast(
        formData.id ? 'Đã tu bổ Kỷ Nguyên!' : 'Đã khắc ghi Kỷ Nguyên mới!',
        'success',
        prev
          ? {
              undoLabel: 'Hoàn tác',
              onUndo: () => {
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
      showToast,
      setActiveNovelData,
      syncNovelRef,
      dirHandleRef,
    ]
  );

  const handleDeleteMilestone = useCallback(
    (msId) => {
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
        let removedLonId = '';
        for (const lonId of Object.keys(updated.data || {})) {
          const lonData = updated.data[lonId];
          if (!lonData || typeof lonData !== 'object') continue;
          for (const nhoId of Object.keys(lonData)) {
            const tabData = lonData[nhoId];
            if (!tabData?.entities) continue;
            const idx = tabData.entities.findIndex((e) => e.id === entityIdToDelete);
            if (idx >= 0) {
              removedEntityName = safeString(tabData.entities[idx]?.name).trim();
              tabData.entities.splice(idx, 1);
              removedLonId = lonId;
              removed = true;
              break;
            }
          }
          if (removed) break;
        }
        if (removed) {
          let removedAutoMsCount = 0;
          let forceMapResynced = false;
          if (removedEntityName) {
            removedAutoMsCount = removeOwnerAcquisitionMilestonesByItem(updated, {
              name: removedEntityName,
              entityId: entityIdToDelete,
            });
          }
          if (removedLonId === 'the-luc') {
            forceMapResynced =
              syncAllTheLucMapAutoBlocks(updated, { sourceLonId: 'the-luc' }) || forceMapResynced;
          }
          const nextStats = { ...novelStatsByIdRef.current, [updated.id]: countEntitiesInNovel(updated) };
          novelStatsByIdRef.current = nextStats;
          setNovelStatsById(nextStats);
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
              setActiveNovelData(prev);
              if (prevSelectedId) setSelectedEntityId(prevSelectedId);
              void (syncNovelRef.current && syncNovelRef.current(prev, dirHandleRef.current));
            },
          });
          if (forceMapResynced) {
            showToast('Đã đồng bộ lại AUTO Thế Lực ↔ Bản đồ sau khi xóa thẻ.', 'success');
          }
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
          if (snapshot.dynamicData) {
            Object.entries(snapshot.dynamicData).forEach(([key, val]) => {
              if (val && val.toString().trim()) mergedKeys.add(key);
            });
          }
          if (snapshot.avatar) mergedKeys.add('avatar');

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
            if (mergedKeys.has('f_status')) {
              ent.status = safeString(ent.dynamicData.f_status).trim();
            }
          });

          setRecentlyMergedFields(mergedKeys);
          setCollectionSubTab('detail');
          setTimeout(() => setRecentlyMergedFields(new Set()), 15000);
          showToast('Đã áp dụng snapshot vào Hồ Sơ.', 'success', {
            onUndo: prev
              ? () => {
                  setRecentlyMergedFields(new Set());
                  setActiveNovelData(structuredClone(prev));
                  void (syncNovelRef.current && syncNovelRef.current(prev, dirHandleRef.current));
                }
              : undefined,
          });
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
    handleAddImageToSelectedEntity,
    handleRemoveImageFromSelectedEntity,
    handleUpdateEntityInfo,
    handleSaveMilestone,
    handleDeleteMilestone,
    handleReplaceMilestones,
    handleDeleteEntity,
    handleMergeSnapshotToProfile,
  };
}
