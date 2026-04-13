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
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { safeString, getIconComponent } from './MasterUtils.jsx';
import { useFocusTrap } from './lib/useFocusTrap.js';
import {
  getEffectiveAutoSyncRole,
  readExplicitAutoSyncRole,
} from './lib/tabAutoSyncRole.js';
import { getAutoSyncFieldDefs, getEffectiveAutoSyncFieldMap } from './lib/tabAutoSyncFieldMap.js';
import { collectNovelAutoSyncDiagnostics } from './lib/autoSyncDiagnostics.js';

const AUTO_ROLE_UI_COPY = Object.freeze({
  '': {
    selectLabel: 'Để hệ thống tự đoán',
    helper:
      'Nếu tên mục đã rõ như Gia Tộc, Địa Danh, Nhân Vật Chính... thì thường không cần chỉnh tay.',
    example: 'Ví dụ: Gia Tộc, Địa Danh, Cảnh Giới, Nhân Vật Chính...',
  },
  'khong-tu-dong': {
    selectLabel: 'Không dùng AUTO ở mục này',
    helper: 'Mục này chỉ lưu dữ liệu thủ công, AUTO sẽ bỏ qua hoàn toàn.',
    example: 'Dùng khi đây chỉ là nơi ghi chép tay, không cần tự liên kết.',
  },
  'the-luc': {
    selectLabel: 'Thế lực / tổ chức',
    helper: 'Dùng cho các mục chứa gia tộc, tông môn, đế quốc, liên minh, phe phái...',
    example: 'Ví dụ: Gia Tộc, Tông Môn, Đế Quốc, Chính Tà...',
  },
  'ban-do': {
    selectLabel: 'Địa danh / bản đồ',
    helper: 'Dùng cho đại lục, thành trì, bí cảnh, khu vực, thế giới, tinh cầu...',
    example: 'Ví dụ: Đại Lục, Thành Trì, Bí Cảnh, Tinh Cầu...',
  },
  'he-thong-tu-luyen': {
    selectLabel: 'Hệ thống tu luyện',
    helper: 'Dùng cho tab ghi các hệ như Luyện Khí, Trúc Cơ, Kim Đan...',
    example: 'Ví dụ: Hệ Thống Tu Luyện, Hệ Cảnh Giới...',
  },
  'canh-gioi-tu-vi': {
    selectLabel: 'Cảnh giới tu vi',
    helper: 'Dùng cho tab ghi các cấp hoặc bậc cảnh giới thuộc một hệ thống tu luyện.',
    example: 'Ví dụ: Cảnh Giới, Đại Cảnh Giới, Tiểu Cảnh Giới...',
  },
  'nhan-vat-chinh': {
    selectLabel: 'Nhân vật chính',
    helper: 'Dùng cho tab chứa hồ sơ nhân vật trung tâm của truyện.',
    example: 'Ví dụ: Nhân Vật Chính, Main Character, Chủ Nhân...',
  },
  'nhan-vat-lien-quan': {
    selectLabel: 'Nhân vật liên quan',
    helper: 'Dùng cho tab đạo lữ, thân nhân, bằng hữu, sư phụ, đệ tử...',
    example: 'Ví dụ: Đạo Lữ, Thân Nhân, Huynh Đệ, Bằng Hữu...',
  },
});

const AUTO_ROLE_CARD_VALUES = Object.freeze([
  '',
  'the-luc',
  'ban-do',
  'he-thong-tu-luyen',
  'canh-gioi-tu-vi',
  'nhan-vat-chinh',
  'nhan-vat-lien-quan',
  'khong-tu-dong',
]);

const AUTO_ROLE_DEFAULT_VISIBLE_COUNT = 4;

const AUTO_ROLE_KEYWORDS = Object.freeze({
  'the-luc': ['gia toc', 'tong mon', 'de quoc', 'the luc', 'to chuc', 'phe phai', 'lien minh', 'mon phai'],
  'ban-do': ['dia danh', 'ban do', 'thanh tri', 'dai luc', 'bi canh', 'tinh cau', 'the gioi', 'khu vuc', 'dia ban'],
  'he-thong-tu-luyen': ['he thong tu luyen', 'he canh gioi', 'he thong', 'tu luyen'],
  'canh-gioi-tu-vi': ['canh gioi', 'tu vi', 'cap bac', 'dai canh', 'tieu canh'],
  'nhan-vat-chinh': ['nhan vat chinh', 'main character', 'chu nhan', 'vai chinh', 'protagonist'],
  'nhan-vat-lien-quan': ['nhan vat lien quan', 'dao lu', 'than nhan', 'huynh de', 'de tu', 'su phu', 'bang huu', 'ban be'],
});

function normalizeAutoRoleSearchText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\[\[|\]\]/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function scoreAutoRoleMatch(roleValue, haystack = '', { explicitRole = '', effectiveRole = '' } = {}) {
  if (roleValue === '') return 1000;

  let score = 0;
  if (roleValue === explicitRole) score += 800;
  if (roleValue === effectiveRole && effectiveRole) score += 500;
  if (roleValue === 'khong-tu-dong') score -= 200;

  const keywords = AUTO_ROLE_KEYWORDS[roleValue] || [];
  keywords.forEach((keyword) => {
    if (!keyword) return;
    if (haystack === keyword) {
      score += 240;
      return;
    }
    if (haystack.includes(keyword)) {
      score += 110 + Math.min(keyword.length, 18);
    }
  });

  if (roleValue === 'nhan-vat-chinh' && haystack.includes('nhan vat')) score += 40;
  if (roleValue === 'nhan-vat-lien-quan' && haystack.includes('nhan vat')) score += 25;
  if (roleValue === 'canh-gioi-tu-vi' && haystack.includes('gioi')) score += 20;
  if (roleValue === 'ban-do' && haystack.includes('dia')) score += 20;

  return score;
}

function getAutoRoleCardGroups({ tabLon = null, tabNho = null, explicitRole = '', effectiveRole = '' } = {}) {
  const haystack = normalizeAutoRoleSearchText(
    [
      safeString(tabLon?.id),
      safeString(tabLon?.label),
      safeString(tabNho?.id),
      safeString(tabNho?.label),
    ].join(' ')
  );

  const sortedRoles = AUTO_ROLE_CARD_VALUES
    .filter((roleValue) => roleValue)
    .map((roleValue, index) => ({
      roleValue,
      score: scoreAutoRoleMatch(roleValue, haystack, { explicitRole, effectiveRole }),
      index,
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((item) => item.roleValue);

  const visibleSet = new Set(['']);
  sortedRoles.forEach((roleValue) => {
    if (visibleSet.size < AUTO_ROLE_DEFAULT_VISIBLE_COUNT) {
      visibleSet.add(roleValue);
    }
  });
  if (explicitRole) visibleSet.add(explicitRole);
  if (effectiveRole) visibleSet.add(effectiveRole);

  const orderedRoles = ['', ...sortedRoles];
  return {
    visibleRoles: orderedRoles.filter((roleValue) => visibleSet.has(roleValue)),
    hiddenRoles: orderedRoles.filter((roleValue) => !visibleSet.has(roleValue)),
  };
}

function getAutoRoleUiCopy(role = '') {
  return AUTO_ROLE_UI_COPY[role] || AUTO_ROLE_UI_COPY[''];
}

function getAutoRoleSelectLabel(role = '') {
  return getAutoRoleUiCopy(role).selectLabel;
}

function getAutoRoleSummary({ explicitRole = '', effectiveRole = '' } = {}) {
  if (explicitRole) return `AUTO đang dùng: ${getAutoRoleSelectLabel(explicitRole)}`;
  if (effectiveRole) return `AUTO đang tự đoán: ${getAutoRoleSelectLabel(effectiveRole)}`;
  return 'AUTO chưa đoán ra mục này dùng để quản lý gì';
}

function getAutoRoleHint({ explicitRole = '', effectiveRole = '' } = {}) {
  if (explicitRole) return getAutoRoleUiCopy(explicitRole).helper;
  if (effectiveRole) {
    return `Hiện hệ thống đang tự đoán mục này là "${getAutoRoleSelectLabel(effectiveRole)}".`;
  }
  return getAutoRoleUiCopy('').helper;
}

function getAutoRoleExample({ explicitRole = '', effectiveRole = '' } = {}) {
  if (explicitRole) return getAutoRoleUiCopy(explicitRole).example;
  if (effectiveRole) return getAutoRoleUiCopy(effectiveRole).example;
  return getAutoRoleUiCopy('').example;
}

function getFriendlyWarningText(warning = '') {
  const text = safeString(warning).trim();
  const missingMatch = text.match(/^Thiếu ánh xạ cho "(.+)"\.$/i);
  if (missingMatch) {
    return `AUTO chưa biết phải đọc "${missingMatch[1]}" ở trường nào.`;
  }
  const missingFieldMatch = text.match(/^Trường "(.+)" cho "(.+)" không còn trong mẫu\.$/i);
  if (missingFieldMatch) {
    return `Trường đang gắn cho "${missingFieldMatch[2]}" không còn tồn tại trong mẫu hiện tại.`;
  }
  return text;
}

function getTabHealthCopy(tabReport) {
  if (!tabReport) {
    return {
      title: 'Chưa có dữ liệu kiểm tra',
      message: 'Mục này chưa có đủ dữ liệu để AUTO tự đánh giá.',
      toneClass: 'text-slate-300',
      boxClass: 'border-slate-800 bg-slate-950/55',
      icon: null,
    };
  }

  if (tabReport.status === 'off') {
    return {
      title: 'AUTO đang tắt ở mục này',
      message: 'Dữ liệu trong mục này sẽ không tham gia đồng bộ tự động.',
      toneClass: 'text-slate-300',
      boxClass: 'border-slate-800 bg-slate-950/55',
      icon: null,
    };
  }

  if (Array.isArray(tabReport.warnings) && tabReport.warnings.length > 0) {
    return {
      title: 'Cần xem lại trước khi quét AUTO',
      message: `Còn ${tabReport.warnings.length} chỗ cần chọn đúng trường dữ liệu để AUTO đọc chính xác.`,
      toneClass: 'text-amber-100',
      boxClass: 'border-amber-700/35 bg-amber-950/20',
      icon: AlertTriangle,
    };
  }

  if (tabReport.status === 'ready') {
    return {
      title: 'Mục này đã sẵn sàng',
      message: 'AUTO đã có thể chạy ổn cho mục này với cấu hình hiện tại.',
      toneClass: 'text-emerald-200',
      boxClass: 'border-emerald-700/25 bg-emerald-950/15',
      icon: CheckCircle2,
    };
  }

  return {
    title: 'Nên chọn rõ mục này quản lý gì',
    message: 'Nếu AUTO chưa đoán đúng, hãy chọn tay để kết quả ổn định hơn.',
    toneClass: 'text-slate-300',
    boxClass: 'border-slate-800 bg-slate-950/55',
    icon: null,
  };
}

function buildSimpleSetupSteps(diagnostics) {
  const warningCount = diagnostics?.summary?.warningCount || 0;
  const touchedCount = diagnostics?.preview?.touchedEntityCount || 0;

  return [
    'Chọn ở từng mục: mục này đang quản lý loại dữ liệu nào.',
    warningCount > 0
      ? `Mở phần "Chỉnh trường nâng cao" ở ${warningCount} chỗ đang có cảnh báo để AUTO đọc đúng dữ liệu.`
      : 'Không cần mở phần nâng cao nếu mục đã hiện trạng thái sẵn sàng.',
    touchedCount > 0
      ? `Sau cùng bấm "Quét Lại AUTO"; lần quét tiếp theo sẽ cập nhật khoảng ${touchedCount} thực thể.`
      : 'Sau cùng bấm "Quét Lại AUTO" để đồng bộ lại toàn bộ cây.',
  ];
}

export function AppModalQuanLyTab({
  activeNovelData,
  onClose,
  sortedTabs,
  editingTab,
  setEditingTab,
  handleAddTabLon,
  handleSaveEditLabel,
  handleToggleViewType,
  handleDeleteTab,
  handleAddTabNho,
  handleAddTabCon,
  handleSetTabAutoSyncRole,
  handleSetTabAutoSyncFieldMap,
  handleApplySuggestedAutoSyncSetup,
  handleResyncAutoTabs,
  setConfirmDialog,
}) {
  const trapRef = useFocusTrap(true);
  const [advancedOpenByPath, setAdvancedOpenByPath] = React.useState({});
  const [expandedRoleChoicesByPath, setExpandedRoleChoicesByPath] = React.useState({});
  const diagnostics = React.useMemo(
    () => (activeNovelData ? collectNovelAutoSyncDiagnostics(activeNovelData) : null),
    [activeNovelData]
  );
  const diagnosticsByPath = React.useMemo(
    () => new Map((diagnostics?.tabReports || []).map((report) => [report.id, report])),
    [diagnostics]
  );
  const simpleSetupSteps = React.useMemo(() => buildSimpleSetupSteps(diagnostics), [diagnostics]);

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
              onClick={onClose}
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
                    Chỉ cần chọn từng mục đang quản lý gì, khi cần mới chỉnh nâng cao rồi quét lại AUTO.
                  </p>
                </div>
                {typeof handleApplySuggestedAutoSyncSetup === 'function' && (
                  <button
                    type="button"
                    onClick={handleApplySuggestedAutoSyncSetup}
                    className="px-4 py-2.5 rounded-xl border border-cyan-700/40 bg-cyan-950/30 text-cyan-100 text-sm font-bold flex items-center gap-2 hover:bg-cyan-900/30"
                  >
                    <Sparkles size={15} /> Áp Gợi Ý AUTO
                  </button>
                )}
              </div>

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
                          {(item.engines || []).map((engine) => safeString(engine.label || engine.id)).filter(Boolean).join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {sortedTabs.map((tabLon) => (
            <div key={tabLon.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-inner">
              <div className="flex items-center gap-3">
                <span className="text-amber-600 bg-amber-950/50 p-2 rounded-lg">{getIconComponent(tabLon.iconName)}</span>
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
                          onClick={() =>
                            setConfirmDialog({
                              isOpen: true,
                              title: 'Hủy Diệt',
                              message: `Xóa vĩnh viễn <b>${safeString(tabLon.label)}</b> cùng mọi thứ bên trong?`,
                              onConfirm: () => handleDeleteTab([tabLon.id]),
                            })
                          }
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
                    const explicitRole = readExplicitAutoSyncRole(tabNho);
                    const effectiveRole = getEffectiveAutoSyncRole({
                      activeTabLon: tabLon.id,
                      activeTabNho: tabNho.id,
                      currentTabConfig: tabNho,
                      parentLabel: tabLon.label || '',
                    });
                    const autoFieldDefs = getAutoSyncFieldDefs(effectiveRole);
                    const autoFieldMap = getEffectiveAutoSyncFieldMap({
                      activeTabLon: tabLon.id,
                      activeTabNho: tabNho.id,
                      currentTabConfig: tabNho,
                      parentLabel: tabLon.label || '',
                    });
                    const templateFields = Array.isArray(tabNho.fieldsTemplate)
                      ? tabNho.fieldsTemplate.filter((field) => field && safeString(field.id).trim())
                      : [];
                    const tabPathKey = `${tabLon.id}::${tabNho.id}`;
                    const tabReport = diagnosticsByPath.get(tabPathKey);
                    const autoRoleSummary = getAutoRoleSummary({ explicitRole, effectiveRole });
                    const autoRoleHint = getAutoRoleHint({ explicitRole, effectiveRole });
                    const autoRoleExample = getAutoRoleExample({ explicitRole, effectiveRole });
                    const healthCopy = getTabHealthCopy(tabReport);
                    const HealthIcon = healthCopy.icon;
                    const advancedOverride = advancedOpenByPath[tabPathKey];
                    const roleCardGroups = getAutoRoleCardGroups({
                      tabLon,
                      tabNho,
                      explicitRole,
                      effectiveRole,
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
                                  {tabNho.viewType === 'collection-track' ? (
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
                                    onClick={() =>
                                      setConfirmDialog({
                                        isOpen: true,
                                        title: 'Hủy Diệt',
                                        message: `Xóa <b>${safeString(tabNho.label)}</b>?`,
                                        onConfirm: () => handleDeleteTab([tabLon.id, tabNho.id]),
                                      })
                                    }
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
                            )}
                          </div>

                          {tabNho.viewType === 'collection-track' && (
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
                                          onClick={() =>
                                            setConfirmDialog({
                                              isOpen: true,
                                              title: 'Hủy Diệt',
                                              message: `Xóa tiểu mục <b>${safeString(tabCon.label)}</b>?`,
                                              onConfirm: () => handleDeleteTab([tabLon.id, tabNho.id, tabCon.id]),
                                            })
                                          }
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
              onClick={onClose}
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
