import React, { memo } from 'react';
import { BookOpen, Sparkles, Link2, Save, Edit3, Eye } from 'lucide-react';
import { MarkdownToolbar } from './MasterComponents.jsx';
import { MarkdownPreviewPane } from './MarkdownPreviewPane.jsx';
import { safeString, mapGeminiErrorToUserMessage, truncateForAI, extractEntityAttributesWithAI, analyzeTextWithAI } from './MasterUtils.jsx';

export const AppEntityDetailNotes = memo(function AppEntityDetailNotes({
  activeTabLon,
  getTerms,
  isEntityEditing,
  isExtractingAI,
  setIsExtractingAI,
  geminiApiKeys,
  showToast,
  currentTabConfig,
  handleAIExtractSuccess,
  aiMode,
  isSplitPreview,
  setLivePreviewText,
  setDebouncedMarkdownPreview,
  setIsSplitPreview,
  selectedEntity,
  handleUpdateEntityInfo,
  setIsEntityEditing,
  setImageForm,
  setIsInsertImageModalOpen,
  handlePickLocalImage,
  debouncedMarkdownPreview,
  currentContextDirHandle,
  entityMap,
  globalLinkRegex,
  onNavigate,
  memoizedEntityInfo,
}) {
  return (
    <div className="flex flex-col mt-4">
      <div className="flex justify-between items-end mb-6 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-900/20 text-amber-500 rounded-lg border border-amber-700/30"><BookOpen size={18}/></div>
          <div>
            <h3 className="text-xl font-heading font-bold text-amber-100">Ghi Chép Chi Tiết</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{getTerms(activeTabLon).infoDesc}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isEntityEditing && (
            <>
              <button
                disabled={isExtractingAI}
                onClick={async () => {
                  if (geminiApiKeys.length === 0) { showToast('Vui lòng thiết lập API Key (trong Cài Đặt) để dùng tính năng AI.'); return; }
                  const text = document.getElementById('entity-info-editor').value;
                  if (!text.trim()) return;
                  const { wasTruncated } = truncateForAI(text);
                  if (wasTruncated) showToast('Đoạn quá dài — chỉ gửi ~12.000 ký tự đầu cho AI.', 'warning');
                  setIsExtractingAI(true);
                  try {
                    const res = await extractEntityAttributesWithAI(text, currentTabConfig?.fieldsTemplate || [], geminiApiKeys);
                    if (res) handleAIExtractSuccess(res.existingData, res.newFields);
                  } catch (e) { showToast(mapGeminiErrorToUserMessage(e), 'error'); }
                  setIsExtractingAI(false);
                }}
                className="px-4 py-2.5 rounded-[40px] text-xs font-bold transition-all shadow-md flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-slate-900 disabled:opacity-50"
              >
                {isExtractingAI ? <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> : <Sparkles size={16}/>}
                {isExtractingAI ? 'Đang trích xuất...' : 'AI Lọc Thuộc Tính'}
              </button>
              <button
                disabled={isExtractingAI}
                onClick={async () => {
                  if (geminiApiKeys.length === 0) { showToast('Vui lòng thiết lập API Key để dùng AI.'); return; }
                  const ta = document.getElementById('entity-info-editor');
                  const text = ta?.value;
                  if (!text?.trim()) return;
                  const { wasTruncated } = truncateForAI(text);
                  if (wasTruncated) showToast('Đoạn quá dài — chỉ gửi ~12.000 ký tự đầu cho AI.', 'warning');
                  setIsExtractingAI(true);
                  try {
                    const res = await analyzeTextWithAI(text, currentTabConfig?.fieldsTemplate || [], geminiApiKeys, aiMode);
                    if (res?.processedText) {
                      ta.value = res.processedText;
                      if (isSplitPreview) {
                        setLivePreviewText(res.processedText);
                        setDebouncedMarkdownPreview(res.processedText);
                      }
                      showToast('AI đã tạo liên kết cho các tên riêng!');
                    }
                  } catch (e) { showToast(mapGeminiErrorToUserMessage(e), 'error'); }
                  setIsExtractingAI(false);
                }}
                className="px-4 py-2.5 rounded-[40px] text-xs font-bold transition-all shadow-md flex items-center gap-2 bg-indigo-700 hover:bg-indigo-600 text-white disabled:opacity-50"
                title="AI tự động bọc tên người, thế lực, công pháp... vào [[liên kết]]"
              >
                {isExtractingAI ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Link2 size={14}/>}
                {isExtractingAI ? 'Đang xử lý...' : 'AI Tạo Link'}
              </button>
            </>
          )}
          <button id="save-entity-btn" onClick={() => { if (isEntityEditing) { handleUpdateEntityInfo(document.getElementById('entity-info-editor').value); setIsSplitPreview(false); } else { const s = safeString(selectedEntity?.info || ''); setLivePreviewText(s); setDebouncedMarkdownPreview(s); } setIsEntityEditing(!isEntityEditing); }} className={`px-5 py-2.5 rounded-[40px] text-xs font-bold transition-all shadow-md flex items-center gap-2 ${isEntityEditing ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'}`}>
            {isEntityEditing ? <><Save size={16}/> Lưu (Ctrl+S)</> : <><Edit3 size={16}/> Viết Ghi Chép</>}
          </button>
        </div>
      </div>

      <div className={`flex flex-col transition-all duration-300 backdrop-blur-md ${isEntityEditing ? 'bg-slate-900 border border-amber-700/50 shadow-[0_0_15px_rgba(217,119,6,0.1)] p-6 rounded-[40px]' : 'bg-slate-900/30 border border-slate-800/60 p-8 rounded-[40px]'}`}>
        {isEntityEditing ? (
          <div className="flex flex-col flex-1 animate-fade-in min-h-[400px]">
            <div className="flex items-center justify-between mb-1">
              <MarkdownToolbar editorId="entity-info-editor" onInsertImage={(eid) => { setImageForm({ url: '', alt: '', editorId: eid }); setIsInsertImageModalOpen(true); }} onPickLocalImage={handlePickLocalImage} />
              <button onClick={() => { const cur = document.getElementById('entity-info-editor')?.value; if (cur !== undefined) { setLivePreviewText(cur); setDebouncedMarkdownPreview(cur); } setIsSplitPreview((p) => !p); }} className={`ml-2 px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0 transition-colors flex items-center gap-1.5 ${isSplitPreview ? 'bg-amber-700/30 text-amber-400 border border-amber-700/40' : 'bg-slate-800 text-slate-500 border border-slate-700 hover:text-slate-300'}`}>
                <Eye size={12}/> Preview
              </button>
            </div>
            <div className={`flex flex-1 gap-4 min-h-[300px] ${isSplitPreview ? 'flex-row' : 'flex-col'}`}>
              <textarea id="entity-info-editor" className={`bg-transparent text-slate-200 font-serif text-lg leading-loose outline-none resize-none custom-scrollbar ${isSplitPreview ? 'w-1/2 flex-shrink-0' : 'flex-1 min-h-[300px]'}`} defaultValue={safeString(selectedEntity.info)} placeholder="Hạ bút khắc ấn..." onChange={(e) => { if (isSplitPreview) setLivePreviewText(e.target.value); }} onPaste={() => { if (isSplitPreview) { setTimeout(() => { const v = document.getElementById('entity-info-editor')?.value; if (v !== undefined) setLivePreviewText(v); }, 0); } }} />
              {isSplitPreview && (
                <MarkdownPreviewPane
                  text={debouncedMarkdownPreview}
                  dirHandle={currentContextDirHandle}
                  entityMap={entityMap}
                  linkRegex={globalLinkRegex}
                  onNavigate={onNavigate}
                  className="w-1/2 overflow-y-auto custom-scrollbar border-l border-slate-700 pl-4 font-serif min-h-[300px]"
                />
              )}
            </div>
          </div>
        ) : (
          <div className="font-serif prose prose-invert max-w-none animate-fade-in min-h-[200px]">
            {memoizedEntityInfo && <>{memoizedEntityInfo}</>}
          </div>
        )}
      </div>
    </div>
  );
});
