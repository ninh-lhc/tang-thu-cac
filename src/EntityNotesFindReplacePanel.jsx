/**
 * Panel tìm & thay hàng loạt trong ghi chép chi tiết.
 * Phím tắt: Ctrl+H (mở/đóng). Esc đóng. Logic thuần ở lib/entityNotesFindReplace.js.
 */
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Replace, Link2, X } from 'lucide-react';
import { safeString } from './MasterUtils.jsx';
import {
  countEntityNotesFindMatches,
  replaceEntityNotesText,
  wrapEntityNotesWikiMatches,
} from './lib/entityNotesFindReplace.js';

const SHORTCUT_LABEL = 'Ctrl+H';

function readEditorSelection(editorId = 'entity-info-editor') {
  const el = document.getElementById(editorId);
  if (!el || typeof el.selectionStart !== 'number') return '';
  const start = el.selectionStart;
  const end = el.selectionEnd;
  if (end <= start) return '';
  return safeString(el.value).slice(start, end).trim();
}

export const EntityNotesFindReplacePanel = forwardRef(function EntityNotesFindReplacePanel(
  {
    text = '',
    onReplace,
    subjectHint = '',
    disabled = false,
    showToast,
    editorId = 'entity-info-editor',
  },
  ref
) {
  const [open, setOpen] = useState(false);
  const [find, setFind] = useState('');
  const [replaceWith, setReplaceWith] = useState('');
  const [wholeWord, setWholeWord] = useState(true);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wrapWikiFind, setWrapWikiFind] = useState(false);
  const [wrapWikiReplace, setWrapWikiReplace] = useState(false);
  const findInputRef = useRef(null);

  const openPanel = useCallback(
    ({ seedFromSelection = true } = {}) => {
      if (disabled) return;
      if (seedFromSelection) {
        const selected = readEditorSelection(editorId);
        if (selected && selected.length <= 80) {
          setFind(selected);
        }
      }
      const hint = safeString(subjectHint).trim();
      if (hint) {
        setReplaceWith((prev) => (safeString(prev).trim() ? prev : hint));
      }
      setOpen(true);
      window.setTimeout(() => {
        findInputRef.current?.focus?.();
        findInputRef.current?.select?.();
      }, 0);
    },
    [disabled, editorId, subjectHint]
  );

  const closePanel = useCallback(() => setOpen(false), []);

  const toggleOpen = useCallback(() => {
    if (open) closePanel();
    else openPanel({ seedFromSelection: true });
  }, [closePanel, open, openPanel]);

  useImperativeHandle(
    ref,
    () => ({
      open: openPanel,
      close: closePanel,
      toggle: toggleOpen,
      isOpen: () => open,
    }),
    [closePanel, open, openPanel, toggleOpen]
  );

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closePanel();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [closePanel, open]);

  const matchOptions = useMemo(
    () => ({
      wholeWord,
      caseSensitive,
      replaceWith,
      wrapMatched: wrapWikiFind,
    }),
    [wholeWord, caseSensitive, replaceWith, wrapWikiFind]
  );

  const matchCount = useMemo(
    () => countEntityNotesFindMatches(text, find, matchOptions),
    [text, find, matchOptions]
  );

  const runAction = () => {
    const needle = safeString(find).trim();
    if (!needle) {
      showToast?.('Nhập cụm cần tìm.', 'warning');
      return;
    }
    const replacement = safeString(replaceWith);
    const wrapOnly = wrapWikiFind && !replacement && !wrapWikiReplace;

    let result;
    if (wrapOnly) {
      result = wrapEntityNotesWikiMatches(text, needle, { wholeWord, caseSensitive });
    } else {
      if (!replacement && !wrapWikiFind && !wrapWikiReplace) {
        showToast?.('Nhập chuỗi thay thế hoặc bật bọc [[wiki]].', 'warning');
        return;
      }
      result = replaceEntityNotesText(text, needle, replacement, {
        wholeWord,
        caseSensitive,
        wrapMatched: wrapWikiFind && !replacement,
        wrapReplacement: wrapWikiReplace && Boolean(replacement),
      });
    }

    if (result.count === 0) {
      showToast?.('Không tìm thấy chỗ nào để thay.', 'warning');
      return;
    }
    onReplace?.(result.text);
    if (wrapOnly) {
      showToast?.(`Đã bọc [[wiki]] ${result.count} chỗ.`, 'success');
    } else if (wrapWikiReplace) {
      showToast?.(`Đã thay ${result.count} chỗ và bọc [[wiki]].`, 'success');
    } else if (wrapWikiFind && !replacement) {
      showToast?.(`Đã bọc [[wiki]] ${result.count} chỗ.`, 'success');
    } else {
      showToast?.(`Đã thay ${result.count} chỗ.`, 'success');
    }
  };

  const handleWrapWikiOnly = () => {
    const needle = safeString(find).trim();
    if (!needle) {
      showToast?.('Nhập cụm cần tìm.', 'warning');
      return;
    }
    const result = wrapEntityNotesWikiMatches(text, needle, { wholeWord, caseSensitive });
    if (result.count === 0) {
      showToast?.('Không còn chỗ nào chưa bọc [[wiki]].', 'warning');
      return;
    }
    onReplace?.(result.text);
    showToast?.(`Đã bọc [[wiki]] ${result.count} chỗ.`, 'success');
  };

  const primaryLabel = useMemo(() => {
    const replacement = safeString(replaceWith);
    if (wrapWikiFind && !replacement && !wrapWikiReplace) return 'Bọc wiki tất cả';
    if (wrapWikiReplace && replacement) return 'Thay & bọc wiki';
    return 'Thay tất cả';
  }, [replaceWith, wrapWikiFind, wrapWikiReplace]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        disabled={disabled}
        className={[
          'px-3 py-2.5 rounded-[40px] text-[11px] font-bold transition-all shadow-md flex items-center gap-1.5 border disabled:opacity-50',
          open
            ? 'bg-amber-900/55 text-amber-50 border-amber-500/70 ring-1 ring-amber-400/30'
            : 'bg-amber-950/50 text-amber-100 hover:bg-amber-900/45 border-amber-700/50',
        ].join(' ')}
        title={`Tìm kiếm và thay thế hàng loạt (${SHORTCUT_LABEL})`}
        aria-expanded={open}
        aria-label="Tìm kiếm và thay thế"
      >
        <Replace size={13} />
        Tìm thay thế
        <kbd className="ml-0.5 rounded border border-amber-700/50 bg-amber-950/60 px-1 py-px text-[9px] font-bold tracking-wide text-amber-200/80">
          {SHORTCUT_LABEL}
        </kbd>
      </button>

      {open && (
        <div className="absolute right-0 bottom-full z-30 mb-2 w-[min(100vw-2rem,360px)] rounded-2xl border border-slate-700/90 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-md">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-amber-200/90">
                Tìm kiếm và thay thế
              </p>
              <p className="mt-0.5 text-[11px] font-serif text-slate-500">
                {SHORTCUT_LABEL} mở/đóng · Esc đóng · VD: «Tần gia» → «Lĩnh Nam Tần gia»
              </p>
            </div>
            <button
              type="button"
              onClick={closePanel}
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
              ref={findInputRef}
              value={find}
              onChange={(e) => setFind(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  runAction();
                }
              }}
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  runAction();
                }
              }}
              placeholder={safeString(subjectHint).trim() || 'Lĩnh Nam Tần gia'}
              className="tt-kbd-focus h-9 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-amber-600/50"
            />
          </label>

          <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-slate-400">
            <label className="inline-flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                checked={wrapWikiFind}
                onChange={(e) => setWrapWikiFind(e.target.checked)}
                className="rounded border-slate-600"
              />
              Bọc [[wiki]] cụm tìm
            </label>
            <label className="inline-flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                checked={wrapWikiReplace}
                onChange={(e) => setWrapWikiReplace(e.target.checked)}
                disabled={!safeString(replaceWith).trim()}
                className="rounded border-slate-600 disabled:opacity-40"
              />
              Bọc [[wiki]] sau thay
            </label>
          </div>

          <div className="mb-3 flex flex-wrap gap-3 text-[11px] text-slate-400">
            <label className="inline-flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                checked={wholeWord}
                onChange={(e) => setWholeWord(e.target.checked)}
                className="rounded border-slate-600"
              />
              Cả từ
            </label>
            <label className="inline-flex cursor-pointer items-center gap-1.5">
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

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={handleWrapWikiOnly}
              disabled={disabled || !safeString(find).trim() || matchCount === 0}
              className="tt-kbd-focus flex h-9 items-center gap-1.5 rounded-xl border border-violet-700/50 bg-violet-950/35 px-3 text-[12px] font-bold text-violet-100 hover:bg-violet-900/40 disabled:cursor-not-allowed disabled:opacity-45"
              title="Chỉ bọc [[wiki]] cho cụm tìm thấy, không đổi chữ"
            >
              <Link2 size={13} />
              Chỉ bọc wiki
            </button>
            <button
              type="button"
              onClick={closePanel}
              className="tt-kbd-focus h-9 rounded-xl border border-slate-700 bg-slate-900 px-3 text-[12px] font-bold text-slate-300 hover:text-slate-100"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={runAction}
              disabled={disabled || !safeString(find).trim() || matchCount === 0}
              className="tt-kbd-focus flex h-9 items-center gap-1.5 rounded-xl bg-amber-700 px-3.5 text-[12px] font-bold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Replace size={13} />
              {primaryLabel}
              {matchCount > 0 ? ` (${matchCount})` : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
