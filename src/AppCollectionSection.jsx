// ==========================================
// AppCollectionSection.jsx
// Mục đích: Nội dung chính khi activeTabLon !== 'tong-quan'
//   (standard editor + collection-track view)
// Import bởi: App.jsx
// Lưu ý: `tocRailExpanded` truyền từ App.jsx để lưới nhân quả giãn khi thu mục lục. AdvancedFieldSelect import cùng file.
// Ưu tiên laptop/desktop: header xếp chồng khi hẹp, toolbar Nâng cao + focus bàn phím
// ==========================================

import React from 'react';
import {
  ChevronRight, Plus, Search, Filter, Save, Edit3, Eye,
  User, BookOpen, Download, Settings, Shield, FolderTree,
} from 'lucide-react';
import { safeString, AsyncLocalImage } from './MasterUtils.jsx';
import { FALLBACK_IMG } from './MasterEngines.js';
import { AppCollectionListContent } from './AppCollectionListContent.jsx';
import { AppGalleryContent } from './AppGalleryContent.jsx';
import { AppCollectionTrackTabs } from './AppCollectionTrackTabs.jsx';
import { AppCollectionEmptyState } from './AppCollectionEmptyState.jsx';
import { AppEntitySummaryBlocks } from './AppEntitySummaryBlocks.jsx';
import { AppEntityDetailNotes } from './AppEntityDetailNotes.jsx';
import { AppEntityMembersPanel } from './AppEntityMembersPanel.jsx';
import { AppMapEntityTreePanel } from './AppMapEntityTreePanel.jsx';
import { AppEntityTimelinePanel } from './AppEntityTimelinePanel.jsx';
import { AppEntityDescriptionPanel } from './AppEntityDescriptionPanel.jsx';
import { MarkdownPreviewPane } from './MarkdownPreviewPane.jsx';
import { MarkdownToolbar } from './MasterComponents.jsx';
import { buildTimelineCurrentProfileView, buildTimelineCurrentNotesText } from './appCollectionTimelineProfile.js';
import { buildScopedEntityImageStemParts } from './lib/imageFilename.js';
import { isMapCollectionScope } from './lib/mapHierarchySync.js';
import { isForceCollectionScope } from './lib/theLucBanDoSync.js';
import { splitStatusHierarchyTokens } from './lib/statusHierarchyParser.js';
import { tabHasEntityTreeLinks } from './lib/mapEntityTree.js';

const ENTITY_TREE_ENABLED_PREFIX = 'tt_entity_tree_feature_on';

function readEntityTreeFeatureOn(scopeKey, fallback) {
  if (!scopeKey || typeof localStorage === 'undefined') return fallback;
  try {
    const saved = localStorage.getItem(`${ENTITY_TREE_ENABLED_PREFIX}:${scopeKey}`);
    if (saved === '1') return true;
    if (saved === '0') return false;
  } catch {
    /* best effort */
  }
  return fallback;
}

function writeEntityTreeFeatureOn(scopeKey, value) {
  if (!scopeKey || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(`${ENTITY_TREE_ENABLED_PREFIX}:${scopeKey}`, value ? '1' : '0');
  } catch {
    /* best effort */
  }
}

function getLeafHierarchyLabel(value) {
  const raw = safeString(value)
    .replace(/[>→»|]+/g, ' - ')
    .replace(/[,\n;]+/g, ' - ')
    .trim();
  if (!raw) return '';
  const tokens = splitStatusHierarchyTokens(raw);
  if (tokens.length === 0) return raw;
  return safeString(tokens[tokens.length - 1]).trim();
}

function getMapTraitLabel(statusLine = '') {
  const raw = safeString(statusLine).trim();
  if (!raw) return '';
  const parts = raw.split('·').map((x) => safeString(x).trim()).filter(Boolean);
  return parts.length > 1 ? parts.slice(1).join(' · ') : '';
}

function getMapTypeLabel(statusLine = '') {
  const raw = safeString(statusLine).trim();
  if (!raw) return '';
  const parts = raw.split('·').map((x) => safeString(x).trim()).filter(Boolean);
  return parts[0] || '';
}

function getMapTraitBadgeStyle(label = '') {
  const key = safeString(label).trim().toLowerCase();
  if (!key) return undefined;
  const hash = key.split('').reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7);
  const hue = Math.abs(hash) % 360;
  return {
    backgroundColor: `hsla(${hue}, 82%, 20%, 0.55)`,
    borderColor: `hsla(${hue}, 78%, 52%, 0.65)`,
    color: `hsla(${hue}, 95%, 88%, 1)`,
  };
}

export function AppCollectionSection({
  // nav state
  activeTabLon,
  activeTabNho,
  activeTabCon,
  sortedTabs,
  currentTabConfig,
  handleSelectTabLon,
  handleSelectTabNho,
  // novel data
  activeNovelData,
  currentContextDirHandle,
  tocRailExpanded = true,
  // entity filter/search toolbar
  entityAdvancedRef,
  entitySearch,
  setEntitySearch,
  entitySortMode,
  setEntitySortMode,
  showEntityAdvanced,
  setShowEntityAdvanced,
  isEntityAdvancedActive,
  clearEntityAdvanced,
  entityFilterField,
  setEntityFilterField,
  entityFilterValue,
  setEntityFilterValue,
  entityGroupBy,
  setEntityGroupBy,
  entityFilterFields,
  entityFilterOptions,
  entityGroupOptions,
  entityContextPresets,
  applyEntityPreset,
  AdvancedFieldSelect,
  getTerms,
  handleOpenCreateEntity,
  onOpenAutoSyncGuide,
  onOpenEntityNotesGuide,
  // collection list/gallery
  collectionSubTab,
  setCollectionSubTab,
  entitiesList,
  entityPage,
  setEntityPage,
  pagedEntitiesList,
  groupedEntitiesList,
  groupVisibleCount,
  setGroupVisibleCount,
  entityPageSize,
  handleAddEntityImage,
  handleRemoveEntityImage,
  onEntityCardSelect,
  onEntityCardDelete,
  onEntityCardAddMilestone,
  onEntityCardTogglePin,
  // entity detail
  selectedEntity,
  isEntityEditing,
  setIsEntityEditing,
  recentlyMergedFields,
  entityMap,
  statusTierLabelSet,
  globalLinkRegex,
  relatedEntities,
  isCalculatingNetwork,
  navFnRef,
  handleNavigate,
  handleExportEntityPDF,
  handleOpenEditEntity,
  isExtractingAI,
  setIsExtractingAI,
  geminiApiKeys,
  showToast,
  aiMode,
  isSplitPreview,
  setLivePreviewText,
  setDebouncedMarkdownPreview,
  setIsSplitPreview,
  handleUpdateEntityInfo,
  handleSaveEntityMember,
  handleSaveEntityMemberFieldMeta,
  handleDeleteEntityMember,
  handleMoveMapEntity,
  handleCreateMapChildEntity,
  handleDetachMapEntity,
  mapListBranchMode,
  setMapListBranchMode,
  entityTreeListRootId,
  setEntityTreeListRootId,
  entityTreeListRootName,
  hasEntityTreeLinks,
  collectionEntitiesRaw,
  handleSetSelectedEntityAutoSyncState,
  setImageForm,
  setIsInsertImageModalOpen,
  handlePickLocalImage,
  debouncedMarkdownPreview,
  entityNotesTabFilterBuckets,
  setLightboxSrc,
  selectedMilestoneId,
  setSelectedMilestoneId,
  setEditingMilestoneData,
  setIsMilestoneModalOpen,
  handleMergeSnapshotToProfile,
  handlePromoteMilestoneToBaseline,
  handleDeleteMilestone,
  handleReplaceMilestones,
  selectedDescriptionId,
  setSelectedDescriptionId,
  setEditingDescriptionData,
  setIsDescriptionModalOpen,
  handleDeleteDescription,
  getFieldValue,
  // standard editor
  isEditingMode,
  setIsEditingMode,
  handleSaveStandardEditor,
  currentStandardData,
  memoizedStandardData,
  handleImageDrop,
}) {
  void recentlyMergedFields;
  /** Uncontrolled + ref: tránh React ghi đè DOM khi gõ Telex/IME (controlled value + sync làm vỡ dấu). */
  const collectionSearchInputRef = React.useRef(null);
  const searchDebounceTimerRef = React.useRef(0);
  const collectionSearchScopeKey = React.useMemo(
    () => `${activeNovelData?.id ?? ''}::${activeTabLon ?? ''}::${activeTabNho ?? 'default'}`,
    [activeNovelData?.id, activeTabLon, activeTabNho]
  );

  React.useEffect(() => {
    const el = collectionSearchInputRef.current;
    if (!el) return;
    const next = safeString(entitySearch);
    if (next === '') {
      el.value = '';
      return;
    }
    if (typeof document !== 'undefined' && document.activeElement === el) return;
    if (el.value !== next) el.value = next;
  }, [entitySearch]);

  const scheduleEntitySearchDebounce = React.useCallback(() => {
    window.clearTimeout(searchDebounceTimerRef.current);
    searchDebounceTimerRef.current = window.setTimeout(() => {
      const el = collectionSearchInputRef.current;
      if (!el) return;
      setEntitySearch(safeString(el.value));
    }, 220);
  }, [setEntitySearch]);

  const handleCollectionSearchBlur = React.useCallback(() => {
    window.clearTimeout(searchDebounceTimerRef.current);
    const el = collectionSearchInputRef.current;
    if (el) setEntitySearch(safeString(el.value));
  }, [setEntitySearch]);

  React.useEffect(
    () => () => {
      window.clearTimeout(searchDebounceTimerRef.current);
    },
    []
  );

  const [entityFilterValueDraft, setEntityFilterValueDraft] = React.useState(entityFilterValue || '');
  const [isCollectionSwitching, setIsCollectionSwitching] = React.useState(false);
  const currentTabEntities = React.useMemo(() => {
    if (!activeNovelData || !activeTabLon || !activeTabNho) return [];
    const tabData = activeNovelData.data?.[activeTabLon]?.[activeTabNho || 'default'];
    return Array.isArray(tabData?.entities) ? tabData.entities : [];
  }, [activeNovelData, activeTabLon, activeTabNho]);
  const scopedEntityImageFileStemParts = React.useMemo(() => {
    if (collectionSubTab !== 'detail' || !selectedEntity) return [];
    return buildScopedEntityImageStemParts({
      tabLabel: currentTabConfig?.label,
      entityName: selectedEntity?.name,
      entityId: selectedEntity?.id,
      siblingEntities: currentTabEntities,
    });
  }, [collectionSubTab, currentTabConfig?.label, currentTabEntities, selectedEntity]);
  const standardImageFileStemParts = React.useMemo(() => {
    const parts = [];
    const currentLabel = safeString(currentTabConfig?.label);
    if (currentLabel) parts.push(currentLabel);
    const currentConLabel = safeString(
      currentTabConfig?.tabCon?.find((c) => c.id === activeTabCon)?.label
    );
    if (currentConLabel && currentConLabel !== currentLabel) parts.push(currentConLabel);
    return parts;
  }, [activeTabCon, currentTabConfig]);
  const handlePickScopedStandardLocalImage = React.useCallback(
    (setAvatarCallback, editorId = null) =>
      handlePickLocalImage(setAvatarCallback, editorId, {
        filePrefix: 'tab',
        fileStemParts: standardImageFileStemParts,
      }),
    [handlePickLocalImage, standardImageFileStemParts]
  );
  const [detailProfileMode, setDetailProfileMode] = React.useState('original');
  const [memberNotesEditTargetId, setMemberNotesEditTargetId] = React.useState(null);
  const entityTreeScopeKey = `${activeTabLon || 'lon'}:${activeTabNho || 'default'}`;
  const tabTreeHasLinks = React.useMemo(
    () => Boolean(hasEntityTreeLinks) || tabHasEntityTreeLinks(collectionEntitiesRaw),
    [collectionEntitiesRaw, hasEntityTreeLinks]
  );
  const [entityTreeFeatureOn, setEntityTreeFeatureOn] = React.useState(() =>
    readEntityTreeFeatureOn(entityTreeScopeKey, tabTreeHasLinks)
  );
  React.useEffect(() => {
    setEntityTreeFeatureOn(readEntityTreeFeatureOn(entityTreeScopeKey, tabTreeHasLinks));
  }, [entityTreeScopeKey, tabTreeHasLinks]);
  React.useEffect(() => {
    if (!tabTreeHasLinks) return;
    setEntityTreeFeatureOn((prev) => {
      if (prev) return prev;
      writeEntityTreeFeatureOn(entityTreeScopeKey, true);
      return true;
    });
  }, [entityTreeScopeKey, tabTreeHasLinks]);
  const enableEntityTreeFeature = React.useCallback(() => {
    writeEntityTreeFeatureOn(entityTreeScopeKey, true);
    setEntityTreeFeatureOn(true);
  }, [entityTreeScopeKey]);
  const hideEntityTreeFeature = React.useCallback(() => {
    writeEntityTreeFeatureOn(entityTreeScopeKey, false);
    setEntityTreeFeatureOn(false);
    setMapListBranchMode?.('all');
  }, [entityTreeScopeKey, setMapListBranchMode]);
  const timelineCurrentProfile = React.useMemo(
    () => buildTimelineCurrentProfileView(selectedEntity),
    [selectedEntity]
  );
  const memberNotesEditTarget = React.useMemo(() => {
    const targetId = safeString(memberNotesEditTargetId);
    if (!targetId || !Array.isArray(selectedEntity?.members)) return null;
    return selectedEntity.members.find((member) => safeString(member?.id) === targetId) || null;
  }, [memberNotesEditTargetId, selectedEntity]);
  const restoreParentNotesView = React.useCallback(() => {
    const parentInfo = safeString(selectedEntity?.info);
    setLivePreviewText(parentInfo);
    setDebouncedMarkdownPreview(parentInfo);
    setIsSplitPreview(false);
  }, [selectedEntity?.info, setDebouncedMarkdownPreview, setIsSplitPreview, setLivePreviewText]);
  const handleCancelMemberNotesEdit = React.useCallback(() => {
    setMemberNotesEditTargetId(null);
    restoreParentNotesView();
    setIsEntityEditing(false);
  }, [restoreParentNotesView, setIsEntityEditing]);
  const handleEditMemberNotes = React.useCallback(
    (member) => {
      const memberId = safeString(member?.id);
      if (!memberId) {
        showToast?.('Hãy lưu hồ sơ nhân vật trước khi viết ghi chép chi tiết.', 'warning');
        return;
      }
      setDetailProfileMode('original');
      setMemberNotesEditTargetId(memberId);
      const memberInfo = safeString(member?.info);
      setLivePreviewText(memberInfo);
      setDebouncedMarkdownPreview(memberInfo);
      setIsSplitPreview(false);
      setIsEntityEditing(true);
      requestAnimationFrame(() => {
        document.getElementById('entity-detail-notes-section')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
    },
    [setDebouncedMarkdownPreview, setIsEntityEditing, setIsSplitPreview, setLivePreviewText, showToast]
  );
  const handleSaveMemberNotesEdit = React.useCallback(
    (nextInfo, meta = {}) => {
      if (!memberNotesEditTarget) {
        showToast?.('Không tìm thấy nhân vật đang sửa ghi chép.', 'error');
        handleCancelMemberNotesEdit();
        return;
      }
      handleSaveEntityMember({
        ...memberNotesEditTarget,
        info: nextInfo,
        wikiLinkOptOuts: Array.isArray(meta?.wikiLinkOptOuts) ? meta.wikiLinkOptOuts : [],
      });
      setMemberNotesEditTargetId(null);
      restoreParentNotesView();
      setIsEntityEditing(false);
    },
    [
      handleCancelMemberNotesEdit,
      handleSaveEntityMember,
      memberNotesEditTarget,
      restoreParentNotesView,
      setIsEntityEditing,
      showToast,
    ]
  );
  const detailProfileSourceLabel = React.useMemo(() => {
    const latestMilestone = timelineCurrentProfile.latestMilestone;
    if (!latestMilestone) return '';
    const chapter = safeString(latestMilestone.chapter).trim();
    const title = safeString(latestMilestone.title).trim();
    if (chapter && title) return `Chương ${chapter} · ${title}`;
    if (chapter) return `Chương ${chapter}`;
    return title;
  }, [timelineCurrentProfile.latestMilestone]);
  const detailEntity =
    detailProfileMode === 'current' && timelineCurrentProfile.hasTimelineCurrentView
      ? timelineCurrentProfile.entity
      : selectedEntity;
  const detailNotesText = React.useMemo(() => {
    if (!selectedEntity) return '';
    return detailProfileMode === 'current'
      ? buildTimelineCurrentNotesText(selectedEntity)
      : safeString(selectedEntity.info);
  }, [detailProfileMode, selectedEntity]);
  const detailNotesEntity = React.useMemo(() => {
    if (!detailEntity) return detailEntity;
    return {
      ...detailEntity,
      info: detailNotesText,
    };
  }, [detailEntity, detailNotesText]);
  const handleOpenCurrentTimelineEdit = React.useCallback(() => {
    const latestMilestone = timelineCurrentProfile.latestMilestone;
    if (!latestMilestone) return;
    setEditingMilestoneData(latestMilestone);
    setIsMilestoneModalOpen(true);
  }, [setEditingMilestoneData, setIsMilestoneModalOpen, timelineCurrentProfile.latestMilestone]);
  const onPromoteMilestoneToBaseline = React.useCallback(
    (milestoneId) => {
      if (typeof handlePromoteMilestoneToBaseline !== 'function') return;
      handlePromoteMilestoneToBaseline(milestoneId, () => {
        setDetailProfileMode('original');
        setCollectionSubTab('detail');
      });
    },
    [handlePromoteMilestoneToBaseline, setDetailProfileMode, setCollectionSubTab]
  );
  React.useEffect(() => { setEntityFilterValueDraft(entityFilterValue || ''); }, [entityFilterValue]);
  React.useEffect(() => {
    setDetailProfileMode('original');
    setMemberNotesEditTargetId(null);
  }, [selectedEntity?.id]);
  React.useEffect(() => {
    if (!memberNotesEditTargetId || memberNotesEditTarget) return;
    handleCancelMemberNotesEdit();
  }, [handleCancelMemberNotesEdit, memberNotesEditTarget, memberNotesEditTargetId]);
  React.useEffect(() => {
    const t = setTimeout(() => setEntityFilterValue(entityFilterValueDraft), 260);
    return () => clearTimeout(t);
  }, [entityFilterValueDraft, setEntityFilterValue]);
  React.useEffect(() => {
    if (currentTabConfig?.viewType !== 'collection-track') return undefined;
    setIsCollectionSwitching(true);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setIsCollectionSwitching(false));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      setIsCollectionSwitching(false);
    };
  }, [collectionSubTab, activeTabLon, activeTabNho, activeTabCon, currentTabConfig?.viewType]);

  const toolbarCtrlBase = 'tt-kbd-focus h-9 rounded-xl text-[12px] font-semibold';
  const toolbarInputBase = 'tt-kbd-focus h-9 rounded-xl text-[12px] font-serif';
  return (
    <div className="animate-fade-in flex flex-col h-full">
      {/* ===== HEADER: breadcrumb + tiêu đề + toolbar (một hàng cố định) ===== */}
      <div
        className="mb-4 border-b border-slate-800 pb-5 relative z-30"
        ref={entityAdvancedRef}
      >
        {/* Hàng 1: tiêu đề (trái) + toolbar buttons (phải) — không đổi chiều cao */}
        <div className="flex justify-between items-end">
          <div className="min-w-0 pr-4">
            <div className="text-[10px] text-amber-600 uppercase font-bold tracking-widest mb-1 flex items-center gap-2 flex-wrap">
              <span className="opacity-50 cursor-pointer hover:opacity-80" onClick={() => handleSelectTabLon(activeTabLon)}>
                {safeString(sortedTabs.find((t) => t.id === activeTabLon)?.label || activeTabLon)}
              </span>
              {activeTabNho && <><ChevronRight size={10}/> {safeString(currentTabConfig?.label)}</>}
              {activeTabCon && (
                <><ChevronRight size={10}/>
                <span className="text-amber-400">
                  {safeString(currentTabConfig?.tabCon?.find((c) => c.id === activeTabCon)?.label)}
                </span></>
              )}
            </div>
            <h2 className="text-4xl font-heading font-bold text-slate-100">
              {activeTabCon
                ? safeString(currentTabConfig?.tabCon?.find((c) => c.id === activeTabCon)?.label)
                : safeString(currentTabConfig?.label)}
            </h2>
          </div>

          <div className="relative z-40 flex items-center gap-2.5 flex-shrink-0 flex-wrap justify-end">
            {!activeTabNho && currentTabConfig?.subTabs?.length > 0 ? null : currentTabConfig?.viewType === 'collection-track' ? (<>
              <button
                type="button"
                onClick={handleOpenCreateEntity}
                className={`${toolbarCtrlBase} px-4 bg-amber-700/80 hover:bg-amber-600 text-white flex items-center gap-1.5 transition-colors shadow-md flex-shrink-0`}
              >
                <Plus size={13}/> {getTerms(activeTabLon).createNew}
              </button>
              <div className="relative flex-shrink-0">
                <input
                  key={collectionSearchScopeKey}
                  ref={collectionSearchInputRef}
                  type="text"
                  inputMode="search"
                  autoComplete="off"
                  spellCheck={false}
                  enterKeyHint="search"
                  defaultValue={safeString(entitySearch)}
                  placeholder="Tìm theo tên thẻ..."
                  onChange={scheduleEntitySearchDebounce}
                  onBlur={handleCollectionSearchBlur}
                  className={`${toolbarInputBase} bg-slate-900 border border-slate-800 pl-10 pr-4 outline-none focus:border-amber-600/50 w-48`}
                  aria-label="Tìm theo tên thẻ trong danh sách thẻ"
                  role="searchbox"
                />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"/>
              </div>
              <select
                value={entitySortMode}
                onChange={(e) => setEntitySortMode(e.target.value)}
                className={`${toolbarInputBase} bg-slate-900 border border-slate-800 px-3 outline-none focus:border-amber-600/50 text-slate-300 cursor-pointer flex-shrink-0`}
                aria-label="Sắp xếp danh sách thẻ"
              >
                <option value="name_asc">Tên (A-Z)</option>
                <option value="name_desc">Tên (Z-A)</option>
                <option value="milestones">Nhiều mốc trước</option>
                <option value="newest">Mới tạo trước</option>
              </select>
              {(tabTreeHasLinks || entityTreeFeatureOn || mapListBranchMode === 'branch') && (
                <select
                  value={mapListBranchMode}
                  onChange={(e) => {
                    const next = e.target.value;
                    setMapListBranchMode(next);
                    if (next === 'branch' && selectedEntity?.id) {
                      setEntityTreeListRootId?.(selectedEntity.id);
                    }
                  }}
                  className={`${toolbarInputBase} bg-slate-900 border border-slate-800 px-3 outline-none focus:border-emerald-600/50 text-slate-300 cursor-pointer flex-shrink-0 ${
                    mapListBranchMode === 'branch' ? 'border-emerald-700/50 text-emerald-200' : ''
                  }`}
                  aria-label="Lọc danh sách theo cây thư mục"
                  title={
                    mapListBranchMode === 'branch'
                      ? (entityTreeListRootName
                        ? `Đang lọc nhánh: ${entityTreeListRootName}`
                        : 'Đang hiện thẻ gốc / chưa gắn. Mở một thẻ để lọc đúng nhánh con.')
                      : 'Lọc danh sách theo cây thư mục'
                  }
                >
                  <option value="all">Cây: Tất cả</option>
                  <option value="branch">Cây: Theo nhánh</option>
                </select>
              )}
              <button
                type="button"
                onClick={() => setShowEntityAdvanced((v) => !v)}
                aria-expanded={showEntityAdvanced}
                aria-controls="entity-advanced-panel"
                className={`${toolbarCtrlBase} px-3 border flex items-center gap-1.5 transition-colors flex-shrink-0 ${showEntityAdvanced ? 'bg-amber-900/30 border-amber-700/50 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}
              >
                <Filter size={13} />
                Nâng cao
              </button>
              {isEntityAdvancedActive && (
                <button
                  type="button"
                  onClick={clearEntityAdvanced}
                  className={`${toolbarCtrlBase} px-3 border bg-slate-900 border-slate-700 text-slate-300 hover:text-slate-100 transition-colors flex-shrink-0`}
                >
                  Xóa lọc
                </button>
              )}
            </>) : (
              <button
                id="save-standard-btn"
                type="button"
                onClick={() => {
                  if (isEditingMode) { handleSaveStandardEditor(); }
                  else setIsEditingMode(true);
                  const s = safeString(currentStandardData);
                  setLivePreviewText(s);
                  setDebouncedMarkdownPreview(s);
                }}
              className={`tt-kbd-focus h-9 px-5 rounded-xl text-[12px] font-semibold transition-colors shadow-lg flex items-center gap-2 ${isEditingMode ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-800 border border-slate-700 text-slate-300 hover:text-slate-100 hover:bg-slate-700'}`}
              >
                {isEditingMode ? <><Save size={16}/> Lưu (Ctrl+S)</> : <><Edit3 size={16}/> Chỉnh Sửa</>}
              </button>
            )}
          </div>
        </div>

        {/* Hàng 2 (chỉ collection-track): chip lọc đang active + panel Nâng cao — tách riêng để không làm lệch hàng tiêu đề */}
        {currentTabConfig?.viewType === 'collection-track' && (<>
          {mapListBranchMode === 'branch' && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-full border border-emerald-700/50 bg-emerald-950/30 px-2.5 py-1 font-serif text-emerald-100">
                {entityTreeListRootName
                  ? `Theo nhánh: ${entityTreeListRootName} (+ thẻ con)`
                  : 'Theo nhánh: chỉ thẻ gốc / chưa gắn'}
              </span>
              {entityTreeListRootName ? (
                <button
                  type="button"
                  onClick={() => setEntityTreeListRootId?.(null)}
                  className="tt-kbd-focus rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 font-bold text-slate-300 hover:border-emerald-600/50 hover:text-emerald-200"
                >
                  Về chỉ gốc
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setMapListBranchMode('all')}
                className="tt-kbd-focus rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 font-bold text-slate-300 hover:text-slate-100"
              >
                Bỏ lọc cây
              </button>
            </div>
          )}
          {isEntityAdvancedActive && (
            <div className="flex items-center gap-2 flex-wrap mt-3 text-[11px]">
              {entityFilterField !== 'none' && entityFilterValue.trim() ? (
                <span className="px-2.5 py-1 rounded-full border border-cyan-700/50 bg-cyan-950/30 text-cyan-200">
                  Lọc: {safeString(entityFilterFields.find((f) => f.id === entityFilterField)?.label || entityFilterField)} = &quot;{entityFilterValue.trim()}&quot;
                </span>
              ) : null}
              {entityGroupBy !== 'none' ? (
                <span className="px-2.5 py-1 rounded-full border border-amber-700/50 bg-amber-950/30 text-amber-200">
                  Nhóm: {safeString(entityFilterFields.find((f) => f.id === entityGroupBy)?.label || entityGroupBy)}
                </span>
              ) : null}
            </div>
          )}
          {showEntityAdvanced && (
            <div
              id="entity-advanced-panel"
              className="mt-3 overflow-visible rounded-2xl border border-slate-800/90 bg-slate-950/90 p-3.5 shadow-xl space-y-2.5 animate-fade-fast"
            >
              <div className="grid grid-cols-1 gap-2.5 overflow-visible sm:grid-cols-2 lg:grid-cols-3">
                <AdvancedFieldSelect
                  value={entityFilterField}
                  onChange={setEntityFilterField}
                  options={entityFilterOptions}
                  active={entityFilterField !== 'none'}
                />
                <input
                  type="text"
                  placeholder={entityFilterField === 'none' ? 'Chọn trường rồi nhập giá trị lọc...' : 'Giá trị lọc theo trường...'}
                  value={entityFilterValueDraft}
                  onChange={(e) => setEntityFilterValueDraft(e.target.value)}
                  disabled={entityFilterField === 'none'}
                  className="tt-kbd-focus h-9 w-full bg-slate-900 border border-slate-800 rounded-xl px-3 text-[12px] font-serif outline-none focus:border-cyan-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <AdvancedFieldSelect
                  value={entityGroupBy}
                  onChange={setEntityGroupBy}
                  options={entityGroupOptions}
                  active={entityGroupBy !== 'none'}
                />
              </div>
              {entityContextPresets?.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">Preset:</span>
                  {entityContextPresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyEntityPreset(preset)}
                      className="tt-kbd-focus h-8 px-2.5 rounded-lg border border-amber-700/40 bg-amber-950/20 text-amber-300 text-[11px] font-semibold hover:bg-amber-900/30 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-slate-500 font-serif leading-relaxed">
                Lưu ý: <span className="text-slate-400">Tìm theo tên thẻ</span> và{' '}
                <span className="text-slate-400">Lọc theo trường</span> được áp dụng đồng thời.
              </p>
            </div>
          )}
        </>)}
      </div>

      {/* ===== BODY ===== */}
      {!activeTabNho && currentTabConfig?.subTabs?.length > 0 ? (
        /* Sub-tab chooser */
        <div className="animate-fade-in mt-2">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-6 flex items-center gap-2">
            <span className="w-4 h-px bg-slate-700"/>
            Chọn chương mục để xem
            <span className="w-4 h-px bg-slate-700"/>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currentTabConfig.subTabs.map((sub) => {
              const subData = activeNovelData?.data?.[activeTabLon]?.[sub.id];
              const entityCount = subData?.entities?.length || 0;
              const isCollection = sub.viewType === 'collection-track';
              return (
                <button
                  key={sub.id}
                  onClick={(e) => handleSelectTabNho(e, activeTabLon, sub)}
                  className="bg-slate-900/60 border border-slate-800 hover:border-amber-600/40 rounded-2xl p-6 flex items-center gap-5 transition-all hover:shadow-[0_8px_24px_rgba(217,119,6,0.06)] group text-left"
                >
                  <div className="w-14 h-14 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 group-hover:text-amber-500 group-hover:border-amber-500/30 transition-all flex-shrink-0 shadow-inner group-hover:shadow-[0_0_12px_rgba(217,119,6,0.1)]">
                    {safeString(sub.iconImage).trim() ? (
                      <img src={sub.iconImage} alt="" className="w-10 h-10 object-cover rounded-lg" />
                    ) : (
                      isCollection ? <User size={26}/> : <BookOpen size={26}/>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-heading text-lg text-slate-200 group-hover:text-amber-400 transition-colors truncate">{safeString(sub.label)}</div>
                    <div className="text-xs text-slate-500 mt-1 font-serif flex items-center gap-2">
                      {isCollection ? (
                        <span className={`font-bold ${entityCount > 0 ? 'text-amber-600' : 'text-slate-600'}`}>{entityCount} thực thể</span>
                      ) : (
                        <span>{subData ? 'Có ghi chép' : 'Chưa có nội dung'}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-700 group-hover:text-amber-500 transition-colors flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      ) : currentTabConfig?.viewType === 'collection-track' ? (
        /* Collection-track view */
        <div className="flex flex-col flex-1 h-full animate-fade-in relative z-0">
          <AppCollectionTrackTabs
            collectionSubTab={collectionSubTab}
            setCollectionSubTab={setCollectionSubTab}
            galleryCount={selectedEntity?.images?.length || 0}
            selectedEntityName={selectedEntity ? safeString(selectedEntity.name) : ''}
            selectedEntityMilestoneCount={selectedEntity?.milestones?.length || 0}
            selectedEntityDescriptionCount={selectedEntity?.descriptions?.length || 0}
            isSwitching={isCollectionSwitching}
          />

          <div id="collection-scroll-container" className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10 relative">
            {isCollectionSwitching && (
              <div className="absolute inset-0 z-10 pointer-events-none bg-slate-950/20 backdrop-blur-[1px] animate-fade-in" />
            )}
            <AppGalleryContent
              collectionSubTab={collectionSubTab}
              selectedEntity={selectedEntity}
              onBackToList={() => setCollectionSubTab('list')}
              onAddEntityImage={handleAddEntityImage}
              onRemoveEntityImage={handleRemoveEntityImage}
              onOpenEntityImage={setLightboxSrc}
              currentContextDirHandle={currentContextDirHandle}
            />
            <AppCollectionListContent
              collectionSubTab={collectionSubTab}
              entitiesList={entitiesList}
              entityPage={entityPage}
              setEntityPage={setEntityPage}
              entityGroupBy={entityGroupBy}
              pagedEntitiesList={pagedEntitiesList}
              groupedEntitiesList={groupedEntitiesList}
              groupVisibleCount={groupVisibleCount}
              setGroupVisibleCount={setGroupVisibleCount}
              currentTabConfig={currentTabConfig}
              onEntityCardSelect={onEntityCardSelect}
              onEntityCardDelete={onEntityCardDelete}
              onEntityCardAddMilestone={onEntityCardAddMilestone}
              onEntityCardTogglePin={onEntityCardTogglePin}
              currentContextDirHandle={currentContextDirHandle}
              activeTabLon={activeTabLon}
              entityPageSize={entityPageSize}
            />

            <AppCollectionEmptyState
              show={(collectionSubTab === 'detail' || collectionSubTab === 'timeline' || collectionSubTab === 'description') && !selectedEntity}
              onBackToList={() => setCollectionSubTab('list')}
            />

            {collectionSubTab === 'detail' && selectedEntity && (() => {
              const tabTerms = getTerms(activeTabLon);
              const isMapDetail = isMapCollectionScope({ activeTabLon, activeTabNho, currentTabConfig });
              const isForceDetail = isForceCollectionScope({
                activeTabLon,
                activeTabNho,
                currentTabConfig,
                parentLabel: currentTabConfig?._parentLabel || '',
              });
              const mapParentLine = safeString(detailEntity?.dynamicData?.f_vi_tri).trim();
              const forceLocationLine = getLeafHierarchyLabel(
                safeString(detailEntity?.dynamicData?.f_dia_ban || detailEntity?.dynamicData?.f_vi_tri)
              );
              const forceTypeLine = safeString(currentTabConfig?.label || '').trim();
              const statusLine =
                safeString(detailEntity?.dynamicData?.f_status).trim() ||
                safeString(detailEntity?.status).trim();
              const mapTraitLabel = isMapDetail ? getMapTraitLabel(statusLine) : '';
              const mapTraitBadgeStyle = getMapTraitBadgeStyle(mapTraitLabel);
              const mapStatusForSubtitle =
                isMapDetail && mapTraitLabel ? getMapTypeLabel(statusLine) : statusLine;
              const profileSubtitle = isMapDetail
                ? [...new Set([mapParentLine, mapStatusForSubtitle].filter(Boolean))].join(' · ')
                : isForceDetail
                  ? statusLine || [...new Set([forceTypeLine, forceLocationLine].filter(Boolean))].join(' · ')
                  : statusLine;
              return (
              <div
                className="flex flex-col w-full animate-fade-in pb-10"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleImageDrop(e, 'entity-info-editor', {
                  filePrefix: 'entity-info',
                  fileStemParts: scopedEntityImageFileStemParts,
                })}
              >
                <div className="flex justify-between items-start mb-8 pb-8 border-b border-slate-800/80">
                  <div className="flex items-center gap-6">
                    <div
                      className="w-24 h-24 rounded-[40px] bg-slate-950 border-2 border-amber-500/40 overflow-hidden flex items-center justify-center text-4xl text-amber-500 font-bold shadow-[0_0_30px_rgba(245,158,11,0.15)] group cursor-zoom-in"
                      onClick={() => detailEntity?.avatar && setLightboxSrc(detailEntity.avatar)}
                      title="Nhấp để xem ảnh đầy đủ"
                    >
                      {detailEntity?.avatar ? (
                        detailEntity.avatar.startsWith('local_image:') ? (
                          <AsyncLocalImage
                            filename={detailEntity.avatar.replace('local_image:', '')}
                            alt="avatar"
                            dirHandle={currentContextDirHandle}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                        ) : (
                          <img
                            src={detailEntity.avatar}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            alt=""
                            onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMG; }}
                          />
                        )
                      ) : safeString(detailEntity?.name).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <h2 className="text-4xl font-heading font-bold text-slate-100">{safeString(detailEntity?.name)}</h2>
                          {safeString(detailEntity?.title).trim() && (
                            <span className="px-3 py-1 bg-amber-900/30 text-amber-400 text-[10px] font-bold uppercase tracking-widest rounded-full border border-amber-700/30 shadow-inner">
                              {safeString(detailEntity.title)}
                            </span>
                          )}
                        </div>
                        {mapTraitLabel && (
                          <span
                            className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
                            style={mapTraitBadgeStyle}
                          >
                            {mapTraitLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 font-serif flex items-center gap-2">
                        <Shield size={14} className="text-slate-500 shrink-0" aria-hidden />
                        <span>{profileSubtitle || tabTerms.profileSubtitleEmpty}</span>
                      </p>
                      {safeString(detailEntity?.dynamicData?.f_alias).trim() && (
                        <p className="text-sm text-indigo-200/90 font-serif mt-3 leading-relaxed max-w-2xl border-l-2 border-indigo-700/50 pl-3">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 block mb-0.5">
                            Biệt danh — cùng liên kết wiki với tên chính
                          </span>
                          {safeString(detailEntity.dynamicData.f_alias)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportEntityPDF(detailEntity, currentTabConfig)}
                      className="px-4 py-2.5 bg-indigo-900/30 hover:bg-indigo-800/50 border border-indigo-700/40 text-indigo-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-md"
                    >
                      <Download size={13}/> Xuất PDF
                    </button>
                    <button
                      onClick={handleOpenEditEntity}
                      className="px-5 py-2.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-md"
                    >
                      <Settings size={14}/> Thiết Lập Form
                    </button>
                  </div>
                </div>

                <AppEntityMembersPanel
                  key={`${activeTabLon || 'lon'}:${activeTabNho || 'default'}:${selectedEntity?.id || 'entity-members'}`}
                  selectedEntity={selectedEntity}
                  tabConfig={currentTabConfig}
                  scopeKey={`${activeTabLon || 'lon'}:${activeTabNho || 'default'}`}
                  onSaveMember={handleSaveEntityMember}
                  onSaveMemberFieldMeta={handleSaveEntityMemberFieldMeta}
                  onDeleteMember={handleDeleteEntityMember}
                  onEditMemberNotes={handleEditMemberNotes}
                  onOpenMember={(member) => {
                    if (!member?.id || !selectedEntity?.id) return;
                    handleNavigate({
                      lonId: activeTabLon,
                      nhoId: activeTabNho,
                      entityId: selectedEntity.id,
                      memberId: member.id,
                    });
                  }}
                />

                {entityTreeFeatureOn ? (
                  <AppMapEntityTreePanel
                    key={`map-tree:${entityTreeScopeKey}`}
                    entities={collectionEntitiesRaw}
                    selectedEntity={selectedEntity}
                    scopeKey={entityTreeScopeKey}
                    onMoveEntity={handleMoveMapEntity}
                    onCreateChild={handleCreateMapChildEntity}
                    onDetachEntity={handleDetachMapEntity}
                    onHideFeature={hideEntityTreeFeature}
                    onOpenEntity={(entity) => {
                      if (!entity?.id) return;
                      handleNavigate({
                        lonId: activeTabLon,
                        nhoId: activeTabNho,
                        entityId: entity.id,
                      });
                    }}
                  />
                ) : (
                  <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-heading font-bold text-slate-300">
                        <FolderTree size={16} className="text-emerald-400/80" />
                        Cây thư mục
                      </div>
                      <p className="mt-0.5 font-serif text-[12px] text-slate-500">
                        Ẩn khi không dùng — bật để xếp thẻ cha/con, kéo thả và khóa nhánh trên mọi tab sưu tập.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={enableEntityTreeFeature}
                      className="tt-kbd-focus flex h-9 items-center gap-1.5 rounded-lg border border-emerald-800/55 bg-emerald-950/35 px-3 text-[12px] font-bold text-emerald-100 hover:border-emerald-500/60 hover:bg-emerald-900/40"
                    >
                      <Eye size={14} /> Hiện cây thư mục
                    </button>
                  </div>
                )}

                <AppEntityDetailNotes
                  activeTabLon={activeTabLon}
                  getTerms={getTerms}
                  isEntityEditing={isEntityEditing}
                  isExtractingAI={isExtractingAI}
                  setIsExtractingAI={setIsExtractingAI}
                  geminiApiKeys={geminiApiKeys}
                  showToast={showToast}
                  aiMode={aiMode}
                  isSplitPreview={isSplitPreview}
                  setLivePreviewText={setLivePreviewText}
                  setDebouncedMarkdownPreview={setDebouncedMarkdownPreview}
                  setIsSplitPreview={setIsSplitPreview}
                  activeTabNho={activeTabNho}
                  currentTabConfig={currentTabConfig}
                  selectedEntity={detailNotesEntity}
                  handleUpdateEntityInfo={handleUpdateEntityInfo}
                  handleSetSelectedEntityAutoSyncState={handleSetSelectedEntityAutoSyncState}
                  setIsEntityEditing={setIsEntityEditing}
                  setImageForm={setImageForm}
                  setIsInsertImageModalOpen={setIsInsertImageModalOpen}
                  handlePickLocalImage={handlePickLocalImage}
                  imageFileStemParts={scopedEntityImageFileStemParts}
                  debouncedMarkdownPreview={debouncedMarkdownPreview}
                  currentContextDirHandle={currentContextDirHandle}
                  entityMap={entityMap}
                  statusTierLabelSet={statusTierLabelSet}
                  globalLinkRegex={globalLinkRegex}
                  onNavigate={handleNavigate}
                  detailNotesMarkdown={detailNotesText}
                  entityFilterFields={entityFilterFields}
                  notesTabFieldBuckets={entityNotesTabFilterBuckets}
                  AdvancedFieldSelect={AdvancedFieldSelect}
                  entityTemplateHint={currentTabConfig?.label || ''}
                  onOpenAutoSyncGuide={onOpenAutoSyncGuide}
                  onOpenEntityNotesGuide={onOpenEntityNotesGuide}
                  detailProfileMode={detailProfileMode}
                  onChangeDetailProfileMode={setDetailProfileMode}
                  canViewTimelineCurrentProfile={timelineCurrentProfile.hasTimelineCurrentView}
                  timelineCurrentProfileLabel={detailProfileSourceLabel}
                  onOpenTimelineCurrentEdit={handleOpenCurrentTimelineEdit}
                  memberNotesEditTarget={memberNotesEditTarget}
                  onSaveMemberNotes={handleSaveMemberNotesEdit}
                  onCancelMemberNotesEdit={handleCancelMemberNotesEdit}
                />

                <AppEntitySummaryBlocks
                  selectedEntity={detailEntity}
                  collectionSubTab={collectionSubTab}
                  currentContextDirHandle={currentContextDirHandle}
                  relatedEntities={relatedEntities}
                  isCalculatingNetwork={isCalculatingNetwork}
                  tocRailExpanded={tocRailExpanded}
                  onNavigate={(dest) => navFnRef.current?.(dest)}
                />
              </div>
              );
            })()}

            <AppEntityTimelinePanel
              collectionSubTab={collectionSubTab}
              selectedEntity={selectedEntity}
              selectedMilestoneId={selectedMilestoneId}
              setSelectedMilestoneId={setSelectedMilestoneId}
              activeTabLon={activeTabLon}
              currentTabConfig={currentTabConfig}
              currentContextDirHandle={currentContextDirHandle}
              entityMap={entityMap}
              globalLinkRegex={globalLinkRegex}
              onNavigate={(dest) => navFnRef.current?.(dest)}
              setEditingMilestoneData={setEditingMilestoneData}
              setIsMilestoneModalOpen={setIsMilestoneModalOpen}
              handleMergeSnapshotToProfile={handleMergeSnapshotToProfile}
              handlePromoteMilestoneToBaseline={onPromoteMilestoneToBaseline}
              handleDeleteMilestone={handleDeleteMilestone}
              handleReplaceMilestones={handleReplaceMilestones}
              getFieldValue={getFieldValue}
              setLightboxSrc={setLightboxSrc}
            />

            <AppEntityDescriptionPanel
              collectionSubTab={collectionSubTab}
              selectedEntity={selectedEntity}
              selectedDescriptionId={selectedDescriptionId}
              setSelectedDescriptionId={setSelectedDescriptionId}
              currentContextDirHandle={currentContextDirHandle}
              entityMap={entityMap}
              globalLinkRegex={globalLinkRegex}
              onNavigate={(dest) => navFnRef.current?.(dest)}
              setEditingDescriptionData={setEditingDescriptionData}
              setIsDescriptionModalOpen={setIsDescriptionModalOpen}
              handleDeleteDescription={handleDeleteDescription}
            />
          </div>
        </div>
      ) : (
        /* Standard text editor view */
        <div
          className="flex-1 flex flex-col bg-slate-900/30 p-8 rounded-[40px] backdrop-blur-md border border-slate-800 min-h-[500px]"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleImageDrop(e, 'standard-editor', {
            filePrefix: 'tab',
            fileStemParts: standardImageFileStemParts,
          })}
        >
          {isEditingMode ? (
            <div className="flex flex-col flex-1 animate-fade-in">
              <div className="flex items-center justify-between mb-1">
                <MarkdownToolbar
                  editorId="standard-editor"
                  onInsertImage={(eid) => { setImageForm({ url: '', alt: '', editorId: eid }); setIsInsertImageModalOpen(true); }}
                  onPickLocalImage={handlePickScopedStandardLocalImage}
                />
                <button
                  onClick={() => {
                    const cur = document.getElementById('standard-editor')?.value;
                    if (cur !== undefined) { setLivePreviewText(cur); setDebouncedMarkdownPreview(cur); }
                    setIsSplitPreview((p) => !p);
                  }}
                  className={`ml-2 px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0 transition-colors flex items-center gap-1.5 ${isSplitPreview ? 'bg-amber-700/30 text-amber-400 border border-amber-700/40' : 'bg-slate-800 text-slate-500 border border-slate-700 hover:text-slate-300'}`}
                >
                  <Eye size={12}/> Preview
                </button>
              </div>
              <div className={`flex flex-1 gap-4 min-h-0 ${isSplitPreview ? 'flex-row' : 'flex-col'}`}>
                <textarea
                  key={`${activeTabLon}-${activeTabNho}-${activeTabCon}`}
                  id="standard-editor"
                  className={`bg-transparent text-slate-200 font-serif text-lg leading-loose outline-none resize-none custom-scrollbar ${isSplitPreview ? 'w-1/2 flex-shrink-0' : 'flex-1'}`}
                  defaultValue={safeString(currentStandardData)}
                  placeholder="Hạ bút tại đây..."
                  onChange={(e) => { if (isSplitPreview) setLivePreviewText(e.target.value); }}
                  onPaste={() => {
                    if (isSplitPreview) {
                      setTimeout(() => {
                        const v = document.getElementById('standard-editor')?.value;
                        if (v !== undefined) setLivePreviewText(v);
                      }, 0);
                    }
                  }}
                />
                {isSplitPreview && (
                  <MarkdownPreviewPane
                    text={debouncedMarkdownPreview}
                    dirHandle={currentContextDirHandle}
                    entityMap={entityMap}
                    linkRegex={globalLinkRegex}
                    onNavigate={handleNavigate}
                    className="w-1/2 overflow-y-auto custom-scrollbar border-l border-slate-700 pl-4 font-serif"
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="font-serif animate-fade-in flex-1">
              {memoizedStandardData && <>{memoizedStandardData}</>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
