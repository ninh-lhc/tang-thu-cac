/**
 * Chuẩn bị nội dung paste vào editor ghi chép: HTML table → GFM, chuẩn hóa bảng Markdown, rồi cleanup.
 * Ai dùng: AppEntityDetailNotes, MasterComponents (milestone editor).
 */
import { cleanupEntityNotesText } from './entityNotesTextCleanup.js';
import {
  formatMarkdownTableBlock,
  replaceMarkdownTableBlocksInText,
  textContainsMarkdownTable,
} from './markdownTable.js';

function cellTextFromHtml(el) {
  if (!el) return '';
  const clone = el.cloneNode(true);
  clone.querySelectorAll('br').forEach((br) => {
    br.replaceWith(document.createTextNode(' '));
  });
  return (clone.textContent || '').replace(/\s+/g, ' ').trim();
}

function tableElementToMarkdown(table) {
  if (!table) return null;
  const matrix = [];
  for (const tr of table.querySelectorAll('tr')) {
    const cells = [...tr.querySelectorAll('th,td')].map((cell) => cellTextFromHtml(cell));
    if (cells.length > 0) matrix.push(cells);
  }
  if (matrix.length < 2) return null;

  let header = matrix[0];
  let bodyStart = 1;
  const second = matrix[1];
  if (second.every((c) => /^:?-{3,}:?$/.test(String(c).replace(/\s/g, '')))) {
    bodyStart = 2;
  }

  const rows = matrix.slice(bodyStart);
  if (rows.length === 0 && bodyStart === 1) {
    return null;
  }

  const aligns = header.map(() => 'left');
  return formatMarkdownTableBlock({ header, aligns, rows });
}

/** @returns {string | null} */
export function convertHtmlTablesToMarkdown(html) {
  const source = String(html ?? '').trim();
  if (!source || !/<table[\s>]/i.test(source)) return null;
  if (typeof DOMParser === 'undefined') return null;

  try {
    const doc = new DOMParser().parseFromString(source, 'text/html');
    const tables = [...doc.querySelectorAll('table')];
    if (tables.length === 0) return null;
    const parts = tables.map(tableElementToMarkdown).filter(Boolean);
    return parts.length > 0 ? parts.join('\n\n') : null;
  } catch {
    return null;
  }
}

/**
 * @param {{ plain?: string, html?: string }} clipboard
 * @returns {string} Text chèn vào editor (đã cleanup); rỗng nếu không có gì hợp lệ.
 */
export function prepareEntityNotesPasteText({ plain = '', html = '' } = {}) {
  let raw = String(plain ?? '').replace(/\r\n?/g, '\n');
  const htmlMarkdown = convertHtmlTablesToMarkdown(html);

  if (htmlMarkdown) {
    const plainHasTable = textContainsMarkdownTable(raw);
    if (!raw.trim()) {
      raw = htmlMarkdown;
    } else if (!plainHasTable) {
      raw = `${raw.replace(/\s+$/, '')}\n\n${htmlMarkdown}`;
    }
  }

  if (!raw.trim()) return '';

  raw = replaceMarkdownTableBlocksInText(raw);
  return cleanupEntityNotesText(raw);
}
