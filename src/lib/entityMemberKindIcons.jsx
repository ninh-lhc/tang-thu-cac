/**
 * Icon lucide theo member.kind — dùng chung panel thẻ con và modal quick-view.
 */

import { Building2, Folder, Gem, Tag, UserRound } from 'lucide-react';
import { normalizeMemberKind } from './entityMemberKind.js';

export const MEMBER_KIND_ICON_MAP = Object.freeze({
  person: UserRound,
  asset: Gem,
  org: Building2,
  folder: Folder,
  other: Tag,
});

export function getMemberKindIcon(kind) {
  return MEMBER_KIND_ICON_MAP[normalizeMemberKind(kind)] || Tag;
}
