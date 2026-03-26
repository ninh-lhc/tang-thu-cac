import React, { memo } from 'react';
import { Images, Plus, Trash2 } from 'lucide-react';
import { AsyncLocalImage, safeString } from './MasterUtils.jsx';
import { FALLBACK_IMG } from './MasterEngines.js';

export const AppGalleryContent = memo(function AppGalleryContent({
  collectionSubTab,
  selectedEntity,
  onBackToList,
  onAddEntityImage,
  onRemoveEntityImage,
  onOpenEntityImage,
  currentContextDirHandle,
}) {
  const GALLERY_PAGE_SIZE = 12;
  const [galleryPage, setGalleryPage] = React.useState(1);
  const entityImages = Array.isArray(selectedEntity?.images) ? selectedEntity.images : [];

  React.useEffect(() => {
    setGalleryPage(1);
  }, [selectedEntity?.id, collectionSubTab]);

  if (collectionSubTab !== 'gallery') return null;

  const totalPages = Math.max(1, Math.ceil(entityImages.length / GALLERY_PAGE_SIZE));
  const safePage = Math.min(galleryPage, totalPages);
  const pageStart = (safePage - 1) * GALLERY_PAGE_SIZE;
  const pageItems = entityImages.slice(pageStart, pageStart + GALLERY_PAGE_SIZE);

  if (!selectedEntity) {
    return (
      <div className="animate-fade-in pb-8">
        <div className="flex flex-col items-center justify-center py-16 text-slate-600">
          <Images size={48} className="mb-4 opacity-30" />
          <p className="font-serif italic text-center px-4 mb-4">Vui lòng chọn một thẻ trong Danh Sách để xem BST ảnh.</p>
          <button
            type="button"
            onClick={onBackToList}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm text-slate-300 font-serif"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12px] text-slate-400 font-serif">
          BST ảnh của <span className="text-amber-300 font-bold">{safeString(selectedEntity.name)}</span> · {entityImages.length} ảnh
        </span>
        <button
          type="button"
          onClick={onAddEntityImage}
          className="px-3 py-1.5 rounded-lg text-[11px] font-bold border bg-emerald-900/30 border-emerald-700/50 text-emerald-200 hover:bg-emerald-800/40 transition-colors inline-flex items-center gap-1.5"
        >
          <Plus size={13} /> Thêm ảnh
        </button>
      </div>
      {entityImages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-600 border border-dashed border-slate-700 rounded-2xl">
          <Images size={44} className="mb-3 opacity-30" />
          <p className="font-serif italic">Thẻ này chưa có ảnh trong BST.</p>
          <button
            type="button"
            onClick={onAddEntityImage}
            className="mt-4 px-4 py-2 bg-emerald-900/30 hover:bg-emerald-800/40 border border-emerald-700/50 rounded-xl text-sm text-emerald-200 font-serif inline-flex items-center gap-1.5"
          >
            <Plus size={14} /> Thêm ảnh đầu tiên
          </button>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {pageItems.map((img, idx) => {
            const realIdx = pageStart + idx;
            return (
            <div key={`${selectedEntity.id}-${idx}`} className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-3 hover:border-amber-600/40 hover:bg-slate-800/50 transition-all">
              <button
                type="button"
                onClick={() => onOpenEntityImage(img)}
                className="w-full aspect-square rounded-xl overflow-hidden border border-slate-700 bg-slate-950 mb-2 shadow-inner block"
                title="Xem ảnh đầy đủ"
              >
                {safeString(img).startsWith('local_image:') ? (
                  <AsyncLocalImage filename={safeString(img).replace('local_image:', '')} alt="" dirHandle={currentContextDirHandle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <img src={img} loading="lazy" alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMG; }} />
                )}
              </button>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500 font-serif truncate">Ảnh #{realIdx + 1}</span>
                <button
                  type="button"
                  onClick={() => onRemoveEntityImage(realIdx)}
                  className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-900/30 transition-colors"
                  title="Xóa ảnh khỏi BST"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
          })}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setGalleryPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors"
            >
              ← Trước
            </button>
            <span className="text-xs text-slate-500 font-serif px-2">
              Trang {safePage}/{totalPages}
            </span>
            <button
              type="button"
              onClick={() => setGalleryPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors"
            >
              Sau →
            </button>
          </div>
        )}
        </>
      )}
    </div>
  );
});
