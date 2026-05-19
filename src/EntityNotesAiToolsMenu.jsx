/**

 * Menu gộp: Làm sạch, AI Tạo Link, AI Dàn khung (ghi chép chi tiết / mốc timeline).

 */

import React, { useEffect, useRef } from 'react';

import { ChevronDown, Link2, RefreshCw, Sparkles, Wand2 } from 'lucide-react';



export function EntityNotesAiToolsMenu({

  open,

  onOpenChange,

  onClean,

  onAiCreateLink,

  onAiFormatStructure,

  isLinking = false,

  isFormatting = false,

}) {

  const rootRef = useRef(null);

  const busy = isLinking || isFormatting;



  useEffect(() => {

    if (!open) return undefined;

    const onDocMouseDown = (event) => {

      if (rootRef.current && !rootRef.current.contains(event.target)) {

        onOpenChange(false);

      }

    };

    document.addEventListener('mousedown', onDocMouseDown);

    return () => document.removeEventListener('mousedown', onDocMouseDown);

  }, [open, onOpenChange]);



  const runAction = (action) => {

    onOpenChange(false);

    action();

  };



  return (

    <div ref={rootRef} className="relative">

      <button

        type="button"

        aria-haspopup="menu"

        aria-expanded={open}

        onClick={() => onOpenChange(!open)}

        disabled={busy && !open}

        className="px-3 py-2.5 rounded-[40px] text-[11px] font-bold transition-all shadow-md flex items-center gap-1.5 bg-violet-950/50 text-violet-100 hover:bg-violet-900/45 border border-violet-700/50 disabled:opacity-50"

        title="Làm sạch, AI tạo [[link]], AI dàn khung markdown"

      >

        {busy ? (

          <div className="h-3.5 w-3.5 rounded-full border-2 border-violet-200 border-t-transparent animate-spin" />

        ) : (

          <Sparkles size={13} />

        )}

        {busy ? 'Đang xử lý...' : 'Công cụ AI'}

        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />

      </button>

      {open && (

        <div

          role="menu"

          className="absolute right-0 z-50 mt-1.5 min-w-[220px] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 py-1 shadow-2xl"

        >

          <button

            type="button"

            role="menuitem"

            onClick={() => runAction(onClean)}

            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12px] font-semibold text-slate-200 hover:bg-slate-800"

          >

            <RefreshCw size={14} className="text-slate-400 shrink-0" />

            Làm sạch

          </button>

          <button

            type="button"

            role="menuitem"

            disabled={isLinking}

            onClick={() => runAction(onAiCreateLink)}

            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12px] font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50"

          >

            <Link2 size={14} className="text-indigo-300 shrink-0" />

            {isLinking ? 'Đang tạo link...' : 'AI Tạo Link'}

          </button>

          <button

            type="button"

            role="menuitem"

            disabled={isFormatting}

            onClick={() => runAction(onAiFormatStructure)}

            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12px] font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50"

          >

            <Wand2 size={14} className="text-violet-300 shrink-0" />

            {isFormatting ? 'Đang dàn khung...' : 'AI Dàn khung'}

          </button>

        </div>

      )}

    </div>

  );

}


