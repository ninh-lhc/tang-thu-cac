/**
 * Che occurrence đã Ctrl+G gỡ trước khi preview cắt dòng và cắt [[link]] kế bên.
 * Ai dùng: renderEntityNotesMarkdown (bọc), MasterUtils.processInline (mở lại thành chữ thường).
 * Token nằm trong Private Use — matcher wiki không đọc được tên bên trong.
 */
import { listWikiLinkOptOutRanges } from './wikiLinkOptOut.js';

const SHIELD_START = '\uE141';
const SHIELD_END = '\uE142';
const SHIELD_RE = /\uE141[0-9a-f]+(?:\.[0-9a-f]+)*\uE142/g;

function encodePlain(plain) {
  const hex = [...String(plain)].map((char) => char.codePointAt(0).toString(16)).join('.');
  return `${SHIELD_START}${hex}${SHIELD_END}`;
}

function decodeToken(token) {
  const hex = token.slice(1, -1);
  const codes = hex.split('.').map((part) => Number.parseInt(part, 16));
  if (codes.some((code) => !Number.isFinite(code))) return token;
  return String.fromCodePoint(...codes);
}

/** Thay đúng các span opt-out bằng token. Text không có opt-out được trả về nguyên bản. */
export function shieldPlainWikiOptOutSpans(text, optOuts = []) {
  const source = String(text ?? '');
  const ranges = listWikiLinkOptOutRanges(source, optOuts);
  if (ranges.length === 0) return source;
  let out = source;
  for (let index = ranges.length - 1; index >= 0; index -= 1) {
    const { start, end } = ranges[index];
    if (start < 0 || end > out.length || end <= start) continue;
    out = out.slice(0, start) + encodePlain(out.slice(start, end)) + out.slice(end);
  }
  return out;
}

/** Tách token đã che. null nếu không có token hợp lệ. */
export function splitWikiOptOutShieldPieces(text) {
  const source = String(text ?? '');
  if (!source.includes(SHIELD_START)) return null;
  const pieces = [];
  let last = 0;
  let match;
  SHIELD_RE.lastIndex = 0;
  while ((match = SHIELD_RE.exec(source)) !== null) {
    if (match.index > last) pieces.push({ shield: false, text: source.slice(last, match.index) });
    pieces.push({ shield: true, text: decodeToken(match[0]) });
    last = match.index + match[0].length;
  }
  if (pieces.length === 0) return null;
  if (last < source.length) pieces.push({ shield: false, text: source.slice(last) });
  return pieces;
}
