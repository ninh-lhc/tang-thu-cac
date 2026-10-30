// ==========================================
// AppOverviewSection.jsx
// Mục đích: Toàn bộ nội dung tab Tổng Quan (tong-quan)
// Import bởi: App.jsx (lazy không cần vì luôn hiển thị khi mở truyện)
// Lưu ý: `tocRailExpanded` (mục lục dọc) chỉnh độ rộng văn bản / lối tắt neo. State isAddingTag / newTagValue nội bộ.
// ==========================================

import React, { useState } from 'react';
import {
  parseTotalChapters,
  computeProgressPercent,
  isReadingDone as checkNovelReadingDone,
  bumpReadChapters,
} from './lib/readingProgress.js';
import { AppOverviewRatingStars } from './AppOverviewRatingStars.jsx';
import {
  BookOpen, Settings, Trash2, Plus, X, ChevronDown, Search,
  Sparkles, Layers, GitBranch, Activity, BarChart2,
} from 'lucide-react';
import { safeString, generateReviewWithAI, mapGeminiErrorToUserMessage, AsyncLocalImage, generateId } from './MasterUtils.jsx';
import { FALLBACK_IMG } from './MasterEngines.js';
import { awaitNovelUpdateSync } from './lib/patchNovelData.js';
import { StatCard, SectionCard, ActionBtn } from './AppSharedUI.jsx';

export function AppOverviewSection({
  tocRailExpanded = true,
  // novel data
  activeNovelData,

  overviewForm,
  setOverviewForm,
  updateActiveNovelData,
  nearChapterEntitiesGlobal,
  novelQuickStats,
  geminiApiKeys,
  currentContextDirHandle,
  // ui state passed from App (also used outside this section)
  isGeneratingReview,
  setIsGeneratingReview,
  overviewNeoOpen,
  setOverviewNeoOpen,
  neoXrefSectionOpen,
  setNeoXrefSectionOpen,
  overviewStatsOpen,
  setOverviewStatsOpen,
  xrefDraft,
  setXrefDraft,
  // action callbacks
  showToast,
  setLightboxSrc,
  setIsInNovelSearchOpen,
  handleOpenEditNovel,
  handleDeleteNovel,
  openOverviewHub,
  handleNavigate,
  runXrefAiForRow,
  setConfirmDialog,
}) {
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');
  const patchOverviewForm = (patch) => setOverviewForm((prev) => ({ ...(prev || {}), ...patch }));
  const commitOverviewField = (field, rawValue) => {
    const nextValue =
      field === 'chaptersRead'
        ? Math.max(0, parseInt(rawValue, 10) || 0)
        : safeString(rawValue);
    patchOverviewForm({ [field]: nextValue });
    updateActiveNovelData((n) => {
      n[field] = nextValue;
    });
  };

  const anchor = Math.max(0, parseInt(activeNovelData.readingAnchorChapter ?? activeNovelData.chaptersRead ?? 0, 10) || 0);
  const lo = Math.max(0, anchor - 12);
  const hi = anchor + 30;
  const totalChapters = parseTotalChapters(activeNovelData.chaptersTotal);
  const readChapters = Math.max(0, parseInt(overviewForm?.chaptersRead, 10) || 0);
  const progressPercent = computeProgressPercent(readChapters, totalChapters);
  const isReadingDone = checkNovelReadingDone(readChapters, totalChapters);
  const novelGenres = Array.isArray(activeNovelData.genres)
    ? activeNovelData.genres.map((g) => safeString(g).trim()).filter(Boolean)
    : safeString(activeNovelData.genre).trim()
      ? [safeString(activeNovelData.genre).trim()]
      : [];
  const hasPersonalTags = (activeNovelData.tags || []).length > 0;
  const xrefs = Array.isArray(activeNovelData.chapterCrossRefs) ? activeNovelData.chapterCrossRefs : [];

  const handleAddTag = () => {
    if (!newTagValue.trim()) return;
    const nextTag = newTagValue.trim();
    updateActiveNovelData((nov) => {
      if (!nov.tags) nov.tags = [];
      if (!nov.tags.includes(nextTag)) nov.tags.push(nextTag);
    });
    setNewTagValue('');
    setIsAddingTag(false);
  };

  const handleRemoveTag = (tag) => {
    updateActiveNovelData((nov) => {
      nov.tags = (nov.tags || []).filter((t) => t !== tag);
    });
  };

  return (
    <div className="space-y-7 animate-fade-in">
      {/* ===== HERO: cover + thông tin chính ===== */}
      <section
        className="rounded-[var(--tt-r-panel,1.75rem)] border border-slate-800/70 bg-gradient-to-b from-slate-900/35 to-slate-950/60 p-8"
        style={{ boxShadow: 'var(--tt-shadow-panel)' }}
      >
        <div className="grid grid-cols-[260px_minmax(0,1fr)] gap-10 items-start">
          <aside className="w-[260px] flex-shrink-0">
            <div
              className={`rounded-[var(--tt-r-card,1rem)] overflow-hidden shadow-2xl border border-slate-800 relative group ${activeNovelData.cover ? 'cursor-zoom-in tt-kbd-focus' : ''}`}
              role={activeNovelData.cover ? 'button' : undefined}
              tabIndex={activeNovelData.cover ? 0 : undefined}
              aria-label={activeNovelData.cover ? 'Mở xem ảnh bìa đầy đủ' : undefined}
              onKeyDown={(e) => { if (!activeNovelData.cover) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLightboxSrc(activeNovelData.cover); } }}
              onClick={() => activeNovelData.cover && setLightboxSrc(activeNovelData.cover)}
              title={activeNovelData.cover ? 'Nhấp để xem ảnh đầy đủ' : undefined}
            >
              {activeNovelData.cover ? (
                activeNovelData.cover.startsWith('local_image:') ? (
                  <AsyncLocalImage
                    filename={activeNovelData.cover.replace('local_image:', '')}
                    alt={activeNovelData.title}
                    dirHandle={currentContextDirHandle}
                    className="w-full h-auto block object-contain"
                  />
                ) : (
                  <img
                    src={activeNovelData.cover}
                    className="w-full h-auto block object-contain"
                    alt={activeNovelData.title}
                    onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMG; }}
                  />
                )
              ) : (
                <div className="aspect-[2/3] flex items-center justify-center bg-slate-900 text-slate-600">
                  <BookOpen size={48} />
                </div>
              )}
              {activeNovelData.cover && (
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-xs font-bold bg-slate-900/80 px-3 py-1.5 rounded-full">Xem ảnh đầy đủ</span>
                </div>
              )}
            </div>
          </aside>

          <div className="min-w-0 flex flex-col gap-5">
            <header className="space-y-1">
              <h1 className="text-5xl font-heading font-bold text-slate-100 leading-tight">{safeString(activeNovelData.title)}</h1>
              <p className="text-xl text-slate-400 font-serif italic">Tác giả: {safeString(activeNovelData.author)}</p>
              {novelGenres.length > 0 && (
                <div className="pt-2">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1.5">
                    Thể loại
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {novelGenres.map((genre) => (
                      <span
                        key={genre}
                        className="px-2.5 py-1 rounded-md text-[11px] font-serif border border-cyan-800/40 bg-cyan-950/25 text-cyan-200"
                      >
                        {safeString(genre)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </header>

            {/* Quick stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2" aria-label="Thông số nhanh">
              <StatCard label="Tiến độ" value={`${readChapters}/${totalChapters || '???'}`} color="amber" />
              <StatCard label="Hoàn thành" value={`${progressPercent}%`} color="amber" />
              <StatCard label="Đánh giá" value={`${Number(overviewForm?.rating || 0).toFixed(1)}/5`} color="amber" />
              <StatCard label="Số tag" value={(activeNovelData.tags || []).length} color="amber" />
            </div>

            {/* Progress + Rating grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {/* Tiến độ đọc */}
              <div
                className="rounded-[var(--tt-r-md,0.75rem)] border px-4 py-3"
                style={{ backgroundColor: 'var(--tt-surface-2)', borderColor: 'var(--tt-border)' }}
                data-testid="reading-progress-panel"
              >
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-2 flex items-center gap-1.5">
                  <BookOpen size={12}/> Tiến độ đọc
                </label>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <input
                    type="number" min="0"
                    className="w-24 bg-slate-900/50 border border-slate-800 rounded-lg p-2 text-slate-200 text-sm focus:outline-none focus:border-amber-600/50 font-serif"
                    value={overviewForm?.chaptersRead || 0}
                    onChange={(e) => patchOverviewForm({ chaptersRead: parseInt(e.target.value, 10) || 0 })}
                    onBlur={(e) => commitOverviewField('chaptersRead', e.currentTarget.value)}
                  />
                  <span className="text-slate-600 font-serif text-sm">/</span>
                  <span className="text-slate-300 font-serif text-sm">{safeString(activeNovelData.chaptersTotal) || '???'}</span>
                  <span data-testid="reading-progress-percent" className="ml-1 text-xs text-amber-500 font-bold font-serif">{progressPercent}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden mb-2">
                  <div className="h-full bg-gradient-to-r from-amber-700 to-amber-500 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ActionBtn
                    data-testid="reading-minus-one"
                    onClick={() => {
                      const next = bumpReadChapters(readChapters, -1, totalChapters);
                      setOverviewForm((prev) => ({ ...(prev || {}), chaptersRead: next }));
                      updateActiveNovelData((n) => { n.chaptersRead = next; });
                    }}
                  >
                    −1 chương
                  </ActionBtn>
                  <ActionBtn
                    data-testid="reading-plus-one"
                    onClick={() => {
                      const next = bumpReadChapters(readChapters, 1, totalChapters);
                      setOverviewForm((prev) => ({ ...(prev || {}), chaptersRead: next }));
                      updateActiveNovelData((n) => { n.chaptersRead = next; });
                    }}
                  >
                    +1 chương
                  </ActionBtn>
                  <ActionBtn
                    data-testid="reading-plus-five"
                    onClick={() => {
                      const next = bumpReadChapters(readChapters, 5, totalChapters);
                      setOverviewForm((prev) => ({ ...(prev || {}), chaptersRead: next }));
                      updateActiveNovelData((n) => { n.chaptersRead = next; });
                    }}
                  >
                    +5 chương
                  </ActionBtn>
                  <ActionBtn
                    data-testid="reading-mark-done"
                    variant={isReadingDone ? 'active' : 'default'}
                    onClick={() => {
                      if (totalChapters > 0) {
                        const done = totalChapters;
                        setOverviewForm((prev) => ({ ...(prev || {}), chaptersRead: done }));
                        updateActiveNovelData((n) => { n.chaptersRead = done; });
                        return;
                      }
                      setConfirmDialog({
                        isOpen: true,
                        title: 'Chưa có tổng số chương',
                        message: '«Đánh dấu đã xong» cần biết tổng chương. Mở <b>Thiết lập truyện</b> để nhập tổng chương?',
                        onConfirm: () => { handleOpenEditNovel(); },
                      });
                    }}
                  >
                    {isReadingDone ? '✓ Đã xong' : 'Đánh dấu đã xong'}
                  </ActionBtn>
                </div>
              </div>

              {/* Đánh giá sao + ý kiến cá nhân */}
              <div
                className="rounded-[var(--tt-r-md,0.75rem)] border px-4 py-3"
                style={{ backgroundColor: 'var(--tt-surface-2)', borderColor: 'var(--tt-border)' }}
              >
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-2">
                  Đánh giá sao cá nhân
                </label>
                <AppOverviewRatingStars
                  rating={overviewForm?.rating || 0}
                  onChange={(r) => {
                    patchOverviewForm({ rating: r });
                    updateActiveNovelData((n) => { n.rating = r; });
                  }}
                />
                  <button
                    type="button"
                    onClick={() => {
                      setOverviewForm((prev) => ({ ...(prev || {}), rating: 0 }));
                      updateActiveNovelData((n) => { n.rating = 0; });
                    }}
                    className="mt-2 px-2 py-1 rounded-lg text-[10px] font-bold border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
                  >
                    Bỏ đánh giá
                  </button>
                <textarea
                  className="mt-3 w-full bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-slate-300 font-serif text-sm leading-relaxed focus:outline-none focus:border-amber-600/50 min-h-[80px] resize-none custom-scrollbar"
                  value={safeString(overviewForm?.ratingOpinion)}
                  onChange={(e) => patchOverviewForm({ ratingOpinion: e.target.value })}
                  onBlur={(e) => commitOverviewField('ratingOpinion', e.currentTarget.value)}
                  placeholder="Ghi ý kiến / bình luận cá nhân về truyện (khác với phần giới thiệu phía dưới)..."
                />
              </div>
            </div>

            {/* Nhãn cá nhân */}
            {hasPersonalTags || isAddingTag ? (
              <div className="rounded-xl bg-slate-950/45 border border-amber-900/30 px-4 py-3 mb-6">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-3 uppercase tracking-widest">
                  <BookOpen size={14} /> Nhãn cá nhân
                </label>
                <div className="flex flex-wrap gap-2.5 items-center">
                  {(activeNovelData.tags || []).map((tag) => (
                    <span key={tag} className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-md text-sm text-slate-300 font-serif flex items-center gap-2 group/tag">
                      {safeString(tag)}
                      <button onClick={() => handleRemoveTag(tag)} className="text-slate-500 hover:text-rose-400 opacity-50 group-hover/tag:opacity-100 transition-opacity">
                        <X size={12}/>
                      </button>
                    </span>
                  ))}
                  {isAddingTag ? (
                    <input
                      autoFocus type="text" placeholder="Nhập nhãn..."
                      className="px-3 py-1.5 bg-slate-950 border border-amber-600/50 rounded-md text-sm text-slate-200 focus:outline-none w-32 font-serif"
                      value={newTagValue}
                      onChange={(e) => setNewTagValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(); }}
                      onBlur={() => { if (newTagValue.trim()) handleAddTag(); else setIsAddingTag(false); }}
                    />
                  ) : (
                    <button
                      onClick={() => setIsAddingTag(true)}
                      className="px-3 py-1.5 bg-transparent border border-dashed border-slate-700 rounded-md text-sm text-slate-500 hover:text-amber-400 hover:border-amber-500/50 transition-colors font-serif flex items-center gap-1"
                    >
                      <Plus size={14} /> Thêm nhãn
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <button
                  onClick={() => setIsAddingTag(true)}
                  className="px-3 py-1.5 bg-slate-950/45 border border-dashed border-slate-700 rounded-md text-sm text-slate-500 hover:text-amber-400 hover:border-amber-500/50 transition-colors font-serif flex items-center gap-1"
                >
                  <Plus size={14} /> Thêm nhãn cá nhân
                </button>
              </div>
            )}

            {/* Thống kê truyện */}
            {novelQuickStats && (novelQuickStats.totalEnt > 0 || novelQuickStats.totalMs > 0) && (
              <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOverviewStatsOpen((o) => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800/30 transition-colors"
                >
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <BarChart2 size={14} className="text-cyan-500/80" /> Thống kê truyện
                  </span>
                  <span className="text-[10px] text-slate-500 font-serif">
                    {novelQuickStats.totalEnt} thẻ · {novelQuickStats.totalMs} mốc
                    <ChevronDown size={14} className={`inline ml-1 transition-transform ${overviewStatsOpen ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                {overviewStatsOpen && (
                  <div className="px-4 pb-4 pt-0 border-t border-slate-800/80 animate-fade-in space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3">
                      <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3 text-center">
                        <div className="text-xl font-heading font-bold text-indigo-300">{novelQuickStats.totalEnt}</div>
                        <div className="text-[9px] text-slate-500 uppercase">Tổng thẻ</div>
                      </div>
                      <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3 text-center">
                        <div className="text-xl font-heading font-bold text-emerald-300">{novelQuickStats.totalMs}</div>
                        <div className="text-[9px] text-slate-500 uppercase">Tổng mốc</div>
                      </div>
                      <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3 text-center col-span-2 sm:col-span-1">
                        <div className="text-sm font-bold text-amber-400/90">{novelQuickStats.byTab.length}</div>
                        <div className="text-[9px] text-slate-500 uppercase">Mục có dữ liệu</div>
                      </div>
                    </div>
                    {novelQuickStats.byTab.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Theo mục</p>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar text-xs font-serif">
                          {novelQuickStats.byTab.map((row) => (
                            <div key={row.key} className="flex justify-between text-slate-400 border-b border-slate-800/50 pb-1">
                              <span className="truncate pr-2">{row.label}</span>
                              <span className="text-slate-500 flex-shrink-0">{row.entities} thẻ · {row.milestones} mốc</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {novelQuickStats.topChapters.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Chương có nhiều mốc nhất</p>
                        <div className="space-y-2">
                          {novelQuickStats.topChapters.map(({ ch, n }) => (
                            <div key={ch} className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500 w-10 tabular-nums">ch.{ch}</span>
                              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-amber-700 to-amber-500 rounded-full"
                                  style={{ width: `${Math.max(8, Math.round((n / novelQuickStats.maxBar) * 100))}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-400 w-6 text-right">{n}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== Giới thiệu truyện ===== */}
      <section
        className="rounded-[var(--tt-r-card,1rem)] border border-slate-800/70 bg-slate-900/25 p-6"
        style={{ boxShadow: 'var(--tt-shadow-card)' }}
      >
        <div className="flex justify-between items-center mb-3">
          <label className="text-xs text-slate-500 uppercase font-bold tracking-widest flex items-center gap-2">
            <BookOpen size={14}/> Giới thiệu / Tóm tắt truyện
          </label>
          <button
            onClick={async () => {
              if (geminiApiKeys.length === 0) { showToast('Vui lòng nhập API Key (trong mục Cài Đặt) để dùng AI', 'warning'); return; }
              setIsGeneratingReview(true);
              try {
                const text = await generateReviewWithAI(activeNovelData, geminiApiKeys);
                if (text) {
                  patchOverviewForm({ review: text });
                  const saveOutcome = updateActiveNovelData((n) => { n.review = text; });
                  const syncResult = await awaitNovelUpdateSync(saveOutcome);
                  if (syncResult.ok) showToast('Đã lĩnh ngộ thành công!');
                }
                else showToast('AI không trả về nội dung.', 'warning');
              } catch (e) { showToast(mapGeminiErrorToUserMessage(e), 'error'); }
              setIsGeneratingReview(false);
            }}
            disabled={isGeneratingReview}
            className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-bold bg-amber-950/30 px-3 py-1.5 rounded-lg border border-amber-900/50 transition-colors disabled:opacity-50"
          >
            {isGeneratingReview ? <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"/> : <Sparkles size={14} />}
            {isGeneratingReview ? 'Đang tổng hợp...' : 'AI Tổng Hợp Đạo Tâm'}
          </button>
        </div>
        <textarea
          className="w-full flex-1 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 text-slate-300 font-serif text-lg leading-relaxed focus:outline-none focus:border-amber-600/50 min-h-[200px] resize-none custom-scrollbar tt-kbd-focus"
          value={safeString(overviewForm?.review)}
          onChange={(e) => patchOverviewForm({ review: e.target.value })}
          onBlur={(e) => commitOverviewField('review', e.currentTarget.value)}
          placeholder="Viết giới thiệu / tóm tắt nội dung truyện (AI có thể tổng hợp hộ). Tự động lưu khi nhấp ra ngoài."
        />
      </section>

      {/* ===== Công cụ nhanh ===== */}
      <section
        className="rounded-[var(--tt-r-card,1rem)] border border-slate-800/70 bg-slate-950/40 p-5"
        style={{ boxShadow: 'var(--tt-shadow-card)' }}
      >
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-3">Công cụ nhanh</label>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => setOverviewNeoOpen((o) => !o)}
            className={`font-serif text-sm px-4 py-2.5 rounded-xl border flex items-center justify-center gap-2 transition-colors ${overviewNeoOpen ? 'bg-amber-950/50 border-amber-700/50 text-amber-200' : 'bg-slate-800/80 border-slate-600/50 text-slate-300 hover:border-amber-600/30'}`}
          >
            <BookOpen size={15} className="opacity-80 flex-shrink-0" />
            Ghi theo chương
            <ChevronDown size={16} className={`opacity-60 transition-transform flex-shrink-0 ${overviewNeoOpen ? 'rotate-180' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsInNovelSearchOpen(true)}
            className="font-serif text-sm px-4 py-2.5 rounded-xl bg-cyan-950/50 border border-cyan-800/45 text-cyan-300 hover:bg-cyan-900/35 flex items-center justify-center gap-2 transition-colors"
          >
            <Search size={15} className="opacity-80" /> Tra trong truyện
          </button>
          <button
            type="button"
            onClick={openOverviewHub}
            className="font-serif text-sm px-4 py-2.5 rounded-xl bg-violet-950/55 border border-violet-700/40 text-violet-200 hover:bg-violet-900/40 flex items-center justify-center gap-2 transition-colors"
          >
            <Layers size={15} className="opacity-90" /> Một cửa cập nhật
          </button>
          <button
            type="button"
            onClick={() => setNeoXrefSectionOpen((o) => !o)}
            className={`font-serif text-sm px-4 py-2.5 rounded-xl border flex items-center justify-center gap-2 transition-colors ${neoXrefSectionOpen ? 'bg-amber-950/40 border-amber-800/50 text-amber-200' : 'bg-slate-800/80 border-slate-600/50 text-slate-300 hover:border-amber-600/25'}`}
          >
            <GitBranch size={15} className="text-amber-500/80 flex-shrink-0" />
            Nối tra cứu
            {xrefs.length > 0 && (
              <span className="font-sans text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-900/50 text-amber-400">{xrefs.length}</span>
            )}
            <ChevronDown size={16} className={`opacity-60 transition-transform flex-shrink-0 ${neoXrefSectionOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </section>

      {/* ===== Theo chương & công cụ ===== */}
      <section
        className="rounded-[var(--tt-r-card,1rem)] border border-amber-900/25 bg-gradient-to-br from-slate-950 via-slate-900/95 to-slate-950 overflow-hidden"
        style={{ boxShadow: 'var(--tt-shadow-card), inset 0 1px 0 rgba(255,255,255,0.03)' }}
      >
        <div className="border-l-[5px] border-amber-500/85 pl-4 pr-3 py-4 sm:pl-5 sm:pr-4">
          <div className="min-w-0 mb-4">
            <h3 className="font-heading text-lg sm:text-xl text-amber-50 tracking-tight">Theo chương & công cụ</h3>
            <p className={`font-serif text-xs text-slate-500 mt-1.5 ${tocRailExpanded ? 'max-w-3xl' : 'max-w-4xl xl:max-w-5xl'}`}>
              Neo <span className="text-amber-400 font-bold tabular-nums">ch.{anchor}</span>
              <span className="text-slate-600"> · Mốc mới (khi tạo) theo chương neo. Cập nhật hàng loạt: «Một cửa» — dùng khối Công cụ nhanh phía trên.</span>
            </p>
          </div>

          {overviewNeoOpen && (
            <div className="mt-4 pt-4 border-t border-slate-800/80 animate-fade-in space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-4">
                  <button
                    type="button"
                    aria-label="Giảm chương"
                    onClick={() => updateActiveNovelData((n) => { const b = parseInt(n.readingAnchorChapter ?? n.chaptersRead ?? 0, 10) || 0; n.readingAnchorChapter = Math.max(0, b - 1); })}
                    className="min-h-10 min-w-10 rounded-xl bg-slate-800/90 border border-slate-600/60 text-amber-400 text-lg font-medium hover:bg-slate-700 transition-all active:scale-95"
                  >−</button>
                  <div className="min-w-[3.5rem] text-center">
                    <span className="font-heading text-4xl sm:text-5xl text-amber-400 tabular-nums leading-none">{anchor}</span>
                    <div className="font-serif text-[10px] text-slate-600 mt-0.5">chương neo</div>
                    <input
                      type="number" min="0" value={anchor}
                      onChange={(e) => {
                        const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                        updateActiveNovelData((n) => { n.readingAnchorChapter = v; });
                      }}
                      className="mt-2 w-20 mx-auto bg-slate-950/70 border border-slate-700 rounded-lg px-2 py-1 text-xs text-amber-200/90 font-serif text-center focus:outline-none focus:border-amber-600/50"
                      aria-label="Nhập chương neo"
                      title="Nhập số chương neo"
                    />
                  </div>
                  <button
                    type="button"
                    aria-label="Tăng chương"
                    onClick={() => updateActiveNovelData((n) => { const b = parseInt(n.readingAnchorChapter ?? n.chaptersRead ?? 0, 10) || 0; n.readingAnchorChapter = b + 1; })}
                    className="min-h-10 min-w-10 rounded-xl bg-slate-800/90 border border-slate-600/60 text-amber-400 text-lg font-medium hover:bg-slate-700 transition-all active:scale-95"
                  >+</button>
                </div>
                <button
                  type="button"
                  onClick={() => updateActiveNovelData((n) => { n.readingAnchorChapter = parseInt(n.chaptersRead, 10) || 0; })}
                  className="font-serif text-sm px-4 py-2 rounded-full bg-slate-800/80 border border-slate-600/50 text-cyan-300 hover:bg-slate-700/90 w-fit mx-auto sm:mx-0"
                >
                  Đồng bộ theo tiến độ đọc
                </button>
              </div>
              <div>
                <h4 className="font-heading text-[10px] font-semibold text-amber-200/70 uppercase tracking-widest flex items-center gap-2 mb-2">
                  <Activity size={14} className="text-amber-500/90" /> Lối tắt ch.{lo}–{hi}
                </h4>
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar flex-nowrap -mx-1 px-1 snap-x">
                  {nearChapterEntitiesGlobal.map((row) => (
                    <button
                      key={`${row.lonId}-${row.nhoId}-${row.ent.id}`}
                      type="button"
                      onClick={() => handleNavigate({ lonId: row.lonId, nhoId: row.nhoId, entityId: row.ent.id })}
                      className={`snap-start flex-shrink-0 text-left px-3 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/70 hover:border-amber-500/35 min-w-[120px] ${tocRailExpanded ? 'max-w-[200px]' : 'max-w-[260px] sm:min-w-[140px]'}`}
                    >
                      <span className="font-serif text-sm text-slate-100 line-clamp-2">{safeString(row.ent.name)}</span>
                      <span className="block font-sans text-[9px] uppercase text-slate-500 mt-1 truncate">{safeString(row.sectionLabel)}</span>
                    </button>
                  ))}
                </div>
                {nearChapterEntitiesGlobal.length === 0 && (
                  <p className="font-serif text-xs text-slate-600 italic">Chưa có mốc trong vùng này.</p>
                )}
              </div>
            </div>
          )}

          {neoXrefSectionOpen && (
            <div className="mt-4 pt-4 border-t border-slate-800/80 animate-fade-in">
              <p className="font-serif text-xs text-slate-600 mb-3">
                Ch.X → Ch.Y + ghi chú. <Sparkles size={12} className="inline align-text-bottom text-amber-500/90" /> trên dòng để AI gợi ý.
              </p>
              <div className="mt-4 space-y-3 animate-fade-in">
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="flex flex-col gap-1">
                    <label className="font-sans text-[10px] uppercase tracking-wider text-slate-500">Đang đọc</label>
                    <input
                      type="number" placeholder="vd. 200"
                      className="w-20 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 font-serif text-sm text-amber-100/90 focus:outline-none focus:border-amber-600/50"
                      value={xrefDraft.from}
                      onChange={(e) => setXrefDraft((d) => ({ ...d, from: e.target.value }))}
                    />
                  </div>
                  <span className="text-slate-600 pb-2 font-serif">→</span>
                  <div className="flex flex-col gap-1">
                    <label className="font-sans text-[10px] uppercase tracking-wider text-slate-500">Nhắc chương</label>
                    <input
                      type="number" placeholder="vd. 15"
                      className="w-20 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 font-serif text-sm text-cyan-200/90 focus:outline-none focus:border-cyan-700/50"
                      value={xrefDraft.to}
                      onChange={(e) => setXrefDraft((d) => ({ ...d, to: e.target.value }))}
                    />
                  </div>
                  <input
                    type="text" placeholder="Ghi chú (một dòng)"
                    className="flex-1 min-w-[160px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 font-serif text-sm text-slate-200 focus:outline-none focus:border-amber-600/40"
                    value={xrefDraft.note}
                    onChange={(e) => setXrefDraft((d) => ({ ...d, note: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const from = parseInt(xrefDraft.from, 10);
                      const to = parseInt(xrefDraft.to, 10);
                      if (isNaN(from) || isNaN(to) || !xrefDraft.note.trim()) { showToast('Nhập đủ hai chương và ghi chú.', 'warning'); return; }
                      updateActiveNovelData((n) => { if (!n.chapterCrossRefs) n.chapterCrossRefs = []; n.chapterCrossRefs.push({ id: generateId('xref'), fromCh: from, toCh: to, note: xrefDraft.note.trim() }); });
                      setXrefDraft({ from: '', to: '', note: '' });
                      showToast('Đã lưu nối tra cứu.');
                    }}
                    className="font-heading text-sm px-5 py-2 rounded-full bg-amber-700 hover:bg-amber-600 text-white border border-amber-600/50 transition-colors"
                  >Thêm</button>
                </div>
                {xrefs.length > 0 ? (
                  <ul className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
                    {xrefs.map((x) => (
                      <li key={x.id} className="flex justify-between gap-2 items-start font-serif text-sm bg-slate-950/70 rounded-xl px-4 py-2.5 border border-slate-800/90">
                        <span className="text-slate-300 leading-relaxed min-w-0">
                          <span className="text-amber-500 font-semibold tabular-nums">Ch.{x.fromCh}</span>
                          <span className="text-slate-600 mx-1">→</span>
                          <span className="text-cyan-400/90 font-semibold tabular-nums">Ch.{x.toCh}</span>
                          <span className="text-slate-500"> — </span>
                          {safeString(x.note)}
                        </span>
                        <div className="flex items-start gap-0.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => runXrefAiForRow(x)}
                            className="text-amber-500/90 hover:text-amber-300 p-1.5 rounded-lg hover:bg-amber-950/40 transition-colors"
                            title="AI: gợi ý thẻ mới / mốc / cập nhật"
                            aria-label="Gợi ý AI"
                          >
                            <Sparkles size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateActiveNovelData((n) => { if (!n.chapterCrossRefs) return; n.chapterCrossRefs = n.chapterCrossRefs.filter((r) => r.id !== x.id); })}
                            className="text-rose-400/90 hover:text-rose-300 text-lg leading-none px-1"
                            aria-label="Xóa"
                          >×</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="font-serif text-sm text-slate-600 italic pl-1">Chưa có ghi chú — ví dụ: ch.200 nhắc sự kiện ch.15.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ===== Quản lý thư tịch ===== */}
      <section
        className="rounded-[var(--tt-r-card,1rem)] border border-slate-800/70 bg-slate-950/35 px-6 py-4"
        style={{ boxShadow: 'var(--tt-shadow-card)' }}
      >
        <div className="flex flex-wrap justify-between items-center gap-4">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Quản lý thư tịch</p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleOpenEditNovel}
              className="px-4 sm:px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold flex items-center gap-2 transition-colors border border-slate-700"
            >
              <Settings size={17}/> Thiết Lập Truyện
            </button>
            <button
              onClick={() => setConfirmDialog({
                isOpen: true,
                title: 'Hủy Diệt Thư Tịch',
                message: `Xóa sổ vĩnh viễn <b>${safeString(activeNovelData.title)}</b> cùng toàn bộ ảnh của nó? Hành động này không thể vãn hồi!`,
                onConfirm: () => handleDeleteNovel(activeNovelData.id),
              })}
              className="px-5 py-2.5 bg-slate-900 text-rose-500 rounded-xl font-bold flex items-center gap-2 transition-colors border border-slate-800 hover:border-rose-900/50 hover:bg-rose-950/30"
            >
              <Trash2 size={17} /> Hủy Diệt
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
