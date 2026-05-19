/**
 * Highlight [[wiki link]] trong lớp nền editor ghi chép (textarea trong suốt phía trên).
 */
import { buildEntityNameLookup, resolveEntityLookup } from './entityWikiLookup.js';

const WIKI_LINK_RE = /\[\[([\s\S]*?)\]\]/g;

function safeString(value) {
  if (value == null || value === 'null' || value === 'undefined') return '';
  return String(value);
}

function escapeHtml(text) {
  return safeString(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * HTML cho lớp highlight — chỉ bọc [[...]], phần còn lại giữ màu chữ thường.
 */
export function buildEntityNotesEditorHighlightHtml(text, { selfEntityId = null, entityMap = null } = {}) {
  const source = safeString(text);
  const lookup =
    Array.isArray(entityMap) && entityMap.length > 0 ? buildEntityNameLookup(entityMap) : null;
  const selfId = safeString(selfEntityId).trim();
  let html = '';
  let lastIndex = 0;
  WIKI_LINK_RE.lastIndex = 0;
  let match = WIKI_LINK_RE.exec(source);
  while (match) {
    html += escapeHtml(source.slice(lastIndex, match.index));
    const full = match[0];
    const inner = match[1];
    let toneClass = 'text-amber-300 font-bold';
    if (lookup) {
      const resolved = resolveEntityLookup(lookup, inner, { selfEntityId: selfId });
      if (resolved?.dest?.entityId) {
        toneClass =
          resolved.dest.entityId === selfId
            ? 'text-emerald-300 font-bold'
            : 'text-violet-300 font-bold';
      }
    }
    html += `<span class="${toneClass}">${escapeHtml(full)}</span>`;
    lastIndex = match.index + full.length;
    match = WIKI_LINK_RE.exec(source);
  }
  html += escapeHtml(source.slice(lastIndex));
  return html;
}

