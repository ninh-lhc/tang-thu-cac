// Shared presets for map/force quick-entry UI.
// Keeps realm-system inference and rank ladders aligned with
// Vương giới / Tôn giới / Đế giới rules used across the app.

import { normalizeAsciiText } from './statusHierarchyParser.js';

export const FORCE_SYSTEM_PRESETS = [
  { key: 'cuu-cap', label: 'Cửu cấp' },
  { key: 'vuong-gioi', label: 'Vương giới' },
  { key: 'ton-gioi', label: 'Tôn giới' },
  { key: 'de-gioi', label: 'Đế giới' },
];

const FORCE_RANK_PRESETS = {
  'cuu-cap': [
    'Nhất Cấp thế lực',
    'Nhị Cấp thế lực',
    'Tam Cấp thế lực',
    'Tứ Cấp thế lực',
    'Ngũ Cấp thế lực',
    'Lục Cấp thế lực',
    'Thất Cấp thế lực',
    'Bát Cấp thế lực',
    'Cửu Cấp thế lực',
  ],
  'vuong-gioi': [
    'Thiên Vương cấp thế lực',
    'Địa Vương cấp thế lực',
    'Đại Vương cấp thế lực',
    'Vương Giả cấp thế lực',
  ],
  'ton-gioi': [
    'Thiên Tôn cấp thế lực',
    'Địa Tôn cấp thế lực',
    'Đại Tôn cấp thế lực',
    'Tôn Giả cấp thế lực',
    'Thiên Vương cấp thế lực',
    'Địa Vương cấp thế lực',
    'Đại Vương cấp thế lực',
    'Vương Giả cấp thế lực',
  ],
  'de-gioi': [
    'Thiên Đế cấp thế lực',
    'Địa Đế cấp thế lực',
    'Đại Đế cấp thế lực',
    'Đế Giả cấp thế lực',
    'Thiên Tôn cấp thế lực',
    'Địa Tôn cấp thế lực',
    'Đại Tôn cấp thế lực',
    'Tôn Giả cấp thế lực',
    'Thiên Vương cấp thế lực',
    'Địa Vương cấp thế lực',
    'Đại Vương cấp thế lực',
    'Vương Giả cấp thế lực',
  ],
};

const FORCE_SYSTEM_RULES = [
  { key: 'de-gioi', patterns: [/\bde gioi\b/, /\bthien de\b/, /\bdia de\b/, /\bdai de\b/, /\bde gia\b/] },
  { key: 'ton-gioi', patterns: [/\bton gioi\b/, /\bthien ton\b/, /\bdia ton\b/, /\bdai ton\b/, /\bton gia\b/] },
  { key: 'vuong-gioi', patterns: [/\bvuong gioi\b/, /\bthien vuong\b/, /\bdia vuong\b/, /\bdai vuong\b/, /\bvuong gia\b/] },
  { key: 'cuu-cap', patterns: [/\bcuu cap\b/, /\bnhat cap\b/, /\bnhi cap\b/, /\btam cap\b/, /\btu cap\b/, /\bngu cap\b/, /\bluc cap\b/, /\bthat cap\b/, /\bbat cap\b/] },
];

export function inferForceSystemKey(value) {
  const normalized = normalizeAsciiText(value).replace(/[^a-z0-9]+/g, ' ').trim();
  if (!normalized) return '';
  const matched = FORCE_SYSTEM_RULES.find((rule) => rule.patterns.some((pattern) => pattern.test(normalized)));
  return matched?.key || '';
}

export function inferForceSystemLabel(value) {
  const key = inferForceSystemKey(value);
  return FORCE_SYSTEM_PRESETS.find((item) => item.key === key)?.label || '';
}

export function getForceRankOptionsForSystem(value) {
  const key = inferForceSystemKey(value) || String(value || '').trim();
  return Array.isArray(FORCE_RANK_PRESETS[key]) ? [...FORCE_RANK_PRESETS[key]] : [];
}
