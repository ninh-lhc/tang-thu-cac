/**
 * Command palette — lệnh nhanh + chọn truyện.
 *
 * State: App.jsx (commandPaletteQuery, commandPaletteFiltered).
 * Hành động: onSelectCommand / onSelectNovel (thường bọc runCommandPaletteAction).
 * Điều hướng: ↑↓ mũi tên, Enter chọn.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Command } from 'lucide-react';
import { safeString } from './MasterUtils.jsx';
import { useFocusTrap } from './lib/useFocusTrap.js';

export function AppModalLenhNhanh({
  onClose,
  commandPaletteQuery,
  setCommandPaletteQuery,
  commandPaletteFiltered,
  onSelectCommand,
  onSelectNovel,
}) {
  const [highlightIndex, setHighlightIndex] = useState(0);
  const listRef = useRef(null);
  const itemRefs = useRef([]);

  const flatItems = React.useMemo(() => {
    const items = [];
    commandPaletteFiltered.actions.forEach((a) => items.push({ type: 'action', data: a }));
    commandPaletteFiltered.novels.forEach((n) => items.push({ type: 'novel', data: n }));
    return items;
  }, [commandPaletteFiltered.actions, commandPaletteFiltered.novels]);
  const trapRef = useFocusTrap(true);

  useEffect(() => { setHighlightIndex(0); }, [flatItems.length]);
  useEffect(() => {
    const el = itemRefs.current[highlightIndex];
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlightIndex]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (flatItems.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % flatItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => (i - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = flatItems[highlightIndex];
      if (!item) return;
      if (item.type === 'action') onSelectCommand(item.data.id);
      else onSelectNovel(item.data);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[250] flex items-start justify-center pt-[12vh] px-4 bg-slate-950/85 backdrop-blur-md animate-fade-fast"
      role="dialog"
      aria-modal="true"
      aria-label="Lệnh nhanh"
      onClick={onClose}
    >
      <div
        ref={trapRef}
        className="w-full max-w-lg bg-slate-900 border border-amber-900/40 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-2">
          <Command size={18} className="text-amber-500 flex-shrink-0" />
          <input
            autoFocus
            className="flex-1 bg-transparent text-slate-100 text-sm font-serif py-2 outline-none placeholder:text-slate-600"
            placeholder="Lệnh hoặc tên truyện… (↑↓ Enter)"
            value={commandPaletteQuery}
            onChange={(e) => setCommandPaletteQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span className="text-[10px] text-slate-600 font-mono hidden sm:inline">Esc đóng</span>
        </div>
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto custom-scrollbar p-2 text-left">
          {commandPaletteFiltered.actions.length > 0 && (
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-2 py-1">Lệnh</p>
          )}
          {commandPaletteFiltered.actions.map((a, i) => {
            const idx = i;
            const isHighlight = flatItems[idx] && highlightIndex === idx;
            return (
              <button
                key={a.id}
                ref={(el) => { itemRefs.current[idx] = el; }}
                type="button"
                onClick={() => onSelectCommand(a.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl mb-1 border transition-colors ${isHighlight ? 'bg-amber-950/40 border-amber-800/60' : 'hover:bg-slate-800/80 border-transparent hover:border-slate-700'}`}
              >
                <div className="text-sm font-bold text-slate-200 font-serif">{a.label}</div>
                <div className="text-[10px] text-slate-500">{a.sub}</div>
              </button>
            );
          })}
          {commandPaletteFiltered.novels.length > 0 && (
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-2 py-1 mt-2">Thư tịch</p>
          )}
          {commandPaletteFiltered.novels.map((n, i) => {
            const idx = commandPaletteFiltered.actions.length + i;
            const isHighlight = highlightIndex === idx;
            return (
              <button
                key={n.id}
                ref={(el) => { itemRefs.current[idx] = el; }}
                type="button"
                onClick={() => onSelectNovel(n)}
                className={`w-full text-left px-3 py-2 rounded-xl mb-0.5 border transition-colors ${isHighlight ? 'bg-amber-950/40 border-amber-800/60' : 'hover:bg-amber-950/30 border-transparent hover:border-amber-900/30'}`}
              >
                <div className="text-sm font-serif text-amber-100/90 truncate">{safeString(n.title)}</div>
                <div className="text-[10px] text-slate-500 truncate">{safeString(n.author)}</div>
              </button>
            );
          })}
          {commandPaletteFiltered.actions.length === 0 && commandPaletteFiltered.novels.length === 0 && (
            <p className="text-center text-slate-500 text-sm font-serif py-8">Không khớp mục nào.</p>
          )}
        </div>
      </div>
    </div>
  );
}
