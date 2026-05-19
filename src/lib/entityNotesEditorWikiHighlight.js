/**
 * Highlight [[wiki link]] trong lớp nền editor ghi chép (textarea trong suốt phía trên).
 * Chỉ tô màu — không dùng font-bold (tránh lệch caret với chữ trong suốt).
 * Khớp wiki theo từng dòng để không "nuốt" cả đoạn khi thiếu ]] hoặc lồng [[.
 */
import { buildEntityNameLookup, resolveEntityLookup } from './entityWikiLookup.js';

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

function resolveWikiToneClass(inner, { selfEntityId = null, entityMap = null } = {}) {
  const lookup =
    Array.isArray(entityMap) && entityMap.length > 0 ? buildEntityNameLookup(entityMap) : null;
  if (!lookup) return 'text-amber-300';
  const resolved = resolveEntityLookup(lookup, inner, { selfEntityId: safeString(selfEntityId).trim() });
  if (!resolved?.dest?.entityId) return 'text-amber-300';
  return resolved.dest.entityId === safeString(selfEntityId).trim()
    ? 'text-emerald-300'
    : 'text-violet-300';
}

function wrapWikiSpan(full, toneClass) {
  return `<span class="${toneClass}">${escapeHtml(full)}</span>`;
}

function highlightWikiOnLine(line, options) {
  const source = safeString(line);
  let html = '';
  let cursor = 0;

  while (cursor < source.length) {
    const open = source.indexOf('[[', cursor);
    if (open === -1) {
      html += escapeHtml(source.slice(cursor));
      break;
    }

    html += escapeHtml(source.slice(cursor, open));
    const close = source.indexOf(']]', open + 2);

    if (close === -1) {
      // Không bọc span — đoạn dài trong span làm lệch caret (nhất là dòng wrap nhiều hàng).
      html += escapeHtml(source.slice(open));
      break;
    }

    const full = source.slice(open, close + 2);
    const inner = source.slice(open + 2, close);
    html += wrapWikiSpan(full, resolveWikiToneClass(inner, options));
    cursor = close + 2;
  }

  return html;
}

/**
 * HTML cho lớp highlight — chỉ bọc [[...]] trên cùng dòng, phần còn lại giữ màu chữ thường.
 */
export function buildEntityNotesEditorHighlightHtml(text, { selfEntityId = null, entityMap = null } = {}) {
  const source = safeString(text);
  if (!source) return '';

  const options = { selfEntityId, entityMap };
  const parts = source.split('\n');
  const lines = parts.map((line, index) => {
    const highlighted = highlightWikiOnLine(line, options);
    return index < parts.length - 1 ? `${highlighted}\n` : highlighted;
  });
  return lines.join('');
}
