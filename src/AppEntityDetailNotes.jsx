import React, { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, BookOpen, Save, Edit3, Eye, ScrollText, Lock, Search, Filter, Table2 } from 'lucide-react';
import { MarkdownToolbar } from './MasterComponents.jsx';
import { MarkdownPreviewPane } from './MarkdownPreviewPane.jsx';
import {
  EntityNotesHighlightedEditor,
  ENTITY_NOTES_EDITOR_SCROLL_MAX_CLASS,
} from './EntityNotesHighlightedEditor.jsx';
import { EntityNotesWikiAutocomplete } from './EntityNotesWikiAutocomplete.jsx';
import {
  applyWikiAutocompleteSelection,
  buildWikiAutocompleteSuggestions,
  findOpenWikiBracketSession,
} from './lib/entityNotesWikiAutocomplete.js';
import { EntityNotesAiToolsMenu } from './EntityNotesAiToolsMenu.jsx';
import { EntityNotesFindReplacePanel } from './EntityNotesFindReplacePanel.jsx';
import { TtcQueryBuilderModal } from './lib/TtcQueryBuilderModal.jsx';
import { buildEntityNotesPreviewModel, renderEntityNotesMarkdown } from './lib/renderEntityNotesMarkdown.jsx';
import { EntityNotesMarkdownTableEditModal } from './EntityNotesMarkdownTableEditModal.jsx';
import {
  getMarkdownTableBlockByIndex,
  replaceMarkdownTableBlockByIndex,
} from './lib/markdownTableEditor.js';
import { filterEntityNotesMarkdown, sortMarkdownSectionsAfterFilter } from './lib/entityNotesTabFilter.js';
import { isListCardEntity } from './lib/collectionListCardSync.js';
import { AppListCardInfoSearch } from './AppListCardInfoSearch.jsx';
import {
  safeString,
  getEntityNotesToolbarState,
  handleToolbarClick,
  handleToolbarInsertText,
  resolveEntityNotesLineBreak,
  resolveEntityNotesBackspace,
  resolveEntityNotesTabIndent,
} from './MasterUtils.jsx';
import { autoWrapWikiLinksForSave } from './lib/autoWrapWikiLinksAsync.js';
import {
  applyWikiLinkOptOutsForSaveAsync,
  detectWikiLinkOptOuts,
  mergeWikiLinkOptOuts,
  readWikiLinkOptOuts,
  resolveEffectiveWikiLinkOptOuts,
} from './lib/wikiLinkOptOut.js';
import { cleanupEntityNotesText } from './lib/entityNotesTextCleanup.js';
import { prepareEntityNotesPasteText } from './lib/entityNotesEditorPaste.js';
import { prepareEntityNotesForSave } from './lib/entityNotesDiagnostics.js';
import { focusEntityNotesTextarea } from './lib/entityNotesEditorSelection.js';
import { syncEntityNotesDuplicateWordFormatting } from './lib/entityNotesDuplicateWordFormatting.js';
import {
  getEntityNotesFontStack,
  getEntityNotesPrefs,
  setEntityNotesPrefs,
  subscribeEntityNotesPrefs,
} from './lib/entityNotesPrefs.js';
import { resolveEntityNotesTemplateProfile } from './lib/entityNotesSemantics.js';
import { nextPaint, runNotesAiPipeline, yieldToMain } from './lib/entityNotesAiPipeline.js';
import { getEffectiveAutoSyncRole, getAutoSyncRoleLabel } from './lib/tabAutoSyncRole.js';
import {
  getAutoSyncEngineDescription,
  getAutoSyncEngineLabel,
  getAutoSyncEnginesForRole,
  isEntityAutoSyncDisabled,
  isEntityAutoSyncLocked,
} from './lib/autoSyncEntityPrefs.js';

const NOTES_ADV_TOOLBAR_BTN =
  'tt-kbd-focus h-9 rounded-xl text-[12px] font-semibold px-3 border flex items-center gap-1.5 transition-colors flex-shrink-0';

const HIST_MAX = 120;

/** Phiên soạn một thẻ: `key={entityId}` để state/undo reset đúng khi đổi thẻ — không cần effect hydrate. */
const EntityNotesEditSession = memo(function EntityNotesEditSession({
  activeTabLon,
  initialInfo,
  savedInfo,
  wikiLinkOptOuts: initialWikiLinkOptOuts,
  geminiApiKeys,
  aiMode,
  isExtractingAI: _isExtractingAI,
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
  activeNovelData = null,
  statusTierLabelSet = null,
  globalLinkRegex,
  onNavigate,
  selfEntityId,
  entityNotesSubject,
  entityTemplateHint,
  activeTabNho = '',
  onOpenAutoSyncGuide,
  onOpenEntityNotesGuide,
  editingContext = null,
  onCancelEdit = null,
  saveButtonLabel = 'Lưu ghi chép',
  allowImageTools = true,
}) {
  const s0 = safeString(initialInfo);
  const [notesEdit, setNotesEdit] = useState(() => ({
    text: s0,
    history: [s0],
    hIndex: 0,
  }));
  const [, setIsFormattingStructure] = useState(false);
  const [isAiPipelineRunning, setIsAiPipelineRunning] = useState(false);
  const [aiPipelineStep, setAiPipelineStep] = useState(null);
  const [pendingWikiLinkOptOuts, setPendingWikiLinkOptOuts] = useState([]);
  const [tableEditIndex, setTableEditIndex] = useState(null);
  const notesTypo = useSyncExternalStore(subscribeEntityNotesPrefs, getEntityNotesPrefs, getEntityNotesPrefs);
  const textareaRef = useRef(null);
  const previewScrollRef = useRef(null);
  const scrollSyncLockRef = useRef(false);
  const findReplaceRef = useRef(null);
  // Đang ghép chữ IME (tiếng Việt): chặn mọi setState đồng bộ toolbar/caret để React
  // không re-render và ghi đè value cũ giữa lúc compose ⇒ tránh rớt/lặp ký tự.
  const isComposingRef = useRef(false);
  const [toolbarState, setToolbarState] = useState(() => getEntityNotesToolbarState(s0, 0, 0));
  const [queryBuilderOpen, setQueryBuilderOpen] = useState(false);
  const [editorCaret, setEditorCaret] = useState(0);
  const [wikiAcSelectedIndex, setWikiAcSelectedIndex] = useState(0);
  const [wikiAcSuppressedAt, setWikiAcSuppressedAt] = useState(null);
  const editorSurfaceRef = useRef(null);
  /** Keystroke onChange đã cập nhật toolbar — bỏ qua useEffect trùng trên notesEdit.text. */
  const toolbarSyncedFromChangeRef = useRef(false);
  const OPT_OUTS_DEBOUNCE_MS = 300;
  const [debouncedDraftForOptOuts, setDebouncedDraftForOptOuts] = useState(s0);
  const templateProfile = useMemo(
    () =>
      resolveEntityNotesTemplateProfile({
        tabLabel: entityTemplateHint,
        activeTabLon,
        entityName: entityNotesSubject,
      }),
    [activeTabLon, entityNotesSubject, entityTemplateHint]
  );

  const wikiAcSession = useMemo(
    () => findOpenWikiBracketSession(notesEdit.text, editorCaret),
    [editorCaret, notesEdit.text]
  );
  const wikiAcItems = useMemo(() => {
    if (!wikiAcSession) return [];
    return buildWikiAutocompleteSuggestions(entityMap, wikiAcSession.query, selfEntityId);
  }, [entityMap, selfEntityId, wikiAcSession]);
  const wikiAcOpen =
    Boolean(wikiAcSession) &&
    wikiAcItems.length > 0 &&
    wikiAcSuppressedAt !== wikiAcSession?.queryEnd;

  useEffect(() => {
    setWikiAcSelectedIndex(0);
    if (wikiAcSession?.queryEnd !== wikiAcSuppressedAt) {
      setWikiAcSuppressedAt(null);
    }
  }, [wikiAcSession?.query, wikiAcSession?.queryEnd, wikiAcSuppressedAt]);

  const wikiAcPopupTop = useMemo(() => {
    if (!wikiAcSession) return 0;
    const lineNo = notesEdit.text.slice(0, wikiAcSession.queryEnd).split('\n').length;
    return Math.min(Math.max(0, (lineNo - 1) * notesTypo.sizePx * 1.85), 220);
  }, [notesEdit.text, notesTypo.sizePx, wikiAcSession]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedDraftForOptOuts(notesEdit.text), OPT_OUTS_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [notesEdit.text]);

  const savedBaselineForOptOuts = safeString(savedInfo ?? initialInfo);

  const resolveDraftWikiLinkOptOuts = useCallback(
    (draftText) =>
      resolveEffectiveWikiLinkOptOuts({
        stored: initialWikiLinkOptOuts,
        pending: pendingWikiLinkOptOuts,
        savedBaseline: savedBaselineForOptOuts,
        draftText,
      }),
    [initialWikiLinkOptOuts, pendingWikiLinkOptOuts, savedBaselineForOptOuts]
  );

  const effectiveWikiLinkOptOuts = useMemo(
    () => resolveDraftWikiLinkOptOuts(debouncedDraftForOptOuts),
    [debouncedDraftForOptOuts, resolveDraftWikiLinkOptOuts]
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
      // Ctrl+H: mở/đóng tìm & thay (không dùng Cmd+H — trên Mac là Ẩn cửa sổ)
      if (e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        e.stopPropagation();
        findReplaceRef.current?.toggle?.();
        return;
      }
      const ta = document.getElementById('entity-info-editor');
      if (!ta || document.activeElement !== ta) return;
      if (e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        e.stopPropagation();
        handleToolbarClick('__WIKI_TOGGLE__', '', 'entity-info-editor', (nextText, meta) => {
          if (meta?.wikiOptOut) {
            setPendingWikiLinkOptOuts((prev) => mergeWikiLinkOptOuts(prev, [meta.wikiOptOut]));
          }
          recordAndSetDraft(nextText);
        });
        return;
      }
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
  }, [recordAndSetDraft, undo, redo]);

  useEffect(() => {
    const el = textareaRef.current || document.getElementById('entity-info-editor');
    if (el && typeof el.focus === 'function') el.focus();
  }, []);

  const syncToolbarStateFromEditor = useCallback(() => {
    if (isComposingRef.current) return;
    const textarea = textareaRef.current || document.getElementById('entity-info-editor');
    if (!textarea) return;
    setEditorCaret(textarea.selectionStart);
    setToolbarState(
      getEntityNotesToolbarState(textarea.value, textarea.selectionStart, textarea.selectionEnd)
    );
  }, []);

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false;
    syncToolbarStateFromEditor();
  }, [syncToolbarStateFromEditor]);

  useEffect(() => {
    if (toolbarSyncedFromChangeRef.current) {
      toolbarSyncedFromChangeRef.current = false;
      return;
    }
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
    (v, meta) => {
      if (meta?.wikiOptOut) {
        setPendingWikiLinkOptOuts((prev) => mergeWikiLinkOptOuts(prev, [meta.wikiOptOut]));
      }
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
  const tableEditBlock = useMemo(() => {
    if (tableEditIndex == null) return null;
    return getMarkdownTableBlockByIndex(notesEdit.text, tableEditIndex)?.block ?? null;
  }, [notesEdit.text, tableEditIndex]);
  const handleApplyMarkdownTableEdit = useCallback(
    (replacementMarkdown) => {
      if (tableEditIndex == null) return;
      const next = replaceMarkdownTableBlockByIndex(notesEdit.text, tableEditIndex, replacementMarkdown);
      syncDraftAndPreview(next);
      setTableEditIndex(null);
    },
    [notesEdit.text, syncDraftAndPreview, tableEditIndex]
  );
  const handleRunAiPipeline = useCallback(
    async (pipelineSteps) => {
      const currentText = notesEdit.text;
      if (!currentText.trim()) {
        showToast('Chưa có nội dung để chuẩn hoá.', 'warning');
        return;
      }
      const wantsAi = pipelineSteps.includes('link') || pipelineSteps.includes('format');
      setIsAiPipelineRunning(true);
      setAiPipelineStep(null);
      if (wantsAi) {
        setIsExtractingAI(true);
        setIsFormattingStructure(pipelineSteps.includes('format'));
      }
      try {
        const result = await runNotesAiPipeline(currentText, {
          steps: pipelineSteps,
          entityMap,
          geminiApiKeys,
          aiMode,
          wikiLinkOptOuts: resolveDraftWikiLinkOptOuts(currentText),
          tierLabelSet: statusTierLabelSet,
          subject: entityNotesSubject,
          onProgress: ({ step, phase, text }) => {
            if (phase === 'start') {
              setAiPipelineStep(step);
              return;
            }
            setAiPipelineStep(null);
            syncDraftAndPreview(text);
          },
        });
        if (result.text !== currentText) {
          syncDraftAndPreview(result.text);
          const caret = result.text.length;
          setEditorCaret(caret);
          requestAnimationFrame(() => {
            const ta = textareaRef.current || document.getElementById('entity-info-editor');
            if (!ta) return;
            ta.focus();
            ta.setSelectionRange(caret, caret);
          });
        }
        if (!result.ok) {
          if (result.reason === 'empty') {
            showToast('Chưa có nội dung để chuẩn hoá.', 'warning');
          } else {
            showToast(result.error || 'Lỗi khi chạy chuẩn hoá.', 'error');
          }
          return;
        }
        if (result.steps.length > 0) {
          let msg = `Đã chạy: ${result.steps.join(' → ')}.`;
          if (result.linkSkippedAi || result.formatSkippedAi) {
            msg += ' (Thiếu API Key — bước AI bị bỏ qua.)';
          }
          showToast(msg, 'success');
        } else {
          showToast('Nội dung đã ổn, không cần chỉnh thêm.', 'success');
        }
      } finally {
        setIsAiPipelineRunning(false);
        setAiPipelineStep(null);
        setIsExtractingAI(false);
        setIsFormattingStructure(false);
      }
    },
    [
      aiMode,
      entityMap,
      entityNotesSubject,
      geminiApiKeys,
      resolveDraftWikiLinkOptOuts,
      notesEdit.text,
      setIsExtractingAI,
      setIsFormattingStructure,
      showToast,
      statusTierLabelSet,
      syncDraftAndPreview,
    ]
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
  const applyEditorMutation = useCallback(
    (nextState) => {
      if (!nextState) return;
      const { newText, selStart, selEnd } = nextState;
      syncDraftAndPreview(newText);
      setEditorCaret(selStart);
      setToolbarState(getEntityNotesToolbarState(newText, selStart, selEnd));
      focusEntityNotesTextarea(
        textareaRef.current || document.getElementById('entity-info-editor'),
        selStart,
        selEnd,
        newText.length
      );
    },
    [syncDraftAndPreview]
  );
  const applyWikiAutocompletePick = useCallback(
    (item) => {
      if (!wikiAcSession || !item) return;
      if (item.kind === 'create') {
        onNavigate?.({ type: 'QUICK_CREATE', name: item.name });
        return;
      }
      const out = applyWikiAutocompleteSelection(notesEdit.text, wikiAcSession, item.name);
      if (!out) return;
      applyEditorMutation({ newText: out.newText, selStart: out.selEnd, selEnd: out.selEnd });
    },
    [applyEditorMutation, notesEdit.text, onNavigate, wikiAcSession]
  );
  const handleEditorPaste = useCallback(
    (event) => {
      const clipboardText = event.clipboardData?.getData?.('text/plain') || '';
      const clipboardHtml = event.clipboardData?.getData?.('text/html') || '';
      if ((!clipboardText && !clipboardHtml) || event.clipboardData?.files?.length) return;
      const textarea = event.currentTarget;
      const cleaned = prepareEntityNotesPasteText({ plain: clipboardText, html: clipboardHtml });
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
      if (event.nativeEvent.isComposing || event.key === 'Process') return;
      const textarea = event.currentTarget;
      if (wikiAcOpen) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setWikiAcSelectedIndex((i) => Math.min(wikiAcItems.length - 1, i + 1));
          return;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setWikiAcSelectedIndex((i) => Math.max(0, i - 1));
          return;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          if (wikiAcSession) setWikiAcSuppressedAt(wikiAcSession.queryEnd);
          return;
        }
        if (event.key === 'Enter' || (event.key === 'Tab' && !event.shiftKey)) {
          event.preventDefault();
          const picked = wikiAcItems[wikiAcSelectedIndex] || wikiAcItems[0];
          if (picked) applyWikiAutocompletePick(picked);
          return;
        }
      }
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
        // Backspace dùng hành vi gốc của trình duyệt để không bao giờ xoá lệch ký tự
        // hay làm hỏng cú pháp [[wiki]]; chỉ can thiệp khi gỡ marker danh sách rỗng.
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
    [
      applyEditorMutation,
      applyWikiAutocompletePick,
      wikiAcItems,
      wikiAcOpen,
      wikiAcSelectedIndex,
      wikiAcSession,
    ]
  );

  return (
    <>
      {editingContext && (
        <div className="mb-3 rounded-2xl border border-amber-700/45 bg-amber-950/20 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-widest text-amber-200">
                {editingContext.label}
              </div>
              {editingContext.description && (
                <p className="mt-1 font-serif text-sm text-slate-300">{editingContext.description}</p>
              )}
            </div>
            {onCancelEdit && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="tt-kbd-focus flex h-9 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-3 text-[12px] font-bold text-slate-300 hover:border-amber-600/50 hover:text-amber-200"
              >
                <ArrowLeft size={14} /> Quay lại thẻ cha
              </button>
            )}
          </div>
        </div>
      )}
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
        <EntityNotesAiToolsMenu
          onRunPipeline={handleRunAiPipeline}
          isRunning={isAiPipelineRunning}
          runningStep={aiPipelineStep}
        />
        <button
          id="save-entity-btn"
          type="button"
          disabled={isAiPipelineRunning}
          onClick={async () => {
            setIsAiPipelineRunning(true);
            setAiPipelineStep(null);
            await yieldToMain();
            await nextPaint();

            const latestNotesPrefs = getEntityNotesPrefs();
            const rawDraft = notesEdit.text;
            const savedBaseline = safeString(savedInfo ?? initialInfo);
            const preDetectedOptOuts = mergeWikiLinkOptOuts(
              pendingWikiLinkOptOuts,
              detectWikiLinkOptOuts(savedBaseline, rawDraft)
            );
            const savePipelineSteps = [];
            if (latestNotesPrefs.autoCleanOnSave) savePipelineSteps.push('clean');
            // Bọc [[link]] khi lưu: chỉ applyWikiLinkOptOutsForSave (tránh autoWrap trùng với bước link).
            if (latestNotesPrefs.autoAnalysisOnSave) savePipelineSteps.push('format');
            const hasDraftChanges = rawDraft !== savedBaseline;

            try {
              let pipelineText = rawDraft;
              if (savePipelineSteps.length > 0 && hasDraftChanges) {
                if (savePipelineSteps.includes('format')) {
                  setIsExtractingAI(true);
                  setIsFormattingStructure(true);
                }
                await yieldToMain();
                const wikiLinkOptOutsAtSave = resolveDraftWikiLinkOptOuts(rawDraft);
                const pipelineResult = await runNotesAiPipeline(rawDraft, {
                  steps: savePipelineSteps,
                  entityMap,
                  geminiApiKeys,
                  aiMode,
                  wikiLinkOptOuts: wikiLinkOptOutsAtSave,
                  tierLabelSet: statusTierLabelSet,
                  subject: entityNotesSubject,
                  skipAi: true,
                  onProgress: ({ step, phase, text }) => {
                    if (phase === 'start') {
                      setAiPipelineStep(step);
                      return;
                    }
                    setAiPipelineStep(null);
                    syncDraftAndPreview(text);
                  },
                });
                pipelineText = pipelineResult.text;
                if (!pipelineResult.ok) {
                  showToast(
                    pipelineResult.error || 'Một bước chuẩn hoá bị lỗi, tiếp tục lưu phần đã xử lý.',
                    'warning'
                  );
                } else if (savePipelineSteps.length > 1) {
                  showToast(`Đã chạy tuần tự: ${savePipelineSteps.join(' → ')} trước khi lưu.`);
                }
                if (savePipelineSteps.includes('format')) {
                  setIsExtractingAI(false);
                  setIsFormattingStructure(false);
                }
              }

              await yieldToMain();
              const cleanedText = latestNotesPrefs.autoCleanOnSave
                ? prepareEntityNotesForSave(pipelineText)
                : pipelineText;
              const formatSync = syncEntityNotesDuplicateWordFormatting(cleanedText);
              const preparedText = formatSync.text;
              if (preparedText !== notesEdit.text) {
                syncDraftAndPreview(preparedText);
                if (cleanedText !== notesEdit.text && formatSync.propagatedCount > 0) {
                  showToast('Đã tự chuẩn hoá ghi chú và đồng bộ định dạng cho các từ/cụm trùng trước khi lưu.');
                } else if (formatSync.propagatedCount > 0) {
                  showToast(`Đã đồng bộ định dạng cho ${formatSync.propagatedCount} từ/cụm trùng trước khi lưu.`);
                } else {
                  showToast('Đã tự chuẩn hoá ghi chú trước khi lưu.');
                }
              }

              await yieldToMain();
              const saveResult = await applyWikiLinkOptOutsForSaveAsync({
                savedInfo: savedBaseline,
                preparedText,
                wikiLinkOptOuts: initialWikiLinkOptOuts,
                entityMap,
                autoWrapWikiLinksByEntityMapWithCount: autoWrapWikiLinksForSave,
                autoWrapOnSave: latestNotesPrefs.autoWrapWikiOnSave,
                preDetectedOptOuts,
                tierLabelSet: statusTierLabelSet,
              });
              if (saveResult.detectedCount > 0) {
                showToast(
                  `Đã ghi nhớ ${saveResult.detectedCount} chỗ bạn gỡ link — app sẽ không tự bọc lại cùng vị trí.`,
                  'success'
                );
              }

              await yieldToMain();
              await nextPaint();
              handleUpdateEntityInfo(saveResult.text, { wikiLinkOptOuts: saveResult.wikiLinkOptOuts });
              setIsSplitPreview(false);
              setIsEntityEditing(false);
            } finally {
              setIsAiPipelineRunning(false);
              setAiPipelineStep(null);
              setIsExtractingAI(false);
              setIsFormattingStructure(false);
            }
          }}
          className="px-5 py-2.5 rounded-[40px] text-xs font-bold transition-all shadow-md flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-60 disabled:pointer-events-none"
        >
          <Save size={16} /> {saveButtonLabel}
        </button>
        <EntityNotesFindReplacePanel
          ref={findReplaceRef}
          text={notesEdit.text}
          subjectHint={entityNotesSubject}
          disabled={isAiPipelineRunning}
          showToast={showToast}
          onReplace={syncDraftAndPreview}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col animate-fade-in overflow-hidden min-h-[400px]">
        <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
          <MarkdownToolbar
            editorId="entity-info-editor"
            variant="entityNotes"
            onInsertImage={allowImageTools ? (eid) => {
              setImageForm({ url: '', alt: '', editorId: eid });
              setIsInsertImageModalOpen(true);
            } : null}
            onPickLocalImage={allowImageTools ? handlePickScopedLocalImage : null}
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
          />
          <button
            type="button"
            onClick={() => setQueryBuilderOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0 transition-colors flex items-center gap-1.5 bg-violet-950/40 text-violet-200 border border-violet-700/40 hover:bg-violet-900/40"
            title="Chèn bảng dữ liệu động (ttc-query)"
          >
            <Table2 size={12} /> Tạo bảng
          </button>
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
        {queryBuilderOpen && (
          <TtcQueryBuilderModal
            activeNovelData={activeNovelData}
            initialLonId={activeTabLon}
            initialNhoId={activeTabNho}
            onClose={() => setQueryBuilderOpen(false)}
            onInsert={(markdown) => {
              handleToolbarInsertText(`${markdown}\n\n`, 'entity-info-editor', onEditorContentChange);
              setQueryBuilderOpen(false);
              setIsSplitPreview(true);
            }}
          />
        )}
        <div
          className={`flex min-h-0 gap-4 overflow-hidden ${ENTITY_NOTES_EDITOR_SCROLL_MAX_CLASS} ${isSplitPreview ? 'flex-row' : 'flex-col'}`}
        >
          <div
            ref={editorSurfaceRef}
            className={`relative min-h-0 ${isSplitPreview ? 'h-full w-1/2 flex-shrink-0' : 'h-full flex-1'}`}
          >
            <EntityNotesWikiAutocomplete
              open={wikiAcOpen}
              items={wikiAcItems}
              selectedIndex={wikiAcSelectedIndex}
              style={{ top: wikiAcPopupTop + 8, left: 8 }}
              onPick={applyWikiAutocompletePick}
            />
            <EntityNotesHighlightedEditor
            ref={textareaRef}
            id="entity-info-editor"
            value={notesEdit.text}
            onChange={(e) => {
              toolbarSyncedFromChangeRef.current = true;
              recordAndSetDraft(e.target.value);
              setEditorCaret(e.target.selectionStart);
              setToolbarState(
                getEntityNotesToolbarState(e.target.value, e.target.selectionStart, e.target.selectionEnd)
              );
            }}
            className="h-full min-h-0 w-full"
            style={{
              fontFamily: getEntityNotesFontStack(notesTypo.fontKey),
              fontSize: `${notesTypo.sizePx}px`,
            }}
            placeholder="Hạ bút khắc ấn..."
            selfEntityId={selfEntityId}
            entityMap={entityMap}
            onKeyDown={handleEditorKeyDown}
            onKeyUp={syncToolbarStateFromEditor}
            onClick={syncToolbarStateFromEditor}
            onSelect={syncToolbarStateFromEditor}
            onPaste={handleEditorPaste}
            onScroll={handleEditorScroll}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
          />
          </div>
          {isSplitPreview && (
            <MarkdownPreviewPane
              text={debouncedMarkdownPreview}
              dirHandle={currentContextDirHandle}
              entityMap={entityMap}
              activeNovelData={activeNovelData}
              linkRegex={globalLinkRegex}
              onNavigate={onNavigate}
              selfEntityId={selfEntityId}
              wikiLinkOptOuts={effectiveWikiLinkOptOuts}
              variant="entityNotes"
              containerRef={previewScrollRef}
              onScroll={handlePreviewScroll}
              onJumpToAnchor={(item) => jumpToEditorLine(item.line)}
              onJumpToLine={jumpToEditorLine}
              onEditMarkdownTable={setTableEditIndex}
              className="h-full min-h-0 w-1/2 overflow-y-auto overscroll-contain custom-scrollbar border-l border-slate-700 pl-4 font-serif"
            />
          )}
        </div>
      </div>
      <EntityNotesMarkdownTableEditModal
        isOpen={tableEditIndex != null && tableEditBlock != null}
        tableBlock={tableEditBlock}
        onClose={() => setTableEditIndex(null)}
        onApply={handleApplyMarkdownTableEdit}
        entityMap={entityMap}
        selfEntityId={selfEntityId}
      />
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
  activeNovelData = null,
  statusTierLabelSet = null,
  globalLinkRegex,
  onNavigate,
  detailNotesMarkdown = '',
  entityFilterFields = [],
  notesTabFieldBuckets = [],
  AdvancedFieldSelect: AdvancedFieldSelectCmp = null,
  entityTemplateHint = '',
  onOpenAutoSyncGuide,
  onOpenEntityNotesGuide,
  detailProfileMode = 'original',
  onChangeDetailProfileMode = null,
  canViewTimelineCurrentProfile = false,
  timelineCurrentProfileLabel = '',
  onOpenTimelineCurrentEdit = null,
  memberNotesEditTarget = null,
  onSaveMemberNotes = null,
  onCancelMemberNotesEdit = null,
  listViewConfig = null,
  listCardAutoViewModel = null,
  entitySearch: collectionEntitySearch = '',
  setEntitySearch: setCollectionEntitySearch = null,
  entitySortMode: collectionEntitySortMode = 'name_asc',
  setEntitySortMode: setCollectionEntitySortMode = null,
  onListCardEntitySelect = null,
  setEntityPage: setCollectionEntityPage = null,
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
  const isMemberNotesEditing = Boolean(memberNotesEditTarget?.id);
  const memberNotesName = safeString(memberNotesEditTarget?.name).trim() || 'Thẻ con';
  const isCurrentTimelineMode = !isMemberNotesEditing && detailProfileMode === 'current';
  const [isAutoControlsExpanded, setIsAutoControlsExpanded] = useState(false);
  const [showNotesAdvancedPanel, setShowNotesAdvancedPanel] = useState(false);
  const [notesViewQuery, setNotesViewQuery] = useState('');
  const [listCatalogQuery, setListCatalogQuery] = useState('');
  const [notesAdvFieldId, setNotesAdvFieldId] = useState('none');
  const [notesNotesSortMode, setNotesNotesSortMode] = useState('none');
  const [notesViewFieldFilters, setNotesViewFieldFilters] = useState(() => ({}));
  const notesAdvToggleRef = useRef(null);
  const notesAdvPanelRef = useRef(null);
  const [readTableEditIndex, setReadTableEditIndex] = useState(null);
  const [editInfoBootstrap, setEditInfoBootstrap] = useState(null);

  const notesFilterOptions = useMemo(
    () => [
      { value: 'none', label: 'Không lọc theo trường' },
      ...(entityFilterFields || [])
        .filter((f) => f && safeString(f.id).trim())
        .map((f) => ({
          value: f.id,
          label: `Lọc: ${safeString(f.label || f.id)}`,
        })),
    ],
    [entityFilterFields]
  );

  const valueBucket = useMemo(
    () => (notesTabFieldBuckets || []).find((b) => b.id === notesAdvFieldId),
    [notesTabFieldBuckets, notesAdvFieldId]
  );

  const filteredNotesRead = useMemo(() => {
    const fr = filterEntityNotesMarkdown(detailNotesMarkdown, {
      searchQuery: notesViewQuery,
      fieldValueFilters: notesViewFieldFilters,
    });
    const text = sortMarkdownSectionsAfterFilter(fr.text, notesNotesSortMode);
    return { ...fr, text };
  }, [detailNotesMarkdown, notesViewFieldFilters, notesViewQuery, notesNotesSortMode]);

  useEffect(() => {
    queueMicrotask(() => {
      setNotesViewQuery('');
      setListCatalogQuery('');
      setNotesViewFieldFilters({});
      setNotesAdvFieldId('none');
      setNotesNotesSortMode('none');
      setShowNotesAdvancedPanel(false);
    });
  }, [detailProfileMode, memberNotesEditTarget?.id, selectedEntity?.id]);

  const clearNotesAdvanced = useCallback(() => {
    setNotesViewQuery('');
    setListCatalogQuery('');
    setNotesAdvFieldId('none');
    setNotesNotesSortMode('none');
    setNotesViewFieldFilters({});
    setCollectionEntitySearch?.('');
    setCollectionEntitySortMode?.('name_asc');
  }, [setCollectionEntitySearch, setCollectionEntitySortMode]);

  const hasFieldFilterApplied =
    !isListCardEntity(selectedEntity) && Object.keys(notesViewFieldFilters).length > 0;
  const listCardUsesCollectionQuery =
    isListCardEntity(selectedEntity) &&
    listCardAutoViewModel &&
    typeof setCollectionEntitySearch === 'function';
  const hasTextSearch = listCardUsesCollectionQuery
    ? safeString(collectionEntitySearch).trim()
    : isListCardEntity(selectedEntity)
      ? safeString(listCatalogQuery).trim()
      : safeString(notesViewQuery).trim();
  const listCardSortMode = listCardUsesCollectionQuery
    ? safeString(collectionEntitySortMode) || 'name_asc'
    : notesNotesSortMode;
  const isNotesFilterActive = Boolean(
    hasFieldFilterApplied ||
      hasTextSearch ||
      (listCardUsesCollectionQuery
        ? collectionEntitySortMode !== 'name_asc'
        : notesNotesSortMode !== 'none')
  );
  const listViewMode = listViewConfig?.mode === 'table' ? 'table' : 'list';

  const appliedFieldEntry = hasFieldFilterApplied ? Object.entries(notesViewFieldFilters)[0] : null;
  const appliedFieldLabel =
    appliedFieldEntry &&
    safeString(
      entityFilterFields.find((f) => f?.id === appliedFieldEntry[0])?.label || appliedFieldEntry[0]
    );

  useEffect(() => {
    if (isCurrentTimelineMode && isEntityEditing) {
      setIsEntityEditing(false);
    }
  }, [isCurrentTimelineMode, isEntityEditing, setIsEntityEditing]);

  useEffect(() => {
    if (!isEntityEditing) setEditInfoBootstrap(null);
  }, [isEntityEditing]);

  const readMarkdownTableBlock = useMemo(() => {
    if (readTableEditIndex == null || isEntityEditing) return null;
    return getMarkdownTableBlockByIndex(safeString(detailNotesMarkdown), readTableEditIndex)?.block ?? null;
  }, [detailNotesMarkdown, isEntityEditing, readTableEditIndex]);

  const handleReadModeTableApply = useCallback(
    (replacementMarkdown) => {
      if (readTableEditIndex == null) return;
      const next = replaceMarkdownTableBlockByIndex(
        safeString(detailNotesMarkdown),
        readTableEditIndex,
        replacementMarkdown,
      );
      setEditInfoBootstrap(next);
      setReadTableEditIndex(null);
      setLivePreviewText(next);
      setDebouncedMarkdownPreview(next);
      setIsEntityEditing(true);
    },
    [
      detailNotesMarkdown,
      readTableEditIndex,
      setDebouncedMarkdownPreview,
      setIsEntityEditing,
      setLivePreviewText,
    ],
  );

  const readModeNotesPreviewBlocks = useMemo(() => {
    if (!selectedEntity || filteredNotesRead.emptyMatch || isListCardEntity(selectedEntity)) return null;
    const canEditTable = !isEntityEditing && !isNotesFilterActive;
    return buildEntityNotesPreviewModel(
      filteredNotesRead.text,
      currentContextDirHandle,
      entityMap,
      globalLinkRegex,
      onNavigate,
      selectedEntity.id,
      {
        wikiLinkOptOuts: readWikiLinkOptOuts(selectedEntity),
        activeNovelData,
        onEditMarkdownTable: canEditTable ? setReadTableEditIndex : null,
      },
    ).blocks;
  }, [
    activeNovelData,
    currentContextDirHandle,
    entityMap,
    filteredNotesRead.emptyMatch,
    filteredNotesRead.text,
    globalLinkRegex,
    isEntityEditing,
    isNotesFilterActive,
    onNavigate,
    selectedEntity,
  ]);

  useEffect(() => {
    if (!showNotesAdvancedPanel) return undefined;
    const onMouseDown = (e) => {
      const t = e.target;
      if (notesAdvPanelRef.current?.contains(t)) return;
      if (notesAdvToggleRef.current?.contains(t)) return;
      setShowNotesAdvancedPanel(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [showNotesAdvancedPanel]);

  const editSessionTarget = isMemberNotesEditing ? memberNotesEditTarget : selectedEntity;
  const editSessionInfo = safeString(editInfoBootstrap ?? editSessionTarget?.info);
  const editSessionSubject = isMemberNotesEditing ? memberNotesName : safeString(selectedEntity?.name);
  const editSessionWikiLinkOptOuts = readWikiLinkOptOuts(editSessionTarget);
  const editSessionKey = isMemberNotesEditing
    ? `${selectedEntity?.id || 'entity'}:member:${memberNotesEditTarget?.id || 'none'}`
    : `${selectedEntity?.id || 'entity'}:${detailProfileMode}${editInfoBootstrap ? ':table-edit' : ''}`;
  const handleEditSessionSave = isMemberNotesEditing
    ? (text, meta) => onSaveMemberNotes?.(text, meta)
    : handleUpdateEntityInfo;

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
              {isMemberNotesEditing
                ? `Đang sửa ghi chú thẻ con: ${memberNotesName}`
                : getTerms(activeTabLon).infoDesc}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {!isMemberNotesEditing && typeof onChangeDetailProfileMode === 'function' && (
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
          {!isEntityEditing && selectedEntity && (
            <>
              <button
                ref={notesAdvToggleRef}
                type="button"
                onClick={() => setShowNotesAdvancedPanel((v) => !v)}
                aria-expanded={showNotesAdvancedPanel}
                aria-controls="notes-advanced-panel"
                title={
                  isListCardEntity(selectedEntity)
                    ? 'Tìm trong danh mục thẻ — gõ từ khóa để lọc dòng'
                    : 'Tìm trong ghi chép và lọc theo trường (giống Nâng cao ở danh sách thẻ)'
                }
                className={`${NOTES_ADV_TOOLBAR_BTN} ${
                  showNotesAdvancedPanel
                    ? 'bg-amber-900/30 border-amber-700/50 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Filter size={13} /> Nâng cao
              </button>
              {isNotesFilterActive && (
                <button
                  type="button"
                  onClick={clearNotesAdvanced}
                  className={`${NOTES_ADV_TOOLBAR_BTN} bg-slate-900 border-slate-700 text-slate-300 hover:text-slate-100`}
                >
                  Tắt lọc
                </button>
              )}
            </>
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

      {!isEntityEditing && selectedEntity && isNotesFilterActive && (
        <div className="flex items-center gap-2 flex-wrap mb-3 text-[11px]">
          {hasFieldFilterApplied && appliedFieldEntry && (
            <span className="px-2.5 py-1 rounded-full border border-cyan-700/50 bg-cyan-950/30 text-cyan-200">
              Lọc: {appliedFieldLabel} = &quot;{String(appliedFieldEntry[1]).trim()}&quot;
            </span>
          )}
          {hasTextSearch && (
            <span className="px-2.5 py-1 rounded-full border border-amber-700/50 bg-amber-950/30 text-amber-200">
              Tìm: &quot;
              {(listCardUsesCollectionQuery
                ? collectionEntitySearch
                : isListCardEntity(selectedEntity)
                  ? listCatalogQuery
                  : notesViewQuery
              ).trim()}&quot;
            </span>
          )}
        </div>
      )}

      {showNotesAdvancedPanel && !isEntityEditing && selectedEntity && (
        <div
          ref={notesAdvPanelRef}
          id="notes-advanced-panel"
          className="mb-5 overflow-visible rounded-2xl border border-slate-800/90 bg-slate-950/90 p-3.5 shadow-xl space-y-2.5 animate-fade-fast"
        >
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
              aria-hidden
            />
            <input
              type="search"
              value={
                listCardUsesCollectionQuery
                  ? collectionEntitySearch
                  : isListCardEntity(selectedEntity)
                    ? listCatalogQuery
                    : notesViewQuery
              }
              onChange={(e) => {
                const v = e.target.value;
                if (listCardUsesCollectionQuery) setCollectionEntitySearch(v);
                else if (isListCardEntity(selectedEntity)) setListCatalogQuery(v);
                else setNotesViewQuery(v);
              }}
              placeholder={
                isListCardEntity(selectedEntity)
                  ? 'Gõ để lọc dòng: tên thẻ, chuỗi hiển thị…'
                  : 'Tìm trong ghi chép...'
              }
              autoComplete="off"
              className="tt-kbd-focus h-9 w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 text-[12px] font-serif outline-none focus:border-amber-600/50 text-slate-200 placeholder:text-slate-500"
              aria-label={
                isListCardEntity(selectedEntity)
                  ? 'Lọc dòng trong danh mục thẻ'
                  : 'Tìm trong nội dung ghi chép'
              }
            />
          </div>
          {isListCardEntity(selectedEntity) ? (
            <div className="grid grid-cols-1 gap-2.5 overflow-visible sm:grid-cols-2">
              <select
                value={listCardSortMode}
                onChange={(e) => {
                  const v = e.target.value;
                  if (listCardUsesCollectionQuery) {
                    setCollectionEntitySortMode?.(v === 'name_desc' ? 'name_desc' : 'name_asc');
                  } else setNotesNotesSortMode(v);
                }}
                className="tt-kbd-focus h-9 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 text-[12px] font-serif outline-none focus:border-amber-600/50 text-slate-200"
                aria-label="Sắp xếp dòng danh mục"
              >
                {!listCardUsesCollectionQuery ? <option value="none">Thứ tự gốc</option> : null}
                <option value="name_asc">A-Z (dòng)</option>
                <option value="name_desc">Z-A (dòng)</option>
              </select>
              <p className="text-[11px] text-slate-500 font-serif leading-relaxed self-center">
                {listCardUsesCollectionQuery
                  ? 'Tìm/lọc/sắp xếp dùng chung với lưới Danh sách phía trên.'
                  : 'Gõ vào ô tìm → chỉ còn các dòng danh mục khớp (không phân biệt dấu).'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-2.5 overflow-visible sm:grid-cols-2 lg:grid-cols-3">
                {AdvancedFieldSelectCmp ? (
                  <AdvancedFieldSelectCmp
                    value={notesAdvFieldId}
                    onChange={(v) => {
                      setNotesAdvFieldId(v);
                      setNotesViewFieldFilters({});
                    }}
                    options={notesFilterOptions}
                    active={notesAdvFieldId !== 'none'}
                  />
                ) : (
                  <select
                    value={notesAdvFieldId}
                    onChange={(e) => {
                      const v = e.target.value;
                      setNotesAdvFieldId(v);
                      setNotesViewFieldFilters({});
                    }}
                    className={`tt-kbd-focus h-9 w-full rounded-xl border px-3 text-[12px] font-serif outline-none cursor-pointer ${
                      notesAdvFieldId !== 'none'
                        ? 'bg-amber-900/30 border-amber-700/50 text-amber-100'
                        : 'bg-slate-900 border-slate-800 text-slate-200'
                    }`}
                  >
                    {notesFilterOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                )}
                <select
                  value={safeString(notesViewFieldFilters[notesAdvFieldId] || '')}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) setNotesViewFieldFilters({});
                    else setNotesViewFieldFilters({ [notesAdvFieldId]: v });
                  }}
                  disabled={
                    notesAdvFieldId === 'none' || !(valueBucket?.values && valueBucket.values.length > 0)
                  }
                  className="tt-kbd-focus h-9 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 text-[12px] font-serif outline-none focus:border-cyan-600/50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200"
                  aria-label="Chọn giá trị lọc theo trường"
                >
                  <option value="">
                    {notesAdvFieldId === 'none'
                      ? 'Chọn trường trước…'
                      : !(valueBucket?.values && valueBucket.values.length)
                        ? 'Chưa có giá trị trên tab'
                        : 'Chọn giá trị…'}
                  </option>
                  {(valueBucket?.values || []).map((val) => (
                    <option key={val} value={val}>
                      {val.length > 80 ? `${val.slice(0, 77)}…` : val}
                    </option>
                  ))}
                </select>
                <select
                  value={notesNotesSortMode}
                  onChange={(e) => setNotesNotesSortMode(e.target.value)}
                  className="tt-kbd-focus h-9 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 text-[12px] font-serif outline-none focus:border-amber-600/50 text-slate-200"
                  aria-label="Sắp xếp sau khi lọc"
                >
                  <option value="none">Thứ tự gốc</option>
                  <option value="name_asc">A-Z (mục / dòng)</option>
                  <option value="name_desc">Z-A (mục / dòng)</option>
                </select>
              </div>
              <p className="text-[11px] text-slate-500 font-serif leading-relaxed">
                Lưu ý: <span className="text-slate-400">Tìm</span> và{' '}
                <span className="text-slate-400">lọc theo trường</span> được áp dụng đồng thời; sắp xếp áp
                dụng sau lọc.
              </p>
            </>
          )}
        </div>
      )}

      {!isMemberNotesEditing && selectedEntity && autoSyncControls.length > 0 && typeof handleSetSelectedEntityAutoSyncState === 'function' && (
        <div className="mb-5 rounded-[32px] border border-cyan-800/40 bg-cyan-950/15 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-cyan-200 font-semibold text-sm">
              <Lock size={15} />
              AUTO cho thẻ này
              {autoSyncRoleLabel && (
                <span className="rounded-full border border-cyan-800/40 bg-slate-950/50 px-2.5 py-0.5 text-[11px] uppercase tracking-wide text-cyan-100">
                  {autoSyncRoleLabel}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsAutoControlsExpanded((prev) => !prev)}
              className="rounded-full border border-cyan-800/50 bg-slate-950/50 px-3 py-1.5 text-[11px] font-bold text-cyan-100 hover:bg-cyan-950/30"
            >
              {isAutoControlsExpanded ? 'Ẩn tùy chỉnh AUTO' : 'Xem tùy chỉnh AUTO'}
            </button>
          </div>
          {isAutoControlsExpanded ? (
            <>
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
            </>
          ) : (
            <p className="mt-2 text-[12px] text-cyan-100/80 font-serif leading-relaxed">
              Khối tùy chỉnh AUTO đang được thu gọn. Bấm <strong>Xem tùy chỉnh AUTO</strong> khi bạn cần bật/tắt theo từng engine.
            </p>
          )}
        </div>
      )}

      <div
        className={`flex flex-col transition-all duration-300 backdrop-blur-md ${
          isEntityEditing
            ? isMemberNotesEditing
              ? 'bg-slate-900 border border-violet-700/55 shadow-[0_0_15px_rgba(124,58,237,0.12)] p-6 rounded-[40px]'
              : 'bg-slate-900 border border-amber-700/50 shadow-[0_0_15px_rgba(217,119,6,0.1)] p-6 rounded-[40px]'
            : 'bg-slate-900/30 border border-slate-800/60 p-8 rounded-[40px]'
        }`}
      >
        {isEntityEditing && selectedEntity && !isCurrentTimelineMode ? (
          <EntityNotesEditSession
            key={editSessionKey}
            activeTabLon={activeTabLon}
            activeTabNho={activeTabNho}
            initialInfo={editSessionInfo}
            savedInfo={editSessionInfo}
            wikiLinkOptOuts={editSessionWikiLinkOptOuts}
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
            handleUpdateEntityInfo={handleEditSessionSave}
            setIsEntityEditing={setIsEntityEditing}
            debouncedMarkdownPreview={debouncedMarkdownPreview}
            currentContextDirHandle={currentContextDirHandle}
            entityMap={entityMap}
            activeNovelData={activeNovelData}
            statusTierLabelSet={statusTierLabelSet}
            globalLinkRegex={globalLinkRegex}
            onNavigate={onNavigate}
            selfEntityId={selectedEntity.id}
            entityNotesSubject={editSessionSubject}
            entityTemplateHint={entityTemplateHint}
            onOpenAutoSyncGuide={onOpenAutoSyncGuide}
            onOpenEntityNotesGuide={onOpenEntityNotesGuide}
            editingContext={isMemberNotesEditing ? {
              label: `Đang sửa ghi chú thẻ con: ${memberNotesName}`,
              description: `Nội dung đang lưu riêng trong thẻ con thuộc ${safeString(selectedEntity?.name) || 'thẻ cha'}.`,
            } : null}
            onCancelEdit={isMemberNotesEditing ? onCancelMemberNotesEdit : null}
            saveButtonLabel={isMemberNotesEditing ? 'Lưu vào thẻ con' : 'Lưu ghi chép'}
            allowImageTools={!isMemberNotesEditing}
          />
        ) : (
          <div className="font-serif prose prose-invert max-w-none animate-fade-in min-h-[200px]">
            {selectedEntity && isListCardEntity(selectedEntity) ? (
              <AppListCardInfoSearch
                info={detailNotesMarkdown}
                searchQuery={
                  listCardUsesCollectionQuery ? collectionEntitySearch : listCatalogQuery
                }
                onSearchQueryChange={
                  listCardUsesCollectionQuery ? setCollectionEntitySearch : setListCatalogQuery
                }
                hideSearchBar
                sortMode={listCardSortMode}
                dirHandle={currentContextDirHandle}
                entityMap={entityMap}
                linkRegex={globalLinkRegex}
                onNavigate={onNavigate}
                selfEntityId={selectedEntity.id}
                activeNovelData={activeNovelData}
                listViewMode={listViewMode}
                collectionViewModel={listCardUsesCollectionQuery ? listCardAutoViewModel : null}
                onEntitySelect={onListCardEntitySelect}
                setEntityPage={listCardUsesCollectionQuery ? setCollectionEntityPage : null}
              />
            ) : filteredNotesRead.emptyMatch ? (
              <p className="text-sm text-slate-500 font-serif">
                Không có mục nào trong ghi chép khớp bộ lọc hiện tại.
              </p>
            ) : (
              <div className="font-serif max-w-none min-h-[200px]">{readModeNotesPreviewBlocks}</div>
            )}
          </div>
        )}
      </div>
      <EntityNotesMarkdownTableEditModal
        isOpen={readTableEditIndex != null && readMarkdownTableBlock != null && !isEntityEditing}
        tableBlock={readMarkdownTableBlock}
        onClose={() => setReadTableEditIndex(null)}
        onApply={handleReadModeTableApply}
        entityMap={entityMap}
        selfEntityId={selectedEntity?.id ?? null}
      />
    </div>
  );
});
