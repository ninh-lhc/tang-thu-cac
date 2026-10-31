/**
 * Icon lucide theo member.kind — dùng chung panel thẻ con và modal quick-view.
 * Chỉ export component để react-refresh không kêu file trộn hàm.
 */

import { Building2, Folder, Gem, Tag, UserRound } from 'lucide-react';
import { normalizeMemberKind } from './entityMemberKind.js';

export function MemberKindIcon({ kind, size = 10, className }) {
  const key = normalizeMemberKind(kind);
  if (key === 'asset') return <Gem size={size} className={className} />;
  if (key === 'org') return <Building2 size={size} className={className} />;
  if (key === 'folder') return <Folder size={size} className={className} />;
  if (key === 'other') return <Tag size={size} className={className} />;
  return <UserRound size={size} className={className} />;
}
