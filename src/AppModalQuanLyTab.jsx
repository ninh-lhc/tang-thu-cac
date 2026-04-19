/**
 * Modal quan ly cau truc tab (Tran Phap Cai Tao).
 * State va handler duoc truyen tu App.jsx de giu mot nguon su that.
 * Day la noi cau hinh auto theo cay muc luc va trigger resync khi can.
 */
import React from 'react';
import {
  Network,
  Plus,
  X,
  Save,
  Edit2,
  Trash2,
  LayoutGrid,
  AlignLeft,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Upload,
  ImageOff,
  ArrowLeftRight,
} from 'lucide-react';
import { safeString, getIconComponent } from './MasterUtils.jsx';
import { WIKI_ALIAS_FIELD } from './MasterEngines.js';
import { isMapCollectionScope } from './lib/mapHierarchySync.js';
import { pickDefaultQuickFieldIds } from './lib/entityQuickEntrySlots.js';
import { useFocusTrap } from './lib/useFocusTrap.js';
import {
  getEffectiveAutoSyncRole,
  readExplicitAutoSyncRole,
} from './lib/tabAutoSyncRole.js';
import { getAutoSyncFieldDefs, getEffectiveAutoSyncFieldMap } from './lib/tabAutoSyncFieldMap.js';
import { collectNovelAutoSyncDiagnostics } from './lib/autoSyncDiagnostics.js';
import {
  getAutoSyncLinkTargetLabel,
  guessAutoSyncTargetPathsForTab,
  listAutoSyncTargetCandidates,
  resolveExplicitAutoSyncTargets,
  supportsAutoSyncLinkRole,
} from './lib/tabAutoSyncLinks.js';
import {
  AUTO_SYNC_LEVEL_3,
  AUTO_SYNC_LEVEL_4,
  getEffectiveTabAutoSyncLevelConfig,
} from './lib/tabAutoSyncLevels.js';
import {
  TAB_ICON_OPTIONS,
  extractNovelGenres,
  getAutoRoleCardGroups,
  getAutoRoleUiCopy,
  getAutoRoleSelectLabel,
  getAutoModeSummary,
  getAutoModeHint,
  getAutoModeExample,
  isAutoRoleEnabled,
  getFriendlyWarningText,
  getTabHealthCopy,
  buildSimpleSetupSteps,
} from './lib/appModalQuanLyTabHelpers.js';

export function AppModalQuanLyTab({
  activeNovelData,
  onClose,
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
  handleMergeTabFieldSuggestionList,
  handleAddTabTemplateField,
  handleRemoveTabTemplateField,
  handleRenameTabTemplateFieldLabel,
  handleSetTabEntityQuickEntry,
  handleApplySuggestedAutoSyncSetup,
  handleResyncAutoTabs,
  handleSaveCurrentTabsAsGenreTemplate,
  setConfirmDialog,
}) {
  const trapRef = useFocusTrap(true);
  const [extraFieldDraftByPath, setExtraFieldDraftByPath] = React.useState({});
  const [advancedOpenByPath, setAdvancedOpenByPath] = React.useState({});
  const [expandedRoleChoicesByPath, setExpandedRoleChoicesByPath] = React.useState({});
  const [openAutoTabPath, setOpenAutoTabPath] = React.useState(null);
  const [showAutoOverview, setShowAutoOverview] = React.useState(false);
  const novelGenres = React.useMemo(() => extractNovelGenres(activeNovelData), [activeNovelData]);
  const diagnostics = React.useMemo(
    () => (activeNovelData ? collectNovelAutoSyncDiagnostics(activeNovelData) : null),
    [activeNovelData]
  );
  const diagnosticsByPath = React.useMemo(
    () => new Map((diagnostics?.tabReports || []).map((report) => [report.id, report])),
    [diagnostics]
  );
  const simpleSetupSteps = React.useMemo(() => buildSimpleSetupSteps(diagnostics), [diagnostics]);
  const lonIconInputRefById = React.useRef({});
  const nhoIconInputRefByPath = React.useRef({});

  const normalizeIconImageFile = React.useCallback((file, onDone) => {
    if (!file || typeof onDone !== 'function') return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = safeString(reader.result);
      if (!src) return;
      const img = new Image();
      img.onload = () => {
        const rawW = Number(img.width) || 0;
        const rawH = Number(img.height) || 0;
        if (rawW <= 0 || rawH <= 0) {
          onDone(src);
          return;
        }
        const size = 64;
        const cropSize = Math.min(rawW, rawH);
        const sx = Math.max(0, Math.floor((rawW - cropSize) / 2));
        const sy = Math.max(0, Math.floor((rawH - cropSize) / 2));
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          onDone(src);
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, size, size);
        const output = canvas.toDataURL('image/webp', 0.86);
        onDone(safeString(output) || src);
      };
      img.onerror = () => onDone(src);
      img.src = src;
    };
    reader.readAsDataURL(file);
  }, []);

  const toggleAdvancedSection = React.useCallback((pathKey) => {
    setAdvancedOpenByPath((prev) => ({
      ...prev,
      [pathKey]: !prev[pathKey],
    }));
  }, []);

  const toggleRoleChoicesSection = React.useCallback((pathKey) => {
    setExpandedRoleChoicesByPath((prev) => ({
      ...prev,
      [pathKey]: !prev[pathKey],
    }));
  }, []);

  const toggleAutoTabPanel = React.useCallback((pathKey) => {
    setOpenAutoTabPath((prev) => (prev === pathKey ? null : pathKey));
  }, []);

  const toggleAutoOverview = React.useCallback(() => {
    setShowAutoOverview((prev) => !prev);
  }, []);

  const flushFocusedEditor = React.useCallback(() => {
    const activeEl = document.activeElement;
    const root = trapRef.current;
    if (!root || !activeEl || !root.contains(activeEl)) return;
    const tag = safeString(activeEl.tagName).toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      activeEl.blur();
    }
  }, [trapRef]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Tran phap cai tao"
    >
      <div
        ref={trapRef}
        className="bg-slate-900 border border-amber-700/50 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-900/30 text-amber-500 rounded-xl border border-amber-500/20">
              <Network size={24} />
            </div>
            <div>
              <h2 className="text-xl font-heading font-bold text-amber-400">
                Trận Pháp Cải Tạo {activeNovelData ? `(${safeString(activeNovelData.title)})` : '(Cấu trúc Mẫu)'}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAddTabLon}
              className="px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-lg text-sm font-bold shadow-lg flex items-center gap-2"
            >
              <Plus size={16} /> Tab Lớn
            </button>
            <button
              type="button"
              onClick={() => {
                flushFocusedEditor();
                onClose();
              }}
              className="text-slate-400 hover:text-white p-2 bg-slate-800 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div id="tab-manager-scroll-container" className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4 bg-slate-900/50">
          {diagnostics && (
            <div className="rounded-2xl border border-cyan-800/35 bg-cyan-950/15 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-cyan-300 font-bold">
                    Thiết Lập AUTO
                  </div>
                  <p className="text-sm text-slate-100 font-semibold mt-1">
                    Mặc định giữ cây thư mục gọn. Khi cần mới mở từng tab AUTO hoặc bảng tổng AUTO.
                  </p>
                  {novelGenres.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {novelGenres.slice(0, 3).map((genre) => (
                        <span
                          key={genre}
                          className="rounded-full border border-cyan-700/35 bg-cyan-950/20 px-2.5 py-1 text-[10px] uppercase tracking-wide text-cyan-100 font-semibold"
                        >
                          Ưu tiên theo thể loại: {safeString(genre)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleAutoOverview}
                    className="px-4 py-2.5 rounded-xl border border-slate-700/60 bg-slate-950/40 text-slate-100 text-sm font-bold flex items-center gap-2 hover:bg-slate-900/60"
                  >
                    {showAutoOverview ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    {showAutoOverview ? 'Ẩn Bảng AUTO' : 'Mở Bảng AUTO'}
                  </button>
                  {typeof handleApplySuggestedAutoSyncSetup === 'function' && (
                    <button
                      type="button"
                      onClick={handleApplySuggestedAutoSyncSetup}
                      className="px-4 py-2.5 rounded-xl border border-cyan-700/40 bg-cyan-950/30 text-cyan-100 text-sm font-bold flex items-center gap-2 hover:bg-cyan-900/30"
                    >
                      <Sparkles size={15} /> Áp Preset AUTO Theo Thể Loại
                    </button>
                  )}
                  {typeof handleSaveCurrentTabsAsGenreTemplate === 'function' && (
                    <button
                      type="button"
                      onClick={handleSaveCurrentTabsAsGenreTemplate}
                      className="px-4 py-2.5 rounded-xl border border-emerald-700/40 bg-emerald-950/25 text-emerald-100 text-sm font-bold flex items-center gap-2 hover:bg-emerald-900/30"
                    >
                      <Save size={15} /> Lưu Cây Này Thành Mẫu
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-emerald-700/30 bg-emerald-950/20 px-3 py-1 text-[11px] font-semibold text-emerald-200">
                  Đã rõ: {diagnostics.summary.readyCount}
                </span>
                <span className="rounded-full border border-amber-700/30 bg-amber-950/20 px-3 py-1 text-[11px] font-semibold text-amber-200">
                  Cần xem lại: {diagnostics.summary.warningCount}
                </span>
                <span className="rounded-full border border-cyan-700/30 bg-cyan-950/20 px-3 py-1 text-[11px] font-semibold text-cyan-100">
                  Khóa / tắt: {diagnostics.summary.lockedCount} / {diagnostics.summary.disabledCount}
                </span>
                <span className="rounded-full border border-fuchsia-700/30 bg-fuchsia-950/20 px-3 py-1 text-[11px] font-semibold text-fuchsia-100">
                  Sẽ cập nhật: {diagnostics.preview.touchedEntityCount}
                </span>
              </div>

              {showAutoOverview && (
                <>
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/55 px-3 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500 font-bold">Đã rõ mục nào</div>
                      <div className="mt-1 text-2xl font-bold text-emerald-300">{diagnostics.summary.readyCount}</div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/55 px-3 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500 font-bold">Cần xem lại</div>
                      <div className="mt-1 text-2xl font-bold text-amber-300">{diagnostics.summary.warningCount}</div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/55 px-3 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500 font-bold">Đang khóa / tắt</div>
                      <div className="mt-1 text-2xl font-bold text-cyan-100">
                        {diagnostics.summary.lockedCount} / {diagnostics.summary.disabledCount}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/55 px-3 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500 font-bold">Sẽ cập nhật</div>
                      <div className="mt-1 text-2xl font-bold text-fuchsia-200">{diagnostics.preview.touchedEntityCount}</div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500 font-bold mb-2">Làm theo 3 bước</div>
                    <div className="space-y-1.5">
                      {simpleSetupSteps.map((step, index) => (
                        <div key={`${step}-${index}`} className="text-sm text-slate-300 font-serif">
                          {index + 1}. {step}
                        </div>
                      ))}
                    </div>
                    {diagnostics.preview.forceWarning && (
                      <div className="mt-3 rounded-xl border border-amber-700/40 bg-amber-950/25 px-3 py-2 text-sm text-amber-100 font-serif">
                        {diagnostics.preview.forceWarning}
                      </div>
                    )}
                  </div>

                  {diagnostics.recentLogs.length > 0 && (
                    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500 font-bold mb-2">Lịch sử AUTO gần đây</div>
                      <div className="space-y-2">
                        {diagnostics.recentLogs.slice(0, 3).map((item) => (
                          <div key={item.id} className="rounded-xl border border-slate-800/80 bg-slate-950/50 px-3 py-2">
                            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide">
                              <span className={item.changed ? 'text-emerald-300 font-bold' : 'text-slate-500 font-bold'}>
                                {item.changed ? 'Đã cập nhật' : 'Không thay đổi'}
                              </span>
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-400">{safeString(item.scopeLabel || 'AUTO')}</span>
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-500">
                                {item.at ? new Date(item.at).toLocaleString('vi-VN') : ''}
                              </span>
                            </div>
                            <div className="mt-1 text-sm text-slate-300 font-serif">
                              {(item.engines || [])
                                .map((engine) => safeString(engine.label || engine.id))
                                .filter(Boolean)
                                .join(', ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {sortedTabs.map((tabLon) => (
            <div key={tabLon.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-inner">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-amber-600 bg-amber-950/50 p-2 rounded-lg overflow-hidden">
                    {safeString(tabLon.iconImage).trim() ? (
                      <img src={tabLon.iconImage} alt="" className="w-4 h-4 object-cover rounded-sm" />
                    ) : (
                      getIconComponent(tabLon.iconName)
                    )}
                  </span>
                  {!tabLon.isFixed && (
                    <select
                      value={safeString(tabLon.iconName) || 'ScrollText'}
                      onChange={(e) => handleSaveTabIcon?.(tabLon.id, e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 outline-none hover:border-slate-500"
                      title="Chọn icon cho tab lớn"
                    >
                      {TAB_ICON_OPTIONS.map((iconOpt) => (
                        <option key={iconOpt.value} value={iconOpt.value}>
                          {iconOpt.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {!tabLon.isFixed && (
                    <>
                      <input
                        ref={(el) => {
                          lonIconInputRefById.current[tabLon.id] = el;
                        }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          normalizeIconImageFile(file, (dataUrl) => handleSaveTabIconImage?.(tabLon.id, dataUrl));
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => lonIconInputRefById.current[tabLon.id]?.click()}
                        className="text-slate-300 hover:text-emerald-300 p-1.5 bg-slate-900 rounded-lg border border-slate-700"
                        title="Tải ảnh icon tab lớn"
                      >
                        <Upload size={13} />
                      </button>
                      {safeString(tabLon.iconImage).trim() && (
                        <button
                          type="button"
                          onClick={() => handleSaveTabIconImage?.(tabLon.id, '')}
                          className="text-slate-400 hover:text-rose-300 p-1.5 bg-slate-900 rounded-lg border border-slate-700"
                          title="Xóa ảnh icon tab lớn"
                        >
                          <ImageOff size={13} />
                        </button>
                      )}
                    </>
                  )}
                </div>
                {editingTab?.path === [tabLon.id].join('-') ? (
                  <div className="flex flex-1 items-center gap-2 pr-2">
                    <input
                      autoFocus
                      className="flex-1 bg-slate-900 border border-amber-600/50 rounded-lg px-3 py-1.5 text-sm text-slate-200 outline-none"
                      value={editingTab.label}
                      onChange={(e) => setEditingTab({ ...editingTab, label: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEditLabel([tabLon.id], editingTab.label);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEditLabel([tabLon.id], editingTab.label)}
                      className="text-emerald-500 bg-emerald-950 p-1.5 rounded-lg"
                    >
                      <Save size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full group">
                    <span className="font-serif text-base text-slate-100 font-bold">{safeString(tabLon.label)}</span>
                    <div className="flex items-center gap-2 opacity-20 group-hover:opacity-100 transition-opacity">
                      {!tabLon.isFixed && (
                        <button
                          type="button"
                          onClick={() => handleToggleViewType([tabLon.id])}
                          className="text-slate-400 hover:text-amber-400 p-1.5 bg-slate-900 rounded-lg"
                          title="Bật/tắt chế độ Danh Sách Bộ Sưu Tập"
                        >
                          {tabLon.viewType === 'collection-track' ? <LayoutGrid size={14} /> : <AlignLeft size={14} />}
                        </button>
                      )}
                      {!tabLon.isFixed && (
                        <button
                          type="button"
                          onClick={() => setEditingTab({ path: [tabLon.id].join('-'), label: tabLon.label })}
                          className="text-slate-400 hover:text-blue-400 p-1.5 bg-slate-900 rounded-lg"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                      {!tabLon.isFixed && (
                        <button
                          type="button"
                          onClick={() => {
                            flushFocusedEditor();
                            setConfirmDialog({
                              isOpen: true,
                              title: 'Hủy Diệt',
                              message: `Xóa vĩnh viễn <b>${safeString(tabLon.label)}</b> cùng mọi thứ bên trong?`,
                              onConfirm: () => handleDeleteTab([tabLon.id]),
                            });
                          }}
                          className="text-slate-400 hover:text-rose-400 p-1.5 bg-slate-900 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      {!tabLon.isFixed && (
                        <button
                          type="button"
                          onClick={() => handleAddTabNho(tabLon.id)}
                          className="text-slate-300 hover:text-emerald-400 p-1.5 bg-slate-800 rounded-lg ml-2 flex items-center gap-1 text-xs font-bold border border-slate-700"
                        >
                          <Plus size={12} /> Thêm Chương Mục
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {!tabLon.isFixed && tabLon.subTabs?.length > 0 && (
                <div className="mt-4 pl-8 space-y-3 border-l-2 border-slate-800/80">
                  {tabLon.subTabs.map((tabNho) => {
                    const tabAutoContext = {
                      activeTabLon: tabLon.id,
                      activeTabNho: tabNho.id,
                      currentTabConfig: tabNho,
                      parentLabel: tabLon.label || '',
                    };
                    const explicitRole = readExplicitAutoSyncRole(tabNho);
                    const effectiveRole = getEffectiveAutoSyncRole(tabAutoContext);
                    const autoFieldDefs = getAutoSyncFieldDefs(effectiveRole);
                    const autoFieldMap = getEffectiveAutoSyncFieldMap(tabAutoContext);
                    const templateFields = Array.isArray(tabNho.fieldsTemplate)
                      ? tabNho.fieldsTemplate.filter((field) => field && safeString(field.id).trim())
                      : [];
                    const isMapTab = isMapCollectionScope({
                      activeTabLon: tabLon.id,
                      activeTabNho: tabNho.id,
                      currentTabConfig: tabNho,
                      parentLabel: tabLon.label || '',
                    });
                    const tabPathKey = `${tabLon.id}::${tabNho.id}`;
                    const tabReport = diagnosticsByPath.get(tabPathKey);
                    const supportsLink = supportsAutoSyncLinkRole(effectiveRole);
                    const targetCandidates = supportsLink ? listAutoSyncTargetCandidates(sortedTabs, tabAutoContext) : [];
                    const selectedTargets = supportsLink ? resolveExplicitAutoSyncTargets(sortedTabs, tabAutoContext) : [];
                    const autoLevelConfig = getEffectiveTabAutoSyncLevelConfig(tabNho);
                    const practicalRole = explicitRole || effectiveRole || '';
                    const auto3SourceEligible = practicalRole === 'the-luc';
                    const isMainCharacterRole = effectiveRole === 'nhan-vat-chinh';
                    const isCultivationSystemRole = effectiveRole === 'he-thong-tu-luyen';
                    const hasCultivationTargetSameParent = isCultivationSystemRole
                      ? targetCandidates.some((candidate) => safeString(candidate.lonId) === safeString(tabLon.id))
                      : false;
                    const auto3Recommended = supportsLink && !isMainCharacterRole && !hasCultivationTargetSameParent;
                    const auto3SourceActive = autoLevelConfig.levels[AUTO_SYNC_LEVEL_3] && selectedTargets.length > 0;
                    const toggleAuto3SourceMode = () => {
                      if (!auto3SourceEligible) return;
                      if (auto3SourceActive) {
                        handleSetTabAutoSyncTargets?.(tabLon.id, tabNho.id, []);
                        handleSetTabAutoSyncLevels?.(tabLon.id, tabNho.id, {
                          ...autoLevelConfig,
                          enabled: true,
                          levels: {
                            ...autoLevelConfig.levels,
                            [AUTO_SYNC_LEVEL_3]: false,
                          },
                        });
                        return;
                      }
                      const guessedTargets = guessAutoSyncTargetPathsForTab(sortedTabs, {
                        ...tabAutoContext,
                        role: 'the-luc',
                      }).slice(0, 1);
                      handleSetTabAutoSyncTargets?.(tabLon.id, tabNho.id, guessedTargets);
                      handleSetTabAutoSyncLevels?.(tabLon.id, tabNho.id, {
                        ...autoLevelConfig,
                        enabled: true,
                        levels: {
                          ...autoLevelConfig.levels,
                          [AUTO_SYNC_LEVEL_3]: guessedTargets.length > 0,
                        },
                      });
                    };
                    const applyPracticalPreset = () => {
                      const roleToUse = practicalRole;
                      if (!roleToUse) return;
                      handleSetTabAutoSyncRole?.(tabLon.id, tabNho.id, roleToUse);

                      const roleLinkSupported = supportsAutoSyncLinkRole(roleToUse);
                      let nextTargetPaths = [];
                      if (roleLinkSupported) {
                        const roleCandidates = listAutoSyncTargetCandidates(sortedTabs, {
                          ...tabAutoContext,
                          role: roleToUse,
                        });
                        if (roleToUse === 'the-luc') {
                          nextTargetPaths = guessAutoSyncTargetPathsForTab(sortedTabs, {
                            ...tabAutoContext,
                            role: roleToUse,
                          }).slice(0, 1);
                        } else if (roleToUse === 'he-thong-tu-luyen') {
                          const crossParentCandidates = roleCandidates.filter(
                            (candidate) => safeString(candidate.lonId).trim() !== safeString(tabLon.id).trim()
                          );
                          nextTargetPaths = crossParentCandidates.length === 1 ? [crossParentCandidates[0].pathKey] : [];
                        }
                      }
                      handleSetTabAutoSyncTargets?.(tabLon.id, tabNho.id, nextTargetPaths);

                      const level3Enabled = nextTargetPaths.length > 0;
                      const level4Enabled = roleToUse === 'nhan-vat-chinh';
                      handleSetTabAutoSyncLevels?.(tabLon.id, tabNho.id, {
                        ...autoLevelConfig,
                        enabled: true,
                        levels: {
                          ...autoLevelConfig.levels,
                          [AUTO_SYNC_LEVEL_3]: level3Enabled,
                          [AUTO_SYNC_LEVEL_4]: level4Enabled,
                        },
                      });
                    };
                    const linkTargetLabel = getAutoSyncLinkTargetLabel(effectiveRole);
                    const autoRoleSummary = getAutoModeSummary({
                      explicitRole,
                      effectiveRole,
                      linkTargetCount: selectedTargets.length,
                    });
                    const autoRoleHint = getAutoModeHint({
                      explicitRole,
                      effectiveRole,
                      supportsLink,
                      linkTargetCount: selectedTargets.length,
                    });
                    const autoRoleExample = getAutoModeExample({
                      explicitRole,
                      effectiveRole,
                      supportsLink,
                    });
                    const healthCopy = getTabHealthCopy(tabReport);
                    const HealthIcon = healthCopy.icon;
                    const autoEnabled = isAutoRoleEnabled(explicitRole || effectiveRole || '__local__');
                    const isAutoPanelOpen = openAutoTabPath === tabPathKey;
                    const advancedOverride = advancedOpenByPath[tabPathKey];
                    const roleCardGroups = getAutoRoleCardGroups({
                      tabLon,
                      tabNho,
                      explicitRole,
                      effectiveRole,
                      novelGenres,
                    });
                    const showAllRoleChoices = Boolean(expandedRoleChoicesByPath[tabPathKey]);
                    const showAdvanced =
                      typeof advancedOverride === 'boolean'
                        ? advancedOverride
                        : Boolean(tabReport?.warnings?.length);
                    const renderRoleCard = (roleValue, group = 'visible') => {
                      const copy = getAutoRoleUiCopy(roleValue);
                      const isManualActive = explicitRole === roleValue;
                      const isAutoModeCard = roleValue === '' && !explicitRole;
                      const isSuggested = !explicitRole && roleValue !== '' && effectiveRole === roleValue;
                      const isActive = isManualActive || isAutoModeCard;
                      const baseClass = isActive
                        ? 'border-amber-600/60 bg-amber-950/25 text-amber-50'
                        : isSuggested
                          ? 'border-cyan-700/45 bg-cyan-950/20 text-cyan-50'
                          : group === 'hidden'
                            ? 'border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-600 hover:bg-slate-900/80'
                            : 'border-slate-800 bg-slate-950/70 text-slate-200 hover:border-slate-600 hover:bg-slate-900';

                      return (
                        <button
                          key={`${group}-${roleValue || '__auto__'}`}
                          type="button"
                          onClick={() => handleSetTabAutoSyncRole(tabLon.id, tabNho.id, roleValue)}
                          className={`rounded-xl border p-3 text-left transition-all ${baseClass}`}
                          aria-pressed={isActive}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="text-sm font-semibold">{copy.selectLabel}</div>
                            {isManualActive && (
                              <span className="shrink-0 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-100">
                                Đang dùng
                              </span>
                            )}
                            {isAutoModeCard && !isManualActive && (
                              <span className="shrink-0 rounded-full border border-slate-600/50 bg-slate-900/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-200">
                                Mặc định
                              </span>
                            )}
                            {isSuggested && (
                              <span className="shrink-0 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-cyan-100">
                                AUTO gợi ý
                              </span>
                            )}
                          </div>
                          <div className="mt-2 text-[12px] font-serif text-slate-300">{copy.helper}</div>
                          <div className="mt-2 text-[11px] font-serif text-slate-500">{copy.example}</div>
                        </button>
                      );
                    };
                    return (
                      <div key={tabNho.id} className="relative">
                        <div className="absolute -left-8 top-4 w-6 h-0.5 bg-slate-800/80"></div>
                        <div className="bg-slate-900/80 border border-slate-700/50 p-3 rounded-xl flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                            {editingTab?.path === [tabLon.id, tabNho.id].join('-') ? (
                              <div className="flex flex-1 items-center gap-2">
                                <input
                                  autoFocus
                                  className="flex-1 bg-slate-950 border border-amber-600/50 rounded-lg px-3 py-1.5 text-sm text-slate-200 outline-none"
                                  value={editingTab.label}
                                  onChange={(e) => setEditingTab({ ...editingTab, label: e.target.value })}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEditLabel([tabLon.id, tabNho.id], editingTab.label);
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditLabel([tabLon.id, tabNho.id], editingTab.label)}
                                  className="text-emerald-500 bg-emerald-950 p-1.5 rounded-lg"
                                >
                                  <Save size={16} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between w-full group">
                                <div className="flex items-center gap-2">
                                  {safeString(tabNho.iconImage).trim() ? (
                                    <span className="w-4 h-4 rounded-sm overflow-hidden border border-slate-700/80 flex-shrink-0">
                                      <img src={tabNho.iconImage} alt="" className="w-full h-full object-cover" />
                                    </span>
                                  ) : tabNho.viewType === 'collection-track' ? (
                                    <LayoutGrid size={14} className="text-amber-500" />
                                  ) : (
                                    <AlignLeft size={14} className="text-slate-600" />
                                  )}
                                  <div className="min-w-0">
                                    <span className="font-serif text-sm text-slate-200 font-medium block">{safeString(tabNho.label)}</span>
                                    {tabNho.viewType === 'collection-track' && (
                                      <span className="text-[10px] uppercase tracking-wide text-slate-500">
                                        {autoRoleSummary}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <>
                                    <input
                                      ref={(el) => {
                                        nhoIconInputRefByPath.current[`${tabLon.id}::${tabNho.id}`] = el;
                                      }}
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        normalizeIconImageFile(file, (dataUrl) =>
                                          handleSaveSubTabIconImage?.(tabLon.id, tabNho.id, dataUrl)
                                        );
                                        e.target.value = '';
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => nhoIconInputRefByPath.current[`${tabLon.id}::${tabNho.id}`]?.click()}
                                      className="text-slate-400 hover:text-emerald-300 p-1.5 bg-slate-800 rounded-lg border border-slate-700"
                                      title="Tải ảnh icon tab nhỏ"
                                    >
                                      <Upload size={13} />
                                    </button>
                                    {safeString(tabNho.iconImage).trim() && (
                                      <button
                                        type="button"
                                        onClick={() => handleSaveSubTabIconImage?.(tabLon.id, tabNho.id, '')}
                                        className="text-slate-400 hover:text-rose-300 p-1.5 bg-slate-800 rounded-lg border border-slate-700"
                                        title="Xóa ảnh icon tab nhỏ"
                                      >
                                        <ImageOff size={13} />
                                      </button>
                                    )}
                                  </>
                                  {tabNho.viewType === 'collection-track' && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => toggleAutoTabPanel(tabPathKey)}
                                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                                          isAutoPanelOpen
                                            ? 'bg-fuchsia-900/25 border-fuchsia-600/60 text-fuchsia-100 shadow-[0_0_0_1px_rgba(217,70,239,0.18)]'
                                            : autoEnabled
                                              ? 'bg-cyan-950/35 border-cyan-700/45 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.15)]'
                                              : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-200'
                                        }`}
                                        title={isAutoPanelOpen ? 'Ẩn mục AUTO của tab này' : 'Mở mục AUTO của tab này'}
                                      >
                                        AUTO
                                      </button>
                                    </>
                                  )}
                                  <div className="flex items-center gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleViewType([tabLon.id, tabNho.id])}
                                    className={`p-1.5 rounded-lg border transition-all ${tabNho.viewType === 'collection-track' ? 'bg-amber-900/20 border-amber-700/50 text-amber-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                                    title="Bật/Tắt chế độ Quản lý Vạn Vật (Lưới & Timeline)"
                                  >
                                    <LayoutGrid size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingTab({ path: [tabLon.id, tabNho.id].join('-'), label: tabNho.label })
                                    }
                                    className="text-slate-400 p-1.5 bg-slate-800 rounded-lg hover:text-blue-400 ml-1"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      flushFocusedEditor();
                                      setConfirmDialog({
                                        isOpen: true,
                                        title: 'Hủy Diệt',
                                        message: `Xóa <b>${safeString(tabNho.label)}</b>?`,
                                        onConfirm: () => handleDeleteTab([tabLon.id, tabNho.id]),
                                      });
                                    }}
                                    className="text-slate-400 p-1.5 bg-slate-800 rounded-lg hover:text-rose-400"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                  {tabNho.viewType !== 'collection-track' && (
                                    <button
                                      type="button"
                                      onClick={() => handleAddTabCon(tabLon.id, tabNho.id)}
                                      className="text-slate-300 hover:text-emerald-400 p-1.5 bg-slate-800 rounded-lg ml-2 flex items-center gap-1 text-xs font-bold border border-slate-700"
                                    >
                                      <Plus size={12} /> Tiểu Mục
                                    </button>
                                  )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {tabNho.viewType === 'collection-track' && isAutoPanelOpen && (
                            <div className="border-t border-slate-800/80 pt-3 space-y-3">
                              <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-3 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div>
                                    <div className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">
                                      Mục này dùng để quản lý
                                    </div>
                                    <div className="text-[12px] text-slate-300 font-serif mt-1">
                                      Bấm 1 ô bên dưới để nói cho AUTO biết mục này đang chứa loại dữ liệu gì.
                                    </div>
                                  </div>
                                  {!explicitRole && effectiveRole && (
                                    <span className="rounded-full border border-cyan-700/40 bg-cyan-950/25 px-2 py-1 text-[11px] text-cyan-100 font-semibold">
                                      AUTO đang gợi ý: {getAutoRoleSelectLabel(effectiveRole)}
                                    </span>
                                  )}
                                  {explicitRole && (
                                    <span className="rounded-full border border-amber-700/40 bg-amber-950/25 px-2 py-1 text-[11px] text-amber-100 font-semibold">
                                      Đang chọn tay
                                    </span>
                                  )}
                                </div>

                                <div className="grid gap-2 md:grid-cols-2">
                                  {roleCardGroups.visibleRoles.map((roleValue) => renderRoleCard(roleValue, 'visible'))}
                                </div>

                                {roleCardGroups.hiddenRoles.length > 0 && (
                                  <div className="space-y-2">
                                    <button
                                      type="button"
                                      onClick={() => toggleRoleChoicesSection(tabPathKey)}
                                      className="w-full rounded-xl border border-slate-800 bg-slate-950/35 px-3 py-2.5 text-left text-sm font-semibold text-slate-200 flex items-center justify-between gap-3 hover:border-slate-700 hover:bg-slate-950/55"
                                    >
                                      <span>
                                        {showAllRoleChoices
                                          ? 'Thu gọn các lựa chọn ít phù hợp hơn'
                                          : `Xem thêm ${roleCardGroups.hiddenRoles.length} lựa chọn khác`}
                                      </span>
                                      {showAllRoleChoices ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>

                                    {showAllRoleChoices && (
                                      <div className="rounded-xl border border-slate-800/80 bg-slate-950/35 p-3 space-y-2">
                                        <div className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">
                                          Lựa chọn khác
                                        </div>
                                        <div className="grid gap-2 md:grid-cols-2">
                                          {roleCardGroups.hiddenRoles.map((roleValue) => renderRoleCard(roleValue, 'hidden'))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="rounded-xl border border-slate-800/90 bg-slate-950/40 px-3 py-2">
                                  <div className="text-[12px] text-slate-300 font-serif">{autoRoleHint}</div>
                                  <div className="text-[11px] text-slate-500 font-serif mt-1">{autoRoleExample}</div>
                                </div>
                              </div>

                              <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-3 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div>
                                    <div className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">
                                      AUTO nâng cao (bậc 3-4)
                                    </div>
                                    <div className="text-[12px] text-slate-300 font-serif mt-1">
                                      Bậc 1–2 <strong className="text-emerald-200/90">luôn bật</strong> (AUTO trong thẻ + thẻ Danh sách
                                      cùng tab), không tắt được. Chỉ chỉnh bậc 3–4 khi cần liên tab / timeline.
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={applyPracticalPreset}
                                      className="px-3 py-1.5 rounded-lg border border-cyan-700/50 bg-cyan-950/25 text-cyan-100 text-xs font-bold hover:bg-cyan-900/30"
                                    >
                                      Áp preset thực dụng
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSetTabAutoSyncLevels?.(tabLon.id, tabNho.id, {
                                          ...autoLevelConfig,
                                          enabled: !autoLevelConfig.enabled,
                                        })
                                      }
                                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${
                                        autoLevelConfig.enabled
                                          ? 'border-emerald-700/50 bg-emerald-950/25 text-emerald-100'
                                          : 'border-slate-700 bg-slate-900/80 text-slate-300'
                                      }`}
                                    >
                                      {autoLevelConfig.enabled ? 'AUTO: Đang bật' : 'AUTO: Đang tắt'}
                                    </button>
                                  </div>
                                </div>
                                <div className="rounded-lg border border-slate-800/80 bg-slate-950/35 px-3 py-2 text-[11px] text-slate-400 font-serif">
                                  Preset thực dụng: Thế lực ưu tiên liên tab với Bản đồ; Nhân vật chính ưu tiên bậc 4 timeline;
                                  Hệ thống tu luyện chỉ bật bậc 3 khi cần liên tab khác tab lớn.
                                </div>
                                <div className="grid gap-2 md:grid-cols-2">
                                  <div className="rounded-xl border border-emerald-700/35 bg-emerald-950/20 px-3 py-2 text-xs font-semibold text-emerald-100">
                                    Bậc 1: AUTO trong chính thẻ (mặc định)
                                  </div>
                                  <div className="rounded-xl border border-emerald-700/35 bg-emerald-950/20 px-3 py-2 text-xs font-semibold text-emerald-100">
                                    Bậc 2: AUTO thẻ Danh Sách cùng tab (mặc định)
                                  </div>
                                </div>
                                <div className="grid gap-2 md:grid-cols-2">
                                  {[
                                    [
                                      AUTO_SYNC_LEVEL_3,
                                      auto3Recommended
                                        ? 'Bậc 3: AUTO giữa thẻ có quan hệ'
                                        : 'Bậc 3: AUTO giữa thẻ có quan hệ (khuyến nghị để tắt)',
                                    ],
                                    [AUTO_SYNC_LEVEL_4, 'Bậc 4: AUTO timeline liên hệ'],
                                  ].map(([levelKey, label]) => {
                                    const isOn = autoLevelConfig.levels[levelKey];
                                    return (
                                      <button
                                        key={levelKey}
                                        type="button"
                                        disabled={!autoLevelConfig.enabled}
                                        onClick={() =>
                                          handleSetTabAutoSyncLevels?.(tabLon.id, tabNho.id, {
                                            ...autoLevelConfig,
                                            levels: {
                                              ...autoLevelConfig.levels,
                                              [levelKey]: !isOn,
                                            },
                                          })
                                        }
                                        className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors ${
                                          !autoLevelConfig.enabled
                                            ? 'border-slate-800 bg-slate-950/30 text-slate-600 cursor-not-allowed'
                                            : isOn
                                              ? 'border-cyan-700/50 bg-cyan-950/25 text-cyan-100'
                                              : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                                        }`}
                                      >
                                        {label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>


                              {explicitRole !== 'khong-tu-dong' && (
                                <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-3 space-y-3">
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                      <div className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">
                                        AUTO liên tab (mục 3, tối giản)
                                      </div>
                                      <div className="text-[12px] text-slate-300 font-serif mt-1">
                                        {auto3SourceEligible
                                          ? `Bật tab chủ là đủ. Hệ thống sẽ tự đẩy AUTO sang ${linkTargetLabel} nhận phù hợp.`
                                          : isMainCharacterRole
                                            ? 'Tab Nhân vật chính nên ưu tiên AUTO mục 4 (timeline). Mục 3 để tắt cho gọn.'
                                            : hasCultivationTargetSameParent
                                              ? 'Hệ thống tu luyện và Cảnh giới cùng tab lớn thì chỉ cần AUTO nội bộ (1-2).'
                                              : 'Mục này không cần AUTO liên tab trong preset tối giản.'}
                                      </div>
                                    </div>
                                    {auto3SourceEligible && (
                                      <button
                                        type="button"
                                        onClick={toggleAuto3SourceMode}
                                        className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold ${
                                          auto3SourceActive
                                            ? 'border-emerald-700/45 bg-emerald-950/25 text-emerald-100'
                                            : 'border-slate-700 bg-slate-950/60 text-slate-200 hover:border-slate-600 hover:bg-slate-900'
                                        }`}
                                      >
                                        {auto3SourceActive ? 'Đang là tab chủ AUTO 3' : 'Đặt làm tab chủ AUTO 3'}
                                      </button>
                                    )}
                                  </div>

                                  {!auto3SourceEligible && (
                                    <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 px-3 py-2 text-[12px] text-slate-400 font-serif">
                                      Mục này giữ AUTO nội bộ theo preset tối giản.
                                    </div>
                                  )}

                                  {auto3SourceEligible && targetCandidates.length === 0 && (
                                    <div className="rounded-xl border border-amber-700/30 bg-amber-950/20 px-3 py-2 text-[12px] text-amber-100 font-serif">
                                      Chưa tìm thấy {linkTargetLabel} nhận phù hợp nên chưa thể bật tab chủ AUTO 3.
                                    </div>
                                  )}

                                  {auto3SourceEligible && selectedTargets.length > 0 && (
                                    <div className="rounded-xl border border-cyan-700/30 bg-cyan-950/20 px-3 py-2 text-[12px] text-cyan-100 font-serif">
                                      Tab nhận AUTO 3: {safeString(selectedTargets[0]?.label || selectedTargets[0]?.pathKey)}.
                                    </div>
                                  )}
                                </div>
                              )}

                              {autoFieldDefs.length > 0 && (
                                <div className="space-y-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleAdvancedSection(tabPathKey)}
                                    className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm font-semibold flex items-center justify-between gap-3 ${
                                      tabReport?.warnings?.length
                                        ? 'border-amber-700/40 bg-amber-950/20 text-amber-100'
                                        : 'border-slate-800 bg-slate-950/45 text-slate-200'
                                    }`}
                                  >
                                    <span>
                                      {tabReport?.warnings?.length
                                        ? `Chỉnh trường nâng cao (${tabReport.warnings.length} chỗ cần xem lại)`
                                        : 'Chỉnh trường nâng cao nếu AUTO đang đọc sai dữ liệu'}
                                    </span>
                                    {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                  </button>

                                  {showAdvanced && (
                                    <div className="grid gap-2 md:grid-cols-2">
                                      {autoFieldDefs.map((def) => {
                                        const selectedFieldId = safeString(autoFieldMap[def.key]).trim();
                                        const selectedMissing =
                                          selectedFieldId &&
                                          !templateFields.some((field) => safeString(field.id).trim() === selectedFieldId);
                                        return (
                                          <label
                                            key={def.key}
                                            className="flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-950/70 p-2.5"
                                          >
                                            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                                              {safeString(def.label)}
                                            </span>
                                            <select
                                              value={selectedFieldId}
                                              onChange={(e) =>
                                                handleSetTabAutoSyncFieldMap(tabLon.id, tabNho.id, def.key, e.target.value)
                                              }
                                              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-serif outline-none focus:border-amber-600/50"
                                            >
                                              <option value="">Để AUTO tự đoán theo tên trường</option>
                                              {templateFields.map((field) => (
                                                <option key={field.id} value={field.id}>
                                                  {safeString(field.label || field.id)}
                                                </option>
                                              ))}
                                              {selectedMissing && (
                                                <option value={selectedFieldId}>
                                                  {selectedFieldId} (không còn trong mẫu)
                                                </option>
                                              )}
                                            </select>
                                            <span className="text-[11px] text-slate-500 font-serif">
                                              {def.hint}
                                            </span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}

                              {tabReport && (
                                <div className={`rounded-xl border p-3 space-y-2 ${healthCopy.boxClass}`}>
                                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                    <span className="uppercase tracking-wide text-slate-500 font-bold">
                                      Kiểm tra nhanh
                                    </span>
                                    <span className="rounded-full border border-slate-700 px-2 py-0.5 text-slate-300 font-semibold">
                                      {tabReport.entityCount} thực thể
                                    </span>
                                    {tabReport.lockedEntityCount > 0 && (
                                      <span className="rounded-full border border-amber-700/40 bg-amber-950/30 px-2 py-0.5 text-amber-200 font-semibold">
                                        {tabReport.lockedEntityCount} khóa
                                      </span>
                                    )}
                                    {tabReport.disabledEntityCount > 0 && (
                                      <span className="rounded-full border border-rose-700/40 bg-rose-950/30 px-2 py-0.5 text-rose-200 font-semibold">
                                        {tabReport.disabledEntityCount} tắt riêng
                                      </span>
                                    )}
                                  </div>
                                  <div className={`flex items-start gap-2 text-sm font-serif ${healthCopy.toneClass}`}>
                                    {HealthIcon ? <HealthIcon size={16} className="mt-0.5 shrink-0" /> : null}
                                    <div>
                                      <div className="font-semibold">{healthCopy.title}</div>
                                      <div className="text-[12px] opacity-90 mt-1">{healthCopy.message}</div>
                                    </div>
                                  </div>
                                  {tabReport.engineLabels.length > 0 && (
                                    <div className="text-[12px] text-slate-400 font-serif">
                                      AUTO sẽ cập nhật: {tabReport.engineLabels.join(', ')}
                                    </div>
                                  )}
                                  {tabReport.warnings.length > 0 && (
                                    <div className="space-y-1">
                                      {tabReport.warnings.map((warning) => (
                                        <div
                                          key={warning}
                                          className="rounded-lg border border-amber-700/35 bg-amber-950/20 px-2.5 py-1.5 text-[12px] text-amber-100 font-serif"
                                        >
                                          {getFriendlyWarningText(warning)}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {tabNho.viewType === 'collection-track' && isAutoPanelOpen && (
                            <div className="border-t border-amber-800/30 pt-3 space-y-3">
                              <details className="rounded-xl border border-amber-800/45 bg-amber-950/15 p-3">
                                <summary className="cursor-pointer list-none">
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <div className="text-[10px] uppercase tracking-wide text-amber-400 font-bold">
                                        Trường hồ sơ &amp; gợi ý nhập
                                      </div>
                                      <div className="text-[12px] text-slate-300 font-serif mt-1">
                                        Phần nâng cao: thêm trường, đổi tên hiển thị và chỉnh list gợi ý.
                                      </div>
                                    </div>
                                    <div className="text-[11px] text-amber-200/90 font-semibold">
                                      Bấm để mở
                                    </div>
                                  </div>
                                </summary>
                                <div className="mt-3 space-y-3">
                                  {!isMapTab && (
                                    <div className="rounded-lg border border-amber-700/40 bg-amber-950/25 p-2 space-y-2">
                                    <div className="text-[10px] font-bold text-amber-200 uppercase tracking-wide">
                                      3 ô gợi ý — Khởi tạo thẻ (không phải Bản đồ)
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-serif leading-relaxed">
                                      Chọn trường dữ liệu cho từng ô và (tuỳ chọn) đổi nhãn hiển thị. Danh mục gợi ý sửa ở từng trường bên
                                      dưới; app ghép thêm gợi ý theo thể loại và tên tab. Với pháp bảo / đồ vật: gán ô 1 = cấp bậc (
                                      vd. <code className="text-amber-200/90">f_cap</code>), ô 2 = phẩm chất (
                                      <code className="text-amber-200/90">f_status</code> hoặc trường tùy chỉnh), rồi bật &quot;hai ô
                                      song song&quot;.
                                    </p>
                                    {(() => {
                                      const selectable = templateFields.filter((f) => f && f.id && f.id !== 'f_alias');
                                      const defaultSlots = pickDefaultQuickFieldIds(templateFields);
                                      const configured =
                                        Array.isArray(tabNho.entityQuickEntry?.slotFields) &&
                                        tabNho.entityQuickEntry.slotFields.length === 3
                                          ? tabNho.entityQuickEntry.slotFields
                                          : defaultSlots;
                                      const labelSlots = [0, 1, 2].map((i) =>
                                        safeString(tabNho.entityQuickEntry?.slotLabels?.[i] ?? '').trim()
                                      );
                                      const optIds = new Set(selectable.map((f) => f.id));
                                      if (selectable.length === 0) {
                                        return (
                                          <p className="text-[11px] text-amber-100/90 font-serif">
                                            Thêm ít nhất một trường hồ sơ (ngoài wiki) để gán 3 ô gợi ý.
                                          </p>
                                        );
                                      }
                                      return (
                                        <div className="space-y-3">
                                          {[0, 1, 2].map((idx) => {
                                            const qlabId = `ttc-quick-slot-label-${tabPathKey}-${idx}`;
                                            return (
                                              <div
                                                key={`quick-slot-${tabPathKey}-${idx}`}
                                                className="rounded-lg border border-amber-900/25 bg-slate-950/40 p-2 space-y-2"
                                              >
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <span className="text-[10px] font-bold text-slate-500 w-8 shrink-0">
                                                    Ô {idx + 1}
                                                  </span>
                                                  <select
                                                    value={configured[idx]}
                                                    onChange={(e) => {
                                                      const v = safeString(e.target.value).trim();
                                                      const next = [...configured];
                                                      const twin = next.findIndex((x, j) => x === v && j !== idx);
                                                      if (twin >= 0) {
                                                        next[twin] = next[idx];
                                                      }
                                                      next[idx] = v;
                                                      handleSetTabEntityQuickEntry?.(
                                                        tabLon.id,
                                                        tabNho.id,
                                                        next,
                                                        labelSlots
                                                      );
                                                    }}
                                                    className="min-w-[160px] flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-[11px] text-slate-100 font-mono outline-none focus:border-amber-600/50"
                                                  >
                                                    {!optIds.has(configured[idx]) && (
                                                      <option value={configured[idx]}>
                                                        {configured[idx]} (cần khớp template)
                                                      </option>
                                                    )}
                                                    {selectable.map((f) => (
                                                      <option key={f.id} value={f.id}>
                                                        {safeString(f.label) || f.id} ({f.id})
                                                      </option>
                                                    ))}
                                                  </select>
                                                </div>
                                                <div className="space-y-1 pl-0 md:pl-10">
                                                  <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-wide text-amber-200/85">
                                                      Nhãn hiển thị (chỉ modal Khởi tạo thẻ)
                                                    </span>
                                                    <button
                                                      type="button"
                                                      title="Sửa nhãn hiển thị cho ô gợi ý này"
                                                      onClick={() => document.getElementById(qlabId)?.focus()}
                                                      className="inline-flex items-center gap-1 rounded-md border border-amber-800/50 bg-amber-950/35 px-2 py-0.5 text-[10px] font-bold text-amber-100 hover:bg-amber-900/45"
                                                    >
                                                      <Edit2 size={12} /> Sửa nhãn
                                                    </button>
                                                  </div>
                                                  <input
                                                    id={qlabId}
                                                    type="text"
                                                    defaultValue={labelSlots[idx]}
                                                    key={`qlab-${tabPathKey}-${idx}-${labelSlots[idx]}`}
                                                    onBlur={(e) => {
                                                      const nextLabels = [...labelSlots];
                                                      nextLabels[idx] = e.target.value;
                                                      handleSetTabEntityQuickEntry?.(
                                                        tabLon.id,
                                                        tabNho.id,
                                                        configured,
                                                        nextLabels
                                                      );
                                                    }}
                                                    placeholder="Để trống = dùng tên trường trong hồ sơ tab"
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 font-serif outline-none focus:border-amber-600/45"
                                                  />
                                                </div>
                                              </div>
                                            );
                                          })}
                                          <div className="space-y-2 rounded-lg border border-amber-900/35 bg-slate-950/55 px-2.5 py-2">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                              <label className="inline-flex cursor-pointer items-start gap-2 text-[11px] text-slate-300 font-serif leading-snug">
                                                <input
                                                  type="checkbox"
                                                  checked={tabNho.entityQuickEntry?.dualFirstRow === true}
                                                  onChange={(e) =>
                                                    handleSetTabEntityQuickEntry?.(tabLon.id, tabNho.id, configured, labelSlots, {
                                                      dualFirstRow: e.target.checked,
                                                    })
                                                  }
                                                  className="mt-0.5 rounded border-slate-600"
                                                />
                                                <span>
                                                  Hai ô đầu <strong className="text-amber-200">song song</strong> (hai ô đầu hiển thị cạnh
                                                  nhau).
                                                </span>
                                              </label>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const next = [configured[1], configured[0], configured[2]];
                                                  const nextLabels = [labelSlots[1], labelSlots[0], labelSlots[2]];
                                                  handleSetTabEntityQuickEntry?.(tabLon.id, tabNho.id, next, nextLabels);
                                                }}
                                                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-800/50 bg-amber-950/40 px-2.5 py-1.5 text-[10px] font-bold text-amber-100 hover:bg-amber-900/50"
                                                title="Hoán đổi trường và nhãn của ô 1 và ô 2"
                                              >
                                                <ArrowLeftRight size={14} /> Đổi chỗ ô 1 ↔ 2
                                              </button>
                                            </div>
                                            <label className="inline-flex cursor-pointer items-start gap-2 text-[11px] text-slate-300 font-serif leading-snug">
                                              <input
                                                type="checkbox"
                                                checked={tabNho.entityQuickEntry?.useSelectUi === true}
                                                onChange={(e) =>
                                                  handleSetTabEntityQuickEntry?.(tabLon.id, tabNho.id, configured, labelSlots, {
                                                    dualFirstRow: tabNho.entityQuickEntry?.dualFirstRow === true,
                                                    useSelectUi: e.target.checked,
                                                  })
                                                }
                                                className="mt-0.5 rounded border-slate-600"
                                              />
                                              <span>
                                                Dùng <strong className="text-amber-200">menu chọn (select)</strong> cho 3 ô (kèm ô gõ tay
                                                dưới mỗi ô); tắt = gõ + gợi ý datalist như mặc định.
                                              </span>
                                            </label>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                    </div>
                                  )}

                                  <div className="flex flex-wrap items-end gap-2">
                                  <input
                                    type="text"
                                    value={extraFieldDraftByPath[tabPathKey] ?? ''}
                                    onChange={(e) =>
                                      setExtraFieldDraftByPath((prev) => ({
                                        ...prev,
                                        [tabPathKey]: e.target.value,
                                      }))
                                    }
                                    placeholder="Tên trường mới (vd. Phẩm cấp, Tộc hệ)"
                                    className="min-w-[200px] flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100 font-serif outline-none focus:border-amber-600/50"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const raw = safeString(extraFieldDraftByPath[tabPathKey]).trim();
                                      if (!raw) return;
                                      handleAddTabTemplateField?.(tabLon.id, tabNho.id, raw);
                                      setExtraFieldDraftByPath((prev) => ({ ...prev, [tabPathKey]: '' }));
                                    }}
                                    className="rounded-lg border border-amber-700/50 bg-amber-950/30 px-3 py-2 text-[11px] font-bold text-amber-100 hover:bg-amber-900/40"
                                  >
                                    Thêm trường
                                  </button>
                                  </div>

                                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                                  {templateFields.map((field) => {
                                    const fid = safeString(field?.id).trim();
                                    if (!fid) return null;
                                    const isWiki = fid === WIKI_ALIAS_FIELD.id;
                                    const suggestionLines = (tabNho.fieldSuggestionLists?.[fid] || []).join('\n');
                                    const labelDomId = `ttc-field-label-${tabPathKey}-${fid.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
                                    return (
                                      <div
                                        key={fid}
                                        className="rounded-lg border border-slate-800/90 bg-slate-950/50 p-2 space-y-2"
                                      >
                                        <div className="flex flex-wrap items-center gap-2">
                                          <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <span className="text-[10px] font-bold uppercase tracking-wide text-amber-200/90">
                                                Tên hiển thị (form / mốc)
                                              </span>
                                              <button
                                                type="button"
                                                title="Sửa tên hiển thị của trường này"
                                                onClick={() => document.getElementById(labelDomId)?.focus()}
                                                className="inline-flex items-center gap-1 rounded-md border border-amber-800/50 bg-amber-950/30 px-2 py-0.5 text-[10px] font-bold text-amber-100 hover:bg-amber-900/40"
                                              >
                                                <Edit2 size={12} /> Sửa tên
                                              </button>
                                            </div>
                                            <input
                                              id={labelDomId}
                                              type="text"
                                              defaultValue={safeString(field.label)}
                                              key={`lab-${tabPathKey}-${fid}-${safeString(field.label)}`}
                                              onBlur={(e) =>
                                                handleRenameTabTemplateFieldLabel?.(
                                                  tabLon.id,
                                                  tabNho.id,
                                                  fid,
                                                  e.target.value
                                                )
                                              }
                                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100 font-serif"
                                              aria-label={`Tên hiển thị trường ${fid}`}
                                            />
                                          </div>
                                          <code className="text-[10px] text-slate-500 shrink-0 max-w-[8rem] truncate" title={fid}>
                                            {fid}
                                          </code>
                                          {!isWiki && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                flushFocusedEditor();
                                                setConfirmDialog({
                                                  isOpen: true,
                                                  title: 'Xóa trường',
                                                  message: `Xóa trường <b>${safeString(field.label)}</b> khỏi tab này? Gợi ý gắn trường cũng sẽ xóa.`,
                                                  onConfirm: () => handleRemoveTabTemplateField?.(tabLon.id, tabNho.id, fid),
                                                });
                                              }}
                                              className="shrink-0 rounded-lg border border-rose-800/50 bg-rose-950/25 px-2 py-1 text-[10px] font-bold text-rose-100 hover:bg-rose-900/35"
                                            >
                                              Xóa
                                            </button>
                                          )}
                                        </div>
                                        <div>
                                          <div className="text-[10px] text-slate-500 mb-1">
                                            Danh sách gợi ý — mỗi dòng một mục (ô một dòng ở mốc timeline, khởi tạo thẻ)
                                          </div>
                                          <textarea
                                            defaultValue={suggestionLines}
                                            key={`sugg-${tabPathKey}-${fid}-${suggestionLines.length}`}
                                            onBlur={(e) =>
                                              handleMergeTabFieldSuggestionList?.(
                                                tabLon.id,
                                                tabNho.id,
                                                fid,
                                                e.target.value
                                              )
                                            }
                                            rows={3}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 font-mono leading-relaxed"
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                  </div>

                                  {isMapTab && (
                                    <div className="space-y-2 border-t border-amber-800/35 pt-3">
                                    <div className="text-[11px] font-semibold text-amber-100">
                                      Gợi ý thêm cho Bản đồ (Giới Diện / Đặc Tính Địa Vực)
                                    </div>
                                    <div className="grid gap-2 md:grid-cols-2">
                                      <div>
                                        <div className="text-[10px] text-slate-500 mb-1">Giới Diện</div>
                                        <textarea
                                          defaultValue={(tabNho.mapEntrySuggestions?.types || []).join('\n')}
                                          key={`mapt-${tabPathKey}-${(tabNho.mapEntrySuggestions?.types || []).length}`}
                                          onBlur={(e) =>
                                            handleSetTabMapEntrySuggestions?.(
                                              tabLon.id,
                                              tabNho.id,
                                              'types',
                                              e.target.value
                                            )
                                          }
                                          rows={4}
                                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 font-mono"
                                          placeholder="Mỗi dòng một loại (vd. Thành phố)"
                                        />
                                      </div>
                                      <div>
                                        <div className="text-[10px] text-slate-500 mb-1">Đặc Tính Địa Vực</div>
                                        <textarea
                                          defaultValue={(tabNho.mapEntrySuggestions?.hierarchy || []).join('\n')}
                                          key={`maph-${tabPathKey}-${(tabNho.mapEntrySuggestions?.hierarchy || []).length}`}
                                          onBlur={(e) =>
                                            handleSetTabMapEntrySuggestions?.(
                                              tabLon.id,
                                              tabNho.id,
                                              'hierarchy',
                                              e.target.value
                                            )
                                          }
                                          rows={4}
                                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 font-mono"
                                          placeholder="Mỗi dòng một hệ (vd. Cấp thành phố)"
                                        />
                                      </div>
                                    </div>
                                    </div>
                                  )}
                                </div>
                              </details>
                            </div>
                          )}

                          {tabNho.viewType !== 'collection-track' && tabNho.tabCon && tabNho.tabCon.length > 0 && (
                            <div className="pl-6 space-y-2 border-l border-dashed border-slate-700/50 relative mt-2">
                              {tabNho.tabCon.map((tabCon) => (
                                <div key={tabCon.id} className="flex items-center gap-2 relative">
                                  <div className="absolute -left-6 top-3.5 w-4 h-px bg-slate-700/50 border-dashed"></div>
                                  {editingTab?.path === [tabLon.id, tabNho.id, tabCon.id].join('-') ? (
                                    <div className="flex flex-1 items-center gap-2 bg-slate-900/50 p-1 rounded-lg">
                                      <input
                                        autoFocus
                                        className="flex-1 bg-slate-950 border border-amber-600/50 rounded-lg px-2 py-1 text-xs text-slate-200 outline-none"
                                        value={editingTab.label}
                                        onChange={(e) => setEditingTab({ ...editingTab, label: e.target.value })}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            handleSaveEditLabel([tabLon.id, tabNho.id, tabCon.id], editingTab.label);
                                          }
                                        }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSaveEditLabel([tabLon.id, tabNho.id, tabCon.id], editingTab.label)
                                        }
                                        className="text-emerald-500 bg-emerald-950 p-1 rounded-md"
                                      >
                                        <Save size={14} />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between w-full group bg-slate-950/30 p-2 rounded-lg">
                                      <span className="font-serif text-xs text-slate-400">{safeString(tabCon.label)}</span>
                                      <div className="flex items-center gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setEditingTab({
                                              path: [tabLon.id, tabNho.id, tabCon.id].join('-'),
                                              label: tabCon.label,
                                            })
                                          }
                                          className="text-slate-500 hover:text-blue-400 p-1"
                                        >
                                          <Edit2 size={12} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            flushFocusedEditor();
                                            setConfirmDialog({
                                              isOpen: true,
                                              title: 'Hủy Diệt',
                                              message: `Xóa tiểu mục <b>${safeString(tabCon.label)}</b>?`,
                                              onConfirm: () => handleDeleteTab([tabLon.id, tabNho.id, tabCon.id]),
                                            });
                                          }}
                                          className="text-slate-500 hover:text-rose-400 p-1"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="p-5 border-t border-slate-800 bg-slate-950 flex justify-between items-center z-10">
          <span className="text-xs text-slate-500 italic flex items-center gap-2">
            <LayoutGrid size={12} /> Lưới = Chế độ Quản lý Thực Thể
          </span>
          <div className="flex items-center gap-3">
            {activeNovelData && typeof handleResyncAutoTabs === 'function' && (
              <button
                type="button"
                onClick={handleResyncAutoTabs}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl font-bold shadow-lg flex items-center gap-2 border border-slate-700"
              >
                <RefreshCw size={15} /> Quét Lại AUTO
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                flushFocusedEditor();
                onClose();
              }}
              className="px-8 py-3 bg-amber-700 hover:bg-amber-600 text-white rounded-xl font-bold shadow-lg"
            >
              Hoàn Tất Cải Tạo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
