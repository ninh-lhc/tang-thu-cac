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

const AppModalMotCua = lazy(() => import('./AppModalMotCua.jsx').then((m) => ({ default: m.AppModalMotCua })));
const AppModalQuanLyTab = lazy(() => import('./AppModalQuanLyTab.jsx').then((m) => ({ default: m.AppModalQuanLyTab })));
const AppModalLenhNhanh = lazy(() => import('./AppModalLenhNhanh.jsx').then((m) => ({ default: m.AppModalLenhNhanh })));
const AppModalGoiYNoiTraCuu = lazy(() => import('./AppModalGoiYNoiTraCuu.jsx').then((m) => ({ default: m.AppModalGoiYNoiTraCuu })));

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
  handleSaveMilestone,
  editingMilestoneData,
  activeNovelData,
  entityMap,
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
  handleToggleViewType,
  handleDeleteTab,
  handleAddTabNho,
  handleAddTabCon,
}) {
  return (
    <Suspense fallback={null}>
      <ModalEntity
        isOpen={isEntityModalOpen}
        onClose={() => setIsEntityModalOpen(false)}
        onSave={handleSaveEntity}
        initialData={editingEntityData}
        tabConfig={currentTabConfig}
        onUpdateTemplate={handleUpdateTabTemplate}
        handleAvatarDrop={handleAvatarDrop}
        handlePickLocalImage={handlePickLocalImage}
        dirHandle={currentContextDirHandle}
        parentTabId={activeTabLon}
        parentLabel={currentTabConfig?._parentLabel}
        geminiApiKey={geminiApiKeys}
        geminiMode={aiMode}
      />
      <ModalMilestone
        isOpen={isMilestoneModalOpen}
        onClose={() => setIsMilestoneModalOpen(false)}
        onSave={handleSaveMilestone}
        initialData={editingMilestoneData}
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
        showToast={showToast}
        autoLinkToastEnabled={autoLinkToastEnabled}
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
          handleToggleViewType={handleToggleViewType}
          handleDeleteTab={handleDeleteTab}
          handleAddTabNho={handleAddTabNho}
          handleAddTabCon={handleAddTabCon}
          setConfirmDialog={setConfirmDialog}
        />
      )}
    </Suspense>
  );
}
