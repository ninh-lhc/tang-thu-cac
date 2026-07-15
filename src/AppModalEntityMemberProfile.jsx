// ==========================================
// AppModalEntityMemberProfile.jsx
// Purpose: quick-view modal for a child profile embedded under an entity card.
// Imported by AppModalLayer; opened from wiki links whose dest has memberId.
// Notes: parent card remains the real entity; labels come from parent/tab meta.
// ==========================================

import React from 'react';
import { Building2, ExternalLink, Folder, Gem, Link2, Shield, Tag, UserRound, X } from 'lucide-react';
import { safeString } from './MasterUtils.jsx';
import { DEFAULT_MEMBER_FIELD_LABELS } from './lib/entityMembers.js';
import { readMemberKind, resolveMemberKindDef } from './lib/entityMemberKind.js';
import { renderEntityNotesMarkdown } from './lib/renderEntityNotesMarkdown.jsx';
import { readWikiLinkOptOuts } from './lib/wikiLinkOptOut.js';
import { useFocusTrap } from './lib/useFocusTrap.js';

export function AppModalEntityMemberProfile({
  profile,
  onClose,
  onOpenParentEntity,
  currentContextDirHandle,
  entityMap,
  linkRegex,
  onNavigate,
}) {
  const isOpen = Boolean(profile?.member);
  const trapRef = useFocusTrap(isOpen);
  React.useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const { member, parentEntity } = profile;
  const fieldLabels = profile.fieldLabels || DEFAULT_MEMBER_FIELD_LABELS;
  const panelTitle = safeString(profile.panelTitle).trim() || 'Thẻ con';
  const memberName = safeString(member.name).trim() || `${panelTitle} chưa đặt tên`;
  const alias = safeString(member.alias).trim();
  const role = safeString(member.role).trim();
  const status = safeString(member.status).trim();
  const kindDef = resolveMemberKindDef(readMemberKind(member));
  const kindIcons = {
    person: UserRound,
    asset: Gem,
    org: Building2,
    folder: Folder,
    other: Tag,
  };
  const KindIcon = kindIcons[kindDef.id] || Tag;
  const parentName = safeString(parentEntity?.name || profile.parentLabel).trim();
  const scopeLabel = [profile.lonLabel, profile.tabLabel].map(safeString).filter(Boolean).join(' › ');

  return (
    <div
      className="fixed inset-0 z-[260] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-fast"
      role="dialog"
      aria-modal="true"
      aria-label={`Hồ sơ ${panelTitle.toLowerCase()} ${memberName}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        ref={trapRef}
        className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-violet-700/40 bg-slate-950 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 bg-slate-900/70 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-600/45 bg-violet-950/35 text-violet-200">
              <KindIcon size={20} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="break-words text-2xl font-heading font-bold text-slate-100">{memberName}</h2>
                <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${kindDef.chip}`}>
                  {kindDef.label}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border border-violet-700/40 bg-violet-950/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-violet-200">
                  <Link2 size={11} /> wiki con
                </span>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm font-serif text-slate-400">
                <Shield size={13} className="text-slate-500" />
                {parentName ? <span>Thuộc {parentName}</span> : null}
                {scopeLabel ? <span className="text-slate-600">· {scopeLabel}</span> : null}
              </p>
              {(role || status) && (
                <div className="mt-2 flex flex-wrap gap-2 text-sm font-serif text-cyan-200">
                  {role && (
                    <span className="rounded-md border border-cyan-800/40 bg-cyan-950/25 px-2 py-0.5">
                      <span className="mr-1 text-[10px] font-bold uppercase tracking-widest text-cyan-400/80">{fieldLabels.role}:</span>
                      {role}
                    </span>
                  )}
                  {status && (
                    <span className="rounded-md border border-cyan-800/40 bg-cyan-950/25 px-2 py-0.5">
                      <span className="mr-1 text-[10px] font-bold uppercase tracking-widest text-cyan-400/80">{fieldLabels.status}:</span>
                      {status}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="tt-kbd-focus rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-100"
            aria-label={`Đóng hồ sơ ${panelTitle.toLowerCase()}`}
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 custom-scrollbar">
          {alias && (
            <div className="mb-4 rounded-lg border border-indigo-800/50 bg-indigo-950/20 px-3 py-2">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-indigo-300">{fieldLabels.alias}</div>
              <div className="font-serif text-sm text-indigo-100">{alias}</div>
            </div>
          )}
          <div className="rounded-lg border border-slate-800 bg-slate-900/45 p-4">
            {safeString(member.info).trim()
              ? renderEntityNotesMarkdown(
                  safeString(member.info),
                  currentContextDirHandle,
                  entityMap,
                  linkRegex,
                  onNavigate,
                  parentEntity?.id || null,
                  readWikiLinkOptOuts(member)
                )
              : (
                <p className="py-8 text-center font-serif text-sm italic text-slate-500">
                  Chưa có ghi chú chi tiết cho thẻ con này.
                </p>
              )}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-800 bg-slate-900/70 px-5 py-4">
          <button
            type="button"
            onClick={onOpenParentEntity}
            className="tt-kbd-focus flex h-10 items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-4 text-sm font-bold text-slate-300 transition-colors hover:border-violet-500/60 hover:text-violet-200"
          >
            <ExternalLink size={15} /> Mở thẻ cha
          </button>
          <button
            type="button"
            onClick={onClose}
            className="tt-kbd-focus h-10 rounded-lg bg-violet-700 px-4 text-sm font-bold text-white transition-colors hover:bg-violet-600"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
