import React, { memo, useMemo } from 'react';
import { Hexagon, Network } from 'lucide-react';
import { DEFAULT_ENTITY_FIELDS, FALLBACK_IMG } from './MasterEngines.js';
import { AsyncLocalImage, processInline, safeString } from './MasterUtils.jsx';

const DISPLAY_LIMIT = 12;

function getFieldValue(fieldId, ent) {
  if (!ent) return '';
  if (ent.dynamicData && ent.dynamicData[fieldId]) return ent.dynamicData[fieldId];
  if (fieldId === 'f_status') return ent.status;
  if (fieldId === 'f_title') return ent.title;
  if (fieldId === 'f_desc') return ent.description;
  return '';
}

export const AppEntitySummaryBlocks = memo(function AppEntitySummaryBlocks({
  selectedEntity,
  collectionSubTab,
  isEntityEditing,
  currentTabConfig,
  recentlyMergedFields,
  currentContextDirHandle,
  entityMap,
  globalLinkRegex,
  relatedEntities,
  isCalculatingNetwork,
  expandedRelations,
  setExpandedRelations,
  onNavigate,
}) {
  const memoizedFieldsGrid = useMemo(() => {
    if (!selectedEntity || collectionSubTab !== 'detail' || isEntityEditing) return null;
    return (currentTabConfig?.fieldsTemplate || DEFAULT_ENTITY_FIELDS).map((f) => {
      const val = safeString(getFieldValue(f.id, selectedEntity));
      const isLong = val.length > 50;
      return (
        <div key={f.id} className={`bg-slate-900/60 backdrop-blur-md border transition-all duration-300 group shadow-lg rounded-[40px] p-6
          ${recentlyMergedFields.has(f.id)
            ? 'border-emerald-600/50 bg-emerald-900/10 hover:border-emerald-500/60'
            : 'border-slate-700/50 hover:bg-slate-800/80 hover:border-amber-500/40'}
          ${isLong ? 'col-span-1 md:col-span-2 lg:col-span-3' : ''}`}>
          <div className="flex items-center gap-2 mb-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${recentlyMergedFields.has(f.id) ? 'bg-emerald-400' : 'bg-slate-500 group-hover:bg-amber-400'}`}></div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{safeString(f.label)}</span>
          </div>
          {recentlyMergedFields.has(f.id) && (
            <div className="inline-flex items-center px-2.5 py-1 rounded-full border border-emerald-700/50 bg-emerald-950/40 mb-2">
              <span className="text-[10px] font-serif italic text-emerald-400">● Vừa cập nhật từ dòng thời gian</span>
            </div>
          )}
          <div className="pl-3 border-l border-slate-700 group-hover:border-amber-500/50 transition-colors mt-2">
            {!val
              ? <span className="text-slate-600 italic font-normal text-sm">Chưa có ghi chép</span>
              : <div className="font-serif text-[15px] leading-relaxed text-slate-300 mt-1.5 inline-block">
                  {processInline(val, currentContextDirHandle, entityMap, globalLinkRegex, onNavigate)}
                </div>
            }
          </div>
        </div>
      );
    });
  }, [selectedEntity, collectionSubTab, isEntityEditing, currentTabConfig?.fieldsTemplate, recentlyMergedFields, currentContextDirHandle, entityMap, globalLinkRegex, onNavigate]);

  const memoizedRelatedEntities = useMemo(() => {
    if (relatedEntities.length === 0 && !isCalculatingNetwork) return null;
    const shown = expandedRelations ? relatedEntities : relatedEntities.slice(0, DISPLAY_LIMIT);
    const hidden = relatedEntities.length - DISPLAY_LIMIT;
    return (
      <div className="mb-10 animate-fade-in relative">
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-900/20 text-indigo-400 rounded-lg border border-indigo-700/30"><Network size={18} /></div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-heading font-bold text-indigo-100">Mạng Lưới Nhân Quả</h3>
                {isCalculatingNetwork && <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>}
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
                {isCalculatingNetwork ? 'Thần thức đang dò xét...' : `Có ${relatedEntities.length} thực thể liên kết với ${safeString(selectedEntity?.name)}`}
              </p>
            </div>
          </div>
        </div>
        {!isCalculatingNetwork && (
          <div className="flex flex-wrap gap-4">
            {shown.map((rel) => (
              <button key={`${rel.lonId}|${rel.nhoId}|${rel.entity.id}`} onClick={() => onNavigate({ lonId: rel.lonId, nhoId: rel.nhoId, entityId: rel.entity.id })} className="flex items-center gap-4 bg-slate-900/80 backdrop-blur-md border border-slate-700 hover:border-indigo-500/60 p-3 rounded-[24px] transition-all duration-300 shadow-md hover:shadow-[0_5px_20px_rgba(99,102,241,0.15)] hover:-translate-y-0.5 group w-full md:w-auto md:min-w-[280px]">
                <div className="w-12 h-12 rounded-[16px] bg-slate-950 overflow-hidden flex-shrink-0 border border-slate-800 group-hover:border-indigo-400/50 transition-colors relative">
                  {rel.entity.avatar ? (
                    rel.entity.avatar.startsWith('local_image:') ? (
                      <AsyncLocalImage filename={rel.entity.avatar.replace('local_image:', '')} alt="avatar" dirHandle={currentContextDirHandle} className="w-full h-full object-cover" />
                    ) : <img src={rel.entity.avatar} className="w-full h-full object-cover" alt="" onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMG; }} />
                  ) : <span className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-lg">{safeString(rel.entity.name).charAt(0)}</span>}
                  <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <div className="text-left pr-4">
                  <div className="text-base font-bold text-slate-200 group-hover:text-indigo-300 font-serif transition-colors">{safeString(rel.entity.name)}</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                    <span className="text-indigo-500/70">{safeString(rel.tabLabel)}</span>
                    <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                    <span>{safeString(rel.context)}</span>
                  </div>
                </div>
              </button>
            ))}
            {!expandedRelations && hidden > 0 && (
              <button onClick={() => setExpandedRelations(true)} className="flex items-center justify-center bg-slate-950/50 border border-dashed border-indigo-700/50 hover:border-indigo-400/80 p-3 rounded-[24px] transition-all duration-300 hover:bg-indigo-900/20 text-indigo-400/70 hover:text-indigo-300 text-sm font-serif group w-full md:w-auto md:px-8">
                <span className="flex items-center gap-2"><Network size={16} className="group-hover:scale-110 transition-transform" /> + {hidden} liên kết khác đang bị ẩn...</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }, [relatedEntities, isCalculatingNetwork, expandedRelations, selectedEntity?.name, currentContextDirHandle, onNavigate, setExpandedRelations]);

  if (!selectedEntity || collectionSubTab !== 'detail') return null;

  return (
    <>
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-900/20 text-amber-500 rounded-lg border border-amber-700/30"><Hexagon size={18} /></div>
            <h3 className="text-xl font-heading font-bold text-amber-100">Nền Tảng Căn Cơ</h3>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {memoizedFieldsGrid}
        </div>
      </div>
      {memoizedRelatedEntities}
    </>
  );
});
