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
  User, BookOpen, Download, Settings, Shield,
} from 'lucide-react';
import { safeString, AsyncLocalImage } from './MasterUtils.jsx';
import { FALLBACK_IMG } from './MasterEngines.js';
import { AppCollectionListContent } from './AppCollectionListContent.jsx';
import { AppGalleryContent } from './AppGalleryContent.jsx';
import { AppCollectionTrackTabs } from './AppCollectionTrackTabs.jsx';
import { AppCollectionEmptyState } from './AppCollectionEmptyState.jsx';
import { AppEntitySummaryBlocks } from './AppEntitySummaryBlocks.jsx';
import { AppEntityDetailNotes } from './AppEntityDetailNotes.jsx';
import { AppEntityTimelinePanel } from './AppEntityTimelinePanel.jsx';
import { MarkdownPreviewPane } from './MarkdownPreviewPane.jsx';
import { MarkdownToolbar } from './MasterComponents.jsx';
import { buildScopedEntityImageStemParts } from './lib/imageFilename.js';
import { isMapCollectionScope } from './lib/mapHierarchySync.js';
import { isForceCollectionScope } from './lib/theLucBanDoSync.js';
import { splitStatusHierarchyTokens } from './lib/statusHierarchyParser.js';

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
  // entity detail
  selectedEntity,
  isEntityEditing,
  setIsEntityEditing,
  recentlyMergedFields,
  entityMap,
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
  setImageForm,
  setIsInsertImageModalOpen,
  handlePickLocalImage,
  debouncedMarkdownPreview,
  memoizedEntityInfo,
  setLightboxSrc,
  selectedMilestoneId,
  setSelectedMilestoneId,
  setEditingMilestoneData,
  setIsMilestoneModalOpen,
  handleMergeSnapshotToProfile,
  handleDeleteMilestone,
  handleReplaceMilestones,
  getFieldValue,
  // standard editor
  isEditingMode,
  setIsEditingMode,
  handleSaveStandardEditor,
  currentStandardData,
  memoizedStandardData,
  handleImageDrop,
}) {
  void AdvancedFieldSelect;
  void recentlyMergedFields;
  const [entitySearchDraft, setEntitySearchDraft] = React.useState(entitySearch || '');
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
  React.useEffect(() => { setEntitySearchDraft(entitySearch || ''); }, [entitySearch]);
  React.useEffect(() => { setEntityFilterValueDraft(entityFilterValue || ''); }, [entityFilterValue]);
  React.useEffect(() => {
    const t = setTimeout(() => setEntitySearch(entitySearchDraft), 220);
    return () => clearTimeout(t);
  }, [entitySearchDraft, setEntitySearch]);
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
                  type="search"
                  placeholder="Tìm kiếm nhanh..."
                  value={entitySearchDraft}
                  onChange={(e) => setEntitySearchDraft(e.target.value)}
                  className={`${toolbarInputBase} bg-slate-900 border border-slate-800 pl-10 pr-4 outline-none focus:border-amber-600/50 w-48`}
                  aria-label="Tìm kiếm nhanh trong danh sách thẻ"
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
              </select>
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
              className="mt-3 rounded-2xl border border-slate-800/90 bg-slate-950/90 p-3.5 shadow-xl space-y-2.5 animate-fade-in"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
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
                Lưu ý: <span className="text-slate-400">Tìm kiếm nhanh</span> và{' '}
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
                    {isCollection ? <User size={26}/> : <BookOpen size={26}/>}
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
              currentContextDirHandle={currentContextDirHandle}
              activeTabLon={activeTabLon}
              entityPageSize={entityPageSize}
            />

            <AppCollectionEmptyState
              show={(collectionSubTab === 'detail' || collectionSubTab === 'timeline') && !selectedEntity}
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
              const mapParentLine = safeString(selectedEntity.dynamicData?.f_vi_tri).trim();
              const forceLocationLine = getLeafHierarchyLabel(
                safeString(selectedEntity.dynamicData?.f_dia_ban || selectedEntity.dynamicData?.f_vi_tri)
              );
              const forceTypeLine = safeString(currentTabConfig?.label || '').trim();
              const statusLine =
                safeString(selectedEntity.status).trim() ||
                safeString(selectedEntity.dynamicData?.f_status).trim();
              const profileSubtitle = isMapDetail
                ? [...new Set([mapParentLine, statusLine].filter(Boolean))].join(' · ')
                : isForceDetail
                  ? [...new Set([forceTypeLine, statusLine, forceLocationLine].filter(Boolean))].join(' Â· ')
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
                      onClick={() => selectedEntity.avatar && setLightboxSrc(selectedEntity.avatar)}
                      title="Nhấp để xem ảnh đầy đủ"
                    >
                      {selectedEntity.avatar ? (
                        selectedEntity.avatar.startsWith('local_image:') ? (
                          <AsyncLocalImage
                            filename={selectedEntity.avatar.replace('local_image:', '')}
                            alt="avatar"
                            dirHandle={currentContextDirHandle}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                        ) : (
                          <img
                            src={selectedEntity.avatar}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            alt=""
                            onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMG; }}
                          />
                        )
                      ) : safeString(selectedEntity.name).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-4xl font-heading font-bold text-slate-100">{safeString(selectedEntity.name)}</h2>
                        {safeString(selectedEntity.title).trim() && (
                          <span className="px-3 py-1 bg-amber-900/30 text-amber-400 text-[10px] font-bold uppercase tracking-widest rounded-full border border-amber-700/30 shadow-inner">
                            {safeString(selectedEntity.title)}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 font-serif flex items-center gap-2">
                        <Shield size={14} className="text-slate-500 shrink-0" aria-hidden />
                        <span>{profileSubtitle || tabTerms.profileSubtitleEmpty}</span>
                      </p>
                      {safeString(selectedEntity.dynamicData?.f_alias).trim() && (
                        <p className="text-sm text-indigo-200/90 font-serif mt-3 leading-relaxed max-w-2xl border-l-2 border-indigo-700/50 pl-3">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 block mb-0.5">
                            Biệt danh — cùng liên kết wiki với tên chính
                          </span>
                          {safeString(selectedEntity.dynamicData.f_alias)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportEntityPDF(selectedEntity, currentTabConfig)}
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
                  selectedEntity={selectedEntity}
                  handleUpdateEntityInfo={handleUpdateEntityInfo}
                  setIsEntityEditing={setIsEntityEditing}
                  setImageForm={setImageForm}
                  setIsInsertImageModalOpen={setIsInsertImageModalOpen}
                  handlePickLocalImage={handlePickLocalImage}
                  imageFileStemParts={scopedEntityImageFileStemParts}
                  debouncedMarkdownPreview={debouncedMarkdownPreview}
                  currentContextDirHandle={currentContextDirHandle}
                  entityMap={entityMap}
                  globalLinkRegex={globalLinkRegex}
                  onNavigate={handleNavigate}
                  memoizedEntityInfo={memoizedEntityInfo}
                  entityTemplateHint={currentTabConfig?.label || ''}
                  onOpenAutoSyncGuide={onOpenAutoSyncGuide}
                  onOpenEntityNotesGuide={onOpenEntityNotesGuide}
                />

                <AppEntitySummaryBlocks
                  selectedEntity={selectedEntity}
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
              handleDeleteMilestone={handleDeleteMilestone}
              handleReplaceMilestones={handleReplaceMilestones}
              getFieldValue={getFieldValue}
              setLightboxSrc={setLightboxSrc}
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
