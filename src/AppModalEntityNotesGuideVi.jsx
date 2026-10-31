// ==========================================
// AppModalEntityNotesGuideVi.jsx
// Purpose: show the in-app writing/formatting guide for Ghi Chép Chi Tiết
//          using the same visual language as the entity notes preview.
// Imported by: AppModalLayer.jsx.
// ==========================================

import React, { useEffect, useState } from 'react';
import { ScrollText, X } from 'lucide-react';
import guideMarkdown from '../HUONG_DAN_GHI_CHEP_CHI_TIET_VI.md?raw';
import { MarkdownPreviewPane } from './MarkdownPreviewPane.jsx';
import { useFocusTrap } from './lib/useFocusTrap.js';

export function AppModalEntityNotesGuide({ isOpen, onClose }) {
  const trapRef = useFocusTrap(isOpen);
  const [content] = useState(() => String(guideMarkdown || '').trim());

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal-guide)] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Hướng dẫn ghi chép chi tiết"
      onClick={onClose}
    >
      <div
        ref={trapRef}
        className="w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden rounded-3xl border border-violet-800/40 bg-slate-900 shadow-[0_0_50px_rgba(139,92,246,0.15)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800/80 bg-slate-950/90 px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-700/40 bg-violet-950/30 text-violet-200">
              <ScrollText size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="font-heading text-xl font-bold text-violet-100">Hướng dẫn ghi chép chi tiết</h2>
              <p className="text-[11px] text-slate-500 font-serif">
                Mở song song khi soạn để giữ bố cục, màu chữ và liên kết wiki gọn đẹp.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-500 transition-colors hover:border-violet-700/40 hover:text-white"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="rounded-3xl border border-slate-800/80 bg-slate-950/70 p-6">
            <MarkdownPreviewPane
              text={content}
              dirHandle={null}
              entityMap={[]}
              linkRegex={null}
              onNavigate={() => void 0}
              variant="entityNotes"
              className="max-w-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
