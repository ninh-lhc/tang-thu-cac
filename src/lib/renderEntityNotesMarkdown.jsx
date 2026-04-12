// ==========================================
// Rich renderer cho Ghi Chép Chi Tiết.
// Giữ markdown thuần khi soạn, nhưng preview/read mode có block ngữ nghĩa,
// callout đẹp hơn, list có cấp, và metadata để dựng mini TOC.
// ==========================================

import React from 'react';
import { ScrollText } from 'lucide-react';
import { safeString, processInline } from '../MasterUtils.jsx';
import { buildEntityNameLookup } from './entityWikiLookup.js';
import { resolveEntityNotesCallout } from './entityNotesSemantics.js';

const DIVIDER_RE = /^(?:-{3,}|\*{3,}|_{3,})$/;
const SECTION_HEADING_RE = /^\*\*(\d+)\.\s(.+?)\*\*$/;
const BULLET_RE = /^(\s*)[-*]\s+(.*)$/;
const ORDERED_RE = /^(\s*)(\d+)\.\s+(.*)$/;
const IMAGE_LINE_RE = /^!\[(.*?)\]\((.*?)\)$/;
const QUOTE_LINE_RE = /^\s*>\s?(.*)$/;
const CALLOUT_MARKER_RE = /^\[!([A-Z_-]+)\](?:\s+(.*))?$/i;
const LEAD_BOLD_LABEL_RE = /^\*\*((?:(?!\*\*).)+?[:：])\*\*(?:\s+|$)([\s\S]*)$/u;

const CALLOUT_STYLES = {
  violet: {
    shell: 'border-violet-500/25 bg-violet-950/20',
    badge: 'border-violet-500/30 bg-violet-500/10 text-violet-200',
    title: 'text-violet-100',
  },
  amber: {
    shell: 'border-amber-500/25 bg-amber-950/20',
    badge: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    title: 'text-amber-100',
  },
  cyan: {
    shell: 'border-cyan-500/25 bg-cyan-950/20',
    badge: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200',
    title: 'text-cyan-100',
  },
  emerald: {
    shell: 'border-emerald-500/25 bg-emerald-950/20',
    badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    title: 'text-emerald-100',
  },
  sky: {
    shell: 'border-sky-500/25 bg-sky-950/20',
    badge: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
    title: 'text-sky-100',
  },
  indigo: {
    shell: 'border-indigo-500/25 bg-indigo-950/20',
    badge: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-200',
    title: 'text-indigo-100',
  },
  rose: {
    shell: 'border-rose-500/25 bg-rose-950/20',
    badge: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
    title: 'text-rose-100',
  },
};

const buildSlug = (value) =>
  safeString(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'section';

const makeAnchorId = (label, usedAnchors) => {
  const base = buildSlug(label);
  let candidate = base;
  let counter = 2;
  while (usedAnchors.has(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }
  usedAnchors.add(candidate);
  return candidate;
};

const isBlockBoundary = (line) => {
  const normalized = safeString(line);
  const trimmed = normalized.trim();
  if (!trimmed) return true;
  const leftTrimmed = normalized.trimStart();
  return (
    leftTrimmed.startsWith('# ') ||
    leftTrimmed.startsWith('## ') ||
    leftTrimmed.startsWith('### ') ||
    leftTrimmed.startsWith('> ') ||
    DIVIDER_RE.test(trimmed) ||
    SECTION_HEADING_RE.test(trimmed) ||
    BULLET_RE.test(normalized) ||
    ORDERED_RE.test(normalized) ||
    IMAGE_LINE_RE.test(trimmed)
  );
};

const renderInlineBodyWithLeadLabel = (body, context) => {
  const normalized = safeString(body);
  const match = normalized.match(LEAD_BOLD_LABEL_RE);
  const { dirHandle, lookup, linkRegex, onNavigate, selfEntityId } = context;

  if (!match) {
    return processInline(normalized, dirHandle, lookup, linkRegex, onNavigate, selfEntityId);
  }

  const labelText = safeString(match[1]).trim();
  const restText = safeString(match[2]).trimStart();

  return (
    <div className="flex flex-col gap-1.5">
      <div
        data-entity-lead-label="true"
        className="flex w-fit max-w-full items-center gap-3 text-[0.8rem] font-bold uppercase tracking-[0.22em] text-slate-400/90"
      >
        <span>{processInline(labelText, dirHandle, lookup, linkRegex, onNavigate, selfEntityId)}</span>
        <span
          aria-hidden="true"
          data-entity-lead-label-rule="true"
          className="h-px w-14 bg-slate-700/80"
        />
      </div>
      {restText ? (
        <div className="pl-0.5">
          {processInline(restText, dirHandle, lookup, linkRegex, onNavigate, selfEntityId)}
        </div>
      ) : null}
    </div>
  );
};

function renderBlocksFromLines(lines, context, options = {}) {
  const { baseKey = 'entity-notes', collectToc = false, usedAnchors = new Set(), compact = false, onJumpToLine = null } = options;
  const { dirHandle, lookup, linkRegex, onNavigate, selfEntityId } = context;
  const blocks = [];
  const toc = [];
  let lineIndex = 0;
  let paragraphCount = 0;

  const buildJumpProps = (lineNo, anchorId = null) => {
    const props = {
      'data-entity-line': lineNo,
    };
    if (anchorId) {
      props.id = anchorId;
      props['data-entity-anchor'] = anchorId;
    }
    if (typeof onJumpToLine === 'function') {
      props.onClick = (event) => {
        if (event.defaultPrevented) return;
        onJumpToLine(lineNo);
      };
      props.className = 'cursor-pointer';
    }
    return props;
  };

  const mergeClassName = (jumpProps, className) =>
    jumpProps.className ? `${className} ${jumpProps.className}` : className;

  const pushTocItem = (title, level, lineNo) => {
    if (!collectToc) return null;
    const id = makeAnchorId(title, usedAnchors);
    toc.push({ id, title, level, line: lineNo });
    return id;
  };

  while (lineIndex < lines.length) {
    const rawLine = safeString(lines[lineIndex]);
    const trimmed = rawLine.trim();
    const leftTrimmed = rawLine.trimStart();

    if (!trimmed) {
      blocks.push(
        <div key={`${baseKey}-empty-${lineIndex}`} className={compact ? 'h-2' : 'h-4'} />
      );
      lineIndex += 1;
      continue;
    }

    if (leftTrimmed.startsWith('# ')) {
      const title = leftTrimmed.slice(2);
      const lineNo = lineIndex + 1;
      const anchorId = pushTocItem(title, 1, lineNo);
      const jumpProps = buildJumpProps(lineNo, anchorId || undefined);
      blocks.push(
        <h1
          key={`${baseKey}-h1-${lineIndex}`}
          {...jumpProps}
          className={mergeClassName(jumpProps, 'mt-8 mb-5 border-b border-violet-500/20 pb-3 text-[2.15rem] font-heading font-bold text-slate-50')}
        >
          {processInline(title, dirHandle, lookup, linkRegex, onNavigate, selfEntityId)}
        </h1>
      );
      lineIndex += 1;
      continue;
    }

    if (leftTrimmed.startsWith('## ')) {
      const title = leftTrimmed.slice(3);
      const lineNo = lineIndex + 1;
      const anchorId = pushTocItem(title, 2, lineNo);
      const jumpProps = buildJumpProps(lineNo, anchorId || undefined);
      blocks.push(
        <h2
          key={`${baseKey}-h2-${lineIndex}`}
          {...jumpProps}
          className={mergeClassName(jumpProps, 'mt-8 mb-4 border-l-4 border-violet-500/35 pl-4 text-[1.7rem] font-heading font-bold text-violet-100')}
        >
          {processInline(title, dirHandle, lookup, linkRegex, onNavigate, selfEntityId)}
        </h2>
      );
      lineIndex += 1;
      continue;
    }

    if (leftTrimmed.startsWith('### ')) {
      const title = leftTrimmed.slice(4);
      const lineNo = lineIndex + 1;
      const anchorId = pushTocItem(title, 3, lineNo);
      const jumpProps = buildJumpProps(lineNo, anchorId || undefined);
      blocks.push(
        <h3
          key={`${baseKey}-h3-${lineIndex}`}
          {...jumpProps}
          className={mergeClassName(jumpProps, 'mt-6 mb-3 text-[1.15rem] font-bold uppercase tracking-[0.18em] text-amber-200/85')}
        >
          {processInline(title, dirHandle, lookup, linkRegex, onNavigate, selfEntityId)}
        </h3>
      );
      lineIndex += 1;
      continue;
    }

    if (DIVIDER_RE.test(trimmed)) {
      const jumpProps = buildJumpProps(lineIndex + 1);
      blocks.push(
        <div
          key={`${baseKey}-divider-${lineIndex}`}
          {...jumpProps}
          className={mergeClassName(jumpProps, 'my-6 h-px bg-gradient-to-r from-transparent via-violet-400/35 to-cyan-400/20')}
        />
      );
      lineIndex += 1;
      continue;
    }

    if (IMAGE_LINE_RE.test(trimmed)) {
      const jumpProps = buildJumpProps(lineIndex + 1);
      blocks.push(
        <div
          key={`${baseKey}-img-${lineIndex}`}
          {...jumpProps}
          className={mergeClassName(jumpProps, 'my-5')}
        >
          {processInline(trimmed, dirHandle, lookup, linkRegex, onNavigate, selfEntityId)}
        </div>
      );
      lineIndex += 1;
      continue;
    }

    const sectionHeading = trimmed.match(SECTION_HEADING_RE);
    if (sectionHeading) {
      const orderNo = sectionHeading[1];
      const title = sectionHeading[2];
      const lineNo = lineIndex + 1;
      const anchorId = pushTocItem(`${orderNo}. ${title}`, 2, lineNo);
      const jumpProps = buildJumpProps(lineNo, anchorId || undefined);
      blocks.push(
        <div
          key={`${baseKey}-section-${lineIndex}`}
          {...jumpProps}
          className={mergeClassName(jumpProps, 'mt-8 mb-4 flex items-start gap-3')}
        >
          <span className="pt-0.5 text-[1.55rem] leading-none font-heading font-black text-violet-400/95">
            {orderNo}.
          </span>
          <h3 className="text-[1.55rem] leading-tight font-heading font-bold text-violet-200">
            {processInline(title, dirHandle, lookup, linkRegex, onNavigate, selfEntityId)}
          </h3>
        </div>
      );
      lineIndex += 1;
      continue;
    }

    if (QUOTE_LINE_RE.test(leftTrimmed)) {
      const quoteLines = [];
      const startIndex = lineIndex;
      while (lineIndex < lines.length) {
        const currentLine = safeString(lines[lineIndex]).trimStart();
        const match = currentLine.match(QUOTE_LINE_RE);
        if (!match) break;
        quoteLines.push(match[1]);
        lineIndex += 1;
      }

      const markerMatch = safeString(quoteLines[0]).trim().match(CALLOUT_MARKER_RE);
      if (markerMatch) {
        const role = String(markerMatch[1] || '').toUpperCase();
        const callout = resolveEntityNotesCallout(role) || resolveEntityNotesCallout('NOTE');
        const style = CALLOUT_STYLES[callout?.accent || 'violet'] || CALLOUT_STYLES.violet;
        const explicitTitle = safeString(markerMatch[2]).trim();
        const title = explicitTitle || callout?.title || role;
        const contentLines = quoteLines.slice(1);
        const innerModel = renderBlocksFromLines(contentLines, context, {
          baseKey: `${baseKey}-callout-${startIndex}`,
          collectToc: false,
          compact: true,
          usedAnchors,
        });
        blocks.push(
          <section
            key={`${baseKey}-callout-${startIndex}`}
            {...buildJumpProps(startIndex + 1)}
            className={mergeClassName(
              buildJumpProps(startIndex + 1),
              `my-5 rounded-3xl border px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${style.shell}`
            )}
          >
            <div className="mb-3 flex items-center gap-3">
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${style.badge}`}>
                {callout?.label || role}
              </span>
              <h4 className={`font-heading text-lg font-bold ${style.title}`}>{title}</h4>
            </div>
            <div className="min-w-0">
              {innerModel.blocks.length > 0 ? (
                innerModel.blocks
              ) : (
                <p className="font-serif text-[1.04rem] leading-[1.8] text-slate-200/90">...</p>
              )}
            </div>
          </section>
        );
        continue;
      }

      blocks.push(
        <blockquote
          key={`${baseKey}-quote-${startIndex}`}
          {...buildJumpProps(startIndex + 1)}
          className={mergeClassName(
            buildJumpProps(startIndex + 1),
            'my-5 rounded-2xl border border-amber-500/20 bg-amber-950/15 px-5 py-4 text-[1.05rem] italic text-slate-200/80 shadow-[inset_0_1px_0_rgba(251,191,36,0.06)]'
          )}
        >
          {processInline(quoteLines.join(' '), dirHandle, lookup, linkRegex, onNavigate, selfEntityId)}
        </blockquote>
      );
      continue;
    }

    if (BULLET_RE.test(rawLine)) {
      const items = [];
      const startIndex = lineIndex;
      while (lineIndex < lines.length) {
        const currentLine = safeString(lines[lineIndex]);
        const currentMatch = currentLine.match(BULLET_RE);
        if (!currentMatch) break;
        items.push({ indent: currentMatch[1].length, body: currentMatch[2] });
        lineIndex += 1;
      }
      blocks.push(
        <ul
          key={`${baseKey}-ul-${startIndex}`}
          {...buildJumpProps(startIndex + 1)}
          className={mergeClassName(
            buildJumpProps(startIndex + 1),
            'mb-5 list-none space-y-2 text-[1.08rem] leading-[1.85] text-slate-200'
          )}
        >
          {items.map((item, idx) => {
            const level = Math.floor(item.indent / 2);
            const marker = level % 2 === 0 ? '•' : '◦';
            return (
              <li
                key={`${baseKey}-ul-${startIndex}-${idx}`}
                className="flex items-start gap-3"
                style={{ paddingInlineStart: `${level * 1.15}rem` }}
              >
                <span className="mt-[0.45rem] text-sm font-bold text-violet-300">{marker}</span>
                <div className="flex-1 pl-0.5">
                  {renderInlineBodyWithLeadLabel(item.body, context)}
                </div>
              </li>
            );
          })}
        </ul>
      );
      continue;
    }

    if (ORDERED_RE.test(rawLine)) {
      const items = [];
      const startIndex = lineIndex;
      while (lineIndex < lines.length) {
        const currentLine = safeString(lines[lineIndex]);
        const currentMatch = currentLine.match(ORDERED_RE);
        if (!currentMatch) break;
        items.push({
          indent: currentMatch[1].length,
          orderNo: currentMatch[2],
          body: currentMatch[3],
        });
        lineIndex += 1;
      }
      blocks.push(
        <ol
          key={`${baseKey}-ol-${startIndex}`}
          {...buildJumpProps(startIndex + 1)}
          className={mergeClassName(
            buildJumpProps(startIndex + 1),
            'mb-5 list-none space-y-2 text-[1.08rem] leading-[1.85] text-slate-200'
          )}
        >
          {items.map((item, idx) => {
            const level = Math.floor(item.indent / 2);
            return (
              <li
                key={`${baseKey}-ol-${startIndex}-${idx}`}
                className="flex items-start gap-3"
                style={{ paddingInlineStart: `${level * 1.15}rem` }}
              >
                <span className="min-w-[1.75rem] pt-0.5 text-right font-semibold text-violet-300">
                  {item.orderNo}.
                </span>
                <div className="flex-1 pl-0.5">
                  {renderInlineBodyWithLeadLabel(item.body, context)}
                </div>
              </li>
            );
          })}
        </ol>
      );
      continue;
    }

    const paragraphLines = [];
    const startIndex = lineIndex;
    while (lineIndex < lines.length) {
      const currentLine = safeString(lines[lineIndex]);
      if (!currentLine.trim()) break;
      if (paragraphLines.length > 0 && isBlockBoundary(currentLine)) break;
      paragraphLines.push(currentLine.trim());
      lineIndex += 1;
    }

    const paragraphText = paragraphLines.join(' ');
    const isLeadParagraph = paragraphCount === 0 && paragraphText.length >= 90;
    paragraphCount += 1;
    blocks.push(
      <p
        key={`${baseKey}-p-${startIndex}`}
        {...buildJumpProps(startIndex + 1)}
        className={mergeClassName(
          buildJumpProps(startIndex + 1),
          isLeadParagraph
            ? 'mb-5 font-serif text-[1.28rem] leading-[1.95] text-slate-100'
            : 'mb-4 font-serif text-[1.1rem] leading-[1.9] text-slate-200/92'
        )}
      >
        {processInline(paragraphText, dirHandle, lookup, linkRegex, onNavigate, selfEntityId)}
      </p>
    );
  }

  return { blocks, toc };
}

export function buildEntityNotesPreviewModel(
  text,
  dirHandle,
  entityMap,
  linkRegex,
  onNavigate,
  selfEntityId = null,
  options = {},
) {
  if (!text || typeof text !== 'string') {
    return {
      toc: [],
      blocks: [
        <div key="entity-notes-empty" className="mt-10 flex flex-col items-center gap-4 font-serif italic text-slate-600">
          <ScrollText size={48} className="opacity-30" />
          <span>{'Ch\u01b0a c\u00f3 ghi ch\u00e9p n\u00e0o...'}</span>
        </div>,
      ],
    };
  }

  const lookup = buildEntityNameLookup(entityMap);
  return renderBlocksFromLines(
    text.split('\n'),
    { dirHandle, lookup, linkRegex, onNavigate, selfEntityId },
    { baseKey: 'entity-notes', collectToc: true, usedAnchors: new Set(), ...options }
  );
}

export const renderEntityNotesMarkdown = (
  text,
  dirHandle,
  entityMap,
  linkRegex,
  onNavigate,
  selfEntityId = null,
) => buildEntityNotesPreviewModel(text, dirHandle, entityMap, linkRegex, onNavigate, selfEntityId).blocks;
