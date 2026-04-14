import React, { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { BookOpen, Link2, Save, Edit3, Eye, ScrollText, RefreshCw, AlertTriangle, Sparkles, Wand2, Lock } from 'lucide-react';
import { MarkdownToolbar } from './MasterComponents.jsx';
import { MarkdownPreviewPane } from './MarkdownPreviewPane.jsx';
import {
  safeString,
  callGeminiAPIText,
  getEntityNotesToolbarState,
  mapGeminiErrorToUserMessage,
  truncateForAI,
  suggestWikiLinkSpotsWithAI,
  resolveEntityNotesLineBreak,
  resolveEntityNotesBackspace,
  resolveEntityNotesTabIndent,
} from './MasterUtils.jsx';
import { applyWikiLinkSpots } from './lib/applyWikiLinkSpots.js';
import { autoWrapWikiLinksByEntityMap, autoWrapWikiLinksByEntityMapWithCount } from './lib/autoWrapWikiLinks.js';
import { cleanupEntityNotesText } from './lib/entityNotesTextCleanup.js';
import {
  applyEntityNotesDiagnosticFix,
  collectEntityNotesDiagnostics,
  fixAllEntityNotesDiagnostics,
} from './lib/entityNotesDiagnostics.js';
import { syncEntityNotesDuplicateWordFormatting } from './lib/entityNotesDuplicateWordFormatting.js';
import {
  getEntityNotesFontStack,
  getEntityNotesPrefs,
  setEntityNotesPrefs,
  subscribeEntityNotesPrefs,
} from './lib/entityNotesPrefs.js';
import { resolveEntityNotesTemplateProfile } from './lib/entityNotesSemantics.js';
import { getEffectiveAutoSyncRole, getAutoSyncRoleLabel } from './lib/tabAutoSyncRole.js';
import {
  getAutoSyncEngineDescription,
  getAutoSyncEngineLabel,
  getAutoSyncEnginesForRole,
  isEntityAutoSyncDisabled,
  isEntityAutoSyncLocked,
} from './lib/autoSyncEntityPrefs.js';

const HIST_MAX = 120;

/** Phiên soạn một thẻ: `key={entityId}` để state/undo reset đúng khi đổi thẻ — không cần effect hydrate. */
const EntityNotesEditSession = memo(function EntityNotesEditSession({
  activeTabLon,
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
  entityNotesSubject,
  entityTemplateHint,
  onOpenAutoSyncGuide,
  onOpenEntityNotesGuide,
}) {
  const s0 = safeString(initialInfo);
  const [notesEdit, setNotesEdit] = useState(() => ({
    text: s0,
    history: [s0],
    hIndex: 0,
  }));
  const [isFormattingStructure, setIsFormattingStructure] = useState(false);
  const notesTypo = useSyncExternalStore(subscribeEntityNotesPrefs, getEntityNotesPrefs, getEntityNotesPrefs);
  const textareaRef = useRef(null);
  const previewScrollRef = useRef(null);
  const scrollSyncLockRef = useRef(false);
  const [toolbarState, setToolbarState] = useState(() => getEntityNotesToolbarState(s0, 0, 0));
  const templateProfile = useMemo(
    () =>
      resolveEntityNotesTemplateProfile({
        tabLabel: entityTemplateHint,
        activeTabLon,
        entityName: entityNotesSubject,
      }),
    [activeTabLon, entityNotesSubject, entityTemplateHint]
  );

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
    const el = textareaRef.current || document.getElementById('entity-info-editor');
    if (el && typeof el.focus === 'function') el.focus();
  }, []);

  const syncToolbarStateFromEditor = useCallback(() => {
    const textarea = textareaRef.current || document.getElementById('entity-info-editor');
    if (!textarea) return;
    setToolbarState(
      getEntityNotesToolbarState(textarea.value, textarea.selectionStart, textarea.selectionEnd)
    );
  }, []);

  useEffect(() => {
    syncToolbarStateFromEditor();
  }, [notesEdit.text, syncToolbarStateFromEditor]);

  useEffect(() => {
    const onSelectionChange = () => {
      if (document.activeElement !== (textareaRef.current || document.getElementById('entity-info-editor'))) return;
      syncToolbarStateFromEditor();
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [syncToolbarStateFromEditor]);

  const resolveLineStartFromLineNumber = useCallback((lineNumber) => {
    const text = safeString(textareaRef.current?.value ?? notesEdit.text);
    if (!Number.isFinite(lineNumber) || lineNumber <= 1) return 0;
    let cursor = 0;
    let line = 1;
    while (line < lineNumber && cursor < text.length) {
      const nextBreak = text.indexOf('\n', cursor);
      if (nextBreak === -1) return text.length;
      cursor = nextBreak + 1;
      line += 1;
    }
    return cursor;
  }, [notesEdit.text]);

  const focusEditorRange = useCallback((selStart, selEnd = selStart) => {
    const textarea = textareaRef.current || document.getElementById('entity-info-editor');
    if (!textarea) return;
    const start = Math.max(0, Math.min(selStart, textarea.value.length));
    const end = Math.max(start, Math.min(selEnd, textarea.value.length));
    textarea.focus();
    textarea.setSelectionRange(start, end);
    const before = textarea.value.slice(0, start);
    const lineIndex = Math.max(0, before.split('\n').length - 1);
    const totalLines = Math.max(1, textarea.value.split('\n').length - 1);
    const maxScroll = Math.max(0, textarea.scrollHeight - textarea.clientHeight);
    textarea.scrollTop = totalLines > 0 ? (lineIndex / totalLines) * maxScroll : 0;
    syncToolbarStateFromEditor();
  }, [syncToolbarStateFromEditor]);

  const jumpToEditorLine = useCallback((lineNumber) => {
    const start = resolveLineStartFromLineNumber(lineNumber);
    const text = safeString(textareaRef.current?.value ?? notesEdit.text);
    const nextBreak = text.indexOf('\n', start);
    const end = nextBreak === -1 ? text.length : nextBreak;
    focusEditorRange(start, end);
  }, [focusEditorRange, notesEdit.text, resolveLineStartFromLineNumber]);

  const syncScrollRatio = useCallback((source, target) => {
    if (!source || !target) return;
    const sourceMax = Math.max(1, source.scrollHeight - source.clientHeight);
    const targetMax = Math.max(0, target.scrollHeight - target.clientHeight);
    target.scrollTop = (source.scrollTop / sourceMax) * targetMax;
  }, []);

  const handleEditorScroll = useCallback((event) => {
    if (!isSplitPreview || scrollSyncLockRef.current) return;
    const previewEl = previewScrollRef.current;
    if (!previewEl) return;
    scrollSyncLockRef.current = true;
    syncScrollRatio(event.currentTarget, previewEl);
    requestAnimationFrame(() => {
      scrollSyncLockRef.current = false;
    });
  }, [isSplitPreview, syncScrollRatio]);

  const handlePreviewScroll = useCallback((event) => {
    if (!isSplitPreview || scrollSyncLockRef.current) return;
    const textarea = textareaRef.current;
    if (!textarea) return;
    scrollSyncLockRef.current = true;
    syncScrollRatio(event.currentTarget, textarea);
    requestAnimationFrame(() => {
      scrollSyncLockRef.current = false;
    });
  }, [isSplitPreview, syncScrollRatio]);

  const onEditorContentChange = useCallback(
    (v) => {
      recordAndSetDraft(v);
    },
    [recordAndSetDraft]
  );
  const syncDraftAndPreview = useCallback(
    (next) => {
      recordAndSetDraft(next);
      if (isSplitPreview) {
        setLivePreviewText(next);
        setDebouncedMarkdownPreview(next);
      }
    },
    [isSplitPreview, recordAndSetDraft, setDebouncedMarkdownPreview, setLivePreviewText]
  );
  const normalizeNotesDraft = useCallback(
    (sourceText, { announceIfChanged = false, announceIfSame = false } = {}) => {
      const cleaned = fixAllEntityNotesDiagnostics(sourceText);
      const changed = cleaned !== sourceText;
      if (changed) {
        syncDraftAndPreview(cleaned);
        if (announceIfChanged) {
          showToast('Đã làm sạch khoảng trắng và xuống dòng trước khi xử lý.');
        }
      } else if (announceIfSame) {
        showToast('Nội dung đã gọn sẵn, không cần làm sạch thêm.');
      }
      return { text: changed ? cleaned : sourceText, changed };
    },
    [showToast, syncDraftAndPreview]
  );
  const formatDiagnostics = useMemo(
    () => collectEntityNotesDiagnostics(notesEdit.text),
    [notesEdit.text]
  );
  const fixableDiagnostics = useMemo(
    () => formatDiagnostics.filter((item) => item.fixable),
    [formatDiagnostics]
  );

  const applySingleDiagnosticFix = useCallback((diagnostic) => {
    if (!diagnostic?.fixable) return;
    const patched = applyEntityNotesDiagnosticFix(notesEdit.text, diagnostic);
    if (patched !== notesEdit.text) {
      syncDraftAndPreview(patched);
      showToast(`Đã sửa: ${diagnostic.label}`);
    }
  }, [notesEdit.text, showToast, syncDraftAndPreview]);

  const fixAllDiagnostics = useCallback(() => {
    const patched = fixAllEntityNotesDiagnostics(notesEdit.text);
    if (patched === notesEdit.text) {
      showToast('Không còn lỗi nhẹ nào để sửa thêm.');
      return;
    }
    syncDraftAndPreview(patched);
    showToast('Đã sửa các lỗi định dạng nhẹ và chuẩn hoá lại ghi chú.');
  }, [notesEdit.text, showToast, syncDraftAndPreview]);

  const formatNotesStructureWithAI = useCallback(async () => {
    const currentText = notesEdit.text;
    if (!currentText.trim()) {
      showToast('Chưa có nội dung để AI dàn khung.');
      return;
    }
    if (geminiApiKeys.length === 0) {
      showToast('Vui lòng thiết lập API Key để dùng AI dàn khung.');
      return;
    }
    const normalized = normalizeNotesDraft(currentText).text;
    const { text: truncated } = truncateForAI(normalized, aiMode === 'quick' ? 7000 : undefined);
    const subject = safeString(entityNotesSubject).trim() || 'đối tượng';
    const payload = {
      contents: [{
        parts: [{
          text: `Chủ thể ghi chú: ${subject}\n\nVăn bản gốc:\n${truncated}`,
        }],
      }],
      systemInstruction: {
        parts: [{
          text: `Bạn là trợ lý chỉ chuyên DÀN LẠI CẤU TRÚC ghi chép chi tiết.

Mục tiêu:
- Giữ nguyên ý nghĩa, thuật ngữ, tên riêng và dữ kiện đã có.
- Không bịa thêm thông tin mới.
- Không xoá ý quan trọng.
- Chỉ sắp xếp lại thành markdown thuần dễ đọc hơn: tiêu đề, tiểu mục, bullet, số thứ tự, callout, đoạn mở đầu, tổng kết.
- Giữ nguyên wiki link [[...]] và thẻ [color=...] nếu đã có.
- Nếu nội dung đã ổn, vẫn trả lại văn bản nhưng chỉnh nhẹ khoảng trắng, xuống dòng, thứ bậc mục.

Yêu cầu trả về:
- Chỉ trả về một khối văn bản markdown hoàn chỉnh.
- Không giải thích, không mở đầu, không dùng code fence.`,
        }],
      },
    };

    setIsFormattingStructure(true);
    try {
      const raw = await callGeminiAPIText(payload, geminiApiKeys, { timeoutMs: 45000 });
      const formatted = safeString(raw)
        .replace(/^```(?:markdown|md)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();
      if (!formatted) {
        showToast('AI chưa trả về bản dàn khung hợp lệ.', 'warning');
        return;
      }
      if (formatted.length < normalized.length * 0.45) {
        showToast('AI trả về bản quá ngắn nên mình chưa áp dụng để tránh mất ý.', 'warning');
        return;
      }
      const finalText = fixAllEntityNotesDiagnostics(formatted);
      if (finalText === notesEdit.text) {
        showToast('AI chưa đề xuất bố cục mới rõ ràng.');
        return;
      }
      syncDraftAndPreview(finalText);
      showToast('AI đã dàn lại bố cục ghi chú, giữ theo hướng chỉ chỉnh cấu trúc.');
    } catch (error) {
      showToast(mapGeminiErrorToUserMessage(error), 'warning');
    } finally {
      setIsFormattingStructure(false);
    }
  }, [
    aiMode,
    entityNotesSubject,
    geminiApiKeys,
    normalizeNotesDraft,
    notesEdit.text,
    showToast,
    syncDraftAndPreview,
  ]);

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
  const applyEditorMutation = useCallback(
    (nextState) => {
      const textarea = textareaRef.current || document.getElementById('entity-info-editor');
      if (!textarea || !nextState) return;
      textarea.value = nextState.newText;
      textarea.focus();
      textarea.setSelectionRange(nextState.selStart, nextState.selEnd);
      syncDraftAndPreview(nextState.newText);
      setToolbarState(
        getEntityNotesToolbarState(nextState.newText, nextState.selStart, nextState.selEnd)
      );
    },
    [syncDraftAndPreview]
  );
  const handleEditorPaste = useCallback(
    (event) => {
      const clipboardText = event.clipboardData?.getData?.('text/plain') || '';
      if (!clipboardText || event.clipboardData?.files?.length) return;
      const textarea = event.currentTarget;
      const cleaned = cleanupEntityNotesText(clipboardText);
      if (!cleaned) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      const nextText =
        textarea.value.slice(0, textarea.selectionStart) +
        cleaned +
        textarea.value.slice(textarea.selectionEnd);
      const caret = textarea.selectionStart + cleaned.length;
      applyEditorMutation({ newText: nextText, selStart: caret, selEnd: caret });
    },
    [applyEditorMutation]
  );
  const handleEditorKeyDown = useCallback(
    (event) => {
      const textarea = event.currentTarget;
      if (event.key === 'Tab') {
        const nextState = resolveEntityNotesTabIndent(
          textarea.value,
          textarea.selectionStart,
          textarea.selectionEnd,
          { outdent: event.shiftKey }
        );
        if (nextState) {
          event.preventDefault();
          applyEditorMutation(nextState);
        }
        return;
      }
      if (event.key === 'Enter' && !event.shiftKey) {
        const nextState = resolveEntityNotesLineBreak(
          textarea.value,
          textarea.selectionStart,
          textarea.selectionEnd
        );
        if (nextState) {
          event.preventDefault();
          applyEditorMutation(nextState);
        }
        return;
      }
      if (event.key === 'Backspace') {
        const nextState = resolveEntityNotesBackspace(
          textarea.value,
          textarea.selectionStart,
          textarea.selectionEnd
        );
        if (nextState) {
          event.preventDefault();
          applyEditorMutation(nextState);
        }
      }
    },
    [applyEditorMutation]
  );

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap justify-end mb-2 w-full">
        {onOpenAutoSyncGuide && (
          <button
            type="button"
            onClick={onOpenAutoSyncGuide}
            className="px-3 py-2.5 rounded-[40px] text-[11px] font-bold transition-all shadow-md flex items-center gap-1.5 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/40 border border-cyan-800/40"
            title="Mở quy chuẩn nhập liệu ngay trong app"
          >
            <BookOpen size={13} /> Mở quy chuẩn
          </button>
        )}
        {onOpenEntityNotesGuide && (
          <button
            type="button"
            onClick={onOpenEntityNotesGuide}
            className="px-3 py-2.5 rounded-[40px] text-[11px] font-bold transition-all shadow-md flex items-center gap-1.5 bg-violet-950/30 text-violet-200 hover:bg-violet-900/35 border border-violet-800/40"
            title="Mở hướng dẫn định dạng riêng cho ghi chép chi tiết"
          >
            <ScrollText size={13} /> Mở hướng dẫn
          </button>
        )}
        <button
          type="button"
          onClick={() => normalizeNotesDraft(notesEdit.text, { announceIfChanged: true, announceIfSame: true })}
          className="px-3 py-2.5 rounded-[40px] text-[11px] font-bold transition-all shadow-md flex items-center gap-1.5 bg-slate-800/90 text-slate-200 hover:bg-slate-700 border border-slate-700"
          title="Làm sạch khoảng trắng, ký tự rác và các dòng bị ngắt không hợp lý"
        >
          <RefreshCw size={13} /> Làm sạch
        </button>
        <button
          disabled={isExtractingAI}
          onClick={async () => {
            const currentText = notesEdit.text;
            if (!currentText.trim()) return;
            const cleanedEarly = normalizeNotesDraft(currentText);
            const workingText = cleanedEarly.text;
            const localWrapEarly = autoWrapWikiLinksByEntityMapWithCount(workingText, entityMap);
            if (localWrapEarly.count > 0 && localWrapEarly.text !== workingText) {
              syncDraftAndPreview(localWrapEarly.text);
              showToast(`Da tu boc ${localWrapEarly.count} [[lien ket]] theo the co san. Bam lai AI neu muon goi y them cho kho.`);
              return;
            }
            if (geminiApiKeys.length === 0) {
              showToast('Vui lòng thiết lập API Key để dùng AI.');
              return;
            }
            const text = workingText;
            if (!text.trim()) return;
            const localWrap = autoWrapWikiLinksByEntityMapWithCount(text, entityMap);
            const { wasTruncated } = truncateForAI(text);
            if (wasTruncated) showToast('Đoạn quá dài — chỉ gửi ~12.000 ký tự đầu cho AI.', 'warning');
            setIsExtractingAI(true);
            try {
              const res = await suggestWikiLinkSpotsWithAI(text, geminiApiKeys, aiMode);
              const spots = Array.isArray(res?.linkSpots) ? res.linkSpots : [];
              const aiNext = applyWikiLinkSpots(text, spots);
               const next = aiNext !== text ? aiNext : localWrap.text;
               if (next !== text) {
                 syncDraftAndPreview(next);
                if (aiNext !== text) {
                  showToast('Đã thêm [[liên kết]] bằng AI — giữ nguyên chữ và định dạng bạn nhập.');
                } else {
                  showToast('AI chưa định vị được spot rõ ràng — đã tự bọc link theo danh sách thẻ có sẵn.');
                }
              } else if (spots.length > 0) {
                showToast('AI gợi ý link nhưng không khớp văn bản — thử lại hoặc chỉnh ngắn đoạn.', 'warning');
              } else {
                showToast('Không có chỗ mới cần bọc link (hoặc đã có [[...]]).');
              }
            } catch (e) {
              const msg = mapGeminiErrorToUserMessage(e);
              const rateLimited = /429|503|rate_limit|qua tai api/i.test(String(e?.message || ''));
              if (rateLimited) {
                if (localWrap.text !== text) {
                  syncDraftAndPreview(localWrap.text);
                  showToast('AI đang quá tải (429/503) — đã tự bọc link theo danh sách thẻ có sẵn.', 'warning');
                } else {
                  showToast(msg, 'warning');
                }
              } else {
                showToast(msg, 'error');
              }
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
          type="button"
          disabled={isFormattingStructure}
          onClick={formatNotesStructureWithAI}
          className="px-4 py-2.5 rounded-[40px] text-xs font-bold transition-all shadow-md flex items-center gap-2 bg-violet-700 hover:bg-violet-600 text-white disabled:opacity-50"
          title="AI chỉ dàn lại bố cục ghi chú: tiêu đề, mục, bullet, callout — không thêm nội dung mới"
        >
          {isFormattingStructure ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Wand2 size={14} />
          )}
          {isFormattingStructure ? 'Đang dàn khung...' : 'AI Dàn khung'}
        </button>
        <button
          id="save-entity-btn"
          type="button"
          onClick={() => {
            const cleanedText = notesTypo.autoCleanOnSave
              ? fixAllEntityNotesDiagnostics(notesEdit.text)
              : notesEdit.text;
            const formatSync = syncEntityNotesDuplicateWordFormatting(cleanedText);
            const preparedText = formatSync.text;
            const remainingWarnings = collectEntityNotesDiagnostics(preparedText);
            if (preparedText !== notesEdit.text) {
              syncDraftAndPreview(preparedText);
              if (cleanedText !== notesEdit.text && formatSync.propagatedCount > 0) {
                showToast('Đã tự chuẩn hoá ghi chú và đồng bộ định dạng cho các từ/cụm trùng trước khi lưu.');
              } else if (formatSync.propagatedCount > 0) {
                showToast(`Đã đồng bộ định dạng cho ${formatSync.propagatedCount} từ/cụm trùng trước khi lưu.`);
              } else {
                showToast('Đã tự chuẩn hoá ghi chú trước khi lưu.');
              }
            } else if (remainingWarnings.length > 0) {
              showToast(`Đã lưu nhưng vẫn còn ${remainingWarnings.length} cảnh báo định dạng.`, 'warning');
            }
            const next = autoWrapWikiLinksByEntityMap(preparedText, entityMap);
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
            entityNotesSubject={entityNotesSubject}
            entityNotesToolbarState={toolbarState}
            entityNotesTemplateProfile={templateProfile}
            notesAutoCleanOnSave={notesTypo.autoCleanOnSave}
            onNotesAutoCleanOnSave={(enabled) => setEntityNotesPrefs({ autoCleanOnSave: enabled })}
            onAiFormatStructure={formatNotesStructureWithAI}
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
        {formatDiagnostics.length > 0 && (
          <div className="mb-3 rounded-2xl border border-amber-700/40 bg-amber-950/20 px-4 py-3 text-[12px] text-amber-100">
            <div className="mb-2 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 font-semibold text-amber-300">
                <AlertTriangle size={14} />
                Cảnh báo định dạng
              </div>
              {fixableDiagnostics.length > 0 && (
                <button
                  type="button"
                  onClick={fixAllDiagnostics}
                  className="rounded-full border border-amber-700/40 bg-slate-950/60 px-3 py-1 text-[11px] font-semibold text-amber-100 hover:bg-slate-900"
                >
                  Sửa hết lỗi nhẹ
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {formatDiagnostics.map((warning) => (
                <div
                  key={warning.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-700/40 bg-slate-950/50 pl-2.5 pr-1 py-1 text-[11px] text-amber-100"
                >
                  <button
                    type="button"
                    onClick={() => focusEditorRange(warning.start, warning.end)}
                    className="text-left hover:text-white"
                    title={`Nhảy tới dòng ${warning.line}`}
                  >
                    {warning.label}
                  </button>
                  {warning.fixable && (
                    <button
                      type="button"
                      onClick={() => applySingleDiagnosticFix(warning)}
                      className="rounded-full border border-amber-700/30 bg-amber-950/30 px-2 py-0.5 text-[10px] font-semibold text-amber-100 hover:bg-amber-900/30"
                      title={warning.fixLabel || 'Sửa nhanh'}
                    >
                      {warning.fixLabel || 'Sửa'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className={`flex flex-1 gap-4 min-h-[300px] ${isSplitPreview ? 'flex-row' : 'flex-col'}`}>
          <textarea
            ref={textareaRef}
            id="entity-info-editor"
            value={notesEdit.text}
            onChange={(e) => {
              recordAndSetDraft(e.target.value);
              setToolbarState(
                getEntityNotesToolbarState(e.target.value, e.target.selectionStart, e.target.selectionEnd)
              );
            }}
            className={`bg-transparent text-slate-200 leading-loose outline-none resize-none custom-scrollbar ${
              isSplitPreview ? 'w-1/2 flex-shrink-0' : 'flex-1 min-h-[300px]'
            }`}
            style={{
              fontFamily: getEntityNotesFontStack(notesTypo.fontKey),
              fontSize: `${notesTypo.sizePx}px`,
            }}
            placeholder="Hạ bút khắc ấn..."
            spellCheck
            onKeyDown={handleEditorKeyDown}
            onKeyUp={syncToolbarStateFromEditor}
            onClick={syncToolbarStateFromEditor}
            onSelect={syncToolbarStateFromEditor}
            onPaste={handleEditorPaste}
            onScroll={handleEditorScroll}
          />
          {isSplitPreview && (
            <MarkdownPreviewPane
              text={debouncedMarkdownPreview}
              dirHandle={currentContextDirHandle}
              entityMap={entityMap}
              linkRegex={globalLinkRegex}
              onNavigate={onNavigate}
              selfEntityId={selfEntityId}
              variant="entityNotes"
              containerRef={previewScrollRef}
              onScroll={handlePreviewScroll}
              onJumpToAnchor={(item) => jumpToEditorLine(item.line)}
              onJumpToLine={jumpToEditorLine}
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
  activeTabNho,
  currentTabConfig,
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
  handleSetSelectedEntityAutoSyncState,
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
  entityTemplateHint,
  onOpenAutoSyncGuide,
  onOpenEntityNotesGuide,
  detailProfileMode = 'original',
  onChangeDetailProfileMode = null,
  canViewTimelineCurrentProfile = false,
  timelineCurrentProfileLabel = '',
  onOpenTimelineCurrentEdit = null,
}) {
  const autoSyncControls = useMemo(() => {
    if (!selectedEntity || !currentTabConfig) return [];
    const role = getEffectiveAutoSyncRole({
      activeTabLon,
      activeTabNho,
      currentTabConfig,
      parentLabel: currentTabConfig?._parentLabel || '',
    });
    return getAutoSyncEnginesForRole(role).map((engineId) => ({
      id: engineId,
      label: getAutoSyncEngineLabel(engineId),
      description: getAutoSyncEngineDescription(engineId),
      disabled: isEntityAutoSyncDisabled(selectedEntity, engineId),
      locked: isEntityAutoSyncLocked(selectedEntity, engineId),
    }));
  }, [activeTabLon, activeTabNho, currentTabConfig, selectedEntity]);
  const autoSyncRoleLabel = useMemo(() => {
    if (!currentTabConfig) return '';
    const role = getEffectiveAutoSyncRole({
      activeTabLon,
      activeTabNho,
      currentTabConfig,
      parentLabel: currentTabConfig?._parentLabel || '',
    });
    return role ? getAutoSyncRoleLabel(role) : '';
  }, [activeTabLon, activeTabNho, currentTabConfig]);
  const isCurrentTimelineMode = detailProfileMode === 'current';

  useEffect(() => {
    if (isCurrentTimelineMode && isEntityEditing) {
      setIsEntityEditing(false);
    }
  }, [isCurrentTimelineMode, isEntityEditing, setIsEntityEditing]);

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
          {typeof onChangeDetailProfileMode === 'function' && (
            <div className="inline-flex items-center gap-1 rounded-[40px] border border-slate-700 bg-slate-950/60 p-1">
              <button
                type="button"
                onClick={() => onChangeDetailProfileMode('original')}
                className={`rounded-[32px] px-3 py-2 text-[11px] font-bold transition-colors ${
                  detailProfileMode === 'original'
                    ? 'bg-slate-200 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                Ban đầu
              </button>
              <button
                type="button"
                disabled={!canViewTimelineCurrentProfile}
                onClick={() => {
                  if (isEntityEditing) setIsEntityEditing(false);
                  onChangeDetailProfileMode('current');
                }}
                title={
                  canViewTimelineCurrentProfile && timelineCurrentProfileLabel
                    ? `Lấy trạng thái mới nhất từ timeline: ${timelineCurrentProfileLabel}`
                    : 'Timeline chưa có mốc nào để dựng trạng thái hiện tại'
                }
                className={`rounded-[32px] px-3 py-2 text-[11px] font-bold transition-colors ${
                  detailProfileMode === 'current'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800'
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                Hiện tại
              </button>
            </div>
          )}
          {detailProfileMode === 'current' && timelineCurrentProfileLabel && (
            <span className="rounded-full border border-amber-700/40 bg-amber-950/25 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-amber-200">
              {timelineCurrentProfileLabel}
            </span>
          )}
          {onOpenAutoSyncGuide && (
            <button
              type="button"
              onClick={onOpenAutoSyncGuide}
              className="px-4 py-2.5 rounded-[40px] text-xs font-bold transition-all shadow-md flex items-center gap-2 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/40 border border-cyan-800/40"
            >
              <BookOpen size={14} /> Quy chuẩn
            </button>
          )}
          {onOpenEntityNotesGuide && (
            <button
              type="button"
              onClick={onOpenEntityNotesGuide}
              className="px-4 py-2.5 rounded-[40px] text-xs font-bold transition-all shadow-md flex items-center gap-2 bg-violet-950/30 text-violet-200 hover:bg-violet-900/35 border border-violet-800/40"
            >
              <ScrollText size={14} /> Hướng dẫn
            </button>
          )}
          {!isEntityEditing && (
            <button
              id="save-entity-btn"
              type="button"
              onClick={() => {
                if (isCurrentTimelineMode && typeof onOpenTimelineCurrentEdit === 'function') {
                  onOpenTimelineCurrentEdit();
                  return;
                }
                const s = safeString(selectedEntity?.info || '');
                setLivePreviewText(s);
                setDebouncedMarkdownPreview(s);
                setIsEntityEditing(true);
              }}
              className="px-5 py-2.5 rounded-[40px] text-xs font-bold transition-all shadow-md flex items-center gap-2 bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
            >
              <Edit3 size={16} /> {isCurrentTimelineMode ? 'Sửa timeline' : 'Viết ghi chép'}
            </button>
          )}
        </div>
      </div>

      {selectedEntity && autoSyncControls.length > 0 && typeof handleSetSelectedEntityAutoSyncState === 'function' && (
        <div className="mb-5 rounded-[32px] border border-cyan-800/40 bg-cyan-950/15 px-5 py-4">
          <div className="flex items-center gap-2 text-cyan-200 font-semibold text-sm">
            <Lock size={15} />
            AUTO cho thẻ này
            {autoSyncRoleLabel && (
              <span className="rounded-full border border-cyan-800/40 bg-slate-950/50 px-2.5 py-0.5 text-[11px] uppercase tracking-wide text-cyan-100">
                {autoSyncRoleLabel}
              </span>
            )}
          </div>
          <p className="mt-2 text-[12px] text-cyan-100/85 font-serif leading-relaxed">
            `Tắt riêng` sẽ rút thẻ này khỏi engine AUTO tương ứng. `Khóa block` sẽ giữ nguyên block AUTO hiện có trên chính thẻ này.
          </p>
          <div className="mt-3 space-y-2">
            {autoSyncControls.map((control) => (
              <div
                key={control.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/55 px-4 py-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-100">{control.label}</span>
                    {control.disabled && (
                      <span className="rounded-full border border-rose-800/40 bg-rose-950/35 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-200">
                        Đang tắt
                      </span>
                    )}
                    {control.locked && (
                      <span className="rounded-full border border-amber-800/40 bg-amber-950/35 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200">
                        Đang khóa
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[12px] text-slate-400 font-serif">{control.description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleSetSelectedEntityAutoSyncState(control.id, 'disabled', !control.disabled)
                    }
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                      control.disabled
                        ? 'border-emerald-700/50 bg-emerald-950/30 text-emerald-200 hover:bg-emerald-900/30'
                        : 'border-rose-700/40 bg-rose-950/30 text-rose-200 hover:bg-rose-900/30'
                    }`}
                  >
                    {control.disabled ? 'Bật lại' : 'Tắt riêng'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSetSelectedEntityAutoSyncState(control.id, 'locked', !control.locked)
                    }
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                      control.locked
                        ? 'border-cyan-700/50 bg-cyan-950/35 text-cyan-100 hover:bg-cyan-900/35'
                        : 'border-amber-700/40 bg-amber-950/30 text-amber-200 hover:bg-amber-900/30'
                    }`}
                  >
                    {control.locked ? 'Mở khóa' : 'Khóa block'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className={`flex flex-col transition-all duration-300 backdrop-blur-md ${
          isEntityEditing
            ? 'bg-slate-900 border border-amber-700/50 shadow-[0_0_15px_rgba(217,119,6,0.1)] p-6 rounded-[40px]'
            : 'bg-slate-900/30 border border-slate-800/60 p-8 rounded-[40px]'
        }`}
      >
        {isEntityEditing && selectedEntity && !isCurrentTimelineMode ? (
          <EntityNotesEditSession
            key={`${selectedEntity.id}:${detailProfileMode}`}
            activeTabLon={activeTabLon}
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
            entityNotesSubject={selectedEntity.name}
            entityTemplateHint={entityTemplateHint}
            onOpenAutoSyncGuide={onOpenAutoSyncGuide}
            onOpenEntityNotesGuide={onOpenEntityNotesGuide}
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
