import React, { memo, useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { BookOpen, Link2, Save, Edit3, Eye } from 'lucide-react';
import { MarkdownToolbar } from './MasterComponents.jsx';
import { MarkdownPreviewPane } from './MarkdownPreviewPane.jsx';
import { safeString, mapGeminiErrorToUserMessage, truncateForAI, suggestWikiLinkSpotsWithAI } from './MasterUtils.jsx';
import { applyWikiLinkSpots } from './lib/applyWikiLinkSpots.js';
import { autoWrapWikiLinksByEntityMap } from './lib/autoWrapWikiLinks.js';
import {
  getEntityNotesFontStack,
  getEntityNotesPrefs,
  setEntityNotesPrefs,
  subscribeEntityNotesPrefs,
} from './lib/entityNotesPrefs.js';

const HIST_MAX = 120;

/** Phiên soạn một thẻ: `key={entityId}` để state/undo reset đúng khi đổi thẻ — không cần effect hydrate. */
const EntityNotesEditSession = memo(function EntityNotesEditSession({
  initialInfo,
  geminiApiKeys,
  aiMode,
  isExtractingAI,
  setIsExtractingAI,
  showToast,
  isSplitPreview,
  setLivePreviewText,
  setDebouncedMarkdownPreview,
  setIsSplitPreview,
  setImageForm,
  setIsInsertImageModalOpen,
  handlePickLocalImage,
  imageFileStemParts,
  handleUpdateEntityInfo,
  setIsEntityEditing,
  debouncedMarkdownPreview,
  currentContextDirHandle,
  entityMap,
  globalLinkRegex,
  onNavigate,
  selfEntityId,
}) {
  const s0 = safeString(initialInfo);
  const [notesEdit, setNotesEdit] = useState(() => ({
    text: s0,
    history: [s0],
    hIndex: 0,
  }));
  const notesTypo = useSyncExternalStore(subscribeEntityNotesPrefs, getEntityNotesPrefs, getEntityNotesPrefs);

  useEffect(() => {
    if (!isSplitPreview) return;
    setLivePreviewText(notesEdit.text);
  }, [notesEdit.text, isSplitPreview, setLivePreviewText]);

  const recordAndSetDraft = useCallback((next) => {
    setNotesEdit(({ text, history, hIndex }) => {
      if (history[hIndex] === next && text === next) {
        return { text, history, hIndex };
      }
      if (history[hIndex] === next) {
        return { text: next, history, hIndex };
      }
      const ns = history.slice(0, hIndex + 1);
      ns.push(next);
      let ni = ns.length - 1;
      if (ns.length > HIST_MAX) {
        ns.shift();
        ni--;
      }
      return { text: next, history: ns, hIndex: ni };
    });
  }, []);

  const undo = useCallback(() => {
    setNotesEdit((s) => {
      if (s.hIndex <= 0) return s;
      const ni = s.hIndex - 1;
      return { ...s, text: s.history[ni], hIndex: ni };
    });
  }, []);

  const redo = useCallback(() => {
    setNotesEdit((s) => {
      if (s.hIndex >= s.history.length - 1) return s;
      const ni = s.hIndex + 1;
      return { ...s, text: s.history[ni], hIndex: ni };
    });
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const ta = document.getElementById('entity-info-editor');
      if (!ta || document.activeElement !== ta) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [undo, redo]);

  useEffect(() => {
    const el = document.getElementById('entity-info-editor');
    if (el && typeof el.focus === 'function') el.focus();
  }, []);

  const onEditorContentChange = useCallback(
    (v) => {
      recordAndSetDraft(v);
    },
    [recordAndSetDraft]
  );

  const undoDisabled = notesEdit.hIndex <= 0;
  const redoDisabled = notesEdit.hIndex >= notesEdit.history.length - 1;
  const handlePickScopedLocalImage = useCallback(
    (setAvatarCallback, editorId = null) => {
      const fileNameOptions =
        Array.isArray(imageFileStemParts) && imageFileStemParts.some((part) => String(part || '').trim())
          ? { filePrefix: 'img', fileStemParts: imageFileStemParts }
          : 'img';
      return handlePickLocalImage(setAvatarCallback, editorId, fileNameOptions);
    },
    [handlePickLocalImage, imageFileStemParts]
  );

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap justify-end mb-2 w-full">
        <button
          disabled={isExtractingAI}
          onClick={async () => {
            if (geminiApiKeys.length === 0) {
              showToast('Vui lòng thiết lập API Key để dùng AI.');
              return;
            }
            const text = notesEdit.text;
            if (!text.trim()) return;
            const { wasTruncated } = truncateForAI(text);
            if (wasTruncated) showToast('Đoạn quá dài — chỉ gửi ~12.000 ký tự đầu cho AI.', 'warning');
            setIsExtractingAI(true);
            try {
              const res = await suggestWikiLinkSpotsWithAI(text, geminiApiKeys, aiMode);
              const spots = Array.isArray(res?.linkSpots) ? res.linkSpots : [];
              const next = applyWikiLinkSpots(text, spots);
              if (next !== text) {
                recordAndSetDraft(next);
                if (isSplitPreview) {
                  setLivePreviewText(next);
                  setDebouncedMarkdownPreview(next);
                }
                showToast('Đã thêm [[liên kết]] — giữ nguyên chữ và định dạng bạn nhập.');
              } else if (spots.length > 0) {
                showToast('AI gợi ý link nhưng không khớp văn bản — thử lại hoặc chỉnh ngắn đoạn.', 'warning');
              } else {
                showToast('Không có chỗ mới cần bọc link (hoặc đã có [[...]]).');
              }
            } catch (e) {
              showToast(mapGeminiErrorToUserMessage(e), 'error');
            }
            setIsExtractingAI(false);
          }}
          className="px-4 py-2.5 rounded-[40px] text-xs font-bold transition-all shadow-md flex items-center gap-2 bg-indigo-700 hover:bg-indigo-600 text-white disabled:opacity-50"
          title="AI chỉ thêm [[liên kết]] — không đổi chữ hay định dạng bạn đã nhập"
        >
          {isExtractingAI ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Link2 size={14} />
          )}
          {isExtractingAI ? 'Đang xử lý...' : 'AI Tạo Link'}
        </button>
        <button
          id="save-entity-btn"
          type="button"
          onClick={() => {
            const next = autoWrapWikiLinksByEntityMap(notesEdit.text, entityMap);
            handleUpdateEntityInfo(next);
            setIsSplitPreview(false);
            setIsEntityEditing(false);
          }}
          className="px-5 py-2.5 rounded-[40px] text-xs font-bold transition-all shadow-md flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
        >
          <Save size={16} /> Lưu ghi chép
        </button>
      </div>

      <div className="flex flex-col flex-1 animate-fade-in min-h-[400px]">
        <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
          <MarkdownToolbar
            editorId="entity-info-editor"
            variant="entityNotes"
            onInsertImage={(eid) => {
              setImageForm({ url: '', alt: '', editorId: eid });
              setIsInsertImageModalOpen(true);
            }}
            onPickLocalImage={handlePickScopedLocalImage}
            onUndo={undo}
            onRedo={redo}
            undoDisabled={undoDisabled}
            redoDisabled={redoDisabled}
            onEditorContentChange={onEditorContentChange}
            notesFontKey={notesTypo.fontKey}
            notesFontSizePx={notesTypo.sizePx}
            onNotesFontKey={(k) => setEntityNotesPrefs({ fontKey: k })}
            onNotesFontSizePx={(n) => setEntityNotesPrefs({ sizePx: n })}
          />
          <button
            type="button"
            onClick={() => {
              setLivePreviewText(notesEdit.text);
              setDebouncedMarkdownPreview(notesEdit.text);
              setIsSplitPreview((p) => !p);
            }}
            className={`ml-auto px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0 transition-colors flex items-center gap-1.5 ${
              isSplitPreview
                ? 'bg-amber-700/30 text-amber-400 border border-amber-700/40'
                : 'bg-slate-800 text-slate-500 border border-slate-700 hover:text-slate-300'
            }`}
          >
            <Eye size={12} /> Preview
          </button>
        </div>
        <div className={`flex flex-1 gap-4 min-h-[300px] ${isSplitPreview ? 'flex-row' : 'flex-col'}`}>
          <textarea
            id="entity-info-editor"
            value={notesEdit.text}
            onChange={(e) => recordAndSetDraft(e.target.value)}
            className={`bg-transparent text-slate-200 leading-loose outline-none resize-none custom-scrollbar ${
              isSplitPreview ? 'w-1/2 flex-shrink-0' : 'flex-1 min-h-[300px]'
            }`}
            style={{
              fontFamily: getEntityNotesFontStack(notesTypo.fontKey),
              fontSize: `${notesTypo.sizePx}px`,
            }}
            placeholder="Hạ bút khắc ấn..."
            spellCheck
          />
          {isSplitPreview && (
            <MarkdownPreviewPane
              text={debouncedMarkdownPreview}
              dirHandle={currentContextDirHandle}
              entityMap={entityMap}
              linkRegex={globalLinkRegex}
              onNavigate={onNavigate}
              selfEntityId={selfEntityId}
              className="w-1/2 overflow-y-auto custom-scrollbar border-l border-slate-700 pl-4 font-serif min-h-[300px]"
            />
          )}
        </div>
      </div>
    </>
  );
});

export const AppEntityDetailNotes = memo(function AppEntityDetailNotes({
  activeTabLon,
  getTerms,
  isEntityEditing,
  isExtractingAI,
  setIsExtractingAI,
  geminiApiKeys,
  showToast,
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
  imageFileStemParts,
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
          <div className="p-2 bg-amber-900/20 text-amber-500 rounded-lg border border-amber-700/30">
            <BookOpen size={18} />
          </div>
          <div>
            <h3 className="text-xl font-heading font-bold text-amber-100">Ghi Chép Chi Tiết</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
              {getTerms(activeTabLon).infoDesc}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {!isEntityEditing && (
            <button
              id="save-entity-btn"
              type="button"
              onClick={() => {
                const s = safeString(selectedEntity?.info || '');
                setLivePreviewText(s);
                setDebouncedMarkdownPreview(s);
                setIsEntityEditing(true);
              }}
              className="px-5 py-2.5 rounded-[40px] text-xs font-bold transition-all shadow-md flex items-center gap-2 bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
            >
              <Edit3 size={16} /> Viết ghi chép
            </button>
          )}
        </div>
      </div>

      <div
        className={`flex flex-col transition-all duration-300 backdrop-blur-md ${
          isEntityEditing
            ? 'bg-slate-900 border border-amber-700/50 shadow-[0_0_15px_rgba(217,119,6,0.1)] p-6 rounded-[40px]'
            : 'bg-slate-900/30 border border-slate-800/60 p-8 rounded-[40px]'
        }`}
      >
        {isEntityEditing && selectedEntity ? (
          <EntityNotesEditSession
            key={selectedEntity.id}
            initialInfo={selectedEntity.info}
            geminiApiKeys={geminiApiKeys}
            aiMode={aiMode}
            isExtractingAI={isExtractingAI}
            setIsExtractingAI={setIsExtractingAI}
            showToast={showToast}
            isSplitPreview={isSplitPreview}
            setLivePreviewText={setLivePreviewText}
            setDebouncedMarkdownPreview={setDebouncedMarkdownPreview}
            setIsSplitPreview={setIsSplitPreview}
            setImageForm={setImageForm}
            setIsInsertImageModalOpen={setIsInsertImageModalOpen}
            handlePickLocalImage={handlePickLocalImage}
            imageFileStemParts={imageFileStemParts}
            handleUpdateEntityInfo={handleUpdateEntityInfo}
            setIsEntityEditing={setIsEntityEditing}
            debouncedMarkdownPreview={debouncedMarkdownPreview}
            currentContextDirHandle={currentContextDirHandle}
            entityMap={entityMap}
            globalLinkRegex={globalLinkRegex}
            onNavigate={onNavigate}
            selfEntityId={selectedEntity.id}
          />
        ) : (
          <div className="font-serif prose prose-invert max-w-none animate-fade-in min-h-[200px]">
            {memoizedEntityInfo && <>{memoizedEntityInfo}</>}
          </div>
        )}
      </div>
    </div>
  );
});
