import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MEMBER_FIELD_LABELS,
  DEFAULT_MEMBER_PANEL_TITLE,
  findEntityMemberInNovel,
  mergeEntityMemberUpdate,
  normalizeEntityMemberInput,
  normalizeMemberFieldLabels,
  resolveMemberFieldLabels,
  resolveMemberPanelTitle,
} from './entityMembers.js';

describe('entity member updates', () => {
  it('preserves detailed notes when saving basic profile fields', () => {
    const previous = {
      id: 'm1',
      name: 'Mai Huyền Sương',
      role: 'Cấp chủ',
      info: 'Nội dung ghi chép đã lưu',
      wikiLinkOptOuts: [{ anchor: 'Trường Hận Cung', before: 'thuộc ', after: '.' }],
    };
    const basicFormPayload = {
      id: 'm1',
      name: 'Mai Huyền Sương',
      role: 'điện chủ',
      info: '',
      wikiLinkOptOuts: [],
    };

    expect(mergeEntityMemberUpdate(previous, basicFormPayload, { preserveNotes: true })).toMatchObject({
      role: 'điện chủ',
      info: 'Nội dung ghi chép đã lưu',
      wikiLinkOptOuts: [{ anchor: 'Trường Hận Cung', before: 'thuộc', after: '.' }],
    });
  });

  it('allows the notes editor to replace or clear detailed notes', () => {
    const previous = { id: 'm1', info: 'Cũ', wikiLinkOptOuts: [{ anchor: 'A' }] };
    const notesPayload = { id: 'm1', info: '', wikiLinkOptOuts: [] };
    expect(mergeEntityMemberUpdate(previous, notesPayload)).toMatchObject(notesPayload);
  });
});

describe('entityMembers field labels', () => {
  it('falls back to generic defaults', () => {
    expect(normalizeMemberFieldLabels(null)).toEqual({ ...DEFAULT_MEMBER_FIELD_LABELS });
    expect(resolveMemberPanelTitle(null, null)).toBe(DEFAULT_MEMBER_PANEL_TITLE);
  });

  it('prefers entity labels over tab labels', () => {
    const entity = {
      memberFieldLabels: { name: 'Tên vật phẩm', role: 'Loại' },
      memberPanelTitle: 'Vật phẩm gắn',
    };
    const tab = {
      memberFieldLabels: { name: 'Tên nhân vật', alias: 'Bí danh' },
      memberPanelTitle: 'Nhân vật',
    };
    expect(resolveMemberFieldLabels(entity, tab)).toEqual({
      name: 'Tên vật phẩm',
      alias: DEFAULT_MEMBER_FIELD_LABELS.alias,
      role: 'Loại',
      status: DEFAULT_MEMBER_FIELD_LABELS.status,
    });
    expect(resolveMemberPanelTitle(entity, tab)).toBe('Vật phẩm gắn');
  });

  it('uses tab labels when entity has none', () => {
    const tab = { memberFieldLabels: { name: 'Tên địa điểm', status: 'Cấp' } };
    expect(resolveMemberFieldLabels({}, tab).name).toBe('Tên địa điểm');
    expect(resolveMemberFieldLabels({}, tab).status).toBe('Cấp');
    expect(resolveMemberPanelTitle({}, { memberPanelTitle: 'Địa điểm phụ' })).toBe('Địa điểm phụ');
  });

  it('persists kind on normalize', () => {
    const out = normalizeEntityMemberInput(
      { name: 'Mỏ linh thạch', kind: 'asset', role: 'Mỏ' },
      { generateId: () => 'mem1' }
    );
    expect(out.kind).toBe('asset');
  });

  it('exposes labels when resolving a member from novel data', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'lon1',
          label: 'Thế lực',
          subTabs: [{ id: 'nho1', label: 'Môn phái', memberFieldLabels: { role: 'Chức vị' } }],
        },
      ],
      data: {
        lon1: {
          nho1: {
            entities: [
              {
                id: 'e1',
                name: 'Tử Dân Cung',
                memberPanelTitle: 'Nhân vật trong thẻ',
                members: [{ id: 'm1', name: 'Bách Lý Diễm', role: 'Cung Chủ', status: '', alias: '', info: '' }],
              },
            ],
          },
        },
      },
    };
    const hit = findEntityMemberInNovel(novel, {
      lonId: 'lon1',
      nhoId: 'nho1',
      entityId: 'e1',
      memberId: 'm1',
    });
    expect(hit?.member?.name).toBe('Bách Lý Diễm');
    expect(hit?.fieldLabels?.role).toBe('Chức vị');
    expect(hit?.panelTitle).toBe('Nhân vật trong thẻ');
  });
});
