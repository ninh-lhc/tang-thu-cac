import React, { memo } from 'react';
import { Images } from 'lucide-react';
import { AsyncLocalImage, safeString } from './MasterUtils.jsx';
import { FALLBACK_IMG } from './MasterEngines.js';

export const AppGalleryContent = memo(function AppGalleryContent({
  collectionSubTab,
  galleryPortraitEntries,
  visibleGalleryEntries,
  galleryHasMore,
  setGalleryVisiblePage,
  handleOpenEntityFromGallery,
  activeNovelDirHandle,
  dirHandle,
}) {
  if (collectionSubTab !== 'gallery') return null;

  if (galleryPortraitEntries.length === 0) {
    return (
      <div className="animate-fade-in pb-8">
        <div className="flex flex-col items-center justify-center py-16 text-slate-600">
          <Images size={48} className="mb-4 opacity-30" />
          <p className="font-serif italic text-center px-4">Chưa có ảnh đại diện nào trong các mục sưu tập.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {visibleGalleryEntries.map((row) => (
          <button type="button" key={`${row.lonId}-${row.nhoId}-${row.ent.id}`} onClick={() => handleOpenEntityFromGallery(row)} className="group flex flex-col items-center rounded-2xl border border-slate-800 bg-slate-900/50 p-3 hover:border-amber-600/40 hover:bg-slate-800/50 transition-all text-center">
            <div className="w-full aspect-square rounded-xl overflow-hidden border border-slate-700 bg-slate-950 mb-2 shadow-inner">
              {row.ent.avatar.startsWith('local_image:') ? (
                <AsyncLocalImage filename={row.ent.avatar.replace('local_image:', '')} alt="" dirHandle={activeNovelDirHandle || dirHandle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <img src={row.ent.avatar} loading="lazy" alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMG; }} />
              )}
            </div>
            <span className="text-sm font-bold text-slate-200 font-serif truncate w-full">{safeString(row.ent.name)}</span>
            <span className="text-[10px] text-slate-500 truncate w-full mt-0.5">{safeString(row.sectionLabel)}</span>
          </button>
        ))}
      </div>
      {galleryHasMore && (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => setGalleryVisiblePage((p) => p + 1)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm text-slate-300 font-serif"
          >
            Xem thêm ({galleryPortraitEntries.length - visibleGalleryEntries.length} còn lại)
          </button>
        </div>
      )}
    </div>
  );
});
