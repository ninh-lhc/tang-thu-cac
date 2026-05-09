/**
 * Sinh src/data/bundledGenreTabsTemplates.json từ cấu trúc có sẵn (genreTabsMap).
 * Chạy sau khi sửa mergeTabsByGenres / GENRE_TABS_MAP: node scripts/genBundledGenreTabsTemplates.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeTabsByGenres } from '../src/genreTabsMap.js';
import { buildGenreTemplateKey } from '../src/lib/genreTabsTemplateStore.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../src/data');
const outPath = join(outDir, 'bundledGenreTabsTemplates.json');
mkdirSync(outDir, { recursive: true });

/** Cố định để diff git sạch; khi tái sinh file chỉ đổi khi nội dung tabs đổi. */
const UPDATED_AT = '2026-05-09T12:00:00.000Z';

function entry(genres) {
  const key = buildGenreTemplateKey(genres);
  const tabsConfig = mergeTabsByGenres(genres);
  if (!key || !tabsConfig?.length) return null;
  return [
    key,
    {
      genres: key.split('||').filter(Boolean),
      tabsConfig,
      updatedAt: UPDATED_AT,
    },
  ];
}

const pairs = [
  entry(['Tiên Hiệp']),
  entry(['Hệ Thống']),
  entry(['Tiên Hiệp', 'Hệ Thống']),
].filter(Boolean);

const obj = Object.fromEntries(pairs);
writeFileSync(outPath, `${JSON.stringify(obj, null, 2)}\n`, 'utf8');
console.log('wrote', outPath, 'keys:', Object.keys(obj).join(', '));
