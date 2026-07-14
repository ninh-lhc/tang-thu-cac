// ==========================================
// AppEntityMembersPanel.jsx
// Purpose: manage member profiles embedded in one collection entity.
// Imported by AppCollectionSection; persistence is handled by App.jsx callbacks.
// Notes: member names/aliases become wiki targets through buildEntityLinkMap.
// ==========================================

import React, { memo, useDeferredValue, useMemo, useState } from 'react';
import { Eye, Link2, Pencil, Plus, Save, Search, Trash2, UserRound, Users, X } from 'lucide-react';
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
};

function toDraft(member) {
  if (!member) return { ...EMPTY_MEMBER_DRAFT };
  return {
    id: member.id || null,
    name: safeString(member.name),
    alias: safeString(member.alias),
    role: safeString(member.role),
    status: safeString(member.status),
    info: safeString(member.info),
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
  onSaveMember,
  onDeleteMember,
  onOpenMember,
}) {
  const members = useMemo(() => readEntityMembers(selectedEntity), [selectedEntity]);
  const [draft, setDraft] = useState(EMPTY_MEMBER_DRAFT);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const filteredMembers = useMemo(() => {
    const q = normalizeSearchText(deferredQuery);
    if (!q) return members;
    return members.filter((member) => normalizeSearchText(memberSearchBlob(member)).includes(q));
  }, [members, deferredQuery]);

  const patchDraft = (patch) => setDraft((prev) => ({ ...prev, ...patch }));
  const startCreate = () => setDraft({ ...EMPTY_MEMBER_DRAFT });
  const startEdit = (member) => setDraft(toDraft(member));

  const handleSubmit = (event) => {
    event?.preventDefault?.();
    onSaveMember?.(draft);
    if (!draft.id) setDraft({ ...EMPTY_MEMBER_DRAFT });
  };

  const draftName = safeString(draft.name).trim();
  const isEditingExisting = Boolean(draft.id);

  return (
    <section className="mb-8 rounded-lg border border-slate-800/90 bg-slate-950/45 shadow-inner">
      <div className="flex flex-col gap-3 border-b border-slate-800/90 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-700/40 bg-cyan-950/30 text-cyan-300">
            <Users size={17} />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-heading font-bold text-cyan-100">Nhân vật trong thẻ</h3>
            <p className="text-[11px] text-slate-500 font-serif">
              {members.length} hồ sơ con của {safeString(selectedEntity?.name) || 'thẻ này'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Lọc nhân vật..."
              className="tt-kbd-focus h-9 w-56 rounded-lg border border-slate-800 bg-slate-900 pl-9 pr-3 text-[12px] text-slate-200 outline-none focus:border-cyan-600/50"
            />
          </div>
          <button
            type="button"
            onClick={startCreate}
            className="tt-kbd-focus flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 text-[12px] font-bold text-slate-300 transition-colors hover:border-cyan-600/50 hover:text-cyan-200"
          >
            <Plus size={14} /> Mới
          </button>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(280px,0.9fr)_minmax(360px,1.1fr)]">
        <div className="max-h-[420px] overflow-y-auto border-b border-slate-800/80 p-3 custom-scrollbar lg:border-b-0 lg:border-r">
          {filteredMembers.length > 0 ? (
            <div className="space-y-2">
              {filteredMembers.map((member) => {
                const active = draft.id && draft.id === member.id;
                const name = safeString(member.name).trim();
                const subtitle = [member.role, member.status].map(safeString).filter(Boolean).join(' · ');
                return (
                  <div
                    key={member.id}
                    className={`rounded-lg border p-3 transition-colors ${
                      active
                        ? 'border-cyan-500/60 bg-cyan-950/20'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-400">
                        <UserRound size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate font-serif text-sm font-bold text-slate-100">{name || 'Chưa đặt tên'}</div>
                            {subtitle && <div className="mt-0.5 truncate text-[11px] text-slate-400">{subtitle}</div>}
                          </div>
                        </div>
                        {safeString(member.alias).trim() && (
                          <div className="mt-2 line-clamp-1 text-[11px] text-indigo-200/80 font-serif">
                            {safeString(member.alias)}
                          </div>
                        )}
                        {name && (
                          <div className="mt-2 inline-flex max-w-full items-center gap-1 rounded-md border border-violet-700/40 bg-violet-950/25 px-2 py-0.5 text-[10px] font-bold text-violet-200">
                            <Link2 size={11} className="shrink-0" />
                            <span className="truncate">[[{name}]]</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenMember?.(member)}
                        className="tt-kbd-focus flex h-8 items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 text-[11px] font-bold text-slate-300 hover:border-violet-500/60 hover:text-violet-200"
                      >
                        <Eye size={13} /> Mở
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(member)}
                        className="tt-kbd-focus flex h-8 items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 text-[11px] font-bold text-slate-300 hover:border-cyan-500/60 hover:text-cyan-200"
                      >
                        <Pencil size={13} /> Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteMember?.(member)}
                        className="tt-kbd-focus flex h-8 items-center gap-1 rounded-lg border border-rose-900/60 bg-rose-950/20 px-2.5 text-[11px] font-bold text-rose-300 hover:border-rose-500/70 hover:text-rose-100"
                      >
                        <Trash2 size={13} /> Xóa
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-[160px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 bg-slate-900/30 px-4 py-8 text-center">
              <Users size={24} className="mb-2 text-slate-600" />
              <p className="text-sm font-serif text-slate-500">
                {members.length === 0 ? 'Chưa có nhân vật con trong thẻ này.' : 'Không có nhân vật khớp bộ lọc.'}
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-heading font-bold text-slate-100">
                {isEditingExisting ? 'Sửa hồ sơ nhân vật' : 'Thêm nhân vật'}
              </h4>
              {draftName && (
                <p className="mt-0.5 text-[11px] font-serif text-violet-200/80">
                  Wiki riêng: [[{draftName}]]
                </p>
              )}
            </div>
            {isEditingExisting && (
              <button
                type="button"
                onClick={startCreate}
                className="tt-kbd-focus flex h-8 items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-[11px] font-bold text-slate-300 hover:text-slate-100"
              >
                <X size={13} /> Hủy sửa
              </button>
            )}
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

          <label className="mt-3 block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">Ghi chú nhân vật</span>
            <textarea
              value={draft.info}
              onChange={(e) => patchDraft({ info: e.target.value })}
              placeholder="Lưu thân phận, quan hệ, sự kiện, điểm nghi vấn... Hỗ trợ Markdown và [[wiki]]."
              rows={8}
              className="tt-kbd-focus min-h-[170px] w-full resize-y rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm leading-relaxed text-slate-100 outline-none custom-scrollbar focus:border-cyan-600/50 font-serif"
            />
          </label>

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
      </div>
    </section>
  );
});
