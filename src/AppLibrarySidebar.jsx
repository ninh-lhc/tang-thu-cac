// AppLibrarySidebar.jsx
// Thanh sidebar thư viện truyện — tìm kiếm, lọc thể loại, thêm truyện
// searchField: 'all' | 'title' | 'author' | 'tag' — lọc trường tìm kiếm

import React, { memo } from 'react';
import { Search, Filter, ChevronDown, Plus, Cloud, Check, X } from 'lucide-react';
import { GENRES } from './MasterEngines.js';
import { safeString } from './MasterUtils.jsx';

const FIELD_OPTIONS = [
  { value: 'all',    label: 'Tất cả' },
  { value: 'title',  label: 'Tiêu đề' },
  { value: 'author', label: 'Tác giả' },
  { value: 'tag',    label: 'Nhãn' },
];

export const AppLibrarySidebar = memo(function AppLibrarySidebar({
  menu1Visible,
  setMenu1Visible,
  librarySearchInputRef,
  searchInput,
  setSearchInput,
  searchHistory,
  setSearchQuery,
  searchField,
  setSearchField,
  isGenreFilterOpen,
  setIsGenreFilterOpen,
  selectedGenres,
  toggleGenre,
  setSelectedGenres,
  handleOpenCreateNovel,
  setIsSettingsOpen,
  dirHandle,
  filteredNovelsList,
  sidebarListRef,
  handleSidebarScroll,
  totalSidebarItems,
  SIDEBAR_ITEM_HEIGHT,
  sidebarNovelItems,
}) {
  const hasActiveFilters = searchInput.trim() || selectedGenres.length > 0 || searchField !== 'all';

  const handleClearAll = () => {
    setSearchInput('');
    setSearchQuery('');
    setSelectedGenres([]);
    setSearchField('all');
  };

  return (
    <div
      onMouseLeave={() => setMenu1Visible(false)}
      className={`absolute inset-y-0 left-0 z-40 bg-slate-900 border-r border-slate-800 shadow-2xl flex flex-col transition-transform duration-300 ease-out w-80 ${menu1Visible ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="p-5 border-b border-slate-800 flex flex-col gap-3">
        {/* Search input */}
        <div className="relative">
          <input
            ref={librarySearchInputRef}
            type="text"
            placeholder="Tìm kiếm thư tịch… (/)"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-8 text-sm font-serif outline-none focus:border-amber-600/50"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 text-slate-600" size={16} />
          {searchInput && (
            <button
              type="button"
              onClick={() => { setSearchInput(''); setSearchQuery(''); }}
              className="absolute right-2.5 top-2.5 text-slate-600 hover:text-slate-400"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Field chips */}
        <div className="flex gap-1.5 flex-wrap">
          {FIELD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSearchField(opt.value)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors font-serif ${
                searchField === opt.value
                  ? 'bg-amber-900/40 border-amber-700/60 text-amber-200'
                  : 'bg-slate-950/50 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-rose-800/40 bg-rose-950/20 text-rose-400 hover:text-rose-300 transition-colors ml-auto font-serif"
            >
              Xóa tất cả
            </button>
          )}
        </div>

        {/* Recent search history */}
        {searchHistory.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[9px] text-slate-600 uppercase tracking-wider w-full">Gần đây</span>
            {searchHistory.slice(0, 6).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => { setSearchInput(h); setSearchQuery(h); }}
                className="text-[10px] px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400 hover:border-amber-800/40 font-serif truncate max-w-full"
              >
                {safeString(h)}
              </button>
            ))}
          </div>
        )}

        {/* Genre filter */}
        <div className="relative">
          <button
            onClick={() => setIsGenreFilterOpen(!isGenreFilterOpen)}
            className="w-full bg-slate-950/50 border border-slate-700/80 hover:border-amber-600/50 rounded-lg py-2 pl-3 pr-4 text-sm flex items-center justify-between text-slate-300 font-serif shadow-inner"
          >
            <div className="flex items-center gap-2">
              <Filter size={15} className={selectedGenres.length > 0 ? 'text-amber-500' : 'text-slate-500'} />
              <span className={selectedGenres.length > 0 ? 'text-amber-100' : 'text-slate-400'}>
                {selectedGenres.length === 0 ? 'Tất cả thể loại' : `Đã chọn (${selectedGenres.length})`}
              </span>
            </div>
            <ChevronDown size={16} className={`text-slate-500 transition-transform ${isGenreFilterOpen ? 'rotate-180' : ''}`} />
          </button>
          {isGenreFilterOpen && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-700/80 rounded-lg shadow-2xl z-30 p-2 max-h-56 overflow-y-auto custom-scrollbar animate-slide-down">
              {(GENRES || []).map((g) => (
                <button
                  key={g}
                  onClick={() => toggleGenre(g)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-serif flex items-center justify-between mb-1 ${selectedGenres.includes(g) ? 'bg-amber-900/40 text-amber-400 font-bold' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  {g} {selectedGenres.includes(g) && <Check size={14} />}
                </button>
              ))}
              {selectedGenres.length > 0 && (
                <button
                  onClick={() => setSelectedGenres([])}
                  className="w-full text-center mt-2 pt-2 border-t border-slate-800 text-xs text-rose-400"
                >
                  Xoá bộ lọc thể loại
                </button>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleOpenCreateNovel}
            className="flex-1 py-2 bg-amber-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors hover:bg-amber-600 shadow-md"
          >
            <Plus size={14}/> Thu Thập
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className={`flex-1 py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-md ${dirHandle && dirHandle !== 'LOCAL_STORAGE' ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 border border-slate-700 text-slate-300 hover:text-amber-400'}`}
          >
            <Cloud size={14}/> {dirHandle && dirHandle !== 'LOCAL_STORAGE' ? 'Đã Đồng Bộ' : 'Lưu Trữ'}
          </button>
        </div>
      </div>

      {/* Novel list */}
      <div ref={sidebarListRef} onScroll={handleSidebarScroll} className="flex-1 overflow-y-auto p-3 custom-scrollbar overflow-x-visible">
        {filteredNovelsList.length === 0 ? (
          <div className="text-center text-slate-500 text-sm mt-10 font-serif italic">
            {hasActiveFilters ? 'Không có kết quả — thử xóa bộ lọc' : 'Không tìm thấy thư tịch...'}
          </div>
        ) : (
          <div style={{ position: 'relative', height: totalSidebarItems * SIDEBAR_ITEM_HEIGHT }}>
            {sidebarNovelItems}
          </div>
        )}
      </div>
    </div>
  );
});
