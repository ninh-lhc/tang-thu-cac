import React, { memo, useMemo, useState } from 'react';
import { Hexagon, Network } from 'lucide-react';
import { DEFAULT_ENTITY_FIELDS, FALLBACK_IMG } from './MasterEngines.js';
import { AsyncLocalImage, processInline, safeString } from './MasterUtils.jsx';

const DISPLAY_LIMIT = 12;
const CORE_GROUPS = [
  { id: 'power', title: 'Trụ cột sức mạnh' },
  { id: 'identity', title: 'Định danh & hồ sơ' },
  { id: 'context', title: 'Bối cảnh & tổ chức' },
  { id: 'relation', title: 'Quan hệ chính' },
  { id: 'other', title: 'Thông tin khác' },
];

function normalizeLabel(label) {
  return safeString(label)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function resolveGroupByLabel(label) {
  const t = normalizeLabel(label);
  if (
    t.includes('canh gioi') ||
    t.includes('tu vi') ||
    t.includes('linh can') ||
    t.includes('thien phu') ||
    t.includes('the chat') ||
    t.includes('cong phap') ||
    t.includes('phap bao') ||
    t.includes('ky nang') ||
    t.includes('thuat') ||
    t.includes('pham')
  ) return 'power';
  if (
    t.includes('danh hieu') ||
    t.includes('danh xung') ||
    t.includes('ten goi') ||
    t.includes('ten khac') ||
    t.includes('tuoi') ||
    t.includes('chieu cao') ||
    t.includes('gioi tinh') ||
    t.includes('tieu su') ||
    t.includes('tom tat')
  ) return 'identity';
  if (
    t.includes('the luc') ||
    t.includes('tong mon') ||
    t.includes('to chuc') ||
    t.includes('tran doanh') ||
    t.includes('gia toc') ||
    t.includes('xuat than') ||
    t.includes('chuc vu') ||
    t.includes('vi tri')
  ) return 'context';
  if (
    t.includes('quan he') ||
    t.includes('phu than') ||
    t.includes('mau than') ||
    t.includes('huynh de') ||
    t.includes('ty muoi') ||
    t.includes('dao lu') ||
    t.includes('dong minh') ||
    t.includes('ke thu') ||
    t.includes('sư ton') ||
    t.includes('su ton')
  ) return 'relation';
  return 'other';
}

function rankWithinGroup(label, groupId) {
  const t = normalizeLabel(label);
  if (groupId === 'power') {
    if (t.includes('canh gioi') || t.includes('tu vi')) return 1;
    if (t.includes('linh can') || t.includes('thien phu')) return 2;
    if (t.includes('the chat')) return 3;
    if (t.includes('cong phap')) return 4;
    if (t.includes('phap bao') || t.includes('ban menh')) return 5;
    return 99;
  }
  if (groupId === 'identity') {
    if (t.includes('danh hieu') || t.includes('danh xung')) return 1;
    if (t.includes('tuoi')) return 2;
    if (t.includes('chieu cao')) return 3;
    if (t.includes('gioi tinh')) return 4;
    if (t.includes('tieu su') || t.includes('tom tat')) return 5;
    return 99;
  }
  if (groupId === 'context') {
    if (t.includes('the luc') || t.includes('tong mon') || t.includes('to chuc')) return 1;
    if (t.includes('chuc vu') || t.includes('tran doanh')) return 2;
    if (t.includes('vi tri')) return 3;
    return 99;
  }
  if (groupId === 'relation') {
    if (t.includes('quan he')) return 1;
    if (t.includes('dao lu')) return 2;
    if (t.includes('dong minh')) return 3;
    if (t.includes('ke thu')) return 4;
    return 99;
  }
  return 99;
}

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
  const [showOnlyFilled, setShowOnlyFilled] = useState(false);
  const memoizedFieldsGrid = useMemo(() => {
    if (!selectedEntity || collectionSubTab !== 'detail' || isEntityEditing) return null;
    const allCards = (currentTabConfig?.fieldsTemplate || DEFAULT_ENTITY_FIELDS).map((f) => {
      const val = safeString(getFieldValue(f.id, selectedEntity));
      const isLong = val.length > 50;
      const hasValue = !!val.trim();
      const groupId = resolveGroupByLabel(f.label || f.id);
      const orderInGroup = rankWithinGroup(f.label || f.id, groupId);
      return (
        <div key={f.id} data-group={groupId} data-has-value={hasValue ? '1' : '0'} data-order={orderInGroup} data-label={safeString(f.label || f.id)} className={`bg-slate-900/60 backdrop-blur-md border transition-all duration-300 group shadow-lg rounded-[40px] p-6
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
    const cardsForDisplay = showOnlyFilled
      ? allCards.filter((node) => node.props['data-has-value'] === '1')
      : allCards;
    const grouped = CORE_GROUPS.map((g) => ({ ...g, cards: [] }));
    cardsForDisplay.forEach((node) => {
      const gid = node.props['data-group'] || 'other';
      const bucket = grouped.find((x) => x.id === gid) || grouped[grouped.length - 1];
      bucket.cards.push(node);
    });
    grouped.forEach((g) => {
      g.cards.sort((a, b) => {
        const av = a.props['data-has-value'] === '1' ? 1 : 0;
        const bv = b.props['data-has-value'] === '1' ? 1 : 0;
        if (av !== bv) return bv - av; // có dữ liệu lên trước
        const ao = Number(a.props['data-order'] || 99);
        const bo = Number(b.props['data-order'] || 99);
        if (ao !== bo) return ao - bo;
        const al = normalizeLabel(a.props['data-label'] || '');
        const bl = normalizeLabel(b.props['data-label'] || '');
        return al.localeCompare(bl, 'vi');
      });
    });
    return grouped.filter((g) => g.cards.length > 0).map((g) => (
      <section key={g.id} className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{g.title}</span>
          <span className="h-px flex-1 bg-slate-800/80" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {g.cards}
        </div>
      </section>
    ));
  }, [selectedEntity, collectionSubTab, isEntityEditing, currentTabConfig?.fieldsTemplate, recentlyMergedFields, currentContextDirHandle, entityMap, globalLinkRegex, onNavigate, showOnlyFilled]);

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
          <button
            type="button"
            onClick={() => setShowOnlyFilled((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
              showOnlyFilled
                ? 'bg-amber-900/30 border-amber-700/50 text-amber-200'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {showOnlyFilled ? 'Đang: chỉ hiện có dữ liệu' : 'Hiện cả field trống'}
          </button>
        </div>
        <div className="space-y-6">{memoizedFieldsGrid}</div>
      </div>
      {memoizedRelatedEntities}
    </>
  );
});
