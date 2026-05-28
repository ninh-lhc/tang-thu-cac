/**
 * Font + cỡ chữ khung "Ghi chép chi tiết" (textarea) — lưu localStorage, đồng bộ Cài đặt ↔ thanh công cụ.
 * Ai dùng: AppEntityDetailNotes, MasterComponents ModalSettings, MarkdownToolbar.
 */

const FONT_KEY = 'tangthu_entity_notes_font_v1';
const SIZE_KEY = 'tangthu_entity_notes_size_px_v1';
const AUTO_CLEAN_ON_SAVE_KEY = 'tangthu_entity_notes_auto_clean_on_save_v1';
const AUTO_WRAP_WIKI_ON_SAVE_KEY = 'tangthu_entity_notes_auto_wrap_wiki_on_save_v1';
const AUTO_ANALYSIS_ON_SAVE_KEY = 'tangthu_entity_notes_auto_analysis_on_save_v1';

export const ENTITY_NOTES_FONT_OPTIONS = [
  { id: 'times', label: 'Times New Roman', stack: '"Times New Roman", Times, ui-serif, serif' },
  { id: 'verdana', label: 'Verdana', stack: 'Verdana, Geneva, sans-serif' },
  { id: 'georgia', label: 'Georgia', stack: 'Georgia, "Times New Roman", Times, serif' },
  { id: 'sans', label: 'Sans (hệ thống)', stack: 'ui-sans-serif, system-ui, sans-serif' },
  { id: 'mono', label: 'Monospace', stack: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
];

const DEFAULT_FONT = 'times';
const DEFAULT_SIZE = 16;

const validFontIds = new Set(ENTITY_NOTES_FONT_OPTIONS.map((o) => o.id));

export function clampEntityNotesSizePx(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return DEFAULT_SIZE;
  return Math.min(30, Math.max(8, Math.round(x)));
}

let listeners = new Set();

/** Mặc định cố định — dùng khi đọc localStorage lỗi; cùng reference khi không đổi prefs. */
const DEFAULT_PREFS = Object.freeze({
  fontKey: DEFAULT_FONT,
  sizePx: DEFAULT_SIZE,
  autoCleanOnSave: true,
  autoWrapWikiOnSave: false,
  autoAnalysisOnSave: false,
});

let cachedPrefs = DEFAULT_PREFS;

function readPrefsFromStorage() {
  let fontKey = localStorage.getItem(FONT_KEY);
  if (!validFontIds.has(fontKey)) fontKey = DEFAULT_FONT;
  const sizePx = clampEntityNotesSizePx(parseInt(localStorage.getItem(SIZE_KEY), 10));
  const rawAutoClean = localStorage.getItem(AUTO_CLEAN_ON_SAVE_KEY);
  const autoCleanOnSave = rawAutoClean == null ? true : rawAutoClean !== '0';
  const rawAutoWrapWiki = localStorage.getItem(AUTO_WRAP_WIKI_ON_SAVE_KEY);
  const autoWrapWikiOnSave = rawAutoWrapWiki === '1';
  const rawAutoAnalysis = localStorage.getItem(AUTO_ANALYSIS_ON_SAVE_KEY);
  const autoAnalysisOnSave = rawAutoAnalysis === '1';
  return { fontKey, sizePx, autoCleanOnSave, autoWrapWikiOnSave, autoAnalysisOnSave };
}

/**
 * Snapshot cho useSyncExternalStore: phải trả về **cùng reference** khi giá trị không đổi
 * (React so sánh bằng Object.is; object mới mỗi lần → lặp re-render vô hạn → trang trắng).
 */
export function getEntityNotesPrefs() {
  let next;
  try {
    next = readPrefsFromStorage();
  } catch {
    return DEFAULT_PREFS;
  }
  if (
    cachedPrefs.fontKey === next.fontKey &&
    cachedPrefs.sizePx === next.sizePx &&
    cachedPrefs.autoCleanOnSave === next.autoCleanOnSave &&
    cachedPrefs.autoWrapWikiOnSave === next.autoWrapWikiOnSave &&
    cachedPrefs.autoAnalysisOnSave === next.autoAnalysisOnSave
  ) {
    return cachedPrefs;
  }
  cachedPrefs = Object.freeze(next);
  return cachedPrefs;
}

export function setEntityNotesPrefs(partial) {
  try {
    if (partial.fontKey != null && validFontIds.has(partial.fontKey)) {
      localStorage.setItem(FONT_KEY, partial.fontKey);
    }
    if (partial.sizePx != null) {
      localStorage.setItem(SIZE_KEY, String(clampEntityNotesSizePx(partial.sizePx)));
    }
    if (partial.autoCleanOnSave != null) {
      localStorage.setItem(AUTO_CLEAN_ON_SAVE_KEY, partial.autoCleanOnSave ? '1' : '0');
    }
    if (partial.autoWrapWikiOnSave != null) {
      localStorage.setItem(AUTO_WRAP_WIKI_ON_SAVE_KEY, partial.autoWrapWikiOnSave ? '1' : '0');
    }
    if (partial.autoAnalysisOnSave != null) {
      localStorage.setItem(AUTO_ANALYSIS_ON_SAVE_KEY, partial.autoAnalysisOnSave ? '1' : '0');
    }
  } catch {
    /* bỏ qua — vẫn báo subscriber để UI đồng bộ cache */
  }
  listeners.forEach((fn) => fn());
}

export function subscribeEntityNotesPrefs(onStoreChange) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getEntityNotesFontStack(fontKey) {
  const o = ENTITY_NOTES_FONT_OPTIONS.find((x) => x.id === fontKey);
  return o?.stack ?? ENTITY_NOTES_FONT_OPTIONS[0].stack;
}

/** Các bước cỡ chữ 8…30 (giống danh sách cỡ trong Word). */
export const ENTITY_NOTES_FONT_SIZE_OPTIONS = Array.from({ length: 30 - 8 + 1 }, (_, i) => 8 + i);
