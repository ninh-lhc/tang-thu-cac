// ==========================================
// AppModalEntityMemberProfile.jsx
// Purpose: quick-view modal for a child profile embedded under an entity card.
// Imported by AppModalLayer; opened from wiki links whose dest has memberId.
// Notes: parent card remains the real entity; labels come from parent/tab meta.
// Layout sized like parent detail notes (wide + tall reading pane), not a compact popup.
// ==========================================

import React from 'react';
import { ExternalLink, Link2, Shield, X } from 'lucide-react';
import { safeString } from './MasterUtils.jsx';
import { DEFAULT_MEMBER_FIELD_LABELS } from './lib/entityMembers.js';
import { readMemberKind, resolveMemberKindDef } from './lib/entityMemberKind.js';
import { getMemberKindIcon } from './lib/entityMemberKindIcons.jsx';
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
  const KindIcon = getMemberKindIcon(member?.kind);
  const parentName = safeString(parentEntity?.name || profile.parentLabel).trim();
  const scopeLabel = [profile.lonLabel, profile.tabLabel].map(safeString).filter(Boolean).join(' › ');

  return (
    <div
      className="fixed inset-0 z-[260] flex items-center justify-center bg-slate-950/80 p-3 sm:p-5 backdrop-blur-sm animate-fade-fast"
      role="dialog"
      aria-modal="true"
      aria-label={`Hồ sơ ${panelTitle.toLowerCase()} ${memberName}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        ref={trapRef}
        className="flex h-[min(94vh,920px)] w-full max-w-[min(96vw,72rem)] flex-col overflow-hidden rounded-2xl border border-violet-700/40 bg-slate-950 shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-800 bg-slate-900/70 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-600/45 bg-violet-950/35 text-violet-200">
              <KindIcon size={20} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="break-words text-2xl font-heading font-bold text-slate-100 sm:text-3xl">{memberName}</h2>
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
                <div className="mt-2 flex flex-wrap gap-2 text-sm text-cyan-200">
                  {role && (
                    <span className="rounded-md border border-cyan-800/40 bg-cyan-950/25 px-2 py-0.5 font-serif">
                      <span className="mr-1 font-sans text-[10px] font-bold uppercase tracking-widest text-cyan-400/80">{fieldLabels.role}:</span>
                      {role}
                    </span>
                  )}
                  {status && (
                    <span className="rounded-md border border-cyan-800/40 bg-cyan-950/25 px-2 py-0.5 font-serif">
                      <span className="mr-1 font-sans text-[10px] font-bold uppercase tracking-widest text-cyan-400/80">{fieldLabels.status}:</span>
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

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-6 custom-scrollbar">
          {alias && (
            <div className="mb-5 rounded-lg border border-indigo-800/50 bg-indigo-950/20 px-3 py-2 sm:px-4">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-indigo-300">{fieldLabels.alias}</div>
              <div className="font-serif text-sm leading-relaxed text-indigo-100">{alias}</div>
            </div>
          )}
          <div className="min-h-[min(60vh,520px)] rounded-xl border border-slate-800 bg-slate-900/45 p-4 sm:p-6">
            {safeString(member.info).trim()
              ? (
                <div className="font-serif prose prose-invert max-w-none min-h-[200px] animate-fade-in">
                  {renderEntityNotesMarkdown(
                    safeString(member.info),
                    currentContextDirHandle,
                    entityMap,
                    linkRegex,
                    onNavigate,
                    parentEntity?.id || null,
                    readWikiLinkOptOuts(member)
                  )}
                </div>
              )
              : (
                <p className="py-16 text-center font-serif text-sm italic text-slate-500">
                  Chưa có ghi chú chi tiết cho thẻ con này.
                </p>
              )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-slate-800 bg-slate-900/70 px-5 py-4 sm:px-6">
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
