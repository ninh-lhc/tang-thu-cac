/**
 * Loại thẻ con (member.kind): nhân vật, tài sản, thế lực phụ thuộc, nhóm…
 * Dùng bởi entityMembers normalize, panel thẻ con, modal quick-view.
 * Thiếu kind → mặc định «person» (tương thích dữ liệu cũ).
 */

import { readMemberParentId } from './entityMemberTree.js';

function safeText(value) {
  if (value == null || value === 'null' || value === 'undefined') return '';
  return String(value).trim();
}

/** @typedef {{ id: string, label: string, shortLabel: string, chip: string, text: string, roleHint: string, statusHint: string }} MemberKindDef */

/** @type {MemberKindDef[]} */
export const MEMBER_KINDS = Object.freeze([
  {
    id: 'person',
    label: 'Nhân vật',
    shortLabel: 'NV',
    chip: 'border-emerald-400/65 bg-emerald-950/40 text-emerald-200',
    text: 'text-emerald-200',
    roleHint: 'VD: Tông chủ, Trưởng lão, Đệ tử…',
    statusHint: 'VD: Cảnh giới, trạng thái…',
  },
  {
    id: 'asset',
    label: 'Tài sản / tài nguyên',
    shortLabel: 'TS',
    chip: 'border-amber-400/65 bg-amber-950/40 text-amber-200',
    text: 'text-amber-200',
    roleHint: 'VD: Mỏ linh thạch, Mạch khoáng, Kiếm cổ…',
    statusHint: 'VD: Phẩm cấp, đang khai thác…',
  },
  {
    id: 'org',
    label: 'Thế lực phụ thuộc',
    shortLabel: 'TL',
    chip: 'border-sky-400/65 bg-sky-950/40 text-sky-200',
    text: 'text-sky-200',
    roleHint: 'VD: Phân đàn, Chi nhánh, Liên minh phụ…',
    statusHint: 'VD: Quy mô, trạng thái…',
  },
  {
    id: 'folder',
    label: 'Nhóm / thư mục',
    shortLabel: 'NM',
    chip: 'border-slate-500/55 bg-slate-900/70 text-slate-300',
    text: 'text-slate-300',
    roleHint: 'VD: Nhân sự, Tài sản, Ngoại môn…',
    statusHint: 'Gom nhánh con — có thể để trống',
  },
  {
    id: 'other',
    label: 'Khác',
    shortLabel: 'KH',
    chip: 'border-violet-400/55 bg-violet-950/35 text-violet-200',
    text: 'text-violet-200',
    roleHint: 'VD: loại tùy ý…',
    statusHint: 'VD: trạng thái tùy ý…',
  },
]);

export const DEFAULT_MEMBER_KIND = 'person';
export const MEMBER_KIND_FILTER_ALL = 'all';

const KIND_BY_ID = new Map(MEMBER_KINDS.map((item) => [item.id, item]));

export function normalizeMemberKind(value) {
  const key = safeText(value).toLowerCase();
  if (KIND_BY_ID.has(key)) return key;
  return DEFAULT_MEMBER_KIND;
}

/** @returns {MemberKindDef} */
export function resolveMemberKindDef(kind) {
  return KIND_BY_ID.get(normalizeMemberKind(kind)) || KIND_BY_ID.get(DEFAULT_MEMBER_KIND);
}

export function readMemberKind(member) {
  return normalizeMemberKind(member?.kind);
}

/** Đếm theo kind — dùng badge lọc panel. */
export function countMembersByKind(members) {
  const counts = Object.fromEntries(MEMBER_KINDS.map((k) => [k.id, 0]));
  (Array.isArray(members) ? members : []).forEach((member) => {
    const kind = readMemberKind(member);
    counts[kind] = (counts[kind] || 0) + 1;
  });
  return counts;
}

/**
 * Lọc danh sách thẻ con theo kind; giữ chuỗi tổ tiên để cây vẫn nối được.
 * @returns {object[]|null} null = không lọc (hiện tất cả)
 */
export function filterMembersByKind(members, kindFilter) {
  const filter = safeText(kindFilter).toLowerCase();
  if (!filter || filter === MEMBER_KIND_FILTER_ALL) return null;

  const list = (Array.isArray(members) ? members : []).filter((m) => safeText(m?.id));
  if (list.length === 0) return [];

  const byId = new Map(list.map((m) => [safeText(m.id), m]));
  const matching = new Set();
  list.forEach((member) => {
    if (readMemberKind(member) === filter) matching.add(safeText(member.id));
  });

  if (matching.size === 0) return [];

  const visible = new Set(matching);
  matching.forEach((id) => {
    let cursor = readMemberParentId(byId.get(id));
    while (cursor && byId.has(cursor)) {
      visible.add(cursor);
      cursor = readMemberParentId(byId.get(cursor));
    }
  });

  return list.filter((member) => visible.has(safeText(member.id)));
}
