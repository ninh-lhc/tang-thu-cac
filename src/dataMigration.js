/**
 * Migration dữ liệu — đảm bảo dữ liệu cũ vẫn dùng được khi cập nhật tính năng.
 *
 * Ai dùng: App.jsx (load tangthu_index, loadNovelData, handleImportBackup).
 * migrateNovel: đồng bộ thẻ Danh sách (AUTO) toàn truyện khi nạp dữ liệu.
 * Sau khi sửa: chạy `npm run test` (dataMigration.test.js).
 */

import { cleanupAutoRelationLegacyInfoForNovel } from './lib/autoRelationDetailNote.js';
import { syncAllCollectionListCards } from './lib/collectionListCardSync.js';

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

function normalizeKey(s) {
  return String(s || '').trim().toLowerCase();
}

function parseMilestoneBodyText(eventText) {
  const raw = String(eventText || '').trimStart();
  if (!raw) return '';
  const withoutBracket = raw.replace(/^\[(\?\?|!!|!|\?|\.\.\.|x)\]\s*/i, '');
  if (withoutBracket !== raw) return withoutBracket;
  const withoutPlain = raw.replace(/^(\?\?|!!|!|\?|\.\.\.|x)\s+/i, '');
  return withoutPlain;
}

function extractAutoOwnerWikiFromMilestone(ms) {
  const wikiFromMeta = String(ms?.meta?.itemWiki || '').trim();
  if (/^\[\[[^\]]+\]\]$/.test(wikiFromMeta)) return wikiFromMeta;
  const body = parseMilestoneBodyText(ms?.event);
  const parts = body.split(' · ').map((x) => x.trim()).filter(Boolean);
  for (const p of parts) {
    const m = p.match(/^Nhận được\s+(\[\[[^\]]+\]\])$/i);
    if (m) return m[1];
  }
  return '';
}

function isAutoOwnerMilestone(ms) {
  if (!isObj(ms)) return false;
  if (ms.meta?.source === 'auto-owner') return true;
  return typeof ms.id === 'string' && ms.id.startsWith('ms-auto-');
}

function backfillAutoOwnerItemEntityIdForNovel(nov) {
  if (!isObj(nov?.data)) return;
  const nameToIds = new Map();
  for (const lonData of Object.values(nov.data || {})) {
    if (!isObj(lonData)) continue;
    for (const tabData of Object.values(lonData)) {
      const entities = Array.isArray(tabData?.entities) ? tabData.entities : [];
      for (const ent of entities) {
        const id = String(ent?.id || '').trim();
        const name = String(ent?.name || '').trim();
        if (!id || !name) continue;
        const k = normalizeKey(name);
        const arr = nameToIds.get(k) || [];
        arr.push(id);
        nameToIds.set(k, arr);
      }
    }
  }

  for (const lonData of Object.values(nov.data || {})) {
    if (!isObj(lonData)) continue;
    for (const tabData of Object.values(lonData)) {
      const entities = Array.isArray(tabData?.entities) ? tabData.entities : [];
      for (const ent of entities) {
        if (!Array.isArray(ent?.milestones)) continue;
        ent.milestones = ent.milestones.map((ms) => {
          if (!isAutoOwnerMilestone(ms)) return ms;
          const hasId = String(ms?.meta?.itemEntityId || '').trim();
          if (hasId) return ms;
          const wiki = extractAutoOwnerWikiFromMilestone(ms);
          const label = String(wiki || '').replace(/^\[\[|\]\]$/g, '').trim();
          if (!label) return ms;
          const candidates = nameToIds.get(normalizeKey(label)) || [];
          if (candidates.length !== 1) return ms;
          return {
            ...ms,
            meta: {
              ...(isObj(ms.meta) ? ms.meta : {}),
              source: 'auto-owner',
              itemWiki: wiki || ms.meta?.itemWiki,
              itemEntityId: candidates[0],
            },
          };
        });
      }
    }
  }
}

/**
 * Schema metadata một truyện (tangthu_index > metadata[]):
 *
 * id            : string  — UUID duy nhất
 * title         : string  — Tên truyện
 * author        : string  — Tác giả
 * genres        : string[] — Thể loại (array kể từ v2, cũ có thể là string "genre")
 * theme         : string  — Mã theme màu (vd. 'theme-tien-hiep')
 * status        : string  — Trạng thái đọc ('Đang đọc' | 'Đã đọc' | 'Tạm dừng' | …)
 * rating        : number  — Sao 0–5 (bước 0.5); 0 = chưa đánh giá
 * tags          : string[] — Nhãn cá nhân
 * chaptersRead  : number  — Chương đã đọc (>= 0)
 * chaptersTotal : string  — Tổng chương; '???' = chưa biết
 * cover         : string  — URL ảnh bìa hoặc 'local_image:<tên file>'
 * review        : string  — Giới thiệu / tóm tắt truyện (plain text hoặc markdown)
 *                           → KHÔNG phải ý kiến đánh giá cá nhân
 * ratingOpinion : string  — Ý kiến / bình luận kèm đánh giá sao (plain text)
 *                           → Phân biệt với `review`; không AI sinh
 * folderName    : string  — Thư mục lưu dữ liệu truyện
 *
 * Trường chỉ có trong novel file (tangthu_novel_*), không ở metadata:
 *   readingAnchorChapter, data (entities/milestones), tabsConfig,
 *   chapterCrossRefs, readingJournal
 *
 * Lưu ổ đĩa (thư mục truyện): có thể dùng storageLayout 'sharded' — file .json gốc là manifest
 * (data rỗng), nội dung tab nằm trong data/<lonId>/<nhoId>.json. Khi load vào memory, data được
 * ghép lại; trường storageLayout không giữ trong object sau migrateNovel.
 */
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
    ratingOpinion: m.ratingOpinion ?? '',
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
  const images = Array.isArray(e.images)
    ? e.images.map((x) => String(x || '').trim()).filter(Boolean)
    : [];
  return {
    ...e,
    id: e.id ?? '',
    name: e.name ?? '',
    avatar: e.avatar ?? '',
    rawText: e.rawText ?? '',
    dynamicData: isObj(e.dynamicData) ? e.dynamicData : {},
    info: e.info ?? '',
    milestones: Array.isArray(e.milestones) ? e.milestones.filter(isObj) : [],
    images,
  };
}

/** Chuẩn hóa tabData (overview + entities). */
function sanitizeTabData(td) {
  if (!td) return { overview: '', entities: [] };
  if (typeof td === 'string') return { overview: td, entities: [] };
  if (!isObj(td)) return { overview: '', entities: [] };
  const entities = Array.isArray(td.entities) ? td.entities.map(sanitizeEntity).filter(Boolean) : [];
  return {
    ...td,
    overview: td.overview ?? '',
    entities,
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
  nov.review = nov.review ?? '';
  nov.ratingOpinion = nov.ratingOpinion ?? '';
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

  backfillAutoOwnerItemEntityIdForNovel(nov);
  cleanupAutoRelationLegacyInfoForNovel(nov);
  syncAllCollectionListCards(nov);

  delete nov.storageLayout;

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
