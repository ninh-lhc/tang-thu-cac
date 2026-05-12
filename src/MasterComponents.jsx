// ==========================================
// TRỤ 3: HÌNH THỂ GIAO DIỆN & MODAL
// File: MasterComponents.jsx
// Vai trò: UI components tĩnh + tất cả Modal
// ==========================================

import React, { useState, useMemo, useEffect, useRef, memo, useSyncExternalStore, useCallback, useId } from 'react';
import {
  Menu, Search, BookOpen, Filter, ChevronRight,
  Settings, Network, Plus, Trash2, X, Save,
  Check, Library, Sparkles, Bold, Italic, Heading1, Heading2, List as ListIcon,
  FolderOpen, Cloud, Upload, HardDrive, Clock, Shield, Download, UploadCloud,
  Image as ImageIcon, History, LayoutGrid, Link2, ScrollText, User,
  Undo2, Redo2, Underline, Strikethrough, Highlighter, ListOrdered, Quote,
  TrendingUp, BarChart2, BookMarked, Users, Layers, Activity, Eye, AlertTriangle,
  GitBranch, ZoomIn, ZoomOut, Maximize2, RefreshCw, SlidersHorizontal, Atom, Edit2, Command, Type,
} from 'lucide-react';
import {
  FALLBACK_IMG, GENRES, THEMES,
  resolveFieldsTemplate,
  WIKI_ALIAS_FIELD,
} from './MasterEngines.js';
import { AppEntityTemplateFieldEditor } from './AppEntityTemplateFieldEditor.jsx';
import { AppEntityQuickEntryConfig } from './AppEntityQuickEntryConfig.jsx';
import {
  normalizeSuggestionRows,
  serializeSuggestionRows,
  countSuggestionRows,
  suggestionRowsToValues,
} from './lib/suggestionRowFormat.js';
import { FIELD_SOURCE_KIND, getFieldSourceDescriptor, resolveFieldValueSource } from './lib/fieldValueSources.js';
import {
  safeString, getTerms, AsyncLocalImage,
  handleToolbarClick,
  handleToolbarSmartWrap,
  handleToolbarInsertText,
  handleToolbarApplyColor,
  handleToolbarToggleLinePrefix,
  analyzeTextWithAI,
  callGeminiAPIText,
  getEntityNotesToolbarState,
  resolveEntityNotesBackspace,
  resolveEntityNotesLineBreak,
  resolveEntityNotesTabIndent,
  suggestWikiLinkSpotsWithAI,
  truncateForAI,
  mapGeminiErrorToUserMessage,
} from './MasterUtils.jsx';
import { applyWikiLinkSpots } from './lib/applyWikiLinkSpots.js';
import { autoWrapWikiLinksByEntityMapWithCount } from './lib/autoWrapWikiLinks.js';
import { MILESTONE_LABELS } from './lib/milestoneLabels.js';
import { MarkdownPreviewPane } from './MarkdownPreviewPane.jsx';
import {
  OWNER_HINT_INPUT_FORMAT_TEXT,
  OWNER_HINT_PREFIX_GUIDE_TEXT,
  OWNER_TOKEN_GUIDE_TEXT,
} from './lib/autoOwnerMilestone.js';
import { isCultivationRelationScope } from './lib/cultivationRelationSync.js';
import { isMapCollectionScope } from './lib/mapHierarchySync.js';
import { isForceCollectionScope } from './lib/theLucBanDoSync.js';
import { inferForceSystemLabel } from './lib/forceRankLadder.js';
import {
  collectMapSubTabsForForceUi,
  getMapSubTabForceRankSuggestions,
  listMapTabEntityNames,
  matchMapSubTabByRealmInput,
} from './lib/mapTabForceBridge.js';
import { getMapFieldPlaceholders } from './lib/mapEntityFieldPresets.js';
import { collectMapEntityHints } from './lib/mapEntityHints.js';
import { resolveEntityQuickSlots } from './lib/entityQuickEntrySlots.js';
import {
  composeMapTemplateDisplayLine,
  inferMapQuickSystemFromStoredStatus,
} from './lib/composeMapTemplateDisplayLine.js';
import {
  FORCE_QUICK_SLOTS,
  MAP_QUICK_SLOTS,
  mergeCollectionQuickSlotFieldsIntoTemplate,
  resolveMainFormLabels,
  resolveQuickSlotLabels,
} from './lib/modalEntityQuickLabels.js';
import {
  normalizeAsciiText,
  splitMapHierarchyTokens,
  splitStatusHierarchyTokens,
} from './lib/statusHierarchyParser.js';
import { composeForceQuickDisplayLine, extractForceQuickRankLabel } from './lib/forceQuickDisplayParse.js';
import { inferOrgTypeFromContext, inferOrgTypeFromTabSlug } from './lib/forceOrgTypeInfer.js';
import { mergeTabsByGenres } from './genreTabsMap.js';
import { getGenreTabsTemplate } from './lib/genreTabsTemplateStore.js';
import { resolveTabsConfigForGenreSelection } from './lib/resolveTabsConfigForGenreSelection.js';
import { searchNovelData, dedupeDeepSearchResults, metadataSearchHits } from './deepSearchCore.js';
import { useFocusTrap } from './lib/useFocusTrap.js';
import {
  ENTITY_NOTES_FONT_OPTIONS,
  ENTITY_NOTES_FONT_SIZE_OPTIONS,
  getEntityNotesFontStack,
  getEntityNotesPrefs,
  setEntityNotesPrefs,
  subscribeEntityNotesPrefs,
} from './lib/entityNotesPrefs.js';
import {
  ENTITY_NOTES_CALLOUT_BUTTONS,
  ENTITY_NOTES_COLOR_PRESETS,
  ENTITY_NOTES_LABEL_VALUE_PRESETS,
  ENTITY_NOTES_SEMANTIC_TEMPLATES,
  buildEntityNotesCalloutBlock,
  resolveEntityNotesTemplateProfile,
} from './lib/entityNotesSemantics.js';
import { cleanupEntityNotesText } from './lib/entityNotesTextCleanup.js';
import {
  applyEntityNotesDiagnosticFix,
  collectEntityNotesDiagnostics,
  fixAllEntityNotesDiagnostics,
} from './lib/entityNotesDiagnostics.js';
import { syncEntityNotesDuplicateWordFormatting } from './lib/entityNotesDuplicateWordFormatting.js';

const preventToolbarFocusSteal = (e) => e.preventDefault();

const ENTITY_NOTES_LABELS = {
  h3Title: 'Ti\u1ec3u m\u1ee5c / nh\u1ea5n nh\u1ecbp H3',
  dividerTitle: 'D\u1ea5u ph\u00e2n c\u00e1ch',
  templateRow: 'M\u1eabu nhanh',
  templateButton: 'Khung ph\u00e2n t\u00edch',
  templateTitle: 'Ch\u00e8n khung ghi ch\u00fa ph\u00e2n t\u00edch d\u1ecdc cho n\u1ed9i dung d\u00e0i',
  bigSectionButton: 'M\u1ee5c l\u1edbn',
  bigSectionTitle: 'Ch\u00e8n m\u1ed9t m\u1ee5c l\u1edbn \u0111\u00e1nh s\u1ed1 ki\u1ec3u ph\u00e2n t\u00edch',
  subSectionButton: 'Ti\u1ec3u m\u1ee5c',
  subSectionTitle: 'Ch\u00e8n ti\u1ec3u m\u1ee5c chuy\u1ec3n nh\u1ecbp',
  summaryButton: 'T\u1ed5ng k\u1ebft',
  summaryTitle: 'Ch\u00e8n d\u00f2ng t\u1ed5ng k\u1ebft / l\u01b0u \u00fd',
  colorRow: 'M\u00e0u ch\u1eef',
  colorButton: 'T\u00f4 m\u00e0u',
  colorTitle: 'T\u00f4 m\u00e0u cho \u0111o\u1ea1n \u0111ang ch\u1ecdn',
  colorPickerTitle: 'Ch\u1ecdn m\u00e0u ch\u1eef theo \u00fd th\u00edch',
  boldPairTitle: 'B\u1ecdc \u0111\u1eadm th\u00f4ng minh b\u1eb1ng c\u1eb7p ****',
  semanticRow: 'Khung ng\u1eef ngh\u0129a',
  labelValueRow: 'Nhãn nhanh',
  presetColorRow: 'Màu preset',
  calloutRow: 'Callout',
};

const ENTITY_NOTES_TOOL_GROUPS = [
  { id: 'compose', label: 'Soạn', icon: Type },
  { id: 'templates', label: 'Mẫu', icon: Sparkles },
  { id: 'semantics', label: 'Ngữ nghĩa', icon: Layers },
  { id: 'colors', label: 'Màu', icon: SlidersHorizontal },
  { id: 'callouts', label: 'Callout', icon: ScrollText },
];

const DEFAULT_ENTITY_NOTES_COLOR = '#c084fc';
const ENTITY_NOTES_COLOR_PLACEHOLDER = '\u0111o\u1ea1n c\u1ea7n t\u00f4 m\u00e0u';

const stripBracketedSubject = (rawSubject) =>
  safeString(rawSubject).trim().replace(/^\[\[/, '').replace(/\]\]$/, '');

const buildEntityNotesAnalysisTemplate = (subject) => {
  const safeSubject = stripBracketedSubject(subject) || '\u0111\u1ed1i t\u01b0\u1ee3ng';
  return [
    `D\u01b0\u1edbi \u0111\u00e2y l\u00e0 chi ti\u1ebft tr\u00edch xu\u1ea5t v\u1ec1 [[${safeSubject}]]:`,
    '',
    `**1. Kh\u00e1i qu\u00e1t v\u00e0 \u0111\u1ecbnh v\u1ecb**`,
    '',
    `- **\u0110\u1ecbnh ngh\u0129a / ph\u1ea1m vi:** `,
    `- **V\u1ecb tr\u00ed trong b\u1ed1i c\u1ea3nh l\u1edbn:** `,
    '',
    `**2. C\u1ea5u tr\u00fac v\u00e0 ph\u00e2n t\u1ea7ng**`,
    '',
    `- **C\u00e1c t\u1ea7ng / nh\u00e1nh ch\u00ednh:** `,
    `- **\u0110i\u1ec3m kh\u00e1c bi\u1ec7t then ch\u1ed1t:** `,
    '',
    `**3. T\u00e1c \u0111\u1ed9ng v\u00e0 li\u00ean h\u1ec7**`,
    '',
    `- **\u1ea2nh h\u01b0\u1edfng n\u1ed5i b\u1eadt:** `,
    `- **Li\u00ean h\u1ec7 \u0111\u00e1ng ch\u00fa \u00fd:** `,
    '',
    `> T\u1ed5ng k\u1ebft ng\u1eafn: `,
  ].join('\n');
};

export const MarkdownToolbar = ({
  editorId,
  onInsertImage,
  onPickLocalImage,
  variant = 'standard',
  onUndo,
  onRedo,
  undoDisabled,
  redoDisabled,
  onEditorContentChange,
  notesFontKey,
  notesFontSizePx,
  onNotesFontKey,
  onNotesFontSizePx,
  entityNotesSubject = '',
  entityNotesToolbarState = {},
  entityNotesTemplateProfile = null,
  notesAutoCleanOnSave = true,
  onNotesAutoCleanOnSave,
  onAiFormatStructure,
}) => {
  const sync = onEditorContentChange;
  const tb = (before, after) => () => handleToolbarClick(before, after, editorId, sync);
  const smartWrap = (marker) => () => handleToolbarSmartWrap(marker, editorId, sync);
  const linePref = (p) => () => handleToolbarToggleLinePrefix(editorId, p, sync);
  const [customTextColor, setCustomTextColor] = useState(DEFAULT_ENTITY_NOTES_COLOR);
  const [entityNotesPanel, setEntityNotesPanel] = useState('compose');
  const applyColor = () => handleToolbarApplyColor(customTextColor, editorId, sync, ENTITY_NOTES_COLOR_PLACEHOLDER);
  const insertEntityNotesTemplate = () => {
    const textarea = document.getElementById(editorId);
    const selectedText =
      textarea && textarea.selectionStart !== textarea.selectionEnd
        ? textarea.value.substring(textarea.selectionStart, textarea.selectionEnd)
        : '';
    const templateText = buildEntityNotesAnalysisTemplate(selectedText || entityNotesSubject);
    handleToolbarInsertText(templateText, editorId, sync);
  };
  const insertSemanticTemplate = (templateText) => () =>
    handleToolbarInsertText(`${templateText}\n\n`, editorId, sync);
  const insertLabelValue = (lineText) => () =>
    handleToolbarInsertText(lineText, editorId, sync);
  const applyPresetColor = (colorValue) => () => {
    setCustomTextColor(colorValue);
    handleToolbarApplyColor(colorValue, editorId, sync, ENTITY_NOTES_COLOR_PLACEHOLDER);
  };
  const insertCalloutBlock = (role, title) => () =>
    handleToolbarInsertText(`${buildEntityNotesCalloutBlock(role, title, [''])}\n\n`, editorId, sync);
  const baseIconButtonClass =
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-slate-400 transition-colors hover:bg-slate-800 hover:text-amber-400';
  const neutralChipClass =
    'inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition-colors hover:border-slate-500';
  const getActiveIconButtonClass = (active = false, accent = 'amber') => {
    if (!active) return baseIconButtonClass;
    const accentMap = {
      amber: 'border border-amber-700/50 bg-amber-950/30 text-amber-200',
      violet: 'border border-violet-700/50 bg-violet-950/30 text-violet-200',
      cyan: 'border border-cyan-700/50 bg-cyan-950/30 text-cyan-200',
      emerald: 'border border-emerald-700/50 bg-emerald-950/30 text-emerald-200',
    };
    return `${baseIconButtonClass} ${accentMap[accent] || accentMap.amber}`;
  };
  const getChipClass = (active = false, accent = 'violet') => {
    if (!active) return neutralChipClass;
    const accentMap = {
      violet: 'border-violet-700/50 bg-violet-950/35 text-violet-100',
      cyan: 'border-cyan-700/50 bg-cyan-950/35 text-cyan-100',
      amber: 'border-amber-700/50 bg-amber-950/30 text-amber-100',
      emerald: 'border-emerald-700/50 bg-emerald-950/30 text-emerald-100',
    };
    return `inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${accentMap[accent] || accentMap.violet}`;
  };
  const renderEntityNotesPanelContent = () => {
    if (entityNotesPanel === 'compose') {
      return (
        <>
          {onNotesFontKey && onNotesFontSizePx != null && (
            <>
              <label className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] text-slate-300">
                <span className="font-bold uppercase tracking-wider text-slate-500">Font</span>
                <select
                  value={notesFontKey}
                  onChange={(e) => onNotesFontKey(e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="max-w-[190px] bg-transparent text-slate-100 outline-none"
                  style={{ fontFamily: ENTITY_NOTES_FONT_OPTIONS.find((o) => o.id === notesFontKey)?.stack }}
                >
                  {ENTITY_NOTES_FONT_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id} style={{ fontFamily: o.stack }}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] text-slate-300">
                <span className="font-bold uppercase tracking-wider text-slate-500">Cỡ</span>
                <select
                  value={String(notesFontSizePx)}
                  onChange={(e) => onNotesFontSizePx(Number(e.target.value))}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-14 bg-transparent text-center font-mono text-slate-100 outline-none"
                >
                  {ENTITY_NOTES_FONT_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <button
            type="button"
            onMouseDown={preventToolbarFocusSteal}
            onClick={insertEntityNotesTemplate}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-violet-800/50 bg-violet-950/35 px-3 py-1.5 text-[11px] font-semibold text-violet-200 transition-colors hover:border-violet-600/60 hover:bg-violet-900/35"
            title={ENTITY_NOTES_LABELS.templateTitle}
          >
            <Sparkles size={13} />
            {ENTITY_NOTES_LABELS.templateButton}
          </button>
          {onNotesAutoCleanOnSave && (
            <button
              type="button"
              onMouseDown={preventToolbarFocusSteal}
              onClick={() => onNotesAutoCleanOnSave(!notesAutoCleanOnSave)}
              className={getChipClass(Boolean(notesAutoCleanOnSave), 'emerald')}
              title="Bật để tự chuẩn hoá ghi chú trước khi lưu"
            >
              {notesAutoCleanOnSave ? 'Tự sạch khi lưu' : 'Lưu nguyên văn'}
            </button>
          )}
          {onAiFormatStructure && (
            <button
              type="button"
              onMouseDown={preventToolbarFocusSteal}
              onClick={onAiFormatStructure}
              className={getChipClass(false, 'amber')}
              title="AI chỉ dàn lại bố cục: tiêu đề, mục, bullet, callout"
            >
              <Sparkles size={13} />
              AI dàn khung
            </button>
          )}
        </>
      );
    }
    if (entityNotesPanel === 'templates') {
      return (
        <>
          <button
            type="button"
            onMouseDown={preventToolbarFocusSteal}
            onClick={tb('**1. ', '**\n\n')}
            className={neutralChipClass}
            title={ENTITY_NOTES_LABELS.bigSectionTitle}
          >
            {ENTITY_NOTES_LABELS.bigSectionButton}
          </button>
          <button
            type="button"
            onMouseDown={preventToolbarFocusSteal}
            onClick={tb('### ', '\n\n')}
            className={neutralChipClass}
            title={ENTITY_NOTES_LABELS.subSectionTitle}
          >
            {ENTITY_NOTES_LABELS.subSectionButton}
          </button>
          <button
            type="button"
            onMouseDown={preventToolbarFocusSteal}
            onClick={tb('> T\u1ed5ng k\u1ebft: ', '')}
            className={neutralChipClass}
            title={ENTITY_NOTES_LABELS.summaryTitle}
          >
            {ENTITY_NOTES_LABELS.summaryButton}
          </button>
          <div className="mx-1 h-6 w-px shrink-0 bg-slate-800" />
          {ENTITY_NOTES_LABEL_VALUE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onMouseDown={preventToolbarFocusSteal}
              onClick={insertLabelValue(preset.text)}
              className={neutralChipClass}
              title={`Chèn nhanh ${preset.label}`}
            >
              {preset.label}
            </button>
          ))}
          {entityNotesTemplateProfile?.templates?.length > 0 && (
            <>
              <div className="mx-1 h-6 w-px shrink-0 bg-slate-800" />
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                {entityNotesTemplateProfile.label}
              </span>
              {entityNotesTemplateProfile.templates.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onMouseDown={preventToolbarFocusSteal}
                  onClick={insertSemanticTemplate(preset.text)}
                  className={getChipClass(false, 'violet')}
                  title={preset.title}
                >
                  {preset.label}
                </button>
              ))}
            </>
          )}
        </>
      );
    }
    if (entityNotesPanel === 'semantics') {
      return ENTITY_NOTES_SEMANTIC_TEMPLATES.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onMouseDown={preventToolbarFocusSteal}
          onClick={insertSemanticTemplate(preset.text)}
          className={neutralChipClass}
          title={preset.title}
        >
          {preset.label}
        </button>
      ));
    }
    if (entityNotesPanel === 'colors') {
      return (
        <>
          <button
            type="button"
            onMouseDown={preventToolbarFocusSteal}
            onClick={applyColor}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
              entityNotesToolbarState.color
                ? 'border-cyan-700/50 bg-cyan-950/35 text-cyan-100'
                : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-cyan-600/60 hover:text-cyan-200'
            }`}
            title={ENTITY_NOTES_LABELS.colorTitle}
          >
            <span className="text-sm font-black leading-none" style={{ color: customTextColor }}>A</span>
            {ENTITY_NOTES_LABELS.colorButton}
          </button>
          <label
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] text-slate-300"
            title={ENTITY_NOTES_LABELS.colorPickerTitle}
          >
            <input
              type="color"
              value={customTextColor}
              onChange={(e) => setCustomTextColor(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
            />
            <span className="font-mono uppercase tracking-wide text-slate-100">{customTextColor}</span>
          </label>
          <div className="mx-1 h-6 w-px shrink-0 bg-slate-800" />
          {ENTITY_NOTES_COLOR_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onMouseDown={preventToolbarFocusSteal}
              onClick={applyPresetColor(preset.color)}
              className={neutralChipClass}
              title={`Tô màu preset: ${preset.label}`}
            >
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.color }} />
              {preset.label}
            </button>
          ))}
        </>
      );
    }
    return ENTITY_NOTES_CALLOUT_BUTTONS.map((preset) => (
      <button
        key={preset.id}
        type="button"
        onMouseDown={preventToolbarFocusSteal}
        onClick={insertCalloutBlock(preset.role, preset.title)}
        className={neutralChipClass}
        title={`Chèn block ${preset.label}`}
      >
        {preset.label}
      </button>
    ));
  };

  return (
    <div className="mb-4 flex flex-col gap-3 border-b border-slate-800 pb-4">
      <div className="overflow-x-auto custom-scrollbar">
        <div className="flex min-w-max items-center gap-2 pr-1">
        {variant === 'entityNotes' && onUndo && onRedo && (
          <>
            <button
              type="button"
              onMouseDown={preventToolbarFocusSteal}
              onClick={onUndo}
              disabled={undoDisabled}
              className={`${baseIconButtonClass} disabled:pointer-events-none disabled:opacity-35`}
              title="Hoàn tác (Ctrl+Z)"
            >
              <Undo2 size={16} />
            </button>
            <button
              type="button"
              onMouseDown={preventToolbarFocusSteal}
              onClick={onRedo}
              disabled={redoDisabled}
              className={`${baseIconButtonClass} disabled:pointer-events-none disabled:opacity-35`}
              title="Làm lại (Ctrl+Y hoặc Ctrl+Shift+Z)"
            >
              <Redo2 size={16} />
            </button>
            <div className="w-px h-6 bg-slate-800 mx-1" />
          </>
        )}
        <button
          type="button"
          onMouseDown={preventToolbarFocusSteal}
          onClick={tb('**', '**')}
          className={getActiveIconButtonClass(Boolean(entityNotesToolbarState.bold))}
          title="In đậm"
        >
          <Bold size={16} />
        </button>
        {variant === 'entityNotes' && (
          <button
            type="button"
            onMouseDown={preventToolbarFocusSteal}
            onClick={smartWrap('**')}
            className={getActiveIconButtonClass(Boolean(entityNotesToolbarState.bold), 'violet')}
            title={ENTITY_NOTES_LABELS.boldPairTitle}
          >
            <span className="font-mono text-[11px] font-bold">**</span>
          </button>
        )}
        <button
          type="button"
          onMouseDown={preventToolbarFocusSteal}
          onClick={tb('*', '*')}
          className={getActiveIconButtonClass(Boolean(entityNotesToolbarState.italic))}
          title="In nghiêng"
        >
          <Italic size={16} />
        </button>
        {variant === 'entityNotes' && (
          <>
            <button
              type="button"
              onMouseDown={preventToolbarFocusSteal}
              onClick={tb('<u>', '</u>')}
              className={getActiveIconButtonClass(Boolean(entityNotesToolbarState.underline))}
              title="Gạch chân (HTML, xem Preview)"
            >
              <Underline size={16} />
            </button>
            <button
              type="button"
              onMouseDown={preventToolbarFocusSteal}
              onClick={tb('~~', '~~')}
              className={getActiveIconButtonClass(Boolean(entityNotesToolbarState.strikethrough))}
              title="Gạch ngang (~~...~~)"
            >
              <Strikethrough size={16} />
            </button>
            <button
              type="button"
              onMouseDown={preventToolbarFocusSteal}
              onClick={tb('`', '`')}
              className={getActiveIconButtonClass(Boolean(entityNotesToolbarState.code), 'emerald')}
              title="Mã inline"
            >
              <span className="font-mono text-sm font-bold">{'`'}</span>
            </button>
            <button
              type="button"
              onMouseDown={preventToolbarFocusSteal}
              onClick={tb('==', '==')}
              className={getActiveIconButtonClass(Boolean(entityNotesToolbarState.highlight))}
              title="Tô nền (highlight)"
            >
              <Highlighter size={16} />
            </button>
          </>
        )}
        <div className="w-px h-6 bg-slate-800 mx-1" />

        <button
          type="button"
          onMouseDown={preventToolbarFocusSteal}
          onClick={tb('[[', ']]')}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border shadow-inner transition-colors ${
            entityNotesToolbarState.wikiLink
              ? 'border-indigo-500/60 bg-indigo-900/60 text-indigo-100'
              : 'border-indigo-900/50 bg-indigo-950/50 text-indigo-500 hover:bg-indigo-900 hover:text-indigo-300'
          }`}
          title="Wiki Link: bôi đen chữ để bọc [[...]], hoặc chèn [[]] tại con trỏ"
        >
          <Link2 size={16} />
        </button>
        <button
          type="button"
          onMouseDown={preventToolbarFocusSteal}
          onClick={() => handleToolbarClick('__WIKI_UNWRAP__', '', editorId, sync)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-900/50 bg-cyan-950/40 text-cyan-400 shadow-inner transition-colors hover:bg-cyan-900/40 hover:text-cyan-300"
          title="Gỡ Wiki Link: chọn [[...]] hoặc đặt con trỏ trong link để bỏ"
        >
          <X size={16} />
        </button>
        <div className="w-px h-6 bg-slate-800 mx-1" />

        <button
          type="button"
          onMouseDown={preventToolbarFocusSteal}
          onClick={tb('# ', '')}
          className={getActiveIconButtonClass(Boolean(entityNotesToolbarState.heading1), 'violet')}
          title="Tiêu đề 1"
        >
          <Heading1 size={16} />
        </button>
        <button
          type="button"
          onMouseDown={preventToolbarFocusSteal}
          onClick={tb('## ', '')}
          className={getActiveIconButtonClass(Boolean(entityNotesToolbarState.heading2), 'violet')}
          title="Tiêu đề 2"
        >
          <Heading2 size={16} />
        </button>
        {variant === 'entityNotes' && (
          <button
            type="button"
            onMouseDown={preventToolbarFocusSteal}
            onClick={tb('### ', '\n\n')}
            className={getActiveIconButtonClass(Boolean(entityNotesToolbarState.heading3), 'violet')}
            title={ENTITY_NOTES_LABELS.h3Title}
          >
            <span className="text-[10px] font-black tracking-wide">H3</span>
          </button>
        )}
        <div className="w-px h-6 bg-slate-800 mx-1" />
        <button
          type="button"
          onMouseDown={preventToolbarFocusSteal}
          onClick={tb('- ', '')}
          className={getActiveIconButtonClass(Boolean(entityNotesToolbarState.bullet), 'cyan')}
          title="Gạch đầu dòng"
        >
          <ListIcon size={16} />
        </button>
        {variant === 'entityNotes' && (
          <>
            <button
              type="button"
              onMouseDown={preventToolbarFocusSteal}
              onClick={linePref('1. ')}
              className={getActiveIconButtonClass(Boolean(entityNotesToolbarState.ordered), 'cyan')}
              title="Danh sách đánh số (1. )"
            >
              <ListOrdered size={16} />
            </button>
            <button
              type="button"
              onMouseDown={preventToolbarFocusSteal}
              onClick={linePref('> ')}
              className={getActiveIconButtonClass(Boolean(entityNotesToolbarState.quote), 'cyan')}
              title="Trích dẫn (> )"
            >
              <Quote size={16} />
            </button>
            <button
              type="button"
              onMouseDown={preventToolbarFocusSteal}
              onClick={tb('\n---\n\n', '')}
              className={getActiveIconButtonClass(Boolean(entityNotesToolbarState.divider), 'violet')}
              title={ENTITY_NOTES_LABELS.dividerTitle}
            >
              <span className="font-mono text-xs font-bold">---</span>
            </button>
          </>
        )}
        <div className="w-px h-6 bg-slate-800 mx-1" />
        <button
          type="button"
          onMouseDown={preventToolbarFocusSteal}
          onClick={() => onInsertImage(editorId)}
          className={baseIconButtonClass}
          title="Chèn Ảnh (URL)"
        >
          <ImageIcon size={16} />
        </button>
        {onPickLocalImage && (
          <button
            type="button"
            onMouseDown={preventToolbarFocusSteal}
            onClick={() => onPickLocalImage(null, editorId)}
            className={baseIconButtonClass}
            title="Chọn Ảnh Từ Máy tính"
          >
            <FolderOpen size={16} />
          </button>
        )}
        </div>
      </div>
      {variant === 'entityNotes' && (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/35 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {ENTITY_NOTES_TOOL_GROUPS.map((group) => {
              const GroupIcon = group.icon;
              const isActive = entityNotesPanel === group.id;
              return (
                <button
                  key={group.id}
                  type="button"
                  onMouseDown={preventToolbarFocusSteal}
                  onClick={() => setEntityNotesPanel(group.id)}
                  className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                    isActive
                      ? 'border-violet-700/50 bg-violet-950/40 text-violet-100'
                      : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                  }`}
                  title={`Mở nhóm ${group.label.toLowerCase()}`}
                >
                  <GroupIcon size={13} />
                  {group.label}
                </button>
              );
            })}
          </div>
          <div className="mt-2 rounded-2xl border border-slate-800 bg-slate-950/55 px-3 py-2">
            <div className="overflow-x-auto custom-scrollbar">
              <div className="flex min-w-max items-center gap-2 pr-1">
                {renderEntityNotesPanelContent()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AppHeader = ({
  menu1Visible,
  setMenu1Visible,
  handleGoHome,
  setIsSettingsOpen,
  hasDirectory,
  dirName,
  setIsDeepSearchOpen,
  onInNovelSearch,
  showInNovelSearch,
  onOpenCommandPalette,
  performanceMode,
  setPerformanceMode,
}) => (
  <header className="h-16 bg-slate-950 border-b border-slate-900 flex items-center justify-between px-5 z-30 relative shadow-md">
    <div className="flex items-center gap-5">
      {!menu1Visible && <button onClick={() => setMenu1Visible(true)} className="p-2 hover:bg-slate-800 rounded-lg text-amber-500 transition-colors"><Menu size={24} /></button>}
      <div className="flex items-center gap-3 cursor-pointer group" onClick={handleGoHome}>
        <div className="w-8 h-8 relative flex items-center justify-center">
          <div className="absolute w-full h-full border-2 border-amber-600/80 rotate-45 group-hover:rotate-90 transition-transform duration-500"></div>
          <div className="w-2 bg-amber-500 h-2 rounded-full"></div>
        </div>
        <h1 className="text-xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-600">TÀNG THƯ CÁC</h1>
      </div>
    </div>
    <div className="flex items-center gap-2 md:gap-4">
      <div className={`hidden md:block px-3 py-1 rounded-full border text-[10px] font-serif ${hasDirectory ? 'border-emerald-500/50 text-emerald-400 bg-emerald-950/20' : 'border-slate-800 text-slate-500'}`}>
        {hasDirectory ? safeString(dirName).toUpperCase() : "CHƯA LIÊN KẾT"}
      </div>
      <button
        type="button"
        onClick={() => setPerformanceMode && setPerformanceMode(!performanceMode)}
        className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-mono transition-colors ${
          performanceMode ? 'border-emerald-500/60 bg-emerald-950/20 text-emerald-400' : 'border-slate-800 text-slate-500 hover:border-amber-800/50 hover:text-amber-400'
        }`}
        title="Performance Mode: giảm animation/blur/shadow cho mượt hơn"
      >
        <Activity size={14} />
        Perf
      </button>
      {onOpenCommandPalette && (
        <button type="button" onClick={onOpenCommandPalette} className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-700 text-[10px] text-slate-500 hover:text-amber-400 hover:border-amber-800/50 font-mono" title="Lệnh nhanh (Ctrl+K)">
          <Command size={14} /> <span>Ctrl+K</span>
        </button>
      )}
      <button onClick={setIsDeepSearchOpen} className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-full transition-all" title="Tìm toàn thư viện"><Search size={20} /></button>
      {showInNovelSearch && (
        <button type="button" onClick={onInNovelSearch} className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-full transition-all" title="Tra chỉ trong truyện đang mở"><BookOpen size={20} /></button>
      )}
      <button onClick={setIsSettingsOpen} className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-full transition-all" title="Cài Đặt"><Settings size={20} /></button>
    </div>
  </header>
);

// ==========================================
// DASHBOARD SCREEN
// ==========================================
export const DashboardScreen = memo(({ novelsMetadata, stats, isLoading, onSelectNovel, onAddNovel, onSelectNovelAtTab, novelStatsById = {} }) => {
  const { total, byStatus, byGenre, totalChaptersRead, totalChaptersAll, totalEntities, totalMilestones, recentNovels, topGenre } = stats;
  const [recentFilter, setRecentFilter] = useState('');
  const [selectedNovel, setSelectedNovel] = useState(null);
  const pct = totalChaptersAll > 0 ? Math.round((totalChaptersRead / totalChaptersAll) * 100) : 0;
  const statusColors = { 'Đang đọc': 'text-amber-400 bg-amber-900/30 border-amber-700/40', 'Hoàn thành': 'text-emerald-400 bg-emerald-900/30 border-emerald-700/40', 'Tạm ngưng': 'text-slate-400 bg-slate-800/50 border-slate-700/40' };
  const statusDots = { 'Đang đọc': 'bg-amber-400', 'Hoàn thành': 'bg-emerald-400', 'Tạm ngưng': 'bg-slate-500' };
  const topGenres = Object.entries(byGenre).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const maxGenreCount = topGenres[0]?.[1] || 1;

  const filteredRecentNovels = useMemo(() => {
    const q = recentFilter.trim().toLowerCase();
    if (!q) return recentNovels;
    return novelsMetadata.filter((n) => {
      const t = safeString(n.title).toLowerCase();
      const au = safeString(n.author).toLowerCase();
      const nGenres = Array.isArray(n.genres) ? n.genres : n.genre ? [n.genre] : [];
      const g = nGenres.map((x) => safeString(x).toLowerCase()).join(' ');
      return t.includes(q) || au.includes(q) || g.includes(q);
    }).slice(0, 24);
  }, [recentFilter, recentNovels, novelsMetadata]);

  const statsFocusNovel = useMemo(() => {
    if (selectedNovel && filteredRecentNovels.some((n) => n.id === selectedNovel.id)) return selectedNovel;
    const q = recentFilter.trim();
    if (!q || filteredRecentNovels.length === 0) return null;
    return filteredRecentNovels[0];
  }, [selectedNovel, recentFilter, filteredRecentNovels]);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950">
      <div className="px-10 pt-10 pb-6 border-b border-slate-800/60">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-amber-600 uppercase tracking-[0.3em] font-bold mb-2 font-serif">Tàng Thư Các — Tổng Quan</p>
            <h1 className="text-4xl font-heading font-bold text-slate-100">Mệnh Bàn Thống Kê</h1>
            <p className="text-slate-500 font-serif mt-1 text-sm">{isLoading ? 'Đang thu thập linh khí...' : `${total} bộ thư tịch đã được lưu trữ`}</p>
          </div>
          <button onClick={onAddNovel} className="flex items-center gap-2 px-5 py-2.5 bg-amber-700 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition-colors shadow-lg"><Plus size={16}/> Thu Thập Mới</button>
        </div>
      </div>
      <div className="px-10 py-8 space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: <BookMarked size={22}/>, label: 'Tổng Thư Tịch', value: total, sub: `${byStatus['Đang đọc']||0} đang đọc`, color: 'amber' },
            { icon: <Users size={22}/>, label: 'Tổng Số Thẻ', value: isLoading ? '...' : totalEntities, sub: 'Trên mọi bộ thư tịch', color: 'indigo' },
            { icon: <Activity size={22}/>, label: 'Mốc Sự Kiện', value: isLoading ? '...' : totalMilestones, sub: 'Trên toàn bộ thư tịch', color: 'emerald' },
            { icon: <TrendingUp size={22}/>, label: 'Tiến Độ Đọc', value: `${pct}%`, sub: `${totalChaptersRead.toLocaleString()} / ${totalChaptersAll > 0 ? totalChaptersAll.toLocaleString() : '???'} chương`, color: 'rose' },
          ].map(({ icon, label, value, sub, color }) => {
            const cm = { amber: 'text-amber-400 bg-amber-900/20 border-amber-700/30', indigo: 'text-indigo-400 bg-indigo-900/20 border-indigo-700/30', emerald: 'text-emerald-400 bg-emerald-900/20 border-emerald-700/30', rose: 'text-rose-400 bg-rose-900/20 border-rose-700/30' };
            return (
              <div key={label} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${cm[color]}`}>{icon}</div>
                <div className="text-3xl font-heading font-bold text-slate-100 mb-0.5">{value}</div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</div>
                <div className="text-xs text-slate-600 font-serif">{sub}</div>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5"><BarChart2 size={16} className="text-amber-500"/><h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Phân Loại Trạng Thái</h3></div>
            <div className="space-y-3">
              {Object.entries(byStatus).map(([status, count]) => {
                const pctBar = total > 0 ? (count / total) * 100 : 0;
                const bc = { 'Đang đọc': 'bg-amber-500', 'Hoàn thành': 'bg-emerald-500', 'Tạm ngưng': 'bg-slate-600' };
                return (
                  <div key={status}>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${statusDots[status]||'bg-slate-500'}`}></div><span className="text-sm font-serif text-slate-300">{status}</span></div>
                      <span className="text-sm font-bold text-slate-200">{count} <span className="text-slate-600 font-normal text-xs">({Math.round(pctBar)}%)</span></span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-700 ${bc[status]||'bg-slate-500'}`} style={{width:`${pctBar}%`}}></div></div>
                  </div>
                );
              })}
            </div>
            {totalChaptersAll > 0 && (
              <div className="mt-6 pt-5 border-t border-slate-800">
                <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tiến Độ Tổng</span><span className="text-sm font-bold text-amber-400">{pct}%</span></div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full" style={{width:`${pct}%`}}></div></div>
                <p className="text-xs text-slate-600 font-serif mt-1.5">{totalChaptersRead.toLocaleString()} / {totalChaptersAll.toLocaleString()} chương</p>
              </div>
            )}
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5"><Layers size={16} className="text-amber-500"/><h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Đại Lộ Tu Luyện</h3>{topGenre && <span className="ml-auto text-xs text-amber-500 font-serif italic">#{topGenre[0]} phổ biến nhất</span>}</div>
            {topGenres.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-slate-600 font-serif text-sm italic">Chưa có thể loại nào...</div>
            ) : (
              <div className="space-y-3">
                {topGenres.map(([genre, count], idx) => {
                  const bars = ['from-amber-600 to-amber-400','from-indigo-600 to-indigo-400','from-emerald-600 to-emerald-400','from-rose-600 to-rose-400','from-purple-600 to-purple-400'];
                  return (
                    <div key={genre}>
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-slate-600 w-4">#{idx+1}</span><span className="text-sm font-serif text-slate-300">{genre}</span></div>
                        <span className="text-sm font-bold text-slate-200">{count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className={`h-full rounded-full bg-gradient-to-r ${bars[idx]}`} style={{width:`${(count/maxGenreCount)*100}%`}}></div></div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2"><Eye size={16} className="text-amber-500"/><h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Thư Tịch Gần Đây</h3></div>
            <span className="text-xs text-slate-600 font-serif">{total} bộ tổng cộng</span>
          </div>
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              type="text"
              value={recentFilter}
              onChange={(e) => setRecentFilter(e.target.value)}
              placeholder="Lọc theo tên, tác giả, thể loại — hoặc nhấp thư tịch bên dưới để xem thống kê"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-sm font-serif text-slate-200 placeholder:text-slate-600 outline-none focus:border-amber-600/40"
            />
          </div>
          {statsFocusNovel && (() => {
            const st = novelStatsById[statsFocusNovel.id];
            const entN = st?.entities;
            const msN = st?.milestones;
            const byTab = st?.byTab || [];
            const chRead = parseInt(statsFocusNovel.chaptersRead || 0);
            const chTotal = statsFocusNovel.chaptersTotal && statsFocusNovel.chaptersTotal !== '???' ? parseInt(statsFocusNovel.chaptersTotal) : 0;
            const nGenres = Array.isArray(statsFocusNovel.genres) ? statsFocusNovel.genres : statsFocusNovel.genre ? [statsFocusNovel.genre] : [];
            return (
              <div className="mb-4 rounded-xl border border-amber-900/40 bg-amber-950/15 p-4">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-[10px] font-bold text-amber-600/90 uppercase tracking-widest">Thống kê truyện</p>
                  <button type="button" onClick={() => setSelectedNovel(null)} className="text-slate-500 hover:text-slate-300 text-xs">Đóng</button>
                </div>
                <p className="text-base font-heading font-bold text-slate-100 font-serif truncate">{safeString(statsFocusNovel.title)}</p>
                <p className="text-xs text-slate-500 font-serif mt-0.5">{safeString(statsFocusNovel.author)}{nGenres.length > 0 ? ` · ${nGenres.join(', ')}` : ''}</p>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="rounded-lg bg-slate-900/80 border border-slate-800 py-2 px-2">
                    <div className="text-lg font-bold text-indigo-300">{isLoading && (entN == null) ? '…' : (entN ?? '—')}</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Thẻ</div>
                  </div>
                  <div className="rounded-lg bg-slate-900/80 border border-slate-800 py-2 px-2">
                    <div className="text-lg font-bold text-emerald-300">{isLoading && (msN == null) ? '…' : (msN ?? '—')}</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Mốc</div>
                  </div>
                  <div className="rounded-lg bg-slate-900/80 border border-slate-800 py-2 px-2 col-span-2 sm:col-span-1">
                    <div className="text-lg font-bold text-amber-300">{chTotal > 0 ? `${chRead} / ${chTotal}` : (chRead > 0 ? `ch.${chRead}` : '—')}</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Chương</div>
                  </div>
                  <div className="rounded-lg bg-slate-900/80 border border-slate-800 py-2 px-2 col-span-2 sm:col-span-1 flex items-center justify-center">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${statusColors[statsFocusNovel.status] || statusColors['Đang đọc']}`}>{statsFocusNovel.status || 'Đang đọc'}</span>
                  </div>
                </div>
                {byTab.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-amber-900/30">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Theo mục — nhấp để xem chi tiết</p>
                    <div className="space-y-1.5">
                      {byTab.map((row) => {
                        const [lonId, nhoId] = row.key.split('|');
                        return (
                          <button
                            key={row.key}
                            type="button"
                            onClick={() => (onSelectNovelAtTab ? onSelectNovelAtTab(statsFocusNovel, lonId, nhoId) : onSelectNovel(statsFocusNovel))}
                            className="w-full flex justify-between items-center text-left py-2 px-3 rounded-lg border border-slate-800/80 hover:border-amber-600/40 hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 transition-colors"
                          >
                            <span className="text-sm font-serif truncate pr-2">{row.label}</span>
                            <span className="text-xs text-slate-500 flex-shrink-0">{row.entities} thẻ · {row.milestones} mốc</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onSelectNovel(statsFocusNovel)}
                  className="mt-3 w-full py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-sm font-bold font-serif transition-colors flex items-center justify-center gap-2"
                >
                  <BookOpen size={16} /> Xem truyện (Tổng quan)
                </button>
              </div>
            );
          })()}
          {recentFilter.trim() && filteredRecentNovels.length === 0 && (
            <p className="text-sm text-slate-500 font-serif italic mb-4">Không có thư tịch khớp «{recentFilter.trim()}»</p>
          )}
          <div className="space-y-2">
            {filteredRecentNovels.map((novel) => {
              const nGenres = Array.isArray(novel.genres) ? novel.genres : (novel.genre ? [novel.genre] : []);
              const chRead = parseInt(novel.chaptersRead || 0);
              const chTotal = novel.chaptersTotal && novel.chaptersTotal !== '???' ? parseInt(novel.chaptersTotal) : 0;
              const nPct = chTotal > 0 ? Math.round((chRead/chTotal)*100) : null;
              const stRow = novelStatsById[novel.id];
              const rowEnt = stRow?.entities;
              const rowMs = stRow?.milestones;
              return (
                <div
                  key={novel.id}
                  onClick={() => setSelectedNovel(novel)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors group ${statsFocusNovel?.id === novel.id ? 'border-amber-600/50 bg-amber-950/20' : 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700'}`}
                >
                  <div className="w-9 h-12 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0 border border-slate-700">
                    {novel.cover && !novel.cover.startsWith('local_image:') ? <img src={novel.cover} className="w-full h-full object-cover" alt="" onError={e=>{e.target.onerror=null;}}/> : <div className="w-full h-full flex items-center justify-center"><BookOpen size={14} className="text-slate-600"/></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-200 font-serif truncate">{safeString(novel.title)}</p>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${statusColors[novel.status]||statusColors['Đang đọc']}`}>{novel.status||'Đang đọc'}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate font-serif">{safeString(novel.author)} {nGenres.length > 0 && `· ${nGenres[0]}`}</p>
                    <p className="text-[10px] text-slate-600 font-serif mt-1">
                      {isLoading && (rowEnt == null) ? 'Đang đếm thẻ…' : `${rowEnt ?? '—'} thẻ · ${rowMs ?? '—'} mốc`}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right hidden sm:block">
                    {nPct !== null ? (
                      <div className="flex flex-col items-end gap-1"><span className="text-xs font-bold text-amber-500">{nPct}%</span><div className="w-16 h-1 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full" style={{width:`${nPct}%`}}></div></div></div>
                    ) : <span className="text-xs text-slate-600 font-serif">{chRead > 0 ? `ch.${chRead}` : '—'}</span>}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onSelectNovel(novel); }}
                    className="flex-shrink-0 px-3 py-2 rounded-lg bg-slate-800 hover:bg-amber-900/50 border border-slate-700 hover:border-amber-600/50 text-amber-500/90 hover:text-amber-400 text-xs font-bold font-serif transition-colors whitespace-nowrap"
                  >
                    Xem truyện
                  </button>
                </div>
              );
            })}
            {!recentFilter.trim() && total > 24 && (
              <p className="text-center text-xs text-slate-600 font-serif pt-2">... và {total - 24} bộ khác trong thư viện — gõ lọc để tìm</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export const LandingScreen = memo(({ setIsAddNovelOpen, setIsManageTabsOpen }) => (
  <div className="flex-1 flex flex-col items-center justify-center text-slate-200 relative w-full h-full bg-slate-950 overflow-hidden">
    <div className="z-10 flex flex-col items-center text-center max-w-3xl px-6 animate-fade-fast">
      <div className="w-40 h-40 border-2 border-amber-700/30 rounded-full flex items-center justify-center mb-8 relative shadow-[0_0_50px_rgba(217,119,6,0.05)] group">
         <div className="absolute inset-2 border border-amber-500/10 rounded-full animate-spin-slow"></div>
         <Library size={48} className="text-amber-500/80 group-hover:text-amber-400 transition-colors duration-500" />
      </div>
      <h1 className="text-5xl md:text-7xl font-heading text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-600 font-bold mb-6 tracking-widest">TÀNG THƯ CÁC</h1>
      <p className="text-lg text-slate-400 font-serif max-w-xl mb-12 leading-relaxed italic">Nơi lưu giữ vạn ngọc giản, ghi chép muôn ngàn đại đạo.</p>
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <button onClick={setIsAddNovelOpen} className="px-8 py-4 bg-gradient-to-r from-amber-800 to-amber-600 hover:from-amber-700 text-amber-50 rounded-full font-serif text-lg font-medium transition-transform shadow-lg flex items-center gap-3">
          <Plus size={24} /> <span className="tracking-wider">THU THẬP MỚI</span>
        </button>
        <button onClick={setIsManageTabsOpen} className="px-6 py-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-600/50 text-slate-300 hover:text-amber-400 rounded-full font-serif text-sm font-medium transition-all flex items-center gap-2">
          <Network size={20} /> <span>CẢI TẠO CẤU TRÚC</span>
        </button>
      </div>
    </div>
  </div>
));

/** Bỏ phần đầu «Trực thuộc» trùng với huy hiệu Đặc tính (tránh lặp badge + dòng Giới vực). */
function stripMapPathDuplicateOfBadge(pathLine, badgeLabel) {
  const p = safeString(pathLine).trim();
  const b = safeString(badgeLabel).trim();
  if (!p || !b) return p;
  if (normalizeAsciiText(p) === normalizeAsciiText(b)) return '';
  const pathTokens = splitMapHierarchyTokens(p);
  const badgeTokens = splitMapHierarchyTokens(b);
  if (badgeTokens.length === 0) return p;
  let i = 0;
  const n = Math.min(badgeTokens.length, pathTokens.length);
  while (i < n && normalizeAsciiText(pathTokens[i]) === normalizeAsciiText(badgeTokens[i])) {
    i += 1;
  }
  if (i === 0) return p;
  return pathTokens.slice(i).join(' > ').trim();
}

/**
 * Dòng trường đầu (f_status / chuỗi cấp) thường ghép cả đoạn đã hiện ở trường 2 (vd. đường Trực thuộc dưới nhãn Giới Diện).
 * Bỏ các đoạn trùng (so khớp normalize) để thẻ chỉ còn một lớp thông tin địa lý rõ ràng.
 */
function stripMapPrimaryLineSegmentsDuplicatedInSecondField(primaryLine, secondaryLine) {
  const p = safeString(primaryLine).trim();
  const s = safeString(secondaryLine).trim();
  if (!p || !s) return p;
  if (normalizeAsciiText(p) === normalizeAsciiText(s)) return '';
  const ns = normalizeAsciiText(s);
  const sep = /\s*(?:[·•]|\s-\s|—|–)\s*/;
  const parts = p.split(sep).map((x) => safeString(x).trim()).filter(Boolean);
  if (parts.length <= 1) return p;
  const kept = parts.filter((seg) => normalizeAsciiText(seg) !== ns);
  if (kept.length === parts.length) return p;
  if (kept.length === 0) return '';
  const delim = /\s-\s/.test(p) ? ' - ' : ' · ';
  return kept.join(delim);
}

export const EntityCard = memo(({ entity, onSelect, onDelete, onAddMilestone, tabConfig, dirHandle, parentTabId, parentLabel }) => {
  const fields = resolveFieldsTemplate(tabConfig, parentTabId, parentLabel);
  const terms = getTerms(parentTabId);
  const isMapCardScope = isMapCollectionScope({
    activeTabLon: parentTabId,
    activeTabNho: tabConfig?.id || '',
    currentTabConfig: tabConfig || null,
    parentLabel: parentLabel || '',
  });
  const getFieldValue = (fieldId, ent) => {
     if (ent.dynamicData && ent.dynamicData[fieldId]) return ent.dynamicData[fieldId];
     if (fieldId === 'f_status') return ent.status;
     if (fieldId === 'f_title') return ent.title;
     if (fieldId === 'f_desc') return ent.description;
     return '';
  };

  const f1 = safeString(fields[0] ? getFieldValue(fields[0].id, entity) : '');
  const f2 = safeString(fields[1] ? getFieldValue(fields[1].id, entity) : '');
  const f3 = safeString(fields[2] ? getFieldValue(fields[2].id, entity) : '');

  const isListCardEntity = normalizeAsciiText(safeString(entity.name)).startsWith('danh sach');
  const listCardTabHint = safeString(tabConfig?.label || '').trim();
  const listCardOrgGuess = isListCardEntity
    ? inferOrgTypeFromContext({
        dynamicData: entity.dynamicData || {},
        sourceNhoId: tabConfig?.id || '',
        sourceNhoLabel: tabConfig?.label || '',
        typeFieldValue: '',
      })
    : '';
  const listCardOrgDisplay =
    listCardOrgGuess && listCardOrgGuess !== 'Thế Lực Khác'
      ? listCardOrgGuess
      : inferOrgTypeFromTabSlug(tabConfig?.id || '');
  const f1Display =
    isListCardEntity && !f1.trim()
      ? (listCardTabHint
          ? `CHỈ MỤC · ${listCardTabHint.toLocaleUpperCase('vi-VN')}`
          : 'CHỈ MỤC DANH SÁCH')
      : f1;
  const f2Display =
    isListCardEntity && fields[1] && !f2.trim() && listCardOrgDisplay
      ? listCardOrgDisplay
      : f2;
  const mapCardQuick = parseMapQuickState(entity?.dynamicData || {});
  const mapSystemBadgeLabel = isMapCardScope ? safeString(mapCardQuick.mapSystem).trim() : '';
  const mapTypeLabel = isMapCardScope ? safeString(mapCardQuick.mapType).trim() : '';
  const mapSystemBadgeStyle = buildMapTraitBadgeStyle(mapSystemBadgeLabel);
  const mapParentPath = isMapCardScope ? safeString(entity?.dynamicData?.f_vi_tri).trim() : '';
  const normEquals = (a, b) =>
    normalizeAsciiText(safeString(a).trim()) === normalizeAsciiText(safeString(b).trim());
  const sanitizeMapParentPath = (pathLine, bannedValues = []) => {
    const banned = new Set(
      (bannedValues || [])
        .map((v) => normalizeAsciiText(safeString(v).trim()))
        .filter(Boolean)
    );
    const tokens = splitStatusHierarchyTokens(pathLine);
    const deduped = [];
    const seen = new Set();
    tokens.forEach((token) => {
      const raw = safeString(token).trim();
      const key = normalizeAsciiText(raw);
      if (!key || banned.has(key) || seen.has(key)) return;
      seen.add(key);
      deduped.push(raw);
    });
    return deduped.join(' > ');
  };
  let f1DisplayResolved = f1Display;
  if (isMapCardScope && !isListCardEntity && mapSystemBadgeLabel) {
    const statusParts = safeString(f1Display).split('·').map((x) => safeString(x).trim()).filter(Boolean);
    if (statusParts.length > 1) {
      // Badge đã thể hiện "Đặc Tính", nên dòng tím chỉ giữ "Giới Diện".
      f1DisplayResolved = statusParts[0];
    }
  }
  if (isMapCardScope && mapSystemBadgeLabel && normEquals(f1DisplayResolved, mapSystemBadgeLabel)) {
    // Tránh lặp cùng nội dung đã hiển thị trên badge map.
    f1DisplayResolved = '';
  }
  let f2DisplayResolved = f2Display;
  if (isMapCardScope) {
    const statusParts = safeString(f2Display).split('·').map((x) => safeString(x).trim()).filter(Boolean);
    if (statusParts.length > 1) {
      // Badge đã hiển thị phần "Đặc Tính", nên dòng phụ chỉ giữ phần trước dấu chấm giữa.
      f2DisplayResolved = statusParts[0];
    }
    if (
      normalizeAsciiText(f2DisplayResolved) &&
      normalizeAsciiText(f2DisplayResolved) === normalizeAsciiText(mapTypeLabel)
    ) {
      // Tránh lặp cùng nội dung với dòng trên; ưu tiên hiện "Trực thuộc" nếu có.
      f2DisplayResolved = mapParentPath;
    }
    f2DisplayResolved = sanitizeMapParentPath(f2DisplayResolved, [
      entity?.name,
      mapTypeLabel,
      mapSystemBadgeLabel,
      f1DisplayResolved,
    ]) || f2DisplayResolved;
    f2DisplayResolved = stripMapPathDuplicateOfBadge(f2DisplayResolved, mapSystemBadgeLabel);
  }
  if (isMapCardScope && !isListCardEntity && fields[0] && fields[1]) {
    const refSecond = safeString(f2DisplayResolved).trim();
    if (refSecond) {
      f1DisplayResolved = stripMapPrimaryLineSegmentsDuplicatedInSecondField(f1DisplayResolved, refSecond);
    }
  }
  const f3Trim = safeString(f3).trim();
  const f2Trim = safeString(f2DisplayResolved).trim();
  const hideMapField3Duplicate =
    isMapCardScope &&
    !isListCardEntity &&
    fields[2] &&
    f3Trim &&
    f2Trim &&
    normalizeAsciiText(f3Trim) === normalizeAsciiText(f2Trim);

  const avatarColors = ['bg-amber-900/50','bg-indigo-900/50','bg-emerald-900/50','bg-rose-900/50','bg-purple-900/50','bg-sky-900/50','bg-orange-900/50','bg-teal-900/50'];
  const avatarTextColors = ['text-amber-400','text-indigo-400','text-emerald-400','text-rose-400','text-purple-400','text-sky-400','text-orange-400','text-teal-400'];
  const colorIdx = safeString(entity.name).charCodeAt(0) % avatarColors.length;

  const handleSelect = () => onSelect?.(entity);
  const handleDelete = (e) => { e?.stopPropagation?.(); onDelete?.(entity); };
  const handleAddMs = (e) => { e?.stopPropagation?.(); onAddMilestone?.(entity); };
  return (
    <div onClick={handleSelect} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-amber-600/50 hover:shadow-lg transition-all cursor-pointer group relative">
      <button onClick={handleDelete} className="absolute top-4 right-4 text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"><Trash2 size={16}/></button>
      <div className="flex items-center gap-4 mb-4">
         <div className={`w-14 h-14 rounded-full border border-amber-600/20 flex items-center justify-center font-bold text-xl overflow-hidden flex-shrink-0 ${entity.avatar ? 'bg-slate-950' : avatarColors[colorIdx]}`}>
           {entity.avatar ? (
              entity.avatar.startsWith('local_image:') ? (
                 <AsyncLocalImage filename={entity.avatar.replace('local_image:', '')} alt="avatar" dirHandle={dirHandle} className="w-full h-full object-cover" />
              ) : <img src={entity.avatar} className="w-full h-full object-cover" alt="" onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMG; }} />
           ) : <span className={avatarTextColors[colorIdx]}>{safeString(entity.name).charAt(0).toUpperCase()}</span>}
         </div>
         <div className="flex-1 min-w-0 pr-6">
           <div className="flex flex-wrap items-center gap-2">
             <h4 className="text-amber-100 font-bold font-serif text-base leading-snug break-words" title={safeString(entity.name)}>{safeString(entity.name)}</h4>
             {mapSystemBadgeLabel && (
               <span
                 className="px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide"
                 style={mapSystemBadgeStyle || undefined}
               >
                 {mapSystemBadgeLabel}
               </span>
             )}
           </div>
            {fields[0] && <p className="text-[11px] text-amber-600 font-bold uppercase tracking-widest mt-0.5 break-words">{f1DisplayResolved || '---'}</p>}
         </div>
      </div>
      <div className="mb-4 space-y-1">
        {fields[1] && <div className="text-xs text-slate-400 font-serif line-clamp-2 italic"><Shield size={10} className="inline mr-1 opacity-50"/> {safeString(fields[1].label)}: {f2DisplayResolved || '---'}</div>}
        {fields[2] && !hideMapField3Duplicate && (
          <p className="text-sm text-slate-300 font-serif line-clamp-3 leading-relaxed mt-1">{f3 || '...'}</p>
        )}
      </div>
      <div className="w-full pt-3 border-t border-slate-800/80 flex justify-between items-center text-[10px] text-slate-500 uppercase tracking-widest font-bold">
        <span>{entity.milestones?.length || 0} {terms.msTitle.split('/')[0].trim()}</span>
        <div className="flex items-center gap-2">
          <button onClick={handleAddMs} className="p-1 rounded-md bg-slate-800 hover:bg-amber-900/40 hover:text-amber-400 text-slate-500 transition-colors opacity-0 group-hover:opacity-100" title="Thêm mốc sự kiện nhanh">
            <Plus size={12}/>
          </button>
          <span className="group-hover:text-amber-400 transition-colors flex items-center gap-1">Hồ Sơ <ChevronRight size={12}/></span>
        </div>
      </div>
    </div>
  );
});

function dedupeCaseInsensitive(values) {
  const out = [];
  const seen = new Set();
  (values || []).forEach((value) => {
    const raw = safeString(value).trim();
    const key = normalizeAsciiText(raw);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(raw);
  });
  return out;
}

function splitDotMetaTokens(value) {
  return safeString(value)
    .split(/[·•|/]/)
    .map((item) => safeString(item).trim())
    .filter(Boolean);
}

function parseParentPathTiers(pathLine = '') {
  const tokens = splitStatusHierarchyTokens(pathLine);
  return {
    tier1: tokens[0] || '',
    tier2: tokens[1] || '',
    tier3: tokens[2] || '',
  };
}

function composeParentPathFromTiers(t1 = '', t2 = '', t3 = '') {
  return [safeString(t1).trim(), safeString(t2).trim(), safeString(t3).trim()].filter(Boolean).join(' > ');
}

const MAP_PARENT_TIER_DEFAULT_PROFILE = Object.freeze({
  none: ['tinh cau', 'hanh tinh', 'tinh he', 'thien ha', 'vi dien', 'gioi', 'mat trang', 've tinh'],
  one: ['dai luc', 'dai duong', 'chau', 'vuc', 'khu vuc', 'de quoc', 'quoc gia', 'lien bang'],
  two: ['thanh', 'tran', 'do thanh', 'thanh tri', 'khu dan cu', 'lang', 'dao'],
});

function normalizeParentTierKeywords(input) {
  const out = [];
  const seen = new Set();
  (Array.isArray(input) ? input : [])
    .map((x) => normalizeAsciiText(safeString(x).trim()))
    .filter(Boolean)
    .forEach((k) => {
      if (seen.has(k)) return;
      seen.add(k);
      out.push(k);
    });
  return out;
}

function normalizeParentTierSchema(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const none = normalizeParentTierKeywords(src.none);
  const one = normalizeParentTierKeywords(src.one);
  const two = normalizeParentTierKeywords(src.two);
  return {
    none: none.length > 0 ? none : [...MAP_PARENT_TIER_DEFAULT_PROFILE.none],
    one: one.length > 0 ? one : [...MAP_PARENT_TIER_DEFAULT_PROFILE.one],
    two: two.length > 0 ? two : [...MAP_PARENT_TIER_DEFAULT_PROFILE.two],
  };
}

function resolveParentTierSchema(realmScale = '', profileId = 'map-default', profileConfig = null) {
  if (profileId !== 'map-default') return [];
  const profile = normalizeParentTierSchema(profileConfig);
  const key = normalizeAsciiText(realmScale);
  if (!key) return [];
  const hasKeyword = (list) => list.some((kw) => key.includes(kw));
  if (hasKeyword(profile.none)) {
    return [];
  }
  if (hasKeyword(profile.one)) {
    return [{ id: 'tier1', label: 'Tinh cầu', placeholder: 'Chọn Tinh cầu cha' }];
  }
  if (hasKeyword(profile.two)) {
    return [
      { id: 'tier1', label: 'Tinh cầu', placeholder: 'Chọn Tinh cầu cha' },
      { id: 'tier2', label: 'Đại lục/Đại dương', placeholder: 'Chọn Đại lục/Đại dương cha' },
    ];
  }
  return [{ id: 'tier1', label: 'Tinh cầu', placeholder: 'Chọn Tinh cầu cha' }];
}

function parseMapQuickState(dynamicData, fieldMap = {}) {
  const scaleFieldId = safeString(fieldMap?.scaleFieldId).trim() || 'f_he_gioi_ban_do';
  const parentFieldId = safeString(fieldMap?.parentFieldId).trim() || 'f_vi_tri';
  const statusTokens = splitDotMetaTokens(dynamicData?.f_status);
  const parentPath = safeString(dynamicData?.[parentFieldId] || dynamicData?.f_vi_tri).trim();
  const mapSystem = inferMapQuickSystemFromStoredStatus(dynamicData, parentPath);
  return {
    mapType: safeString(dynamicData?.f_title).trim() || statusTokens[0] || '',
    mapSystem,
    realmSystem:
      safeString(dynamicData?.[scaleFieldId] || dynamicData?.f_he_gioi_ban_do || dynamicData?.f_he_phan_cap).trim() ||
      inferForceSystemLabel(mapSystem),
    parentPath,
  };
}

function parseForceQuickState(dynamicData) {
  const orgType = safeString(
    dynamicData?.f_loai_to_chuc || dynamicData?.f_loai || dynamicData?.f_to_chuc || dynamicData?.f_title
  ).trim();
  const realmSystem = safeString(dynamicData?.f_he_cap_the_luc || dynamicData?.f_he_phan_cap).trim();
  const locationLine = safeString(dynamicData?.f_dia_ban || dynamicData?.f_vi_tri).trim();
  const statusRaw = safeString(dynamicData?.f_status || dynamicData?.f_cap).trim();
  const rankLabel = extractForceQuickRankLabel(statusRaw, orgType, realmSystem, locationLine);
  return {
    orgType,
    realmSystem,
    rankLabel,
    locationLine,
  };
}

function buildMapTraitBadgeStyle(label = '') {
  const key = normalizeAsciiText(label);
  if (!key) return null;
  const hash = key.split('').reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7);
  const hue = Math.abs(hash) % 360;
  return {
    backgroundColor: `hsla(${hue}, 82%, 20%, 0.55)`,
    borderColor: `hsla(${hue}, 78%, 52%, 0.65)`,
    color: `hsla(${hue}, 95%, 88%, 1)`,
  };
}

const FORCE_TYPE_SEED_OPTIONS = [
  'Tông Môn',
  'Gia Tộc',
  'Chủng Tộc',
  'Đế Quốc',
  'Liên Minh',
  'Tổ Chức',
  'Học Viện',
  'Thương Minh',
  'Quốc Gia',
];

function getMapHierarchyOptionsByRealm(_realmSystem = '', baseOptions = [], fallbackOptions = []) {
  return dedupeCaseInsensitive([...(baseOptions || []), ...(fallbackOptions || [])]);
}

/** Gợi ý «Quy mô địa vực»: ưu tiên list theo giới diện (`realmScaleLists[k]`), fallback sang
 *  `fieldSuggestionLists.f_he_gioi_ban_do` để đồng bộ với editor «Trường thông tin» ở dưới. */
function buildMapRealmSystemOptions(tabConfig, mapQuickTypeValue) {
  const lists = tabConfig?.mapEntrySuggestions?.realmScaleLists;
  const g = safeString(mapQuickTypeValue).trim();
  const k = g ? normalizeAsciiText(g) : '';
  const perGioi = k && lists && typeof lists === 'object' && Array.isArray(lists[k]) ? lists[k] : [];
  if (perGioi.length > 0) return dedupeCaseInsensitive(suggestionRowsToValues(perGioi));
  const fromField = Array.isArray(tabConfig?.fieldSuggestionLists?.f_he_gioi_ban_do)
    ? tabConfig.fieldSuggestionLists.f_he_gioi_ban_do
    : [];
  return dedupeCaseInsensitive(suggestionRowsToValues(fromField));
}

function collectForceQuickHints(activeNovelData) {
  const typeList = [...FORCE_TYPE_SEED_OPTIONS];
  const locationList = [];
  for (const lon of activeNovelData?.tabsConfig || []) {
    for (const nho of lon?.subTabs || []) {
      if (
        !isForceCollectionScope({
          activeTabLon: lon.id,
          activeTabNho: nho.id,
          currentTabConfig: nho,
          parentLabel: lon.label || '',
        })
      ) {
        continue;
      }
      const entities = activeNovelData?.data?.[lon.id]?.[nho.id]?.entities || [];
      entities.forEach((entity) => {
        const dyn = entity?.dynamicData || {};
        const orgType = safeString(dyn.f_loai_to_chuc || dyn.f_loai || dyn.f_to_chuc || dyn.f_title).trim();
        if (orgType) typeList.push(orgType);

        const locationRaw = safeString(dyn.f_dia_ban || dyn.f_vi_tri).trim();
        if (locationRaw) locationList.push(locationRaw);
        splitStatusHierarchyTokens(locationRaw).forEach((token) => locationList.push(token));

        const statusTokens = splitStatusHierarchyTokens(dyn.f_status || entity?.status || '');
        if (statusTokens.length > 2) {
          locationList.push(statusTokens.slice(2).join(' - '));
        }
      });
    }
  }
  return {
    typeSuggestions: dedupeCaseInsensitive(typeList),
    locationSuggestions: dedupeCaseInsensitive(locationList),
  };
}

function inferSystemFromMapLocation(locationText, mapHintRecordsByName) {
  const tokens = splitStatusHierarchyTokens(locationText);
  for (let idx = tokens.length - 1; idx >= 0; idx -= 1) {
    const token = safeString(tokens[idx]).trim();
    const matches = mapHintRecordsByName.get(normalizeAsciiText(token)) || [];
    const labels = dedupeCaseInsensitive(matches.map((item) => item.systemLabel));
    if (labels.length === 1) return labels[0];
  }
  return inferForceSystemLabel(locationText);
}

/** Modal Khởi tạo / Tu bổ thẻ: mặc định «Gợi ý nhanh» = lưới ô theo `entityQuickEntry`; `tabConfig.modalMapForceQuickForm: 'legacy'` bật lại form Bản đồ/Thế lực cố định. */
export const ModalEntity = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  tabConfig,
  activeNovelData,
  onUpdateTemplate,
  handleAvatarDrop,
  handlePickLocalImage,
  dirHandle,
  parentTabId,
  parentLabel,
  showToast,
  geminiApiKey,
  geminiMode = 'standard',
  onOpenAutoSyncGuide,
  onPatchMapRealmScaleLists,
  onSaveMapHierarchySharedList,
  onSaveMapParentTierSchema,
  onSaveMapParentTierFieldMap,
  handleAddTabTemplateField,
  handleEnsureTabTemplateFields,
  handleRemoveTabTemplateField,
  handleRenameTabTemplateFieldLabel,
  handleSetTabTemplateFieldSortPrefix,
  handleMergeTabFieldSuggestionList,
  handleSetTabFieldSource,
  setConfirmDialog,
  handleSetTabEntityQuickEntry,
  handleSetTabFieldSuggestionDependencies,
  requestPropagateFieldSuggestionDependenciesToLon,
  requestPropagateEntityQuickEntryToLon,
  requestPropagateEntityQuickEntryToAllLons,
  requestPropagateMapParentTierSchemaToLon,
  requestPropagateMapParentTierFieldMapToLon,
}) => {
  void onUpdateTemplate;
  void geminiApiKey;
  void geminiMode;
  const terms = getTerms(parentTabId);
  const baseFieldsTemplate = useMemo(
    () => resolveFieldsTemplate(tabConfig || {}, parentTabId, parentLabel || ''),
    [tabConfig, parentTabId, parentLabel]
  );
  const mapParentTierFieldMap = useMemo(() => {
    const ids = new Set(baseFieldsTemplate.map((f) => safeString(f?.id).trim()).filter(Boolean));
    const rawScale = safeString(tabConfig?.mapEntrySuggestions?.parentTierFieldMap?.scaleFieldId).trim();
    const rawParent = safeString(tabConfig?.mapEntrySuggestions?.parentTierFieldMap?.parentFieldId).trim();
    const scaleFieldId = ids.has(rawScale) ? rawScale : ids.has('f_he_gioi_ban_do') ? 'f_he_gioi_ban_do' : '';
    const parentFieldId = ids.has(rawParent) ? rawParent : ids.has('f_vi_tri') ? 'f_vi_tri' : '';
    return { scaleFieldId, parentFieldId };
  }, [baseFieldsTemplate, tabConfig]);
  const mapTierScaleFieldId = mapParentTierFieldMap.scaleFieldId || 'f_he_gioi_ban_do';
  const mapTierParentFieldId = mapParentTierFieldMap.parentFieldId || 'f_vi_tri';
  const hasMapTierProfileFields = useMemo(() => {
    return Boolean(mapParentTierFieldMap.scaleFieldId && mapParentTierFieldMap.parentFieldId);
  }, [mapParentTierFieldMap]);
  const isForceScope = useMemo(
    () =>
      isForceCollectionScope({
        activeTabLon: parentTabId,
        activeTabNho: tabConfig?.id || '',
        currentTabConfig: tabConfig || null,
        parentLabel: parentLabel || '',
      }),
    [parentTabId, parentLabel, tabConfig]
  );
  const isMapScopeByLabel = useMemo(
    () =>
      isMapCollectionScope({
        activeTabLon: parentTabId,
        activeTabNho: tabConfig?.id || '',
        currentTabConfig: tabConfig || null,
        parentLabel: parentLabel || '',
      }),
    [parentTabId, parentLabel, tabConfig]
  );
  /**
   * Pha mở rộng (cách 1): ngoài tab được nhận diện là Bản đồ theo id/nhãn,
   * mọi tab thu thập có đủ cặp field `f_he_gioi_ban_do` + `f_vi_tri` cũng bật profile
   * "quy mô → trực thuộc nhiều tầng" để dùng chung cơ chế 0/1/2 ô.
   */
  const isMapScope = Boolean(
    isMapScopeByLabel || (tabConfig?.viewType === 'collection-track' && hasMapTierProfileFields)
  );
  /** `modalMapForceQuickForm: 'legacy'` trên tab nhỏ — khôi phục form gợi ý Bản đồ/Thế lực cố định; mặc định dùng lưới ô tùy chỉnh. */
  const useLegacyModalMapForceQuick = tabConfig?.modalMapForceQuickForm === 'legacy';
  // Chỉ tự bơm field Map/Force vào mẫu khi user chủ động bật form cũ; tránh tab có
  // tên kiểu «Bản đồ»/«Thế lực» mặc nhiên bị khóa cấu hình ô gợi ý.
  const mergeMapQuickTemplateFields = useLegacyModalMapForceQuick && isMapScope && !isForceScope;
  const mergeForceQuickTemplateFields = useLegacyModalMapForceQuick && isForceScope;
  // Một tab chỉ nên render 1 khối "quick domain" để tránh trùng nội dung.
  // Với tab lai (match cả map + thế lực), ưu tiên form Thế lực vì dữ liệu đầu vào là rank + địa bàn.
  const showForceQuickSection = useLegacyModalMapForceQuick && isForceScope;
  const showMapQuickSection = useLegacyModalMapForceQuick && isMapScope && !isForceScope;
  const fieldsTemplate = useMemo(() => {
    if (!mergeMapQuickTemplateFields && !mergeForceQuickTemplateFields) return baseFieldsTemplate;
    return mergeCollectionQuickSlotFieldsIntoTemplate(baseFieldsTemplate, {
      map: mergeMapQuickTemplateFields,
      force: mergeForceQuickTemplateFields,
    });
  }, [baseFieldsTemplate, mergeMapQuickTemplateFields, mergeForceQuickTemplateFields]);
  const fStatusLabel = useMemo(() => {
    const f = fieldsTemplate.find((x) => x.id === 'f_status');
    return f?.label || 'Tóm tắt dưới tên';
  }, [fieldsTemplate]);
  const tabConfigForFieldEditor = useMemo(() => {
    const base = { ...(tabConfig || {}), fieldsTemplate };
    if (!mergeMapQuickTemplateFields) return base;
    return {
      ...base,
      fieldsTemplate: (fieldsTemplate || []).map((f) => {
        const fid = safeString(f?.id).trim();
        if (fid !== 'f_status') return f;
        return { ...(f || {}), label: 'Đặc Tính Địa Vực' };
      }),
    };
  }, [tabConfig, fieldsTemplate, mergeMapQuickTemplateFields]);
  const entityTemplateContextHint = useMemo(() => {
    const base =
      'Gợi ý nhanh (phần mở sẵn) để nhập. Chế độ Cục bộ / Khu vực: khối Trường dưới đây. Với lưới thường, thêm cấu hình bố cục ô ở cuối mục này.';
    if (!mergeMapQuickTemplateFields || !useLegacyModalMapForceQuick) return base;
    return `${base} «Đặc Tính Địa Vực» không có field riêng trong mẫu — nhập ở Tổng quan được gộp vào Chuỗi hiển thị / dữ liệu auto.`;
  }, [mergeMapQuickTemplateFields, useLegacyModalMapForceQuick]);
  const isCultivationScope = useMemo(
    () =>
      isCultivationRelationScope({
        activeTabLon: parentTabId,
        activeTabNho: tabConfig?.id || '',
        currentTabConfig: tabConfig || null,
      }),
    [parentTabId, tabConfig]
  );
  const showGenericQuickEntry = Boolean(
    tabConfig?.viewType === 'collection-track' &&
      !(useLegacyModalMapForceQuick && (isMapScope || isForceScope))
  );
  const showTemplateQuickEntrySlots = Boolean(tabConfig?.viewType === 'collection-track');
  const genericQuickResolved = useMemo(
    () =>
      showGenericQuickEntry
        ? resolveEntityQuickSlots({
            tabConfig: tabConfig || {},
            fieldsTemplate,
            activeNovelData,
            parentTabId,
            parentLabel: parentLabel || '',
          })
        : null,
    [showGenericQuickEntry, tabConfig, fieldsTemplate, activeNovelData, parentTabId, parentLabel]
  );
  const genericQuickListPrefix = useId().replace(/:/g, '');
  /**
   * Các slot dùng để tự ghép dòng «Trạng thái / Chuỗi hiển thị» (`f_status`) từ các ô nhanh khác.
   * Khi user đã đặt `f_status` làm một ô trong lưới gợi ý — tắt ghép tự động (tránh ghi đè chip Phẩm cấp).
   */
  const genericQuickStatusSourceFieldIds = useMemo(() => {
    if (!genericQuickResolved?.slots) return [];
    const ids = genericQuickResolved.slots.map((s) => safeString(s.fieldId).trim()).filter(Boolean);
    if (ids.includes('f_status')) return [];
    return ids;
  }, [genericQuickResolved]);
  const genericQuickSlotsVisible = useMemo(() => {
    if (!genericQuickResolved?.slots) return [];
    return genericQuickResolved.slots.filter((s) => safeString(s.fieldId).trim());
  }, [genericQuickResolved]);
  /** Ghép `f_status` từ các ô lưới — tắt khi modal đang dùng form map/force legacy (có compose riêng). */
  const genericQuickComposesStatusLine = Boolean(
    showGenericQuickEntry &&
      genericQuickStatusSourceFieldIds.length > 0 &&
      !(useLegacyModalMapForceQuick && (isMapScope || isForceScope))
  );
  const mapQuickLabels = useMemo(
    () => resolveQuickSlotLabels(fieldsTemplate, MAP_QUICK_SLOTS),
    [fieldsTemplate]
  );
  const forceQuickLabels = useMemo(
    () => resolveQuickSlotLabels(fieldsTemplate, FORCE_QUICK_SLOTS),
    [fieldsTemplate]
  );
  /** Pha 5 — nhãn các ô chính trên modal (Biệt danh, Chuỗi hiển thị / trạng thái). */
  const mainFormLabels = useMemo(
    () =>
      resolveMainFormLabels(fieldsTemplate, {
        isMapScope,
        isForceScope,
        useComposeStatusLabel: showGenericQuickEntry,
      }),
    [fieldsTemplate, isMapScope, isForceScope, showGenericQuickEntry]
  );
  const mapEntityHints = useMemo(
    () =>
      collectMapEntityHints(
        activeNovelData,
        isMapScope ? tabConfig : null,
        isMapScope ? parentTabId : '',
        isMapScope ? safeString(tabConfig?.id).trim() : ''
      ),
    [activeNovelData, tabConfig, isMapScope, parentTabId]
  );
  const mapFieldPlaceholders = useMemo(
    () => getMapFieldPlaceholders(mapEntityHints.presetFlavor),
    [mapEntityHints.presetFlavor]
  );
  const mapNameSuggestions = mapEntityHints.mapNames;
  /** Tên theo quy mô f_he (ô «Quy mô địa vực») + tầng từ f_vi_tri cũ (đã lọc loại). Không gộp mọi thẻ. */
  const mapParentTier1Datalist = useMemo(() => {
    const path = mapEntityHints.parentTier1Options || [];
    const typed = mapEntityHints.mapNamesTrucParent1 || [];
    return dedupeCaseInsensitive([...path, ...typed]);
  }, [mapEntityHints.parentTier1Options, mapEntityHints.mapNamesTrucParent1]);
  const mapParentTier2Datalist = useMemo(() => {
    const path = mapEntityHints.parentTier2Options || [];
    const typed = mapEntityHints.mapNamesTrucParent2 || [];
    return dedupeCaseInsensitive([...path, ...typed]);
  }, [mapEntityHints.parentTier2Options, mapEntityHints.mapNamesTrucParent2]);
  const mapParentTier3Datalist = useMemo(() => {
    const path = mapEntityHints.parentTier3Options || [];
    const typed = mapEntityHints.mapNamesTrucParent3 || [];
    return dedupeCaseInsensitive([...path, ...typed]);
  }, [mapEntityHints.parentTier3Options, mapEntityHints.mapNamesTrucParent3]);
  const mapTypeSuggestions = mapEntityHints.mapTypes;
  const forceSystemSuggestions = mapEntityHints.forceSystems;
  const mapHierarchyFieldSuggestions = useMemo(() => {
    const raw = Array.isArray(tabConfig?.fieldSuggestionLists?.f_status) ? tabConfig.fieldSuggestionLists.f_status : [];
    return dedupeCaseInsensitive(suggestionRowsToValues(raw));
  }, [tabConfig]);
  const statusFieldPlaceholder = isMapScope
    ? mapFieldPlaceholders.quickLine
    : 'Ví dụ: Kim Đan kỳ · Đang hoạt động · UI hệ thống... (một dòng, hiện dưới tên ở Hồ sơ)';
  const statusFieldHint = isMapScope
    ? mapFieldPlaceholders.mapProfileHint
    : 'Nhãn ô theo mục sưu tập (cảnh giới, cấp độ, loại chức năng...). Có thể để trống.';
  const [formData, setFormData] = useState({ id: null, name: '', avatar: '', rawText: '' });
  /** Tab nội dung khi mục sưu tập: tổng quan / cấu hình mẫu / gợi ý */
  const [entityCreatePanel, setEntityCreatePanel] = useState('overview');
  const [dynamicData, setDynamicData] = useState({});
  /** Lưới thường: giống bản đồ — bật hàng phụ (thêm cột, gợi ý chỉnh list). */
  const [mapQuickType, setMapQuickType] = useState('');
  const [mapQuickRealmSystem, setMapQuickRealmSystem] = useState('');
  const [mapQuickSystem, setMapQuickSystem] = useState('');
  const [mapQuickParentPath, setMapQuickParentPath] = useState('');
  const [mapQuickParentTier1, setMapQuickParentTier1] = useState('');
  const [mapQuickParentTier2, setMapQuickParentTier2] = useState('');
  const [mapQuickParentTier3, setMapQuickParentTier3] = useState('');
  const mapQuickSystemRef = useRef('');
  const parentTierProfileId = mergeMapQuickTemplateFields ? 'map-default' : '';
  const mapParentTierProfileConfig = useMemo(
    () => normalizeParentTierSchema(tabConfig?.mapEntrySuggestions?.parentTierSchema),
    [tabConfig]
  );
  /** true = người dùng đang giữ chuỗi hiển thị khác bản ghép từ ô nhanh; sửa ô nhanh hoặc xóa trống ô chuỗi → tắt. */
  const genericQuickFStatusUserOverrideRef = useRef(false);
  /** Chặn effect hydrate chạy lại khi chỉ cập nhật cấu hình cùng tab lúc modal đang mở. */
  const entityModalHydratedKeyRef = useRef('');
  useEffect(() => {
    mapQuickSystemRef.current = mapQuickSystem;
  }, [mapQuickSystem]);
  const mapParentTierSchema = useMemo(
    () => resolveParentTierSchema(mapQuickRealmSystem, parentTierProfileId, mapParentTierProfileConfig),
    [mapQuickRealmSystem, parentTierProfileId, mapParentTierProfileConfig]
  );
  const mapParentTierRequiredCount = mapParentTierSchema.length;
  const [mapListEditorMode, setMapListEditorMode] = useState(null);
  const mapRealmListPanelOpen = mapListEditorMode === 'realm';
  const mapHierarchyListPanelOpen = mapListEditorMode === 'hierarchy';
  const setMapRealmListPanelOpen = (next) =>
    setMapListEditorMode((prev) => (next ? 'realm' : prev === 'realm' ? null : prev));
  const setMapHierarchyListPanelOpen = (next) =>
    setMapListEditorMode((prev) => (next ? 'hierarchy' : prev === 'hierarchy' ? null : prev));
  // Cấu trúc row {prefix, value}[] — cùng format với editor «Trường thông tin» ở dưới,
  // để hai nơi có thể đồng bộ dữ liệu + tính năng (prefix/ký hiệu sắp xếp).
  const [mapRealmListDraft, setMapRealmListDraft] = useState([]);
  const [mapHierarchyListDraft, setMapHierarchyListDraft] = useState([]);
  const [mapRealmListTargetLonId, setMapRealmListTargetLonId] = useState(parentTabId || '');
  const [mapRealmListTargetNhoId, setMapRealmListTargetNhoId] = useState(tabConfig?.id || '');
  const mapRealmSystemOptions = useMemo(
    () => buildMapRealmSystemOptions(tabConfig, mapQuickType),
    [tabConfig, mapQuickType]
  );
  const [forceQuickType, setForceQuickType] = useState('');
  const [forceQuickRealmSystem, setForceQuickRealmSystem] = useState('');
  const [forceQuickRank, setForceQuickRank] = useState('');
  const [forceQuickLocation, setForceQuickLocation] = useState('');
  const suggestedMapSystem = useMemo(
    () => inferSystemFromMapLocation(mapQuickParentPath, mapEntityHints.recordsByName),
    [mapQuickParentPath, mapEntityHints.recordsByName]
  );
  const mapHierarchyOptions = useMemo(
    () => getMapHierarchyOptionsByRealm(mapQuickRealmSystem, forceSystemSuggestions, mapHierarchyFieldSuggestions),
    [mapQuickRealmSystem, forceSystemSuggestions, mapHierarchyFieldSuggestions]
  );
  const forceQuickHints = useMemo(() => collectForceQuickHints(activeNovelData), [activeNovelData]);
  const forceTypeSourceDescriptor = useMemo(
    () => getFieldSourceDescriptor(tabConfig, 'f_loai_to_chuc'),
    [tabConfig]
  );
  const forceTypeSource = useMemo(
    () =>
      resolveFieldValueSource({
        fieldId: 'f_loai_to_chuc',
        tabConfig: tabConfig || {},
        parentTabId,
        parentLabel: parentLabel || '',
        activeNovelData,
        genreTemplate: getGenreTabsTemplate(Array.isArray(activeNovelData?.genres) ? activeNovelData.genres : []),
      }),
    [tabConfig, parentTabId, parentLabel, activeNovelData]
  );
  const mapSubTabsForForce = useMemo(
    () => collectMapSubTabsForForceUi(activeNovelData),
    [activeNovelData]
  );
  const mapSubTabsForScaleList = useMemo(() => {
    if (!parentTabId) return mapSubTabsForForce;
    const scoped = mapSubTabsForForce.filter((t) => t.lonId === parentTabId);
    return scoped.length ? scoped : mapSubTabsForForce;
  }, [mapSubTabsForForce, parentTabId]);
  const getMapSubTabFromNovel = useCallback(
    (lonId, nhoId) => {
      const lon = (activeNovelData?.tabsConfig || []).find((t) => t && t.id === lonId);
      return (lon?.subTabs || []).find((s) => s && s.id === nhoId) || null;
    },
    [activeNovelData]
  );
  const mapRealmListTargetNho = useMemo(
    () => getMapSubTabFromNovel(mapRealmListTargetLonId, mapRealmListTargetNhoId),
    [getMapSubTabFromNovel, mapRealmListTargetLonId, mapRealmListTargetNhoId]
  );
  const mapRealmListTargetLabel = useMemo(
    () => safeString(mapRealmListTargetNho?.label || '').trim(),
    [mapRealmListTargetNho]
  );
  const matchedMapSubTab = useMemo(() => {
    const m = matchMapSubTabByRealmInput(forceQuickRealmSystem, mapSubTabsForForce);
    if (m) return m;
    const cur = safeString(forceQuickRealmSystem).trim();
    if (!cur) return null;
    return mapSubTabsForForce.find((t) => t.label === cur) || null;
  }, [forceQuickRealmSystem, mapSubTabsForForce]);
  const customMapForceRanks = useMemo(() => {
    if (!matchedMapSubTab) return [];
    return dedupeCaseInsensitive(
      getMapSubTabForceRankSuggestions(activeNovelData, matchedMapSubTab.lonId, matchedMapSubTab.nhoId)
    );
  }, [matchedMapSubTab, activeNovelData]);
  const forceRankOptions = useMemo(() => customMapForceRanks, [customMapForceRanks]);
  const forceRealmSystemOptions = useMemo(
    () => dedupeCaseInsensitive(mapSubTabsForForce.map((t) => t.label)),
    [mapSubTabsForForce]
  );
  const forceRealmSelectValue = useMemo(() => {
    const cur = safeString(forceQuickRealmSystem).trim();
    return cur && forceRealmSystemOptions.includes(cur) ? cur : '';
  }, [forceRealmSystemOptions, forceQuickRealmSystem]);
  const mapTabNamesForForceLocation = useMemo(() => {
    if (matchedMapSubTab == null) return [];
    return dedupeCaseInsensitive(
      listMapTabEntityNames(activeNovelData, matchedMapSubTab.lonId, matchedMapSubTab.nhoId)
    );
  }, [matchedMapSubTab, activeNovelData]);
  const forceLocationOptions = useMemo(() => {
    if (matchedMapSubTab != null) {
      return mapTabNamesForForceLocation;
    }
    return dedupeCaseInsensitive([...forceQuickHints.locationSuggestions, ...mapNameSuggestions]);
  }, [matchedMapSubTab, mapTabNamesForForceLocation, forceQuickHints.locationSuggestions, mapNameSuggestions]);
  const forceTypeOptions = useMemo(() => {
    if (forceTypeSourceDescriptor.kind === FIELD_SOURCE_KIND.SUB_TAB_LABEL) {
      return dedupeCaseInsensitive(forceTypeSource.suggestions);
    }
    return dedupeCaseInsensitive([...forceQuickHints.typeSuggestions, ...forceTypeSource.suggestions]);
  }, [forceQuickHints.typeSuggestions, forceTypeSource.suggestions, forceTypeSourceDescriptor.kind]);
  const resolvedStatusFieldPlaceholder = showMapQuickSection
    ? mapFieldPlaceholders.quickLine
    : showForceQuickSection
      ? 'Ví dụ: Thiên Tôn cấp thế lực / Địa Vương cấp thế lực'
      : statusFieldPlaceholder;
  const resolvedStatusFieldHint = showForceQuickSection
    ? 'Ở thẻ Thế lực, nên để ô này là cấp thế lực; địa bàn nhập riêng ở ô phía trên để AUTO đẩy sang Bản đồ.'
    : showGenericQuickEntry
      ? 'Tự ghép từ các ô Gợi ý nhanh (theo thứ tự ô). Khởi tạo / Tu bổ: sửa ô nhanh sẽ đồng bộ lại; gõ khác bản ghép thì giữ tay cho đến khi xóa trống ô này hoặc chỉnh ô nhanh.'
      : statusFieldHint;
  const trapRef = useFocusTrap(isOpen);
  const patchFormData = (patch) =>
    setFormData((prev) => {
      const nextPatch = typeof patch === 'function' ? patch(prev || {}) : patch;
      return { ...(prev || {}), ...nextPatch };
    });
  const patchDynamicData = useCallback(
    (patch) =>
      setDynamicData((prev) => {
        const rawPatch = typeof patch === 'function' ? patch(prev || {}) : patch;
        const nextPatch = rawPatch && typeof rawPatch === 'object' ? rawPatch : {};
        const merged = { ...(prev || {}), ...nextPatch };
        if (genericQuickComposesStatusLine) {
          const patchKeys = Object.keys(nextPatch);
          const touchesQuickSource = patchKeys.some((k) => genericQuickStatusSourceFieldIds.includes(k));
          if (touchesQuickSource) {
            genericQuickFStatusUserOverrideRef.current = false;
          }
          const onlyStatus = patchKeys.length === 1 && patchKeys[0] === 'f_status';
          if (patchKeys.length > 0 && !onlyStatus && !genericQuickFStatusUserOverrideRef.current) {
            const line = genericQuickStatusSourceFieldIds
              .map((id) => safeString(merged[id]).trim())
              .filter(Boolean)
              .join(' · ');
            if (line) merged.f_status = line;
          }
        }
        if (useLegacyModalMapForceQuick && isMapScope && !isForceScope) {
          const patchKeys = Object.keys(nextPatch);
          const onlyStatus = patchKeys.length === 1 && patchKeys[0] === 'f_status';
          if (patchKeys.length > 0 && !onlyStatus) {
            merged.f_status = composeMapTemplateDisplayLine(
              fieldsTemplate,
              merged,
              mapQuickSystemRef.current
            );
          }
        }
        return merged;
      }),
    [
      genericQuickComposesStatusLine,
      useLegacyModalMapForceQuick,
      isMapScope,
      isForceScope,
      genericQuickStatusSourceFieldIds,
      fieldsTemplate,
    ]
  );
  const quickUseSelect = Boolean(tabConfig?.entityQuickEntry?.useSelectUi);
  const quickEntryBlockTitle = safeString(tabConfig?.label).trim() || 'Mục sưu tập';
  /** Chuẩn giao diện «Gợi ý nhanh» (đồng bộ mục bản đồ / thế lực / lưới) — đổi tên cột theo mẫu tab. */
  /** Cùng «khung» với thẻ Danh xưng & khối Trạng thái (viền slate, bóng nhẹ) — nội dung bên trong vẫn dùng tông amber. */
  const entityModalQuickSurface =
    'rounded-xl border border-slate-800/55 bg-slate-950/30 p-2.5 sm:p-3 shadow-inner shadow-black/10 space-y-2.5';
  const entityModalQuickGrid = 'grid items-stretch gap-2.5 md:grid-cols-3 md:gap-3.5';
  const entityModalQuickCol = 'min-w-0 flex h-full flex-col gap-1.5 rounded-lg border border-slate-800/80 bg-slate-950/35 p-2';
  const entityModalQuickSubBlock = 'rounded-lg border border-amber-900/40 bg-slate-950/40 p-2.5 space-y-1.5';
  const entityModalQuickLabel = 'block text-[11px] font-bold text-amber-200 uppercase tracking-widest leading-tight';
  const renderLabelWithPrefix = (labelObj) => {
    const prefix = safeString(labelObj?.sortPrefix).trim();
    const text = safeString(labelObj?.label);
    return (
      <>
        {prefix ? <span className="text-emerald-300 mr-1">{prefix}.</span> : null}
        {text}
      </>
    );
  };
  const joinLabelWithPrefix = (labelObj) => {
    const prefix = safeString(labelObj?.sortPrefix).trim();
    const text = safeString(labelObj?.label);
    return prefix ? `${prefix}. ${text}` : text;
  };
  /** Sửa ký hiệu thứ tự (sortPrefix) tại chỗ trên mọi khối Gợi ý nhanh — lưu mẫu tab. */
  const canEditQuickEntrySortPrefix =
    typeof handleSetTabTemplateFieldSortPrefix === 'function' &&
    safeString(parentTabId).trim() &&
    safeString(tabConfig?.id).trim();

  /**
   * @param {{ label?: string, sortPrefix?: string, fieldId?: string }} labelObj
   * @param {{ inline?: boolean }} [opts] — nếu true: không bọc cột, dùng trong lưới 3 cột
   */
  const renderQuickSlotLabelWithSortInput = (labelObj, opts = {}) => {
    const fid = safeString(labelObj?.fieldId).trim();
    const sp = safeString(labelObj?.sortPrefix).trim();
    const showInput = canEditQuickEntrySortPrefix && fid;
    const lab = safeString(labelObj?.label);
    const inner = (
      <>
        {showInput && (
          <div className="shrink-0 w-[2.75rem] space-y-0.5">
            <div className="text-[8px] font-bold uppercase tracking-wide text-emerald-200/80 leading-tight">Số TT</div>
            <input
              type="text"
              defaultValue={sp}
              key={`qesort-${parentTabId}-${tabConfig.id}-${fid}-${sp}`}
              onBlur={(e) => {
                handleSetTabTemplateFieldSortPrefix(parentTabId, tabConfig.id, fid, e.target.value);
              }}
              maxLength={16}
              title="Mẫu trường chung cả tab — I, 1, 1.1…; đổi ở đây sẽ áp cho mọi thẻ cùng tab nhỏ. Thứ tự riêng từng mục trong thẻ Danh sách (AUTO): dùng «Mục lục danh sách (AUTO)» trên từng mục."
              aria-label={`Ký hiệu thứ tự gợi ý nhanh cho ${fid}`}
              className="h-9 w-full bg-slate-950/90 border border-emerald-800/50 rounded-md px-1.5 py-1 text-[11px] text-emerald-100 font-mono focus:border-emerald-500/70 outline-none"
              placeholder="·"
            />
          </div>
        )}
        <label
          className={`${entityModalQuickLabel} ${showInput ? 'flex-1 min-w-0' : ''} truncate block`}
          title={joinLabelWithPrefix(labelObj)}
        >
          {showInput ? lab : renderLabelWithPrefix(labelObj)}
        </label>
      </>
    );
    if (opts.inline) {
      return <div className="flex min-h-[2.6rem] items-end gap-1.5 min-w-0">{inner}</div>;
    }
    return <div className="flex min-h-[2.6rem] items-end gap-1.5 min-w-0 w-full">{inner}</div>;
  };

  /** «Số TT»/Ký hiệu nằm trên mẫu trường (fieldsTemplate) — dùng chung mọi thẻ; không phải dữ liệu riêng từng thẻ. */

  const entityModalQuickInput =
    'w-full h-11 bg-slate-950/80 border border-amber-900/40 rounded-lg py-2 px-2.5 text-sm text-slate-100 font-serif focus:border-amber-500 outline-none';
  const entityModalHintCallout = 'rounded-lg border border-slate-800/70 bg-slate-950/35 px-2.5 py-1.5';
  const entityModalHintTitle = 'text-[10px] font-bold uppercase tracking-widest text-amber-300/95 mb-0.5';

  const renderGenericQuickValueEditors = (slot, idx) => {
    const fid = slot.fieldId;
    const val = safeString(dynamicData[fid]);
    const listDomId = `${genericQuickListPrefix}-q-${idx}-${String(fid).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const isLong = fid === 'f_desc';
    if (isLong) {
      return (
        <textarea
          aria-label={slot.label}
          value={val}
          onChange={(e) => patchDynamicData({ [fid]: e.target.value })}
          rows={1}
          className={`${entityModalQuickInput} resize-y leading-snug`}
          placeholder="Ghi mô tả ngắn…"
        />
      );
    }
    if (quickUseSelect) {
      return (
        <div className="space-y-1.5">
          <select
            aria-label={`${slot.label} — chọn nhanh`}
            value={slot.suggestions.includes(val) ? val : ''}
            onChange={(e) => patchDynamicData({ [fid]: e.target.value })}
            className={`${entityModalQuickInput} cursor-pointer`}
          >
            <option value="">— Chọn từ list (hoặc gõ ở ô dưới) —</option>
            {slot.suggestions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <input
            aria-label={slot.label}
            type="text"
            value={val}
            onChange={(e) => patchDynamicData({ [fid]: e.target.value })}
            className={entityModalQuickInput}
            placeholder="Gõ tay / giá trị ngoài list (cùng trường dữ liệu)"
          />
        </div>
      );
    }
    return (
      <>
        <input
          aria-label={slot.label}
          list={slot.suggestions.length ? listDomId : undefined}
          value={val}
          onChange={(e) => patchDynamicData({ [fid]: e.target.value })}
          className={entityModalQuickInput}
          placeholder={`Gõ hoặc chọn gợi ý — ${fid}`}
        />
        {slot.suggestions.length > 0 && (
          <datalist id={listDomId}>
            {slot.suggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        )}
      </>
    );
  };
  const resolveDependentQuickSuggestions = useCallback(
    (slot, baseSuggestions) => {
      const rules = Array.isArray(tabConfig?.fieldSuggestionDependencies) ? tabConfig.fieldSuggestionDependencies : [];
      if (!slot?.fieldId || rules.length < 1) return baseSuggestions;
      const targetFieldId = safeString(slot.fieldId).trim();
      for (const rule of rules) {
        const target = safeString(rule?.targetFieldId).trim();
        const source = safeString(rule?.sourceFieldId).trim();
        if (!target || !source || target !== targetFieldId) continue;
        const sourceValue = safeString(dynamicData?.[source]).trim();
        if (!sourceValue) continue;
        const sourceKey = normalizeAsciiText(sourceValue);
        const cases = Array.isArray(rule?.cases) ? rule.cases : [];
        for (const entry of cases) {
          const whenValue = safeString(entry?.whenValue).trim();
          if (!whenValue) continue;
          if (normalizeAsciiText(whenValue) !== sourceKey) continue;
          const override = dedupeCaseInsensitive(
            (Array.isArray(entry?.suggestions) ? entry.suggestions : [])
              .map((x) => safeString(x).trim())
              .filter(Boolean)
          );
          if (override.length > 0) return override;
        }
      }
      return baseSuggestions;
    },
    [tabConfig, dynamicData]
  );

  const mapQuickTypeSuggestionList = useMemo(
    () =>
      showMapQuickSection
        ? resolveDependentQuickSuggestions({ fieldId: 'f_title' }, mapTypeSuggestions)
        : mapTypeSuggestions,
    [showMapQuickSection, resolveDependentQuickSuggestions, mapTypeSuggestions]
  );
  const mapRealmSystemSuggestionList = useMemo(
    () =>
      showMapQuickSection
        ? resolveDependentQuickSuggestions({ fieldId: mapTierScaleFieldId }, mapRealmSystemOptions)
        : mapRealmSystemOptions,
    [showMapQuickSection, resolveDependentQuickSuggestions, mapRealmSystemOptions, mapTierScaleFieldId]
  );
  /** Giống forceRealmSelectOptions: hiện đúng giá trị đã lưu trong datalist dù chưa có trong list gợi ý. */
  const mapRealmSelectOptions = useMemo(() => {
    const cur = safeString(mapQuickRealmSystem).trim();
    const base = mapRealmSystemSuggestionList;
    if (!cur) return base;
    const has = base.some((x) => normalizeAsciiText(x) === normalizeAsciiText(cur));
    if (has) return base;
    return dedupeCaseInsensitive([cur, ...base]);
  }, [mapQuickRealmSystem, mapRealmSystemSuggestionList]);
  const mapHierarchySuggestionList = useMemo(
    () =>
      showMapQuickSection
        ? resolveDependentQuickSuggestions({ fieldId: 'f_status' }, mapHierarchyOptions)
        : mapHierarchyOptions,
    [showMapQuickSection, resolveDependentQuickSuggestions, mapHierarchyOptions]
  );
  const mapParentTier1SuggestionList = useMemo(
    () =>
      showMapQuickSection
        ? resolveDependentQuickSuggestions({ fieldId: mapTierParentFieldId }, mapParentTier1Datalist)
        : mapParentTier1Datalist,
    [showMapQuickSection, resolveDependentQuickSuggestions, mapParentTier1Datalist, mapTierParentFieldId]
  );
  const mapParentTier2SuggestionList = useMemo(
    () =>
      showMapQuickSection
        ? resolveDependentQuickSuggestions({ fieldId: mapTierParentFieldId }, mapParentTier2Datalist)
        : mapParentTier2Datalist,
    [showMapQuickSection, resolveDependentQuickSuggestions, mapParentTier2Datalist, mapTierParentFieldId]
  );
  const mapParentTier3SuggestionList = useMemo(
    () =>
      showMapQuickSection
        ? resolveDependentQuickSuggestions({ fieldId: mapTierParentFieldId }, mapParentTier3Datalist)
        : mapParentTier3Datalist,
    [showMapQuickSection, resolveDependentQuickSuggestions, mapParentTier3Datalist, mapTierParentFieldId]
  );
  const mapNameSuggestionList = useMemo(
    () =>
      showMapQuickSection
        ? resolveDependentQuickSuggestions({ fieldId: mapTierParentFieldId }, mapNameSuggestions)
        : mapNameSuggestions,
    [showMapQuickSection, resolveDependentQuickSuggestions, mapNameSuggestions, mapTierParentFieldId]
  );
  const forceTypeSuggestionList = useMemo(
    () =>
      showForceQuickSection
        ? resolveDependentQuickSuggestions({ fieldId: 'f_loai_to_chuc' }, forceTypeOptions)
        : forceTypeOptions,
    [showForceQuickSection, resolveDependentQuickSuggestions, forceTypeOptions]
  );
  const forceRankSuggestionList = useMemo(
    () =>
      showForceQuickSection
        ? resolveDependentQuickSuggestions({ fieldId: 'f_status' }, forceRankOptions)
        : forceRankOptions,
    [showForceQuickSection, resolveDependentQuickSuggestions, forceRankOptions]
  );
  const forceLocationSuggestionList = useMemo(
    () =>
      showForceQuickSection
        ? resolveDependentQuickSuggestions({ fieldId: 'f_dia_ban' }, forceLocationOptions)
        : forceLocationOptions,
    [showForceQuickSection, resolveDependentQuickSuggestions, forceLocationOptions]
  );
  const forceRealmSystemOptionsDep = useMemo(
    () =>
      showForceQuickSection
        ? resolveDependentQuickSuggestions({ fieldId: 'f_he_cap_the_luc' }, forceRealmSystemOptions)
        : forceRealmSystemOptions,
    [showForceQuickSection, resolveDependentQuickSuggestions, forceRealmSystemOptions]
  );
  /** Giữ giá trị đang chọn nếu rule phụ thuộc thu hẹp list nhưng thẻ đã lưu tên tab Bản đồ hợp lệ. */
  const forceRealmSelectOptions = useMemo(() => {
    const cur = safeString(forceQuickRealmSystem).trim();
    const base = forceRealmSystemOptionsDep;
    if (!cur || !forceRealmSystemOptions.includes(cur)) return base;
    const has = base.some((x) => normalizeAsciiText(x) === normalizeAsciiText(cur));
    if (has) return base;
    return dedupeCaseInsensitive([cur, ...base]);
  }, [forceQuickRealmSystem, forceRealmSystemOptions, forceRealmSystemOptionsDep]);

  /* Reset form khi mở modal (đồng bộ từ initialData) */
  const handleMapTypeChange = (value) => {
    setMapQuickType(value);
    const realmOpts = buildMapRealmSystemOptions(tabConfig, value);
    const trimmedRealm = safeString(mapQuickRealmSystem).trim();
    const nextRealm =
      trimmedRealm && realmOpts.some((x) => normalizeAsciiText(x) === normalizeAsciiText(trimmedRealm))
        ? mapQuickRealmSystem
        : realmOpts[0] || '';
    setMapQuickRealmSystem(nextRealm);
    const scoped = getMapHierarchyOptionsByRealm(nextRealm, forceSystemSuggestions);
    const trimmedSys = safeString(mapQuickSystem).trim();
    const nextSystem =
      trimmedSys && scoped.some((x) => normalizeAsciiText(x) === normalizeAsciiText(trimmedSys))
        ? mapQuickSystem
        : '';
    setMapQuickSystem(nextSystem);
    mapQuickSystemRef.current = nextSystem;
    patchDynamicData({
      f_title: value,
      [mapTierScaleFieldId]: nextRealm,
      ...(mapTierScaleFieldId === 'f_he_gioi_ban_do' ? null : { f_he_gioi_ban_do: nextRealm }),
    });
  };
  const handleMapSystemChange = (value) => {
    setMapQuickSystem(value);
    mapQuickSystemRef.current = value;
    setDynamicData((prev) => {
      const merged = { ...(prev || {}) };
      merged.f_status = composeMapTemplateDisplayLine(fieldsTemplate, merged, value);
      return merged;
    });
  };
  const handleMapRealmSystemChange = (value) => {
    setMapQuickRealmSystem(value);
    const scoped = getMapHierarchyOptionsByRealm(value, forceSystemSuggestions);
    const nextSystem = scoped.includes(mapQuickSystem) ? mapQuickSystem : '';
    setMapQuickSystem(nextSystem);
    mapQuickSystemRef.current = nextSystem;
    patchDynamicData({
      [mapTierScaleFieldId]: value,
      ...(mapTierScaleFieldId === 'f_he_gioi_ban_do' ? null : { f_he_gioi_ban_do: value }),
    });
  };
  const handleMapParentPathChange = (value) => {
    setMapQuickParentPath(value);
    const tiers = parseParentPathTiers(value);
    setMapQuickParentTier1(tiers.tier1);
    setMapQuickParentTier2(tiers.tier2);
    setMapQuickParentTier3(tiers.tier3);
    patchDynamicData({
      [mapTierParentFieldId]: value,
      ...(mapTierParentFieldId === 'f_vi_tri' ? null : { f_vi_tri: value }),
    });
  };
  const handleMapParentTier1Change = (value) => {
    setMapQuickParentTier1(value);
    const nextPath = composeParentPathFromTiers(value, mapQuickParentTier2, mapQuickParentTier3);
    setMapQuickParentPath(nextPath);
    patchDynamicData({
      [mapTierParentFieldId]: nextPath,
      ...(mapTierParentFieldId === 'f_vi_tri' ? null : { f_vi_tri: nextPath }),
    });
  };
  const handleMapParentTier2Change = (value) => {
    setMapQuickParentTier2(value);
    const nextPath = composeParentPathFromTiers(mapQuickParentTier1, value, mapQuickParentTier3);
    setMapQuickParentPath(nextPath);
    patchDynamicData({
      [mapTierParentFieldId]: nextPath,
      ...(mapTierParentFieldId === 'f_vi_tri' ? null : { f_vi_tri: nextPath }),
    });
  };
  // Đồng bộ 2 phần: bảo đảm các slot «Gợi ý nhanh» map/force có mặt trong `fieldsTemplate`
  // để khung «Trường thông tin (thêm · sửa · xoá)» ở dưới cũng hiển thị và cho sửa/xoá.
  useEffect(() => {
    if (!isOpen) return;
    if (typeof handleEnsureTabTemplateFields !== 'function') return;
    const lonId = safeString(parentTabId).trim();
    const nhoId = safeString(tabConfig?.id).trim();
    if (!lonId || !nhoId) return;
    if (tabConfig?.viewType !== 'collection-track') return;
    const want = [];
    if (mergeMapQuickTemplateFields) {
      MAP_QUICK_SLOTS.forEach((slot) => {
        const fid = safeString(slot.fieldId).trim();
        if (!fid) return;
        want.push({ id: fid, label: safeString(slot.defaultLabel).trim() || fid });
      });
    }
    if (mergeForceQuickTemplateFields) {
      FORCE_QUICK_SLOTS.forEach((slot) => {
        const fid = safeString(slot.fieldId).trim();
        if (!fid) return;
        want.push({ id: fid, label: safeString(slot.defaultLabel).trim() || fid });
      });
    }
    if (want.length === 0) return;
    const existing = new Set(
      (tabConfig?.fieldsTemplate || []).map((f) => safeString(f?.id).trim()).filter(Boolean)
    );
    const missing = want.filter((w) => !existing.has(w.id));
    if (missing.length === 0) return;
    handleEnsureTabTemplateFields(lonId, nhoId, missing);
  }, [
    isOpen,
    mergeMapQuickTemplateFields,
    mergeForceQuickTemplateFields,
    tabConfig,
    parentTabId,
    handleEnsureTabTemplateFields,
  ]);
  useEffect(() => {
    if (!isOpen || !showMapQuickSection) return;
    const tier1 = safeString(mapQuickParentTier1).trim();
    const tier2 = mapParentTierRequiredCount >= 2 ? safeString(mapQuickParentTier2).trim() : '';
    const tier3 = mapParentTierRequiredCount >= 3 ? safeString(mapQuickParentTier3).trim() : '';
    const nextPath = composeParentPathFromTiers(tier1, tier2, tier3);
    /* eslint-disable react-hooks/set-state-in-effect -- đồng bộ giá trị tầng với yêu cầu của quy mô mới */
    if (mapParentTierRequiredCount < 3 && mapQuickParentTier3) setMapQuickParentTier3('');
    if (mapParentTierRequiredCount < 2 && mapQuickParentTier2) setMapQuickParentTier2('');
    if (mapQuickParentPath !== nextPath) {
      setMapQuickParentPath(nextPath);
      patchDynamicData({
        [mapTierParentFieldId]: nextPath,
        ...(mapTierParentFieldId === 'f_vi_tri' ? null : { f_vi_tri: nextPath }),
      });
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [
    isOpen,
    showMapQuickSection,
    mapParentTierRequiredCount,
    mapQuickParentTier1,
    mapQuickParentTier2,
    mapQuickParentTier3,
    mapQuickParentPath,
    mapTierParentFieldId,
    patchDynamicData,
  ]);
  // Nạp list «Quy mô theo giới diện» ưu tiên từ `realmScaleLists` (keyed theo tên giới diện),
  // fallback sang `fieldSuggestionLists.f_he_gioi_ban_do` để đồng bộ dữ liệu với editor dưới.
  const loadRealmListDraftFor = useCallback(
    (lonId, nhoId) => {
      const nho = getMapSubTabFromNovel(lonId, nhoId);
      const label = safeString(nho?.label || '').trim();
      const k = normalizeAsciiText(label);
      const scaleLines = k ? nho?.mapEntrySuggestions?.realmScaleLists?.[k] : null;
      const fieldLines = Array.isArray(nho?.fieldSuggestionLists?.f_he_gioi_ban_do)
        ? nho.fieldSuggestionLists.f_he_gioi_ban_do
        : [];
      const source = Array.isArray(scaleLines) && scaleLines.length > 0 ? scaleLines : fieldLines;
      setMapRealmListDraft(normalizeSuggestionRows(source));
    },
    [getMapSubTabFromNovel, setMapRealmListDraft]
  );
  const handleSelectRealmListTarget = (lonId, nhoId) => {
    setMapRealmListTargetLonId(lonId);
    setMapRealmListTargetNhoId(nhoId);
    loadRealmListDraftFor(lonId, nhoId);
  };
  const handleSaveMapRealmListDraft = useCallback(() => {
    if (!onPatchMapRealmScaleLists) return;
    const lonId = mapRealmListTargetLonId || parentTabId || '';
    const nhoId = mapRealmListTargetNhoId || tabConfig?.id || '';
    const label = mapRealmListTargetLabel;
    if (!lonId || !nhoId || !label) {
      showToast?.('Chưa chọn tab con để gắn list.', 'warning');
      return;
    }
    const serialized = serializeSuggestionRows(mapRealmListDraft);
    const arr = serialized ? serialized.split('\n') : [];
    onPatchMapRealmScaleLists({ [label]: arr }, { lonId, nhoId });
    if (typeof handleMergeTabFieldSuggestionList === 'function') {
      handleMergeTabFieldSuggestionList(lonId, nhoId, 'f_he_gioi_ban_do', serialized);
    }
    showToast?.(
      `Đã lưu ${countSuggestionRows(mapRealmListDraft)} dòng «Quy mô» cho giới diện «${label}».`,
      'success'
    );
  }, [
    onPatchMapRealmScaleLists,
    mapRealmListTargetLonId,
    mapRealmListTargetNhoId,
    mapRealmListTargetLabel,
    parentTabId,
    tabConfig?.id,
    mapRealmListDraft,
    handleMergeTabFieldSuggestionList,
    showToast,
  ]);
  const handleSaveMapHierarchyListDraft = useCallback(() => {
    if (!onSaveMapHierarchySharedList) return;
    const serialized = serializeSuggestionRows(mapHierarchyListDraft);
    onSaveMapHierarchySharedList(serialized);
    if (typeof handleMergeTabFieldSuggestionList === 'function') {
      const lonId = parentTabId || '';
      const nhoId = tabConfig?.id || '';
      if (lonId && nhoId) {
        handleMergeTabFieldSuggestionList(lonId, nhoId, 'f_status', serialized, {
          propagateWithinLon: true,
        });
      }
    }
    showToast?.(
      `Đã lưu ${countSuggestionRows(mapHierarchyListDraft)} dòng «Đặc tính địa vực» dùng chung.`,
      'success'
    );
  }, [
    onSaveMapHierarchySharedList,
    mapHierarchyListDraft,
    handleMergeTabFieldSuggestionList,
    parentTabId,
    tabConfig?.id,
    showToast,
  ]);
  /** Trước Lưu thông tin / ttc-save: ghi list gợi ý bản đồ (draft) nếu panel đang mở — tránh mất sửa khi quên bấm «Lưu list». */
  const flushMapListDraftsForMainSaveRef = useRef(() => {});
  /** Ghi nháp «ô gợi ý nhanh» vào mẫu tab (cục bộ) nếu chưa bấm «Áp dụng» — AppEntityQuickEntryConfig đăng ký. */
  const flushEntityQuickEntryBeforeMainSaveRef = useRef(null);
  useEffect(() => {
    flushMapListDraftsForMainSaveRef.current = () => {
      if (mapRealmListPanelOpen) handleSaveMapRealmListDraft();
      if (mapHierarchyListPanelOpen) handleSaveMapHierarchyListDraft();
    };
  }, [mapRealmListPanelOpen, mapHierarchyListPanelOpen, handleSaveMapRealmListDraft, handleSaveMapHierarchyListDraft]);
  const toggleMapHierarchyListEditor = () => {
    if (mapHierarchyListPanelOpen) {
      setMapHierarchyListPanelOpen(false);
      return;
    }
    const scale = tabConfig?.mapEntrySuggestions?.hierarchy;
    const fieldLines = Array.isArray(tabConfig?.fieldSuggestionLists?.f_status)
      ? tabConfig.fieldSuggestionLists.f_status
      : [];
    const source = Array.isArray(scale) && scale.length > 0 ? scale : fieldLines;
    setMapHierarchyListDraft(normalizeSuggestionRows(source));
    setMapHierarchyListPanelOpen(true);
  };
  const toggleMapRealmListEditor = () => {
    if (mapRealmListPanelOpen) {
      setMapRealmListPanelOpen(false);
      return;
    }
    const fallbackLon = parentTabId || mapSubTabsForScaleList[0]?.lonId || '';
    const fallbackNho = tabConfig?.id || mapSubTabsForScaleList[0]?.nhoId || '';
    const current = getMapSubTabFromNovel(fallbackLon, fallbackNho);
    const lonId = current ? fallbackLon : mapSubTabsForScaleList[0]?.lonId || '';
    const nhoId = current ? fallbackNho : mapSubTabsForScaleList[0]?.nhoId || '';
    if (!lonId || !nhoId) {
      showToast?.('Truyện chưa có tab Bản đồ nào để gán list «Quy mô».', 'warning');
      return;
    }
    setMapRealmListTargetLonId(lonId);
    setMapRealmListTargetNhoId(nhoId);
    loadRealmListDraftFor(lonId, nhoId);
    setMapRealmListPanelOpen(true);
  };
  const handleForceLocationChange = (value) => {
    setForceQuickLocation(value);
    patchDynamicData({
      f_dia_ban: value,
      f_status: composeForceQuickDisplayLine(forceQuickType, forceQuickRealmSystem, forceQuickRank, value),
    });
  };
  const handleForceTypeChange = (value) => {
    setForceQuickType(value);
    // Chỉ ghi f_loai_to_chuc: preset fantasyRace/v.v. dùng f_title cho «phân nhánh», không trùng loại hình.
    patchDynamicData({
      f_loai_to_chuc: value,
      f_status: composeForceQuickDisplayLine(value, forceQuickRealmSystem, forceQuickRank, forceQuickLocation),
    });
  };
  const handleForceRealmSystemChange = (value) => {
    setForceQuickRealmSystem(value);
    patchDynamicData({
      f_he_cap_the_luc: value,
      f_status: composeForceQuickDisplayLine(forceQuickType, value, forceQuickRank, forceQuickLocation),
    });
  };
  const handleForceRankChange = (value) => {
    setForceQuickRank(value);
    patchDynamicData({
      f_status: composeForceQuickDisplayLine(forceQuickType, forceQuickRealmSystem, value, forceQuickLocation),
    });
  };
  const handleStatusFieldChange = (value) => {
    if (genericQuickComposesStatusLine) {
      const line = genericQuickStatusSourceFieldIds
        .map((id) => safeString(dynamicData[id]).trim())
        .filter(Boolean)
        .join(' · ');
      const trimmed = safeString(value).trim();
      if (!trimmed) genericQuickFStatusUserOverrideRef.current = false;
      else genericQuickFStatusUserOverrideRef.current = trimmed !== line;
    }
    patchDynamicData({ f_status: value });
    if (useLegacyModalMapForceQuick && isMapScope) {
      const parsed = parseMapQuickState({ ...dynamicData, f_status: value }, mapParentTierFieldMap);
      setMapQuickType(parsed.mapType);
      setMapQuickRealmSystem(parsed.realmSystem);
      setMapQuickSystem(parsed.mapSystem);
      return;
    }
    if (useLegacyModalMapForceQuick && isForceScope) {
      setForceQuickRank(value);
      patchDynamicData({
        f_status: composeForceQuickDisplayLine(forceQuickType, forceQuickRealmSystem, value, forceQuickLocation),
      });
    }
  };

  useEffect(() => {
    if (!isOpen) {
      entityModalHydratedKeyRef.current = '';
      return;
    }
    const hydrateKey = `${safeString(tabConfig?.id).trim()}|${safeString(initialData?.id).trim() || 'new'}`;
    if (entityModalHydratedKeyRef.current === hydrateKey) return;
    entityModalHydratedKeyRef.current = hydrateKey;
    /* eslint-disable react-hooks/set-state-in-effect -- dialog cần hydrate state khi mở */
    if (initialData) {
      setFormData({
        id: initialData.id,
        name: initialData.name,
        avatar: initialData.avatar,
        rawText: initialData.rawText || '',
      });
      const initialDyn = initialData.dynamicData ? { ...initialData.dynamicData } : {};
      if (!initialDyn.f_status && initialData.status) initialDyn.f_status = initialData.status;
      if (!initialDyn.f_title && initialData.title) initialDyn.f_title = initialData.title;
      if (!initialDyn.f_desc && initialData.description) initialDyn.f_desc = initialData.description;
      const mapQuickStateRaw = parseMapQuickState(initialDyn, mapParentTierFieldMap);
      const mapQuickType =
        isMapScope &&
        !isForceScope
          ? mapQuickStateRaw.mapType
          : '';
      const rawRealmSaved = safeString(mapQuickStateRaw.realmSystem).trim();
      /** Giữ giá trị đã lưu kể khi list «Quy mô» theo giới diện đổi / trống — tránh mất khi mở Tu Bổ. */
      const mapQuickRealmSystem = rawRealmSaved;
      // Khi Tu Bổ thẻ đã có dữ liệu, luôn giữ lại "Đặc Tính Địa Vực" đã lưu.
      // Trường này là optional nên không auto điền khi tạo mới, nhưng không được tự mất khi mở lại form.
      const mapQuickSystem = safeString(mapQuickStateRaw.mapSystem).trim();
      const mapQuickState = {
        ...mapQuickStateRaw,
        mapType: mapQuickType,
        realmSystem: mapQuickRealmSystem,
        mapSystem: mapQuickSystem,
      };
      if (useLegacyModalMapForceQuick && isMapScope && !isForceScope) {
        initialDyn[mapTierScaleFieldId] = mapQuickState.realmSystem;
        if (mapTierScaleFieldId !== 'f_he_gioi_ban_do') initialDyn.f_he_gioi_ban_do = mapQuickState.realmSystem;
        initialDyn[mapTierParentFieldId] = mapQuickState.parentPath;
        if (mapTierParentFieldId !== 'f_vi_tri') initialDyn.f_vi_tri = mapQuickState.parentPath;
        initialDyn.f_status = composeMapTemplateDisplayLine(
          fieldsTemplate,
          initialDyn,
          mapQuickState.mapSystem
        );
      }
      const forceQuickState = parseForceQuickState(initialDyn);
      if (useLegacyModalMapForceQuick && isForceScope) {
        initialDyn.f_status = composeForceQuickDisplayLine(
          forceQuickState.orgType,
          forceQuickState.realmSystem,
          forceQuickState.rankLabel,
          forceQuickState.locationLine
        );
      }
      const defaultForceType = safeString(forceTypeSource.defaultValue).trim();
      if (useLegacyModalMapForceQuick && isForceScope && !forceQuickState.orgType && defaultForceType) {
        forceQuickState.orgType = defaultForceType;
        initialDyn.f_loai_to_chuc = defaultForceType;
      }
      const mapBanDoLabels = dedupeCaseInsensitive(
        collectMapSubTabsForForceUi(activeNovelData).map((t) => t.label)
      );
      const rawRealm = safeString(forceQuickState.realmSystem).trim();
      if (rawRealm && !mapBanDoLabels.includes(rawRealm)) {
        delete initialDyn.f_he_cap_the_luc;
        delete initialDyn.f_he_phan_cap;
      }
      if (genericQuickComposesStatusLine) {
        const gParts = genericQuickStatusSourceFieldIds
          .map((id) => safeString(initialDyn[id]).trim())
          .filter(Boolean);
        const composed = gParts.join(' · ');
        const curSt = safeString(initialDyn.f_status).trim();
        if (!curSt) genericQuickFStatusUserOverrideRef.current = false;
        else if (!composed) genericQuickFStatusUserOverrideRef.current = true;
        else genericQuickFStatusUserOverrideRef.current = curSt !== composed;
        if (composed && !curSt) {
          initialDyn.f_status = composed;
        }
      } else {
        genericQuickFStatusUserOverrideRef.current = false;
      }
      setDynamicData(initialDyn);
      setMapQuickType(mapQuickState.mapType);
      setMapQuickRealmSystem(mapQuickState.realmSystem);
      setMapQuickSystem(mapQuickState.mapSystem);
      setMapQuickParentPath(mapQuickState.parentPath);
      const mapParentTiers = parseParentPathTiers(mapQuickState.parentPath);
      setMapQuickParentTier1(mapParentTiers.tier1);
      setMapQuickParentTier2(mapParentTiers.tier2);
      setMapQuickParentTier3(mapParentTiers.tier3);
      setForceQuickType(forceQuickState.orgType);
      setForceQuickRealmSystem(rawRealm && mapBanDoLabels.includes(rawRealm) ? rawRealm : '');
      setForceQuickRank(forceQuickState.rankLabel);
      setForceQuickLocation(forceQuickState.locationLine);
    } else {
      genericQuickFStatusUserOverrideRef.current = false;
      setFormData({ id: null, name: '', avatar: '', rawText: '' });
      if (useLegacyModalMapForceQuick && isMapScope && !isForceScope) {
        const defaultGioi = safeString(tabConfig?.label).trim();
        if (defaultGioi) {
          const realmOpts = buildMapRealmSystemOptions(tabConfig, defaultGioi);
          const nextRealm = realmOpts[0] || '';
          mapQuickSystemRef.current = '';
          const initialDyn = {
            f_title: defaultGioi,
            [mapTierScaleFieldId]: nextRealm,
            ...(mapTierScaleFieldId === 'f_he_gioi_ban_do' ? null : { f_he_gioi_ban_do: nextRealm }),
          };
          initialDyn.f_status = composeMapTemplateDisplayLine(fieldsTemplate, initialDyn, '');
          setDynamicData(initialDyn);
          setMapQuickType(defaultGioi);
          setMapQuickRealmSystem(nextRealm);
          setMapQuickSystem('');
          setMapQuickParentPath('');
          setMapQuickParentTier1('');
          setMapQuickParentTier2('');
          setMapQuickParentTier3('');
        } else {
          setDynamicData({});
          setMapQuickType('');
          setMapQuickRealmSystem('');
          setMapQuickSystem('');
          mapQuickSystemRef.current = '';
          setMapQuickParentPath('');
          setMapQuickParentTier1('');
          setMapQuickParentTier2('');
          setMapQuickParentTier3('');
        }
      } else {
        setDynamicData({});
        setMapQuickType('');
        setMapQuickRealmSystem('');
        setMapQuickSystem('');
        mapQuickSystemRef.current = '';
        setMapQuickParentPath('');
        setMapQuickParentTier1('');
        setMapQuickParentTier2('');
        setMapQuickParentTier3('');
      }
      setForceQuickType('');
      setForceQuickRealmSystem('');
      setForceQuickRank('');
      setForceQuickLocation('');
      if (useLegacyModalMapForceQuick && isForceScope) {
        const defaultForceType = safeString(forceTypeSource.defaultValue).trim();
        if (defaultForceType) {
          setForceQuickType(defaultForceType);
          setDynamicData((prev) => ({ ...(prev || {}), f_loai_to_chuc: defaultForceType }));
        }
      }
    }
    setMapRealmListPanelOpen(false);
    setEntityCreatePanel('overview');
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [
    isOpen,
    initialData,
    activeNovelData,
    tabConfig,
    isMapScope,
    isForceScope,
    useLegacyModalMapForceQuick,
    forceTypeSource.defaultValue,
    fieldsTemplate,
    mapParentTierFieldMap,
    mapTierScaleFieldId,
    mapTierParentFieldId,
    genericQuickComposesStatusLine,
    genericQuickStatusSourceFieldIds,
  ]);

  useEffect(() => {
    const handler = (event) => {
      if (!isOpen || !formData.name.trim()) return;
      const trapEl = trapRef.current;
      const activeEl = document.activeElement;
      if (event?.defaultPrevented) return;
      if (trapEl && activeEl && !trapEl.contains(activeEl)) return;
      flushMapListDraftsForMainSaveRef.current();
      flushEntityQuickEntryBeforeMainSaveRef.current?.();
      onSave(formData, dynamicData, null);
      onClose();
      if (event?.cancelable) event.preventDefault();
      event?.stopImmediatePropagation?.();
    };
    window.addEventListener('ttc-save', handler);
    return () => window.removeEventListener('ttc-save', handler);
  }, [isOpen, formData, dynamicData, onSave, onClose, trapRef]);
  const useEntityFormTabs = tabConfig?.viewType === 'collection-track';
  const entityCreateTabs = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'template', label: 'Cấu hình mẫu' },
  ];
  const entityCreateTabBaseClass = 'tt-kbd-focus rounded-lg px-3 py-1.5 text-[11px] font-bold font-serif transition-colors';
  const entityCreateTabActiveClass = 'bg-amber-900/50 text-amber-100 border border-amber-600/50 shadow-inner';
  const entityCreateTabIdleClass = 'text-slate-400 border border-transparent hover:text-slate-200 hover:bg-slate-800/70';
  const entityCreateModalMaxWidthClass = useEntityFormTabs ? 'max-w-3xl' : 'max-w-2xl';
  const entityCreateTemplatePanelClass = 'rounded-xl border border-slate-800/70 bg-slate-950/45 text-left overflow-hidden';
  const entityCreateTemplateTitle = 'Cấu hình mẫu (nâng cao)';
  const entityCreateMetaFieldColClass = 'min-w-0 flex h-full min-h-0 flex-col gap-1';
  const entityCreateMetaFieldLabelClass =
    'block text-[10px] font-bold uppercase tracking-widest leading-snug truncate';
  const entityCreateMetaFieldInputClass =
    'w-full min-h-[2.75rem] bg-slate-950/80 border rounded-lg py-2 px-2.5 text-sm text-slate-200 font-serif outline-none';
  const showInlineGuideHints =
    !useEntityFormTabs &&
    (parentTabId !== 'nhan-vat' || (showMapQuickSection && !initialData) || showForceQuickSection || isCultivationScope);
  const showOverviewPanel = !useEntityFormTabs || entityCreatePanel === 'overview';
  const showTemplatePanel = !useEntityFormTabs || entityCreatePanel === 'template';
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={initialData ? `Tu bổ ${terms.entity}` : `Khởi tạo ${terms.entity}`}
    >
      <div
        data-testid="modal-entity-root"
        ref={trapRef}
        className={`bg-slate-900 border border-amber-700/50 rounded-2xl w-full shadow-[0_0_50px_rgba(217,119,6,0.2)] overflow-hidden flex flex-col max-h-[90vh] min-h-0 ${entityCreateModalMaxWidthClass}`}
      >
        <div className="px-4 pt-3 pb-2.5 flex-shrink-0 border-b border-slate-800 flex justify-between items-center gap-2.5 bg-slate-900">
          <h2 className="text-xl md:text-2xl font-heading font-bold text-slate-100 leading-tight">{initialData ? `Tu Bổ ${terms.entity}` : `Khởi Tạo ${terms.entity}`}</h2>
          <div className="flex items-center gap-2 flex-shrink-0">
            {onOpenAutoSyncGuide && (
              <button
                type="button"
                onClick={onOpenAutoSyncGuide}
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-800/40 bg-cyan-950/20 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-cyan-300 transition-colors hover:border-cyan-500/60 hover:bg-cyan-900/30 hover:text-cyan-200"
              >
                <BookOpen size={14} /> Quy chuẩn
              </button>
            )}
            <button type="button" onClick={onClose} className="text-slate-500 hover:text-white">
              <X size={20}/>
            </button>
          </div>
        </div>
        {useEntityFormTabs && (
          <div className="shrink-0 border-b border-slate-800/90 bg-slate-900 px-3 sm:px-4 py-1.5">
            <div className="flex flex-wrap gap-1" role="tablist" aria-label="Khu vực khởi tạo thẻ">
              {entityCreateTabs.map((t) => {
                const isActive = entityCreatePanel === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    id={`ttc-entity-form-tab-${t.id}`}
                    aria-selected={isActive}
                    aria-controls={`ttc-entity-form-panel-${t.id}`}
                    onClick={() => setEntityCreatePanel(t.id)}
                    className={`${entityCreateTabBaseClass} ${isActive ? entityCreateTabActiveClass : entityCreateTabIdleClass}`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2.5 custom-scrollbar space-y-2.5 bg-slate-900">
          {showOverviewPanel && (
            <div
              id="ttc-entity-form-panel-overview"
              role="tabpanel"
              aria-labelledby="ttc-entity-form-tab-overview"
              className="space-y-4"
            >
          <div className="rounded-xl border border-slate-800/55 bg-slate-950/30 p-2.5 sm:p-3 shadow-inner shadow-black/10">
            <div className="flex gap-2.5 items-center">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleAvatarDrop && handleAvatarDrop(e, (url) => patchFormData({ avatar: url }))}
              onClick={() => handlePickLocalImage && handlePickLocalImage((url) => patchFormData({ avatar: url }), null, 'avatar')}
              className="w-[72px] h-[72px] shrink-0 rounded-xl bg-slate-950 border border-dashed border-slate-700 flex items-center justify-center overflow-hidden group cursor-pointer hover:border-amber-500 transition-colors"
              title={`Nhấp hoặc kéo thả ảnh (${terms.image.toLowerCase()}) vào đây`}
              aria-label={terms.image}
            >
              {formData.avatar ? (
                formData.avatar.startsWith('local_image:') ? (
                  <AsyncLocalImage filename={formData.avatar.replace('local_image:', '')} alt="avatar" dirHandle={dirHandle} className="w-full h-full object-cover" />
                ) : (
                  <img src={formData.avatar} className="w-full h-full object-cover" alt="avatar" onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMG; }} />
                )
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-600 group-hover:text-amber-500 transition-colors leading-none">
                  <ImageIcon size={18} />
                  <span className="mt-0.5 text-[9px] font-bold uppercase tracking-widest">Ảnh</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <div>
                <label className="block text-[10px] font-bold text-amber-500 mb-0.5 uppercase tracking-widest">Danh xưng / Tên gọi *</label>
                <input
                  autoFocus={!useEntityFormTabs || entityCreatePanel === 'overview'}
                  aria-label="Danh xưng / Tên gọi"
                  value={safeString(formData.name)}
                  onChange={(e) => patchFormData({ name: e.target.value })}
                  className="w-full bg-slate-950 border border-amber-600/50 rounded-lg py-2 px-3 text-sm text-amber-100 font-serif focus:border-amber-500 outline-none shadow-inner"
                  placeholder="Bắt buộc nhập..."
                />
              </div>
              <div className="flex gap-2">
                <input
                  aria-label={`Đường dẫn ${terms.image.toLowerCase()}`}
                  value={safeString(formData.avatar)}
                  onChange={(e) => patchFormData({ avatar: e.target.value })}
                  className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-[11px] text-slate-300 focus:border-amber-500 outline-none"
                  placeholder={`${terms.image} — https://… hoặc kéo thả ảnh vào ô vuông`}
                />
                <button
                  type="button"
                  onClick={() => handlePickLocalImage && handlePickLocalImage((url) => patchFormData({ avatar: url }), null, 'avatar')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-[11px] font-bold whitespace-nowrap"
                  title={`Chọn file ảnh (${terms.image.toLowerCase()})`}
                >
                  <Upload size={12} /> Chọn file
                </button>
              </div>
            </div>
            </div>
          </div>

          {showGenericQuickEntry && (
            <div className={entityModalQuickSurface}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">
                  Gợi ý nhanh ({quickEntryBlockTitle})
                </p>
              </div>
              {(genericQuickResolved?.slots?.length ?? 0) >= 1 ? (
                <div className={entityModalQuickGrid}>
                  {genericQuickSlotsVisible.map((slot, idx) => {
                    const fid = slot.fieldId;
                    const depSuggestions = resolveDependentQuickSuggestions(slot, slot.suggestions);
                    return (
                      <div key={`${fid}-${idx}`} className={entityModalQuickCol}>
                        {renderQuickSlotLabelWithSortInput(slot, { inline: true })}
                        {renderGenericQuickValueEditors({ ...slot, suggestions: depSuggestions }, idx)}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          )}

          {showMapQuickSection && (
            <div className={entityModalQuickSurface}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">
                  Gợi ý nhanh ({quickEntryBlockTitle})
                </p>
              </div>
              {mapListEditorMode && (onPatchMapRealmScaleLists || onSaveMapHierarchySharedList) && (
                <div className="flex flex-wrap gap-1.5">
                  {onPatchMapRealmScaleLists && (
                    <button
                      type="button"
                      onClick={toggleMapRealmListEditor}
                      className={
                        mapRealmListPanelOpen
                          ? 'inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/70 bg-cyan-900/45 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-cyan-50'
                          : 'inline-flex items-center gap-1.5 rounded-lg border border-cyan-900/45 bg-slate-950/50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-cyan-200/70 hover:border-cyan-500/55 hover:text-cyan-100'
                      }
                      aria-pressed={mapRealmListPanelOpen}
                    >
                      <ListIcon size={12} aria-hidden /> Quy mô theo giới diện
                    </button>
                  )}
                  {onSaveMapHierarchySharedList && (
                    <button
                      type="button"
                      onClick={toggleMapHierarchyListEditor}
                      className={
                        mapHierarchyListPanelOpen
                          ? 'inline-flex items-center gap-1.5 rounded-lg border border-violet-400/70 bg-violet-900/45 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-violet-50'
                          : 'inline-flex items-center gap-1.5 rounded-lg border border-violet-900/45 bg-slate-950/50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-violet-200/70 hover:border-violet-500/55 hover:text-violet-100'
                      }
                      aria-pressed={mapHierarchyListPanelOpen}
                    >
                      <ListIcon size={12} aria-hidden /> Đặc tính dùng chung
                    </button>
                  )}
                </div>
              )}
              {mapRealmListPanelOpen && (
                <div className="rounded-lg border border-cyan-900/45 bg-slate-950/55 p-2 space-y-1.5">
                  <p className="text-[11px] text-slate-400 font-serif leading-relaxed">
                    Chọn «Giới diện» (tab con) để chỉnh list «Quy mô» — lưu xong cho tab này, chọn tab khác để nhập tiếp.
                  </p>
                  {mapSubTabsForScaleList.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {mapSubTabsForScaleList.map((sub) => {
                        const active =
                          sub.lonId === mapRealmListTargetLonId && sub.nhoId === mapRealmListTargetNhoId;
                        return (
                          <button
                            key={`${sub.lonId}:${sub.nhoId}`}
                            type="button"
                            onClick={() => handleSelectRealmListTarget(sub.lonId, sub.nhoId)}
                            className={
                              active
                                ? 'px-2.5 py-1 rounded-lg border border-cyan-400/70 bg-cyan-900/45 text-[11px] font-bold text-cyan-50'
                                : 'px-2.5 py-1 rounded-lg border border-cyan-900/45 bg-slate-950/50 text-[11px] font-bold text-cyan-200/70 hover:border-cyan-500/55 hover:text-cyan-100'
                            }
                            aria-pressed={active}
                          >
                            {sub.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-amber-200/80 font-serif">
                      Truyện chưa có tab Bản đồ con nào để gán list.
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500 font-serif">
                    Đang chỉnh cho:{' '}
                    <strong className="text-cyan-100/95">{mapRealmListTargetLabel || '—'}</strong>
                    <span> — mỗi dòng một «Quy mô địa vực»; lưu theo tab Bản đồ.</span>
                  </p>
                  <div className="space-y-1">
                    {mapRealmListDraft.length === 0 && (
                      <p className="text-[11px] text-slate-500 font-serif italic">
                        Chưa có dòng nào — bấm «+ Dòng» để thêm.
                      </p>
                    )}
                    {mapRealmListDraft.map((row, rowIdx) => (
                      <div key={`realm-row-${rowIdx}`} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={safeString(row.prefix)}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMapRealmListDraft((prev) => {
                              const next = Array.isArray(prev) ? [...prev] : [];
                              next[rowIdx] = { ...next[rowIdx], prefix: val };
                              return next;
                            });
                          }}
                          className="w-20 bg-slate-950 border border-emerald-800/45 rounded-md px-2 py-1 text-[10px] text-emerald-100 font-mono"
                          placeholder="I / 1"
                          aria-label={`Ký hiệu dòng ${rowIdx + 1}`}
                        />
                        <input
                          type="text"
                          value={safeString(row.value)}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMapRealmListDraft((prev) => {
                              const next = Array.isArray(prev) ? [...prev] : [];
                              next[rowIdx] = { ...next[rowIdx], value: val };
                              return next;
                            });
                          }}
                          className="flex-1 bg-slate-950 border border-cyan-900/40 rounded-md px-2 py-1 text-[11px] text-slate-100 font-serif focus:border-cyan-500/70 outline-none"
                          placeholder="Ví dụ: Đại Khu, Tiểu Thiên Giới…"
                          aria-label={`Nội dung dòng ${rowIdx + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setMapRealmListDraft((prev) => {
                              const next = Array.isArray(prev) ? [...prev] : [];
                              next.splice(rowIdx, 1);
                              return next;
                            })
                          }
                          className="rounded-md border border-rose-800/50 bg-rose-950/20 px-2 py-1 text-[10px] font-bold text-rose-100"
                          aria-label={`Xóa dòng ${rowIdx + 1}`}
                        >
                          X
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setMapRealmListDraft((prev) => {
                          const next = Array.isArray(prev) ? [...prev] : [];
                          next.push({ prefix: '', value: '' });
                          return next;
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900/50 px-2 py-1 text-[10px] font-bold text-slate-200"
                    >
                      <Plus size={10} /> Dòng
                    </button>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setMapListEditorMode(null)}
                      className="px-3 py-1.5 rounded-lg border border-slate-700 text-[11px] font-bold text-slate-400 hover:text-slate-200"
                    >
                      Đóng
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveMapRealmListDraft}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-700/50 bg-cyan-950/40 text-[11px] font-bold text-cyan-100 hover:bg-cyan-900/45"
                    >
                      <Save size={14} aria-hidden /> Lưu list
                    </button>
                  </div>
                </div>
              )}
              {mapHierarchyListPanelOpen && (
                <div className="rounded-lg border border-violet-900/45 bg-slate-950/55 p-2 space-y-1.5">
                  <p className="text-[11px] text-slate-400 font-serif leading-relaxed">
                    List «Đặc Tính Địa Vực» dùng chung cho tất cả tab con trong nhánh Bản đồ hiện tại.
                  </p>
                  <div className="space-y-1">
                    {mapHierarchyListDraft.length === 0 && (
                      <p className="text-[11px] text-slate-500 font-serif italic">
                        Chưa có dòng nào — bấm «+ Dòng» để thêm.
                      </p>
                    )}
                    {mapHierarchyListDraft.map((row, rowIdx) => (
                      <div key={`hier-row-${rowIdx}`} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={safeString(row.prefix)}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMapHierarchyListDraft((prev) => {
                              const next = Array.isArray(prev) ? [...prev] : [];
                              next[rowIdx] = { ...next[rowIdx], prefix: val };
                              return next;
                            });
                          }}
                          className="w-20 bg-slate-950 border border-emerald-800/45 rounded-md px-2 py-1 text-[10px] text-emerald-100 font-mono"
                          placeholder="I / 1"
                          aria-label={`Ký hiệu dòng ${rowIdx + 1}`}
                        />
                        <input
                          type="text"
                          value={safeString(row.value)}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMapHierarchyListDraft((prev) => {
                              const next = Array.isArray(prev) ? [...prev] : [];
                              next[rowIdx] = { ...next[rowIdx], value: val };
                              return next;
                            });
                          }}
                          className="flex-1 bg-slate-950 border border-violet-900/40 rounded-md px-2 py-1 text-[11px] text-slate-100 font-serif focus:border-violet-500/70 outline-none"
                          placeholder="Ví dụ: Đại lục, Tinh cầu…"
                          aria-label={`Nội dung dòng ${rowIdx + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setMapHierarchyListDraft((prev) => {
                              const next = Array.isArray(prev) ? [...prev] : [];
                              next.splice(rowIdx, 1);
                              return next;
                            })
                          }
                          className="rounded-md border border-rose-800/50 bg-rose-950/20 px-2 py-1 text-[10px] font-bold text-rose-100"
                          aria-label={`Xóa dòng ${rowIdx + 1}`}
                        >
                          X
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setMapHierarchyListDraft((prev) => {
                          const next = Array.isArray(prev) ? [...prev] : [];
                          next.push({ prefix: '', value: '' });
                          return next;
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900/50 px-2 py-1 text-[10px] font-bold text-slate-200"
                    >
                      <Plus size={10} /> Dòng
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 font-serif">
                    Mỗi dòng là một nhãn. Khi gán vào thẻ, nhãn sẽ hiện cạnh tên thẻ với màu tự phân biệt.
                  </p>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setMapListEditorMode(null)}
                      className="px-3 py-1.5 rounded-lg border border-slate-700 text-[11px] font-bold text-slate-400 hover:text-slate-200"
                    >
                      Đóng
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveMapHierarchyListDraft}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-700/50 bg-violet-950/40 text-[11px] font-bold text-violet-100 hover:bg-violet-900/45"
                    >
                      <Save size={14} aria-hidden /> Lưu list dùng chung
                    </button>
                  </div>
                </div>
              )}
              <div className={entityModalQuickGrid}>
                <div className={entityModalQuickCol}>
                  {renderQuickSlotLabelWithSortInput(mapQuickLabels.gioiDien, { inline: true })}
                  <input
                    aria-label={mapQuickLabels.gioiDien?.ariaLabel}
                    list="ttc-map-type-options"
                    value={mapQuickType}
                    onChange={(e) => handleMapTypeChange(e.target.value)}
                    className={entityModalQuickInput}
                    placeholder={mapFieldPlaceholders.mapType}
                    title="Mặc định = tên tab con; đổi nếu gắn Quy mô cho giới khác"
                  />
                </div>
                <div className={entityModalQuickCol}>
                  {renderQuickSlotLabelWithSortInput(mapQuickLabels.quyMo, { inline: true })}
                  <input
                    aria-label={mapQuickLabels.quyMo?.ariaLabel}
                    list="ttc-map-realm-options"
                    value={mapQuickRealmSystem}
                    onChange={(e) => handleMapRealmSystemChange(e.target.value)}
                    className={entityModalQuickInput}
                    placeholder={mapRealmSystemSuggestionList[0] || 'Ví dụ: Hạ giới'}
                  />
                </div>
                <div className={entityModalQuickCol}>
                  {renderQuickSlotLabelWithSortInput(mapQuickLabels.dacTinh, { inline: true })}
                  <input
                    aria-label={mapQuickLabels.dacTinh?.ariaLabel}
                    list="ttc-force-system-options"
                    value={mapQuickSystem}
                    onChange={(e) => handleMapSystemChange(e.target.value)}
                    className={entityModalQuickInput}
                    placeholder="Tuỳ chọn"
                    title="Tùy chọn; nếu có sẽ hiện cạnh tên thẻ"
                  />
                </div>
              </div>
              <div className={entityModalQuickSubBlock}>
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div className="min-w-0 flex-1">{renderQuickSlotLabelWithSortInput(mapQuickLabels.trucThuoc, { inline: true })}</div>
                  {safeString(mapQuickRealmSystem).trim() ? (
                    <span className="text-[10px] text-amber-200/85 font-serif">
                      «{mapQuickLabels.quyMo?.label}»: <strong>{safeString(mapQuickRealmSystem).trim()}</strong>
                      {safeString(mapQuickType).trim() ? (
                        <>
                          {' '}
                          · «{mapQuickLabels.gioiDien?.label}»: <strong>{safeString(mapQuickType).trim()}</strong>
                        </>
                      ) : null}
                    </span>
                  ) : null}
                </div>
                {mapParentTierRequiredCount === 0 ? (
                  <p className="text-[11px] text-slate-400 font-serif">
                    Quy mô hiện tại là tầng cao nhất, không cần chọn «Trực thuộc».
                  </p>
                ) : (
                  <>
                    <div className={`grid gap-2 ${mapParentTierRequiredCount === 1 ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
                      {mapParentTierRequiredCount >= 1 && (
                        <input
                          aria-label={`${mapQuickLabels.trucThuoc?.label} tầng 1`}
                          list="ttc-map-parent-tier1-options"
                          autoComplete="off"
                          value={mapQuickParentTier1}
                          onChange={(e) => handleMapParentTier1Change(e.target.value)}
                          className={entityModalQuickInput}
                          placeholder={mapParentTierSchema[0]?.placeholder || 'Chọn tầng cha'}
                        />
                      )}
                      {mapParentTierRequiredCount >= 2 && (
                        <input
                          aria-label={`${mapQuickLabels.trucThuoc?.label} tầng 2`}
                          list="ttc-map-parent-tier2-options"
                          autoComplete="off"
                          value={mapQuickParentTier2}
                          onChange={(e) => handleMapParentTier2Change(e.target.value)}
                          className={entityModalQuickInput}
                          placeholder={mapParentTierSchema[1]?.placeholder || 'Chọn tầng cha'}
                        />
                      )}
                    </div>
                    <details className="rounded-lg border border-slate-800/90 bg-slate-950/55 px-2 py-1.5">
                      <summary className="cursor-pointer text-[11px] font-semibold text-slate-400 font-serif hover:text-slate-200">
                        Nâng cao: sửa chuỗi «Trực thuộc» đầy đủ (cùng dữ liệu, khác cách nhập)
                      </summary>
                      <p className="mt-2 text-[10px] text-slate-500 font-serif mb-1">
                        Dùng khi cần định dạng đặc biệt; mặc định nên chọn từ các ô phía trên.
                      </p>
                      <input
                        aria-label="Trực thuộc bản đồ — sửa tay đầy đủ"
                        list="ttc-map-name-options"
                        autoComplete="off"
                        value={mapQuickParentPath}
                        onChange={(e) => handleMapParentPathChange(e.target.value)}
                        className={entityModalQuickInput}
                        placeholder="Có thể nhập/sửa tay (gợi ý = tên thẻ Bản đồ)"
                      />
                    </details>
                  </>
                )}
                {mapParentTierRequiredCount > 0 && !mapQuickParentPath.trim() && /(dai luc|chau|thanh|tran|de quoc|vuc|khu|tinh cau)/.test(normalizeAsciiText(mapQuickRealmSystem)) && (
                  <p className="text-[11px] text-amber-200/90 font-serif">
                    Cấp địa vực hiện tại nên khai báo «Trực thuộc» để biết chính xác thuộc Tinh cầu/Giới nào.
                  </p>
                )}
                {!mapQuickSystem && suggestedMapSystem && (
                  <p className="text-[11px] text-amber-200/90 font-serif">
                    Gợi ý theo địa bàn cha: <strong>{suggestedMapSystem}</strong>
                  </p>
                )}
              </div>
            </div>
          )}

          {showForceQuickSection && (
            <div className={entityModalQuickSurface}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">
                  Gợi ý nhanh ({quickEntryBlockTitle})
                </p>
              </div>
              <div className={entityModalQuickGrid}>
                <div className={entityModalQuickCol}>
                  {renderQuickSlotLabelWithSortInput(forceQuickLabels.loaiHinh, { inline: true })}
                  <input
                    aria-label={forceQuickLabels.loaiHinh?.ariaLabel}
                    list="ttc-force-type-options"
                    value={forceQuickType}
                    onChange={(e) => handleForceTypeChange(e.target.value)}
                    className={entityModalQuickInput}
                    placeholder={forceTypeSuggestionList[0] || 'Ví dụ: Tông Môn'}
                  />
                </div>
                <div className={entityModalQuickCol}>
                  {renderQuickSlotLabelWithSortInput(forceQuickLabels.heCapBac, { inline: true })}
                  <select
                    aria-label={forceQuickLabels.heCapBac?.ariaLabel}
                    value={forceRealmSelectValue}
                    onChange={(e) => handleForceRealmSystemChange(e.target.value)}
                    className={`${entityModalQuickInput} cursor-pointer`}
                  >
                    <option value="">— Chọn tên thẻ Bản đồ —</option>
                    {forceRealmSelectOptions.map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={entityModalQuickCol}>
                  {renderQuickSlotLabelWithSortInput(forceQuickLabels.capBac, { inline: true })}
                  <input
                    aria-label={forceQuickLabels.capBac?.ariaLabel}
                    list="ttc-force-rank-options"
                    value={forceQuickRank}
                    onChange={(e) => handleForceRankChange(e.target.value)}
                    className={entityModalQuickInput}
                    placeholder={forceRankSuggestionList[0] || 'Nhập cấp (xem Quản lý tab Bản đồ để chỉnh list)'}
                    title={
                      forceRankSuggestionList[0]
                        ? undefined
                        : 'Chỉnh list cấp theo thẻ Bản đồ: Quản lý tab → tab con Bản đồ → mapEntrySuggestions.forceRanks'
                    }
                  />
                </div>
              </div>
              <div className={entityModalQuickSubBlock}>
                {renderQuickSlotLabelWithSortInput(forceQuickLabels.diaChi, { inline: true })}
                <input
                  aria-label={forceQuickLabels.diaChi?.ariaLabel}
                  list="ttc-force-location-options"
                  value={forceQuickLocation}
                  onChange={(e) => handleForceLocationChange(e.target.value)}
                  className={entityModalQuickInput}
                  placeholder={
                    matchedMapSubTab
                      ? mapTabNamesForForceLocation.length > 0
                        ? 'Chọn hoặc gõ — gợi ý = tên thẻ trong tab Bản đồ đã chọn'
                        : 'Tab Bản đồ này chưa có thẻ (thực thể) — có thể gõ tay'
                      : 'Chọn «Hệ cấp bậc» trước để gợi ý đúng thẻ trong tab đó'
                  }
                />
                {matchedMapSubTab && mapTabNamesForForceLocation.length > 0 && (
                  <p className="text-[10px] text-slate-400 font-serif leading-snug line-clamp-2" title={mapTabNamesForForceLocation.join(' · ')}>
                    <span className="text-amber-200/90 font-semibold">«{matchedMapSubTab.label}»:</span>{' '}
                    {mapTabNamesForForceLocation.join(' · ')}
                  </p>
                )}
                {matchedMapSubTab && mapTabNamesForForceLocation.length === 0 && (
                  <p className="text-[10px] text-slate-500 font-serif">Chưa có thẻ trong tab Bản đồ này.</p>
                )}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-800/55 bg-slate-950/30 p-2.5 sm:p-3 shadow-inner shadow-black/10">
            <div className="grid gap-1.5 sm:grid-cols-1 sm:gap-2 sm:items-stretch sm:min-h-0">
            <div className={entityCreateMetaFieldColClass}>
              <label
                className={`${entityCreateMetaFieldLabelClass} text-slate-400`}
                title={mainFormLabels.statusLine.label}
              >
                {mainFormLabels.statusLine.label}
              </label>
              <input
                aria-label={mainFormLabels.statusLine.label}
                value={safeString(dynamicData.f_status)}
                onChange={(e) => handleStatusFieldChange(e.target.value)}
                className={`${entityCreateMetaFieldInputClass} border-slate-700 focus:border-amber-600/60`}
                placeholder={resolvedStatusFieldPlaceholder}
                title={resolvedStatusFieldHint}
              />
            </div>
            <div className={entityCreateMetaFieldColClass}>
              <label
                className={`${entityCreateMetaFieldLabelClass} text-indigo-400`}
                title={mainFormLabels.alias.label}
              >
                {mainFormLabels.alias.label}
              </label>
              <input
                aria-label={mainFormLabels.alias.ariaLabel}
                value={safeString(dynamicData.f_alias)}
                onChange={(e) => patchDynamicData({ f_alias: e.target.value })}
                className={`${entityCreateMetaFieldInputClass} border-indigo-800/50 focus:border-indigo-500`}
                placeholder="Nhiều tên: dùng dấu phẩy, / hoặc | — ví dụ: Kim Đan, Hệ Thống / Boss"
                title="Không dùng [[...]] trong ô biệt danh"
              />
            </div>
            </div>
          </div>
            </div>
          )}

          {tabConfig?.viewType === 'collection-track' && showTemplatePanel && (
            useEntityFormTabs ? (
              <div
                id="ttc-entity-form-panel-template"
                role="tabpanel"
                aria-labelledby="ttc-entity-form-tab-template"
                className={entityCreateTemplatePanelClass}
              >
                <div className="px-3 py-2.5 border-b border-slate-800/70 bg-slate-900/40">
                  <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                    {entityCreateTemplateTitle}
                  </div>
                  <div className="mt-0.5 line-clamp-3 text-[9px] font-serif leading-snug text-slate-500">
                    «Trường thông tin» phía trên; ngay dưới là khối <strong className="text-amber-200/85">viền vàng</strong>{' '}
                    «Cấu hình mẫu: các ô gợi ý nhanh» — chọn trường / phụ thuộc gợi ý; với Thế lực hoặc Bản đồ, tab{' '}
                    <strong className="text-slate-400">Tổng quan</strong> vẫn dùng form gợi ý riêng phía trên.
                  </div>
                </div>
                <div className="space-y-2 bg-slate-900/25 px-3 py-2.5">
                  <AppEntityTemplateFieldEditor
                    tabConfig={tabConfigForFieldEditor}
                    parentTabId={parentTabId}
                    parentLabel={parentLabel}
                    activeNovelData={activeNovelData}
                    handleAddTabTemplateField={handleAddTabTemplateField}
                    handleRemoveTabTemplateField={handleRemoveTabTemplateField}
                    handleRenameTabTemplateFieldLabel={handleRenameTabTemplateFieldLabel}
                    handleSetTabTemplateFieldSortPrefix={handleSetTabTemplateFieldSortPrefix}
                    handleMergeTabFieldSuggestionList={handleMergeTabFieldSuggestionList}
                    handleSetTabFieldSource={handleSetTabFieldSource}
                    setConfirmDialog={setConfirmDialog}
                    showToast={showToast}
                    defaultOpen
                    contextHint={entityTemplateContextHint}
                  />
                  <AppEntityQuickEntryConfig
                    tabLonId={parentTabId}
                    tabNhoId={tabConfig?.id}
                    fieldsTemplate={fieldsTemplate}
                    entityQuickEntry={tabConfig?.entityQuickEntry}
                    fieldSuggestionDependencies={tabConfig?.fieldSuggestionDependencies}
                    onSetEntityQuickEntry={handleSetTabEntityQuickEntry}
                    onSetFieldSuggestionDependencies={handleSetTabFieldSuggestionDependencies}
                    onRequestPropagateDependenciesToLon={requestPropagateFieldSuggestionDependenciesToLon}
                    mapParentTierSchema={tabConfig?.mapEntrySuggestions?.parentTierSchema}
                    mapParentTierFieldMap={tabConfig?.mapEntrySuggestions?.parentTierFieldMap}
                    onSetMapParentTierSchema={onSaveMapParentTierSchema}
                    onSetMapParentTierFieldMap={onSaveMapParentTierFieldMap}
                    onRequestPropagateMapParentTierSchemaToLon={requestPropagateMapParentTierSchemaToLon}
                    onRequestPropagateMapParentTierFieldMapToLon={requestPropagateMapParentTierFieldMapToLon}
                    onSetTemplateFieldSortPrefix={handleSetTabTemplateFieldSortPrefix}
                    onRequestPropagateToLon={requestPropagateEntityQuickEntryToLon}
                    onRequestPropagateToAllLons={requestPropagateEntityQuickEntryToAllLons}
                    registerFlushEntityQuickEntry={(fn) => {
                      flushEntityQuickEntryBeforeMainSaveRef.current = fn;
                    }}
                    showToast={showToast}
                    showQuickEntrySlots={showTemplateQuickEntrySlots}
                    overviewUsesDedicatedQuickForm={Boolean(showMapQuickSection || showForceQuickSection)}
                  />
                </div>
              </div>
            ) : (
            <details className={`group ${entityCreateTemplatePanelClass}`}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 hover:bg-slate-900/50 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                    {entityCreateTemplateTitle}
                  </div>
                  <div className="mt-0.5 line-clamp-3 text-[9px] font-serif leading-snug text-slate-500">
                    «Trường thông tin» bên dưới; tiếp theo khối <strong className="text-amber-200/85">viền vàng</strong> «Cấu hình
                    mẫu: các ô gợi ý nhanh» — chọn trường / phụ thuộc; Thế lực / Bản đồ: <strong className="text-slate-400">Tổng quan</strong>{' '}
                    vẫn là form riêng.
                  </div>
                </div>
                <span className="shrink-0 text-[9px] font-bold text-amber-200/80">Mở</span>
              </summary>
              <div className="space-y-2 border-t border-slate-800/70 bg-slate-900/25 px-3 py-2.5">
                <AppEntityTemplateFieldEditor
                  tabConfig={tabConfigForFieldEditor}
                  parentTabId={parentTabId}
                  parentLabel={parentLabel}
                  activeNovelData={activeNovelData}
                  handleAddTabTemplateField={handleAddTabTemplateField}
                  handleRemoveTabTemplateField={handleRemoveTabTemplateField}
                  handleRenameTabTemplateFieldLabel={handleRenameTabTemplateFieldLabel}
                  handleSetTabTemplateFieldSortPrefix={handleSetTabTemplateFieldSortPrefix}
                  handleMergeTabFieldSuggestionList={handleMergeTabFieldSuggestionList}
                  handleSetTabFieldSource={handleSetTabFieldSource}
                  setConfirmDialog={setConfirmDialog}
                  showToast={showToast}
                  defaultOpen
                  contextHint={entityTemplateContextHint}
                />
                <AppEntityQuickEntryConfig
                  tabLonId={parentTabId}
                  tabNhoId={tabConfig?.id}
                  fieldsTemplate={fieldsTemplate}
                  entityQuickEntry={tabConfig?.entityQuickEntry}
                  fieldSuggestionDependencies={tabConfig?.fieldSuggestionDependencies}
                  onSetEntityQuickEntry={handleSetTabEntityQuickEntry}
                  onSetFieldSuggestionDependencies={handleSetTabFieldSuggestionDependencies}
                  onRequestPropagateDependenciesToLon={requestPropagateFieldSuggestionDependenciesToLon}
                  mapParentTierSchema={tabConfig?.mapEntrySuggestions?.parentTierSchema}
                  mapParentTierFieldMap={tabConfig?.mapEntrySuggestions?.parentTierFieldMap}
                  onSetMapParentTierSchema={onSaveMapParentTierSchema}
                  onSetMapParentTierFieldMap={onSaveMapParentTierFieldMap}
                  onRequestPropagateMapParentTierSchemaToLon={requestPropagateMapParentTierSchemaToLon}
                  onRequestPropagateMapParentTierFieldMapToLon={requestPropagateMapParentTierFieldMapToLon}
                  onSetTemplateFieldSortPrefix={handleSetTabTemplateFieldSortPrefix}
                  onRequestPropagateToLon={requestPropagateEntityQuickEntryToLon}
                  onRequestPropagateToAllLons={requestPropagateEntityQuickEntryToAllLons}
                  registerFlushEntityQuickEntry={(fn) => {
                    flushEntityQuickEntryBeforeMainSaveRef.current = fn;
                  }}
                  showToast={showToast}
                  showQuickEntrySlots={showTemplateQuickEntrySlots}
                  overviewUsesDedicatedQuickForm={Boolean(showMapQuickSection || showForceQuickSection)}
                />
              </div>
            </details>
            )
          )}

          <datalist id="ttc-map-type-options">
            {mapQuickTypeSuggestionList.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <datalist id="ttc-force-system-options">
            {mapHierarchySuggestionList.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <datalist id="ttc-map-realm-options">
            {mapRealmSelectOptions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <datalist id="ttc-map-name-options">
            {mapNameSuggestionList.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <datalist id="ttc-map-parent-tier1-options">
            {mapParentTier1SuggestionList.map((item) => (
              <option key={`tier1-${item}`} value={item} />
            ))}
          </datalist>
          <datalist id="ttc-map-parent-tier2-options">
            {mapParentTier2SuggestionList.map((item) => (
              <option key={`tier2-${item}`} value={item} />
            ))}
          </datalist>
          <datalist id="ttc-map-parent-tier3-options">
            {mapParentTier3SuggestionList.map((item) => (
              <option key={`tier3-${item}`} value={item} />
            ))}
          </datalist>
          <datalist id="ttc-force-rank-options">
            {forceRankSuggestionList.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <datalist id="ttc-force-type-options">
            {forceTypeSuggestionList.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <datalist id="ttc-force-location-options">
            {forceLocationSuggestionList.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          {showInlineGuideHints && (
            <div className="space-y-0">
            <div className="grid gap-1.5 md:grid-cols-2">
              {parentTabId !== 'nhan-vat' && (
                <details className={`${entityModalHintCallout} group`}>
                  <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-2">
                    <span className={`${entityModalHintTitle} text-cyan-300`}>Token nhãn (mốc Nhân Vật)</span>
                    <span className="text-[9px] text-slate-500 group-open:hidden">Mở</span>
                  </summary>
                  <div className="mt-1.5 space-y-1 border-t border-cyan-900/25 pt-1.5">
                    <p className="text-[10px] text-slate-300 font-serif leading-relaxed">
                      <strong className="text-cyan-200">Chuẩn:</strong>{' '}
                      <code className="text-cyan-300">{OWNER_HINT_INPUT_FORMAT_TEXT}</code>
                    </p>
                    <p className="text-[10px] text-slate-400 font-serif leading-relaxed">{OWNER_HINT_PREFIX_GUIDE_TEXT}</p>
                    <p className="text-[10px] text-slate-400 font-serif leading-relaxed">{OWNER_TOKEN_GUIDE_TEXT}</p>
                  </div>
                </details>
              )}

              {showMapQuickSection && !initialData && (
                <details className={`${entityModalHintCallout} group`}>
                  <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-2">
                    <span className={entityModalHintTitle}>Ghi nhanh thẻ Bản Đồ</span>
                    <span className="text-[9px] text-slate-500 group-open:hidden">Mở</span>
                  </summary>
                  <div className="mt-1.5 space-y-1 border-t border-slate-800/80 pt-1.5 text-[10px] text-slate-400 font-serif leading-relaxed">
                    <p>
                      Mẫu <code className="text-amber-200">{mapQuickLabels.gioiDien?.label} · {mapQuickLabels.dacTinh?.label}</code> — ô{' '}
                      <strong className="text-amber-200/90">{safeString(fStatusLabel)}</strong>.
                    </p>
                    <p>
                      Gợi ý: <code className="text-amber-200">{statusFieldPlaceholder}</code> · Vd:{' '}
                      <code className="text-amber-200">{mapFieldPlaceholders.exampleA}</code>,{' '}
                      <code className="text-amber-200">{mapFieldPlaceholders.exampleB}</code>
                    </p>
                    <p>
                      {statusFieldHint} Thế lực (vd. Thiên Tôn cấp) ghi ở thẻ Thế lực, không ở đây.
                    </p>
                  </div>
                </details>
              )}

              {showForceQuickSection && (
                <details className={`${entityModalHintCallout} group`}>
                  <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-2">
                    <span className={entityModalHintTitle}>AUTO thế lực ↔ bản đồ</span>
                    <span className="text-[9px] text-slate-500 group-open:hidden">Mở</span>
                  </summary>
                  <div className="mt-1.5 space-y-1 border-t border-slate-800/80 pt-1.5 text-[10px] text-slate-400 font-serif leading-relaxed">
                    <p>
                      4 ô:{' '}
                      <code className="text-amber-200">{forceQuickLabels.loaiHinh?.label}</code> ·{' '}
                      <code className="text-amber-200">{forceQuickLabels.heCapBac?.label}</code> ·{' '}
                      <code className="text-amber-200">{forceQuickLabels.capBac?.label}</code> ·{' '}
                      <code className="text-amber-200">{forceQuickLabels.diaChi?.label}</code>
                    </p>
                    <p>
                      Trường: <code className="text-amber-200">f_loai_to_chuc</code>, <code className="text-amber-200">f_he_cap_the_luc</code>,{' '}
                      <code className="text-amber-200">f_status</code>, <code className="text-amber-200">f_dia_ban</code>
                    </p>
                  </div>
                </details>
              )}

              {isCultivationScope && (
                <details className={`${entityModalHintCallout} group`}>
                  <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-2">
                    <span className={entityModalHintTitle}>AUTO hệ thống ↔ cảnh giới</span>
                    <span className="text-[9px] text-slate-500 group-open:hidden">Mở</span>
                  </summary>
                  <p className="mt-1.5 border-t border-slate-800/80 pt-1.5 text-[10px] text-slate-400 font-serif leading-relaxed">
                    Cảnh Giới: <code className="text-amber-200">f_status</code> kiểu{' '}
                    <code className="text-amber-200">De Nhat - Linh Canh Bat Bo</code> để ghép sang Hệ Thống Tu Luyện.
                  </p>
                </details>
              )}
            </div>
            </div>
          )}

        </div>

        <div className="shrink-0 border-t border-slate-800/80 px-4 py-2.5 flex flex-shrink-0 justify-end gap-2 bg-slate-900/95">
          <button type="button" onClick={onClose} className="px-4 py-2.5 text-slate-400 hover:text-white font-serif transition-colors rounded-lg text-sm">Hủy bỏ</button>
          <button
            type="button"
            onClick={() => {
              if (!formData.name.trim()) return;
              flushMapListDraftsForMainSaveRef.current();
              flushEntityQuickEntryBeforeMainSaveRef.current?.();
              onSave(formData, dynamicData, null);
              onClose();
            }}
            disabled={!formData.name.trim()}
            className="px-5 py-2 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg font-bold font-serif text-sm shadow-lg transition-all flex items-center gap-2"
          >
            <Save size={16}/> Lưu thông tin
          </button>
        </div>
      </div>
    </div>
  );
};

export const ModalMilestone = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultChapterWhenNew,
  tabConfig,
  handleAvatarDrop,
  handlePickLocalImage,
  dirHandle,
  parentTabId,
  parentLabel,
  geminiApiKey,
  geminiMode = 'standard',
  entityMap = [],
  showToast,
  autoLinkToastEnabled = true,
}) => {
  const fieldsTemplate = resolveFieldsTemplate(tabConfig, parentTabId, parentLabel);
  const fieldSuggestions = useMemo(() => {
    const raw =
      tabConfig?.fieldSuggestionLists && typeof tabConfig.fieldSuggestionLists === 'object'
        ? tabConfig.fieldSuggestionLists
        : {};
    const out = {};
    Object.entries(raw).forEach(([fid, list]) => {
      out[fid] = suggestionRowsToValues(list);
    });
    return out;
  }, [tabConfig]);
  const milestoneHintListPrefix = useId().replace(/:/g, '');
  const terms = getTerms(parentTabId);
  const EVENT_EDITOR_ID = 'milestone-event-editor';
  const HISTORY_LIMIT = 120;
  const notesTypo = useSyncExternalStore(subscribeEntityNotesPrefs, getEntityNotesPrefs, getEntityNotesPrefs);
  const [formData, setFormData] = useState({ id: null, chapter: '', title: '', nextEntityName: '' });
  const [snapshotData, setSnapshotData] = useState({ avatar: '', dynamicData: {} });
  const [eventEdit, setEventEdit] = useState(() => ({ text: '', history: [''], hIndex: 0 }));
  const [toolbarState, setToolbarState] = useState(() => getEntityNotesToolbarState('', 0, 0));
  const [isSplitPreview, setIsSplitPreview] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLinkingAi, setIsLinkingAi] = useState(false);
  const [isFormattingStructure, setIsFormattingStructure] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const eventTextareaRef = useRef(null);
  const previewScrollRef = useRef(null);
  const scrollSyncLockRef = useRef(false);
  const trapRefMs = useFocusTrap(isOpen);
  const eventText = eventEdit.text;
  const toast = useCallback((message, tone = 'success', options = null) => {
    if (typeof showToast === 'function') showToast(message, tone, options);
  }, [showToast]);
  const geminiKeys = useMemo(
    () => (Array.isArray(geminiApiKey) ? geminiApiKey.filter(Boolean) : geminiApiKey ? [geminiApiKey] : []),
    [geminiApiKey]
  );
  const milestoneSubject = useMemo(() => {
    const title = safeString(formData.title).trim();
    if (title) return title;
    const chapter = safeString(formData.chapter).trim();
    return chapter ? `Mốc chương ${chapter}` : 'Sự kiện timeline';
  }, [formData.chapter, formData.title]);
  const templateProfile = useMemo(
    () =>
      resolveEntityNotesTemplateProfile({
        tabLabel: parentLabel || tabConfig?.label || '',
        activeTabLon: parentTabId,
        entityName: milestoneSubject,
      }),
    [parentLabel, tabConfig, parentTabId, milestoneSubject]
  );
  const patchFormData = (patch) =>
    setFormData((prev) => {
      const nextPatch = typeof patch === 'function' ? patch(prev || {}) : patch;
      return { ...(prev || {}), ...nextPatch };
    });
  const patchSnapshotData = (patch) =>
    setSnapshotData((prev) => {
      const nextPatch = typeof patch === 'function' ? patch(prev || {}) : patch;
      return { ...(prev || {}), ...nextPatch };
    });
  const patchSnapshotField = (fieldId, value) =>
    patchSnapshotData((prev) => ({
      dynamicData: {
        ...(prev?.dynamicData || {}),
        [fieldId]: value,
      },
    }));
  const prepareSnapshotPayload = useCallback(() => {
    let wrappedCount = 0;
    const normalizedDynamicEntries = Object.entries(snapshotData.dynamicData || {}).flatMap(([key, value]) => {
      if (typeof value !== 'string') return [];
      const trimmed = safeString(value).trim();
      if (!trimmed) return [];
      const fieldWrap = autoWrapWikiLinksByEntityMapWithCount(trimmed, entityMap);
      wrappedCount += fieldWrap.count;
      return [[key, fieldWrap.text]];
    });
    const avatar = safeString(snapshotData.avatar).trim();
    return {
      snapshot: {
        avatar,
        dynamicData: Object.fromEntries(normalizedDynamicEntries),
      },
      wrappedCount,
      hasSnapshot: Boolean(avatar || normalizedDynamicEntries.length > 0),
    };
  }, [entityMap, snapshotData]);
  const recordAndSetEventDraft = (next) => {
    setEventEdit(({ text, history, hIndex }) => {
      if (history[hIndex] === next && text === next) {
        return { text, history, hIndex };
      }
      if (history[hIndex] === next) {
        return { text: next, history, hIndex };
      }
      const nextHistory = history.slice(0, hIndex + 1);
      nextHistory.push(next);
      let nextIndex = nextHistory.length - 1;
      if (nextHistory.length > HISTORY_LIMIT) {
        nextHistory.shift();
        nextIndex -= 1;
      }
      return { text: next, history: nextHistory, hIndex: nextIndex };
    });
  };
  const undo = () => {
    setEventEdit((state) => {
      if (state.hIndex <= 0) return state;
      const nextIndex = state.hIndex - 1;
      return { ...state, text: state.history[nextIndex], hIndex: nextIndex };
    });
  };
  const redo = () => {
    setEventEdit((state) => {
      if (state.hIndex >= state.history.length - 1) return state;
      const nextIndex = state.hIndex + 1;
      return { ...state, text: state.history[nextIndex], hIndex: nextIndex };
    });
  };
  const syncToolbarStateFromEditor = () => {
    const textarea = eventTextareaRef.current;
    if (!textarea) return;
    setToolbarState(
      getEntityNotesToolbarState(textarea.value, textarea.selectionStart, textarea.selectionEnd)
    );
  };
  const applyEditorMutation = (nextState) => {
    const textarea = eventTextareaRef.current;
    if (!textarea || !nextState) return;
    textarea.value = nextState.newText;
    textarea.focus();
    textarea.setSelectionRange(nextState.selStart, nextState.selEnd);
    recordAndSetEventDraft(nextState.newText);
    setToolbarState(
      getEntityNotesToolbarState(nextState.newText, nextState.selStart, nextState.selEnd)
    );
  };
  const normalizeEventDraft = (sourceText, { announceIfChanged = false, announceIfSame = false } = {}) => {
    const cleaned = fixAllEntityNotesDiagnostics(sourceText);
    const changed = cleaned !== sourceText;
    if (changed) {
      recordAndSetEventDraft(cleaned);
      if (announceIfChanged) {
        toast('Đã làm sạch khoảng trắng và xuống dòng trước khi xử lý.');
      }
    } else if (announceIfSame) {
      toast('Nội dung đã gọn sẵn, không cần làm sạch thêm.');
    }
    return { text: changed ? cleaned : sourceText, changed };
  };

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    setIsAnalyzing(false);
    setIsLinkingAi(false);
    setIsFormattingStructure(false);
    setIsSplitPreview(false);
    const nextEvent = safeString(initialData?.event);
    if (initialData) {
      setFormData({
        id: initialData.id,
        chapter: safeString(initialData.chapter),
        title: safeString(initialData.title),
        nextEntityName: safeString(initialData.nextEntityName),
      });
      setSnapshotData(initialData.snapshot || { avatar: '', dynamicData: {} });
    } else {
      const defaultChapter =
        defaultChapterWhenNew != null && defaultChapterWhenNew !== '' ? String(defaultChapterWhenNew) : '';
      setFormData({ id: null, chapter: defaultChapter, title: '', nextEntityName: '' });
      setSnapshotData({ avatar: '', dynamicData: {} });
    }
    setEventEdit({ text: nextEvent, history: [nextEvent], hIndex: 0 });
    setToolbarState(getEntityNotesToolbarState(nextEvent, 0, 0));
  }, [isOpen, initialData, defaultChapterWhenNew]);

  useEffect(() => {
    const textarea = eventTextareaRef.current;
    if (!textarea) return;
    setToolbarState(
      getEntityNotesToolbarState(textarea.value, textarea.selectionStart ?? 0, textarea.selectionEnd ?? 0)
    );
  }, [eventText]);

  useEffect(() => {
    if (!isOpen) return;
    const onSelectionChange = () => {
      if (document.activeElement !== eventTextareaRef.current) return;
      syncToolbarStateFromEditor();
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [isOpen, eventText]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event) => {
      if (document.activeElement !== eventTextareaRef.current) return;
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if (
        (event.ctrlKey || event.metaKey) &&
        (event.key === 'y' || (event.key === 'z' && event.shiftKey))
      ) {
        event.preventDefault();
        redo();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen, eventEdit.hIndex, eventEdit.history.length]);

  useEffect(() => {
    if (!isOpen) return;
    const focusTarget = window.requestAnimationFrame(() => {
      const input = document.querySelector('[data-milestone-chapter-input="true"]');
      if (input && typeof input.focus === 'function') input.focus();
    });
    return () => window.cancelAnimationFrame(focusTarget);
  }, [isOpen]);

  useEffect(() => {
    const handler = (event) => {
      if (!isOpen || !formData.chapter || !eventText.trim()) return;
      const trapEl = trapRefMs.current;
      const activeEl = document.activeElement;
      if (event?.defaultPrevented) return;
      if (trapEl && activeEl && !trapEl.contains(activeEl)) return;
      const cleanedText = notesTypo.autoCleanOnSave ? fixAllEntityNotesDiagnostics(eventText) : eventText;
      const formatSync = syncEntityNotesDuplicateWordFormatting(cleanedText);
      const preparedText = formatSync.text;
      const eventWrap = autoWrapWikiLinksByEntityMapWithCount(preparedText, entityMap);
      const preparedSnapshot = prepareSnapshotPayload();
      const nextSnapshot = preparedSnapshot.snapshot;
      const wrappedCount = eventWrap.count + preparedSnapshot.wrappedCount;
      onSave(
        {
          ...formData,
          title: safeString(formData.title).trim(),
          nextEntityName: safeString(formData.nextEntityName).trim(),
          event: eventWrap.text,
        },
        preparedSnapshot.hasSnapshot ? nextSnapshot : null
      );
      if (preparedText !== eventText) {
        recordAndSetEventDraft(preparedText);
      }
      if (wrappedCount > 0 && autoLinkToastEnabled) {
        toast(`Đã tự bọc ${wrappedCount} [[liên kết]] theo thẻ có sẵn.`);
      }
      onClose();
      if (event?.cancelable) event.preventDefault();
      event?.stopImmediatePropagation?.();
    };
    window.addEventListener('ttc-save', handler);
    return () => window.removeEventListener('ttc-save', handler);
  }, [
    isOpen,
    formData,
    snapshotData,
    eventText,
    onSave,
    onClose,
    entityMap,
    toast,
    autoLinkToastEnabled,
    trapRefMs,
    notesTypo.autoCleanOnSave,
    prepareSnapshotPayload,
  ]);

  const formatDiagnostics = useMemo(() => collectEntityNotesDiagnostics(eventText), [eventText]);
  const fixableDiagnostics = useMemo(
    () => formatDiagnostics.filter((item) => item.fixable),
    [formatDiagnostics]
  );
  const undoDisabled = eventEdit.hIndex <= 0;
  const redoDisabled = eventEdit.hIndex >= eventEdit.history.length - 1;
  const resolveLineStartFromLineNumber = (lineNumber) => {
    const text = safeString(eventTextareaRef.current?.value ?? eventText);
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
  };
  const focusEditorRange = (selStart, selEnd = selStart) => {
    const textarea = eventTextareaRef.current;
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
  };
  const jumpToEditorLine = (lineNumber) => {
    const start = resolveLineStartFromLineNumber(lineNumber);
    const text = safeString(eventTextareaRef.current?.value ?? eventText);
    const nextBreak = text.indexOf('\n', start);
    const end = nextBreak === -1 ? text.length : nextBreak;
    focusEditorRange(start, end);
  };
  const syncScrollRatio = (source, target) => {
    if (!source || !target) return;
    const sourceMax = Math.max(1, source.scrollHeight - source.clientHeight);
    const targetMax = Math.max(0, target.scrollHeight - target.clientHeight);
    target.scrollTop = (source.scrollTop / sourceMax) * targetMax;
  };
  const handleEditorScroll = (event) => {
    if (!isSplitPreview || scrollSyncLockRef.current) return;
    const previewEl = previewScrollRef.current;
    if (!previewEl) return;
    scrollSyncLockRef.current = true;
    syncScrollRatio(event.currentTarget, previewEl);
    requestAnimationFrame(() => {
      scrollSyncLockRef.current = false;
    });
  };
  const handlePreviewScroll = (event) => {
    if (!isSplitPreview || scrollSyncLockRef.current) return;
    const textarea = eventTextareaRef.current;
    if (!textarea) return;
    scrollSyncLockRef.current = true;
    syncScrollRatio(event.currentTarget, textarea);
    requestAnimationFrame(() => {
      scrollSyncLockRef.current = false;
    });
  };
  const applySingleDiagnosticFix = (diagnostic) => {
    if (!diagnostic?.fixable) return;
    const patched = applyEntityNotesDiagnosticFix(eventText, diagnostic);
    if (patched !== eventText) {
      recordAndSetEventDraft(patched);
      toast(`Đã sửa: ${diagnostic.label}`);
    }
  };
  const fixAllDiagnostics = () => {
    const patched = fixAllEntityNotesDiagnostics(eventText);
    if (patched === eventText) {
      toast('Không còn lỗi nhẹ nào để sửa thêm.');
      return;
    }
    recordAndSetEventDraft(patched);
    toast('Đã sửa các lỗi định dạng nhẹ và chuẩn hoá lại ghi chú.');
  };
  const handleEditorPaste = (event) => {
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
  };
  const handleEventEditorKeyDown = (event) => {
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
  };
  const handleAnalyzeMilestone = async () => {
    if (geminiKeys.length === 0) {
      setErrorMsg('Vui lòng thiết lập API Key trong phần Cài Đặt để dùng tính năng AI.');
      return;
    }
    if (!eventText.trim()) return;
    const normalized = normalizeEventDraft(eventText).text;
    const { wasTruncated } = truncateForAI(normalized);
    setIsAnalyzing(true);
    setErrorMsg(wasTruncated ? 'Đoạn quá dài - AI chỉ xử lý khoảng 12k ký tự đầu.' : '');
    try {
      const result = await analyzeTextWithAI(normalized, fieldsTemplate, geminiKeys, geminiMode);
      if (result) {
        const newDyn = { ...(snapshotData.dynamicData || {}) };
        fieldsTemplate.forEach((field) => {
          if (result[field.id]) newDyn[field.id] = safeString(result[field.id]);
        });
        patchSnapshotData({
          avatar: safeString(result.avatar).trim() || snapshotData.avatar,
          dynamicData: newDyn,
        });
        toast('AI đã đọc mốc và cập nhật hồ sơ thời kỳ ẩn cho timeline.');
      }
    } catch (error) {
      setErrorMsg(mapGeminiErrorToUserMessage(error));
    } finally {
      setIsAnalyzing(false);
    }
  };
  const handleLinkWithAi = async () => {
    if (!eventText.trim()) {
      toast('Chưa có nội dung để AI tạo link.', 'warning');
      return;
    }
    const cleanedEarly = normalizeEventDraft(eventText);
    const workingText = cleanedEarly.text;
    const localWrapEarly = autoWrapWikiLinksByEntityMapWithCount(workingText, entityMap);
    if (localWrapEarly.count > 0 && localWrapEarly.text !== workingText) {
      recordAndSetEventDraft(localWrapEarly.text);
      toast(`Đã tự bọc ${localWrapEarly.count} [[liên kết]] theo thẻ có sẵn. Bấm lại AI nếu muốn gợi ý thêm cho khó.`);
      return;
    }
    if (geminiKeys.length === 0) {
      toast('Vui lòng thiết lập API Key để dùng AI.', 'warning');
      return;
    }
    const { wasTruncated } = truncateForAI(workingText);
    if (wasTruncated) {
      toast('Đoạn quá dài - chỉ gửi khoảng 12.000 ký tự đầu cho AI.', 'warning');
    }
    setIsLinkingAi(true);
    try {
      const res = await suggestWikiLinkSpotsWithAI(workingText, geminiKeys, geminiMode);
      const spots = Array.isArray(res?.linkSpots) ? res.linkSpots : [];
      const aiNext = applyWikiLinkSpots(workingText, spots);
      const fallbackWrap = autoWrapWikiLinksByEntityMapWithCount(workingText, entityMap);
      const nextText = aiNext !== workingText ? aiNext : fallbackWrap.text;
      if (nextText !== workingText) {
        recordAndSetEventDraft(nextText);
        if (aiNext !== workingText) {
          toast('Đã thêm [[liên kết]] bằng AI, giữ nguyên nội dung bạn đã nhập.');
        } else {
          toast('AI chưa định vị được spot rõ ràng, đã tự bọc link theo danh sách thẻ có sẵn.');
        }
      } else if (spots.length > 0) {
        toast('AI gợi ý link nhưng không khớp văn bản hiện tại, thử lại sau khi rút gọn đoạn.', 'warning');
      } else {
        toast('Không có chỗ mới cần bọc link, hoặc nội dung đã có [[...]].');
      }
    } catch (error) {
      const msg = mapGeminiErrorToUserMessage(error);
      const rateLimited = /429|503|rate_limit|qua tai api/i.test(String(error?.message || ''));
      const fallbackWrap = autoWrapWikiLinksByEntityMapWithCount(workingText, entityMap);
      if (rateLimited && fallbackWrap.text !== workingText) {
        recordAndSetEventDraft(fallbackWrap.text);
        toast('AI đang quá tải (429/503), đã tự bọc link theo danh sách thẻ có sẵn.', 'warning');
      } else {
        toast(msg, rateLimited ? 'warning' : 'error');
      }
    } finally {
      setIsLinkingAi(false);
    }
  };
  const formatNotesStructureWithAI = async () => {
    if (!eventText.trim()) {
      toast('Chưa có nội dung để AI dàn khung.', 'warning');
      return;
    }
    if (geminiKeys.length === 0) {
      toast('Vui lòng thiết lập API Key để dùng AI dàn khung.', 'warning');
      return;
    }
    const normalized = normalizeEventDraft(eventText).text;
    const { text: truncated } = truncateForAI(normalized, geminiMode === 'quick' ? 7000 : undefined);
    const payload = {
      contents: [
        {
          parts: [
            {
              text: `Chủ thể ghi chú: ${milestoneSubject}\n\nVăn bản gốc:\n${truncated}`,
            },
          ],
        },
      ],
      systemInstruction: {
        parts: [
          {
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
          },
        ],
      },
    };
    setIsFormattingStructure(true);
    try {
      const raw = await callGeminiAPIText(payload, geminiKeys, { timeoutMs: 45000 });
      const formatted = safeString(raw)
        .replace(/^```(?:markdown|md)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();
      if (!formatted) {
        toast('AI chưa trả về bản dàn khung hợp lệ.', 'warning');
        return;
      }
      if (formatted.length < normalized.length * 0.45) {
        toast('AI trả về bản quá ngắn nên mình chưa áp dụng để tránh mất ý.', 'warning');
        return;
      }
      const finalText = fixAllEntityNotesDiagnostics(formatted);
      if (finalText === eventText) {
        toast('AI chưa đề xuất bố cục mới rõ ràng.');
        return;
      }
      recordAndSetEventDraft(finalText);
      toast('AI đã dàn lại bố cục ghi chú sự kiện.');
    } catch (error) {
      toast(mapGeminiErrorToUserMessage(error), 'warning');
    } finally {
      setIsFormattingStructure(false);
    }
  };
  const handleInsertImageByUrl = () => {
    const rawUrl = window.prompt('Dán URL ảnh muốn chèn vào ghi chép sự kiện:', '');
    const imageUrl = safeString(rawUrl).trim();
    if (!imageUrl) return;
    if (/^javascript:/i.test(imageUrl)) {
      toast('URL ảnh không hợp lệ.', 'warning');
      return;
    }
    handleToolbarInsertText(
      `![${safeString(formData.title).trim() || 'Minh hoạ sự kiện'}](${imageUrl})`,
      EVENT_EDITOR_ID,
      (nextText) => recordAndSetEventDraft(nextText)
    );
  };
  const handlePickMilestoneEditorImage = (setAvatarCallback, editorId = null) =>
    handlePickLocalImage?.(setAvatarCallback, editorId, 'milestone-event-inline-image');

  const handleSave = () => {
    const cleanedText = notesTypo.autoCleanOnSave ? fixAllEntityNotesDiagnostics(eventText) : eventText;
    const formatSync = syncEntityNotesDuplicateWordFormatting(cleanedText);
    const preparedText = formatSync.text;
    const remainingWarnings = collectEntityNotesDiagnostics(preparedText);
    const eventWrap = autoWrapWikiLinksByEntityMapWithCount(preparedText, entityMap);
    const preparedSnapshot = prepareSnapshotPayload();
    const nextSnapshot = preparedSnapshot.snapshot;
    const wrappedCount = eventWrap.count + preparedSnapshot.wrappedCount;
    if (preparedText !== eventText) {
      recordAndSetEventDraft(preparedText);
      if (cleanedText !== eventText && formatSync.propagatedCount > 0) {
        toast('Đã tự chuẩn hoá ghi chú và đồng bộ định dạng cho các cụm trùng trước khi lưu.');
      } else if (formatSync.propagatedCount > 0) {
        toast(`Đã đồng bộ định dạng cho ${formatSync.propagatedCount} cụm trùng trước khi lưu.`);
      } else {
        toast('Đã tự chuẩn hoá ghi chú trước khi lưu.');
      }
    } else if (remainingWarnings.length > 0) {
      toast(`Đã lưu nhưng vẫn còn ${remainingWarnings.length} cảnh báo định dạng nhẹ.`, 'warning');
    }
    if (wrappedCount > 0 && autoLinkToastEnabled) {
      toast(`Đã tự bọc ${wrappedCount} [[liên kết]] theo thẻ có sẵn.`);
    }
    onSave(
      {
        ...formData,
        title: safeString(formData.title).trim(),
        nextEntityName: safeString(formData.nextEntityName).trim(),
        event: eventWrap.text,
      },
      preparedSnapshot.hasSnapshot ? nextSnapshot : null
    );
    onClose();
  };

  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Ghi chép mệnh số"
    >
      <div
        data-testid="modal-milestone-root"
        ref={trapRefMs}
        className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-amber-700/50 bg-slate-950 shadow-[0_0_50px_rgba(217,119,6,0.16)]"
      >
        <div className="border-b border-slate-800 px-6 py-5 md:px-8">
          <h2 className="flex items-center gap-2 text-xl font-bold font-heading text-amber-400">
            <Clock size={20} /> Ghi Chép Mệnh Số
          </h2>
          <p className="mt-1 text-sm font-serif text-slate-400">
            Form timeline mới tập trung vào ảnh, mốc chương, tên sự kiện và khung ghi chép sự kiện.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 md:px-8">
          <div className="space-y-6">
            <section className="rounded-[28px] border border-slate-800/80 bg-slate-900/60 p-5 shadow-[inset_0_1px_0_rgba(148,163,184,0.05)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-start">
                <div
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleAvatarDrop && handleAvatarDrop(event, (url) => patchSnapshotData({ avatar: url }))}
                  onClick={() =>
                    handlePickLocalImage &&
                    handlePickLocalImage((url) => patchSnapshotData({ avatar: url }), null, 'avatar-snapshot')
                  }
                  className="group flex h-28 w-28 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[24px] border border-dashed border-slate-700 bg-slate-950 transition-colors hover:border-amber-500"
                  title="Nhấp hoặc kéo thả ảnh vào đây"
                >
                  {snapshotData.avatar ? (
                    safeString(snapshotData.avatar).startsWith('local_image:') ? (
                      <AsyncLocalImage
                        filename={snapshotData.avatar.replace('local_image:', '')}
                        alt="ảnh timeline"
                        dirHandle={dirHandle}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <img
                        src={snapshotData.avatar}
                        className="h-full w-full object-cover"
                        alt="ảnh timeline"
                        onError={(event) => {
                          event.target.onerror = null;
                          event.target.src = FALLBACK_IMG;
                        }}
                      />
                    )
                  ) : (
                    <ImageIcon className="text-slate-600 transition-colors group-hover:text-amber-400" />
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                      <span className="inline-flex items-center gap-1">
                        <Upload size={12} /> {terms.image} tại mốc này
                      </span>
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        value={safeString(snapshotData.avatar)}
                        onChange={(event) => patchSnapshotData({ avatar: event.target.value })}
                        className="w-full flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-200 outline-none transition-colors focus:border-amber-500"
                        placeholder="Dán URL ảnh hoặc chọn file"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handlePickLocalImage &&
                          handlePickLocalImage((url) => patchSnapshotData({ avatar: url }), null, 'avatar-snapshot')
                        }
                        className="rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-bold text-slate-200 transition-colors hover:border-amber-700/50 hover:bg-slate-700"
                      >
                        Chọn File
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleAnalyzeMilestone}
                      disabled={isAnalyzing || !eventText.trim()}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-700/40 bg-emerald-950/30 px-4 py-2 text-[11px] font-bold text-emerald-200 transition-colors hover:bg-emerald-900/40 disabled:opacity-50"
                      title="AI đọc nội dung mốc để gợi ý hồ sơ thời kỳ ẩn cho timeline"
                    >
                      {isAnalyzing ? (
                        <div className="h-4 w-4 rounded-full border-2 border-emerald-100 border-t-transparent animate-spin" />
                      ) : (
                        <Sparkles size={13} />
                      )}
                      {isAnalyzing ? 'Đang đọc mốc...' : 'AI Đọc Mốc'}
                    </button>
                    <p className="self-center text-[11px] font-serif text-slate-500">
                      Khối này giữ lại phần thêm hình ảnh, kéo thả hoặc chọn file đều dùng được.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-400">
                  Mốc Chương *
                </label>
                <input
                  data-milestone-chapter-input="true"
                  type="number"
                  value={safeString(formData.chapter)}
                  onChange={(event) => patchFormData({ chapter: event.target.value })}
                  className="w-full rounded-[22px] border border-slate-700 bg-slate-900 px-4 py-3 text-base font-bold text-amber-300 outline-none transition-colors focus:border-amber-500"
                  placeholder="VD: 150"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-400">
                  Tên sự kiện
                </label>
                <input
                  value={safeString(formData.title)}
                  onChange={(event) => patchFormData({ title: event.target.value })}
                  className="w-full rounded-[22px] border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 font-serif outline-none transition-colors focus:border-amber-500"
                  placeholder="VD: Kết đan thành công"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-400">
                  Tên mới sau nâng cấp (tuỳ chọn)
                </label>
                <input
                  value={safeString(formData.nextEntityName)}
                  onChange={(event) => patchFormData({ nextEntityName: event.target.value })}
                  className="w-full rounded-[22px] border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 font-serif outline-none transition-colors focus:border-amber-500"
                  placeholder="VD: Tháp Phượng Hoàng"
                />
                <p className="mt-1 text-[11px] font-serif text-slate-500">
                  Nếu nhập, khi lưu mốc sẽ tự đổi tên thẻ hiện tại sang tên mới này.
                </p>
              </div>

              {parentTabId === 'nhan-vat' && (
                <div className="rounded-2xl border border-cyan-800/50 bg-cyan-950/20 px-4 py-3">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-cyan-300">
                    Bộ ký tự nhãn timeline (Nhân vật)
                  </p>
                  <p className="text-[11px] font-serif leading-relaxed text-slate-300">
                    {MILESTONE_LABELS.map((item) => `${item.bracketToken} ${item.title}`).join(' · ')}
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-[32px] border border-slate-800/80 bg-slate-900/45 p-5 shadow-[inset_0_1px_0_rgba(148,163,184,0.05)]">
              <div className="mb-4">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                  Thông tin sự kiện *
                </label>
                <p className="mt-1 text-[11px] font-serif text-slate-500">
                  Khung này dùng cùng giao diện, toolbar, preview và AI như phần ghi chép chi tiết.
                </p>
              </div>

              <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => normalizeEventDraft(eventText, { announceIfChanged: true, announceIfSame: true })}
                  className="flex items-center gap-1.5 rounded-[40px] border border-slate-700 bg-slate-800/90 px-3 py-2.5 text-[11px] font-bold text-slate-200 transition-all hover:bg-slate-700"
                  title="Làm sạch khoảng trắng, ký tự rác và các dòng bị ngắt không hợp lý"
                >
                  <RefreshCw size={13} /> Làm sạch
                </button>
                <button
                  type="button"
                  disabled={isLinkingAi}
                  onClick={handleLinkWithAi}
                  className="flex items-center gap-2 rounded-[40px] bg-indigo-700 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-indigo-600 disabled:opacity-50"
                  title="AI chỉ thêm [[liên kết]], không đổi nội dung bạn đã nhập"
                >
                  {isLinkingAi ? (
                    <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <Link2 size={14} />
                  )}
                  {isLinkingAi ? 'Đang xử lý...' : 'AI Tạo Link'}
                </button>
                <button
                  type="button"
                  disabled={isFormattingStructure}
                  onClick={formatNotesStructureWithAI}
                  className="flex items-center gap-2 rounded-[40px] bg-violet-700 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-violet-600 disabled:opacity-50"
                  title="AI chỉ dàn lại bố cục: tiêu đề, mục, bullet, callout"
                >
                  {isFormattingStructure ? (
                    <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  {isFormattingStructure ? 'Đang dàn khung...' : 'AI Dàn Khung'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsSplitPreview((prev) => !prev)}
                  className={`ml-auto flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                    isSplitPreview
                      ? 'border-amber-700/40 bg-amber-700/30 text-amber-400'
                      : 'border-slate-700 bg-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Eye size={12} /> Preview
                </button>
              </div>

              <div className="flex min-h-[420px] flex-col">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <MarkdownToolbar
                    editorId={EVENT_EDITOR_ID}
                    variant="entityNotes"
                    onInsertImage={handleInsertImageByUrl}
                    onPickLocalImage={handlePickMilestoneEditorImage}
                    onUndo={undo}
                    onRedo={redo}
                    undoDisabled={undoDisabled}
                    redoDisabled={redoDisabled}
                    onEditorContentChange={(nextText) => recordAndSetEventDraft(nextText)}
                    notesFontKey={notesTypo.fontKey}
                    notesFontSizePx={notesTypo.sizePx}
                    onNotesFontKey={(fontKey) => setEntityNotesPrefs({ fontKey })}
                    onNotesFontSizePx={(sizePx) => setEntityNotesPrefs({ sizePx })}
                    entityNotesSubject={milestoneSubject}
                    entityNotesToolbarState={toolbarState}
                    entityNotesTemplateProfile={templateProfile}
                    notesAutoCleanOnSave={notesTypo.autoCleanOnSave}
                    onNotesAutoCleanOnSave={(enabled) => setEntityNotesPrefs({ autoCleanOnSave: enabled })}
                    onAiFormatStructure={formatNotesStructureWithAI}
                  />
                </div>

                {formatDiagnostics.length > 0 && (
                  <div className="mb-3 rounded-2xl border border-amber-700/40 bg-amber-950/20 px-4 py-3 text-[12px] text-amber-100">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
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

                <div className={`flex flex-1 gap-4 min-h-[320px] ${isSplitPreview ? 'flex-row' : 'flex-col'}`}>
                  <textarea
                    id={EVENT_EDITOR_ID}
                    ref={eventTextareaRef}
                    value={eventText}
                    onChange={(event) => {
                      recordAndSetEventDraft(event.target.value);
                      setToolbarState(
                        getEntityNotesToolbarState(
                          event.target.value,
                          event.target.selectionStart,
                          event.target.selectionEnd
                        )
                      );
                    }}
                    className={`resize-none bg-transparent text-slate-200 leading-loose outline-none custom-scrollbar ${
                      isSplitPreview ? 'w-1/2 flex-shrink-0' : 'flex-1 min-h-[320px]'
                    }`}
                    style={{
                      fontFamily: getEntityNotesFontStack(notesTypo.fontKey),
                      fontSize: `${notesTypo.sizePx}px`,
                    }}
                    placeholder="Nhập diễn biến sự kiện... Dùng [[Tên]] để liên kết wiki, xuống dòng/bullet như khung ghi chép chi tiết."
                    spellCheck
                    onKeyDown={handleEventEditorKeyDown}
                    onKeyUp={syncToolbarStateFromEditor}
                    onClick={syncToolbarStateFromEditor}
                    onSelect={syncToolbarStateFromEditor}
                    onPaste={handleEditorPaste}
                    onScroll={handleEditorScroll}
                  />
                  {isSplitPreview && (
                    <MarkdownPreviewPane
                      text={eventText}
                      dirHandle={dirHandle}
                      entityMap={entityMap}
                      linkRegex={null}
                      onNavigate={null}
                      selfEntityId={null}
                      variant="entityNotes"
                      containerRef={previewScrollRef}
                      onScroll={handlePreviewScroll}
                      onJumpToAnchor={(item) => jumpToEditorLine(item.line)}
                      onJumpToLine={jumpToEditorLine}
                      className="w-1/2 min-h-[320px] overflow-y-auto border-l border-slate-700 pl-4 font-serif custom-scrollbar"
                    />
                  )}
                </div>
              </div>

              {errorMsg && <p className="mt-3 text-xs text-rose-400">{safeString(errorMsg)}</p>}
            </section>

            <section className="rounded-[28px] border border-violet-800/35 bg-violet-950/10 p-5 shadow-[inset_0_1px_0_rgba(148,163,184,0.05)]">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-violet-300">
                    Hồ sơ thời kỳ này
                  </h3>
                  <p className="mt-1 text-[11px] font-serif leading-relaxed text-slate-400">
                    Ảnh ở đầu form và các ô dưới đây sẽ đi vào snapshot của mốc. Để trống nếu mốc này không làm thay đổi field tương ứng.
                  </p>
                </div>
                <div className="rounded-full border border-violet-700/30 bg-slate-950/50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-200">
                  {Object.values(snapshotData.dynamicData || {}).filter((value) => safeString(value).trim()).length} field đang ghi nhận
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {fieldsTemplate.map((field) => {
                  const fieldId = safeString(field?.id);
                  if (!fieldId) return null;
                  const isMultiline = fieldId === WIKI_ALIAS_FIELD.id || fieldId === 'f_desc';
                  const rawLabel = safeString(field?.label || fieldId);
                  const prefix = safeString(field?.sortPrefix).trim();
                  const label = prefix ? `${prefix}. ${rawLabel}` : rawLabel;
                  const value = safeString(snapshotData.dynamicData?.[fieldId]);
                  const hintOpts = Array.isArray(fieldSuggestions[fieldId])
                    ? fieldSuggestions[fieldId].filter((h) => safeString(h).trim())
                    : [];
                  const listDomId =
                    !isMultiline && hintOpts.length > 0
                      ? `${milestoneHintListPrefix}-hint-${fieldId.replace(/[^a-zA-Z0-9_-]/g, '_')}`
                      : undefined;
                  return (
                    <div
                      key={fieldId}
                      className={`space-y-2 ${isMultiline ? 'md:col-span-2' : ''}`}
                    >
                      <label
                        htmlFor={`milestone-snapshot-${fieldId}`}
                        className="block text-[10px] font-bold uppercase tracking-widest text-violet-200"
                      >
                        {label}
                      </label>
                      {isMultiline ? (
                        <textarea
                          id={`milestone-snapshot-${fieldId}`}
                          aria-label={label}
                          value={value}
                          onChange={(event) => patchSnapshotField(fieldId, event.target.value)}
                          rows={fieldId === WIKI_ALIAS_FIELD.id ? 3 : 4}
                          className="min-h-[5.5rem] w-full resize-y rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm font-serif text-slate-100 outline-none transition-colors focus:border-violet-500"
                          placeholder={`Để trống nếu mốc này không đổi ${label.toLowerCase()}`}
                        />
                      ) : (
                        <>
                          <input
                            id={`milestone-snapshot-${fieldId}`}
                            aria-label={label}
                            list={listDomId}
                            value={value}
                            onChange={(event) => patchSnapshotField(fieldId, event.target.value)}
                            className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm font-serif text-slate-100 outline-none transition-colors focus:border-violet-500"
                            placeholder={`Để trống nếu mốc này không đổi ${label.toLowerCase()}`}
                          />
                          {listDomId && (
                            <datalist id={listDomId}>
                              {hintOpts.map((h) => (
                                <option key={h} value={h} />
                              ))}
                            </datalist>
                          )}
                        </>
                      )}
                      {fieldId === WIKI_ALIAS_FIELD.id && (
                        <p className="text-[11px] font-serif leading-relaxed text-slate-500">
                          Biệt danh ở snapshot sẽ hiện cho đúng thời kỳ này; có thể tách bằng dấu phẩy, <code>/</code> hoặc <code>|</code>.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-800 px-6 py-4 md:px-8">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl px-5 py-2.5 font-serif text-slate-400 transition-colors hover:text-white"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!formData.chapter || !eventText.trim()}
            className="flex items-center gap-2 rounded-2xl bg-amber-700 px-6 py-2.5 font-bold font-serif text-white shadow-lg transition-colors hover:bg-amber-600 disabled:opacity-50"
          >
            <Save size={18} /> {formData.id ? 'Lưu cập nhật' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
};


export const ModalQuickCreate = ({ isOpen, onClose, quickCreateName, onConfirm, activeTabs }) => {
    const [selectedPath, setSelectedPath] = useState('');
    
    const collectionTabs = [];
    if (activeTabs) {
        activeTabs.forEach(lon => {
            lon.subTabs?.forEach(nho => {
                if (nho.viewType === 'collection-track') {
                    collectionTabs.push({ path: `${lon.id}|${nho.id}`, label: `${lon.label} ➔ ${nho.label}` });
                }
            })
        });
    }

    const trapRefQuick = useFocusTrap(isOpen);
    if (!isOpen) return null;
    return (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-fast"
          role="dialog"
          aria-modal="true"
          aria-label="Ngưng tụ ý niệm"
        >
           <div ref={trapRefQuick} className="bg-slate-900 border border-emerald-900/50 rounded-2xl w-full max-w-md shadow-2xl p-6">
             <h2 className="text-xl font-heading font-bold text-emerald-500 mb-2">Ngưng Tụ Ý Niệm</h2>
             <p className="text-sm text-slate-400 font-serif mb-6">Khí tức <strong className="text-emerald-400">{quickCreateName}</strong> chưa được ghi chép. Bạn muốn tạo hồ sơ cho nó ở thẻ nào?</p>
             
             <select className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 focus:border-emerald-500 outline-none mb-6 font-serif" value={selectedPath} onChange={e => setSelectedPath(e.target.value)}>
                <option value="">-- Chọn phân loại thẻ --</option>
                {collectionTabs.map(t => <option key={t.path} value={t.path}>{t.label}</option>)}
             </select>

             <div className="flex justify-end gap-3">
                <button onClick={onClose} className="px-5 py-2.5 text-slate-400 font-serif hover:text-slate-200">Hủy</button>
                <button disabled={!selectedPath} onClick={() => { onConfirm(quickCreateName, selectedPath); onClose(); }} className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg font-bold font-serif shadow-lg flex items-center gap-2"><Sparkles size={16}/> Khai Sinh</button>
             </div>
           </div>
        </div>
    );
};

export const ModalSettings = ({
  isOpen,
  onClose,
  handleConnectFolder,
  dirHandle,
  dirName,
  onExportBackup,
  onExportIndexOnly,
  onImportBackup,
  onCleanupLegacyIndexFiles,
  onRequestRecalculateLibraryStats,
  libraryNovelCount = 0,
  isStatsBackfilling = false,
  geminiApiKeys,
  setGeminiApiKeys,
  aiMode = 'standard',
  setAiMode,
  wikiExactMatchOnly,
  setWikiExactMatchOnly,
  performanceMode,
  setPerformanceMode,
  autoLinkToastEnabled,
  setAutoLinkToastEnabled,
}) => {
  const [newKey, setNewKey] = useState('');
  const [testStatus, setTestStatus] = useState({}); // idx -> 'testing'|'ok'|'busy'|'fail'
  const [showKeys, setShowKeys] = useState({});     // idx -> bool (hiện plain text)

  const notesTypoPrefs = useSyncExternalStore(subscribeEntityNotesPrefs, getEntityNotesPrefs, getEntityNotesPrefs);
  const trapRefSettings = useFocusTrap(isOpen);

  if (!isOpen) return null;

  const keys = Array.isArray(geminiApiKeys) ? geminiApiKeys : (geminiApiKeys ? [geminiApiKeys] : []);

  const handleAdd = () => {
    const trimmed = newKey.trim().replace(/\s+/g, '');
    if (!trimmed) return;
    setGeminiApiKeys([...keys, trimmed]);
    setNewKey('');
  };

  const handleRemove = (idx) => {
    setGeminiApiKeys(keys.filter((_, i) => i !== idx));
    setTestStatus(prev => { const n = {...prev}; delete n[idx]; return n; });
  };

  const handleTest = async (key, idx) => {
    const normalizedKey = safeString(key).trim().replace(/\s+/g, '');
    if (!normalizedKey) {
      setTestStatus(prev => ({ ...prev, [idx]: 'fail' }));
      return;
    }
    setTestStatus(prev => ({ ...prev, [idx]: 'testing' }));
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(normalizedKey)}`,
        { method: 'GET' }
      );
      if (res.ok) {
        setTestStatus(prev => ({ ...prev, [idx]: 'ok' }));
        return;
      }
      // 429/503 thường là quá tải hoặc rate limit, không đồng nghĩa key sai.
      if (res.status === 429 || res.status === 503) {
        setTestStatus(prev => ({ ...prev, [idx]: 'busy' }));
        return;
      }
      setTestStatus(prev => ({ ...prev, [idx]: 'fail' }));
    } catch {
      // Lỗi mạng tạm thời: không kết luận key hỏng.
      setTestStatus(prev => ({ ...prev, [idx]: 'busy' }));
    }
  };

  const maskKey = (k) => k.length > 12 ? k.slice(0, 8) + '••••••••' + k.slice(-4) : '••••••••••••';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Ấn ký và lưu trữ"
    >
       <div ref={trapRefSettings} className="bg-slate-900 border border-amber-700/50 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
             <div className="flex items-center gap-3">
                <HardDrive size={24} className="text-amber-500" />
                <h2 className="text-xl font-heading font-bold text-slate-100">Ấn Ký & Lưu Trữ</h2>
             </div>
             <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
          </div>
          <div className="p-6 pb-6 overflow-y-auto max-h-[80vh] custom-scrollbar space-y-7">

             {/* ===== MULTI API KEY ===== */}
             <div>
               <h3 className="text-sm font-bold text-indigo-400 mb-1 uppercase tracking-widest flex items-center gap-2"><Sparkles size={16}/> Khí Linh AI — Gemini API Keys</h3>
               <p className="text-slate-500 font-serif text-xs leading-relaxed mb-4">
                 Thêm nhiều key để tự động xoay vòng khi vượt giới hạn (429). Keys lưu cục bộ trong trình duyệt, không mất khi F5.
               </p>

               {/* Danh sách keys hiện có */}
               <div className="space-y-2 mb-4">
                 {keys.length === 0 && (
                   <div className="text-center py-4 text-slate-600 font-serif text-sm italic border border-dashed border-slate-800 rounded-xl">Chưa có key nào. Thêm key bên dưới.</div>
                 )}
                 {keys.map((k, idx) => {
                   const st = testStatus[idx];
                   return (
                     <div key={idx} className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2.5">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${st === 'ok' ? 'bg-emerald-400' : st === 'busy' ? 'bg-amber-400' : st === 'fail' ? 'bg-rose-500' : 'bg-slate-600'}`}/>
                       <span className="flex-1 font-mono text-xs text-slate-300 truncate select-none">
                         {showKeys[idx] ? k : maskKey(k)}
                       </span>
                       <span className="text-[10px] text-slate-600 flex-shrink-0">#{idx + 1}</span>
                       <button onClick={() => setShowKeys(prev => ({ ...prev, [idx]: !prev[idx] }))} className="p-1 text-slate-600 hover:text-slate-300 transition-colors flex-shrink-0" title={showKeys[idx] ? 'Ẩn' : 'Hiện'}>
                         <Eye size={13}/>
                       </button>
                       <button onClick={() => handleTest(k, idx)} disabled={st === 'testing'} className={`px-2 py-1 rounded-lg text-[10px] font-bold flex-shrink-0 transition-colors border ${st === 'ok' ? 'border-emerald-700/50 text-emerald-400 bg-emerald-950/30' : st === 'busy' ? 'border-amber-700/50 text-amber-300 bg-amber-950/30' : st === 'fail' ? 'border-rose-700/50 text-rose-400 bg-rose-950/30' : 'border-slate-700 text-slate-400 hover:text-indigo-400 hover:border-indigo-700/50 bg-slate-900'}`}>
                         {st === 'testing' ? '...' : st === 'ok' ? '✓ OK' : st === 'busy' ? '⚠ Bận' : st === 'fail' ? '✗ Lỗi' : 'Thử'}
                       </button>
                       <button onClick={() => handleRemove(idx)} className="p-1 text-slate-600 hover:text-rose-400 transition-colors flex-shrink-0"><Trash2 size={14}/></button>
                     </div>
                   );
                 })}
               </div>

               {/* Thêm key mới */}
               <div className="flex gap-2">
                 <input
                   type="password"
                   value={newKey}
                   onChange={e => setNewKey(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && handleAdd()}
                   placeholder="AIzaSy... (dán key mới vào đây)"
                   className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:border-indigo-500 outline-none font-mono shadow-inner"
                 />
                 <button onClick={handleAdd} disabled={!newKey.trim()} className="px-4 py-2.5 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 text-white rounded-xl font-bold flex items-center gap-2 text-sm transition-colors flex-shrink-0">
                   <Plus size={16}/> Thêm
                 </button>
               </div>
               {keys.length > 1 && (
                 <p className="mt-2 text-[11px] text-indigo-400/70 font-serif italic">
                   ✦ Có {keys.length} key — tự động xoay vòng khi gặp giới hạn tốc độ.
                  </p>
                )}
                 <p className="mt-2 text-[11px] text-slate-500 font-serif italic">
                  Nút "Thử" chỉ kiểm tra nhanh quyền truy cập. Trạng thái "Bận" là do mạng/API quá tải (429/503), không đồng nghĩa key sai.
                </p>
              </div>

             <div>
               <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Chế độ AI</label>
               <select
                 value={aiMode}
                 onChange={(e) => setAiMode && setAiMode(e.target.value)}
                 className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:border-indigo-500 outline-none font-serif shadow-inner"
               >
                 <option value="standard">Chuẩn (đầy đủ, chính xác hơn)</option>
                 <option value="quick">Nhanh (phản hồi nhanh, nhẹ hơn)</option>
               </select>
               <p className="mt-2 text-[11px] text-slate-500 font-serif italic">
                 Mẹo: Chọn “Nhanh” khi dán đoạn dài hoặc đang cần phản hồi tức thời.
               </p>
             </div>

             <div className="h-px bg-slate-800 w-full"></div>

             <div>
               <h3 className="text-sm font-bold text-amber-500 mb-3 uppercase tracking-widest flex items-center gap-2"><FolderOpen size={16}/> Đồng Bộ Thư Mục</h3>
               <p className="text-slate-400 font-serif text-xs leading-relaxed mb-4">Sử dụng File System Access API để kết nối trực tiếp với 1 Thư mục trên máy.</p>
               <button onClick={() => { handleConnectFolder(); onClose(); }} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center gap-3">
                  <FolderOpen size={18} /> {dirHandle && dirHandle !== 'LOCAL_STORAGE' ? "Chọn Thư Mục Khác" : "Kết Nối Thư Mục"}
               </button>
               {dirHandle && <div className="mt-3 text-center text-xs text-emerald-500 font-serif italic flex items-center justify-center gap-1.5"><Check size={14}/> Đang đồng bộ: {safeString(dirName)}</div>}
             </div>

             <div className="h-px bg-slate-800 w-full"></div>

             {typeof onRequestRecalculateLibraryStats === 'function' && (
             <div>
               <h3 className="text-sm font-bold text-violet-400 mb-3 uppercase tracking-widest flex items-center gap-2"><BarChart2 size={16}/> Thống kê thư viện</h3>
               <p className="text-slate-400 font-serif text-xs leading-relaxed mb-4">
                 Đếm lại số thẻ và mốc cho <span className="text-slate-300 font-semibold">mọi truyện</span> trong index (dashboard, lọc nâng cao…). Dùng khi số liệu lệch sau sửa tay file hoặc đổi phiên bản app.
               </p>
               <button
                 type="button"
                 disabled={!dirHandle || libraryNovelCount === 0 || isStatsBackfilling}
                 onClick={onRequestRecalculateLibraryStats}
                 className="w-full py-3 bg-violet-950/50 hover:bg-violet-900/40 disabled:opacity-40 disabled:pointer-events-none text-violet-200 border border-violet-800/50 rounded-xl font-bold flex items-center justify-center gap-2 text-sm"
               >
                 <RefreshCw size={18} className={isStatsBackfilling ? 'animate-spin' : ''} />
                 {isStatsBackfilling ? 'Đang tính lại…' : 'Tính lại toàn bộ thống kê'}
               </button>
               {libraryNovelCount > 0 && (
                 <p className="mt-2 text-[11px] text-slate-500 font-serif text-center">
                   Hiện có <span className="text-slate-400 font-semibold">{libraryNovelCount}</span> bộ trong danh mục.
                 </p>
               )}
             </div>
             )}

             {typeof onRequestRecalculateLibraryStats === 'function' && (
             <div className="h-px bg-slate-800 w-full"></div>
             )}

             <div>
               <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-widest flex items-center gap-2"><Link2 size={16}/> Liên kết wiki & mạng lưới</h3>
               <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-indigo-800/50">
                 <input
                   type="checkbox"
                   className="mt-1 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500"
                   checked={!!wikiExactMatchOnly}
                   onChange={(e) => setWikiExactMatchOnly && setWikiExactMatchOnly(e.target.checked)}
                 />
                 <div>
                   <span className="text-sm font-bold text-slate-200">Chỉ khớp tên wiki chính xác</span>
                   <p className="text-xs text-slate-500 font-serif mt-1 leading-relaxed">
                     Bật: <code className="text-indigo-400/90">[[Tên]]</code> chỉ nối đúng thẻ trùng tên (an toàn hơn). Tắt: giữ khớp mờ như cũ (dễ nhầm tên ngắn).
                   </p>
                 </div>
               </label>
             </div>

            <div className="h-px bg-slate-800 w-full"></div>

            <div>
              <h3 className="text-sm font-bold text-cyan-400 mb-3 uppercase tracking-widest flex items-center gap-2"><Link2 size={16}/> Tự bọc wiki local</h3>
              <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-cyan-800/50">
                <input
                  type="checkbox"
                  className="mt-1 rounded border-slate-600 text-cyan-600 focus:ring-cyan-500"
                  checked={!!autoLinkToastEnabled}
                  onChange={(e) => setAutoLinkToastEnabled && setAutoLinkToastEnabled(e.target.checked)}
                />
                <div>
                  <span className="text-sm font-bold text-slate-200">Hiện toast sau khi tự bọc link</span>
                  <p className="text-xs text-slate-500 font-serif mt-1 leading-relaxed">
                    Khi lưu mốc timeline, app tự bọc <code className="text-cyan-400/90">[[...]]</code> theo thẻ có sẵn. Tắt mục này để giảm thông báo khi lưu liên tục.
                  </p>
                </div>
              </label>
            </div>

            <div className="h-px bg-slate-800 w-full"></div>

            <div>
              <h3 className="text-sm font-bold text-emerald-400 mb-3 uppercase tracking-widest flex items-center gap-2"><Activity size={16}/> Chế độ hiệu năng</h3>
              <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-emerald-800/50">
                <input
                  type="checkbox"
                  className="mt-1 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500"
                  checked={!!performanceMode}
                  onChange={(e) => setPerformanceMode && setPerformanceMode(e.target.checked)}
                />
                <div>
                  <span className="text-sm font-bold text-slate-200">Bật Performance Mode</span>
                  <p className="text-xs text-slate-500 font-serif mt-1 leading-relaxed">
                    Giảm animation, blur và bóng đổ để UI mượt hơn trên máy yếu hoặc dữ liệu lớn.
                  </p>
                </div>
              </label>
            </div>

             <div className="h-px bg-slate-800 w-full"></div>

             <div>
               <h3 className="text-sm font-bold text-amber-400 mb-1 uppercase tracking-widest flex items-center gap-2">
                 <Type size={16} /> Ghi chép chi tiết
               </h3>
               <p className="text-slate-500 font-serif text-xs leading-relaxed mb-3">
                 Font và cỡ chữ cho ô soạn «Ghi chép chi tiết» (hồ sơ thẻ). Lưu cục bộ; cùng bộ với thanh công cụ khi đang viết ghi chép.
               </p>
               <div className="flex flex-col sm:flex-row gap-3">
                 <label className="flex-1 flex flex-col gap-1">
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Font chữ</span>
                   <select
                     value={notesTypoPrefs.fontKey}
                     onChange={(e) => setEntityNotesPrefs({ fontKey: e.target.value })}
                     className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 text-sm focus:border-amber-500 outline-none font-serif"
                     style={{
                       fontFamily: ENTITY_NOTES_FONT_OPTIONS.find((o) => o.id === notesTypoPrefs.fontKey)?.stack,
                     }}
                   >
                     {ENTITY_NOTES_FONT_OPTIONS.map((o) => (
                       <option key={o.id} value={o.id} style={{ fontFamily: o.stack }}>
                         {o.label}
                       </option>
                     ))}
                   </select>
                 </label>
                 <label className="flex flex-col gap-1 w-full sm:w-32">
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cỡ chữ</span>
                   <select
                     value={String(notesTypoPrefs.sizePx)}
                     onChange={(e) => setEntityNotesPrefs({ sizePx: Number(e.target.value) })}
                     className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 text-sm focus:border-amber-500 outline-none font-mono text-center"
                   >
                     {ENTITY_NOTES_FONT_SIZE_OPTIONS.map((n) => (
                       <option key={n} value={n}>
                         {n}
                       </option>
                     ))}
                   </select>
                 </label>
               </div>
             </div>

             <div className="h-px bg-slate-800 w-full"></div>

             <div>
               <h3 className="text-sm font-bold text-blue-400 mb-3 uppercase tracking-widest flex items-center gap-2"><UploadCloud size={16}/> Mệnh Bàn Thủ Công</h3>
               <p className="text-slate-400 font-serif text-xs leading-relaxed mb-4">
                 Xuất đầy đủ (mọi truyện + thống kê) hoặc chỉ index; nhập JSON để khôi phục.
               </p>
               <div className="flex flex-col gap-2">
                  <div className="flex gap-2 flex-wrap">
                    <button type="button" onClick={onExportBackup} className="flex-1 min-w-[140px] py-3 bg-blue-900/30 hover:bg-blue-900/50 text-blue-400 border border-blue-800/50 rounded-xl font-bold flex items-center justify-center gap-2 text-sm">
                       <Download size={16} /> Xuất backup đầy đủ
                    </button>
                    <button type="button" onClick={onExportIndexOnly} className="flex-1 min-w-[140px] py-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-600/50 rounded-xl font-bold flex items-center justify-center gap-2 text-sm">
                       <Download size={16} /> Chỉ xuất index
                    </button>
                  </div>
                  <label className="w-full py-3 bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-800/50 rounded-xl font-bold flex items-center justify-center gap-2 text-sm cursor-pointer">
                     <Upload size={16} /> Nhập khôi phục (JSON)
                     <input type="file" accept=".json,application/json" className="hidden" onChange={onImportBackup} />
                  </label>
                  {typeof onCleanupLegacyIndexFiles === 'function' && (
                    <button
                      type="button"
                      onClick={onCleanupLegacyIndexFiles}
                      className="w-full py-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-600/50 rounded-xl font-bold flex items-center justify-center gap-2 text-sm"
                    >
                      <Trash2 size={16} /> Dọn index/backup legacy
                    </button>
                  )}
               </div>
             </div>
          </div>
       </div>
    </div>
  );
};

export const ModalConfirm = ({ isOpen, onClose, title, message, onConfirm }) => {
  const trapRefConfirm = useFocusTrap(isOpen);
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-fast"
      role="dialog"
      aria-modal="true"
      aria-label={safeString(title) || 'Xác nhận'}
    >
       <div ref={trapRefConfirm} className="bg-slate-900 border border-rose-900/50 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
         <div className="w-16 h-16 bg-rose-950 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-900/50"><Trash2 size={32} /></div>
         <h2 className="text-xl font-heading font-bold text-rose-500 mb-2">{safeString(title)}</h2>
         <p className="text-sm text-slate-400 font-serif mb-8" dangerouslySetInnerHTML={{ __html: safeString(message).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/&lt;b&gt;/g,'<b>').replace(/&lt;\/b&gt;/g,'</b>') }}></p>
         <div className="flex justify-center gap-3">
            <button onClick={onClose} className="px-5 py-2.5 text-slate-400 font-serif hover:text-slate-200">Hủy</button>
            <button onClick={() => { typeof onConfirm === 'function' && onConfirm(); onClose(); }} className="px-6 py-2.5 bg-rose-700 hover:bg-rose-600 text-white rounded-lg font-bold font-serif shadow-lg">Xác nhận</button>
         </div>
       </div>
    </div>
  );
};

export const ModalInsertImage = ({ isOpen, onClose, imageForm, setImageForm, handleConfirmInsertImage }) => {
  const trapRefInsertImage = useFocusTrap(isOpen);
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-fast"
      role="dialog"
      aria-modal="true"
      aria-label="Pháp trận lưu ảnh"
    >
       <div ref={trapRefInsertImage} className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl p-6">
          <h2 className="text-xl font-heading text-amber-500 mb-4 font-bold flex items-center gap-2"><ImageIcon size={20}/> Pháp Trận Lưu Ảnh</h2>
          <textarea placeholder='Dán mã <img src="..." /> hoặc link ảnh trực tiếp...' className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 text-sm mb-4 min-h-[120px] focus:border-amber-500/50 outline-none custom-scrollbar" value={safeString(imageForm.url)} onChange={(e) => setImageForm(prev => ({...prev, url: e.target.value}))} />
          <div className="flex justify-end gap-3">
             <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors">Hủy</button>
             <button onClick={handleConfirmInsertImage} className="px-6 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-lg shadow-lg transition-colors">Chèn Ảnh</button>
          </div>
       </div>
    </div>
  );
};

// CẢI TIẾN: Thay thế Thể Loại bằng Nút Bấm Đa Chọn (Multi-select) và Thêm Chọn Giao Diện
export const ModalAddNovel = ({ isOpen, onClose, formData, setFormData, onSave, mode = "create", handlePickLocalImage, dirHandle }) => {
  const trapRefAddNovel = useFocusTrap(isOpen);
  if (!isOpen) return null;
  const patchFormData = (patch) =>
    setFormData((prev) => {
      const nextPatch = typeof patch === 'function' ? patch(prev || {}) : patch;
      return { ...(prev || {}), ...nextPatch };
    });

  const toggleGenre = (g) => {
      setFormData((prev) => {
          const currentGenres = Array.isArray(prev?.genres) ? prev.genres : [];
          if (currentGenres.includes(g)) {
              return { ...(prev || {}), genres: currentGenres.filter((x) => x !== g) };
          }
          return { ...(prev || {}), genres: [...currentGenres, g] };
      });
  };
  const selectedGenres = Array.isArray(formData.genres) ? formData.genres : [];
  const savedGenreTemplate = mode === "create" ? getGenreTabsTemplate(selectedGenres) : null;
  const hasSavedGenreTemplate = Boolean(savedGenreTemplate?.tabsConfig?.length);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={mode === "create" ? 'Khai sinh thư tịch' : 'Tu bổ thư tịch'}
    >
       <div
         ref={trapRefAddNovel}
         className="bg-slate-900 border border-amber-700/50 rounded-3xl w-full max-w-4xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col md:flex-row h-[90vh]"
       >
          <div className="w-full md:w-2/5 bg-slate-950 p-8 flex flex-col items-center justify-center border-r border-slate-800 relative overflow-hidden">
             <div
                className="w-full rounded-2xl border-2 border-dashed border-slate-700/80 flex flex-col items-center justify-center text-slate-500 relative overflow-hidden group bg-slate-900/50 z-10 shadow-2xl cursor-pointer hover:border-amber-600/50 transition-colors min-h-[180px]"
                onClick={() => handlePickLocalImage && handlePickLocalImage((url) => patchFormData({ cover: url }), null, 'cover')}
                title="Nhấp để chọn ảnh bìa từ máy tính"
             >
                {formData.cover ? (
                   formData.cover.startsWith('local_image:') ? (
                      <AsyncLocalImage
                         filename={formData.cover.replace('local_image:', '')}
                         alt="Cover"
                         dirHandle={dirHandle}
                         className="w-full h-auto block object-contain transition-transform duration-700 group-hover:scale-105"
                      />
                   ) : (
                      <img src={formData.cover} alt="Cover" className="w-full h-auto block object-contain transition-transform duration-700 group-hover:scale-105"
                         onError={(e) => { e.target.onerror = null; }} />
                   )
                ) : (
                   <div className="flex flex-col items-center gap-4 p-10 text-center">
                      <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-amber-900/30 transition-colors"><ImageIcon size={28} className="text-slate-400 group-hover:text-amber-400 transition-colors" /></div>
                      <p className="text-sm font-serif font-bold text-slate-400 uppercase tracking-widest">Chưa có Linh Ảnh</p>
                      <p className="text-xs text-slate-600 font-serif">Nhấp để chọn ảnh</p>
                   </div>
                )}
                {formData.cover && (
                   <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-sm font-bold font-serif bg-amber-700/80 px-4 py-2 rounded-xl">Đổi ảnh bìa</span>
                   </div>
                )}
             </div>
          </div>

          <div className="w-full md:w-3/5 p-8 md:p-10 flex flex-col relative z-10">
             <h2 className="text-3xl font-heading font-bold text-amber-500 mb-2 flex items-center gap-3">
               <BookOpen size={28}/> {mode === "create" ? "Khai Sinh Thư Tịch" : "Tu Bổ Thư Tịch"}
             </h2>
             
             <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-4 mt-6">
                <div>
                   <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Tên Truyện / Bí Danh <span className="text-amber-500">*</span></label>
                   <input autoFocus value={safeString(formData.title)} onChange={e=>patchFormData({ title: e.target.value })} className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-4 text-amber-100 font-heading text-xl focus:border-amber-500 outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Tác Giả</label>
                      <input value={safeString(formData.author)} onChange={e=>patchFormData({ author: e.target.value })} className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3.5 text-slate-200 font-serif focus:border-amber-500 outline-none" />
                   </div>
                   <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Khí Chất Giao Diện (Theme)</label>
                      <select value={safeString(formData.theme)} onChange={e=>patchFormData({ theme: e.target.value })} className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3.5 text-slate-200 font-serif focus:border-amber-500 outline-none appearance-none">
                         {THEMES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                   </div>
                </div>

                <div>
                   <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Đại Lộ Tu Luyện (Chọn Nhiều Thể Loại)</label>
                   <div className="flex flex-wrap gap-1.5">
                       {GENRES.map(g => {
                           const isSelected = (formData.genres || []).includes(g);
                           return (
                               <button key={g} onClick={() => toggleGenre(g)} className={`px-2.5 py-1 rounded-md text-xs font-serif transition-colors border ${isSelected ? 'bg-amber-900/40 border-amber-500/50 text-amber-300' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-amber-600/30'}`}>
                                   {g}
                               </button>
                           );
                       })}
                   </div>
                   {mode === "create" && (
                     <p className="mt-3 text-[11px] text-slate-500 font-serif leading-relaxed rounded-xl border border-slate-800/80 bg-slate-950/50 px-3 py-2.5">
                       Sau khi mở truyện, cấu hình <strong className="text-amber-200/85">mẫu trường</strong> và{' '}
                       <strong className="text-amber-200/85">ô gợi ý nhanh</strong> tại cùng luồng <strong className="text-slate-300">Khởi tạo thẻ</strong> trên
                       mỗi tab sưu tập — không phụ thuộc tạo truyện từ màn này hay tổ hợp thể loại mới.
                     </p>
                   )}
                   {mode === "create" && (
                     <div className="mt-3 flex items-center gap-3">
                       <button
                         type="button"
                         disabled={(formData.genres || []).length === 0}
                         onClick={() => {
                          const cfg = resolveTabsConfigForGenreSelection(formData.genres || [], null);
                          if (cfg) patchFormData({ tabsConfig: structuredClone(cfg) });
                         }}
                         className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-serif bg-amber-900/30 border border-amber-600/40 text-amber-300 hover:bg-amber-800/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                       >
                        <Sparkles size={16} /> {hasSavedGenreTemplate ? 'Dùng mẫu đã lưu theo thể loại' : 'Tạo cấu trúc theo thể loại'}
                       </button>
                      {hasSavedGenreTemplate && (
                        <span className="text-xs text-cyan-300 font-serif">
                          ✓ Đã có cây mẫu cá nhân cho tổ hợp thể loại này (cấu hình tab theo thể loại)
                        </span>
                      )}
                       {formData.tabsConfig && (
                         <span className="text-xs text-emerald-500 font-serif">✓ Đã có cấu trúc</span>
                       )}
                     </div>
                   )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Tiến Trình</label>
                      <select value={safeString(formData.status)} onChange={e=>patchFormData({ status: e.target.value })} className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3.5 text-slate-200 font-serif focus:border-amber-500 outline-none appearance-none">
                         <option value="Đang đọc">Đang đọc</option>
                         <option value="Hoàn thành">Hoàn thành</option>
                         <option value="Tạm ngưng">Tạm ngưng</option>
                      </select>
                   </div>
                   <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Tổng Số Chương</label>
                      <input value={safeString(formData.chaptersTotal)} onChange={e=>patchFormData({ chaptersTotal: e.target.value })} className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3.5 text-slate-200 font-serif focus:border-amber-500 outline-none" />
                   </div>
                </div>

                <div>
                   <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Hoặc nhập URL ảnh trực tiếp</label>
                   <input
                     value={safeString(formData.cover).startsWith('local_image:') ? '' : safeString(formData.cover)}
                     onChange={e=>patchFormData({ cover: e.target.value })}
                     className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3.5 text-slate-200 text-sm focus:border-amber-500 outline-none"
                     placeholder="https://..."
                   />
                   {safeString(formData.cover).startsWith('local_image:') && (
                     <p className="text-xs text-emerald-500 mt-1.5 font-serif">✓ Đã chọn ảnh từ máy tính (nhấp vào khung bên trái để đổi)</p>
                   )}
                </div>
             </div>

             <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-slate-800">
                <button onClick={onClose} className="px-6 py-3 text-slate-400 hover:text-white font-serif rounded-xl hover:bg-slate-800">Hủy bỏ</button>
                <button onClick={onSave} disabled={!formData.title.trim()} className="px-8 py-3 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl font-bold font-serif flex items-center gap-2">Lưu Thay Đổi</button>
             </div>
          </div>
       </div>
    </div>
  );
};

export const ModalDeepSearch = ({ isOpen, onClose, novelsMetadata, performDeepSearch, onSelectResult }) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchPending, setSearchPending] = useState(false);
  const searchSeqRef = useRef(0);
  const abortRef = useRef(null);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 260);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    if (!isOpen) {
      searchSeqRef.current += 1;
      if (abortRef.current) {
        try { abortRef.current.abort(); } catch { void 0; }
        abortRef.current = null;
      }
      setResults([]);
      setSearchPending(false);
      return;
    }
    if (!debouncedQuery) {
      setResults([]);
      setSearchPending(false);
      return;
    }
    if (typeof performDeepSearch !== 'function') {
      setResults([]);
      setSearchPending(false);
      return;
    }
    const runId = ++searchSeqRef.current;
    if (abortRef.current) {
      try { abortRef.current.abort(); } catch { void 0; }
    }
    const ac = new AbortController();
    abortRef.current = ac;
    setSearchPending(true);
    let cancelled = false;
    (async () => {
      try {
        const final = await performDeepSearch(debouncedQuery, ac.signal, (partial) => {
          if (cancelled || runId !== searchSeqRef.current || ac.signal.aborted) return;
          setResults(Array.isArray(partial) ? partial : []);
        });
        if (!cancelled && runId === searchSeqRef.current && !ac.signal.aborted) {
          setResults(Array.isArray(final) ? final : []);
        }
      } catch {
        if (!cancelled && runId === searchSeqRef.current) setResults([]);
      } finally {
        if (!cancelled && runId === searchSeqRef.current) setSearchPending(false);
      }
    })();
    return () => {
      cancelled = true;
      try { ac.abort(); } catch { void 0; }
    };
  }, [isOpen, debouncedQuery, performDeepSearch, novelsMetadata]);

  const grouped = useMemo(() => {
    const map = {};
    results.forEach(r => { if (!map[r.novelId]) map[r.novelId] = { title: r.novelTitle, items: [] }; map[r.novelId].items.push(r); });
    return Object.values(map);
  }, [results]);

  const flatResults = useMemo(() => grouped.flatMap(g => g.items), [grouped]);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const resultRefs = useRef([]);
  const safeHighlightIdx = flatResults.length > 0 ? Math.min(highlightIdx, flatResults.length - 1) : 0;
  useEffect(() => {
    const el = resultRefs.current[safeHighlightIdx];
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [safeHighlightIdx]);

  const handleResultKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (flatResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = flatResults[highlightIdx];
      if (r) { onSelectResult(r); onClose(); }
    }
  };

  const trapRefDeepSearch = useFocusTrap(isOpen);
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[300] flex items-start justify-center bg-slate-950/95 backdrop-blur-md pt-[8vh] px-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Tra cứu toàn thư viện"
    >
      <div
        ref={trapRefDeepSearch}
        className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col"
        style={{maxHeight:'80vh'}}
      >
        <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-950">
          <Search size={20} className="text-amber-500 flex-shrink-0" />
          <input autoFocus type="text"
            placeholder={`Tìm trong ${novelsMetadata.length} bộ thư tịch (↑↓ Enter)`}
            className="flex-1 bg-transparent text-lg font-serif text-slate-100 outline-none"
            value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleResultKeyDown} />
          {searchPending && <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin flex-shrink-0"/>}
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white rounded-lg flex-shrink-0"><X size={18}/></button>
        </div>
        {query.trim() && (
          <div className="px-4 py-2 bg-slate-950/50 border-b border-slate-800/50">
            <span className="text-xs text-slate-500 font-serif">
              {query.trim() !== debouncedQuery || searchPending ? 'Đang tìm…' : results.length === 0 ? 'Không tìm thấy' : `${results.length} kết quả trong ${grouped.length} bộ truyện`}
            </span>
          </div>
        )}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {!query.trim() ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-600">
              <Search size={40} className="mb-4 opacity-20"/>
              <p className="font-serif text-sm italic">Nhập từ khóa để tìm toàn bộ thư viện...</p>
            </div>
          ) : query.trim() !== debouncedQuery || searchPending ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 font-serif text-sm italic">Đang tìm…</div>
          ) : results.length === 0 ? (
            <div className="text-center text-slate-500 font-serif py-16 italic">Không tìm thấy "{safeString(query)}"</div>
          ) : (
            <div className="p-3 space-y-4">
              {grouped.map((group, gi) => (
                <div key={gi}>
                  <div className="flex items-center gap-2 px-2 mb-2">
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest font-serif">{safeString(group.title)}</span>
                    <div className="flex-1 h-px bg-slate-800"/>
                    <span className="text-[10px] text-slate-600">{group.items.length}</span>
                  </div>
                  <div className="space-y-1.5">
                    {group.items.map((r, i) => {
                      const globalIdx = grouped.slice(0, gi).reduce((acc, g) => acc + g.items.length, 0) + i;
                      const isHighlight = flatResults[globalIdx] === r && highlightIdx === globalIdx;
                      return (
                      <div key={`${r.novelId}-${r.tabLonId || ''}-${r.tabNhoId || ''}-${r.entityId || ''}-${r.location}-${i}`}
                        ref={(el) => { resultRefs.current[globalIdx] = el; }}
                        onClick={() => { onSelectResult(r); onClose(); }}
                        className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${isHighlight ? 'bg-amber-950/40 border-2 border-amber-600/50' : 'bg-slate-950/60 border border-slate-800/80 hover:border-amber-600/40 hover:bg-slate-800/50'}`}>
                        <div className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-md bg-amber-900/30 flex items-center justify-center">
                          <Search size={10} className="text-amber-600"/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">{safeString(r.location)}</span>
                          <p className="text-sm text-slate-300 font-serif line-clamp-2 leading-relaxed">{safeString(r.snippet)}</p>
                        </div>
                      </div>
                    ); })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/** Tìm kiếm chỉ trong một truyện đang mở (toàn bộ mục & thực thể) */
export const ModalInNovelSearch = ({ isOpen, onClose, novel, onSelectResult }) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const handleCloseInNovel = React.useCallback(() => {
    setQuery('');
    onClose();
  }, [onClose]);
  const results = useMemo(() => {
    const q = String(debouncedQuery || '').trim().toLowerCase();
    if (!q || !novel) return [];
    const meta = {
      id: novel.id,
      title: novel.title,
      author: novel.author,
      review: novel.review,
      tags: novel.tags,
    };
    const res = [...metadataSearchHits([meta], q)];
    searchNovelData({ ...novel, id: novel.id, title: novel.title || '' }, q, res);
    return dedupeDeepSearchResults(res);
  }, [debouncedQuery, novel]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => clearTimeout(id);
  }, [query]);

  const grouped = useMemo(() => {
    const map = {};
    results.forEach((r) => {
      if (!map[r.novelId]) map[r.novelId] = { title: r.novelTitle, items: [] };
      map[r.novelId].items.push(r);
    });
    return Object.values(map);
  }, [results]);

  const flatResultsInNovel = useMemo(() => grouped.flatMap(g => g.items), [grouped]);
  const [highlightIdxInNovel, setHighlightIdxInNovel] = useState(0);
  const resultRefsInNovel = useRef([]);
  const safeHighlightIdxInNovel = flatResultsInNovel.length > 0
    ? Math.min(highlightIdxInNovel, flatResultsInNovel.length - 1)
    : 0;
  useEffect(() => {
    const el = resultRefsInNovel.current[safeHighlightIdxInNovel];
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [safeHighlightIdxInNovel]);

  const handleInNovelKeyDown = (e) => {
    if (e.key === 'Escape') { handleCloseInNovel(); return; }
    if (flatResultsInNovel.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdxInNovel((i) => Math.min(i + 1, flatResultsInNovel.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdxInNovel((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = flatResultsInNovel[safeHighlightIdxInNovel];
      if (r) { onSelectResult(r); handleCloseInNovel(); }
    }
  };

  const trapRefInNovelSearch = useFocusTrap(isOpen && !!novel);
  if (!isOpen || !novel) return null;
  return (
    <div
      className="fixed inset-0 z-[295] flex items-start justify-center bg-slate-950/95 backdrop-blur-md pt-[8vh] px-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Tra cứu trong truyện"
    >
      <div
        ref={trapRefInNovelSearch}
        className="bg-slate-900 border border-cyan-600/30 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '78vh' }}
      >
        <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-950">
          <BookOpen size={20} className="text-cyan-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <input
              autoFocus
              type="text"
              placeholder={`Tra trong «${safeString(novel.title)}»... (↑↓ Enter)`}
              className="w-full bg-transparent text-lg font-serif text-slate-100 outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInNovelKeyDown}
            />
            <p className="text-[10px] text-slate-500 font-serif mt-0.5">Chỉ truyện này — gõ tên, sự kiện, ghi chép...</p>
          </div>
          <button type="button" onClick={handleCloseInNovel} className="p-1.5 text-slate-500 hover:text-white rounded-lg flex-shrink-0">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
          {!query.trim() ? (
            <div className="flex flex-col items-center justify-center py-14 text-slate-600">
              <Search size={36} className="mb-3 opacity-25" />
              <p className="font-serif text-sm italic text-center px-4">Tìm lại chi tiết cũ khi đang đọc (nhân vật, mốc, nội dung mục)...</p>
            </div>
          ) : query.trim() !== debouncedQuery ? (
            <div className="text-center text-slate-500 font-serif py-12 italic">Đang lọc…</div>
          ) : results.length === 0 ? (
            <div className="text-center text-slate-500 font-serif py-12 italic">Không thấy «{safeString(query)}»</div>
          ) : (
            <div className="space-y-3">
              {grouped.map((group, gi) => (
                <div key={gi}>
                  {grouped.length > 1 && (
                    <div className="flex items-center gap-2 px-1 mb-2">
                      <span className="text-[10px] font-bold text-cyan-600 uppercase font-serif">{safeString(group.title)}</span>
                      <div className="flex-1 h-px bg-slate-800" />
                    </div>
                  )}
                  <div className="space-y-1">
                    {group.items.map((r, i) => {
                      const globalIdx = grouped.slice(0, gi).reduce((acc, g) => acc + g.items.length, 0) + i;
                      const isHighlight = safeHighlightIdxInNovel === globalIdx;
                      return (
                      <div
                        key={`${r.tabLonId}-${r.tabNhoId}-${r.entityId}-${i}`}
                        ref={(el) => { resultRefsInNovel.current[globalIdx] = el; }}
                        onClick={() => {
                          onSelectResult(r);
                          handleCloseInNovel();
                        }}
                        className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${isHighlight ? 'bg-cyan-950/40 border-2 border-cyan-600/50' : 'bg-slate-950/70 border border-slate-800/80 hover:border-cyan-600/35 hover:bg-slate-800/40'}`}
                      >
                        <Search size={12} className="text-cyan-600 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">{safeString(r.location)}</span>
                          <p className="text-sm text-slate-300 font-serif line-clamp-3 leading-relaxed">{safeString(r.snippet)}</p>
                        </div>
                      </div>
                    ); })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

