/**
 * Popup gợi ý [[wiki]] trong editor ghi chép (entityMap, không quét toàn bộ ghi chú).
 */
import React from 'react';
import { Plus } from 'lucide-react';

const STATUS_LABEL = {
  self: 'Thẻ hiện tại',
  external: 'Entity đã tồn tại',
  pending: 'Entity mới',
};

const STATUS_CLASS = {
  self: 'text-emerald-300',
  external: 'text-violet-300',
  pending: 'text-amber-200',
};

export function EntityNotesWikiAutocomplete({
  open,
  items = [],
  selectedIndex = 0,
  style = null,
  onPick,
}) {
  if (!open || items.length === 0) return null;

  return (
    <div
      role="listbox"
      aria-label="Gợi ý wiki-link"
      className="absolute z-30 max-h-56 min-w-[14rem] overflow-y-auto custom-scrollbar rounded-xl border border-slate-700/80 bg-slate-950/95 py-1 shadow-2xl"
      style={style || undefined}
    >
      {items.map((item, idx) => {
        const active = idx === selectedIndex;
        const isCreate = item.kind === 'create';
        return (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={active}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
              active ? 'bg-violet-900/45 text-violet-50' : 'text-slate-200 hover:bg-slate-900/80'
            }`}
            onMouseDown={(e) => {
              e.preventDefault();
              onPick?.(item);
            }}
          >
            {isCreate ? (
              <Plus size={14} className="shrink-0 text-amber-300" aria-hidden />
            ) : (
              <span className="h-2 w-2 shrink-0 rounded-full bg-current opacity-70" aria-hidden />
            )}
            <span className="min-w-0 flex-1 truncate font-serif">{item.name}</span>
            <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wide ${STATUS_CLASS[item.status] || 'text-slate-400'}`}>
              {isCreate ? 'Tạo mới' : STATUS_LABEL[item.status] || ''}
            </span>
          </button>
        );
      })}
    </div>
  );
}
