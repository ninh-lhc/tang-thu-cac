import React, { memo } from 'react';
import { Images } from 'lucide-react';

export const AppCollectionTrackTabs = memo(function AppCollectionTrackTabs({
  collectionSubTab,
  setCollectionSubTab,
  galleryCount,
  selectedEntityName,
  selectedEntityMilestoneCount,
}) {
  return (
    <div className="flex flex-wrap gap-6 border-b border-slate-800/80 mb-6 pb-3 items-end">
      <button type="button" onClick={() => setCollectionSubTab('list')} className={`text-sm font-bold uppercase tracking-widest pb-3 -mb-[13px] transition-colors ${collectionSubTab === 'list' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>Danh Sách</button>
      <button type="button" onClick={() => setCollectionSubTab('gallery')} className={`text-sm font-bold uppercase tracking-widest pb-3 -mb-[13px] transition-colors flex items-center gap-2 ${collectionSubTab === 'gallery' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>
        <Images size={14} className="opacity-70" /> Ảnh
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${collectionSubTab === 'gallery' ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-300'}`}>{galleryCount}</span>
      </button>
      <button type="button" onClick={() => setCollectionSubTab('detail')} className={`text-sm font-bold uppercase tracking-widest pb-3 -mb-[13px] transition-colors ${collectionSubTab === 'detail' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>
        Hồ Sơ {selectedEntityName ? `(${selectedEntityName})` : ''}
      </button>
      <button type="button" onClick={() => setCollectionSubTab('timeline')} className={`text-sm font-bold uppercase tracking-widest pb-3 -mb-[13px] transition-colors flex items-center gap-2 ${collectionSubTab === 'timeline' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>
        Dòng Thời Gian
        {selectedEntityMilestoneCount > 0 && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${collectionSubTab === 'timeline' ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-300'}`}>{selectedEntityMilestoneCount}</span>
        )}
      </button>
    </div>
  );
});
