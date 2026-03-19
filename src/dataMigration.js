/**
 * Migration dữ liệu — đảm bảo dữ liệu cũ vẫn dùng được khi cập nhật tính năng.
 *
 * Ai dùng: App.jsx (load tangthu_index, loadNovelData, handleImportBackup).
 * Sau khi sửa: chạy `npm run test` (dataMigration.test.js).
 */

export const INDEX_DATA_VERSION = 1;
export const NOVEL_DATA_VERSION = 1;

function isObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function clone(v) {
  try {
    return typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v));
  } catch {
    return v;
  }
}

/** Chuẩn hóa metadata mục truyện (thiếu field → default). */
function sanitizeMetadataItem(m) {
  if (!isObj(m)) return null;
  return {
    id: m.id ?? '',
    title: m.title ?? '',
    author: m.author ?? '',
    genres: Array.isArray(m.genres) ? m.genres : (m.genre ? [m.genre] : []),
    theme: m.theme ?? 'theme-tien-hiep',
    status: m.status ?? 'Đang đọc',
    rating: m.rating ?? 0,
    tags: Array.isArray(m.tags) ? m.tags : [],
    chaptersRead: Number(m.chaptersRead) || 0,
    chaptersTotal: m.chaptersTotal ?? '???',
    cover: m.cover ?? '',
    review: m.review ?? '',
    folderName: m.folderName ?? m.title?.replace(/[\\/:*?"<>|]/g, '').trim() ?? m.id,
    ...m,
  };
}

/** Migrate index (tangthu_index): metadata, config, novelStats. */
export function migrateIndex(raw) {
  const d = isObj(raw) ? clone(raw) : {};

  d.metadata = Array.isArray(d.metadata)
    ? d.metadata.map(sanitizeMetadataItem).filter(Boolean)
    : [];
  d.config = Array.isArray(d.config) ? d.config : [];
  d.novelStats = isObj(d.novelStats) ? d.novelStats : {};
  d.dataVersion = INDEX_DATA_VERSION;

  return d;
}

/** Chuẩn hóa tabConfig con (subTabs, fieldsTemplate). */
function sanitizeTabConfig(t) {
  if (!isObj(t)) return null;
  const subTabs = Array.isArray(t.subTabs) ? t.subTabs.map(sanitizeSubTab).filter(Boolean) : [];
  return {
    id: t.id ?? '',
    label: t.label ?? t.id,
    iconName: t.iconName ?? 'BookOpen',
    viewType: t.viewType ?? 'plain',
    isFixed: Boolean(t.isFixed),
    subTabs,
    tabCon: Array.isArray(t.tabCon) ? t.tabCon.filter(isObj) : [],
    ...t,
  };
}

function sanitizeSubTab(s) {
  if (!isObj(s)) return null;
  return {
    id: s.id ?? '',
    label: s.label ?? s.id,
    viewType: s.viewType ?? 'plain',
    fieldsTemplate: Array.isArray(s.fieldsTemplate) ? s.fieldsTemplate : [],
    tabCon: Array.isArray(s.tabCon) ? s.tabCon.filter(isObj) : [],
    ...s,
  };
}

/** Chuẩn hóa entity trong collection-track. */
function sanitizeEntity(e) {
  if (!isObj(e)) return null;
  return {
    id: e.id ?? '',
    name: e.name ?? '',
    avatar: e.avatar ?? '',
    rawText: e.rawText ?? '',
    dynamicData: isObj(e.dynamicData) ? e.dynamicData : {},
    info: e.info ?? '',
    milestones: Array.isArray(e.milestones) ? e.milestones.filter(isObj) : [],
    ...e,
  };
}

/** Chuẩn hóa tabData (overview + entities). */
function sanitizeTabData(td) {
  if (!td) return { overview: '', entities: [] };
  if (typeof td === 'string') return { overview: td, entities: [] };
  if (!isObj(td)) return { overview: '', entities: [] };
  const entities = Array.isArray(td.entities) ? td.entities.map(sanitizeEntity).filter(Boolean) : [];
  return {
    overview: td.overview ?? '',
    entities,
    ...td,
  };
}

/** Migrate novel (tangthu_novel_*): data, tabsConfig, readingJournal. */
export function migrateNovel(raw) {
  const nov = isObj(raw) ? clone(raw) : {};

  nov.id = nov.id ?? '';
  nov.title = nov.title ?? '';
  nov.author = nov.author ?? '';
  nov.status = nov.status ?? 'Đang đọc';
  nov.chaptersRead = Number(nov.chaptersRead) || 0;
  nov.chaptersTotal = nov.chaptersTotal ?? '???';
  nov.readingAnchorChapter = Number(nov.readingAnchorChapter) || 0;
  nov.tabsConfig = Array.isArray(nov.tabsConfig) ? nov.tabsConfig.map(sanitizeTabConfig).filter(Boolean) : [];
  nov.data = isObj(nov.data) ? nov.data : {};
  nov.chapterCrossRefs = Array.isArray(nov.chapterCrossRefs) ? nov.chapterCrossRefs : [];
  nov.readingJournal = Array.isArray(nov.readingJournal) ? nov.readingJournal : [];

  for (const lonId of Object.keys(nov.data)) {
    if (!isObj(nov.data[lonId])) continue;
    for (const nhoId of Object.keys(nov.data[lonId])) {
      nov.data[lonId][nhoId] = sanitizeTabData(nov.data[lonId][nhoId]);
    }
  }

  nov.dataVersion = NOVEL_DATA_VERSION;
  return nov;
}

/** Migrate backup (full export): metadata, config, novelStats, novels. */
export function migrateBackup(raw) {
  const d = isObj(raw) ? clone(raw) : {};
  const index = migrateIndex({
    metadata: d.metadata,
    config: d.config,
    novelStats: d.novelStats,
  });
  const novels = isObj(d.novels) ? d.novels : {};
  const migratedNovels = {};
  for (const [id, nov] of Object.entries(novels)) {
    if (isObj(nov)) migratedNovels[id] = migrateNovel(nov);
  }
  return {
    backupVersion: d.backupVersion ?? 2,
    indexOnly: Boolean(d.indexOnly),
    exportedAt: d.exportedAt,
    metadata: index.metadata,
    config: index.config,
    novelStats: index.novelStats,
    novels: migratedNovels,
  };
}
