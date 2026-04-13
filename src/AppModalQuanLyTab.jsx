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
} from 'lucide-react';
import { safeString, getIconComponent } from './MasterUtils.jsx';
import { useFocusTrap } from './lib/useFocusTrap.js';
import {
  AUTO_SYNC_ROLE_OPTIONS,
  getAutoSyncRoleLabel,
  getEffectiveAutoSyncRole,
  readExplicitAutoSyncRole,
} from './lib/tabAutoSyncRole.js';
import { getAutoSyncFieldDefs, getEffectiveAutoSyncFieldMap } from './lib/tabAutoSyncFieldMap.js';

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
  handleResyncAutoTabs,
  setConfirmDialog,
}) {
  const trapRef = useFocusTrap(true);

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
                    const explicitRoleOption =
                      AUTO_SYNC_ROLE_OPTIONS.find((opt) => opt.value === explicitRole) || AUTO_SYNC_ROLE_OPTIONS[0];
                    const effectiveRoleLabel = effectiveRole ? getAutoSyncRoleLabel(effectiveRole) : '';
                    const autoRoleSummary = explicitRole
                      ? getAutoSyncRoleLabel(explicitRole)
                      : effectiveRoleLabel
                        ? `Tự nhận diện → ${effectiveRoleLabel}`
                        : 'Tự nhận diện';
                    const autoRoleHint = explicitRole
                      ? explicitRoleOption.hint
                      : effectiveRoleLabel
                        ? `Hiện hệ thống đang tự nhận diện mục này là ${effectiveRoleLabel}.`
                        : AUTO_SYNC_ROLE_OPTIONS[0].hint;

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
                                        Vai trò auto: {autoRoleSummary}
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
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">
                                  Vai trò tự động
                                </span>
                                <select
                                  value={explicitRole}
                                  onChange={(e) => handleSetTabAutoSyncRole(tabLon.id, tabNho.id, e.target.value)}
                                  className="min-w-[220px] bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-serif outline-none focus:border-amber-600/50"
                                >
                                  {AUTO_SYNC_ROLE_OPTIONS.map((opt) => (
                                    <option key={opt.value || '__auto__'} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                                <span className="text-[11px] text-slate-500 font-serif">
                                  {autoRoleHint}
                                </span>
                              </div>

                              {autoFieldDefs.length > 0 && (
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
                                          {def.label}
                                        </span>
                                        <select
                                          value={selectedFieldId}
                                          onChange={(e) =>
                                            handleSetTabAutoSyncFieldMap(tabLon.id, tabNho.id, def.key, e.target.value)
                                          }
                                          className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-serif outline-none focus:border-amber-600/50"
                                        >
                                          <option value="">Tự đoán theo nhãn</option>
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
