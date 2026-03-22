// ==========================================
// TRỤ 3: HÌNH THỂ GIAO DIỆN & MODAL
// File: MasterComponents.jsx
// Vai trò: UI components tĩnh + tất cả Modal
// ==========================================

import React, { useState, useMemo, useEffect, useLayoutEffect, useRef, memo } from 'react';
import {
  Menu, Search, BookOpen, Filter, ChevronRight, ChevronDown,
  Settings, Network, Plus, Trash2, X, Save,
  Check, Library, Sparkles, Bold, Italic, Heading1, Heading2, List as ListIcon,
  FolderOpen, Cloud, Upload, HardDrive, Clock, Shield, Download, UploadCloud,
  Image as ImageIcon, History, LayoutGrid, Link2, ScrollText, User,
  TrendingUp, BarChart2, BookMarked, Users, Layers, Activity, Eye,
  GitBranch, ZoomIn, ZoomOut, Maximize2, RefreshCw, SlidersHorizontal, Atom, Edit2, Command
} from 'lucide-react';
import {
  FALLBACK_IMG, GENRES, THEMES,
  resolveFieldsTemplate
} from './MasterEngines.js';
import {
  generateId, safeString, getTerms, AsyncLocalImage,
  handleToolbarClick, applyWikiLinkWrap, renderMarkdown, analyzeTextWithAI,
  truncateForAI, mapGeminiErrorToUserMessage
} from './MasterUtils.jsx';
import { mergeTabsByGenres } from './genreTabsMap.js';
import { searchNovelData, dedupeDeepSearchResults, metadataSearchHits } from './deepSearchCore.js';
import { useFocusTrap } from './lib/useFocusTrap.js';

const preventToolbarFocusSteal = (e) => e.preventDefault();

export const MarkdownToolbar = ({ editorId, onInsertImage, onPickLocalImage }) => (
  <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-slate-800">
     <button type="button" onMouseDown={preventToolbarFocusSteal} onClick={() => handleToolbarClick('**', '**', editorId)} className="p-2 text-slate-400 hover:text-amber-400 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors" title="In đậm"><Bold size={16}/></button>
     <button type="button" onMouseDown={preventToolbarFocusSteal} onClick={() => handleToolbarClick('*', '*', editorId)} className="p-2 text-slate-400 hover:text-amber-400 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors" title="In nghiêng"><Italic size={16}/></button>
     <div className="w-px h-6 bg-slate-800 mx-1"></div>
     
     <button type="button" onMouseDown={preventToolbarFocusSteal} onClick={() => handleToolbarClick('[[', ']]', editorId)} className="p-2 text-indigo-500 hover:text-indigo-300 bg-indigo-950/50 rounded-lg hover:bg-indigo-900 transition-colors border border-indigo-900/50 shadow-inner" title="Wiki Link: bôi đen chữ để bọc [[...]], hoặc chèn [[]] tại con trỏ"><Link2 size={16}/></button>
     <div className="w-px h-6 bg-slate-800 mx-1"></div>

     <button type="button" onMouseDown={preventToolbarFocusSteal} onClick={() => handleToolbarClick('# ', '', editorId)} className="p-2 text-slate-400 hover:text-amber-400 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors" title="Tiêu đề 1"><Heading1 size={16}/></button>
     <button type="button" onMouseDown={preventToolbarFocusSteal} onClick={() => handleToolbarClick('## ', '', editorId)} className="p-2 text-slate-400 hover:text-amber-400 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors" title="Tiêu đề 2"><Heading2 size={16}/></button>
     <div className="w-px h-6 bg-slate-800 mx-1"></div>
     <button type="button" onMouseDown={preventToolbarFocusSteal} onClick={() => handleToolbarClick('- ', '', editorId)} className="p-2 text-slate-400 hover:text-amber-400 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors" title="Gạch đầu dòng"><ListIcon size={16}/></button>
     <div className="w-px h-6 bg-slate-800 mx-1"></div>
     <button type="button" onMouseDown={preventToolbarFocusSteal} onClick={() => onInsertImage(editorId)} className="p-2 text-slate-400 hover:text-amber-400 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors" title="Chèn Ảnh (URL)"><ImageIcon size={16}/></button>
     {onPickLocalImage && <button type="button" onMouseDown={preventToolbarFocusSteal} onClick={() => onPickLocalImage(null, editorId)} className="p-2 text-slate-400 hover:text-amber-400 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors" title="Chọn Ảnh Từ Máy tính"><FolderOpen size={16}/></button>}
  </div>
);

export const AppHeader = ({ menu1Visible, setMenu1Visible, handleGoHome, setIsSettingsOpen, hasDirectory, dirName, setIsDeepSearchOpen, onInNovelSearch, showInNovelSearch, onOpenCommandPalette }) => (
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
  const fieldsTemplate = resolveFieldsTemplate(tabConfig, parentTabId, parentLabel);
  const [editingFieldId, setEditingFieldId] = useState(null);
  const [editingFieldLabel, setEditingFieldLabel] = useState('');
  const [linkSuggestField, setLinkSuggestField] = useState(null); // fieldId đang gợi ý link
  const terms = getTerms(parentTabId);
  const [formData, setFormData] = useState({ id: null, name: '', avatar: '', rawText: '' });
  const [dynamicData, setDynamicData] = useState({});
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const dynamicFieldInputRefs = useRef({});
  const pendingWikiCaretRef = useRef(null);

  useLayoutEffect(() => {
    const p = pendingWikiCaretRef.current;
    if (!p) return;
    pendingWikiCaretRef.current = null;
    const el = dynamicFieldInputRefs.current[p.fieldId];
    if (el) {
      el.focus();
      el.setSelectionRange(p.selStart, p.selEnd);
    }
  }, [dynamicData]);

  useEffect(() => { 
     if(isOpen) {
         setErrorMsg('');
         if (initialData) {
             setFormData({ id: initialData.id, name: initialData.name, avatar: initialData.avatar, rawText: initialData.rawText || '' });
             const initialDyn = initialData.dynamicData ? { ...initialData.dynamicData } : {};
             if (!initialDyn.f_status && initialData.status) initialDyn.f_status = initialData.status;
             if (!initialDyn.f_title && initialData.title) initialDyn.f_title = initialData.title;
             if (!initialDyn.f_desc && initialData.description) initialDyn.f_desc = initialData.description;
             setDynamicData(initialDyn);
         } else { 
             setFormData({ id: null, name: '', avatar: '', rawText: '' });
             setDynamicData({});
         } 
     }
  }, [isOpen, initialData]);

  useEffect(() => {
    const handler = () => {
      if (isOpen && formData.name.trim()) { onSave(formData, dynamicData); onClose(); }
    };
    window.addEventListener('ttc-save', handler);
    return () => window.removeEventListener('ttc-save', handler);
  }, [isOpen, formData, dynamicData, onSave, onClose]);

  const handleAI = async () => {
     const keys = Array.isArray(geminiApiKey) ? geminiApiKey : (geminiApiKey ? [geminiApiKey] : []);
     if (keys.length === 0) { setErrorMsg("Vui lòng thiết lập API Key trong phần Cài Đặt để dùng tính năng AI."); return; }
     if (!formData.rawText.trim()) return;
     const { wasTruncated } = truncateForAI(formData.rawText);
     setIsAnalyzing(true); setErrorMsg(wasTruncated ? "Đoạn quá dài — AI chỉ xử lý ~12k ký tự đầu." : '');
     try {
         const result = await analyzeTextWithAI(formData.rawText, fieldsTemplate, keys, geminiMode);
         if (result) {
             if (result.name) setFormData(prev => ({ ...prev, name: safeString(result.name) }));
             if (result.avatar) setFormData(prev => ({ ...prev, avatar: safeString(result.avatar) }));
             if (result.processedText) setFormData(prev => ({ ...prev, rawText: safeString(result.processedText) }));
             const newDyn = { ...dynamicData };
             fieldsTemplate.forEach(f => { if (result[f.id]) newDyn[f.id] = safeString(result[f.id]); });
             setDynamicData(newDyn);
         }
     } catch (e) { setErrorMsg(mapGeminiErrorToUserMessage(e)); } finally { setIsAnalyzing(false); }
  };

  const handleAddField = () => {
     if (!newFieldLabel.trim()) return;
     const newField = { id: generateId('f'), label: newFieldLabel.trim() };
     onUpdateTemplate([...fieldsTemplate, newField]);
     setNewFieldLabel('');
  };

  const trapRef = useFocusTrap(isOpen);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in">
       <div ref={trapRef} className="bg-slate-900 border border-amber-700/50 rounded-2xl w-full max-w-5xl shadow-[0_0_50px_rgba(217,119,6,0.2)] overflow-hidden flex flex-col md:flex-row h-[85vh]">
          <div className="w-full md:w-5/12 bg-slate-950 border-r border-slate-800 p-6 flex flex-col relative">
             <h2 className="text-xl font-heading font-bold text-amber-500 mb-4 flex items-center gap-2"><Sparkles size={20}/> Tinh Luyện Khí Tức (AI)</h2>
             <div className="flex gap-4 mb-4">
                <div
                   onDragOver={e => e.preventDefault()}
                   onDrop={e => handleAvatarDrop && handleAvatarDrop(e, url => setFormData({...formData, avatar: url}))}
                   onClick={() => handlePickLocalImage && handlePickLocalImage(url => setFormData({...formData, avatar: url}), null, 'avatar')}
                   className="w-16 h-16 rounded-xl bg-slate-900 border border-dashed border-slate-600 flex items-center justify-center overflow-hidden flex-shrink-0 group cursor-pointer hover:border-amber-500 transition-colors"
                   title="Nhấp hoặc kéo thả ảnh vào đây"
                >
                   {formData.avatar ? (
                      formData.avatar.startsWith('local_image:') ? (
                         <AsyncLocalImage filename={formData.avatar.replace('local_image:', '')} alt="avatar" dirHandle={dirHandle} className="w-full h-full object-cover" />
                      ) : <img src={formData.avatar} className="w-full h-full object-cover" alt="avatar" onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMG; }} />
                   ) : <ImageIcon className="text-slate-600 group-hover:text-amber-500 transition-colors" />}
                </div>
                <div className="flex-1 flex flex-col justify-center">
                   <label className="block text-[10px] font-bold text-emerald-500 mb-1 uppercase tracking-widest flex items-center justify-between">
                      <span className="flex items-center gap-1"><Upload size={12}/> {terms.image}</span>
                   </label>
                   <div className="flex gap-2">
                      <input value={safeString(formData.avatar)} onChange={e=>setFormData({...formData, avatar: e.target.value})} className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:border-amber-500 outline-none" placeholder="https://..." />
                      <button onClick={() => handlePickLocalImage && handlePickLocalImage(url => setFormData({...formData, avatar: url}), null, 'avatar')} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-xs font-bold">Chọn File</button>
                   </div>
                </div>
             </div>

             <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Bản Thảo Nguyên Thủy (Raw Text)</label>
             <textarea value={safeString(formData.rawText)} onChange={e=>setFormData({...formData, rawText: e.target.value})} className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm text-slate-300 font-serif focus:border-amber-500 outline-none resize-none custom-scrollbar mb-4" placeholder="Dán đoạn văn bản mô tả... Sau đó dùng AI để điền form tự động." />
             
             <button onClick={handleAI} disabled={isAnalyzing || !formData.rawText.trim()} className="w-full py-3 bg-gradient-to-r from-emerald-800 to-emerald-600 hover:from-emerald-700 hover:to-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                {isAnalyzing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Sparkles size={18} />}
                {isAnalyzing ? 'Đang dung hợp...' : 'Nhờ AI Bọc Link & Điền Form'}
             </button>
             {errorMsg && <p className="text-rose-400 text-xs mt-2 text-center">{safeString(errorMsg)}</p>}
          </div>

          <div className="w-full md:w-7/12 p-6 md:p-8 flex flex-col bg-slate-900 relative">
             <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                <h2 className="text-2xl font-heading font-bold text-slate-100">{initialData ? `Tu Bổ ${terms.entity}` : `Khởi Tạo ${terms.entity}`}</h2>
                <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={20}/></button>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-5">
                <div>
                   <label className="block text-xs font-bold text-amber-500 mb-1 uppercase tracking-widest">Danh xưng / Tên gọi *</label>
                   <input autoFocus value={safeString(formData.name)} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full bg-slate-950 border border-amber-600/50 rounded-xl p-3 text-amber-100 font-serif focus:border-amber-500 outline-none shadow-inner" placeholder="Bắt buộc nhập..." />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   {fieldsTemplate.map(field => (
                      <div key={field.id} className="group/field">
                         {/* Label row: tên + nút sửa/xóa */}
                         <div className="flex items-center gap-1 mb-1">
                           {editingFieldId === field.id ? (
                             <div className="flex items-center gap-1 flex-1">
                               <input
                                 autoFocus
                                 value={editingFieldLabel}
                                 onChange={e => setEditingFieldLabel(e.target.value)}
                                 onKeyDown={e => {
                                   if (e.key === 'Enter' && editingFieldLabel.trim()) {
                                     onUpdateTemplate(fieldsTemplate.map(f => f.id === field.id ? {...f, label: editingFieldLabel.trim()} : f));
                                     setEditingFieldId(null);
                                   }
                                   if (e.key === 'Escape') setEditingFieldId(null);
                                 }}
                                 className="flex-1 bg-slate-950 border border-amber-600/60 rounded px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase outline-none"
                               />
                               <button onClick={() => { if(editingFieldLabel.trim()) { onUpdateTemplate(fieldsTemplate.map(f => f.id === field.id ? {...f, label: editingFieldLabel.trim()} : f)); setEditingFieldId(null); }}} className="p-0.5 text-emerald-400 hover:text-emerald-300"><Check size={12}/></button>
                               <button onClick={() => setEditingFieldId(null)} className="p-0.5 text-slate-500 hover:text-slate-300"><X size={12}/></button>
                             </div>
                           ) : (
                             <>
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex-1">{safeString(field.label)}</label>
                               <button
                                 onClick={() => { setEditingFieldId(field.id); setEditingFieldLabel(field.label); }}
                                 className="p-1 text-slate-600 hover:text-amber-400 transition-all rounded hover:bg-slate-800"
                                 title="Đổi tên trường"
                               ><Edit2 size={11}/></button>
                               {!['f_status','f_title','f_desc'].includes(field.id) && (
                                 <button
                                   onClick={() => onUpdateTemplate(fieldsTemplate.filter(f => f.id !== field.id))}
                                   className="p-1 text-slate-600 hover:text-rose-400 transition-all rounded hover:bg-slate-800"
                                   title="Xóa trường này"
                                 ><Trash2 size={11}/></button>
                               )}
                             </>
                           )}
                         </div>
                         <div className="relative">
                           <input
                             ref={(el) => { if (el) dynamicFieldInputRefs.current[field.id] = el; else delete dynamicFieldInputRefs.current[field.id]; }}
                             value={safeString(dynamicData[field.id])}
                             onChange={e => setDynamicData({...dynamicData, [field.id]: e.target.value})}
                             onFocus={() => setLinkSuggestField(field.id)}
                             onBlur={() => setTimeout(() => setLinkSuggestField(null), 200)}
                             className="w-full bg-slate-950/80 border border-slate-700 rounded-lg p-2.5 pr-8 text-sm text-slate-200 font-serif focus:border-amber-500 outline-none"
                             placeholder="Nhập giá trị hoặc [[Tên]] để liên kết..."
                           />
                           {/* Nút chèn [[ ]] tại con trỏ / bọc đoạn chọn */}
                           {linkSuggestField === field.id && (
                             <button
                               type="button"
                               onMouseDown={(e) => e.preventDefault()}
                               onClick={() => {
                                 const cur = safeString(dynamicData[field.id]);
                                 const input = dynamicFieldInputRefs.current[field.id];
                                 let a = cur.length; let b = cur.length;
                                 if (input && document.activeElement === input) {
                                   a = input.selectionStart ?? 0;
                                   b = input.selectionEnd ?? a;
                                 }
                                 const { newText, selStart, selEnd } = applyWikiLinkWrap(cur, a, b);
                                 pendingWikiCaretRef.current = { fieldId: field.id, selStart, selEnd };
                                 setDynamicData({ ...dynamicData, [field.id]: newText });
                               }}
                               className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-amber-500 hover:text-amber-300 bg-amber-900/30 px-1.5 py-0.5 rounded border border-amber-700/40"
                               title="Chèn [[ ]] tại con trỏ hoặc bọc đoạn đang chọn"
                             >[[]]</button>
                           )}
                         </div>
                      </div>
                   ))}
                </div>

                <div className="pt-4 mt-2 border-t border-slate-800/80">
                   <label className="block text-[10px] font-bold text-emerald-500 mb-2 uppercase tracking-widest flex items-center gap-1"><Plus size={12}/> Thêm Trường Mới</label>
                   <div className="flex gap-2">
                      <input value={safeString(newFieldLabel)} onChange={e=>setNewFieldLabel(e.target.value)} onKeyDown={e=>{if(e.key==='Enter') handleAddField()}} className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 outline-none focus:border-emerald-500" placeholder="VD: Công pháp, Nơi ở, Sức mạnh..." />
                      <button onClick={handleAddField} className="px-4 py-2 bg-slate-800 text-emerald-400 border border-emerald-900/50 rounded-lg text-sm font-bold">Tạo</button>
                   </div>
                </div>
             </div>

             <div className="pt-6 mt-4 border-t border-slate-800 flex justify-end gap-3">
                <button onClick={onClose} className="px-6 py-2.5 text-slate-400 hover:text-white font-serif transition-colors rounded-xl">Hủy bỏ</button>
                <button onClick={() => { if(formData.name.trim()) { onSave(formData, dynamicData); onClose(); } }} disabled={!formData.name.trim()} className="px-8 py-2.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl font-bold font-serif shadow-lg transition-all flex items-center gap-2"><Save size={18}/> Lưu Thông Tin</button>
             </div>
          </div>
       </div>
    </div>
  );
};

export const ModalMilestone = ({ isOpen, onClose, onSave, initialData, defaultChapterWhenNew, tabConfig, onUpdateTemplate, handleAvatarDrop, handlePickLocalImage, dirHandle, parentTabId, parentLabel, geminiApiKey, geminiMode = 'standard' }) => {
  const fieldsTemplate = resolveFieldsTemplate(tabConfig, parentTabId, parentLabel);
  const [editingFieldId, setEditingFieldId] = useState(null);
  const [editingFieldLabel, setEditingFieldLabel] = useState('');
  const terms = getTerms(parentTabId);
  const [formData, setFormData] = useState({ id: null, chapter: '', event: '' });
  const [snapshotData, setSnapshotData] = useState({ avatar: '', dynamicData: {} });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
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
    const handler = () => {
      if (isOpen && formData.chapter && formData.event.trim()) {
        const hasData = snapshotData.avatar || Object.values(snapshotData.dynamicData || {}).some(v => v);
        onSave(formData, hasData ? snapshotData : null);
        onClose();
      }
    };
    window.addEventListener('ttc-save', handler);
    return () => window.removeEventListener('ttc-save', handler);
  }, [isOpen, formData, snapshotData, onSave, onClose]);

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
             setSnapshotData({ avatar: safeString(result.avatar) || snapshotData.avatar, dynamicData: newDyn });
             if (result.processedText) setFormData(p => ({...p, event: result.processedText}));
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
     const hasData = snapshotData.avatar || Object.values(snapshotData.dynamicData).some(v => v);
     onSave(formData, hasData ? snapshotData : null);
     onClose();
  };

  const trapRefMs = useFocusTrap(isOpen);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in">
       <div ref={trapRefMs} className="bg-slate-900 border border-amber-700/50 rounded-2xl w-full max-w-5xl shadow-[0_0_50px_rgba(217,119,6,0.2)] overflow-hidden flex flex-col md:flex-row h-[85vh]">
          <div className="w-full md:w-5/12 bg-slate-950 border-r border-slate-800 p-6 flex flex-col relative">
             <h2 className="text-xl font-heading font-bold text-amber-500 mb-6 flex items-center gap-2"><Clock size={20}/> Ghi Chép Mệnh Số</h2>
             <div className="flex-1 flex flex-col space-y-4">
                <div>
                   <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-widest">Mốc Chương *</label>
                   <input type="number" autoFocus value={safeString(formData.chapter)} onChange={e=>setFormData({...formData, chapter: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-amber-300 font-bold focus:border-amber-500 outline-none" placeholder="VD: 150" />
                </div>
                <div className="flex flex-col flex-1">
                   <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-widest">{terms.msEvent}</label>
                   <textarea value={safeString(formData.event)} onChange={e=>setFormData({...formData, event: e.target.value})} className="w-full flex-1 bg-slate-900 border border-slate-700 rounded-lg p-4 text-sm text-slate-300 font-serif focus:border-amber-500 outline-none resize-none custom-scrollbar" placeholder="..." />
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
                      onDrop={e => handleAvatarDrop && handleAvatarDrop(e, url => setSnapshotData(prev=>({...prev, avatar: url})))}
                      onClick={() => handlePickLocalImage && handlePickLocalImage(url => setSnapshotData(prev=>({...prev, avatar: url})), null, 'avatar-snapshot')}
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
                         <input value={safeString(snapshotData.avatar)} onChange={e=>setSnapshotData(prev=>({...prev, avatar: e.target.value}))} className="flex-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:border-amber-500 outline-none" />
                         <button onClick={() => handlePickLocalImage && handlePickLocalImage(url => setSnapshotData(prev=>({...prev, avatar: url})), null, 'avatar-snapshot')} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-xs font-bold">Chọn File</button>
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
                         <input value={safeString(snapshotData.dynamicData[field.id])} onChange={e=>setSnapshotData(prev => ({...prev, dynamicData: {...prev.dynamicData, [field.id]: e.target.value}}))} className="w-full bg-slate-950/80 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 font-serif focus:border-amber-500 outline-none" placeholder="..." />
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

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-fast">
           <div className="bg-slate-900 border border-emerald-900/50 rounded-2xl w-full max-w-md shadow-2xl p-6">
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
}) => {
  const [newKey, setNewKey] = useState('');
  const [testStatus, setTestStatus] = useState({}); // idx -> 'testing'|'ok'|'fail'
  const [showKeys, setShowKeys] = useState({});     // idx -> bool (hiện plain text)

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
    } catch(e) {
      setTestStatus(prev => ({ ...prev, [idx]: 'fail' }));
    }
  };

  const maskKey = (k) => k.length > 12 ? k.slice(0, 8) + '••••••••' + k.slice(-4) : '••••••••••••';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in">
       <div className="bg-slate-900 border border-amber-700/50 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
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
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-fast">
       <div className="bg-slate-900 border border-rose-900/50 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
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
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-fast">
       <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl p-6">
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
  if (!isOpen) return null;

  const toggleGenre = (g) => {
      let currentGenres = formData.genres || [];
      if (currentGenres.includes(g)) {
          setFormData({ ...formData, genres: currentGenres.filter(x => x !== g) });
      } else {
          setFormData({ ...formData, genres: [...currentGenres, g] });
      }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in">
       <div className="bg-slate-900 border border-amber-700/50 rounded-3xl w-full max-w-4xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col md:flex-row h-[90vh]">
          <div className="w-full md:w-2/5 bg-slate-950 p-8 flex flex-col items-center justify-center border-r border-slate-800 relative overflow-hidden">
             <div
                className="w-full rounded-2xl border-2 border-dashed border-slate-700/80 flex flex-col items-center justify-center text-slate-500 relative overflow-hidden group bg-slate-900/50 z-10 shadow-2xl cursor-pointer hover:border-amber-600/50 transition-colors min-h-[180px]"
                onClick={() => handlePickLocalImage && handlePickLocalImage(url => setFormData({...formData, cover: url}), null, 'cover')}
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
                   <input autoFocus value={safeString(formData.title)} onChange={e=>setFormData({...formData, title: e.target.value})} className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-4 text-amber-100 font-heading text-xl focus:border-amber-500 outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Tác Giả</label>
                      <input value={safeString(formData.author)} onChange={e=>setFormData({...formData, author: e.target.value})} className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3.5 text-slate-200 font-serif focus:border-amber-500 outline-none" />
                   </div>
                   <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Khí Chất Giao Diện (Theme)</label>
                      <select value={safeString(formData.theme)} onChange={e=>setFormData({...formData, theme: e.target.value})} className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3.5 text-slate-200 font-serif focus:border-amber-500 outline-none appearance-none">
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
                           if (cfg) setFormData({ ...formData, tabsConfig: cfg });
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
                      <select value={safeString(formData.status)} onChange={e=>setFormData({...formData, status: e.target.value})} className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3.5 text-slate-200 font-serif focus:border-amber-500 outline-none appearance-none">
                         <option value="Đang đọc">Đang đọc</option>
                         <option value="Hoàn thành">Hoàn thành</option>
                         <option value="Tạm ngưng">Tạm ngưng</option>
                      </select>
                   </div>
                   <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Tổng Số Chương</label>
                      <input value={safeString(formData.chaptersTotal)} onChange={e=>setFormData({...formData, chaptersTotal: e.target.value})} className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3.5 text-slate-200 font-serif focus:border-amber-500 outline-none" />
                   </div>
                </div>

                <div>
                   <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Hoặc nhập URL ảnh trực tiếp</label>
                   <input
                     value={safeString(formData.cover).startsWith('local_image:') ? '' : safeString(formData.cover)}
                     onChange={e=>setFormData({...formData, cover: e.target.value})}
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
        try { abortRef.current.abort(); } catch (_) {}
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
      try { abortRef.current.abort(); } catch (_) {}
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
      } catch (_) {
        if (!cancelled && runId === searchSeqRef.current) setResults([]);
      } finally {
        if (!cancelled && runId === searchSeqRef.current) setSearchPending(false);
      }
    })();
    return () => {
      cancelled = true;
      try { ac.abort(); } catch (_) {}
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
  useEffect(() => { setHighlightIdx(0); }, [flatResults.length]);
  useEffect(() => {
    const el = resultRefs.current[highlightIdx];
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlightIdx]);

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

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center bg-slate-950/95 backdrop-blur-md pt-[8vh] px-4 animate-fade-in">
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col" style={{maxHeight:'80vh'}}>
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

  useEffect(() => {
    if (!isOpen) setQuery('');
  }, [isOpen]);

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
  useEffect(() => { setHighlightIdxInNovel(0); }, [flatResultsInNovel.length]);
  useEffect(() => {
    const el = resultRefsInNovel.current[highlightIdxInNovel];
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlightIdxInNovel]);

  const handleInNovelKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (flatResultsInNovel.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdxInNovel((i) => Math.min(i + 1, flatResultsInNovel.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdxInNovel((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = flatResultsInNovel[highlightIdxInNovel];
      if (r) { onSelectResult(r); onClose(); }
    }
  };

  if (!isOpen || !novel) return null;
  return (
    <div className="fixed inset-0 z-[295] flex items-start justify-center bg-slate-950/95 backdrop-blur-md pt-[8vh] px-4 animate-fade-in">
      <div className="bg-slate-900 border border-cyan-600/30 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '78vh' }}>
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
          <button type="button" onClick={onClose} className="p-1.5 text-slate-500 hover:text-white rounded-lg flex-shrink-0">
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
                      const isHighlight = highlightIdxInNovel === globalIdx;
                      return (
                      <div
                        key={`${r.tabLonId}-${r.tabNhoId}-${r.entityId}-${i}`}
                        ref={(el) => { resultRefsInNovel.current[globalIdx] = el; }}
                        onClick={() => {
                          onSelectResult(r);
                          onClose();
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
