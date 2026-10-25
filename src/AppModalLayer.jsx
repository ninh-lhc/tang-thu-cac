// ==========================================
// AppModalLayer.jsx
// Purpose: render the app-wide modal stack and keep App.jsx focused on shell orchestration.
// Imported by: App.jsx.
// Notes: lazy-loads heavier modal bundles while preserving existing behavior.
// ==========================================

import React, { Suspense, lazy } from 'react';
import {
  ModalEntity,
  ModalMilestone,
  ModalQuickCreate,
  ModalSettings,
  ModalConfirm,
  ModalInsertImage,
  ModalAddNovel,
  ModalDeepSearch,
  ModalInNovelSearch,
} from './MasterComponents.jsx';
import { ModalDescription } from './AppModalDescription.jsx';

const AppModalMotCua = lazy(() => import('./AppModalMotCua.jsx').then((m) => ({ default: m.AppModalMotCua })));
const AppModalQuanLyTab = lazy(() => import('./AppModalQuanLyTab.jsx').then((m) => ({ default: m.AppModalQuanLyTab })));
const AppModalLenhNhanh = lazy(() => import('./AppModalLenhNhanh.jsx').then((m) => ({ default: m.AppModalLenhNhanh })));
const AppModalGoiYNoiTraCuu = lazy(() => import('./AppModalGoiYNoiTraCuu.jsx').then((m) => ({ default: m.AppModalGoiYNoiTraCuu })));
const AppModalAutoSyncGuide = lazy(() => import('./AppModalAutoSyncGuideVi.jsx').then((m) => ({ default: m.AppModalAutoSyncGuide })));
const AppModalEntityNotesGuide = lazy(() => import('./AppModalEntityNotesGuideVi.jsx').then((m) => ({ default: m.AppModalEntityNotesGuide })));
const AppModalEntityMemberProfile = lazy(() => import('./AppModalEntityMemberProfile.jsx').then((m) => ({ default: m.AppModalEntityMemberProfile })));

export function AppModalLayer({
  isEntityModalOpen,
  setIsEntityModalOpen,
  handleSaveEntity,
  editingEntityData,
  currentTabConfig,
  handleUpdateTabTemplate,
  handleAvatarDrop,
  handlePickLocalImage,
  currentContextDirHandle,
  activeTabLon,
  geminiApiKeys,
  aiMode,
  isMilestoneModalOpen,
  setIsMilestoneModalOpen,
  isDescriptionModalOpen,
  setIsDescriptionModalOpen,
  handleSaveDescription,
  editingDescriptionData,
  isAutoSyncGuideOpen,
  setIsAutoSyncGuideOpen,
  isEntityNotesGuideOpen,
  setIsEntityNotesGuideOpen,
  handleSaveMilestone,
  editingMilestoneData,
  lockMilestoneChapterAfterRename = false,
  activeNovelData,
  entityMap,
  statusTierLabelSet,
  showToast,
  autoLinkToastEnabled,
  isSettingsOpen,
  setIsSettingsOpen,
  handleConnectFolder,
  dirHandle,
  dirName,
  handleExportBackup,
  handleExportIndexOnly,
  handleImportBackup,
  handleCleanupLegacyIndexFiles,
  handleSaveApiKeys,
  setAiMode,
  wikiExactMatchOnly,
  setWikiExactMatchOnly,
  performanceMode,
  setPerformanceMode,
  setAutoLinkToastEnabled,
  isCommandPaletteOpen,
  setIsCommandPaletteOpen,
  commandPaletteQuery,
  setCommandPaletteQuery,
  commandPaletteFiltered,
  runCommandPaletteAction,
  setIsDeepSearchOpen,
  setIsInNovelSearchOpen,
  openOverviewHub,
  handleGoHome,
  handleSelectNovel,
  confirmDialog,
  setConfirmDialog,
  isInsertImageModalOpen,
  setIsInsertImageModalOpen,
  imageForm,
  setImageForm,
  handleConfirmInsertImage,
  isAddNovelOpen,
  setIsAddNovelOpen,
  novelForm,
  setNovelForm,
  handleSaveNovelModal,
  novelModalMode,
  handlePickCoverImage,
  requestRecalculateLibraryStats,
  isStatsBackfilling,
  novelsMetadata,
  isDeepSearchOpen,
  performDeepSearch,
  handleDeepSearchResultSelect,
  isInNovelSearchOpen,
  xrefAiPanel,
  setXrefAiPanel,
  findEntitiesByXrefHint,
  applyXrefSuggestionNewEntity,
  applyXrefSuggestionMilestone,
  applyXrefSuggestionProfile,
  overviewHubOpen,
  setOverviewHubOpen,
  overviewHubTab,
  setOverviewHubTab,
  hubCreatePath,
  setHubCreatePath,
  hubCreateInput,
  setHubCreateInput,
  hubCreateBusy,
  hubCreatePreview,
  setHubCreatePreview,
  hubUpdateChapter,
  setHubUpdateChapter,
  hubUpdateText,
  setHubUpdateText,
  hubUpdatePanel,
  setHubUpdatePanel,
  activeTabs,
  hubRunCreateAi,
  hubSaveCreateEntity,
  runHubUpdateAi,
  applyHubUpdateSelected,
  quickCreateData,
  setQuickCreateData,
  handleConfirmQuickCreate,
  isManageTabsOpen,
  setIsManageTabsOpen,
  sortedTabs,
  editingTab,
  setEditingTab,
  handleAddTabLon,
  handleSaveEditLabel,
  handleSaveTabIcon,
  handleSaveTabIconImage,
  handleSaveSubTabIconImage,
  handleToggleViewType,
  handleDeleteTab,
  handleAddTabNho,
  handleAddTabCon,
  handleSetTabAutoSyncRole,
  handleSetTabAutoSyncTargets,
  handleSetTabAutoSyncLevels,
  handleSetTabAutoSyncFieldMap,
  handleSetTabMapEntrySuggestions,
  handleSetTabMapParentTierSchema,
  handleSetTabMapParentTierFieldMap,
  handleMergeTabFieldSuggestionList,
  handleAddTabTemplateField,
  handleEnsureTabTemplateFields,
  handleRemoveTabTemplateField,
  handleRenameTabTemplateFieldLabel,
  handleSetTabTemplateFieldSortPrefix,
  handleSetTabEntityQuickEntry,
  handleSetTabFieldSuggestionDependencies,
  requestPropagateFieldSuggestionDependenciesToLon,
  requestPropagateEntityQuickEntryToLon,
  requestPropagateEntityQuickEntryToAllLons,
  requestPropagateMapParentTierSchemaToLon,
  requestPropagateMapParentTierFieldMapToLon,
  handleSetTabFieldSource,
  handleApplySuggestedAutoSyncSetup,
  handleBulkDisableTabAutoSync,
  handleResyncAutoTabs,
  handleSaveCurrentTabsAsGenreTemplate,
  handleResetNovelSuggestionLists,
  entityMemberQuickView,
  setEntityMemberQuickView,
  openEntityMemberParent,
  currentContextDirHandleForMember,
  globalLinkRegex,
  handleNavigate,
}) {
  return (
    <Suspense fallback={null}>
      <AppModalEntityMemberProfile
        profile={entityMemberQuickView}
        onClose={() => setEntityMemberQuickView?.(null)}
        onOpenParentEntity={openEntityMemberParent}
        currentContextDirHandle={currentContextDirHandleForMember || currentContextDirHandle}
        entityMap={entityMap}
        linkRegex={globalLinkRegex}
        onNavigate={handleNavigate}
      />
      <ModalEntity
        isOpen={isEntityModalOpen}
        onClose={() => setIsEntityModalOpen(false)}
        onOpenAutoSyncGuide={setIsAutoSyncGuideOpen ? () => setIsAutoSyncGuideOpen(true) : undefined}
        onSave={handleSaveEntity}
        initialData={editingEntityData}
        tabConfig={currentTabConfig}
        activeNovelData={activeNovelData}
        onUpdateTemplate={handleUpdateTabTemplate}
        handleAvatarDrop={handleAvatarDrop}
        handlePickLocalImage={handlePickLocalImage}
        dirHandle={currentContextDirHandle}
        parentTabId={activeTabLon}
        parentLabel={currentTabConfig?._parentLabel}
        showToast={showToast}
        geminiApiKey={geminiApiKeys}
        geminiMode={aiMode}
        onPatchMapRealmScaleLists={(patch, options = {}) => {
          const lonId = options.lonId || activeTabLon;
          const nhoId = options.nhoId || currentTabConfig?.id;
          if (!lonId || !nhoId) return;
          const ok = handleSetTabMapEntrySuggestions(lonId, nhoId, 'realmScaleLists', '', { patch });
          if (ok) {
            showToast?.('Đã lưu list «Quy mô địa vực» cho giới diện này (theo tab Bản đồ).', 'success');
          }
        }}
        onSaveMapHierarchySharedList={(text) => {
          const nhoId = currentTabConfig?.id;
          if (!activeTabLon || !nhoId) return;
          const ok = handleSetTabMapEntrySuggestions(activeTabLon, nhoId, 'hierarchy', text, {
            propagateWithinMapLon: true,
          });
          if (ok) {
            showToast?.('Đã lưu list «Đặc Tính Địa Vực» dùng chung cho các tab Bản đồ cùng nhánh.', 'success');
          }
        }}
        onSaveMapParentTierSchema={(schema, options = {}) => {
          const lonId = options.lonId || activeTabLon;
          const nhoId = options.nhoId || currentTabConfig?.id;
          if (!lonId || !nhoId) return;
          handleSetTabMapParentTierSchema(lonId, nhoId, schema);
        }}
        onSaveMapParentTierFieldMap={(fieldMap, options = {}) => {
          const lonId = options.lonId || activeTabLon;
          const nhoId = options.nhoId || currentTabConfig?.id;
          if (!lonId || !nhoId) return;
          handleSetTabMapParentTierFieldMap(lonId, nhoId, fieldMap);
        }}
        handleAddTabTemplateField={handleAddTabTemplateField}
        handleEnsureTabTemplateFields={handleEnsureTabTemplateFields}
        handleRemoveTabTemplateField={handleRemoveTabTemplateField}
        handleRenameTabTemplateFieldLabel={handleRenameTabTemplateFieldLabel}
        handleSetTabTemplateFieldSortPrefix={handleSetTabTemplateFieldSortPrefix}
        handleMergeTabFieldSuggestionList={handleMergeTabFieldSuggestionList}
        handleSetTabFieldSource={handleSetTabFieldSource}
        setConfirmDialog={setConfirmDialog}
        handleSetTabEntityQuickEntry={handleSetTabEntityQuickEntry}
        handleSetTabFieldSuggestionDependencies={handleSetTabFieldSuggestionDependencies}
        requestPropagateFieldSuggestionDependenciesToLon={requestPropagateFieldSuggestionDependenciesToLon}
        requestPropagateEntityQuickEntryToLon={requestPropagateEntityQuickEntryToLon}
        requestPropagateEntityQuickEntryToAllLons={requestPropagateEntityQuickEntryToAllLons}
        requestPropagateMapParentTierSchemaToLon={requestPropagateMapParentTierSchemaToLon}
        requestPropagateMapParentTierFieldMapToLon={requestPropagateMapParentTierFieldMapToLon}
      />
      <ModalMilestone
        isOpen={isMilestoneModalOpen}
        onClose={() => setIsMilestoneModalOpen(false)}
        onOpenAutoSyncGuide={setIsAutoSyncGuideOpen ? () => setIsAutoSyncGuideOpen(true) : undefined}
        onSave={handleSaveMilestone}
        initialData={editingMilestoneData}
        lockChapterAfterRename={lockMilestoneChapterAfterRename}
        defaultChapterWhenNew={
          editingMilestoneData
            ? undefined
            : String(Math.max(0, parseInt(activeNovelData?.readingAnchorChapter ?? activeNovelData?.chaptersRead ?? 0, 10) || 0))
        }
        tabConfig={currentTabConfig}
        onUpdateTemplate={handleUpdateTabTemplate}
        handleAvatarDrop={handleAvatarDrop}
        handlePickLocalImage={handlePickLocalImage}
        dirHandle={currentContextDirHandle}
        parentTabId={activeTabLon}
        parentLabel={currentTabConfig?._parentLabel}
        geminiApiKey={geminiApiKeys}
        geminiMode={aiMode}
        entityMap={entityMap}
        statusTierLabelSet={statusTierLabelSet}
        showToast={showToast}
        autoLinkToastEnabled={autoLinkToastEnabled}
      />
      <ModalDescription
        isOpen={!!isDescriptionModalOpen}
        onClose={() => setIsDescriptionModalOpen?.(false)}
        onSave={handleSaveDescription}
        initialData={editingDescriptionData}
        defaultChapterWhenNew={
          editingDescriptionData
            ? undefined
            : String(Math.max(0, parseInt(activeNovelData?.readingAnchorChapter ?? activeNovelData?.chaptersRead ?? 0, 10) || 0))
        }
      />
      <ModalSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        handleConnectFolder={handleConnectFolder}
        dirHandle={dirHandle}
        dirName={dirName}
        onExportBackup={handleExportBackup}
        onExportIndexOnly={handleExportIndexOnly}
        onImportBackup={handleImportBackup}
        onCleanupLegacyIndexFiles={handleCleanupLegacyIndexFiles}
        onRequestRecalculateLibraryStats={requestRecalculateLibraryStats}
        libraryNovelCount={novelsMetadata?.length ?? 0}
        isStatsBackfilling={isStatsBackfilling}
        geminiApiKeys={geminiApiKeys}
        setGeminiApiKeys={handleSaveApiKeys}
        aiMode={aiMode}
        setAiMode={setAiMode}
        wikiExactMatchOnly={wikiExactMatchOnly}
        setWikiExactMatchOnly={setWikiExactMatchOnly}
        performanceMode={performanceMode}
        setPerformanceMode={setPerformanceMode}
        autoLinkToastEnabled={autoLinkToastEnabled}
        setAutoLinkToastEnabled={setAutoLinkToastEnabled}
      />
      <AppModalAutoSyncGuide
        isOpen={isAutoSyncGuideOpen}
        onClose={() => setIsAutoSyncGuideOpen?.(false)}
      />
      <AppModalEntityNotesGuide
        isOpen={isEntityNotesGuideOpen}
        onClose={() => setIsEntityNotesGuideOpen?.(false)}
      />
      {isCommandPaletteOpen && (
        <AppModalLenhNhanh
          onClose={() => setIsCommandPaletteOpen(false)}
          commandPaletteQuery={commandPaletteQuery}
          setCommandPaletteQuery={setCommandPaletteQuery}
          commandPaletteFiltered={commandPaletteFiltered}
          onSelectCommand={(id) => {
            if (id === 'set') runCommandPaletteAction(() => setIsSettingsOpen(true));
            else if (id === 'deep') runCommandPaletteAction(() => setIsDeepSearchOpen(true));
            else if (id === 'innov') runCommandPaletteAction(() => setIsInNovelSearchOpen(true));
            else if (id === 'hub') runCommandPaletteAction(() => openOverviewHub());
            else if (id === 'home') runCommandPaletteAction(() => handleGoHome());
          }}
          onSelectNovel={(novel) => runCommandPaletteAction(() => { void handleSelectNovel(novel); })}
        />
      )}

      <ModalConfirm
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
      />
      <ModalInsertImage
        isOpen={isInsertImageModalOpen}
        onClose={() => setIsInsertImageModalOpen(false)}
        imageForm={imageForm}
        setImageForm={setImageForm}
        handleConfirmInsertImage={handleConfirmInsertImage}
      />
      <ModalAddNovel
        isOpen={isAddNovelOpen}
        onClose={() => setIsAddNovelOpen(false)}
        formData={novelForm}
        setFormData={setNovelForm}
        onSave={handleSaveNovelModal}
        mode={novelModalMode}
        handlePickLocalImage={(cb) => handlePickCoverImage(cb)}
        dirHandle={currentContextDirHandle}
      />
      <ModalDeepSearch
        isOpen={isDeepSearchOpen}
        onClose={() => setIsDeepSearchOpen(false)}
        novelsMetadata={novelsMetadata}
        performDeepSearch={performDeepSearch}
        onSelectResult={handleDeepSearchResultSelect}
      />
      {activeNovelData && (
        <ModalInNovelSearch
          isOpen={isInNovelSearchOpen}
          onClose={() => setIsInNovelSearchOpen(false)}
          novel={activeNovelData}
          onSelectResult={handleDeepSearchResultSelect}
        />
      )}
      {xrefAiPanel && (
        <AppModalGoiYNoiTraCuu
          panel={xrefAiPanel}
          onClose={() => setXrefAiPanel(null)}
          findEntitiesByXrefHint={findEntitiesByXrefHint}
          applyXrefSuggestionNewEntity={applyXrefSuggestionNewEntity}
          applyXrefSuggestionMilestone={applyXrefSuggestionMilestone}
          applyXrefSuggestionProfile={applyXrefSuggestionProfile}
          activeNovelData={activeNovelData}
        />
      )}
      {overviewHubOpen && activeNovelData && (
        <AppModalMotCua
          activeNovelData={activeNovelData}
          onClose={() => setOverviewHubOpen(false)}
          overviewHubTab={overviewHubTab}
          setOverviewHubTab={setOverviewHubTab}
          hubCreatePath={hubCreatePath}
          setHubCreatePath={setHubCreatePath}
          hubCreateInput={hubCreateInput}
          setHubCreateInput={setHubCreateInput}
          hubCreateBusy={hubCreateBusy}
          hubCreatePreview={hubCreatePreview}
          setHubCreatePreview={setHubCreatePreview}
          hubUpdateChapter={hubUpdateChapter}
          setHubUpdateChapter={setHubUpdateChapter}
          hubUpdateText={hubUpdateText}
          setHubUpdateText={setHubUpdateText}
          hubUpdatePanel={hubUpdatePanel}
          setHubUpdatePanel={setHubUpdatePanel}
          activeTabs={activeTabs}
          hubRunCreateAi={hubRunCreateAi}
          hubSaveCreateEntity={hubSaveCreateEntity}
          runHubUpdateAi={runHubUpdateAi}
          applyHubUpdateSelected={applyHubUpdateSelected}
          findEntitiesByXrefHint={findEntitiesByXrefHint}
        />
      )}
      <ModalQuickCreate
        isOpen={!!quickCreateData}
        onClose={() => setQuickCreateData(null)}
        quickCreateName={quickCreateData}
        onConfirm={handleConfirmQuickCreate}
        activeTabs={activeTabs}
        activeNovelData={activeNovelData}
        onOpenExisting={handleNavigate}
      />

      {isManageTabsOpen && (
        <AppModalQuanLyTab
          activeNovelData={activeNovelData}
          onClose={() => setIsManageTabsOpen(false)}
          sortedTabs={sortedTabs}
          editingTab={editingTab}
          setEditingTab={setEditingTab}
          handleAddTabLon={handleAddTabLon}
          handleSaveEditLabel={handleSaveEditLabel}
          handleSaveTabIcon={handleSaveTabIcon}
          handleSaveTabIconImage={handleSaveTabIconImage}
          handleSaveSubTabIconImage={handleSaveSubTabIconImage}
          handleToggleViewType={handleToggleViewType}
          handleDeleteTab={handleDeleteTab}
          handleAddTabNho={handleAddTabNho}
          handleAddTabCon={handleAddTabCon}
          handleSetTabAutoSyncRole={handleSetTabAutoSyncRole}
          handleSetTabAutoSyncTargets={handleSetTabAutoSyncTargets}
          handleSetTabAutoSyncLevels={handleSetTabAutoSyncLevels}
          handleSetTabAutoSyncFieldMap={handleSetTabAutoSyncFieldMap}
          handleSetTabMapEntrySuggestions={handleSetTabMapEntrySuggestions}
          handleSetTabTemplateFieldSortPrefix={handleSetTabTemplateFieldSortPrefix}
          handleApplySuggestedAutoSyncSetup={handleApplySuggestedAutoSyncSetup}
          handleBulkDisableTabAutoSync={handleBulkDisableTabAutoSync}
          handleResyncAutoTabs={handleResyncAutoTabs}
          handleSaveCurrentTabsAsGenreTemplate={handleSaveCurrentTabsAsGenreTemplate}
          handleResetNovelSuggestionLists={handleResetNovelSuggestionLists}
          activeTabLon={activeTabLon}
          setConfirmDialog={setConfirmDialog}
          showToast={showToast}
        />
      )}
    </Suspense>
  );
}
