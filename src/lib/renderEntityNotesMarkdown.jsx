// ==========================================
// Rich renderer cho Ghi Chép Chi Tiết.
// Giữ markdown thuần khi soạn, nhưng preview/read mode có block ngữ nghĩa,
// callout đẹp hơn, list có cấp, và metadata để dựng mini TOC.
// ==========================================

import React from 'react';
import {
  AlertTriangle,
  CircleAlert,
  Info,
  Lightbulb,
  ScrollText,
  Sparkles,
} from 'lucide-react';
import { safeString, processInline } from '../MasterUtils.jsx';
import { buildEntityNameLookup } from './entityWikiLookup.js';
import { resolveEntityNotesCallout } from './entityNotesSemantics.js';
import {
  isMarkdownTableRowLine,
  normalizeTableColumnCount,
  tryParseMarkdownTableBlock,
} from './markdownTable.js';
import { TtcQueryPreviewBlock } from './ttcQueryRenderer.jsx';

const DIVIDER_RE = /^(?:-{3,}|\*{3,}|_{3,})$/;
const SECTION_HEADING_RE = /^\*\*(\d+)\.\s(.+?)\*\*$/;
const BULLET_RE = /^(\s*)[-*]\s+(.*)$/;
const ORDERED_RE = /^(\s*)(\d+)\.\s+(.*)$/;
const IMAGE_LINE_RE = /^!\[(.*?)\]\((.*?)\)$/;
const QUOTE_LINE_RE = /^\s*>\s?(.*)$/;
const CALLOUT_MARKER_RE = /^\[!([A-Z_-]+)\](?:\s+(.*))?$/i;
const LEAD_BOLD_LABEL_RE = /^\*\*((?:(?!\*\*).)+?[:：])\*\*(?:\s+|$)([\s\S]*)$/u;
/** Mẫu form: «Tên trường: giá trị» (không **), dùng trong preview ghi chép. */
const PLAIN_FIELD_COLON_RE = /^((?:(?!\*\*).)+?[:：])\s*([\s\S]*)$/u;
const AUTO_SYNC_FOOTER_RE = /^\(?\s*(?:Tự động cập nhật theo|Tu dong cap nhat theo)\b/i;

/** Phân cấp màu cố định: tiêu đề lớn / tiêu đề nhỏ / tên trường (trước dấu :). */
const ENTITY_NOTES_TYPO = {
  majorTitle: 'text-violet-200',
  majorBorder: 'border-violet-500/45',
  minorTitle: 'text-amber-200/90',
  fieldLabel: 'text-cyan-300/95',
  listMarker: 'text-slate-500',
  listRail: 'border-slate-700/40',
  body: 'text-slate-200/95',
};

const CALLOUT_ICON_BY_KEY = {
  info: Info,
  tip: Lightbulb,
  important: AlertTriangle,
  caution: AlertTriangle,
  error: CircleAlert,
  note: ScrollText,
  key: Sparkles,
};

const resolveCalloutIcon = (callout, roleKey) => {
  const iconKey = safeString(callout?.icon).toLowerCase();
  if (iconKey && CALLOUT_ICON_BY_KEY[iconKey]) return CALLOUT_ICON_BY_KEY[iconKey];
  const role = String(roleKey || callout?.role || '').toUpperCase();
  if (role === 'WARNING' || role === 'IMPORTANT' || role === 'CAUTION') return AlertTriangle;
  if (role === 'INFO' || role === 'DEFINITION') return Info;
  if (role === 'KEY' || role === 'TIP') return Lightbulb;
  if (role === 'ERROR') return CircleAlert;
  return ScrollText;
};

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

/**
 * Số dòng danh sách (- / *) hoặc danh sách số trong từng khoảng dưới mỗi tiêu đề (đến tiêu đề cùng hoặc cao hơn).
 * Dùng cho metadata TOC (count) / logic đồng bộ; không hiển thị trên giao diện.
 */
export function computeEntityNotesHeadingSectionCounts(lines) {
  const arr = Array.isArray(lines) ? lines : [];
  const counts = new Map();
  const headings = [];
  for (let idx = 0; idx < arr.length; idx += 1) {
    const raw = safeString(arr[idx]);
    const leftTrimmed = raw.trimStart();
    let level = 0;
    let title = '';
    if (leftTrimmed.startsWith('### ')) {
      level = 3;
      title = leftTrimmed.slice(4);
    } else if (leftTrimmed.startsWith('## ')) {
      level = 2;
      title = leftTrimmed.slice(3);
    } else if (leftTrimmed.startsWith('# ')) {
      level = 1;
      title = leftTrimmed.slice(2);
    } else {
      const m = raw.trim().match(SECTION_HEADING_RE);
      if (m) {
        level = 2;
        title = `${m[1]}. ${m[2]}`;
      }
    }
    if (level > 0) headings.push({ lineIndex: idx, level, title });
  }
  for (let k = 0; k < headings.length; k += 1) {
    const { lineIndex, level } = headings[k];
    const next = headings[k + 1];
    const endLine = next && next.level <= level ? next.lineIndex : arr.length;
    let n = 0;
    for (let i = lineIndex + 1; i < endLine; i += 1) {
      const row = safeString(arr[i]);
      if (BULLET_RE.test(row) || ORDERED_RE.test(row)) n += 1;
    }
    counts.set(lineIndex + 1, n);
  }
  return counts;
}

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
    IMAGE_LINE_RE.test(trimmed) ||
    isMarkdownTableRowLine(normalized) ||
    trimmed.startsWith('```')
  );
};

const ENTITY_NOTES_INLINE_OPTS = { entityNotesPreview: true };

const withEntityNotesInlineOpts = (extra = {}) => ({
  ...ENTITY_NOTES_INLINE_OPTS,
  ...extra,
});

const inlineOptsForContext = (context, extra = {}) =>
  withEntityNotesInlineOpts({
    wikiLinkOptOuts: Array.isArray(context?.wikiLinkOptOuts) ? context.wikiLinkOptOuts : [],
    ...extra,
  });

/**
 * Bullet / list: bật addressMeta (địa chỉ bản đồ) trừ khi có `[color=…]` — tách ngoặc theo () làm vỡ
 * khối màu khi phần in đậm có (Cấp …) bên trong `[color]…[/color]`.
 */
const listInlineOptsForBody = (body, context) => {
  const s = safeString(body);
  if (/\[color=/i.test(s)) return inlineOptsForContext(context, { addressMeta: false });
  return inlineOptsForContext(context, { addressMeta: true });
};

const renderEntityNotesFieldRow = (labelText, restText, context) => {
  const { dirHandle, lookup, linkRegex, onNavigate, selfEntityId } = context;
  const label = safeString(labelText).trim();
  const rest = safeString(restText).trimStart();
  return (
    <span className="inline leading-[1.85]">
      <strong data-entity-field-label="true" className={`font-bold ${ENTITY_NOTES_TYPO.fieldLabel}`}>
        {processInline(
          label,
          dirHandle,
          lookup,
          linkRegex,
          onNavigate,
          selfEntityId,
          inlineOptsForContext(context, { entityNotesPreview: true })
        )}
      </strong>
      {rest ? (
        <>
          {' '}
          <span className={ENTITY_NOTES_TYPO.body}>
            {processInline(rest, dirHandle, lookup, linkRegex, onNavigate, selfEntityId, inlineOptsForContext(context))}
          </span>
        </>
      ) : null}
    </span>
  );
};

const renderInlineBodyWithLeadLabel = (body, context) => {
  const normalized = safeString(body);
  const boldMatch = normalized.match(LEAD_BOLD_LABEL_RE);
  const { dirHandle, lookup, linkRegex, onNavigate, selfEntityId } = context;
  const listOpts = listInlineOptsForBody(normalized, context);

  if (boldMatch) {
    return renderEntityNotesFieldRow(boldMatch[1], boldMatch[2], context);
  }

  const plainMatch = normalized.match(PLAIN_FIELD_COLON_RE);
  if (plainMatch && !normalized.includes('**')) {
    const labelPart = safeString(plainMatch[1]);
    const colonAt = Math.max(labelPart.lastIndexOf(':'), labelPart.lastIndexOf('：'));
    const beforeColon = colonAt >= 0 ? labelPart.slice(0, colonAt) : labelPart;
    if (!beforeColon.includes('(') && !beforeColon.includes('（')) {
      return renderEntityNotesFieldRow(plainMatch[1], plainMatch[2], context);
    }
  }

  return processInline(normalized, dirHandle, lookup, linkRegex, onNavigate, selfEntityId, listOpts);
};

const TABLE_ALIGN_CLASS = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const renderTableCellInline = (cellText, context, renderInlineFn) => {
  const raw = safeString(cellText);
  const parts = raw.split(/<br\s*\/?>/gi);
  if (parts.length <= 1) return renderInlineFn(raw);
  return parts.map((part, pi) => (
    <React.Fragment key={`br-${pi}`}>
      {pi > 0 && <br />}
      {renderInlineFn(part)}
    </React.Fragment>
  ));
};

const renderEntityNotesTableBlock = (
  tableBlock,
  context,
  baseKey,
  startIndex,
  buildJumpProps,
  mergeClassName,
  tableIndex,
  onEditMarkdownTable,
) => {
  const { dirHandle, lookup, linkRegex, onNavigate, selfEntityId } = context;
  const normalized = normalizeTableColumnCount(tableBlock.header, tableBlock.aligns, tableBlock.rows);
  const lineNo = startIndex + 1;
  const jumpProps = buildJumpProps(lineNo);

  const renderCell = (cellText) =>
    renderTableCellInline(cellText, context, (segment) =>
      processInline(
        safeString(segment),
        dirHandle,
        lookup,
        linkRegex,
        onNavigate,
        selfEntityId,
        inlineOptsForContext(context, { wikiLinkWrap: true }),
      ),
    );

  const tableMinWidthRem = Math.max(normalized.colCount * 6.5, 12);

  return (
    <div
      key={`${baseKey}-table-${startIndex}`}
      {...jumpProps}
      className={mergeClassName(
        jumpProps,
        'group entity-notes-md-table-wrap custom-scrollbar my-5 max-w-full overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-950/40',
      )}
    >
      {typeof onEditMarkdownTable === 'function' && (
        <div className="flex justify-end px-2 pt-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            data-testid={`edit-md-table-${tableIndex}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onEditMarkdownTable(tableIndex);
            }}
            className="rounded-lg border border-amber-700/40 bg-amber-950/40 px-2.5 py-1 text-[11px] font-bold text-amber-200 hover:bg-amber-900/50"
          >
            Chỉnh sửa bảng
          </button>
        </div>
      )}
      <table
        className="entity-notes-md-table w-full border-collapse text-[1.02rem] leading-relaxed"
        data-wide={normalized.colCount > 8 ? 'true' : undefined}
        style={{ minWidth: `${tableMinWidthRem}rem` }}
      >
        <thead className="entity-notes-md-table-head">
          <tr>
            {normalized.header.map((cell, ci) => {
              const align = normalized.aligns[ci] || 'left';
              return (
                <th
                  key={`${baseKey}-th-${startIndex}-${ci}`}
                  className={`entity-notes-md-table-th ${TABLE_ALIGN_CLASS[align] || TABLE_ALIGN_CLASS.left}`}
                >
                  <div className="entity-notes-md-table-cell-inner">{renderCell(cell)}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {normalized.rows.map((row, ri) => (
            <tr key={`${baseKey}-tr-${startIndex}-${ri}`} className="entity-notes-md-table-row">
              {row.map((cell, ci) => {
                const align = normalized.aligns[ci] || 'left';
                return (
                  <td
                    key={`${baseKey}-td-${startIndex}-${ri}-${ci}`}
                    className={`entity-notes-md-table-td ${TABLE_ALIGN_CLASS[align] || TABLE_ALIGN_CLASS.left}`}
                  >
                    <div className="entity-notes-md-table-cell-inner">{renderCell(cell)}</div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

function renderBlocksFromLines(lines, context, options = {}) {
  const {
    baseKey = 'entity-notes',
    collectToc = false,
    usedAnchors = new Set(),
    compact = false,
    onJumpToLine = null,
    onEditMarkdownTable = null,
    skipHeadingCountScan = false,
    headingCountsByLine: headingCountsInjected = null,
  } = options;
  let markdownTableIndex = 0;
  const { dirHandle, lookup, linkRegex, onNavigate, selfEntityId } = context;
  const headingCountsByLine =
    headingCountsInjected || (skipHeadingCountScan ? null : computeEntityNotesHeadingSectionCounts(lines));
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
    const c = headingCountsByLine?.get(lineNo);
    toc.push({ id, title, level, line: lineNo, count: typeof c === 'number' ? c : undefined });
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
          className={mergeClassName(
            jumpProps,
            `mt-8 mb-5 border-b border-violet-500/25 pb-3 text-[2.15rem] font-heading font-bold ${ENTITY_NOTES_TYPO.majorTitle}`,
          )}
        >
          {processInline(title, dirHandle, lookup, linkRegex, onNavigate, selfEntityId, inlineOptsForContext(context))}
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
          className={mergeClassName(
            jumpProps,
            `mt-8 mb-3 border-l-[3px] pl-3.5 text-[1.65rem] font-heading font-bold ${ENTITY_NOTES_TYPO.majorBorder} ${ENTITY_NOTES_TYPO.majorTitle}`,
          )}
        >
          {processInline(title, dirHandle, lookup, linkRegex, onNavigate, selfEntityId, inlineOptsForContext(context))}
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
          className={mergeClassName(
            jumpProps,
            `mt-6 mb-3 text-[1.12rem] font-bold ${ENTITY_NOTES_TYPO.minorTitle}`,
          )}
        >
          {processInline(title, dirHandle, lookup, linkRegex, onNavigate, selfEntityId, inlineOptsForContext(context))}
        </h3>
      );
      lineIndex += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const fenceLang = trimmed.slice(3).trim().toLowerCase();
      const fenceLines = [];
      const startIndex = lineIndex;
      lineIndex += 1;
      while (lineIndex < lines.length) {
        const fenceLine = safeString(lines[lineIndex]);
        if (fenceLine.trim().startsWith('```')) {
          lineIndex += 1;
          break;
        }
        fenceLines.push(fenceLine);
        lineIndex += 1;
      }
      const jumpProps = buildJumpProps(startIndex + 1);
      if (fenceLang === 'ttc-query') {
        blocks.push(
          <div key={`${baseKey}-ttc-query-${startIndex}`} {...jumpProps} className={mergeClassName(jumpProps, '')}>
            <TtcQueryPreviewBlock
              source={fenceLines.join('\n')}
              activeNovelData={context.activeNovelData ?? null}
              tabsConfig={context.tabsConfig ?? null}
              renderContext={context}
              baseKey={`${baseKey}-ttc-${startIndex}`}
            />
          </div>,
        );
      } else {
        blocks.push(
          <pre
            key={`${baseKey}-code-${startIndex}`}
            {...jumpProps}
            className={mergeClassName(
              jumpProps,
              'my-5 overflow-x-auto rounded-2xl border border-slate-700/60 bg-slate-950/80 px-4 py-3 font-mono text-[0.92rem] leading-relaxed text-slate-300 whitespace-pre-wrap',
            )}
          >
            <code>{fenceLines.join('\n')}</code>
          </pre>,
        );
      }
      continue;
    }

    const tableBlock = tryParseMarkdownTableBlock(lines, lineIndex);
    if (tableBlock) {
      const currentTableIndex = markdownTableIndex;
      markdownTableIndex += 1;
      blocks.push(
        renderEntityNotesTableBlock(
          tableBlock,
          context,
          baseKey,
          lineIndex,
          buildJumpProps,
          mergeClassName,
          currentTableIndex,
          onEditMarkdownTable,
        ),
      );
      lineIndex = tableBlock.endLine;
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
          {processInline(trimmed, dirHandle, lookup, linkRegex, onNavigate, selfEntityId, inlineOptsForContext(context))}
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
          className={mergeClassName(
            jumpProps,
            `mt-8 mb-3 flex items-start gap-3 border-l-[3px] pl-3.5 ${ENTITY_NOTES_TYPO.majorBorder}`,
          )}
        >
          <span
            className={`pt-0.5 text-[1.5rem] leading-none font-heading font-bold ${ENTITY_NOTES_TYPO.majorTitle}`}
          >
            {orderNo}.
          </span>
          <h3
            className={`text-[1.55rem] leading-tight font-heading font-bold ${ENTITY_NOTES_TYPO.majorTitle}`}
          >
            {processInline(title, dirHandle, lookup, linkRegex, onNavigate, selfEntityId, inlineOptsForContext(context))}
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

      const singleQuoteText = safeString(quoteLines[0]).trim();
      if (quoteLines.length === 1 && AUTO_SYNC_FOOTER_RE.test(singleQuoteText)) {
        const jumpProps = buildJumpProps(startIndex + 1);
        blocks.push(
          <p
            key={`${baseKey}-auto-footer-${startIndex}`}
            data-auto-sync-footer="true"
            {...jumpProps}
            className={mergeClassName(
              jumpProps,
              'my-3 rounded-xl border border-slate-800/80 bg-slate-950/50 px-3 py-2 text-[11px] italic text-slate-500 font-serif'
            )}
          >
            {processInline(
              singleQuoteText,
              dirHandle,
              lookup,
              linkRegex,
              onNavigate,
              selfEntityId,
              inlineOptsForContext(context),
            )}
          </p>
        );
        continue;
      }

      const markerMatch = safeString(quoteLines[0]).trim().match(CALLOUT_MARKER_RE);
      if (markerMatch) {
        const role = String(markerMatch[1] || '').toUpperCase();
        const callout = resolveEntityNotesCallout(role) || resolveEntityNotesCallout('NOTE');
        const style = CALLOUT_STYLES[callout?.accent || 'violet'] || CALLOUT_STYLES.violet;
        const explicitTitle = safeString(markerMatch[2]).trim();
        const title = explicitTitle || callout?.title || role;
        const CalloutIcon = resolveCalloutIcon(callout, role);
        const contentLines = quoteLines.slice(1);
        const innerModel = renderBlocksFromLines(contentLines, context, {
          baseKey: `${baseKey}-callout-${startIndex}`,
          collectToc: false,
          compact: true,
          usedAnchors,
          skipHeadingCountScan: true,
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
            <div className="mb-3 flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${style.badge}`}
                aria-hidden
              >
                <CalloutIcon size={18} strokeWidth={2.25} />
              </span>
              <div className="min-w-0 flex-1">
                <span className={`mb-1 inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] ${style.badge}`}>
                  {callout?.label || role}
                </span>
                <h4 className={`font-heading text-lg font-bold leading-snug ${style.title}`}>{title}</h4>
              </div>
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
          {processInline(
            quoteLines.join(' '),
            dirHandle,
            lookup,
            linkRegex,
            onNavigate,
            selfEntityId,
            inlineOptsForContext(context),
          )}
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
            `mb-5 list-none space-y-2 border-l-2 pl-3 text-[1.08rem] leading-[1.85] ${ENTITY_NOTES_TYPO.body} ${ENTITY_NOTES_TYPO.listRail}`,
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
                <span
                  className={`mt-[0.45rem] text-sm font-semibold ${ENTITY_NOTES_TYPO.listMarker}`}
                >
                  {marker}
                </span>
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
            `mb-5 list-none space-y-2 border-l-2 pl-3 text-[1.08rem] leading-[1.85] ${ENTITY_NOTES_TYPO.body} ${ENTITY_NOTES_TYPO.listRail}`,
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
                <span
                  className={`min-w-[1.75rem] pt-0.5 text-right text-sm font-semibold ${ENTITY_NOTES_TYPO.listMarker}`}
                >
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
        {processInline(
          paragraphText,
          dirHandle,
          lookup,
          linkRegex,
          onNavigate,
          selfEntityId,
          inlineOptsForContext(context),
        )}
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
  const wikiLinkOptOuts = Array.isArray(options.wikiLinkOptOuts) ? options.wikiLinkOptOuts : [];
  return renderBlocksFromLines(
    text.split('\n'),
    {
      dirHandle,
      lookup,
      linkRegex,
      onNavigate,
      selfEntityId,
      wikiLinkOptOuts,
      activeNovelData: options.activeNovelData ?? null,
      tabsConfig: options.tabsConfig ?? options.activeNovelData?.tabsConfig ?? null,
    },
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
  wikiLinkOptOuts = null,
  previewContext = null,
) =>
  buildEntityNotesPreviewModel(text, dirHandle, entityMap, linkRegex, onNavigate, selfEntityId, {
    wikiLinkOptOuts: Array.isArray(wikiLinkOptOuts) ? wikiLinkOptOuts : [],
    activeNovelData: previewContext?.activeNovelData ?? null,
    tabsConfig: previewContext?.tabsConfig ?? previewContext?.activeNovelData?.tabsConfig ?? null,
  }).blocks;
