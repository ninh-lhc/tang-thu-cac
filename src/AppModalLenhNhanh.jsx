/**
 * Command palette — lệnh nhanh + chọn truyện.
 *
 * State: App.jsx (commandPaletteQuery, commandPaletteFiltered).
 * Hành động: onSelectCommand / onSelectNovel (thường bọc runCommandPaletteAction).
 */
import React from 'react';
import { Command } from 'lucide-react';
import { safeString } from './MasterUtils.jsx';

export function AppModalLenhNhanh({
  onClose,
  commandPaletteQuery,
  setCommandPaletteQuery,
  commandPaletteFiltered,
  onSelectCommand,
  onSelectNovel,
}) {
  return (
    <div
      className="fixed inset-0 z-[250] flex items-start justify-center pt-[12vh] px-4 bg-slate-950/85 backdrop-blur-md animate-fade-fast"
      role="dialog"
      aria-modal="true"
      aria-label="Lệnh nhanh"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-slate-900 border border-amber-900/40 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-2">
          <Command size={18} className="text-amber-500 flex-shrink-0" />
          <input
            autoFocus
            className="flex-1 bg-transparent text-slate-100 text-sm font-serif py-2 outline-none placeholder:text-slate-600"
            placeholder="Lệnh hoặc tên truyện…"
            value={commandPaletteQuery}
            onChange={(e) => setCommandPaletteQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
            }}
          />
          <span className="text-[10px] text-slate-600 font-mono hidden sm:inline">Esc đóng</span>
        </div>
        <div className="max-h-[50vh] overflow-y-auto custom-scrollbar p-2 text-left">
          {commandPaletteFiltered.actions.length > 0 && (
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-2 py-1">Lệnh</p>
          )}
          {commandPaletteFiltered.actions.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelectCommand(a.id)}
              className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700 mb-1"
            >
              <div className="text-sm font-bold text-slate-200 font-serif">{a.label}</div>
              <div className="text-[10px] text-slate-500">{a.sub}</div>
            </button>
          ))}
          {commandPaletteFiltered.novels.length > 0 && (
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-2 py-1 mt-2">Thư tịch</p>
          )}
          {commandPaletteFiltered.novels.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => onSelectNovel(n)}
              className="w-full text-left px-3 py-2 rounded-xl hover:bg-amber-950/30 border border-transparent hover:border-amber-900/30 mb-0.5"
            >
              <div className="text-sm font-serif text-amber-100/90 truncate">{safeString(n.title)}</div>
              <div className="text-[10px] text-slate-500 truncate">{safeString(n.author)}</div>
            </button>
          ))}
          {commandPaletteFiltered.actions.length === 0 && commandPaletteFiltered.novels.length === 0 && (
            <p className="text-center text-slate-500 text-sm font-serif py-8">Không khớp mục nào.</p>
          )}
        </div>
      </div>
    </div>
  );
}
