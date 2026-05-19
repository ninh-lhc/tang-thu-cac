/**

 * Một nút chạy pipeline AI: làm sạch → tạo [[link]] → dàn khung.

 */

import React from 'react';

import { Sparkles } from 'lucide-react';



export function EntityNotesAiToolsMenu({ onRunAll, isRunning = false, disabled = false }) {

  return (

    <button

      type="button"

      onClick={onRunAll}

      disabled={disabled || isRunning}

      className="px-3 py-2.5 rounded-[40px] text-[11px] font-bold transition-all shadow-md flex items-center gap-1.5 bg-violet-950/50 text-violet-100 hover:bg-violet-900/45 border border-violet-700/50 disabled:opacity-50"

      title="Làm sạch, AI tạo [[link]] và AI dàn khung — chạy lần lượt"

    >

      {isRunning ? (

        <div className="h-3.5 w-3.5 rounded-full border-2 border-violet-200 border-t-transparent animate-spin" />

      ) : (

        <Sparkles size={13} />

      )}

      {isRunning ? 'Đang xử lý...' : 'Chuẩn hoá AI'}

    </button>

  );

}


