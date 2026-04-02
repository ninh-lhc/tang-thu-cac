// ==========================================
// AppAdvancedFieldSelect.jsx
// Purpose: field select dropdown used by collection filters in AppCollectionSection.
// Imported by: App.jsx, then passed down as a presentational component.
// Notes: keeps keyboard navigation and outside-click logic out of App.jsx.
// ==========================================

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const AdvancedFieldSelect = React.memo(function AdvancedFieldSelect({
  value,
  onChange,
  options,
  placeholder = 'Chon',
  active = false,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const optionRefs = useRef([]);
  const selected = options.find((opt) => opt.value === value);
  const selectedIndex = Math.max(0, options.findIndex((opt) => opt.value === value));

  useEffect(() => {
    if (!open) return undefined;
    const handleOutside = (event) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target)) setOpen(false);
    };
    const handleEsc = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('touchstart', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('touchstart', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const next = optionRefs.current[selectedIndex] || optionRefs.current[0];
    if (next) next.focus();
  }, [open, selectedIndex]);

  const focusOptionByIndex = (idx) => {
    const max = options.length - 1;
    if (max < 0) return;
    const clamped = Math.max(0, Math.min(max, idx));
    optionRefs.current[clamped]?.focus();
  };

  return (
    <div ref={rootRef} className="relative min-w-0 z-40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(true);
          } else if (event.key === 'Escape' || event.key === 'Tab') {
            setOpen(false);
          }
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`w-full border rounded-xl py-2 pl-3 pr-8 text-xs font-serif outline-none cursor-pointer transition-colors text-left truncate ${
          active
            ? 'bg-amber-900/30 border-amber-700/50 text-amber-100'
            : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700'
        }`}
      >
        {selected?.label || placeholder}
        <ChevronDown
          size={12}
          className={`absolute right-3 top-1/2 -translate-y-1/2 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute z-[60] mt-1 w-full max-h-64 overflow-auto rounded-xl border border-slate-700 bg-slate-950 shadow-2xl custom-scrollbar animate-fade-in origin-top"
        >
          {options.map((opt, idx) => (
            <button
              key={opt.value}
              ref={(el) => {
                optionRefs.current[idx] = el;
              }}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  focusOptionByIndex(idx + 1);
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  focusOptionByIndex(idx - 1);
                } else if (event.key === 'Home') {
                  event.preventDefault();
                  focusOptionByIndex(0);
                } else if (event.key === 'End') {
                  event.preventDefault();
                  focusOptionByIndex(options.length - 1);
                } else if (event.key === 'Escape' || event.key === 'Tab') {
                  setOpen(false);
                }
              }}
              role="option"
              aria-selected={opt.value === value}
              className={`w-full text-left px-3 py-2 text-xs font-serif transition-colors ${
                opt.value === value
                  ? 'bg-amber-700/30 text-amber-100'
                  : 'text-slate-200 hover:bg-slate-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
