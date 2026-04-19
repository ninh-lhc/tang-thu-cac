// ==========================================
// TRỤ 3: HÌNH THỂ GIAO DIỆN & MODAL
// File: MasterComponents.jsx
// Vai trò: UI components tĩnh + tất cả Modal
// ==========================================

import React, { useState, useMemo, useEffect, useRef, memo, useSyncExternalStore, useCallback, useId } from 'react';
import {
  Menu, Search, BookOpen, Filter, ChevronRight, ChevronDown, ChevronUp,
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
import {
  getMapFieldPlaceholders,
  getMapHierarchySeedLabels,
  getMapTypeSeedPresets,
  resolveMapFieldPresetFlavor,
} from './lib/mapEntityFieldPresets.js';
import { resolveEntityQuickSlots } from './lib/entityQuickEntrySlots.js';
import { normalizeAsciiText, splitStatusHierarchyTokens } from './lib/statusHierarchyParser.js';
import { inferOrgTypeFromContext, inferOrgTypeFromTabSlug } from './lib/forceOrgTypeInfer.js';
import { normalizeListGroupStrategy } from './lib/collectionListCardSync.js';
import { mergeTabsByGenres } from './genreTabsMap.js';
import { getGenreTabsTemplate } from './lib/genreTabsTemplateStore.js';
import { searchNovelData, dedupeDeepSearchResults, metadataSearchHits } from './deepSearchCore.js';
import { useFocusTrap } from './lib/useFocusTrap.js';
import { EntityTabFieldsCustomizerPanel } from './EntityTabFieldsCustomizerPanel.jsx';
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

export const EntityCard = memo(({ entity, onSelect, onDelete, onAddMilestone, tabConfig, dirHandle, parentTabId, parentLabel }) => {
  const fields = resolveFieldsTemplate(tabConfig, parentTabId, parentLabel);
  const terms = getTerms(parentTabId);
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
            <h4 className="text-amber-100 font-bold font-serif text-base leading-snug break-words" title={safeString(entity.name)}>{safeString(entity.name)}</h4>
            {fields[0] && <p className="text-[11px] text-amber-600 font-bold uppercase tracking-widest mt-0.5 break-words">{f1Display || '---'}</p>}
         </div>
      </div>
      <div className="mb-4 space-y-1">
        {fields[1] && <div className="text-xs text-slate-400 font-serif line-clamp-2 italic"><Shield size={10} className="inline mr-1 opacity-50"/> {safeString(fields[1].label)}: {f2Display || '---'}</div>}
        {fields[2] && <p className="text-sm text-slate-300 font-serif line-clamp-3 leading-relaxed mt-1">{f3 || '...'}</p>}
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

function normalizeNovelGenresForMapPresets(novel) {
  if (!novel || typeof novel !== 'object') return [];
  if (Array.isArray(novel.genres)) return novel.genres.filter(Boolean);
  if (typeof novel.genre === 'string' && novel.genre.trim()) return [novel.genre.trim()];
  return [];
}

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

function composeMapStatusLine(mapType, forceSystem) {
  return [safeString(mapType).trim(), safeString(forceSystem).trim()].filter(Boolean).join(' · ');
}

function parseMapQuickState(dynamicData) {
  const statusTokens = splitDotMetaTokens(dynamicData?.f_status);
  const mapSystem = statusTokens.length > 1 ? statusTokens.slice(1).join(' · ') : '';
  return {
    mapType: safeString(dynamicData?.f_title).trim() || statusTokens[0] || '',
    mapSystem,
    realmSystem: safeString(dynamicData?.f_he_gioi_ban_do || dynamicData?.f_he_phan_cap).trim() || inferForceSystemLabel(mapSystem),
    parentPath: safeString(dynamicData?.f_vi_tri).trim(),
  };
}

function parseForceQuickState(dynamicData) {
  const orgType = safeString(
    dynamicData?.f_loai_to_chuc || dynamicData?.f_loai || dynamicData?.f_to_chuc || dynamicData?.f_title
  ).trim();
  const realmSystem = safeString(dynamicData?.f_he_cap_the_luc || dynamicData?.f_he_phan_cap).trim();
  const rankLabel = safeString(dynamicData?.f_status || dynamicData?.f_cap).trim();
  const locationLine = safeString(dynamicData?.f_dia_ban || dynamicData?.f_vi_tri).trim();
  return {
    orgType,
    realmSystem,
    rankLabel,
    locationLine,
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

const MAP_REALM_SYSTEM_OPTIONS = ['Hạ giới', 'Tiên Ma giới', 'Nguyên giới'];

function normalizeRealmSystemKey(value = '') {
  const n = normalizeAsciiText(value);
  if (n.includes('ha gioi')) return 'ha-gioi';
  if (n.includes('tien ma gioi')) return 'tien-ma-gioi';
  if (n.includes('nguyen gioi')) return 'nguyen-gioi';
  return '';
}

function getMapHierarchyOptionsByRealm(realmSystem = '', baseOptions = []) {
  const key = normalizeRealmSystemKey(realmSystem);
  if (!key) return dedupeCaseInsensitive(baseOptions);
  if (key === 'ha-gioi') return dedupeCaseInsensitive(['Cửu cấp']);
  if (key === 'tien-ma-gioi') return dedupeCaseInsensitive(['Vương giới', 'Tôn giới']);
  if (key === 'nguyen-gioi') return dedupeCaseInsensitive(['Đế giới']);
  return dedupeCaseInsensitive(baseOptions);
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

function collectMapEntityHints(activeNovelData, mapTabConfig = null) {
  const mapNameList = [];
  const presetFlavor = resolveMapFieldPresetFlavor(normalizeNovelGenresForMapPresets(activeNovelData));
  let mapTypeList = [...getMapTypeSeedPresets(presetFlavor)];
  let forceSystemList = [...getMapHierarchySeedLabels(presetFlavor)];
  const recordsByName = new Map();
  for (const lon of activeNovelData?.tabsConfig || []) {
    for (const nho of lon?.subTabs || []) {
      if (
        !isMapCollectionScope({
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
        const name = safeString(entity?.name).trim();
        if (!name) return;
        // List cards are meta containers, not real map entities.
        if (normalizeAsciiText(name).startsWith('danh sach')) return;
        mapNameList.push(name);
        const mapType = safeString(entity?.dynamicData?.f_title).trim();
        if (mapType) mapTypeList.push(mapType);
        const statusTokens = splitDotMetaTokens(entity?.dynamicData?.f_status || entity?.status);
        if (statusTokens.length > 1) {
          forceSystemList.push(statusTokens.slice(1).join(' · '));
        }
        const key = normalizeAsciiText(name);
        const nextList = recordsByName.get(key) || [];
        nextList.push({
          name,
          tabLabel: safeString(nho.label || nho.id),
          statusLine: safeString(entity?.dynamicData?.f_status || entity?.status).trim(),
          mapType,
          systemLabel: inferForceSystemLabel(entity?.dynamicData?.f_status || entity?.status),
        });
        recordsByName.set(key, nextList);
      });
    }
  }
  const extraMap = mapTabConfig?.mapEntrySuggestions;
  if (extraMap && typeof extraMap === 'object') {
    if (Array.isArray(extraMap.types)) mapTypeList.push(...extraMap.types);
    if (Array.isArray(extraMap.hierarchy)) forceSystemList.push(...extraMap.hierarchy);
  }
  return {
    mapNames: dedupeCaseInsensitive(mapNameList),
    mapTypes: dedupeCaseInsensitive(mapTypeList),
    forceSystems: dedupeCaseInsensitive(forceSystemList),
    presetFlavor,
    recordsByName,
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
  onSetTabListGroupStrategy,
  onSetTabListGroupOrder,
  onSaveTabListGroupOrderToGenreTemplate,
  onSetTabMapEntrySuggestions,
  handleAddTabTemplateField,
  handleRemoveTabTemplateField,
  handleRenameTabTemplateFieldLabel,
  handleSetTabTemplateFieldListMergeOrder,
  handleMergeTabFieldSuggestionList,
}) => {
  void onUpdateTemplate;
  void geminiApiKey;
  void geminiMode;
  const terms = getTerms(parentTabId);
  const fieldsTemplate = useMemo(
    () => resolveFieldsTemplate(tabConfig || {}, parentTabId, parentLabel || ''),
    [tabConfig, parentTabId, parentLabel]
  );
  const fStatusLabel = useMemo(() => {
    const f = fieldsTemplate.find((x) => x.id === 'f_status');
    return f?.label || 'Tóm tắt dưới tên';
  }, [fieldsTemplate]);
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
  const isMapScope = useMemo(
    () =>
      isMapCollectionScope({
        activeTabLon: parentTabId,
        activeTabNho: tabConfig?.id || '',
        currentTabConfig: tabConfig || null,
        parentLabel: parentLabel || '',
      }),
    [parentTabId, parentLabel, tabConfig]
  );
  // Một tab chỉ nên render 1 khối "quick domain" để tránh trùng nội dung.
  // Với tab lai (match cả map + thế lực), ưu tiên form Thế lực vì dữ liệu đầu vào là rank + địa bàn.
  const showForceQuickSection = isForceScope;
  const showMapQuickSection = isMapScope && !isForceScope;
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
    tabConfig?.viewType === 'collection-track' && !isMapScope && !isForceScope
  );
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
  const hideLegacyStatusInput = Boolean(
    showGenericQuickEntry && genericQuickResolved?.slotFields?.includes('f_status')
  );
  const listGroupStrategy = normalizeListGroupStrategy(tabConfig?.autoListGroupStrategy || '');
  const listGroupOrderLines = Array.isArray(tabConfig?.autoListGroupOrder) ? tabConfig.autoListGroupOrder.join('\n') : '';
  const [isGroupConfigOpen, setIsGroupConfigOpen] = useState(false);
  const [isTabFieldsCustomizerOpen, setIsTabFieldsCustomizerOpen] = useState(false);
  const [tabFieldSaveScope, setTabFieldSaveScope] = useState('local');
  const [isGroupOrderDirty, setIsGroupOrderDirty] = useState(false);
  const [forceLadderRealmLabel, setForceLadderRealmLabel] = useState('');
  const [isForceRankLadderDirty, setIsForceRankLadderDirty] = useState(false);
  const tabLonCollectionMeta = useMemo(() => {
    const lon = activeNovelData?.tabsConfig?.find((t) => t.id === parentTabId);
    const lbl = safeString(lon?.label || parentTabId);
    const n = (lon?.subTabs || []).filter((s) => s?.viewType === 'collection-track').length;
    return { parentLonLabel: lbl, collectionTabCount: Math.max(n, 1) };
  }, [activeNovelData, parentTabId]);
  const groupOrderInputRef = useRef(null);
  const forceRankLadderTextRef = useRef(null);
  const mapEntityHints = useMemo(
    () => collectMapEntityHints(activeNovelData, isMapScope ? tabConfig : null),
    [activeNovelData, tabConfig, isMapScope]
  );
  const mapFieldPlaceholders = useMemo(
    () => getMapFieldPlaceholders(mapEntityHints.presetFlavor),
    [mapEntityHints.presetFlavor]
  );
  const mapNameSuggestions = mapEntityHints.mapNames;
  const mapTypeSuggestions = mapEntityHints.mapTypes;
  const forceSystemSuggestions = mapEntityHints.forceSystems;
  const mapRealmSystemOptions = MAP_REALM_SYSTEM_OPTIONS;
  const statusFieldPlaceholder = isMapScope
    ? mapFieldPlaceholders.quickLine
    : 'Ví dụ: Kim Đan kỳ · Đang hoạt động · UI hệ thống... (một dòng, hiện dưới tên ở Hồ sơ)';
  const statusFieldHint = isMapScope
    ? mapFieldPlaceholders.mapProfileHint
    : 'Nhãn ô theo mục sưu tập (cảnh giới, cấp độ, loại chức năng...). Có thể để trống.';
  const [formData, setFormData] = useState({ id: null, name: '', avatar: '', rawText: '' });
  const [dynamicData, setDynamicData] = useState({});
  const [mapQuickType, setMapQuickType] = useState('');
  const [mapQuickRealmSystem, setMapQuickRealmSystem] = useState('');
  const [mapQuickSystem, setMapQuickSystem] = useState('');
  const [mapQuickParentPath, setMapQuickParentPath] = useState('');
  const [forceQuickType, setForceQuickType] = useState('');
  const [forceQuickRealmSystem, setForceQuickRealmSystem] = useState('');
  const [forceQuickRank, setForceQuickRank] = useState('');
  const [forceQuickLocation, setForceQuickLocation] = useState('');
  const suggestedMapSystem = useMemo(
    () => inferSystemFromMapLocation(mapQuickParentPath, mapEntityHints.recordsByName),
    [mapQuickParentPath, mapEntityHints.recordsByName]
  );
  const mapHierarchyOptions = useMemo(
    () => getMapHierarchyOptionsByRealm(mapQuickRealmSystem, forceSystemSuggestions),
    [mapQuickRealmSystem, forceSystemSuggestions]
  );
  const forceQuickHints = useMemo(() => collectForceQuickHints(activeNovelData), [activeNovelData]);
  const mapSubTabsForForce = useMemo(
    () => collectMapSubTabsForForceUi(activeNovelData),
    [activeNovelData]
  );
  const selectedMapPairForLadder = useMemo(() => {
    const label =
      forceLadderRealmLabel && mapSubTabsForForce.some((t) => t.label === forceLadderRealmLabel)
        ? forceLadderRealmLabel
        : mapSubTabsForForce[0]?.label || '';
    if (!label) return null;
    return mapSubTabsForForce.find((t) => t.label === label) || null;
  }, [mapSubTabsForForce, forceLadderRealmLabel]);
  const forceLadderLinesFromData = useMemo(() => {
    if (!selectedMapPairForLadder) return '';
    return getMapSubTabForceRankSuggestions(
      activeNovelData,
      selectedMapPairForLadder.lonId,
      selectedMapPairForLadder.nhoId
    ).join('\n');
  }, [selectedMapPairForLadder, activeNovelData]);
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
  const forceTypeOptions = forceQuickHints.typeSuggestions;
  const mapSuggestTypeLines = useMemo(
    () => (Array.isArray(tabConfig?.mapEntrySuggestions?.types) ? tabConfig.mapEntrySuggestions.types.join('\n') : ''),
    [tabConfig]
  );
  const mapSuggestHierarchyLines = useMemo(
    () =>
      Array.isArray(tabConfig?.mapEntrySuggestions?.hierarchy) ? tabConfig.mapEntrySuggestions.hierarchy.join('\n') : '',
    [tabConfig]
  );
  const handleSaveMapSuggestionQuick = (which, value) => {
    onSetTabMapEntrySuggestions?.(parentTabId, tabConfig?.id, which, value, {
      propagateWithinMapLon: true,
      saveToGenreTemplate: true,
    });
    if (typeof showToast === 'function') {
      const label = which === 'types' ? 'Giới Diện' : 'Đặc Tính Địa Vực';
      showToast(`Đã lưu gợi ý ${label} cho tab hiện tại.`, 'success');
    }
  };
  const resolvedStatusFieldPlaceholder = showMapQuickSection
    ? mapFieldPlaceholders.quickLine
    : showForceQuickSection
      ? 'Ví dụ: Thiên Tôn cấp thế lực / Địa Vương cấp thế lực'
      : statusFieldPlaceholder;
  const resolvedStatusFieldHint = showForceQuickSection
    ? 'Ở thẻ Thế lực, nên để ô này là cấp thế lực; địa bàn nhập riêng ở ô phía trên để AUTO đẩy sang Bản đồ.'
    : statusFieldHint;
  const trapRef = useFocusTrap(isOpen);
  const patchFormData = (patch) =>
    setFormData((prev) => {
      const nextPatch = typeof patch === 'function' ? patch(prev || {}) : patch;
      return { ...(prev || {}), ...nextPatch };
    });
  const patchDynamicData = (patch) =>
    setDynamicData((prev) => {
      const nextPatch = typeof patch === 'function' ? patch(prev || {}) : patch;
      return { ...(prev || {}), ...nextPatch };
    });
  const quickUseSelect = Boolean(tabConfig?.entityQuickEntry?.useSelectUi);
  const entityModalQuickSurface = 'rounded-xl border border-amber-900/45 bg-amber-950/10 p-4 space-y-4';
  const entityModalQuickLabel = 'block text-[10px] font-bold text-amber-200 uppercase tracking-widest';
  const entityModalQuickInput =
    'w-full bg-slate-950/80 border border-amber-900/40 rounded-xl p-3 text-sm text-slate-100 font-serif focus:border-amber-500 outline-none';
  const entityModalHintCallout = 'rounded-xl border border-slate-800/70 bg-slate-950/35 px-3 py-2';
  const entityModalHintTitle = 'text-[10px] font-bold uppercase tracking-widest text-amber-300/95 mb-1';
  const fieldsCustomizerToggleClass =
    'inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-700/45 bg-cyan-950/25 px-4 py-2.5 text-xs font-bold font-serif text-cyan-100 transition-colors hover:border-cyan-500/55 hover:bg-cyan-900/35 md:w-auto md:justify-start';

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
          rows={3}
          className="w-full bg-slate-950/80 border border-amber-900/40 rounded-xl p-3 text-sm text-slate-100 font-serif focus:border-amber-500 outline-none resize-y min-h-[4.5rem]"
          placeholder="Ghi mô tả ngắn…"
        />
      );
    }
    if (quickUseSelect) {
      return (
        <div className="space-y-2">
          <select
            aria-label={`${slot.label} — chọn nhanh`}
            value={slot.suggestions.includes(val) ? val : ''}
            onChange={(e) => patchDynamicData({ [fid]: e.target.value })}
            className="w-full bg-slate-950/80 border border-amber-900/40 rounded-xl p-3 text-sm text-slate-100 font-serif focus:border-amber-500 outline-none"
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
            className="w-full bg-slate-950/80 border border-amber-900/40 rounded-xl p-3 text-sm text-slate-100 font-serif focus:border-amber-500 outline-none"
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
          className="w-full bg-slate-950/80 border border-amber-900/40 rounded-xl p-3 text-sm text-slate-100 font-serif focus:border-amber-500 outline-none"
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

  /* Reset form khi mở modal (đồng bộ từ initialData) */
  const handleMapTypeChange = (value) => {
    setMapQuickType(value);
    patchDynamicData({
      f_title: value,
      f_status: composeMapStatusLine(value, mapQuickSystem),
    });
  };
  const handleMapSystemChange = (value) => {
    setMapQuickSystem(value);
    patchDynamicData({
      f_status: composeMapStatusLine(mapQuickType, value),
    });
  };
  const handleMapRealmSystemChange = (value) => {
    setMapQuickRealmSystem(value);
    const scoped = getMapHierarchyOptionsByRealm(value, forceSystemSuggestions);
    const nextSystem = scoped.includes(mapQuickSystem) ? mapQuickSystem : (scoped[0] || '');
    setMapQuickSystem(nextSystem);
    patchDynamicData({
      f_he_gioi_ban_do: value,
      f_status: composeMapStatusLine(mapQuickType, nextSystem),
    });
  };
  const handleMapParentPathChange = (value) => {
    setMapQuickParentPath(value);
    patchDynamicData({ f_vi_tri: value });
  };
  const handleForceLocationChange = (value) => {
    setForceQuickLocation(value);
    patchDynamicData({ f_dia_ban: value });
  };
  const handleForceTypeChange = (value) => {
    setForceQuickType(value);
    // Chỉ ghi f_loai_to_chuc: preset fantasyRace/v.v. dùng f_title cho «phân nhánh», không trùng loại hình.
    patchDynamicData({
      f_loai_to_chuc: value,
    });
  };
  const handleForceRealmSystemChange = (value) => {
    setForceQuickRealmSystem(value);
    patchDynamicData({
      f_he_cap_the_luc: value,
    });
  };
  const handleForceRankChange = (value) => {
    setForceQuickRank(value);
    patchDynamicData({ f_status: value });
  };
  const handleStatusFieldChange = (value) => {
    patchDynamicData({ f_status: value });
    if (isMapScope) {
      const parsed = parseMapQuickState({ ...dynamicData, f_status: value });
      setMapQuickType(parsed.mapType);
      setMapQuickRealmSystem(parsed.realmSystem);
      setMapQuickSystem(parsed.mapSystem);
      return;
    }
    if (isForceScope) {
      setForceQuickRank(value);
    }
  };

  useEffect(() => {
    if (!isGroupConfigOpen || mapSubTabsForForce.length === 0) return;
    if (!forceLadderRealmLabel || !mapSubTabsForForce.some((t) => t.label === forceLadderRealmLabel)) {
      setForceLadderRealmLabel(mapSubTabsForForce[0].label);
    }
  }, [isGroupConfigOpen, mapSubTabsForForce, forceLadderRealmLabel]);

  useEffect(() => {
    if (!isOpen) return;
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
      const mapQuickState = parseMapQuickState(initialDyn);
      const forceQuickState = parseForceQuickState(initialDyn);
      const mapBanDoLabels = dedupeCaseInsensitive(
        collectMapSubTabsForForceUi(activeNovelData).map((t) => t.label)
      );
      const rawRealm = safeString(forceQuickState.realmSystem).trim();
      if (rawRealm && !mapBanDoLabels.includes(rawRealm)) {
        delete initialDyn.f_he_cap_the_luc;
        delete initialDyn.f_he_phan_cap;
      }
      setDynamicData(initialDyn);
      setMapQuickType(mapQuickState.mapType);
      setMapQuickRealmSystem(mapQuickState.realmSystem);
      setMapQuickSystem(mapQuickState.mapSystem);
      setMapQuickParentPath(mapQuickState.parentPath);
      setForceQuickType(forceQuickState.orgType);
      setForceQuickRealmSystem(rawRealm && mapBanDoLabels.includes(rawRealm) ? rawRealm : '');
      setForceQuickRank(forceQuickState.rankLabel);
      setForceQuickLocation(forceQuickState.locationLine);
    } else {
      setFormData({ id: null, name: '', avatar: '', rawText: '' });
      const subTabLabel = safeString(tabConfig?.label).trim();
      const defaultMapTypeFromSubTab = isMapScope && !isForceScope && subTabLabel ? subTabLabel : '';
      if (defaultMapTypeFromSubTab) {
        setDynamicData({
          f_title: defaultMapTypeFromSubTab,
          f_status: composeMapStatusLine(defaultMapTypeFromSubTab, ''),
        });
      } else {
        setDynamicData({});
      }
      setMapQuickType(defaultMapTypeFromSubTab);
      setMapQuickRealmSystem('');
      setMapQuickSystem('');
      setMapQuickParentPath('');
      setForceQuickType('');
      setForceQuickRealmSystem('');
      setForceQuickRank('');
      setForceQuickLocation('');
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isOpen, initialData, activeNovelData, tabConfig, isMapScope, isForceScope]);

  useEffect(() => {
    if (!isOpen) {
      setIsTabFieldsCustomizerOpen(false);
      setTabFieldSaveScope('local');
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (event) => {
      if (!isOpen || !formData.name.trim()) return;
      const trapEl = trapRef.current;
      const activeEl = document.activeElement;
      if (event?.defaultPrevented) return;
      if (trapEl && activeEl && !trapEl.contains(activeEl)) return;
      onSave(formData, dynamicData, null);
      onClose();
      if (event?.cancelable) event.preventDefault();
      event?.stopImmediatePropagation?.();
    };
    window.addEventListener('ttc-save', handler);
    return () => window.removeEventListener('ttc-save', handler);
  }, [isOpen, formData, dynamicData, onSave, onClose, trapRef]);
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={initialData ? `Tu bổ ${terms.entity}` : `Khởi tạo ${terms.entity}`}
    >
      <div data-testid="modal-entity-root" ref={trapRef} className="bg-slate-900 border border-amber-700/50 rounded-2xl w-full max-w-2xl shadow-[0_0_50px_rgba(217,119,6,0.2)] overflow-hidden flex flex-col max-h-[85vh] min-h-0">
        <div className="px-6 pt-6 pb-4 flex-shrink-0 border-b border-slate-800 flex justify-between items-center gap-3 bg-slate-900">
          <h2 className="text-2xl font-heading font-bold text-slate-100">{initialData ? `Tu Bổ ${terms.entity}` : `Khởi Tạo ${terms.entity}`}</h2>
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
            {tabConfig?.viewType === 'collection-track' && (
              <button
                type="button"
                onClick={() =>
                  setIsGroupConfigOpen((prev) => {
                    const next = !prev;
                    if (next) {
                      setIsGroupOrderDirty(false);
                      if (showForceQuickSection) setIsTabFieldsCustomizerOpen(true);
                    }
                    return next;
                  })
                }
                className="inline-flex items-center gap-2 rounded-xl border border-violet-800/40 bg-violet-950/20 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-violet-300 transition-colors hover:border-violet-500/60 hover:bg-violet-900/30 hover:text-violet-200"
              >
                <ListIcon size={14} /> Quy chuẩn nhóm
              </button>
            )}
            <button type="button" onClick={onClose} className="text-slate-500 hover:text-white">
              <X size={20}/>
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 custom-scrollbar space-y-5 bg-slate-900">
          {tabConfig?.viewType === 'collection-track' && typeof handleAddTabTemplateField === 'function' && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setIsTabFieldsCustomizerOpen((v) => !v)}
                className={fieldsCustomizerToggleClass}
              >
                {isTabFieldsCustomizerOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {isTabFieldsCustomizerOpen
                  ? 'Thu gọn — chỉnh trường & list'
                  : 'Chỉnh trường hồ sơ & list gợi ý (tab này)'}
              </button>
              {isTabFieldsCustomizerOpen && (
                <EntityTabFieldsCustomizerPanel
                  lonId={parentTabId}
                  tabNho={tabConfig}
                  parentLonLabel={tabLonCollectionMeta.parentLonLabel}
                  collectionTabCount={tabLonCollectionMeta.collectionTabCount}
                  saveScope={tabFieldSaveScope}
                  onSaveScopeChange={setTabFieldSaveScope}
                  onAddField={(label, opts) => handleAddTabTemplateField(parentTabId, tabConfig.id, label, opts)}
                  onRemoveField={(fid, opts) => handleRemoveTabTemplateField(parentTabId, tabConfig.id, fid, opts)}
                  onRenameField={(fid, L, opts) =>
                    handleRenameTabTemplateFieldLabel(parentTabId, tabConfig.id, fid, L, opts)
                  }
                  onMergeSuggestionList={(fid, text, opts) =>
                    handleMergeTabFieldSuggestionList(parentTabId, tabConfig.id, fid, text, opts)
                  }
                  onSetFieldListMergeOrder={(fid, raw, opts) =>
                    handleSetTabTemplateFieldListMergeOrder?.(parentTabId, tabConfig.id, fid, raw, opts)
                  }
                  mapQuickEntryLists={
                    showMapQuickSection || showForceQuickSection
                      ? {
                          typesLines: mapSuggestTypeLines,
                          hierarchyLines: mapSuggestHierarchyLines,
                          onSaveTypes: (t) => handleSaveMapSuggestionQuick('types', t),
                          onSaveHierarchy: (t) => handleSaveMapSuggestionQuick('hierarchy', t),
                        }
                      : null
                  }
                />
              )}
            </div>
          )}

          {tabConfig?.viewType === 'collection-track' && isGroupConfigOpen && (
            <div className="rounded-2xl border border-violet-800/35 bg-violet-950/10 p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-violet-300">
                    Quy chuẩn nhóm AUTO cho tab này
                  </div>
                  <div className="mt-1 text-[12px] text-slate-300 font-serif">
                    {showForceQuickSection ? (
                      <>
                        Gom nhóm thẻ Danh sách (AUTO) — mục mở rộng bên dưới. List cấp bậc theo thẻ Bản đồ không chỉnh ở đây; mở
                        Khởi tạo thẻ từ <strong className="text-violet-200/95">tab Bản đồ</strong> → «Quy chuẩn nhóm». List gợi ý từng
                        trường: mục <strong className="text-cyan-200/95">Chỉnh trường hồ sơ &amp; list gợi ý</strong> (đã mở khi bạn bấm
                        Quy chuẩn nhóm từ Thế lực).
                      </>
                    ) : (
                      <>
                        Cấp bậc Thế lực theo từng thẻ Bản đồ (lưu từng mục trước khi chọn thẻ khác). Gom nhóm thẻ Danh sách nằm ở mục
                        mở rộng bên dưới.
                      </>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsGroupConfigOpen(false);
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:border-slate-600 hover:text-slate-100"
                >
                  Thu gọn
                </button>
              </div>

              {!showForceQuickSection &&
                (mapSubTabsForForce.length === 0 ? (
                  <p className="text-[11px] text-amber-200/90 font-serif">
                    Chưa có tab con dưới lon Bản đồ — thêm trong Quản lý tab trước khi nhập cấp bậc.
                  </p>
                ) : (
                  <>
                    <div className="grid gap-3 md:grid-cols-[minmax(0,220px)_1fr]">
                      <label className="space-y-1">
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Hệ cấp bậc (thẻ Bản đồ)
                        </span>
                        <select
                          value={
                            forceLadderRealmLabel &&
                            mapSubTabsForForce.some((t) => t.label === forceLadderRealmLabel)
                              ? forceLadderRealmLabel
                              : mapSubTabsForForce[0]?.label || ''
                          }
                          onChange={(e) => {
                            setForceLadderRealmLabel(e.target.value);
                            setIsForceRankLadderDirty(false);
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-200 font-serif outline-none focus:border-violet-500/50 cursor-pointer"
                        >
                          {mapSubTabsForForce.map((t) => (
                            <option key={`${t.lonId}::${t.nhoId}`} value={t.label}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Cấp bậc</span>
                        <textarea
                          ref={forceRankLadderTextRef}
                          key={`frl-${forceLadderRealmLabel}-${forceLadderLinesFromData}`}
                          defaultValue={forceLadderLinesFromData}
                          onChange={(e) => {
                            setIsForceRankLadderDirty(e.target.value !== forceLadderLinesFromData);
                          }}
                          rows={5}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 font-mono leading-relaxed"
                          placeholder={'Mỗi dòng một cấp (vd. Nhất Cấp thế lực)\nLưu trước khi chọn thẻ Bản đồ khác.'}
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedMapPairForLadder) return;
                          const text = safeString(forceRankLadderTextRef.current?.value ?? '');
                          onSetTabMapEntrySuggestions?.(
                            selectedMapPairForLadder.lonId,
                            selectedMapPairForLadder.nhoId,
                            'forceRanks',
                            text,
                            { propagateWithinMapLon: false, saveToGenreTemplate: false }
                          );
                          setIsForceRankLadderDirty(false);
                          showToast?.('Đã lưu list cấp bậc cho thẻ Bản đồ này.', 'success');
                        }}
                        disabled={!isForceRankLadderDirty || !selectedMapPairForLadder}
                        className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold ${
                          isForceRankLadderDirty && selectedMapPairForLadder
                            ? 'border-violet-600/55 bg-violet-900/35 text-violet-100 hover:bg-violet-900/50'
                            : 'border-slate-700 bg-slate-900/60 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        Lưu cấp bậc
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedMapPairForLadder) return;
                          const text = safeString(forceRankLadderTextRef.current?.value ?? '');
                          onSetTabMapEntrySuggestions?.(
                            selectedMapPairForLadder.lonId,
                            selectedMapPairForLadder.nhoId,
                            'forceRanks',
                            text,
                            { propagateWithinMapLon: false, saveToGenreTemplate: true }
                          );
                          setIsForceRankLadderDirty(false);
                          showToast?.('Đã lưu cấp bậc và cập nhật mẫu thể loại.', 'success');
                        }}
                        disabled={!isForceRankLadderDirty || !selectedMapPairForLadder}
                        className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold ${
                          isForceRankLadderDirty && selectedMapPairForLadder
                            ? 'border-cyan-600/55 bg-cyan-900/30 text-cyan-100 hover:bg-cyan-900/45'
                            : 'border-slate-700 bg-slate-900/60 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        Lưu cấp bậc + cập nhật mẫu thể loại
                      </button>
                    </div>
                  </>
                ))}

              {showForceQuickSection && (
                <p className="text-[11px] text-slate-400 font-serif leading-relaxed rounded-lg border border-slate-800/80 bg-slate-950/50 p-3">
                  Ô «Cấp bậc» theo thẻ Bản đồ (gợi ý khi tạo thẻ Thế lực) chỉnh từ{' '}
                  <strong className="text-slate-200">Khởi tạo thẻ trên tab Bản đồ</strong> → «Quy chuẩn nhóm». Nội dung list từng trường
                  hồ sơ: <strong className="text-cyan-200/95">Chỉnh trường hồ sơ &amp; list gợi ý (tab này)</strong> phía trên. Nếu trước
                  đây đã dán nhầm vào ô Cấp bậc ở đây, hãy chuyển sang đúng trường ở khối cyan; phần lưu trên tab Bản đồ sửa trong Quản
                  lý tab hoặc mở lại «Quy chuẩn nhóm» từ Bản đồ.
                </p>
              )}

              <details
                className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 space-y-3 open:border-violet-800/40"
                defaultOpen={showForceQuickSection}
              >
                <summary className="cursor-pointer text-[11px] font-bold text-violet-300/95 font-serif">
                  {showForceQuickSection
                    ? 'Gom nhóm thẻ Danh sách (AUTO) — đồng bộ 4 ô Gợi ý nhanh Thế lực'
                    : 'Gom nhóm thẻ Danh sách (AUTO) — kiểu gom nhóm và list thứ tự tĩnh'}
                </summary>
                {showForceQuickSection && (
                  <p className="text-[11px] text-violet-200/90 font-serif leading-relaxed pt-1">
                    «Kiểu gom nhóm» trỏ đúng trường dữ liệu như <strong className="text-slate-200">Loại hình · Hệ cấp bậc (Bản đồ) · Cấp bậc ·
                    Địa chỉ</strong> trên thẻ Thế lực — cùng nguồn để AUTO đọc khi gom nhóm / sắp xếp. «List thứ tự / nhóm» = thứ tự nhóm
                    tĩnh (tuỳ chọn), nên khớp list gợi ý của trường tương ứng trong «Chỉnh trường hồ sơ &amp; list».
                  </p>
                )}
                <div className="grid gap-3 md:grid-cols-[minmax(0,220px)_1fr] pt-2">
                  <label className="space-y-1">
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Kiểu gom nhóm
                    </span>
                    <select
                      value={listGroupStrategy}
                      onChange={(e) => onSetTabListGroupStrategy?.(parentTabId, tabConfig?.id, e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-200 font-serif outline-none focus:border-violet-500/50"
                    >
                      {showForceQuickSection ? (
                        <>
                          <optgroup label="4 ô Gợi ý nhanh (Thế lực)">
                            <option value="auto">Tự đoán (theo tab Thế lực)</option>
                            <option value="force_loai">Loại hình (f_loai_to_chuc)</option>
                            <option value="force_realm">Hệ cấp bậc — thẻ Bản đồ (f_he_cap_the_luc)</option>
                            <option value="rank">Cấp bậc (f_cap / f_status)</option>
                            <option value="location">Địa chỉ (f_dia_ban / f_vi_tri)</option>
                          </optgroup>
                          <optgroup label="Khác">
                            <option value="title">Theo Loại / Tiêu đề (f_title)</option>
                            <option value="status">Theo Trạng thái (f_status)</option>
                            <option value="relation">Theo Quan hệ</option>
                            <option value="owner">Theo Chủ sở hữu</option>
                            <option value="text">Theo Text tổng quát</option>
                          </optgroup>
                        </>
                      ) : (
                        <>
                          <option value="auto">Tự đoán theo tab/genre</option>
                          <option value="title">Theo Loại / Tiêu đề (f_title)</option>
                          <option value="status">Theo Trạng thái (f_status)</option>
                          <option value="rank">Theo Cấp bậc (f_cap/f_status)</option>
                          <option value="location">Theo Địa bàn / Vị trí</option>
                          <option value="relation">Theo Quan hệ</option>
                          <option value="owner">Theo Chủ sở hữu</option>
                          <option value="text">Theo Text tổng quát</option>
                          <option value="force_loai">Loại hình Thế lực (f_loai_to_chuc)</option>
                          <option value="force_realm">Hệ Bản đồ Thế lực (f_he_cap_the_luc)</option>
                        </>
                      )}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      List thứ tự / nhóm
                    </span>
                    <textarea
                      ref={groupOrderInputRef}
                      defaultValue={listGroupOrderLines}
                      key={`entity-group-order-${safeString(parentTabId)}-${safeString(tabConfig?.id)}-${listGroupOrderLines}`}
                      onChange={(e) => {
                        setIsGroupOrderDirty(e.target.value !== listGroupOrderLines);
                      }}
                      rows={4}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 font-mono leading-relaxed"
                      placeholder={
                        showForceQuickSection
                          ? 'Mỗi dòng một nhãn nhóm (vd. Thần Cấp, Thiên Cấp… khi gom theo Cấp bậc). Khớp list gợi ý trường tương ứng trong Chỉnh trường hồ sơ.'
                          : 'Ví dụ:\nThần Cấp\nThiên Cấp\nĐịa Cấp\nHuyền Cấp'
                      }
                    />
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 font-serif leading-relaxed">
                  Thứ tự gộp các <strong className="text-slate-400">list gợi ý</strong> và nhãn nhóm (ô đầu tiên có dữ liệu theo thứ tự
                  đó): mở «Chỉnh trường hồ sơ &amp; list», đặt <strong className="text-slate-400">STT gộp list AUTO</strong> cho từng
                  trường (số nhỏ trước; trường chưa đánh số xếp sau). Chỉ khi có ít nhất một trường được đánh số thì quy ước này mới
                  thay mặc định theo tab. Trường không có list gợi ý vẫn tham gia thứ tự nhãn nhóm nhưng bị bỏ qua khi gộp list.
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-500 font-serif">
                    List nhóm tĩnh (tùy chọn): mỗi dòng một nhãn. Để trống để chỉ dùng list theo trường hoặc mặc định.
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const nextText = safeString(groupOrderInputRef.current?.value ?? '');
                        onSetTabListGroupOrder?.(parentTabId, tabConfig?.id, nextText);
                        setIsGroupOrderDirty(false);
                      }}
                      disabled={!isGroupOrderDirty}
                      className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold ${
                        isGroupOrderDirty
                          ? 'border-violet-600/55 bg-violet-900/35 text-violet-100 hover:bg-violet-900/50'
                          : 'border-slate-700 bg-slate-900/60 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Lưu list
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const nextText = safeString(groupOrderInputRef.current?.value ?? '');
                        onSaveTabListGroupOrderToGenreTemplate?.(parentTabId, tabConfig?.id, nextText);
                        setIsGroupOrderDirty(false);
                      }}
                      disabled={!isGroupOrderDirty}
                      className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold ${
                        isGroupOrderDirty
                          ? 'border-cyan-600/55 bg-cyan-900/30 text-cyan-100 hover:bg-cyan-900/45'
                          : 'border-slate-700 bg-slate-900/60 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Lưu list + cập nhật mẫu thể loại
                    </button>
                  </div>
                </div>
              </details>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-amber-500 mb-1 uppercase tracking-widest">Danh xưng / Tên gọi *</label>
            <input
              autoFocus
              aria-label="Danh xưng / Tên gọi"
              value={safeString(formData.name)}
              onChange={(e) => patchFormData({ name: e.target.value })}
              className="w-full bg-slate-950 border border-amber-600/50 rounded-xl p-3 text-amber-100 font-serif focus:border-amber-500 outline-none shadow-inner"
              placeholder="Bắt buộc nhập..."
            />
          </div>

          <div className="h-px bg-slate-800/80" />

          <div>
            <label className="block text-[10px] font-bold text-emerald-500 mb-2 uppercase tracking-widest flex items-center gap-2">
              <Upload size={12}/> {terms.image}
            </label>
            <div className="flex gap-4 items-center">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleAvatarDrop && handleAvatarDrop(e, (url) => patchFormData({ avatar: url }))}
                onClick={() => handlePickLocalImage && handlePickLocalImage((url) => patchFormData({ avatar: url }), null, 'avatar')}
                className="w-16 h-16 rounded-xl bg-slate-950 border border-dashed border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0 group cursor-pointer hover:border-amber-500 transition-colors"
                title="Nhấp hoặc kéo thả ảnh vào đây"
              >
                {formData.avatar ? (
                  formData.avatar.startsWith('local_image:') ? (
                    <AsyncLocalImage filename={formData.avatar.replace('local_image:', '')} alt="avatar" dirHandle={dirHandle} className="w-full h-full object-cover" />
                  ) : (
                    <img src={formData.avatar} className="w-full h-full object-cover" alt="avatar" onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMG; }} />
                  )
                ) : (
                  <ImageIcon className="text-slate-600 group-hover:text-amber-500 transition-colors" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex gap-2">
                  <input
                    value={safeString(formData.avatar)}
                    onChange={(e) => patchFormData({ avatar: e.target.value })}
                    className="flex-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:border-amber-500 outline-none"
                    placeholder="https://..."
                  />
                  <button
                    type="button"
                    onClick={() => handlePickLocalImage && handlePickLocalImage((url) => patchFormData({ avatar: url }), null, 'avatar')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-xs font-bold"
                  >
                    Chọn File
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 font-serif">Mẹo: có thể kéo thả ảnh vào ô vuông bên trái.</p>
              </div>
            </div>
          </div>

          {showGenericQuickEntry && genericQuickResolved?.slots?.length === 3 && (
            <div className={entityModalQuickSurface}>
              <p className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">
                Gợi ý nhanh ({safeString(tabConfig?.label).trim() || 'tab con'})
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                {genericQuickResolved.slots.map((slot, idx) => {
                  const fid = slot.fieldId;
                  return (
                    <div key={`${fid}-${idx}`} className="space-y-2 min-w-0">
                      <label className={entityModalQuickLabel}>{slot.label}</label>
                      {renderGenericQuickValueEditors(slot, idx)}
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 font-serif">
                Chuỗi auto sẽ lưu:{' '}
                <code className="text-amber-200">
                  {genericQuickResolved.slots
                    .map((s) => safeString(dynamicData[s.fieldId]).trim())
                    .filter(Boolean)
                    .join(' · ') || 'Chưa đủ dữ liệu'}
                </code>
              </p>
              <p className="text-[11px] text-slate-500 font-serif">
                Đổi 3 ô, nhãn hoặc menu select: Trận pháp → Quản lý tab.
                {quickUseSelect ? ' Đang bật chế độ select.' : ''} Sửa list gợi ý từng trường: mở «Chỉnh trường hồ sơ & list gợi ý (tab
                này)» phía trên.
              </p>
            </div>
          )}

          {showMapQuickSection && (
            <div className={entityModalQuickSurface}>
              <p className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">
                Gợi ý nhanh ({safeString(tabConfig?.label).trim() || 'Bản đồ'})
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className={entityModalQuickLabel}>Giới Diện</label>
                  <input
                    aria-label="Giới Diện bản đồ"
                    list="ttc-map-type-options"
                    value={mapQuickType}
                    onChange={(e) => handleMapTypeChange(e.target.value)}
                    className={entityModalQuickInput}
                    placeholder={mapFieldPlaceholders.mapType}
                  />
                </div>
                <div className="space-y-2">
                  <label className={entityModalQuickLabel}>Quy Mô Địa Vực</label>
                  <input
                    aria-label="Quy Mô Địa Vực bản đồ"
                    list="ttc-map-realm-options"
                    value={mapQuickRealmSystem}
                    onChange={(e) => handleMapRealmSystemChange(e.target.value)}
                    className={entityModalQuickInput}
                    placeholder={mapRealmSystemOptions[0] || 'Ví dụ: Hạ giới'}
                  />
                </div>
                <div className="space-y-2">
                  <label className={entityModalQuickLabel}>Đặc Tính Địa Vực</label>
                  <input
                    aria-label="Đặc Tính Địa Vực bản đồ"
                    list="ttc-force-system-options"
                    value={mapQuickSystem}
                    onChange={(e) => handleMapSystemChange(e.target.value)}
                    className={entityModalQuickInput}
                    placeholder={mapFieldPlaceholders.mapHierarchy}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className={entityModalQuickLabel}>Trực thuộc</label>
                <input
                  aria-label="Trực thuộc bản đồ"
                  list="ttc-map-name-options"
                  value={mapQuickParentPath}
                  onChange={(e) => handleMapParentPathChange(e.target.value)}
                  className={entityModalQuickInput}
                  placeholder="Có thể bỏ trống nếu là tầng cao nhất"
                />
                {!mapQuickSystem && suggestedMapSystem && (
                  <p className="text-[11px] text-amber-200/90 font-serif">
                    Gợi ý theo địa bàn cha: <strong>{suggestedMapSystem}</strong>
                  </p>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-serif">
                Chuỗi auto sẽ lưu:{' '}
                <code className="text-amber-200">{composeMapStatusLine(mapQuickType, mapQuickSystem) || 'Chưa đủ dữ liệu'}</code>
              </p>
            </div>
          )}

          {showForceQuickSection && (
            <div className={entityModalQuickSurface}>
              <p className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">
                Gợi ý nhanh ({safeString(tabConfig?.label).trim() || 'Thế lực'})
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className={entityModalQuickLabel}>Loại hình</label>
                  <input
                    aria-label="Loại hình thế lực"
                    list="ttc-force-type-options"
                    value={forceQuickType}
                    onChange={(e) => handleForceTypeChange(e.target.value)}
                    className={entityModalQuickInput}
                    placeholder={forceTypeOptions[0] || 'Ví dụ: Tông Môn'}
                  />
                </div>
                <div className="space-y-2">
                  <label className={entityModalQuickLabel}>Hệ cấp bậc</label>
                  <select
                    aria-label="Hệ cấp bậc thế lực"
                    value={forceRealmSelectValue}
                    onChange={(e) => handleForceRealmSystemChange(e.target.value)}
                    className={`${entityModalQuickInput} cursor-pointer`}
                  >
                    <option value="">— Chọn tên thẻ Bản đồ —</option>
                    {forceRealmSystemOptions.map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className={entityModalQuickLabel}>Cấp bậc</label>
                  <input
                    aria-label="Cấp bậc thế lực"
                    list="ttc-force-rank-options"
                    value={forceQuickRank}
                    onChange={(e) => handleForceRankChange(e.target.value)}
                    className={entityModalQuickInput}
                    placeholder={
                      forceRankOptions[0] ||
                      'List cấp: mở tab Bản đồ → Khởi tạo thẻ → «Quy chuẩn nhóm» → Hệ cấp bậc / Cấp bậc → Lưu'
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className={entityModalQuickLabel}>Địa chỉ</label>
                <input
                  aria-label="Địa chỉ thế lực"
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
                  <p className="text-[11px] text-slate-400 font-serif leading-relaxed">
                    <span className="text-amber-200/90 font-semibold">Thẻ trong tab «{matchedMapSubTab.label}»:</span>{' '}
                    {mapTabNamesForForceLocation.join(' · ')}
                  </p>
                )}
                {matchedMapSubTab && mapTabNamesForForceLocation.length === 0 && (
                  <p className="text-[11px] text-slate-500 font-serif">Chưa có thẻ nào trong tab Bản đồ này (ngoài thẻ Danh sách).</p>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-serif">
                Chuỗi auto sẽ lưu:{' '}
                <code className="text-amber-200">
                  {[forceQuickType, forceQuickRealmSystem, forceQuickRank, forceQuickLocation].filter(Boolean).join(' · ') ||
                    'Chưa đủ dữ liệu'}
                </code>
              </p>
            </div>
          )}

          {!hideLegacyStatusInput && (
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-snug">
                {isMapScope || isForceScope ? 'Chuỗi hiển thị / dữ liệu auto' : safeString(fStatusLabel)}
              </label>
              <input
                aria-label={isMapScope || isForceScope ? 'Chuỗi hiển thị / dữ liệu auto' : safeString(fStatusLabel)}
                value={safeString(dynamicData.f_status)}
                onChange={(e) => handleStatusFieldChange(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 font-serif focus:border-amber-600/60 outline-none"
                placeholder={resolvedStatusFieldPlaceholder}
              />
              <p className="text-[11px] text-slate-500 font-serif">{resolvedStatusFieldHint}</p>
            </div>
          )}

          <datalist id="ttc-map-type-options">
            {mapTypeSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <datalist id="ttc-force-system-options">
            {mapHierarchyOptions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <datalist id="ttc-map-realm-options">
            {mapRealmSystemOptions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <datalist id="ttc-map-name-options">
            {mapNameSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <datalist id="ttc-force-rank-options">
            {forceRankOptions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <datalist id="ttc-force-type-options">
            {forceTypeOptions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <datalist id="ttc-force-location-options">
            {forceLocationOptions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-snug">{WIKI_ALIAS_FIELD.label}</label>
            <textarea
              value={safeString(dynamicData.f_alias)}
              onChange={(e) => patchDynamicData({ f_alias: e.target.value })}
              rows={3}
              className="w-full bg-slate-950/80 border border-indigo-800/50 rounded-xl p-3 text-sm text-slate-200 font-serif focus:border-indigo-500 outline-none resize-y min-h-[4.5rem]"
              placeholder="Nhiều tên: dùng dấu phẩy, / hoặc | — ví dụ: Kim Đan, Hệ Thống / Boss"
            />
            <p className="text-[11px] text-slate-500 font-serif leading-relaxed">
              Mỗi tên tách ra sẽ cùng mở thẻ này khi bấm liên kết trong ghi chép. Gõ tên thường; <strong className="text-slate-400">không dùng [[...]]</strong> trong ô biệt danh.
            </p>
          </div>

          {parentTabId !== 'nhan-vat' && (
            <div className="rounded-xl border border-cyan-800/40 bg-cyan-950/15 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300 mb-1">Token nhãn cuối dòng (auto mốc Nhân Vật)</p>
              <p className="text-[11px] text-slate-300 font-serif leading-relaxed">
                <strong className="text-cyan-200">Chuẩn chung:</strong>{' '}
                <code className="text-cyan-300">{OWNER_HINT_INPUT_FORMAT_TEXT}</code>
              </p>
              <p className="text-[11px] text-slate-400 font-serif leading-relaxed mt-1">
                {OWNER_HINT_PREFIX_GUIDE_TEXT}
              </p>
              <p className="text-[11px] text-slate-400 font-serif leading-relaxed mt-1">
                {OWNER_TOKEN_GUIDE_TEXT}
              </p>
            </div>
          )}

          {showMapQuickSection && !initialData && (
            <div className={entityModalHintCallout}>
              <p className={entityModalHintTitle}>Ghi nhanh cho thẻ Bản Đồ</p>
              <p className="text-[11px] text-slate-300 font-serif leading-relaxed">
                Thẻ bản đồ chỉ ghi nơi chốn: tên địa bàn + <strong className="text-amber-200/95">{safeString(fStatusLabel)}</strong> theo mẫu{' '}
                <code className="text-amber-200">Giới Diện · Đặc Tính Địa Vực</code>.
              </p>
              <p className="text-[11px] text-slate-400 font-serif leading-relaxed mt-1">
                Gợi ý điền nhanh: <code className="text-amber-200">{statusFieldPlaceholder}</code>
              </p>
              <p className="text-[11px] text-slate-400 font-serif leading-relaxed mt-1">
                Ví dụ: <code className="text-amber-200">{mapFieldPlaceholders.exampleA}</code>,{' '}
                <code className="text-amber-200">{mapFieldPlaceholders.exampleB}</code>.
              </p>
              <p className="text-[11px] text-slate-400 font-serif leading-relaxed mt-1">
                {statusFieldHint} Các nhãn như <code className="text-amber-200">Thiên Tôn cấp thế lực</code> không ghi ở đây; chúng thuộc thẻ{' '}
                <strong className="text-amber-200/95">Thế lực</strong>, ví dụ{' '}
                <code className="text-amber-200">Bách Thú Cung = Tông môn · Thiên Tôn cấp thế lực · Hoang Thú giới</code>.
              </p>
            </div>
          )}

          {showForceQuickSection && (
            <div className={entityModalHintCallout}>
              <p className={entityModalHintTitle}>Chuẩn AUTO thế lực ↔ bản đồ</p>
              <p className="text-[11px] text-slate-300 font-serif leading-relaxed">
                Khởi tạo nhanh theo 4 ô: <code className="text-amber-200">Loại hình</code> -{' '}
                <code className="text-amber-200">Hệ cấp bậc</code> - <code className="text-amber-200">Cấp bậc</code> -{' '}
                <code className="text-amber-200">Địa chỉ</code>.
              </p>
              <p className="text-[11px] text-slate-400 font-serif leading-relaxed mt-1">
                AUTO đọc dữ liệu tách trường: <code className="text-amber-200">f_loai_to_chuc</code> (loại hình),{' '}
                <code className="text-amber-200">f_he_cap_the_luc</code> (hệ cấp bậc),{' '}
                <code className="text-amber-200">f_status</code> (cấp bậc), <code className="text-amber-200">f_dia_ban</code> (địa chỉ).
              </p>
            </div>
          )}

          {isCultivationScope && (
            <div className={entityModalHintCallout}>
              <p className={entityModalHintTitle}>Chuẩn AUTO hệ thống ↔ cảnh giới</p>
              <p className="text-[11px] text-slate-300 font-serif leading-relaxed">
                Ở tab Cảnh Giới, nhập <code className="text-amber-200">f_status</code> theo mẫu{' '}
                <code className="text-amber-200">De Nhat - Linh Canh Bat Bo</code> để app tự ghép sang Hệ Thống Tu Luyện.
              </p>
            </div>
          )}
        </div>

        <div className="p-6 pt-4 border-t border-slate-800 flex flex-shrink-0 justify-end gap-3 bg-slate-900">
          <button type="button" onClick={onClose} className="px-6 py-2.5 text-slate-400 hover:text-white font-serif transition-colors rounded-xl">Hủy bỏ</button>
          <button
            type="button"
            onClick={() => { if (formData.name.trim()) { onSave(formData, dynamicData, null); onClose(); } }}
            disabled={!formData.name.trim()}
            className="px-8 py-2.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl font-bold font-serif shadow-lg transition-all flex items-center gap-2"
          >
            <Save size={18}/> Lưu thông tin
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
  const fieldSuggestions =
    tabConfig?.fieldSuggestionLists && typeof tabConfig.fieldSuggestionLists === 'object'
      ? tabConfig.fieldSuggestionLists
      : {};
  const milestoneHintListPrefix = useId().replace(/:/g, '');
  const terms = getTerms(parentTabId);
  const EVENT_EDITOR_ID = 'milestone-event-editor';
  const HISTORY_LIMIT = 120;
  const notesTypo = useSyncExternalStore(subscribeEntityNotesPrefs, getEntityNotesPrefs, getEntityNotesPrefs);
  const [formData, setFormData] = useState({ id: null, chapter: '', title: '' });
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
      });
      setSnapshotData(initialData.snapshot || { avatar: '', dynamicData: {} });
    } else {
      const defaultChapter =
        defaultChapterWhenNew != null && defaultChapterWhenNew !== '' ? String(defaultChapterWhenNew) : '';
      setFormData({ id: null, chapter: defaultChapter, title: '' });
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
        { ...formData, title: safeString(formData.title).trim(), event: eventWrap.text },
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
      { ...formData, title: safeString(formData.title).trim(), event: eventWrap.text },
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
                  const label = safeString(field?.label || fieldId);
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
  const [testStatus, setTestStatus] = useState({}); // idx -> 'testing'|'ok'|'fail'
  const [showKeys, setShowKeys] = useState({});     // idx -> bool (hiện plain text)

  const notesTypoPrefs = useSyncExternalStore(subscribeEntityNotesPrefs, getEntityNotesPrefs, getEntityNotesPrefs);
  const trapRefSettings = useFocusTrap(isOpen);

  if (!isOpen) return null;

  const keys = Array.isArray(geminiApiKeys) ? geminiApiKeys : (geminiApiKeys ? [geminiApiKeys] : []);

  const handleAdd = () => {
    const trimmed = newKey.trim();
    if (!trimmed) return;
    setGeminiApiKeys([...keys, trimmed]);
    setNewKey('');
  };

  const handleRemove = (idx) => {
    setGeminiApiKeys(keys.filter((_, i) => i !== idx));
    setTestStatus(prev => { const n = {...prev}; delete n[idx]; return n; });
  };

  const handleTest = async (key, idx) => {
    setTestStatus(prev => ({ ...prev, [idx]: 'testing' }));
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'test' }] }] }) }
      );
      setTestStatus(prev => ({ ...prev, [idx]: res.ok ? 'ok' : 'fail' }));
    } catch {
      setTestStatus(prev => ({ ...prev, [idx]: 'fail' }));
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
                       <div className={`w-2 h-2 rounded-full flex-shrink-0 ${st === 'ok' ? 'bg-emerald-400' : st === 'fail' ? 'bg-rose-500' : 'bg-slate-600'}`}/>
                       <span className="flex-1 font-mono text-xs text-slate-300 truncate select-none">
                         {showKeys[idx] ? k : maskKey(k)}
                       </span>
                       <span className="text-[10px] text-slate-600 flex-shrink-0">#{idx + 1}</span>
                       <button onClick={() => setShowKeys(prev => ({ ...prev, [idx]: !prev[idx] }))} className="p-1 text-slate-600 hover:text-slate-300 transition-colors flex-shrink-0" title={showKeys[idx] ? 'Ẩn' : 'Hiện'}>
                         <Eye size={13}/>
                       </button>
                       <button onClick={() => handleTest(k, idx)} disabled={st === 'testing'} className={`px-2 py-1 rounded-lg text-[10px] font-bold flex-shrink-0 transition-colors border ${st === 'ok' ? 'border-emerald-700/50 text-emerald-400 bg-emerald-950/30' : st === 'fail' ? 'border-rose-700/50 text-rose-400 bg-rose-950/30' : 'border-slate-700 text-slate-400 hover:text-indigo-400 hover:border-indigo-700/50 bg-slate-900'}`}>
                         {st === 'testing' ? '...' : st === 'ok' ? '✓ OK' : st === 'fail' ? '✗ Lỗi' : 'Thử'}
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
                  Nut "Thu" chi xac nhan key con dung luc nay; khi dung that van co the gap 429/503 neu quota hoac dich vu dang qua tai.
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
                     <div className="mt-3 flex items-center gap-3">
                       <button
                         type="button"
                         disabled={(formData.genres || []).length === 0}
                         onClick={() => {
                          const cfg = hasSavedGenreTemplate
                            ? savedGenreTemplate.tabsConfig
                            : mergeTabsByGenres(formData.genres || []);
                           if (cfg) patchFormData({ tabsConfig: cfg });
                         }}
                         className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-serif bg-amber-900/30 border border-amber-600/40 text-amber-300 hover:bg-amber-800/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                       >
                        <Sparkles size={16} /> {hasSavedGenreTemplate ? 'Dùng mẫu đã lưu theo thể loại' : 'Tạo cấu trúc theo thể loại'}
                       </button>
                      {hasSavedGenreTemplate && (
                        <span className="text-xs text-cyan-300 font-serif">
                          ✓ Đã có cây mẫu cá nhân cho tổ hợp thể loại này, gồm cả quy chuẩn nhóm theo tab
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

