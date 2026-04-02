// ==========================================
// TRỤ 3: HÌNH THỂ GIAO DIỆN & MODAL
// File: MasterComponents.jsx
// Vai trò: UI components tĩnh + tất cả Modal
// ==========================================

import React, { useState, useMemo, useEffect, useLayoutEffect, useRef, memo, useSyncExternalStore } from 'react';
import {
  Menu, Search, BookOpen, Filter, ChevronRight, ChevronDown,
  Settings, Network, Plus, Trash2, X, Save,
  Check, Library, Sparkles, Bold, Italic, Heading1, Heading2, List as ListIcon,
  FolderOpen, Cloud, Upload, HardDrive, Clock, Shield, Download, UploadCloud,
  Image as ImageIcon, History, LayoutGrid, Link2, ScrollText, User,
  Undo2, Redo2, Underline, Strikethrough, Highlighter, ListOrdered, Quote,
  TrendingUp, BarChart2, BookMarked, Users, Layers, Activity, Eye,
  GitBranch, ZoomIn, ZoomOut, Maximize2, RefreshCw, SlidersHorizontal, Atom, Edit2, Command, Type,
} from 'lucide-react';
import {
  FALLBACK_IMG, GENRES, THEMES,
  resolveFieldsTemplate,
  WIKI_ALIAS_FIELD,
} from './MasterEngines.js';
import {
  generateId, safeString, getTerms, AsyncLocalImage,
  handleToolbarClick,
  handleToolbarToggleLinePrefix,
  applyWikiLinkWrap,
  applyWikiLinkUnwrap,
  analyzeTextWithAI,
  suggestWikiLinkSpotsWithAI,
  truncateForAI,
  mapGeminiErrorToUserMessage,
} from './MasterUtils.jsx';
import { applyWikiLinkSpots } from './lib/applyWikiLinkSpots.js';
import { autoWrapWikiLinksByEntityMapWithCount } from './lib/autoWrapWikiLinks.js';
import { MILESTONE_LABELS } from './lib/milestoneLabels.js';
import { OWNER_TOKEN_GUIDE_TEXT } from './lib/autoOwnerMilestone.js';
import { mergeTabsByGenres } from './genreTabsMap.js';
import { searchNovelData, dedupeDeepSearchResults, metadataSearchHits } from './deepSearchCore.js';
import { useFocusTrap } from './lib/useFocusTrap.js';
import {
  ENTITY_NOTES_FONT_OPTIONS,
  ENTITY_NOTES_FONT_SIZE_OPTIONS,
  getEntityNotesPrefs,
  setEntityNotesPrefs,
  subscribeEntityNotesPrefs,
} from './lib/entityNotesPrefs.js';

const preventToolbarFocusSteal = (e) => e.preventDefault();

export const MarkdownToolbar = ({
  editorId,
  onInsertImage,
  onPickLocalImage,
  variant = 'standard',
  onUndo,
  onRedo,
  undoDisabled,
  redoDisabled,
  onEditorContentChange,
  notesFontKey,
  notesFontSizePx,
  onNotesFontKey,
  onNotesFontSizePx,
}) => {
  const sync = onEditorContentChange;
  const tb = (before, after) => () => handleToolbarClick(before, after, editorId, sync);
  const linePref = (p) => () => handleToolbarToggleLinePrefix(editorId, p, sync);

  return (
    <div className="flex flex-col gap-2 mb-4 pb-4 border-b border-slate-800">
      <div className="flex flex-wrap items-center gap-2">
        {variant === 'entityNotes' && onUndo && onRedo && (
          <>
            <button
              type="button"
              onMouseDown={preventToolbarFocusSteal}
              onClick={onUndo}
              disabled={undoDisabled}
              className="p-2 text-slate-400 hover:text-amber-400 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-35 disabled:pointer-events-none"
              title="Hoàn tác (Ctrl+Z)"
            >
              <Undo2 size={16} />
            </button>
            <button
              type="button"
              onMouseDown={preventToolbarFocusSteal}
              onClick={onRedo}
              disabled={redoDisabled}
              className="p-2 text-slate-400 hover:text-amber-400 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-35 disabled:pointer-events-none"
              title="Làm lại (Ctrl+Y hoặc Ctrl+Shift+Z)"
            >
              <Redo2 size={16} />
            </button>
            <div className="w-px h-6 bg-slate-800 mx-1" />
          </>
        )}
        <button
          type="button"
          onMouseDown={preventToolbarFocusSteal}
          onClick={tb('**', '**')}
          className="p-2 text-slate-400 hover:text-amber-400 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          title="In đậm"
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onMouseDown={preventToolbarFocusSteal}
          onClick={tb('*', '*')}
          className="p-2 text-slate-400 hover:text-amber-400 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          title="In nghiêng"
        >
          <Italic size={16} />
        </button>
        {variant === 'entityNotes' && (
          <>
            <button
              type="button"
              onMouseDown={preventToolbarFocusSteal}
              onClick={tb('<u>', '</u>')}
              className="p-2 text-slate-400 hover:text-amber-400 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
              title="Gạch chân (HTML, xem Preview)"
            >
              <Underline size={16} />
            </button>
            <button
              type="button"
              onMouseDown={preventToolbarFocusSteal}
              onClick={tb('~~', '~~')}
              className="p-2 text-slate-400 hover:text-amber-400 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
              title="Gạch ngang"
            >
              <Strikethrough size={16} />
            </button>
            <button
              type="button"
              onMouseDown={preventToolbarFocusSteal}
              onClick={tb('`', '`')}
              className="p-2 text-slate-400 hover:text-emerald-400 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
              title="Mã inline"
            >
              <span className="font-mono text-sm font-bold">{'`'}</span>
            </button>
            <button
              type="button"
              onMouseDown={preventToolbarFocusSteal}
              onClick={tb('==', '==')}
              className="p-2 text-slate-400 hover:text-amber-300 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
              title="Tô nền (highlight)"
            >
              <Highlighter size={16} />
            </button>
          </>
        )}
        <div className="w-px h-6 bg-slate-800 mx-1" />

        <button
          type="button"
          onMouseDown={preventToolbarFocusSteal}
          onClick={tb('[[', ']]')}
          className="p-2 text-indigo-500 hover:text-indigo-300 bg-indigo-950/50 rounded-lg hover:bg-indigo-900 transition-colors border border-indigo-900/50 shadow-inner"
          title="Wiki Link: bôi đen chữ để bọc [[...]], hoặc chèn [[]] tại con trỏ"
        >
          <Link2 size={16} />
        </button>
        <button
          type="button"
          onMouseDown={preventToolbarFocusSteal}
          onClick={() => handleToolbarClick('__WIKI_UNWRAP__', '', editorId, sync)}
          className="p-2 text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 rounded-lg hover:bg-cyan-900/40 transition-colors border border-cyan-900/50 shadow-inner"
          title="Gỡ Wiki Link: chọn [[...]] hoặc đặt con trỏ trong link để bỏ"
        >
          <X size={16} />
        </button>
        <div className="w-px h-6 bg-slate-800 mx-1" />

        <button
          type="button"
          onMouseDown={preventToolbarFocusSteal}
          onClick={tb('# ', '')}
          className="p-2 text-slate-400 hover:text-amber-400 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          title="Tiêu đề 1"
        >
          <Heading1 size={16} />
        </button>
        <button
          type="button"
          onMouseDown={preventToolbarFocusSteal}
          onClick={tb('## ', '')}
          className="p-2 text-slate-400 hover:text-amber-400 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          title="Tiêu đề 2"
        >
          <Heading2 size={16} />
        </button>
        <div className="w-px h-6 bg-slate-800 mx-1" />
        <button
          type="button"
          onMouseDown={preventToolbarFocusSteal}
          onClick={tb('- ', '')}
          className="p-2 text-slate-400 hover:text-amber-400 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          title="Gạch đầu dòng"
        >
          <ListIcon size={16} />
        </button>
        {variant === 'entityNotes' && (
          <>
            <button
              type="button"
              onMouseDown={preventToolbarFocusSteal}
              onClick={linePref('1. ')}
              className="p-2 text-slate-400 hover:text-amber-400 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
              title="Danh sách đánh số (1. )"
            >
              <ListOrdered size={16} />
            </button>
            <button
              type="button"
              onMouseDown={preventToolbarFocusSteal}
              onClick={linePref('> ')}
              className="p-2 text-slate-400 hover:text-amber-400 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
              title="Trích dẫn (> )"
            >
              <Quote size={16} />
            </button>
          </>
        )}
        <div className="w-px h-6 bg-slate-800 mx-1" />
        <button
          type="button"
          onMouseDown={preventToolbarFocusSteal}
          onClick={() => onInsertImage(editorId)}
          className="p-2 text-slate-400 hover:text-amber-400 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          title="Chèn Ảnh (URL)"
        >
          <ImageIcon size={16} />
        </button>
        {onPickLocalImage && (
          <button
            type="button"
            onMouseDown={preventToolbarFocusSteal}
            onClick={() => onPickLocalImage(null, editorId)}
            className="p-2 text-slate-400 hover:text-amber-400 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
            title="Chọn Ảnh Từ Máy tính"
          >
            <FolderOpen size={16} />
          </button>
        )}
      </div>
      {variant === 'entityNotes' && onNotesFontKey && onNotesFontSizePx != null && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <span className="font-bold uppercase tracking-wider mr-1">Khung soạn</span>
          <label className="flex items-center gap-1.5">
            <span className="text-slate-600">Font</span>
            <select
              value={notesFontKey}
              onChange={(e) => onNotesFontKey(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-300 max-w-[200px]"
              style={{ fontFamily: ENTITY_NOTES_FONT_OPTIONS.find((o) => o.id === notesFontKey)?.stack }}
            >
              {ENTITY_NOTES_FONT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id} style={{ fontFamily: o.stack }}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-slate-600">Cỡ</span>
            <select
              value={String(notesFontSizePx)}
              onChange={(e) => onNotesFontSizePx(Number(e.target.value))}
              onMouseDown={(e) => e.stopPropagation()}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-300 w-[4.5rem] text-center font-mono"
            >
              {ENTITY_NOTES_FONT_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
};

export const AppHeader = ({
  menu1Visible,
  setMenu1Visible,
  handleGoHome,
  setIsSettingsOpen,
  hasDirectory,
  dirName,
  setIsDeepSearchOpen,
  onInNovelSearch,
  showInNovelSearch,
  onOpenCommandPalette,
  performanceMode,
  setPerformanceMode,
}) => (
  <header className="h-16 bg-slate-950 border-b border-slate-900 flex items-center justify-between px-5 z-30 relative shadow-md">
    <div className="flex items-center gap-5">
      {!menu1Visible && <button onClick={() => setMenu1Visible(true)} className="p-2 hover:bg-slate-800 rounded-lg text-amber-500 transition-colors"><Menu size={24} /></button>}
      <div className="flex items-center gap-3 cursor-pointer group" onClick={handleGoHome}>
        <div className="w-8 h-8 relative flex items-center justify-center">
          <div className="absolute w-full h-full border-2 border-amber-600/80 rotate-45 group-hover:rotate-90 transition-transform duration-500"></div>
          <div className="w-2 bg-amber-500 h-2 rounded-full"></div>
        </div>
        <h1 className="text-xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-600">TÀNG THƯ CÁC</h1>
      </div>
    </div>
    <div className="flex items-center gap-2 md:gap-4">
      <div className={`hidden md:block px-3 py-1 rounded-full border text-[10px] font-serif ${hasDirectory ? 'border-emerald-500/50 text-emerald-400 bg-emerald-950/20' : 'border-slate-800 text-slate-500'}`}>
        {hasDirectory ? safeString(dirName).toUpperCase() : "CHƯA LIÊN KẾT"}
      </div>
      <button
        type="button"
        onClick={() => setPerformanceMode && setPerformanceMode(!performanceMode)}
        className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-mono transition-colors ${
          performanceMode ? 'border-emerald-500/60 bg-emerald-950/20 text-emerald-400' : 'border-slate-800 text-slate-500 hover:border-amber-800/50 hover:text-amber-400'
        }`}
        title="Performance Mode: giảm animation/blur/shadow cho mượt hơn"
      >
        <Activity size={14} />
        Perf
      </button>
      {onOpenCommandPalette && (
        <button type="button" onClick={onOpenCommandPalette} className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-700 text-[10px] text-slate-500 hover:text-amber-400 hover:border-amber-800/50 font-mono" title="Lệnh nhanh (Ctrl+K)">
          <Command size={14} /> <span>Ctrl+K</span>
        </button>
      )}
      <button onClick={setIsDeepSearchOpen} className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-full transition-all" title="Tìm toàn thư viện"><Search size={20} /></button>
      {showInNovelSearch && (
        <button type="button" onClick={onInNovelSearch} className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-full transition-all" title="Tra chỉ trong truyện đang mở"><BookOpen size={20} /></button>
      )}
      <button onClick={setIsSettingsOpen} className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-full transition-all" title="Cài Đặt"><Settings size={20} /></button>
    </div>
  </header>
);

// ==========================================
// DASHBOARD SCREEN
// ==========================================
export const DashboardScreen = memo(({ novelsMetadata, stats, isLoading, onSelectNovel, onAddNovel, onSelectNovelAtTab, novelStatsById = {} }) => {
  const { total, byStatus, byGenre, totalChaptersRead, totalChaptersAll, totalEntities, totalMilestones, recentNovels, topGenre } = stats;
  const [recentFilter, setRecentFilter] = useState('');
  const [selectedNovel, setSelectedNovel] = useState(null);
  const pct = totalChaptersAll > 0 ? Math.round((totalChaptersRead / totalChaptersAll) * 100) : 0;
  const statusColors = { 'Đang đọc': 'text-amber-400 bg-amber-900/30 border-amber-700/40', 'Hoàn thành': 'text-emerald-400 bg-emerald-900/30 border-emerald-700/40', 'Tạm ngưng': 'text-slate-400 bg-slate-800/50 border-slate-700/40' };
  const statusDots = { 'Đang đọc': 'bg-amber-400', 'Hoàn thành': 'bg-emerald-400', 'Tạm ngưng': 'bg-slate-500' };
  const topGenres = Object.entries(byGenre).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const maxGenreCount = topGenres[0]?.[1] || 1;

  const filteredRecentNovels = useMemo(() => {
    const q = recentFilter.trim().toLowerCase();
    if (!q) return recentNovels;
    return novelsMetadata.filter((n) => {
      const t = safeString(n.title).toLowerCase();
      const au = safeString(n.author).toLowerCase();
      const nGenres = Array.isArray(n.genres) ? n.genres : n.genre ? [n.genre] : [];
      const g = nGenres.map((x) => safeString(x).toLowerCase()).join(' ');
      return t.includes(q) || au.includes(q) || g.includes(q);
    }).slice(0, 24);
  }, [recentFilter, recentNovels, novelsMetadata]);

  const statsFocusNovel = useMemo(() => {
    if (selectedNovel && filteredRecentNovels.some((n) => n.id === selectedNovel.id)) return selectedNovel;
    const q = recentFilter.trim();
    if (!q || filteredRecentNovels.length === 0) return null;
    return filteredRecentNovels[0];
  }, [selectedNovel, recentFilter, filteredRecentNovels]);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950">
      <div className="px-10 pt-10 pb-6 border-b border-slate-800/60">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-amber-600 uppercase tracking-[0.3em] font-bold mb-2 font-serif">Tàng Thư Các — Tổng Quan</p>
            <h1 className="text-4xl font-heading font-bold text-slate-100">Mệnh Bàn Thống Kê</h1>
            <p className="text-slate-500 font-serif mt-1 text-sm">{isLoading ? 'Đang thu thập linh khí...' : `${total} bộ thư tịch đã được lưu trữ`}</p>
          </div>
          <button onClick={onAddNovel} className="flex items-center gap-2 px-5 py-2.5 bg-amber-700 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition-colors shadow-lg"><Plus size={16}/> Thu Thập Mới</button>
        </div>
      </div>
      <div className="px-10 py-8 space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: <BookMarked size={22}/>, label: 'Tổng Thư Tịch', value: total, sub: `${byStatus['Đang đọc']||0} đang đọc`, color: 'amber' },
            { icon: <Users size={22}/>, label: 'Tổng Số Thẻ', value: isLoading ? '...' : totalEntities, sub: 'Trên mọi bộ thư tịch', color: 'indigo' },
            { icon: <Activity size={22}/>, label: 'Mốc Sự Kiện', value: isLoading ? '...' : totalMilestones, sub: 'Trên toàn bộ thư tịch', color: 'emerald' },
            { icon: <TrendingUp size={22}/>, label: 'Tiến Độ Đọc', value: `${pct}%`, sub: `${totalChaptersRead.toLocaleString()} / ${totalChaptersAll > 0 ? totalChaptersAll.toLocaleString() : '???'} chương`, color: 'rose' },
          ].map(({ icon, label, value, sub, color }) => {
            const cm = { amber: 'text-amber-400 bg-amber-900/20 border-amber-700/30', indigo: 'text-indigo-400 bg-indigo-900/20 border-indigo-700/30', emerald: 'text-emerald-400 bg-emerald-900/20 border-emerald-700/30', rose: 'text-rose-400 bg-rose-900/20 border-rose-700/30' };
            return (
              <div key={label} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${cm[color]}`}>{icon}</div>
                <div className="text-3xl font-heading font-bold text-slate-100 mb-0.5">{value}</div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</div>
                <div className="text-xs text-slate-600 font-serif">{sub}</div>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5"><BarChart2 size={16} className="text-amber-500"/><h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Phân Loại Trạng Thái</h3></div>
            <div className="space-y-3">
              {Object.entries(byStatus).map(([status, count]) => {
                const pctBar = total > 0 ? (count / total) * 100 : 0;
                const bc = { 'Đang đọc': 'bg-amber-500', 'Hoàn thành': 'bg-emerald-500', 'Tạm ngưng': 'bg-slate-600' };
                return (
                  <div key={status}>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${statusDots[status]||'bg-slate-500'}`}></div><span className="text-sm font-serif text-slate-300">{status}</span></div>
                      <span className="text-sm font-bold text-slate-200">{count} <span className="text-slate-600 font-normal text-xs">({Math.round(pctBar)}%)</span></span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-700 ${bc[status]||'bg-slate-500'}`} style={{width:`${pctBar}%`}}></div></div>
                  </div>
                );
              })}
            </div>
            {totalChaptersAll > 0 && (
              <div className="mt-6 pt-5 border-t border-slate-800">
                <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tiến Độ Tổng</span><span className="text-sm font-bold text-amber-400">{pct}%</span></div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full" style={{width:`${pct}%`}}></div></div>
                <p className="text-xs text-slate-600 font-serif mt-1.5">{totalChaptersRead.toLocaleString()} / {totalChaptersAll.toLocaleString()} chương</p>
              </div>
            )}
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5"><Layers size={16} className="text-amber-500"/><h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Đại Lộ Tu Luyện</h3>{topGenre && <span className="ml-auto text-xs text-amber-500 font-serif italic">#{topGenre[0]} phổ biến nhất</span>}</div>
            {topGenres.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-slate-600 font-serif text-sm italic">Chưa có thể loại nào...</div>
            ) : (
              <div className="space-y-3">
                {topGenres.map(([genre, count], idx) => {
                  const bars = ['from-amber-600 to-amber-400','from-indigo-600 to-indigo-400','from-emerald-600 to-emerald-400','from-rose-600 to-rose-400','from-purple-600 to-purple-400'];
                  return (
                    <div key={genre}>
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-slate-600 w-4">#{idx+1}</span><span className="text-sm font-serif text-slate-300">{genre}</span></div>
                        <span className="text-sm font-bold text-slate-200">{count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className={`h-full rounded-full bg-gradient-to-r ${bars[idx]}`} style={{width:`${(count/maxGenreCount)*100}%`}}></div></div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2"><Eye size={16} className="text-amber-500"/><h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Thư Tịch Gần Đây</h3></div>
            <span className="text-xs text-slate-600 font-serif">{total} bộ tổng cộng</span>
          </div>
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              type="text"
              value={recentFilter}
              onChange={(e) => setRecentFilter(e.target.value)}
              placeholder="Lọc theo tên, tác giả, thể loại — hoặc nhấp thư tịch bên dưới để xem thống kê"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-sm font-serif text-slate-200 placeholder:text-slate-600 outline-none focus:border-amber-600/40"
            />
          </div>
          {statsFocusNovel && (() => {
            const st = novelStatsById[statsFocusNovel.id];
            const entN = st?.entities;
            const msN = st?.milestones;
            const byTab = st?.byTab || [];
            const chRead = parseInt(statsFocusNovel.chaptersRead || 0);
            const chTotal = statsFocusNovel.chaptersTotal && statsFocusNovel.chaptersTotal !== '???' ? parseInt(statsFocusNovel.chaptersTotal) : 0;
            const nGenres = Array.isArray(statsFocusNovel.genres) ? statsFocusNovel.genres : statsFocusNovel.genre ? [statsFocusNovel.genre] : [];
            return (
              <div className="mb-4 rounded-xl border border-amber-900/40 bg-amber-950/15 p-4">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-[10px] font-bold text-amber-600/90 uppercase tracking-widest">Thống kê truyện</p>
                  <button type="button" onClick={() => setSelectedNovel(null)} className="text-slate-500 hover:text-slate-300 text-xs">Đóng</button>
                </div>
                <p className="text-base font-heading font-bold text-slate-100 font-serif truncate">{safeString(statsFocusNovel.title)}</p>
                <p className="text-xs text-slate-500 font-serif mt-0.5">{safeString(statsFocusNovel.author)}{nGenres.length > 0 ? ` · ${nGenres.join(', ')}` : ''}</p>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="rounded-lg bg-slate-900/80 border border-slate-800 py-2 px-2">
                    <div className="text-lg font-bold text-indigo-300">{isLoading && (entN == null) ? '…' : (entN ?? '—')}</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Thẻ</div>
                  </div>
                  <div className="rounded-lg bg-slate-900/80 border border-slate-800 py-2 px-2">
                    <div className="text-lg font-bold text-emerald-300">{isLoading && (msN == null) ? '…' : (msN ?? '—')}</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Mốc</div>
                  </div>
                  <div className="rounded-lg bg-slate-900/80 border border-slate-800 py-2 px-2 col-span-2 sm:col-span-1">
                    <div className="text-lg font-bold text-amber-300">{chTotal > 0 ? `${chRead} / ${chTotal}` : (chRead > 0 ? `ch.${chRead}` : '—')}</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Chương</div>
                  </div>
                  <div className="rounded-lg bg-slate-900/80 border border-slate-800 py-2 px-2 col-span-2 sm:col-span-1 flex items-center justify-center">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${statusColors[statsFocusNovel.status] || statusColors['Đang đọc']}`}>{statsFocusNovel.status || 'Đang đọc'}</span>
                  </div>
                </div>
                {byTab.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-amber-900/30">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Theo mục — nhấp để xem chi tiết</p>
                    <div className="space-y-1.5">
                      {byTab.map((row) => {
                        const [lonId, nhoId] = row.key.split('|');
                        return (
                          <button
                            key={row.key}
                            type="button"
                            onClick={() => (onSelectNovelAtTab ? onSelectNovelAtTab(statsFocusNovel, lonId, nhoId) : onSelectNovel(statsFocusNovel))}
                            className="w-full flex justify-between items-center text-left py-2 px-3 rounded-lg border border-slate-800/80 hover:border-amber-600/40 hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 transition-colors"
                          >
                            <span className="text-sm font-serif truncate pr-2">{row.label}</span>
                            <span className="text-xs text-slate-500 flex-shrink-0">{row.entities} thẻ · {row.milestones} mốc</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onSelectNovel(statsFocusNovel)}
                  className="mt-3 w-full py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-sm font-bold font-serif transition-colors flex items-center justify-center gap-2"
                >
                  <BookOpen size={16} /> Xem truyện (Tổng quan)
                </button>
              </div>
            );
          })()}
          {recentFilter.trim() && filteredRecentNovels.length === 0 && (
            <p className="text-sm text-slate-500 font-serif italic mb-4">Không có thư tịch khớp «{recentFilter.trim()}»</p>
          )}
          <div className="space-y-2">
            {filteredRecentNovels.map((novel) => {
              const nGenres = Array.isArray(novel.genres) ? novel.genres : (novel.genre ? [novel.genre] : []);
              const chRead = parseInt(novel.chaptersRead || 0);
              const chTotal = novel.chaptersTotal && novel.chaptersTotal !== '???' ? parseInt(novel.chaptersTotal) : 0;
              const nPct = chTotal > 0 ? Math.round((chRead/chTotal)*100) : null;
              const stRow = novelStatsById[novel.id];
              const rowEnt = stRow?.entities;
              const rowMs = stRow?.milestones;
              return (
                <div
                  key={novel.id}
                  onClick={() => setSelectedNovel(novel)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors group ${statsFocusNovel?.id === novel.id ? 'border-amber-600/50 bg-amber-950/20' : 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700'}`}
                >
                  <div className="w-9 h-12 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0 border border-slate-700">
                    {novel.cover && !novel.cover.startsWith('local_image:') ? <img src={novel.cover} className="w-full h-full object-cover" alt="" onError={e=>{e.target.onerror=null;}}/> : <div className="w-full h-full flex items-center justify-center"><BookOpen size={14} className="text-slate-600"/></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-200 font-serif truncate">{safeString(novel.title)}</p>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${statusColors[novel.status]||statusColors['Đang đọc']}`}>{novel.status||'Đang đọc'}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate font-serif">{safeString(novel.author)} {nGenres.length > 0 && `· ${nGenres[0]}`}</p>
                    <p className="text-[10px] text-slate-600 font-serif mt-1">
                      {isLoading && (rowEnt == null) ? 'Đang đếm thẻ…' : `${rowEnt ?? '—'} thẻ · ${rowMs ?? '—'} mốc`}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right hidden sm:block">
                    {nPct !== null ? (
                      <div className="flex flex-col items-end gap-1"><span className="text-xs font-bold text-amber-500">{nPct}%</span><div className="w-16 h-1 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full" style={{width:`${nPct}%`}}></div></div></div>
                    ) : <span className="text-xs text-slate-600 font-serif">{chRead > 0 ? `ch.${chRead}` : '—'}</span>}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onSelectNovel(novel); }}
                    className="flex-shrink-0 px-3 py-2 rounded-lg bg-slate-800 hover:bg-amber-900/50 border border-slate-700 hover:border-amber-600/50 text-amber-500/90 hover:text-amber-400 text-xs font-bold font-serif transition-colors whitespace-nowrap"
                  >
                    Xem truyện
                  </button>
                </div>
              );
            })}
            {!recentFilter.trim() && total > 24 && (
              <p className="text-center text-xs text-slate-600 font-serif pt-2">... và {total - 24} bộ khác trong thư viện — gõ lọc để tìm</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export const LandingScreen = memo(({ setIsAddNovelOpen, setIsManageTabsOpen }) => (
  <div className="flex-1 flex flex-col items-center justify-center text-slate-200 relative w-full h-full bg-slate-950 overflow-hidden">
    <div className="z-10 flex flex-col items-center text-center max-w-3xl px-6 animate-fade-fast">
      <div className="w-40 h-40 border-2 border-amber-700/30 rounded-full flex items-center justify-center mb-8 relative shadow-[0_0_50px_rgba(217,119,6,0.05)] group">
         <div className="absolute inset-2 border border-amber-500/10 rounded-full animate-spin-slow"></div>
         <Library size={48} className="text-amber-500/80 group-hover:text-amber-400 transition-colors duration-500" />
      </div>
      <h1 className="text-5xl md:text-7xl font-heading text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-600 font-bold mb-6 tracking-widest">TÀNG THƯ CÁC</h1>
      <p className="text-lg text-slate-400 font-serif max-w-xl mb-12 leading-relaxed italic">Nơi lưu giữ vạn ngọc giản, ghi chép muôn ngàn đại đạo.</p>
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <button onClick={setIsAddNovelOpen} className="px-8 py-4 bg-gradient-to-r from-amber-800 to-amber-600 hover:from-amber-700 text-amber-50 rounded-full font-serif text-lg font-medium transition-transform shadow-lg flex items-center gap-3">
          <Plus size={24} /> <span className="tracking-wider">THU THẬP MỚI</span>
        </button>
        <button onClick={setIsManageTabsOpen} className="px-6 py-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-600/50 text-slate-300 hover:text-amber-400 rounded-full font-serif text-sm font-medium transition-all flex items-center gap-2">
          <Network size={20} /> <span>CẢI TẠO CẤU TRÚC</span>
        </button>
      </div>
    </div>
  </div>
));

export const EntityCard = memo(({ entity, onSelect, onDelete, onAddMilestone, tabConfig, dirHandle, parentTabId, parentLabel }) => {
  const fields = resolveFieldsTemplate(tabConfig, parentTabId, parentLabel);
  const terms = getTerms(parentTabId);
  const getFieldValue = (fieldId, ent) => {
     if (ent.dynamicData && ent.dynamicData[fieldId]) return ent.dynamicData[fieldId];
     if (fieldId === 'f_status') return ent.status;
     if (fieldId === 'f_title') return ent.title;
     if (fieldId === 'f_desc') return ent.description;
     return '';
  };

  const f1 = safeString(fields[0] ? getFieldValue(fields[0].id, entity) : '');
  const f2 = safeString(fields[1] ? getFieldValue(fields[1].id, entity) : '');
  const f3 = safeString(fields[2] ? getFieldValue(fields[2].id, entity) : '');

  const avatarColors = ['bg-amber-900/50','bg-indigo-900/50','bg-emerald-900/50','bg-rose-900/50','bg-purple-900/50','bg-sky-900/50','bg-orange-900/50','bg-teal-900/50'];
  const avatarTextColors = ['text-amber-400','text-indigo-400','text-emerald-400','text-rose-400','text-purple-400','text-sky-400','text-orange-400','text-teal-400'];
  const colorIdx = safeString(entity.name).charCodeAt(0) % avatarColors.length;

  const handleSelect = () => onSelect?.(entity);
  const handleDelete = (e) => { e?.stopPropagation?.(); onDelete?.(entity); };
  const handleAddMs = (e) => { e?.stopPropagation?.(); onAddMilestone?.(entity); };
  return (
    <div onClick={handleSelect} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-amber-600/50 hover:shadow-lg transition-all cursor-pointer group relative">
      <button onClick={handleDelete} className="absolute top-4 right-4 text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"><Trash2 size={16}/></button>
      <div className="flex items-center gap-4 mb-4">
         <div className={`w-14 h-14 rounded-full border border-amber-600/20 flex items-center justify-center font-bold text-xl overflow-hidden flex-shrink-0 ${entity.avatar ? 'bg-slate-950' : avatarColors[colorIdx]}`}>
           {entity.avatar ? (
              entity.avatar.startsWith('local_image:') ? (
                 <AsyncLocalImage filename={entity.avatar.replace('local_image:', '')} alt="avatar" dirHandle={dirHandle} className="w-full h-full object-cover" />
              ) : <img src={entity.avatar} className="w-full h-full object-cover" alt="" onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMG; }} />
           ) : <span className={avatarTextColors[colorIdx]}>{safeString(entity.name).charAt(0).toUpperCase()}</span>}
         </div>
         <div className="flex-1 min-w-0 pr-6">
            <h4 className="text-amber-100 font-bold font-serif text-base leading-snug break-words" title={safeString(entity.name)}>{safeString(entity.name)}</h4>
            {fields[0] && <p className="text-[11px] text-amber-600 font-bold uppercase tracking-widest mt-0.5 break-words">{f1 || '---'}</p>}
         </div>
      </div>
      <div className="mb-4 space-y-1">
        {fields[1] && <div className="text-xs text-slate-400 font-serif line-clamp-2 italic"><Shield size={10} className="inline mr-1 opacity-50"/> {safeString(fields[1].label)}: {f2 || '---'}</div>}
        {fields[2] && <p className="text-sm text-slate-300 font-serif line-clamp-3 leading-relaxed mt-1">{f3 || '...'}</p>}
      </div>
      <div className="w-full pt-3 border-t border-slate-800/80 flex justify-between items-center text-[10px] text-slate-500 uppercase tracking-widest font-bold">
        <span>{entity.milestones?.length || 0} {terms.msTitle.split('/')[0].trim()}</span>
        <div className="flex items-center gap-2">
          <button onClick={handleAddMs} className="p-1 rounded-md bg-slate-800 hover:bg-amber-900/40 hover:text-amber-400 text-slate-500 transition-colors opacity-0 group-hover:opacity-100" title="Thêm mốc sự kiện nhanh">
            <Plus size={12}/>
          </button>
          <span className="group-hover:text-amber-400 transition-colors flex items-center gap-1">Hồ Sơ <ChevronRight size={12}/></span>
        </div>
      </div>
    </div>
  );
});

export const ModalEntity = ({ isOpen, onClose, onSave, initialData, tabConfig, onUpdateTemplate, handleAvatarDrop, handlePickLocalImage, dirHandle, parentTabId, parentLabel, geminiApiKey, geminiMode = 'standard' }) => {
  void onUpdateTemplate;
  void geminiApiKey;
  void geminiMode;
  const terms = getTerms(parentTabId);
  const fieldsTemplate = useMemo(
    () => resolveFieldsTemplate(tabConfig || {}, parentTabId, parentLabel || ''),
    [tabConfig, parentTabId, parentLabel]
  );
  const fStatusLabel = useMemo(() => {
    const f = fieldsTemplate.find((x) => x.id === 'f_status');
    return f?.label || 'Tóm tắt dưới tên';
  }, [fieldsTemplate]);
  const [formData, setFormData] = useState({ id: null, name: '', avatar: '', rawText: '' });
  const [dynamicData, setDynamicData] = useState({});
  const trapRef = useFocusTrap(isOpen);
  const patchFormData = (patch) =>
    setFormData((prev) => {
      const nextPatch = typeof patch === 'function' ? patch(prev || {}) : patch;
      return { ...(prev || {}), ...nextPatch };
    });
  const patchDynamicData = (patch) =>
    setDynamicData((prev) => {
      const nextPatch = typeof patch === 'function' ? patch(prev || {}) : patch;
      return { ...(prev || {}), ...nextPatch };
    });

  /* Reset form khi mở modal (đồng bộ từ initialData) */
  useEffect(() => {
    if (!isOpen) return;
    /* eslint-disable react-hooks/set-state-in-effect -- dialog cần hydrate state khi mở */
    if (initialData) {
      setFormData({
        id: initialData.id,
        name: initialData.name,
        avatar: initialData.avatar,
        rawText: initialData.rawText || '',
      });
      const initialDyn = initialData.dynamicData ? { ...initialData.dynamicData } : {};
      if (!initialDyn.f_status && initialData.status) initialDyn.f_status = initialData.status;
      if (!initialDyn.f_title && initialData.title) initialDyn.f_title = initialData.title;
      if (!initialDyn.f_desc && initialData.description) initialDyn.f_desc = initialData.description;
      setDynamicData(initialDyn);
    } else {
      setFormData({ id: null, name: '', avatar: '', rawText: '' });
      setDynamicData({});
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isOpen, initialData]);

  useEffect(() => {
    const handler = (event) => {
      if (!isOpen || !formData.name.trim()) return;
      const trapEl = trapRef.current;
      const activeEl = document.activeElement;
      if (event?.defaultPrevented) return;
      if (trapEl && activeEl && !trapEl.contains(activeEl)) return;
      onSave(formData, dynamicData, null);
      onClose();
      if (event?.cancelable) event.preventDefault();
      event?.stopImmediatePropagation?.();
    };
    window.addEventListener('ttc-save', handler);
    return () => window.removeEventListener('ttc-save', handler);
  }, [isOpen, formData, dynamicData, onSave, onClose, trapRef]);
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={initialData ? `Tu bổ ${terms.entity}` : `Khởi tạo ${terms.entity}`}
    >
      <div data-testid="modal-entity-root" ref={trapRef} className="bg-slate-900 border border-amber-700/50 rounded-2xl w-full max-w-2xl shadow-[0_0_50px_rgba(217,119,6,0.2)] overflow-hidden flex flex-col max-h-[85vh] min-h-0">
        <div className="px-6 pt-6 pb-4 flex-shrink-0 border-b border-slate-800 flex justify-between items-center bg-slate-900">
          <h2 className="text-2xl font-heading font-bold text-slate-100">{initialData ? `Tu Bổ ${terms.entity}` : `Khởi Tạo ${terms.entity}`}</h2>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-white"><X size={20}/></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 custom-scrollbar space-y-5 bg-slate-900">
          <div>
            <label className="block text-xs font-bold text-amber-500 mb-1 uppercase tracking-widest">Danh xưng / Tên gọi *</label>
            <input
              autoFocus
              value={safeString(formData.name)}
              onChange={(e) => patchFormData({ name: e.target.value })}
              className="w-full bg-slate-950 border border-amber-600/50 rounded-xl p-3 text-amber-100 font-serif focus:border-amber-500 outline-none shadow-inner"
              placeholder="Bắt buộc nhập..."
            />
          </div>

          <div className="h-px bg-slate-800/80" />

          <div>
            <label className="block text-[10px] font-bold text-emerald-500 mb-2 uppercase tracking-widest flex items-center gap-2">
              <Upload size={12}/> {terms.image}
            </label>
            <div className="flex gap-4 items-center">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleAvatarDrop && handleAvatarDrop(e, (url) => patchFormData({ avatar: url }))}
                onClick={() => handlePickLocalImage && handlePickLocalImage((url) => patchFormData({ avatar: url }), null, 'avatar')}
                className="w-16 h-16 rounded-xl bg-slate-950 border border-dashed border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0 group cursor-pointer hover:border-amber-500 transition-colors"
                title="Nhấp hoặc kéo thả ảnh vào đây"
              >
                {formData.avatar ? (
                  formData.avatar.startsWith('local_image:') ? (
                    <AsyncLocalImage filename={formData.avatar.replace('local_image:', '')} alt="avatar" dirHandle={dirHandle} className="w-full h-full object-cover" />
                  ) : (
                    <img src={formData.avatar} className="w-full h-full object-cover" alt="avatar" onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMG; }} />
                  )
                ) : (
                  <ImageIcon className="text-slate-600 group-hover:text-amber-500 transition-colors" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex gap-2">
                  <input
                    value={safeString(formData.avatar)}
                    onChange={(e) => patchFormData({ avatar: e.target.value })}
                    className="flex-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:border-amber-500 outline-none"
                    placeholder="https://..."
                  />
                  <button
                    type="button"
                    onClick={() => handlePickLocalImage && handlePickLocalImage((url) => patchFormData({ avatar: url }), null, 'avatar')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-xs font-bold"
                  >
                    Chọn File
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 font-serif">Mẹo: có thể kéo thả ảnh vào ô vuông bên trái.</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-snug">{safeString(fStatusLabel)}</label>
              <input
                value={safeString(dynamicData.f_status)}
                onChange={(e) => patchDynamicData({ f_status: e.target.value })}
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 font-serif focus:border-amber-600/60 outline-none"
                placeholder="Ví dụ: Kim Đan kỳ · Đang hoạt động · UI hệ thống… (một dòng, hiện dưới tên ở Hồ sơ)"
              />
            <p className="text-[11px] text-slate-500 font-serif">Nhãn ô theo mục sưu tập (cảnh giới, cấp độ, loại chức năng…). Có thể để trống.</p>
          </div>

          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-snug">{WIKI_ALIAS_FIELD.label}</label>
            <textarea
              value={safeString(dynamicData.f_alias)}
              onChange={(e) => patchDynamicData({ f_alias: e.target.value })}
              rows={3}
              className="w-full bg-slate-950/80 border border-indigo-800/50 rounded-xl p-3 text-sm text-slate-200 font-serif focus:border-indigo-500 outline-none resize-y min-h-[4.5rem]"
              placeholder="Nhiều tên: dùng dấu phẩy, / hoặc | — ví dụ: Kim Đan, Hệ Thống / Boss"
            />
            <p className="text-[11px] text-slate-500 font-serif leading-relaxed">
              Mỗi tên tách ra sẽ cùng mở thẻ này khi bấm liên kết trong ghi chép. Gõ tên thường; <strong className="text-slate-400">không dùng [[...]]</strong> trong ô biệt danh.
            </p>
          </div>

          {parentTabId !== 'nhan-vat' && (
            <div className="rounded-xl border border-cyan-800/40 bg-cyan-950/15 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300 mb-1">Token nhãn cuối dòng (auto mốc Nhân Vật)</p>
              <p className="text-[11px] text-slate-300 font-serif leading-relaxed">
                Ở dòng <strong>Người sở hữu</strong>, dùng cú pháp: <code className="text-cyan-300">Lạc Nam (26) ?</code> hoặc <code className="text-cyan-300">Lạc Nam (26) !!</code>.
              </p>
              <p className="text-[11px] text-slate-400 font-serif leading-relaxed mt-1">
                {OWNER_TOKEN_GUIDE_TEXT}
              </p>
            </div>
          )}
        </div>

        <div className="p-6 pt-4 border-t border-slate-800 flex flex-shrink-0 justify-end gap-3 bg-slate-900">
          <button type="button" onClick={onClose} className="px-6 py-2.5 text-slate-400 hover:text-white font-serif transition-colors rounded-xl">Hủy bỏ</button>
          <button
            type="button"
            onClick={() => { if (formData.name.trim()) { onSave(formData, dynamicData, null); onClose(); } }}
            disabled={!formData.name.trim()}
            className="px-8 py-2.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl font-bold font-serif shadow-lg transition-all flex items-center gap-2"
          >
            <Save size={18}/> Lưu thông tin
          </button>
        </div>
      </div>
    </div>
  );
};

export const ModalMilestone = ({ isOpen, onClose, onSave, initialData, defaultChapterWhenNew, tabConfig, onUpdateTemplate, handleAvatarDrop, handlePickLocalImage, dirHandle, parentTabId, parentLabel, geminiApiKey, geminiMode = 'standard', entityMap = [], showToast, autoLinkToastEnabled = true }) => {
  const fieldsTemplate = resolveFieldsTemplate(tabConfig, parentTabId, parentLabel);
  const [editingFieldId, setEditingFieldId] = useState(null);
  const [editingFieldLabel, setEditingFieldLabel] = useState('');
  const [linkSuggestField, setLinkSuggestField] = useState(null);
  const terms = getTerms(parentTabId);
  const [formData, setFormData] = useState({ id: null, chapter: '', event: '' });
  const [snapshotData, setSnapshotData] = useState({ avatar: '', dynamicData: {} });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const EVENT_WIKI_FIELD_ID = '__milestone_event__';
  const dynamicFieldInputRefs = useRef({});
  const pendingWikiCaretRef = useRef(null);
  const trapRefMs = useFocusTrap(isOpen);
  const patchFormData = (patch) =>
    setFormData((prev) => {
      const nextPatch = typeof patch === 'function' ? patch(prev || {}) : patch;
      return { ...(prev || {}), ...nextPatch };
    });
  const patchSnapshotData = (patch) =>
    setSnapshotData((prev) => {
      const nextPatch = typeof patch === 'function' ? patch(prev || {}) : patch;
      return { ...(prev || {}), ...nextPatch };
    });

  useLayoutEffect(() => {
    const p = pendingWikiCaretRef.current;
    if (!p) return;
    pendingWikiCaretRef.current = null;
    const el = dynamicFieldInputRefs.current[p.fieldId];
    if (el) {
      el.focus();
      el.setSelectionRange(p.selStart, p.selEnd);
    }
  }, [snapshotData.dynamicData, formData.event]);
  
  useEffect(() => { 
    if(isOpen) {
       setErrorMsg('');
       setIsAnalyzing(false);
       if (initialData) {
           setFormData({ id: initialData.id, chapter: initialData.chapter, event: initialData.event });
           setSnapshotData(initialData.snapshot || { avatar: '', dynamicData: {} });
       } else {
           const dc = defaultChapterWhenNew != null && defaultChapterWhenNew !== '' ? String(defaultChapterWhenNew) : '';
           setFormData({ id: null, chapter: dc, event: '' });
           setSnapshotData({ avatar: '', dynamicData: {} });
       }
    } 
  }, [isOpen, initialData, defaultChapterWhenNew]);

  useEffect(() => {
    const handler = (event) => {
      if (!isOpen || !formData.chapter || !formData.event.trim()) return;
      const trapEl = trapRefMs.current;
      const activeEl = document.activeElement;
      if (event?.defaultPrevented) return;
      if (trapEl && activeEl && !trapEl.contains(activeEl)) return;
      const eventWrap = autoWrapWikiLinksByEntityMapWithCount(safeString(formData.event), entityMap);
      let wrappedCount = eventWrap.count;
      const wrappedDynamic = Object.fromEntries(
        Object.entries(snapshotData.dynamicData || {}).map(([k, v]) => {
          if (typeof v !== 'string') return [k, v];
          const fWrap = autoWrapWikiLinksByEntityMapWithCount(v, entityMap);
          wrappedCount += fWrap.count;
          return [k, fWrap.text];
        })
      );
      const nextSnapshot = { ...snapshotData, dynamicData: wrappedDynamic };
      const hasData = nextSnapshot.avatar || Object.values(nextSnapshot.dynamicData || {}).some(v => v);
      onSave({ ...formData, event: eventWrap.text }, hasData ? nextSnapshot : null);
      if (wrappedCount > 0 && autoLinkToastEnabled && typeof showToast === 'function') {
        showToast(`Đã tự bọc ${wrappedCount} [[liên kết]] theo thẻ có sẵn.`);
      }
      onClose();
      if (event?.cancelable) event.preventDefault();
      event?.stopImmediatePropagation?.();
    };
    window.addEventListener('ttc-save', handler);
    return () => window.removeEventListener('ttc-save', handler);
  }, [isOpen, formData, snapshotData, onSave, onClose, entityMap, showToast, autoLinkToastEnabled, trapRefMs]);

  const handleAI = async () => {
     const keys = Array.isArray(geminiApiKey) ? geminiApiKey : (geminiApiKey ? [geminiApiKey] : []);
     if (keys.length === 0) { setErrorMsg("Vui lòng thiết lập API Key trong phần Cài Đặt để dùng tính năng AI."); return; }
     if (!formData.event.trim()) return;
     const { wasTruncated } = truncateForAI(formData.event);
     setIsAnalyzing(true); setErrorMsg(wasTruncated ? "Đoạn quá dài — AI chỉ xử lý ~12k ký tự đầu." : '');
     try {
         const result = await analyzeTextWithAI(formData.event, fieldsTemplate, keys, geminiMode);
         if (result) {
             const newDyn = { ...snapshotData.dynamicData };
             fieldsTemplate.forEach(f => { if (result[f.id]) newDyn[f.id] = safeString(result[f.id]); });
             patchSnapshotData({ avatar: safeString(result.avatar) || snapshotData.avatar, dynamicData: newDyn });
         }
         const linkRes = await suggestWikiLinkSpotsWithAI(formData.event, keys, geminiMode);
         const spots = Array.isArray(linkRes?.linkSpots) ? linkRes.linkSpots : [];
         if (spots.length > 0) {
           setFormData((p) => {
             const current = safeString(p.event);
             const next = applyWikiLinkSpots(current, spots);
             return next === current ? p : { ...p, event: next };
           });
         }
     } catch (e) { setErrorMsg(mapGeminiErrorToUserMessage(e)); } finally { setIsAnalyzing(false); }
  };

  const handleAddField = () => {
     if (!newFieldLabel.trim()) return;
     const newField = { id: generateId('f'), label: newFieldLabel.trim() };
     onUpdateTemplate([...fieldsTemplate, newField]);
     setNewFieldLabel('');
  };

  const handleSave = () => {
     const eventWrap = autoWrapWikiLinksByEntityMapWithCount(safeString(formData.event), entityMap);
     let wrappedCount = eventWrap.count;
     const wrappedDynamic = Object.fromEntries(
       Object.entries(snapshotData.dynamicData || {}).map(([k, v]) => {
         if (typeof v !== 'string') return [k, v];
         const fWrap = autoWrapWikiLinksByEntityMapWithCount(v, entityMap);
         wrappedCount += fWrap.count;
         return [k, fWrap.text];
       })
     );
     const nextSnapshot = { ...snapshotData, dynamicData: wrappedDynamic };
     const hasData = nextSnapshot.avatar || Object.values(nextSnapshot.dynamicData).some(v => v);
     onSave({ ...formData, event: eventWrap.text }, hasData ? nextSnapshot : null);
     if (wrappedCount > 0 && autoLinkToastEnabled && typeof showToast === 'function') {
       showToast(`Đã tự bọc ${wrappedCount} [[liên kết]] theo thẻ có sẵn.`);
     }
     onClose();
  };

  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Ghi chép mệnh số"
    >
       <div data-testid="modal-milestone-root" ref={trapRefMs} className="bg-slate-900 border border-amber-700/50 rounded-2xl w-full max-w-5xl shadow-[0_0_50px_rgba(217,119,6,0.2)] overflow-hidden flex flex-col md:flex-row h-[85vh]">
          <div className="w-full md:w-5/12 bg-slate-950 border-r border-slate-800 p-6 flex flex-col relative">
             <h2 className="text-xl font-heading font-bold text-amber-500 mb-6 flex items-center gap-2"><Clock size={20}/> Ghi Chép Mệnh Số</h2>
             <div className="flex-1 flex flex-col space-y-4">
                <div>
                   <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-widest">Mốc Chương *</label>
                   <input type="number" autoFocus value={safeString(formData.chapter)} onChange={e=>patchFormData({ chapter: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-amber-300 font-bold focus:border-amber-500 outline-none" placeholder="VD: 150" />
                </div>
                {parentTabId === 'nhan-vat' && (
                  <div className="rounded-lg border border-cyan-800/50 bg-cyan-950/20 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300 mb-1">Bộ ký tự nhãn timeline (Nhân vật)</p>
                    <p className="text-[11px] text-slate-300 leading-relaxed font-serif">
                      {MILESTONE_LABELS.map((x) => `${x.bracketToken} ${x.title}`).join(' · ')}
                    </p>
                  </div>
                )}
                <div className="flex flex-col flex-1 min-h-0">
                   <div className="flex items-center justify-between gap-2 mb-1">
                     <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">{terms.msEvent}</label>
                     <div className="flex items-center gap-1 flex-shrink-0">
                       <button
                         type="button"
                         onMouseDown={preventToolbarFocusSteal}
                         onClick={() => {
                           const cur = safeString(formData.event);
                           const input = dynamicFieldInputRefs.current[EVENT_WIKI_FIELD_ID];
                           let a = cur.length; let b = cur.length;
                           if (input && document.activeElement === input) {
                             a = input.selectionStart ?? 0;
                             b = input.selectionEnd ?? a;
                           }
                           const { newText, selStart, selEnd } = applyWikiLinkWrap(cur, a, b);
                           pendingWikiCaretRef.current = { fieldId: EVENT_WIKI_FIELD_ID, selStart, selEnd };
                           patchFormData({ event: newText });
                         }}
                         className="text-[10px] font-bold text-amber-500 hover:text-amber-300 bg-amber-900/30 px-2 py-1 rounded border border-amber-700/40"
                         title="Chèn [[ ]] tại con trỏ hoặc bọc đoạn đang chọn"
                       >[[]]</button>
                       <button
                         type="button"
                         onMouseDown={preventToolbarFocusSteal}
                         onClick={() => {
                           const cur = safeString(formData.event);
                           const input = dynamicFieldInputRefs.current[EVENT_WIKI_FIELD_ID];
                           let a = cur.length; let b = cur.length;
                           if (input && document.activeElement === input) {
                             a = input.selectionStart ?? 0;
                             b = input.selectionEnd ?? a;
                           }
                           const { newText, selStart, selEnd } = applyWikiLinkUnwrap(cur, a, b);
                           pendingWikiCaretRef.current = { fieldId: EVENT_WIKI_FIELD_ID, selStart, selEnd };
                           patchFormData({ event: newText });
                         }}
                         className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-900/20 px-2 py-1 rounded border border-cyan-700/35"
                         title="Gỡ [[ ]] ở vùng chọn hoặc đoạn chứa con trỏ"
                       >Bỏ</button>
                     </div>
                   </div>
                   <div className="relative flex-1 min-h-[120px]">
                     <textarea
                       ref={(el) => { if (el) dynamicFieldInputRefs.current[EVENT_WIKI_FIELD_ID] = el; else delete dynamicFieldInputRefs.current[EVENT_WIKI_FIELD_ID]; }}
                       value={safeString(formData.event)}
                       onChange={e=>patchFormData({ event: e.target.value })}
                       className="w-full h-full min-h-[120px] bg-slate-900 border border-slate-700 rounded-lg p-4 text-sm text-slate-300 font-serif focus:border-amber-500 outline-none resize-none custom-scrollbar"
                       placeholder="Nhập sự kiện… Dùng [[Tên]] để liên kết wiki; [[]] / Bỏ để bọc hoặc gỡ link tại con trỏ."
                     />
                   </div>
                </div>
                <button onClick={handleAI} disabled={isAnalyzing || !formData.event.trim()} className="w-full py-3 bg-gradient-to-r from-emerald-800 to-emerald-600 hover:from-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                   {isAnalyzing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Sparkles size={18} />}
                   {isAnalyzing ? 'Đang dung hợp...' : 'Nhờ AI Bọc Link & Điền Form'}
                </button>
                {errorMsg && <p className="text-rose-400 text-xs mt-1 text-center">{safeString(errorMsg)}</p>}
             </div>
          </div>
          <div className="w-full md:w-7/12 p-6 md:p-8 flex flex-col bg-slate-900 relative">
             <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                <div>
                   <h2 className="text-2xl font-heading font-bold text-slate-100">Trạng Thái Tại Mốc Này</h2>
                   <p className="text-xs text-slate-400 font-serif mt-1 italic">{terms.snapshotHint}</p>
                </div>
                <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={20}/></button>
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-5">
                <div className="flex gap-4 mb-4">
                   <div
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => handleAvatarDrop && handleAvatarDrop(e, url => patchSnapshotData({ avatar: url }))}
                      onClick={() => handlePickLocalImage && handlePickLocalImage(url => patchSnapshotData({ avatar: url }), null, 'avatar-snapshot')}
                      className="w-16 h-16 rounded-xl bg-slate-950 border border-dashed border-slate-600 flex items-center justify-center overflow-hidden flex-shrink-0 group cursor-pointer hover:border-amber-500 transition-colors"
                      title="Nhấp hoặc kéo thả ảnh vào đây"
                   >
                      {snapshotData.avatar ? (
                         snapshotData.avatar.startsWith('local_image:') ? (
                            <AsyncLocalImage filename={snapshotData.avatar.replace('local_image:', '')} alt="avatar" dirHandle={dirHandle} className="w-full h-full object-cover" />
                         ) : <img src={snapshotData.avatar} className="w-full h-full object-cover" alt="avatar" onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMG; }} />
                      ) : <ImageIcon className="text-slate-600 group-hover:text-amber-500 transition-colors" />}
                   </div>
                   <div className="flex-1 flex flex-col justify-center">
                      <label className="block text-[10px] font-bold text-emerald-500 mb-1 uppercase tracking-widest flex items-center justify-between">
                         <span className="flex items-center gap-1"><Upload size={12}/> {terms.image} lúc này</span>
                      </label>
                      <div className="flex gap-2">
                         <input value={safeString(snapshotData.avatar)} onChange={e=>patchSnapshotData({ avatar: e.target.value })} className="flex-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:border-amber-500 outline-none" />
                         <button onClick={() => handlePickLocalImage && handlePickLocalImage(url => patchSnapshotData({ avatar: url }), null, 'avatar-snapshot')} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-xs font-bold">Chọn File</button>
                      </div>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                   {fieldsTemplate.map(field => (
                      <div key={field.id} className="group/msfield">
                         <div className="flex items-center gap-1 mb-1">
                           {editingFieldId === field.id ? (
                             <div className="flex items-center gap-1 flex-1">
                               <input autoFocus value={editingFieldLabel} onChange={e => setEditingFieldLabel(e.target.value)}
                                 onKeyDown={e => { if(e.key==='Enter' && editingFieldLabel.trim()) { onUpdateTemplate(fieldsTemplate.map(f => f.id===field.id ? {...f, label: editingFieldLabel.trim()} : f)); setEditingFieldId(null); } if(e.key==='Escape') setEditingFieldId(null); }}
                                 className="flex-1 bg-slate-950 border border-amber-600/60 rounded px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase outline-none" />
                               <button onClick={() => { if(editingFieldLabel.trim()) { onUpdateTemplate(fieldsTemplate.map(f => f.id===field.id ? {...f, label: editingFieldLabel.trim()} : f)); setEditingFieldId(null); }}} className="p-0.5 text-emerald-400"><Check size={12}/></button>
                               <button onClick={() => setEditingFieldId(null)} className="p-0.5 text-slate-500"><X size={12}/></button>
                             </div>
                           ) : (
                             <>
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex-1 truncate">{safeString(field.label)}</label>
                               <button onClick={() => { setEditingFieldId(field.id); setEditingFieldLabel(field.label); }} className="p-1 text-slate-600 hover:text-amber-400 transition-all rounded hover:bg-slate-800" title="Đổi tên trường"><Edit2 size={11}/></button>
                               {!['f_status','f_title','f_desc'].includes(field.id) && (
                                 <button onClick={() => onUpdateTemplate(fieldsTemplate.filter(f => f.id !== field.id))} className="p-1 text-slate-600 hover:text-rose-400 transition-all rounded hover:bg-slate-800" title="Xóa trường"><Trash2 size={11}/></button>
                               )}
                             </>
                           )}
                         </div>
                        <div className="relative">
                          <input
                            ref={(el) => { if (el) dynamicFieldInputRefs.current[field.id] = el; else delete dynamicFieldInputRefs.current[field.id]; }}
                            value={safeString(snapshotData.dynamicData[field.id])}
                            onChange={e=>patchSnapshotData((prev) => ({ dynamicData: { ...(prev.dynamicData || {}), [field.id]: e.target.value } }))}
                            onFocus={() => setLinkSuggestField(field.id)}
                            onBlur={() => setTimeout(() => setLinkSuggestField(null), 200)}
                            className="w-full bg-slate-950/80 border border-slate-700 rounded-lg p-2.5 pr-20 text-sm text-slate-200 font-serif focus:border-amber-500 outline-none"
                            placeholder="Nhập giá trị hoặc [[Tên]] để liên kết..."
                          />
                          {linkSuggestField === field.id && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                              <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  const cur = safeString(snapshotData.dynamicData[field.id]);
                                  const input = dynamicFieldInputRefs.current[field.id];
                                  let a = cur.length; let b = cur.length;
                                  if (input && document.activeElement === input) {
                                    a = input.selectionStart ?? 0;
                                    b = input.selectionEnd ?? a;
                                  }
                                  const { newText, selStart, selEnd } = applyWikiLinkWrap(cur, a, b);
                                  pendingWikiCaretRef.current = { fieldId: field.id, selStart, selEnd };
                                  patchSnapshotData((prev) => ({ dynamicData: { ...(prev.dynamicData || {}), [field.id]: newText } }));
                                }}
                                className="text-[10px] font-bold text-amber-500 hover:text-amber-300 bg-amber-900/30 px-1.5 py-0.5 rounded border border-amber-700/40"
                                title="Chèn [[ ]] tại con trỏ hoặc bọc đoạn đang chọn"
                              >[[]]</button>
                              <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  const cur = safeString(snapshotData.dynamicData[field.id]);
                                  const input = dynamicFieldInputRefs.current[field.id];
                                  let a = cur.length; let b = cur.length;
                                  if (input && document.activeElement === input) {
                                    a = input.selectionStart ?? 0;
                                    b = input.selectionEnd ?? a;
                                  }
                                  const { newText, selStart, selEnd } = applyWikiLinkUnwrap(cur, a, b);
                                  pendingWikiCaretRef.current = { fieldId: field.id, selStart, selEnd };
                                  patchSnapshotData((prev) => ({ dynamicData: { ...(prev.dynamicData || {}), [field.id]: newText } }));
                                }}
                                className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-900/20 px-1.5 py-0.5 rounded border border-cyan-700/35"
                                title="Gỡ [[ ]] ở vùng chọn hoặc đoạn chứa con trỏ"
                              >Bỏ</button>
                            </div>
                          )}
                        </div>
                      </div>
                   ))}
                </div>

                <div className="pt-4 mt-2 border-t border-slate-800/80">
                   <label className="block text-[10px] font-bold text-emerald-500 mb-2 uppercase tracking-widest flex items-center gap-1"><Plus size={12}/> Thêm Trường Mới</label>
                   <div className="flex gap-2">
                      <input value={safeString(newFieldLabel)} onChange={e=>setNewFieldLabel(e.target.value)} onKeyDown={e=>{if(e.key==='Enter') handleAddField()}} className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 outline-none focus:border-emerald-500" placeholder="VD: Cấp độ, Hiệu năng..." />
                      <button onClick={handleAddField} className="px-4 py-2 bg-slate-800 text-emerald-400 border border-emerald-900/50 rounded-lg text-sm font-bold">Tạo</button>
                   </div>
                </div>

             </div>
             <div className="pt-6 mt-4 border-t border-slate-800 flex justify-end gap-3">
                <button onClick={onClose} className="px-6 py-2.5 text-slate-400 hover:text-white font-serif rounded-xl">Hủy bỏ</button>
                <button onClick={handleSave} disabled={!formData.chapter || !formData.event.trim()} className="px-8 py-2.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl font-bold font-serif shadow-lg flex items-center gap-2"><Save size={18}/> {formData.id ? 'Cập Nhật' : 'Lưu Kỷ Nguyên'}</button>
             </div>
          </div>
       </div>
    </div>
  );
};

export const ModalQuickCreate = ({ isOpen, onClose, quickCreateName, onConfirm, activeTabs }) => {
    const [selectedPath, setSelectedPath] = useState('');
    
    const collectionTabs = [];
    if (activeTabs) {
        activeTabs.forEach(lon => {
            lon.subTabs?.forEach(nho => {
                if (nho.viewType === 'collection-track') {
                    collectionTabs.push({ path: `${lon.id}|${nho.id}`, label: `${lon.label} ➔ ${nho.label}` });
                }
            })
        });
    }

    const trapRefQuick = useFocusTrap(isOpen);
    if (!isOpen) return null;
    return (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-fast"
          role="dialog"
          aria-modal="true"
          aria-label="Ngưng tụ ý niệm"
        >
           <div ref={trapRefQuick} className="bg-slate-900 border border-emerald-900/50 rounded-2xl w-full max-w-md shadow-2xl p-6">
             <h2 className="text-xl font-heading font-bold text-emerald-500 mb-2">Ngưng Tụ Ý Niệm</h2>
             <p className="text-sm text-slate-400 font-serif mb-6">Khí tức <strong className="text-emerald-400">{quickCreateName}</strong> chưa được ghi chép. Bạn muốn tạo hồ sơ cho nó ở thẻ nào?</p>
             
             <select className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 focus:border-emerald-500 outline-none mb-6 font-serif" value={selectedPath} onChange={e => setSelectedPath(e.target.value)}>
                <option value="">-- Chọn phân loại thẻ --</option>
                {collectionTabs.map(t => <option key={t.path} value={t.path}>{t.label}</option>)}
             </select>

             <div className="flex justify-end gap-3">
                <button onClick={onClose} className="px-5 py-2.5 text-slate-400 font-serif hover:text-slate-200">Hủy</button>
                <button disabled={!selectedPath} onClick={() => { onConfirm(quickCreateName, selectedPath); onClose(); }} className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg font-bold font-serif shadow-lg flex items-center gap-2"><Sparkles size={16}/> Khai Sinh</button>
             </div>
           </div>
        </div>
    );
};

export const ModalSettings = ({
  isOpen,
  onClose,
  handleConnectFolder,
  dirHandle,
  dirName,
  onExportBackup,
  onExportIndexOnly,
  onImportBackup,
  geminiApiKeys,
  setGeminiApiKeys,
  aiMode = 'standard',
  setAiMode,
  wikiExactMatchOnly,
  setWikiExactMatchOnly,
  performanceMode,
  setPerformanceMode,
  autoLinkToastEnabled,
  setAutoLinkToastEnabled,
}) => {
  const [newKey, setNewKey] = useState('');
  const [testStatus, setTestStatus] = useState({}); // idx -> 'testing'|'ok'|'fail'
  const [showKeys, setShowKeys] = useState({});     // idx -> bool (hiện plain text)

  const notesTypoPrefs = useSyncExternalStore(subscribeEntityNotesPrefs, getEntityNotesPrefs, getEntityNotesPrefs);
  const trapRefSettings = useFocusTrap(isOpen);

  if (!isOpen) return null;

  const keys = Array.isArray(geminiApiKeys) ? geminiApiKeys : (geminiApiKeys ? [geminiApiKeys] : []);

  const handleAdd = () => {
    const trimmed = newKey.trim();
    if (!trimmed) return;
    setGeminiApiKeys([...keys, trimmed]);
    setNewKey('');
  };

  const handleRemove = (idx) => {
    setGeminiApiKeys(keys.filter((_, i) => i !== idx));
    setTestStatus(prev => { const n = {...prev}; delete n[idx]; return n; });
  };

  const handleTest = async (key, idx) => {
    setTestStatus(prev => ({ ...prev, [idx]: 'testing' }));
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'test' }] }] }) }
      );
      setTestStatus(prev => ({ ...prev, [idx]: res.ok ? 'ok' : 'fail' }));
    } catch {
      setTestStatus(prev => ({ ...prev, [idx]: 'fail' }));
    }
  };

  const maskKey = (k) => k.length > 12 ? k.slice(0, 8) + '••••••••' + k.slice(-4) : '••••••••••••';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Ấn ký và lưu trữ"
    >
       <div ref={trapRefSettings} className="bg-slate-900 border border-amber-700/50 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
             <div className="flex items-center gap-3">
                <HardDrive size={24} className="text-amber-500" />
                <h2 className="text-xl font-heading font-bold text-slate-100">Ấn Ký & Lưu Trữ</h2>
             </div>
             <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
          </div>
          <div className="p-6 pb-6 overflow-y-auto max-h-[80vh] custom-scrollbar space-y-7">

             {/* ===== MULTI API KEY ===== */}
             <div>
               <h3 className="text-sm font-bold text-indigo-400 mb-1 uppercase tracking-widest flex items-center gap-2"><Sparkles size={16}/> Khí Linh AI — Gemini API Keys</h3>
               <p className="text-slate-500 font-serif text-xs leading-relaxed mb-4">
                 Thêm nhiều key để tự động xoay vòng khi vượt giới hạn (429). Keys lưu cục bộ trong trình duyệt, không mất khi F5.
               </p>

               {/* Danh sách keys hiện có */}
               <div className="space-y-2 mb-4">
                 {keys.length === 0 && (
                   <div className="text-center py-4 text-slate-600 font-serif text-sm italic border border-dashed border-slate-800 rounded-xl">Chưa có key nào. Thêm key bên dưới.</div>
                 )}
                 {keys.map((k, idx) => {
                   const st = testStatus[idx];
                   return (
                     <div key={idx} className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2.5">
                       <div className={`w-2 h-2 rounded-full flex-shrink-0 ${st === 'ok' ? 'bg-emerald-400' : st === 'fail' ? 'bg-rose-500' : 'bg-slate-600'}`}/>
                       <span className="flex-1 font-mono text-xs text-slate-300 truncate select-none">
                         {showKeys[idx] ? k : maskKey(k)}
                       </span>
                       <span className="text-[10px] text-slate-600 flex-shrink-0">#{idx + 1}</span>
                       <button onClick={() => setShowKeys(prev => ({ ...prev, [idx]: !prev[idx] }))} className="p-1 text-slate-600 hover:text-slate-300 transition-colors flex-shrink-0" title={showKeys[idx] ? 'Ẩn' : 'Hiện'}>
                         <Eye size={13}/>
                       </button>
                       <button onClick={() => handleTest(k, idx)} disabled={st === 'testing'} className={`px-2 py-1 rounded-lg text-[10px] font-bold flex-shrink-0 transition-colors border ${st === 'ok' ? 'border-emerald-700/50 text-emerald-400 bg-emerald-950/30' : st === 'fail' ? 'border-rose-700/50 text-rose-400 bg-rose-950/30' : 'border-slate-700 text-slate-400 hover:text-indigo-400 hover:border-indigo-700/50 bg-slate-900'}`}>
                         {st === 'testing' ? '...' : st === 'ok' ? '✓ OK' : st === 'fail' ? '✗ Lỗi' : 'Thử'}
                       </button>
                       <button onClick={() => handleRemove(idx)} className="p-1 text-slate-600 hover:text-rose-400 transition-colors flex-shrink-0"><Trash2 size={14}/></button>
                     </div>
                   );
                 })}
               </div>

               {/* Thêm key mới */}
               <div className="flex gap-2">
                 <input
                   type="password"
                   value={newKey}
                   onChange={e => setNewKey(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && handleAdd()}
                   placeholder="AIzaSy... (dán key mới vào đây)"
                   className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:border-indigo-500 outline-none font-mono shadow-inner"
                 />
                 <button onClick={handleAdd} disabled={!newKey.trim()} className="px-4 py-2.5 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 text-white rounded-xl font-bold flex items-center gap-2 text-sm transition-colors flex-shrink-0">
                   <Plus size={16}/> Thêm
                 </button>
               </div>
               {keys.length > 1 && (
                 <p className="mt-2 text-[11px] text-indigo-400/70 font-serif italic">
                   ✦ Có {keys.length} key — tự động xoay vòng khi gặp giới hạn tốc độ.
                 </p>
               )}
             </div>

             <div>
               <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Chế độ AI</label>
               <select
                 value={aiMode}
                 onChange={(e) => setAiMode && setAiMode(e.target.value)}
                 className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:border-indigo-500 outline-none font-serif shadow-inner"
               >
                 <option value="standard">Chuẩn (đầy đủ, chính xác hơn)</option>
                 <option value="quick">Nhanh (phản hồi nhanh, nhẹ hơn)</option>
               </select>
               <p className="mt-2 text-[11px] text-slate-500 font-serif italic">
                 Mẹo: Chọn “Nhanh” khi dán đoạn dài hoặc đang cần phản hồi tức thời.
               </p>
             </div>

             <div className="h-px bg-slate-800 w-full"></div>

             <div>
               <h3 className="text-sm font-bold text-amber-500 mb-3 uppercase tracking-widest flex items-center gap-2"><FolderOpen size={16}/> Đồng Bộ Thư Mục</h3>
               <p className="text-slate-400 font-serif text-xs leading-relaxed mb-4">Sử dụng File System Access API để kết nối trực tiếp với 1 Thư mục trên máy.</p>
               <button onClick={() => { handleConnectFolder(); onClose(); }} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center gap-3">
                  <FolderOpen size={18} /> {dirHandle && dirHandle !== 'LOCAL_STORAGE' ? "Chọn Thư Mục Khác" : "Kết Nối Thư Mục"}
               </button>
               {dirHandle && <div className="mt-3 text-center text-xs text-emerald-500 font-serif italic flex items-center justify-center gap-1.5"><Check size={14}/> Đang đồng bộ: {safeString(dirName)}</div>}
             </div>

             <div className="h-px bg-slate-800 w-full"></div>

             <div>
               <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-widest flex items-center gap-2"><Link2 size={16}/> Liên kết wiki & mạng lưới</h3>
               <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-indigo-800/50">
                 <input
                   type="checkbox"
                   className="mt-1 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500"
                   checked={!!wikiExactMatchOnly}
                   onChange={(e) => setWikiExactMatchOnly && setWikiExactMatchOnly(e.target.checked)}
                 />
                 <div>
                   <span className="text-sm font-bold text-slate-200">Chỉ khớp tên wiki chính xác</span>
                   <p className="text-xs text-slate-500 font-serif mt-1 leading-relaxed">
                     Bật: <code className="text-indigo-400/90">[[Tên]]</code> chỉ nối đúng thẻ trùng tên (an toàn hơn). Tắt: giữ khớp mờ như cũ (dễ nhầm tên ngắn).
                   </p>
                 </div>
               </label>
             </div>

            <div className="h-px bg-slate-800 w-full"></div>

            <div>
              <h3 className="text-sm font-bold text-cyan-400 mb-3 uppercase tracking-widest flex items-center gap-2"><Link2 size={16}/> Tự bọc wiki local</h3>
              <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-cyan-800/50">
                <input
                  type="checkbox"
                  className="mt-1 rounded border-slate-600 text-cyan-600 focus:ring-cyan-500"
                  checked={!!autoLinkToastEnabled}
                  onChange={(e) => setAutoLinkToastEnabled && setAutoLinkToastEnabled(e.target.checked)}
                />
                <div>
                  <span className="text-sm font-bold text-slate-200">Hiện toast sau khi tự bọc link</span>
                  <p className="text-xs text-slate-500 font-serif mt-1 leading-relaxed">
                    Khi lưu mốc timeline, app tự bọc <code className="text-cyan-400/90">[[...]]</code> theo thẻ có sẵn. Tắt mục này để giảm thông báo khi lưu liên tục.
                  </p>
                </div>
              </label>
            </div>

            <div className="h-px bg-slate-800 w-full"></div>

            <div>
              <h3 className="text-sm font-bold text-emerald-400 mb-3 uppercase tracking-widest flex items-center gap-2"><Activity size={16}/> Chế độ hiệu năng</h3>
              <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-emerald-800/50">
                <input
                  type="checkbox"
                  className="mt-1 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500"
                  checked={!!performanceMode}
                  onChange={(e) => setPerformanceMode && setPerformanceMode(e.target.checked)}
                />
                <div>
                  <span className="text-sm font-bold text-slate-200">Bật Performance Mode</span>
                  <p className="text-xs text-slate-500 font-serif mt-1 leading-relaxed">
                    Giảm animation, blur và bóng đổ để UI mượt hơn trên máy yếu hoặc dữ liệu lớn.
                  </p>
                </div>
              </label>
            </div>

             <div className="h-px bg-slate-800 w-full"></div>

             <div>
               <h3 className="text-sm font-bold text-amber-400 mb-1 uppercase tracking-widest flex items-center gap-2">
                 <Type size={16} /> Ghi chép chi tiết
               </h3>
               <p className="text-slate-500 font-serif text-xs leading-relaxed mb-3">
                 Font và cỡ chữ cho ô soạn «Ghi chép chi tiết» (hồ sơ thẻ). Lưu cục bộ; cùng bộ với thanh công cụ khi đang viết ghi chép.
               </p>
               <div className="flex flex-col sm:flex-row gap-3">
                 <label className="flex-1 flex flex-col gap-1">
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Font chữ</span>
                   <select
                     value={notesTypoPrefs.fontKey}
                     onChange={(e) => setEntityNotesPrefs({ fontKey: e.target.value })}
                     className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 text-sm focus:border-amber-500 outline-none font-serif"
                     style={{
                       fontFamily: ENTITY_NOTES_FONT_OPTIONS.find((o) => o.id === notesTypoPrefs.fontKey)?.stack,
                     }}
                   >
                     {ENTITY_NOTES_FONT_OPTIONS.map((o) => (
                       <option key={o.id} value={o.id} style={{ fontFamily: o.stack }}>
                         {o.label}
                       </option>
                     ))}
                   </select>
                 </label>
                 <label className="flex flex-col gap-1 w-full sm:w-32">
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cỡ chữ</span>
                   <select
                     value={String(notesTypoPrefs.sizePx)}
                     onChange={(e) => setEntityNotesPrefs({ sizePx: Number(e.target.value) })}
                     className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 text-sm focus:border-amber-500 outline-none font-mono text-center"
                   >
                     {ENTITY_NOTES_FONT_SIZE_OPTIONS.map((n) => (
                       <option key={n} value={n}>
                         {n}
                       </option>
                     ))}
                   </select>
                 </label>
               </div>
             </div>

             <div className="h-px bg-slate-800 w-full"></div>

             <div>
               <h3 className="text-sm font-bold text-blue-400 mb-3 uppercase tracking-widest flex items-center gap-2"><UploadCloud size={16}/> Mệnh Bàn Thủ Công</h3>
               <p className="text-slate-400 font-serif text-xs leading-relaxed mb-4">
                 Xuất đầy đủ (mọi truyện + thống kê) hoặc chỉ index; nhập JSON để khôi phục.
               </p>
               <div className="flex flex-col gap-2">
                  <div className="flex gap-2 flex-wrap">
                    <button type="button" onClick={onExportBackup} className="flex-1 min-w-[140px] py-3 bg-blue-900/30 hover:bg-blue-900/50 text-blue-400 border border-blue-800/50 rounded-xl font-bold flex items-center justify-center gap-2 text-sm">
                       <Download size={16} /> Xuất backup đầy đủ
                    </button>
                    <button type="button" onClick={onExportIndexOnly} className="flex-1 min-w-[140px] py-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-600/50 rounded-xl font-bold flex items-center justify-center gap-2 text-sm">
                       <Download size={16} /> Chỉ xuất index
                    </button>
                  </div>
                  <label className="w-full py-3 bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-800/50 rounded-xl font-bold flex items-center justify-center gap-2 text-sm cursor-pointer">
                     <Upload size={16} /> Nhập khôi phục (JSON)
                     <input type="file" accept=".json,application/json" className="hidden" onChange={onImportBackup} />
                  </label>
               </div>
             </div>
          </div>
       </div>
    </div>
  );
};

export const ModalConfirm = ({ isOpen, onClose, title, message, onConfirm }) => {
  const trapRefConfirm = useFocusTrap(isOpen);
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-fast"
      role="dialog"
      aria-modal="true"
      aria-label={safeString(title) || 'Xác nhận'}
    >
       <div ref={trapRefConfirm} className="bg-slate-900 border border-rose-900/50 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
         <div className="w-16 h-16 bg-rose-950 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-900/50"><Trash2 size={32} /></div>
         <h2 className="text-xl font-heading font-bold text-rose-500 mb-2">{safeString(title)}</h2>
         <p className="text-sm text-slate-400 font-serif mb-8" dangerouslySetInnerHTML={{ __html: safeString(message).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/&lt;b&gt;/g,'<b>').replace(/&lt;\/b&gt;/g,'</b>') }}></p>
         <div className="flex justify-center gap-3">
            <button onClick={onClose} className="px-5 py-2.5 text-slate-400 font-serif hover:text-slate-200">Hủy</button>
            <button onClick={() => { typeof onConfirm === 'function' && onConfirm(); onClose(); }} className="px-6 py-2.5 bg-rose-700 hover:bg-rose-600 text-white rounded-lg font-bold font-serif shadow-lg">Xác nhận</button>
         </div>
       </div>
    </div>
  );
};

export const ModalInsertImage = ({ isOpen, onClose, imageForm, setImageForm, handleConfirmInsertImage }) => {
  const trapRefInsertImage = useFocusTrap(isOpen);
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-fast"
      role="dialog"
      aria-modal="true"
      aria-label="Pháp trận lưu ảnh"
    >
       <div ref={trapRefInsertImage} className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl p-6">
          <h2 className="text-xl font-heading text-amber-500 mb-4 font-bold flex items-center gap-2"><ImageIcon size={20}/> Pháp Trận Lưu Ảnh</h2>
          <textarea placeholder='Dán mã <img src="..." /> hoặc link ảnh trực tiếp...' className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 text-sm mb-4 min-h-[120px] focus:border-amber-500/50 outline-none custom-scrollbar" value={safeString(imageForm.url)} onChange={(e) => setImageForm(prev => ({...prev, url: e.target.value}))} />
          <div className="flex justify-end gap-3">
             <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors">Hủy</button>
             <button onClick={handleConfirmInsertImage} className="px-6 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-lg shadow-lg transition-colors">Chèn Ảnh</button>
          </div>
       </div>
    </div>
  );
};

// CẢI TIẾN: Thay thế Thể Loại bằng Nút Bấm Đa Chọn (Multi-select) và Thêm Chọn Giao Diện
export const ModalAddNovel = ({ isOpen, onClose, formData, setFormData, onSave, mode = "create", handlePickLocalImage, dirHandle }) => {
  const trapRefAddNovel = useFocusTrap(isOpen);
  if (!isOpen) return null;
  const patchFormData = (patch) =>
    setFormData((prev) => {
      const nextPatch = typeof patch === 'function' ? patch(prev || {}) : patch;
      return { ...(prev || {}), ...nextPatch };
    });

  const toggleGenre = (g) => {
      setFormData((prev) => {
          const currentGenres = Array.isArray(prev?.genres) ? prev.genres : [];
          if (currentGenres.includes(g)) {
              return { ...(prev || {}), genres: currentGenres.filter((x) => x !== g) };
          }
          return { ...(prev || {}), genres: [...currentGenres, g] };
      });
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={mode === "create" ? 'Khai sinh thư tịch' : 'Tu bổ thư tịch'}
    >
       <div
         ref={trapRefAddNovel}
         className="bg-slate-900 border border-amber-700/50 rounded-3xl w-full max-w-4xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col md:flex-row h-[90vh]"
       >
          <div className="w-full md:w-2/5 bg-slate-950 p-8 flex flex-col items-center justify-center border-r border-slate-800 relative overflow-hidden">
             <div
                className="w-full rounded-2xl border-2 border-dashed border-slate-700/80 flex flex-col items-center justify-center text-slate-500 relative overflow-hidden group bg-slate-900/50 z-10 shadow-2xl cursor-pointer hover:border-amber-600/50 transition-colors min-h-[180px]"
                onClick={() => handlePickLocalImage && handlePickLocalImage((url) => patchFormData({ cover: url }), null, 'cover')}
                title="Nhấp để chọn ảnh bìa từ máy tính"
             >
                {formData.cover ? (
                   formData.cover.startsWith('local_image:') ? (
                      <AsyncLocalImage
                         filename={formData.cover.replace('local_image:', '')}
                         alt="Cover"
                         dirHandle={dirHandle}
                         className="w-full h-auto block object-contain transition-transform duration-700 group-hover:scale-105"
                      />
                   ) : (
                      <img src={formData.cover} alt="Cover" className="w-full h-auto block object-contain transition-transform duration-700 group-hover:scale-105"
                         onError={(e) => { e.target.onerror = null; }} />
                   )
                ) : (
                   <div className="flex flex-col items-center gap-4 p-10 text-center">
                      <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-amber-900/30 transition-colors"><ImageIcon size={28} className="text-slate-400 group-hover:text-amber-400 transition-colors" /></div>
                      <p className="text-sm font-serif font-bold text-slate-400 uppercase tracking-widest">Chưa có Linh Ảnh</p>
                      <p className="text-xs text-slate-600 font-serif">Nhấp để chọn ảnh</p>
                   </div>
                )}
                {formData.cover && (
                   <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-sm font-bold font-serif bg-amber-700/80 px-4 py-2 rounded-xl">Đổi ảnh bìa</span>
                   </div>
                )}
             </div>
          </div>

          <div className="w-full md:w-3/5 p-8 md:p-10 flex flex-col relative z-10">
             <h2 className="text-3xl font-heading font-bold text-amber-500 mb-2 flex items-center gap-3">
               <BookOpen size={28}/> {mode === "create" ? "Khai Sinh Thư Tịch" : "Tu Bổ Thư Tịch"}
             </h2>
             
             <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-4 mt-6">
                <div>
                   <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Tên Truyện / Bí Danh <span className="text-amber-500">*</span></label>
                   <input autoFocus value={safeString(formData.title)} onChange={e=>patchFormData({ title: e.target.value })} className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-4 text-amber-100 font-heading text-xl focus:border-amber-500 outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Tác Giả</label>
                      <input value={safeString(formData.author)} onChange={e=>patchFormData({ author: e.target.value })} className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3.5 text-slate-200 font-serif focus:border-amber-500 outline-none" />
                   </div>
                   <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Khí Chất Giao Diện (Theme)</label>
                      <select value={safeString(formData.theme)} onChange={e=>patchFormData({ theme: e.target.value })} className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3.5 text-slate-200 font-serif focus:border-amber-500 outline-none appearance-none">
                         {THEMES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                   </div>
                </div>

                <div>
                   <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Đại Lộ Tu Luyện (Chọn Nhiều Thể Loại)</label>
                   <div className="flex flex-wrap gap-1.5">
                       {GENRES.map(g => {
                           const isSelected = (formData.genres || []).includes(g);
                           return (
                               <button key={g} onClick={() => toggleGenre(g)} className={`px-2.5 py-1 rounded-md text-xs font-serif transition-colors border ${isSelected ? 'bg-amber-900/40 border-amber-500/50 text-amber-300' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-amber-600/30'}`}>
                                   {g}
                               </button>
                           );
                       })}
                   </div>
                   {mode === "create" && (
                     <div className="mt-3 flex items-center gap-3">
                       <button
                         type="button"
                         disabled={(formData.genres || []).length === 0}
                         onClick={() => {
                           const cfg = mergeTabsByGenres(formData.genres || []);
                           if (cfg) patchFormData({ tabsConfig: cfg });
                         }}
                         className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-serif bg-amber-900/30 border border-amber-600/40 text-amber-300 hover:bg-amber-800/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                       >
                         <Sparkles size={16} /> Tạo cấu trúc theo thể loại
                       </button>
                       {formData.tabsConfig && (
                         <span className="text-xs text-emerald-500 font-serif">✓ Đã có cấu trúc</span>
                       )}
                     </div>
                   )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Tiến Trình</label>
                      <select value={safeString(formData.status)} onChange={e=>patchFormData({ status: e.target.value })} className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3.5 text-slate-200 font-serif focus:border-amber-500 outline-none appearance-none">
                         <option value="Đang đọc">Đang đọc</option>
                         <option value="Hoàn thành">Hoàn thành</option>
                         <option value="Tạm ngưng">Tạm ngưng</option>
                      </select>
                   </div>
                   <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Tổng Số Chương</label>
                      <input value={safeString(formData.chaptersTotal)} onChange={e=>patchFormData({ chaptersTotal: e.target.value })} className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3.5 text-slate-200 font-serif focus:border-amber-500 outline-none" />
                   </div>
                </div>

                <div>
                   <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Hoặc nhập URL ảnh trực tiếp</label>
                   <input
                     value={safeString(formData.cover).startsWith('local_image:') ? '' : safeString(formData.cover)}
                     onChange={e=>patchFormData({ cover: e.target.value })}
                     className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3.5 text-slate-200 text-sm focus:border-amber-500 outline-none"
                     placeholder="https://..."
                   />
                   {safeString(formData.cover).startsWith('local_image:') && (
                     <p className="text-xs text-emerald-500 mt-1.5 font-serif">✓ Đã chọn ảnh từ máy tính (nhấp vào khung bên trái để đổi)</p>
                   )}
                </div>
             </div>

             <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-slate-800">
                <button onClick={onClose} className="px-6 py-3 text-slate-400 hover:text-white font-serif rounded-xl hover:bg-slate-800">Hủy bỏ</button>
                <button onClick={onSave} disabled={!formData.title.trim()} className="px-8 py-3 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl font-bold font-serif flex items-center gap-2">Lưu Thay Đổi</button>
             </div>
          </div>
       </div>
    </div>
  );
};

export const ModalDeepSearch = ({ isOpen, onClose, novelsMetadata, performDeepSearch, onSelectResult }) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchPending, setSearchPending] = useState(false);
  const searchSeqRef = useRef(0);
  const abortRef = useRef(null);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 260);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    if (!isOpen) {
      searchSeqRef.current += 1;
      if (abortRef.current) {
        try { abortRef.current.abort(); } catch { void 0; }
        abortRef.current = null;
      }
      setResults([]);
      setSearchPending(false);
      return;
    }
    if (!debouncedQuery) {
      setResults([]);
      setSearchPending(false);
      return;
    }
    if (typeof performDeepSearch !== 'function') {
      setResults([]);
      setSearchPending(false);
      return;
    }
    const runId = ++searchSeqRef.current;
    if (abortRef.current) {
      try { abortRef.current.abort(); } catch { void 0; }
    }
    const ac = new AbortController();
    abortRef.current = ac;
    setSearchPending(true);
    let cancelled = false;
    (async () => {
      try {
        const final = await performDeepSearch(debouncedQuery, ac.signal, (partial) => {
          if (cancelled || runId !== searchSeqRef.current || ac.signal.aborted) return;
          setResults(Array.isArray(partial) ? partial : []);
        });
        if (!cancelled && runId === searchSeqRef.current && !ac.signal.aborted) {
          setResults(Array.isArray(final) ? final : []);
        }
      } catch {
        if (!cancelled && runId === searchSeqRef.current) setResults([]);
      } finally {
        if (!cancelled && runId === searchSeqRef.current) setSearchPending(false);
      }
    })();
    return () => {
      cancelled = true;
      try { ac.abort(); } catch { void 0; }
    };
  }, [isOpen, debouncedQuery, performDeepSearch, novelsMetadata]);

  const grouped = useMemo(() => {
    const map = {};
    results.forEach(r => { if (!map[r.novelId]) map[r.novelId] = { title: r.novelTitle, items: [] }; map[r.novelId].items.push(r); });
    return Object.values(map);
  }, [results]);

  const flatResults = useMemo(() => grouped.flatMap(g => g.items), [grouped]);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const resultRefs = useRef([]);
  const safeHighlightIdx = flatResults.length > 0 ? Math.min(highlightIdx, flatResults.length - 1) : 0;
  useEffect(() => {
    const el = resultRefs.current[safeHighlightIdx];
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [safeHighlightIdx]);

  const handleResultKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (flatResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = flatResults[highlightIdx];
      if (r) { onSelectResult(r); onClose(); }
    }
  };

  const trapRefDeepSearch = useFocusTrap(isOpen);
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[300] flex items-start justify-center bg-slate-950/95 backdrop-blur-md pt-[8vh] px-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Tra cứu toàn thư viện"
    >
      <div
        ref={trapRefDeepSearch}
        className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col"
        style={{maxHeight:'80vh'}}
      >
        <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-950">
          <Search size={20} className="text-amber-500 flex-shrink-0" />
          <input autoFocus type="text"
            placeholder={`Tìm trong ${novelsMetadata.length} bộ thư tịch (↑↓ Enter)`}
            className="flex-1 bg-transparent text-lg font-serif text-slate-100 outline-none"
            value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleResultKeyDown} />
          {searchPending && <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin flex-shrink-0"/>}
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white rounded-lg flex-shrink-0"><X size={18}/></button>
        </div>
        {query.trim() && (
          <div className="px-4 py-2 bg-slate-950/50 border-b border-slate-800/50">
            <span className="text-xs text-slate-500 font-serif">
              {query.trim() !== debouncedQuery || searchPending ? 'Đang tìm…' : results.length === 0 ? 'Không tìm thấy' : `${results.length} kết quả trong ${grouped.length} bộ truyện`}
            </span>
          </div>
        )}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {!query.trim() ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-600">
              <Search size={40} className="mb-4 opacity-20"/>
              <p className="font-serif text-sm italic">Nhập từ khóa để tìm toàn bộ thư viện...</p>
            </div>
          ) : query.trim() !== debouncedQuery || searchPending ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 font-serif text-sm italic">Đang tìm…</div>
          ) : results.length === 0 ? (
            <div className="text-center text-slate-500 font-serif py-16 italic">Không tìm thấy "{safeString(query)}"</div>
          ) : (
            <div className="p-3 space-y-4">
              {grouped.map((group, gi) => (
                <div key={gi}>
                  <div className="flex items-center gap-2 px-2 mb-2">
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest font-serif">{safeString(group.title)}</span>
                    <div className="flex-1 h-px bg-slate-800"/>
                    <span className="text-[10px] text-slate-600">{group.items.length}</span>
                  </div>
                  <div className="space-y-1.5">
                    {group.items.map((r, i) => {
                      const globalIdx = grouped.slice(0, gi).reduce((acc, g) => acc + g.items.length, 0) + i;
                      const isHighlight = flatResults[globalIdx] === r && highlightIdx === globalIdx;
                      return (
                      <div key={`${r.novelId}-${r.tabLonId || ''}-${r.tabNhoId || ''}-${r.entityId || ''}-${r.location}-${i}`}
                        ref={(el) => { resultRefs.current[globalIdx] = el; }}
                        onClick={() => { onSelectResult(r); onClose(); }}
                        className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${isHighlight ? 'bg-amber-950/40 border-2 border-amber-600/50' : 'bg-slate-950/60 border border-slate-800/80 hover:border-amber-600/40 hover:bg-slate-800/50'}`}>
                        <div className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-md bg-amber-900/30 flex items-center justify-center">
                          <Search size={10} className="text-amber-600"/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">{safeString(r.location)}</span>
                          <p className="text-sm text-slate-300 font-serif line-clamp-2 leading-relaxed">{safeString(r.snippet)}</p>
                        </div>
                      </div>
                    ); })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/** Tìm kiếm chỉ trong một truyện đang mở (toàn bộ mục & thực thể) */
export const ModalInNovelSearch = ({ isOpen, onClose, novel, onSelectResult }) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const handleCloseInNovel = React.useCallback(() => {
    setQuery('');
    onClose();
  }, [onClose]);
  const results = useMemo(() => {
    const q = String(debouncedQuery || '').trim().toLowerCase();
    if (!q || !novel) return [];
    const meta = {
      id: novel.id,
      title: novel.title,
      author: novel.author,
      review: novel.review,
      tags: novel.tags,
    };
    const res = [...metadataSearchHits([meta], q)];
    searchNovelData({ ...novel, id: novel.id, title: novel.title || '' }, q, res);
    return dedupeDeepSearchResults(res);
  }, [debouncedQuery, novel]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => clearTimeout(id);
  }, [query]);

  const grouped = useMemo(() => {
    const map = {};
    results.forEach((r) => {
      if (!map[r.novelId]) map[r.novelId] = { title: r.novelTitle, items: [] };
      map[r.novelId].items.push(r);
    });
    return Object.values(map);
  }, [results]);

  const flatResultsInNovel = useMemo(() => grouped.flatMap(g => g.items), [grouped]);
  const [highlightIdxInNovel, setHighlightIdxInNovel] = useState(0);
  const resultRefsInNovel = useRef([]);
  const safeHighlightIdxInNovel = flatResultsInNovel.length > 0
    ? Math.min(highlightIdxInNovel, flatResultsInNovel.length - 1)
    : 0;
  useEffect(() => {
    const el = resultRefsInNovel.current[safeHighlightIdxInNovel];
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [safeHighlightIdxInNovel]);

  const handleInNovelKeyDown = (e) => {
    if (e.key === 'Escape') { handleCloseInNovel(); return; }
    if (flatResultsInNovel.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdxInNovel((i) => Math.min(i + 1, flatResultsInNovel.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdxInNovel((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = flatResultsInNovel[safeHighlightIdxInNovel];
      if (r) { onSelectResult(r); handleCloseInNovel(); }
    }
  };

  const trapRefInNovelSearch = useFocusTrap(isOpen && !!novel);
  if (!isOpen || !novel) return null;
  return (
    <div
      className="fixed inset-0 z-[295] flex items-start justify-center bg-slate-950/95 backdrop-blur-md pt-[8vh] px-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Tra cứu trong truyện"
    >
      <div
        ref={trapRefInNovelSearch}
        className="bg-slate-900 border border-cyan-600/30 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '78vh' }}
      >
        <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-950">
          <BookOpen size={20} className="text-cyan-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <input
              autoFocus
              type="text"
              placeholder={`Tra trong «${safeString(novel.title)}»... (↑↓ Enter)`}
              className="w-full bg-transparent text-lg font-serif text-slate-100 outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInNovelKeyDown}
            />
            <p className="text-[10px] text-slate-500 font-serif mt-0.5">Chỉ truyện này — gõ tên, sự kiện, ghi chép...</p>
          </div>
          <button type="button" onClick={handleCloseInNovel} className="p-1.5 text-slate-500 hover:text-white rounded-lg flex-shrink-0">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
          {!query.trim() ? (
            <div className="flex flex-col items-center justify-center py-14 text-slate-600">
              <Search size={36} className="mb-3 opacity-25" />
              <p className="font-serif text-sm italic text-center px-4">Tìm lại chi tiết cũ khi đang đọc (nhân vật, mốc, nội dung mục)...</p>
            </div>
          ) : query.trim() !== debouncedQuery ? (
            <div className="text-center text-slate-500 font-serif py-12 italic">Đang lọc…</div>
          ) : results.length === 0 ? (
            <div className="text-center text-slate-500 font-serif py-12 italic">Không thấy «{safeString(query)}»</div>
          ) : (
            <div className="space-y-3">
              {grouped.map((group, gi) => (
                <div key={gi}>
                  {grouped.length > 1 && (
                    <div className="flex items-center gap-2 px-1 mb-2">
                      <span className="text-[10px] font-bold text-cyan-600 uppercase font-serif">{safeString(group.title)}</span>
                      <div className="flex-1 h-px bg-slate-800" />
                    </div>
                  )}
                  <div className="space-y-1">
                    {group.items.map((r, i) => {
                      const globalIdx = grouped.slice(0, gi).reduce((acc, g) => acc + g.items.length, 0) + i;
                      const isHighlight = safeHighlightIdxInNovel === globalIdx;
                      return (
                      <div
                        key={`${r.tabLonId}-${r.tabNhoId}-${r.entityId}-${i}`}
                        ref={(el) => { resultRefsInNovel.current[globalIdx] = el; }}
                        onClick={() => {
                          onSelectResult(r);
                          handleCloseInNovel();
                        }}
                        className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${isHighlight ? 'bg-cyan-950/40 border-2 border-cyan-600/50' : 'bg-slate-950/70 border border-slate-800/80 hover:border-cyan-600/35 hover:bg-slate-800/40'}`}
                      >
                        <Search size={12} className="text-cyan-600 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">{safeString(r.location)}</span>
                          <p className="text-sm text-slate-300 font-serif line-clamp-3 leading-relaxed">{safeString(r.snippet)}</p>
                        </div>
                      </div>
                    ); })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
