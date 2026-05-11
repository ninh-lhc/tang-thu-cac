/**
 * Modal quan ly cau truc tab (Tran Phap Cai Tao).
 * State va handler duoc truyen tu App.jsx de giu mot nguon su that.
 * Day la noi cau hinh cay muc luc + AUTO tong quan; tung tab chi con nut tren hang (khong mo panel dai).
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
  Ban,
} from 'lucide-react';
import { safeString, getIconComponent } from './MasterUtils.jsx';
import { useFocusTrap } from './lib/useFocusTrap.js';
import {
  getEffectiveAutoSyncRole,
  readExplicitAutoSyncRole,
} from './lib/tabAutoSyncRole.js';
import { collectNovelAutoSyncDiagnostics } from './lib/autoSyncDiagnostics.js';
import { resolveExplicitAutoSyncTargets, supportsAutoSyncLinkRole } from './lib/tabAutoSyncLinks.js';
import {
  AUTO_SYNC_LEVEL_1,
  AUTO_SYNC_LEVEL_2,
  AUTO_SYNC_LEVEL_3,
  getEffectiveTabAutoSyncLevelConfig,
} from './lib/tabAutoSyncLevels.js';
import { TAB_ICON_OPTIONS, extractNovelGenres, getAutoModeSummary, buildSimpleSetupSteps } from './lib/appModalQuanLyTabHelpers.js';
import {
  getQuickAuto3SourceOptions,
  getQuickAuto3TargetOptions,
  getQuickAuto3DefaultPair,
  validateQuickAuto3Pair,
} from './lib/autoSyncQuickLinkSetup.js';
import { AppSectionErrorBoundary } from './AppSectionErrorBoundary.jsx';

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
  handleSetTabAutoSyncFieldMap: _handleSetTabAutoSyncFieldMap,
  handleSetTabMapEntrySuggestions: _handleSetTabMapEntrySuggestions,
  handleSetTabTemplateFieldSortPrefix: _handleSetTabTemplateFieldSortPrefix,
  handleApplySuggestedAutoSyncSetup,
  handleBulkDisableTabAutoSync,
  handleResyncAutoTabs,
  handleSaveCurrentTabsAsGenreTemplate,
  handleResetNovelSuggestionLists,
  activeTabLon,
  setConfirmDialog,
  showToast,
}) {
  const trapRef = useFocusTrap(true);
  const [showAutoOverview, setShowAutoOverview] = React.useState(false);
  const [quickAuto3SourcePathOverride, setQuickAuto3SourcePathOverride] = React.useState(null);
  const [quickAuto3TargetPathOverride, setQuickAuto3TargetPathOverride] = React.useState(null);
  const safeSortedTabs = React.useMemo(
    () => (Array.isArray(sortedTabs) ? sortedTabs : []),
    [sortedTabs]
  );
  const novelGenres = React.useMemo(() => extractNovelGenres(activeNovelData), [activeNovelData]);
  const diagnostics = React.useMemo(
    () => (activeNovelData ? collectNovelAutoSyncDiagnostics(activeNovelData) : null),
    [activeNovelData]
  );
  const simpleSetupSteps = React.useMemo(() => buildSimpleSetupSteps(diagnostics), [diagnostics]);
  const quickAuto3SourceOptions = React.useMemo(
    () => getQuickAuto3SourceOptions(safeSortedTabs).map((row) => ({ pathKey: row.pathKey, label: row.label })),
    [safeSortedTabs]
  );
  const quickAuto3TargetOptions = React.useMemo(
    () => getQuickAuto3TargetOptions(safeSortedTabs).map((row) => ({ pathKey: row.pathKey, label: row.label })),
    [safeSortedTabs]
  );
  const quickAuto3DefaultPair = React.useMemo(() => getQuickAuto3DefaultPair(safeSortedTabs), [safeSortedTabs]);
  const quickAuto3SourcePath = quickAuto3SourcePathOverride ?? quickAuto3DefaultPair.sourcePath;
  const quickAuto3TargetPath = quickAuto3TargetPathOverride ?? quickAuto3DefaultPair.targetPath;
  const lonIconInputRefById = React.useRef({});
  const nhoIconInputRefByPath = React.useRef({});
  const bulkAutoLonMeta =
    activeTabLon && activeTabLon !== 'tong-quan'
      ? safeSortedTabs.find((t) => t && t.id === activeTabLon)
      : null;
  const canBulkDisableAutoForOpenLon = Boolean(bulkAutoLonMeta);

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
  const applyQuickAuto3Setup = React.useCallback(() => {
    const sourcePath = safeString(quickAuto3SourcePath).trim();
    const targetPath = safeString(quickAuto3TargetPath).trim();
    const check = validateQuickAuto3Pair({ sourcePath, targetPath });
    if (!check.ok) {
      showToast?.(check.message);
      return;
    }
    const [sourceLonId, sourceNhoId] = sourcePath.split('::');
    const [targetLonId, targetNhoId] = targetPath.split('::');
    const sourceLon = safeSortedTabs.find((lon) => safeString(lon?.id) === safeString(sourceLonId));
    const sourceNho = sourceLon?.subTabs?.find((nho) => safeString(nho?.id) === safeString(sourceNhoId));
    const targetLon = safeSortedTabs.find((lon) => safeString(lon?.id) === safeString(targetLonId));
    const targetNho = targetLon?.subTabs?.find((nho) => safeString(nho?.id) === safeString(targetNhoId));
    if (!sourceLon || !sourceNho || !targetLon || !targetNho) {
      showToast?.('Không tìm thấy tab nguồn hoặc tab đích trong cây hiện tại.');
      return;
    }

    handleSetTabAutoSyncRole?.(sourceLonId, sourceNhoId, 'the-luc');
    handleSetTabAutoSyncRole?.(targetLonId, targetNhoId, 'ban-do');
    handleSetTabAutoSyncTargets?.(sourceLonId, sourceNhoId, [targetPath]);
    const sourceLevelConfig = getEffectiveTabAutoSyncLevelConfig(sourceNho);
    handleSetTabAutoSyncLevels?.(sourceLonId, sourceNhoId, {
      ...sourceLevelConfig,
      enabled: true,
      levels: {
        ...sourceLevelConfig.levels,
        [AUTO_SYNC_LEVEL_3]: true,
      },
    });
    showToast?.('Đã áp dụng Auto 3: gán nguồn Thế lực -> đích Bản đồ và bật bậc 3.');
  }, [
    handleSetTabAutoSyncLevels,
    handleSetTabAutoSyncRole,
    handleSetTabAutoSyncTargets,
    quickAuto3SourcePath,
    quickAuto3TargetPath,
    showToast,
    safeSortedTabs,
  ]);

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
                    Mặc định giữ cây thư mục gọn. Bảng AUTO / Auto 3 nhanh bên dưới; từng tab nhỏ chỉnh bằng nút trên hàng (không mở panel).
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
                  {activeNovelData && typeof handleBulkDisableTabAutoSync === 'function' && (
                    <>
                      <button
                        type="button"
                        accessKey="c"
                        title="Tắt AUTO mọi tab sưu tập trong truyện. Phím nhanh: Alt+Shift+C (tùy trình duyệt)."
                        onClick={() => {
                          flushFocusedEditor();
                          setConfirmDialog?.({
                            isOpen: true,
                            title: 'Tắt AUTO toàn cây',
                            message:
                              'Đặt «Tắt auto» cho <strong>mọi tab sưu tập</strong> trong cả cây thư mục truyện này? Liên kết AUTO và ánh xạ trường gắn vai trò sẽ được gỡ.',
                            onConfirm: () => handleBulkDisableTabAutoSync(null),
                          });
                        }}
                        className="px-4 py-2.5 rounded-xl border border-rose-700/45 bg-rose-950/25 text-rose-100 text-sm font-bold flex items-center gap-2 hover:bg-rose-900/35"
                      >
                        <Ban size={15} /> Tắt AUTO toàn cây
                      </button>
                      <button
                        type="button"
                        accessKey="t"
                        disabled={!canBulkDisableAutoForOpenLon}
                        title={
                          canBulkDisableAutoForOpenLon
                            ? `Tắt AUTO mọi tab sưu tập trong tab lớn «${safeString(bulkAutoLonMeta?.label)}». Phím nhanh: Alt+Shift+T (tùy trình duyệt).`
                            : 'Chỉ dùng khi đang mở một tab lớn nội dung (không phải Tổng quan).'
                        }
                        onClick={() => {
                          if (!canBulkDisableAutoForOpenLon || !activeTabLon) return;
                          flushFocusedEditor();
                          const lonLabel = safeString(bulkAutoLonMeta?.label || activeTabLon);
                          setConfirmDialog?.({
                            isOpen: true,
                            title: 'Tắt AUTO theo tab lớn',
                            message: `Đặt «Tắt auto» cho <strong>mọi tab sưu tập</strong> trong tab lớn «${lonLabel}» (tab lớn đang mở khi đọc truyện)?`,
                            onConfirm: () => handleBulkDisableTabAutoSync(activeTabLon),
                          });
                        }}
                        className={`px-4 py-2.5 rounded-xl border text-sm font-bold flex items-center gap-2 ${
                          canBulkDisableAutoForOpenLon
                            ? 'border-orange-700/45 bg-orange-950/25 text-orange-100 hover:bg-orange-900/35'
                            : 'border-slate-700/50 bg-slate-950/40 text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        <Ban size={15} /> Tắt AUTO tab đang mở
                      </button>
                    </>
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
                  {activeNovelData && typeof handleResetNovelSuggestionLists === 'function' && (
                    <button
                      type="button"
                      onClick={() => {
                        flushFocusedEditor();
                        setConfirmDialog?.({
                          isOpen: true,
                          title: 'Reset List Gợi Ý',
                          message:
                            'Xóa toàn bộ list gợi ý và nguồn gợi ý theo trường của truyện này? <br/><br/>Hành động này chỉ áp dụng cho truyện đang mở.',
                          onConfirm: () => handleResetNovelSuggestionLists(),
                        });
                      }}
                      className="px-4 py-2.5 rounded-xl border border-rose-700/40 bg-rose-950/25 text-rose-100 text-sm font-bold flex items-center gap-2 hover:bg-rose-900/30"
                    >
                      <RefreshCw size={15} /> Reset List Gợi Ý
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
              <div className="rounded-xl border border-indigo-800/40 bg-indigo-950/20 p-3 space-y-2">
                <div className="text-[10px] uppercase tracking-wide text-indigo-300 font-bold">
                  Auto 3 siêu nhanh
                </div>
                <div className="text-[12px] text-slate-300 font-serif">
                  Chỉ chọn tab nguồn + tab đích. Hệ thống tự gán role, target và bật bậc 3 liên tab.
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-[11px] text-slate-300 font-semibold">
                    Tab nguồn (Thế lực)
                    <select
                      value={quickAuto3SourcePath}
                      onChange={(e) => setQuickAuto3SourcePathOverride(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 font-serif outline-none focus:border-indigo-500/60"
                    >
                      {quickAuto3SourceOptions.length === 0 && (
                        <option value="">(Chưa có mục phù hợp — bật Lưới cho 2 mục)</option>
                      )}
                      {quickAuto3SourceOptions.map((option) => (
                        <option key={`source-${option.pathKey}`} value={option.pathKey}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] text-slate-300 font-semibold">
                    Tab đích (Bản đồ)
                    <select
                      value={quickAuto3TargetPath}
                      onChange={(e) => setQuickAuto3TargetPathOverride(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 font-serif outline-none focus:border-indigo-500/60"
                    >
                      {quickAuto3TargetOptions.length === 0 && (
                        <option value="">(Chưa có mục phù hợp — bật Lưới cho 2 mục)</option>
                      )}
                      {quickAuto3TargetOptions.map((option) => (
                        <option key={`target-${option.pathKey}`} value={option.pathKey}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-400 font-serif">
                    Sau khi áp dụng, bạn chỉ cần bấm <strong className="text-indigo-100">Quét Lại AUTO</strong>.
                  </div>
                  <button
                    type="button"
                    onClick={applyQuickAuto3Setup}
                    disabled={quickAuto3SourceOptions.length === 0 || quickAuto3TargetOptions.length === 0}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${
                      quickAuto3SourceOptions.length === 0 || quickAuto3TargetOptions.length === 0
                        ? 'border-slate-700 bg-slate-900 text-slate-500 cursor-not-allowed'
                        : 'border-indigo-700/55 bg-indigo-950/35 text-indigo-100 hover:bg-indigo-900/35'
                    }`}
                  >
                    Tự cấu hình Auto 3
                  </button>
                </div>
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

          <AppSectionErrorBoundary
            resetKey={`${safeSortedTabs.length}`}
            title="Khu vực cây mục lục đang gặp lỗi"
            description="Một mục trong cây tab bị lỗi khi render. Bạn vẫn có thể đóng modal và tiếp tục dùng app."
          >
            {safeSortedTabs.map((tabLon) => (
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

              {!tabLon.isFixed && Array.isArray(tabLon.subTabs) && tabLon.subTabs.length > 0 && (
                <div className="mt-4 pl-8 space-y-3 border-l-2 border-slate-800/80">
                  {tabLon.subTabs.map((tabNho) => {
                    if (!tabNho || typeof tabNho !== 'object') return null;
                    const tabAutoContext = {
                      activeTabLon: tabLon.id,
                      activeTabNho: tabNho.id,
                      currentTabConfig: tabNho,
                      parentLabel: tabLon.label || '',
                    };
                    const explicitRole = readExplicitAutoSyncRole(tabNho);
                    const effectiveRole = getEffectiveAutoSyncRole(tabAutoContext);
                    const supportsLink = supportsAutoSyncLinkRole(effectiveRole);
                    const selectedTargets = supportsLink
                      ? resolveExplicitAutoSyncTargets(safeSortedTabs, tabAutoContext)
                      : [];
                    const autoLevelConfigRaw = getEffectiveTabAutoSyncLevelConfig(tabNho);
                    const autoLevelConfig = {
                      enabled: autoLevelConfigRaw?.enabled !== false,
                      levels: {
                        level_1_card: Boolean(autoLevelConfigRaw?.levels?.level_1_card),
                        level_2_list: Boolean(autoLevelConfigRaw?.levels?.level_2_list),
                        level_3_linked: Boolean(autoLevelConfigRaw?.levels?.level_3_linked),
                      },
                    };
                    const bothLevels12Off =
                      !autoLevelConfig.levels[AUTO_SYNC_LEVEL_1] &&
                      !autoLevelConfig.levels[AUTO_SYNC_LEVEL_2];
                    const autoRoleSummary = getAutoModeSummary({
                      explicitRole,
                      effectiveRole,
                      linkTargetCount: selectedTargets.length,
                    });
                    const isAutoOffForTab = explicitRole === 'khong-tu-dong';
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
                                <div className="flex flex-wrap items-center gap-1">
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
                                      {!autoLevelConfig.enabled && !isAutoOffForTab && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleSetTabAutoSyncLevels?.(tabLon.id, tabNho.id, {
                                              ...autoLevelConfigRaw,
                                              enabled: true,
                                            })
                                          }
                                          className="px-2 py-1.5 rounded-lg border border-indigo-700/45 bg-indigo-950/30 text-indigo-100 text-[10px] font-bold hover:bg-indigo-900/35 shrink-0"
                                          title="Bật lại đồng bộ AUTO cho tab (cấu hình bậc đã tắt trước đó)."
                                        >
                                          Bật sync
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSetTabAutoSyncRole(
                                            tabLon.id,
                                            tabNho.id,
                                            isAutoOffForTab ? '' : 'khong-tu-dong'
                                          )
                                        }
                                        className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold transition-all shrink-0 max-sm:max-w-[4.5rem] leading-tight sm:whitespace-nowrap ${
                                          isAutoOffForTab
                                            ? 'border-emerald-700/45 bg-emerald-950/25 text-emerald-100 hover:bg-emerald-900/35'
                                            : 'border-rose-700/45 bg-rose-950/25 text-rose-100 hover:bg-rose-900/35'
                                        }`}
                                        title={
                                          isAutoOffForTab
                                            ? 'Trả tab về AUTO tự nhận diện (theo tên mục).'
                                            : 'Tắt AUTO cho tab này — không đồng bộ theo cây.'
                                        }
                                      >
                                        {isAutoOffForTab ? 'Bật AUTO' : 'Tắt AUTO'}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={!autoLevelConfig.enabled}
                                        onClick={() =>
                                          handleSetTabAutoSyncLevels?.(tabLon.id, tabNho.id, {
                                            ...autoLevelConfig,
                                            enabled: true,
                                            levels: {
                                              ...autoLevelConfig.levels,
                                              [AUTO_SYNC_LEVEL_1]: bothLevels12Off,
                                              [AUTO_SYNC_LEVEL_2]: bothLevels12Off,
                                            },
                                          })
                                        }
                                        className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold transition-all shrink-0 max-sm:max-w-[5rem] leading-tight sm:whitespace-nowrap ${
                                          !autoLevelConfig.enabled
                                            ? 'border-slate-800 bg-slate-950/40 text-slate-600 cursor-not-allowed'
                                            : bothLevels12Off
                                              ? 'border-amber-700/45 bg-amber-950/25 text-amber-100 hover:bg-amber-900/35'
                                              : 'border-slate-600/50 bg-slate-900/70 text-slate-200 hover:border-slate-500'
                                        }`}
                                        title={
                                          !autoLevelConfig.enabled
                                            ? 'Bấm «Bật sync» trước, hoặc bật lại AUTO tab ở trên.'
                                            : bothLevels12Off
                                              ? 'Khôi phục mặc định: bật AUTO trong thẻ + Danh sách (bậc 1+2).'
                                              : 'Chỉ cần AUTO liên tab: tắt AUTO nội bộ (1+2). Mốc timeline vẫn quét theo cú pháp khi sync tab đang bật.'
                                        }
                                      >
                                        {bothLevels12Off ? 'Bật bậc 1–2' : 'Tắt bậc 1–2'}
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
          </AppSectionErrorBoundary>
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
