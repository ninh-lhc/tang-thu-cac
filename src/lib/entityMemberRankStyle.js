/**
 * Màu nổi cho chức vụ / cấp bậc thẻ con trong cây.
 * Ưu tiên nhận diện chữ «vai trò»; không khớp thì theo depth (0 = gốc).
 */

import { normalizeSearchText } from './normalizeSearchText.js';
import { normalizeMemberKind, resolveMemberKindDef } from './entityMemberKind.js';

function safeText(value) {
  if (value == null || value === 'null' || value === 'undefined') return '';
  return String(value).trim();
}

/** Chip wiki giống preview ghi chép thẻ cha (liên kết khác thẻ = tím). */
export const MEMBER_WIKI_CHIP_CLASS =
  'transition-colors cursor-pointer inline-flex max-w-full items-center gap-1 px-1.5 py-0.5 rounded-md bg-violet-800/45 hover:bg-violet-700/60 border-2 border-violet-400/70 shadow-[inset_0_0_0_1px_rgba(167,139,250,0.15)]';

/** Typo chung wiki name + nhãn vai trò/trạng thái trên cây thẻ con. */
export const MEMBER_TREE_LABEL_TEXT_CLASS =
  'truncate font-serif text-[13px] font-bold leading-tight tracking-normal normal-case';

export const MEMBER_WIKI_TEXT_CLASS = `${MEMBER_TREE_LABEL_TEXT_CLASS} text-violet-300`;
export const MEMBER_WIKI_ICON_CLASS = 'shrink-0 text-violet-400';

/** Chip nhãn vai trò / trạng thái — cùng font với wiki link, không ép uppercase. */
export const MEMBER_ROLE_CHIP_BASE_CLASS =
  `inline-flex max-w-[42%] shrink-0 items-center truncate rounded-md border px-1.5 py-0.5 ${MEMBER_TREE_LABEL_TEXT_CLASS}`;

/**
 * @typedef {{ id: string, label: string, chip: string, text: string, keywords: string[] }} MemberRankStyle
 */

/** @type {MemberRankStyle[]} */
export const MEMBER_RANK_STYLES = [
  {
    id: 'leader',
    label: 'Cấp chủ',
    chip: 'border-amber-400/70 bg-amber-950/45 text-amber-200',
    text: 'text-amber-200',
    keywords: [
      'tong chu',
      'cung chu',
      'mon chu',
      'chuong mon',
      'chuong giao',
      'lanh dao',
      'dai chu',
      'chu toa',
      'gia chu',
      'toc truong',
      'chu so',
      'chu tri',
    ],
  },
  {
    id: 'elder',
    label: 'Trưởng / lão',
    chip: 'border-sky-400/70 bg-sky-950/45 text-sky-200',
    text: 'text-sky-200',
    keywords: [
      'truong lao',
      'dai truong lao',
      'duong chu',
      'truong duong',
      'truong ban',
      'truong phong',
      'truong to',
      'truong mon',
      'su phu',
      'su ba',
      'su thuc',
    ],
  },
  {
    id: 'guard',
    label: 'Hộ pháp / chấp sự',
    chip: 'border-indigo-400/65 bg-indigo-950/40 text-indigo-200',
    text: 'text-indigo-200',
    keywords: [
      'ho phap',
      'chap su',
      'quan su',
      'giam sat',
      'kiem soat',
      'uy vien',
    ],
  },
  {
    id: 'disciple',
    label: 'Đệ tử',
    chip: 'border-emerald-400/70 bg-emerald-950/45 text-emerald-200',
    text: 'text-emerald-200',
    keywords: [
      'de tu',
      'noi mon',
      'ngoai mon',
      'do de',
      'hoc do',
      'thanh vien',
      'mon nhan',
      'mon do',
    ],
  },
];

/** Fallback theo độ sâu cây khi không khớp vai trò. */
export const MEMBER_RANK_BY_DEPTH = [
  MEMBER_RANK_STYLES[0], // gốc → vàng kim
  MEMBER_RANK_STYLES[1], // cấp 2 → lam
  MEMBER_RANK_STYLES[3], // cấp 3 → xanh lá
  MEMBER_RANK_STYLES[2], // sâu hơn → indigo
];

function matchRankByRole(roleText) {
  const key = normalizeSearchText(roleText);
  if (!key) return null;
  let best = null;
  let bestLen = -1;
  for (const style of MEMBER_RANK_STYLES) {
    for (const kw of style.keywords) {
      if (!kw || !key.includes(kw)) continue;
      if (kw.length > bestLen) {
        best = style;
        bestLen = kw.length;
      }
    }
  }
  return best;
}

/** Màu chip vai trò theo loại thẻ con (khi không khớp keyword nhân vật). */
function rankStyleFromKind(kind) {
  const kindKey = normalizeMemberKind(kind);
  if (kindKey === 'person') return null;
  const def = resolveMemberKindDef(kindKey);
  return {
    id: def.id,
    label: def.shortLabel,
    chip: def.chip,
    text: def.text,
    keywords: [],
  };
}

/**
 * @param {{ role?: string, status?: string, depth?: number, kind?: string }} input
 * @returns {MemberRankStyle}
 */
export function resolveMemberRankStyle({ role, status, depth = 0, kind } = {}) {
  const combined = [role, status].map(safeText).filter(Boolean).join(' ');
  const fromText = matchRankByRole(combined);
  if (fromText) return fromText;

  const fromKind = rankStyleFromKind(kind);
  if (fromKind) return fromKind;

  const idx = Math.min(Math.max(Number(depth) || 0, 0), MEMBER_RANK_BY_DEPTH.length - 1);
  return MEMBER_RANK_BY_DEPTH[idx];
}

export function formatMemberRoleLine(member) {
  return [member?.role, member?.status].map(safeText).filter(Boolean).join(' · ');
}
