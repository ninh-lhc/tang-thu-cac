// ==========================================
// AppSharedUI.jsx
// Mục đích: Các component UI dùng lại: StatCard, SectionCard, ActionChip, Btn
// Import bởi: AppOverviewSection, AppCollectionSection và các component khác
// Lưu ý: Không có state nội bộ — tất cả là presentational
// ==========================================

import React from 'react';

/**
 * Ô thống kê nhỏ (label + value)
 * @param {string} label  - Tiêu đề nhỏ
 * @param {string|number} value - Giá trị hiển thị
 * @param {'amber'|'indigo'|'emerald'|'cyan'|'rose'} color - Màu accent
 * @param {React.ReactNode} icon - Icon (tuỳ chọn)
 */
export function StatCard({ label, value, color = 'amber', icon, className = '' }) {
  const colorMap = {
    amber:   'border-amber-900/30 text-amber-300',
    indigo:  'border-indigo-800/30 text-indigo-300',
    emerald: 'border-emerald-800/30 text-emerald-300',
    cyan:    'border-cyan-800/30 text-cyan-300',
    rose:    'border-rose-800/30 text-rose-300',
    slate:   'border-slate-700/50 text-slate-300',
  };
  const cls = colorMap[color] || colorMap.amber;
  return (
    <div className={`rounded-xl bg-slate-950/60 border ${cls.split(' ')[0]} px-3 py-2 ${className}`}>
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-1">
        {icon && <span className="opacity-70">{icon}</span>}
        {label}
      </div>
      <div className={`text-sm font-bold font-serif ${cls.split(' ')[1]}`}>{value}</div>
    </div>
  );
}

/**
 * Card section với tiêu đề + nội dung
 * @param {string} title - Tiêu đề section
 * @param {React.ReactNode} children - Nội dung
 * @param {React.ReactNode} action - Nút action ở góc phải (tuỳ chọn)
 * @param {'default'|'accent'|'ghost'} variant
 */
export function SectionCard({ title, children, action, variant = 'default', icon, className = '' }) {
  const variantMap = {
    default: 'border-slate-800/70 bg-slate-900/25',
    accent:  'border-amber-900/25 bg-gradient-to-br from-slate-950 via-slate-900/95 to-slate-950',
    ghost:   'border-slate-800/50 bg-slate-950/35',
  };
  const cls = variantMap[variant] || variantMap.default;
  return (
    <section className={`rounded-2xl border ${cls} p-6 ${className}`}>
      {(title || action) && (
        <div className="flex justify-between items-center mb-3">
          {title && (
            <label className="text-xs text-slate-500 uppercase font-bold tracking-widest flex items-center gap-2">
              {icon && icon}
              {title}
            </label>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * Chip nhỏ hiển thị trạng thái filter đang active
 * @param {'filter'|'group'|'tag'} type
 * @param {string} label
 * @param {function} onRemove - nếu có, hiển thị nút ×
 */
export function ActiveChip({ label, type = 'filter', onRemove }) {
  const colorMap = {
    filter: 'border-cyan-700/50 bg-cyan-950/30 text-cyan-200',
    group:  'border-amber-700/50 bg-amber-950/30 text-amber-200',
    tag:    'border-slate-700/50 bg-slate-900/50 text-slate-300',
  };
  const cls = colorMap[type] || colorMap.tag;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-serif ${cls}`}>
      {label}
      {onRemove && (
        <button type="button" onClick={onRemove} className="opacity-60 hover:opacity-100 ml-0.5">×</button>
      )}
    </span>
  );
}

/**
 * Button nhỏ dạng action (ví dụ: +1 chương, thêm nhãn)
 * @param {'default'|'amber'|'emerald'|'rose'|'ghost'} variant
 */
export function ActionBtn({ children, onClick, variant = 'default', disabled = false, className = '' }) {
  const variantMap = {
    default: 'border-slate-700 text-slate-300 hover:text-slate-100 hover:border-slate-600',
    amber:   'border-amber-700/60 bg-amber-700/80 hover:bg-amber-600 text-white',
    emerald: 'border-emerald-700/60 bg-emerald-700/80 hover:bg-emerald-600 text-white',
    rose:    'border-rose-800/40 text-rose-400 hover:border-rose-600/60 hover:bg-rose-950/30',
    ghost:   'border-dashed border-slate-700 text-slate-500 hover:text-amber-400 hover:border-amber-500/50',
    active:  'border-amber-500/70 bg-amber-500/15 text-amber-200',
  };
  const cls = variantMap[variant] || variantMap.default;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${cls} ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * Label nhỏ (badge) dạng số đếm
 */
export function CountBadge({ count, className = '' }) {
  if (!count) return null;
  return (
    <span className={`font-sans text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-900/50 text-amber-400 ${className}`}>
      {count}
    </span>
  );
}
