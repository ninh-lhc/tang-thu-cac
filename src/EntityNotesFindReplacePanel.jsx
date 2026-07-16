/**
 * Panel tìm & thay hàng loạt trong ghi chép chi tiết.
 * Dùng cạnh EntityNotesAiToolsMenu; logic thuần ở lib/entityNotesFindReplace.js.
 */
import React, { useMemo, useState } from 'react';
import { Replace, X } from 'lucide-react';
import { safeString } from './MasterUtils.jsx';
import {
  countEntityNotesFindMatches,
  replaceEntityNotesText,
} from './lib/entityNotesFindReplace.js';

export function EntityNotesFindReplacePanel({
  text = '',
  onReplace,
  subjectHint = '',
  disabled = false,
  showToast,
}) {
  const [open, setOpen] = useState(false);
  const [find, setFind] = useState('');
  const [replaceWith, setReplaceWith] = useState('');
  const [wholeWord, setWholeWord] = useState(true);
  const [caseSensitive, setCaseSensitive] = useState(false);

  const toggleOpen = () => {
    setOpen((wasOpen) => {
      const next = !wasOpen;
      if (next) {
        const hint = safeString(subjectHint).trim();
        if (hint) {
          setReplaceWith((prev) => (safeString(prev).trim() ? prev : hint));
        }
      }
      return next;
    });
  };

  const matchCount = useMemo(
    () =>
      countEntityNotesFindMatches(text, find, {
        wholeWord,
        caseSensitive,
        replaceWith,
      }),
    [text, find, wholeWord, caseSensitive, replaceWith]
  );

  const handleReplaceAll = () => {
    const needle = safeString(find).trim();
    if (!needle) {
      showToast?.('Nhập cụm cần tìm.', 'warning');
      return;
    }
    const result = replaceEntityNotesText(text, needle, safeString(replaceWith), {
      wholeWord,
      caseSensitive,
    });
    if (result.count === 0) {
      showToast?.('Không tìm thấy chỗ nào để thay.', 'warning');
      return;
    }
    onReplace?.(result.text);
    showToast?.(`Đã thay ${result.count} chỗ.`, 'success');
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        disabled={disabled}
        className={[
          'px-3 py-2.5 rounded-[40px] text-[11px] font-bold transition-all shadow-md flex items-center gap-1.5 border disabled:opacity-50',
          open
            ? 'bg-amber-950/45 text-amber-100 border-amber-600/55'
            : 'bg-slate-900/80 text-slate-200 hover:bg-slate-800 border-slate-700/80',
        ].join(' ')}
        title="Tìm và thay hàng loạt — dùng để thêm địa danh vào tên gia tộc trùng"
      >
        <Replace size={13} />
        Tìm &amp; thay
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-[min(100vw-2rem,360px)] rounded-2xl border border-slate-700/90 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-md">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-amber-200/90">
                Tìm &amp; thay hàng loạt
              </p>
              <p className="mt-0.5 text-[11px] font-serif text-slate-500">
                VD: «Tần gia» → «Lĩnh Nam Tần gia»
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="tt-kbd-focus flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-200"
              aria-label="Đóng"
            >
              <X size={14} />
            </button>
          </div>

          <label className="mb-2 block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Tìm
            </span>
            <input
              value={find}
              onChange={(e) => setFind(e.target.value)}
              placeholder="Tần gia"
              className="tt-kbd-focus h-9 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-amber-600/50"
            />
          </label>

          <label className="mb-2.5 block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Thay bằng
            </span>
            <input
              value={replaceWith}
              onChange={(e) => setReplaceWith(e.target.value)}
              placeholder={safeString(subjectHint).trim() || 'Lĩnh Nam Tần gia'}
              className="tt-kbd-focus h-9 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-amber-600/50"
            />
          </label>

          <div className="mb-3 flex flex-wrap gap-3 text-[11px] text-slate-400">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={wholeWord}
                onChange={(e) => setWholeWord(e.target.checked)}
                className="rounded border-slate-600"
              />
              Cả từ
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
                className="rounded border-slate-600"
              />
              Phân biệt hoa thường
            </label>
            <span className="ml-auto tabular-nums text-slate-500">
              {safeString(find).trim() ? `${matchCount} chỗ` : '—'}
            </span>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="tt-kbd-focus h-9 rounded-xl border border-slate-700 bg-slate-900 px-3 text-[12px] font-bold text-slate-300 hover:text-slate-100"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleReplaceAll}
              disabled={disabled || !safeString(find).trim() || matchCount === 0}
              className="tt-kbd-focus flex h-9 items-center gap-1.5 rounded-xl bg-amber-700 px-3.5 text-[12px] font-bold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Replace size={13} />
              Thay tất cả
              {matchCount > 0 ? ` (${matchCount})` : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
