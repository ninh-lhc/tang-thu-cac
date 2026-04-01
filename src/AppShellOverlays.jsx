/**
 * Lớp phủ toàn app (fixed overlay): xem ảnh phóng to, tooltip khi hover truyện ở sidebar,
 * toast + nút hoàn tác, màn hình chờ upload / import backup.
 *
 * Không chứa routing hay state nghiệp vụ — chỉ nhận props từ App.jsx.
 */
import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { AsyncLocalImage, safeString } from './MasterUtils.jsx';
import { FALLBACK_IMG } from './MasterEngines.js';
import { useFocusTrap } from './lib/useFocusTrap.js';

export const AppShellOverlays = React.memo(function AppShellOverlays({
  lightboxSrc,
  setLightboxSrc,
  hoveredNovelData,
  tooltipPos,
  toastMessage,
  toastTimerRef,
  setToastMessage,
  isUploading,
  importProgress,
  currentContextDirHandle,
}) {
  const [lightboxZoom, setLightboxZoom] = React.useState(1);
  const lightboxTrapRef = useFocusTrap(Boolean(lightboxSrc));
  const clampZoom = React.useCallback((z) => Math.min(5, Math.max(0.25, z)), []);

  React.useEffect(() => {
    if (!lightboxSrc) return;
    setLightboxZoom(1);
  }, [lightboxSrc]);

  const handleLightboxWheel = React.useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setLightboxZoom((prev) => clampZoom(prev + delta));
  }, [clampZoom]);

  return (
    <>
      {lightboxSrc && (
        <div
          ref={lightboxTrapRef}
          className="fixed inset-0 z-[500] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 animate-fade-fast cursor-zoom-out"
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh phóng to"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full p-2 transition-colors z-10"
            onClick={() => setLightboxSrc(null)}
            title="Đóng (Esc)"
          >
            <X size={24} />
          </button>
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightboxZoom((z) => clampZoom(z - 0.1))}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-600 text-sm font-bold"
              title="Thu nhỏ"
            >
              -
            </button>
            <button
              type="button"
              onClick={() => setLightboxZoom(1)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-bold min-w-[56px]"
              title="Về 100%"
            >
              {Math.round(lightboxZoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => setLightboxZoom((z) => clampZoom(z + 0.1))}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-600 text-sm font-bold"
              title="Phóng to"
            >
              +
            </button>
          </div>
          <div
            className="w-[96vw] h-[94vh] overflow-auto p-2 md:p-4"
            onClick={(e) => e.stopPropagation()}
            onWheel={handleLightboxWheel}
          >
            <div className="min-w-full min-h-full flex items-center justify-center">
              {lightboxSrc.startsWith('local_image:') ? (
                <AsyncLocalImage
                  filename={lightboxSrc.replace('local_image:', '')}
                  alt="Xem ảnh"
                  dirHandle={currentContextDirHandle}
                  className="rounded-xl shadow-2xl object-contain border border-slate-700"
                  style={{ transform: `scale(${lightboxZoom})`, transformOrigin: 'center center', transition: 'transform 120ms ease-out' }}
                />
              ) : (
                <img
                  src={lightboxSrc}
                  alt="Xem ảnh"
                  className="rounded-xl shadow-2xl object-contain border border-slate-700"
                  style={{ transform: `scale(${lightboxZoom})`, transformOrigin: 'center center', transition: 'transform 120ms ease-out' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = FALLBACK_IMG;
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {hoveredNovelData && (
        <div
          className="fixed z-[500] w-60 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-3 pointer-events-none animate-fade-fast"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
        >
          {hoveredNovelData.cover && !hoveredNovelData.cover.startsWith('local_image:') && (
            <img
              src={hoveredNovelData.cover}
              loading="lazy"
              className="w-full h-28 object-cover rounded-lg mb-2"
              alt=""
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )}
          <p className="text-sm font-bold text-amber-400 font-serif leading-tight mb-1">{safeString(hoveredNovelData.title)}</p>
          <p className="text-[10px] text-slate-500 mb-2">{safeString(hoveredNovelData.author)}</p>
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                hoveredNovelData.status === 'Hoàn thành'
                  ? 'bg-emerald-900/40 text-emerald-400 border-emerald-700/40'
                  : hoveredNovelData.status === 'Tạm ngưng'
                    ? 'bg-slate-800 text-slate-400 border-slate-700'
                    : 'bg-amber-900/30 text-amber-400 border-amber-700/40'
              }`}
            >
              {hoveredNovelData.status || 'Đang đọc'}
            </span>
            {hoveredNovelData.chaptersRead > 0 && (
              <span className="text-[10px] text-slate-500 font-serif">
                Ch.{hoveredNovelData.chaptersRead}
                {hoveredNovelData.chaptersTotal && hoveredNovelData.chaptersTotal !== '???'
                  ? `/${hoveredNovelData.chaptersTotal}`
                  : ''}
              </span>
            )}
          </div>
          {hoveredNovelData.chaptersTotal &&
            hoveredNovelData.chaptersTotal !== '???' &&
            parseInt(hoveredNovelData.chaptersTotal, 10) > 0 && (
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        (parseInt(hoveredNovelData.chaptersRead || 0, 10) / parseInt(hoveredNovelData.chaptersTotal, 10)) * 100
                      )
                    )}%`,
                  }}
                />
              </div>
            )}
        </div>
      )}

      {toastMessage && (
        <div
          role="alert"
          aria-live="polite"
          aria-atomic="true"
          className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] animate-fade-fast px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border max-w-[min(96vw,520px)] ${
            toastMessage.type === 'error'
              ? 'bg-rose-950 border-rose-700 text-rose-100'
              : toastMessage.type === 'warning'
                ? 'bg-amber-950 border-amber-700 text-amber-100'
                : 'bg-slate-800 border-slate-700 text-slate-100'
          }`}
        >
          <Sparkles
            size={18}
            className={`flex-shrink-0 animate-pulse ${
              toastMessage.type === 'error' ? 'text-rose-400' : toastMessage.type === 'warning' ? 'text-amber-400' : 'text-emerald-400'
            }`}
          />
          <span className="font-serif text-sm flex-1 min-w-0">{safeString(toastMessage.msg)}</span>
          {toastMessage.onUndo && (
            <button
              type="button"
              onClick={() => {
                const fn = toastMessage.onUndo;
                if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                setToastMessage(null);
                toastTimerRef.current = null;
                try {
                  fn();
                } catch {
                  /* ignore */
                }
              }}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold font-serif border border-indigo-500/50"
            >
              {safeString(toastMessage.undoLabel || 'Hoàn tác')}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
              setToastMessage(null);
              toastTimerRef.current = null;
            }}
            className="flex-shrink-0 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Đóng thông báo"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {isUploading && (
        <div className="fixed inset-0 z-[400] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-fast">
          <div className="w-16 h-16 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mb-4 shadow-xl" />
          <p className="text-amber-500 font-heading text-lg animate-pulse">Đang luân chuyển linh ảnh...</p>
        </div>
      )}

      {importProgress && (
        <div className="fixed inset-0 z-[400] bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-fast">
          <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4 shadow-xl" />
          <p className="text-emerald-400 font-heading text-lg animate-pulse mb-2">{importProgress.stage}</p>
          {importProgress.total > 1 && (
            <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
});
