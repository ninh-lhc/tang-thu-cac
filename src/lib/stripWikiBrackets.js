/**
 * Gỡ cú pháp [[wiki]] — dùng cho luồng "ghi nhanh" không lưu link trong text.
 *
 * Ai dùng: App.jsx, appNhatKyVaGoiThe.js. Test: stripWikiBrackets.test.js
 */
export function stripWikiBracketSyntax(s) {
  if (s == null || typeof s !== 'string') return s;
  let out = s;
  let prev;
  do {
    prev = out;
    out = out.replace(/\[\[([^\]]+)\]\]/g, '$1');
  } while (out !== prev);
  return out;
}
