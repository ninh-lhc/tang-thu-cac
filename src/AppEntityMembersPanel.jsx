// ==========================================
// AppEntityMembersPanel.jsx
// Purpose: manage member profiles embedded in one collection entity.
// Imported by AppCollectionSection; persistence is handled by App.jsx callbacks.
// Notes: member names/aliases become wiki targets through buildEntityLinkMap.
// ==========================================

import React, { memo, useDeferredValue, useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Link2,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { safeString } from './MasterUtils.jsx';
import { readEntityMembers } from './lib/entityMembers.js';
import { normalizeSearchText } from './lib/normalizeSearchText.js';

const EMPTY_MEMBER_DRAFT = {
  id: null,
  name: '',
  alias: '',
  role: '',
  status: '',
  info: '',
  wikiLinkOptOuts: [],
};

const PANEL_STORAGE_PREFIX = 'tt_entity_members_panel_open';

function readPanelOpen(scopeKey, fallback) {
  if (!scopeKey || typeof localStorage === 'undefined') return fallback;
  try {
    const saved = localStorage.getItem(`${PANEL_STORAGE_PREFIX}:${scopeKey}`);
    if (saved === '1') return true;
    if (saved === '0') return false;
  } catch {
    /* best effort */
  }
  return fallback;
}

function writePanelOpen(scopeKey, value) {
  if (!scopeKey || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(`${PANEL_STORAGE_PREFIX}:${scopeKey}`, value ? '1' : '0');
  } catch {
    /* best effort */
  }
}

function toDraft(member) {
  if (!member) return { ...EMPTY_MEMBER_DRAFT };
  return {
    id: member.id || null,
    name: safeString(member.name),
    alias: safeString(member.alias),
    role: safeString(member.role),
    status: safeString(member.status),
    info: safeString(member.info),
    wikiLinkOptOuts: Array.isArray(member.wikiLinkOptOuts) ? member.wikiLinkOptOuts : [],
  };
}

function memberSearchBlob(member) {
  return [
    member?.name,
    member?.alias,
    member?.role,
    member?.status,
    member?.info,
  ].map(safeString).join(' ');
}

export const AppEntityMembersPanel = memo(function AppEntityMembersPanel({
  selectedEntity,
  scopeKey,
  onSaveMember,
  onDeleteMember,
  onOpenMember,
  onEditMemberNotes,
}) {
  const members = useMemo(() => readEntityMembers(selectedEntity), [selectedEntity]);
  const [draft, setDraft] = useState(EMPTY_MEMBER_DRAFT);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isPanelOpen, setIsPanelOpen] = useState(() => readPanelOpen(scopeKey, members.length > 0));
  const deferredQuery = useDeferredValue(query);

  const filteredMembers = useMemo(() => {
    const q = normalizeSearchText(deferredQuery);
    if (!q) return members;
    return members.filter((member) => normalizeSearchText(memberSearchBlob(member)).includes(q));
  }, [members, deferredQuery]);

  const patchDraft = (patch) => setDraft((prev) => ({ ...prev, ...patch }));
  const closeForm = () => {
    setDraft({ ...EMPTY_MEMBER_DRAFT });
    setIsFormOpen(false);
  };
  const startCreate = () => {
    setDraft({ ...EMPTY_MEMBER_DRAFT });
    setIsFormOpen(true);
  };
  const setPanelOpen = (open) => {
    setIsPanelOpen(open);
    writePanelOpen(scopeKey, open);
  };
  const startCreateAndOpen = () => {
    setPanelOpen(true);
    startCreate();
  };
  const startEdit = (member) => {
    setPanelOpen(true);
    setDraft(toDraft(member));
    setIsFormOpen(true);
  };

  const handleSubmit = (event) => {
    event?.preventDefault?.();
    onSaveMember?.(draft);
    closeForm();
  };

  const draftName = safeString(draft.name).trim();
  const isEditingExisting = Boolean(draft.id);
  const panelTitleId = `entity-members-title-${safeString(selectedEntity?.id) || 'none'}`;

  return (
    <section className="mb-8 overflow-hidden rounded-xl border border-slate-800/90 bg-slate-950/35 shadow-inner">
      <div className={`flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between ${isPanelOpen ? 'border-b border-slate-800/90' : ''}`}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-700/40 bg-cyan-950/30 text-cyan-300">
            <Users size={18} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 id={panelTitleId} className="text-base font-heading font-bold text-cyan-100">Nhân vật trong thẻ</h3>
              <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                {members.length}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-slate-500 font-serif">
              {safeString(selectedEntity?.name) || 'Thẻ đang chọn'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isPanelOpen && (
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Lọc nhân vật..."
                className="tt-kbd-focus h-9 w-52 rounded-lg border border-slate-800 bg-slate-900 pl-9 pr-3 text-[12px] text-slate-200 outline-none focus:border-cyan-600/50"
              />
            </div>
          )}
          <button
            type="button"
            onClick={startCreateAndOpen}
            className="tt-kbd-focus flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 text-[12px] font-bold text-slate-300 transition-colors hover:border-cyan-600/50 hover:text-cyan-200"
          >
            <Plus size={14} /> Mới
          </button>
          <button
            type="button"
            onClick={() => setPanelOpen(!isPanelOpen)}
            aria-expanded={isPanelOpen}
            aria-controls="entity-members-panel-body"
            className="tt-kbd-focus flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 text-[12px] font-bold text-slate-300 transition-colors hover:border-cyan-600/50 hover:text-cyan-200"
          >
            {isPanelOpen ? <><EyeOff size={14} /> Ẩn <ChevronUp size={13} /></> : <><Eye size={14} /> Hiện <ChevronDown size={13} /></>}
          </button>
        </div>
      </div>

      {!isPanelOpen && (
        <div className="border-t border-slate-900/70 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-slate-800 bg-slate-900/25 px-3 py-2.5">
            <div className="min-w-0 text-[12px] font-serif text-slate-400">
              {members.length > 0
                ? members.slice(0, 3).map((member) => safeString(member?.name)).filter(Boolean).join(' · ')
                : 'Đang thu gọn'}
            </div>
            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              className="tt-kbd-focus flex h-8 items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 text-[11px] font-bold text-slate-300 hover:border-cyan-600/50 hover:text-cyan-200"
            >
              <Eye size={13} /> Mở
            </button>
          </div>
        </div>
      )}

      {isPanelOpen && (
        <div
          id="entity-members-panel-body"
          aria-labelledby={panelTitleId}
          className={`grid gap-4 p-4 ${isFormOpen ? 'xl:grid-cols-[minmax(260px,360px)_1fr]' : ''}`}
        >
          <div className="rounded-lg border border-slate-800 bg-slate-900/25">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-3 py-2.5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Danh sách</span>
              <span className="text-[11px] font-semibold text-slate-500">{filteredMembers.length}/{members.length}</span>
            </div>
            <div className={`${isFormOpen ? 'max-h-[310px]' : 'max-h-[420px]'} overflow-y-auto p-2 custom-scrollbar`}>
              {filteredMembers.length > 0 ? (
                <div className="space-y-1.5">
                  {filteredMembers.map((member) => {
                    const active = isFormOpen && draft.id && draft.id === member.id;
                    const name = safeString(member.name).trim();
                    const subtitle = [member.role, member.status].map(safeString).filter(Boolean).join(' · ');
                    const hasNotes = Boolean(safeString(member.info).trim());
                    return (
                      <div
                        key={member.id}
                        className={`rounded-lg border px-2.5 py-2 transition-colors ${
                          active
                            ? 'border-cyan-500/60 bg-cyan-950/20'
                            : 'border-slate-800 bg-slate-950/45 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-400">
                            <UserRound size={16} />
                          </div>
                          <div className="min-w-0 flex-1 text-left">
                            <div className="truncate font-serif text-sm font-bold text-slate-100">{name || 'Chưa đặt tên'}</div>
                            {subtitle && <div className="mt-0.5 truncate text-[11px] text-slate-400">{subtitle}</div>}
                            {safeString(member.alias).trim() && (
                              <div className="mt-1 truncate text-[11px] text-indigo-200/80 font-serif">
                                {safeString(member.alias)}
                              </div>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onOpenMember?.(member)}
                              title="Mở hồ sơ"
                              className="tt-kbd-focus flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-400 hover:border-violet-500/60 hover:text-violet-200"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditMemberNotes?.(member)}
                              title="Ghi chép chi tiết"
                              className="tt-kbd-focus flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-400 hover:border-amber-500/60 hover:text-amber-200"
                            >
                              <BookOpen size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => startEdit(member)}
                              title="Sửa thông tin"
                              className="tt-kbd-focus flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-400 hover:border-cyan-500/60 hover:text-cyan-200"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteMember?.(member)}
                              title="Xóa"
                              className="tt-kbd-focus flex h-8 w-8 items-center justify-center rounded-lg border border-rose-900/60 bg-rose-950/20 text-rose-300 hover:border-rose-500/70 hover:text-rose-100"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {name && (
                            <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-violet-700/40 bg-violet-950/25 px-2 py-0.5 text-[10px] font-bold text-violet-200">
                              <Link2 size={11} className="shrink-0" />
                              <span className="truncate">[[{name}]]</span>
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                            hasNotes
                              ? 'border-amber-700/40 bg-amber-950/25 text-amber-200'
                              : 'border-slate-700 bg-slate-900/60 text-slate-500'
                          }`}>
                            <BookOpen size={11} />
                            {hasNotes ? 'Có ghi chép' : 'Chưa ghi chép'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-[116px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 bg-slate-950/35 px-4 py-6 text-center">
                  <Users size={22} className="mb-2 text-slate-600" />
                  <p className="text-sm font-serif text-slate-500">
                    {members.length === 0 ? 'Chưa có nhân vật.' : 'Không có kết quả.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {isFormOpen && (
            <form onSubmit={handleSubmit} className="rounded-lg border border-slate-800 bg-slate-900/25 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-heading font-bold text-slate-100">
                    {isEditingExisting ? 'Sửa hồ sơ' : 'Thêm nhân vật'}
                  </h4>
                  {draftName && (
                    <span className="mt-1 inline-flex max-w-full items-center gap-1 rounded-md border border-violet-700/40 bg-violet-950/25 px-2 py-0.5 text-[10px] font-bold text-violet-200">
                      <Link2 size={11} className="shrink-0" />
                      <span className="truncate">[[{draftName}]]</span>
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={closeForm}
                  className="tt-kbd-focus flex h-8 items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-[11px] font-bold text-slate-300 hover:text-slate-100"
                >
                  <X size={13} /> Hủy
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">Tên nhân vật</span>
                  <input
                    value={draft.name}
                    onChange={(e) => patchDraft({ name: e.target.value })}
                    placeholder="VD: Tần Hạo"
                    className="tt-kbd-focus h-10 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-cyan-600/50"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">Bí danh</span>
                  <input
                    value={draft.alias}
                    onChange={(e) => patchDraft({ alias: e.target.value })}
                    placeholder="Tách bằng dấu phẩy / gạch chéo"
                    className="tt-kbd-focus h-10 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-cyan-600/50"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">Vai trò</span>
                  <input
                    value={draft.role}
                    onChange={(e) => patchDraft({ role: e.target.value })}
                    placeholder="VD: Thiếu chủ, trưởng lão..."
                    className="tt-kbd-focus h-10 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-cyan-600/50"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">Trạng thái / tu vi</span>
                  <input
                    value={draft.status}
                    onChange={(e) => patchDraft({ status: e.target.value })}
                    placeholder="VD: Trúc Cơ hậu kỳ"
                    className="tt-kbd-focus h-10 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-cyan-600/50"
                  />
                </label>
              </div>

              <div className="mt-4 rounded-lg border border-amber-800/35 bg-amber-950/10 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-amber-200">
                      <BookOpen size={13} /> Ghi chép chi tiết
                    </div>
                    <p className="mt-1 text-[12px] font-serif text-slate-400">
                      Dùng khu Ghi Chép Chi Tiết của thẻ cha để có đủ toolbar và AI. Nội dung sẽ lưu riêng vào nhân vật này.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!isEditingExisting}
                    onClick={() => onEditMemberNotes?.(draft)}
                    className="tt-kbd-focus flex h-9 items-center gap-1.5 rounded-lg border border-amber-700/45 bg-amber-950/25 px-3 text-[12px] font-bold text-amber-200 transition-colors hover:bg-amber-900/35 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <BookOpen size={14} /> Mở ghi chép
                  </button>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  className="tt-kbd-focus flex h-10 items-center gap-2 rounded-lg bg-cyan-700 px-4 text-sm font-bold text-white shadow-lg transition-colors hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!draftName}
                >
                  <Save size={15} /> {isEditingExisting ? 'Lưu thay đổi' : 'Lưu nhân vật'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  );
});
