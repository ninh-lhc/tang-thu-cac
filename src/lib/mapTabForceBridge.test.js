import { describe, expect, it } from 'vitest';
import {
  collectMapSubTabsForForceUi,
  getMapSubTabForceRankSuggestions,
  listMapTabEntityNames,
  matchMapSubTabByRealmInput,
} from './mapTabForceBridge.js';

describe('isBanDoLonBranch (via collect)', () => {
  it('does not treat dia-danh under Thế lực as Bản đồ cards', () => {
    const nov = {
      tabsConfig: [
        {
          id: 'the-luc',
          label: 'Thế lực',
          subTabs: [{ id: 'dia-danh', label: 'Đế Quốc', viewType: 'collection-track' }],
        },
        {
          id: 'ban-do',
          label: 'Bản đồ',
          subTabs: [{ id: 'ha-gioi', label: 'Hạ Giới Tinh Cầu', viewType: 'collection-track' }],
        },
      ],
      data: {},
    };
    expect(collectMapSubTabsForForceUi(nov).map((t) => t.label)).toEqual(['Hạ Giới Tinh Cầu']);
  });
});

describe('mapTabForceBridge', () => {
  const nov = {
    tabsConfig: [
      {
        id: 'ban-do',
        label: 'Bản đồ',
        subTabs: [
          {
            id: 'ha-gioi',
            label: 'Hạ Giới Tinh Cầu / Tiểu Thế Giới',
            viewType: 'collection-track',
            mapEntrySuggestions: { forceRanks: ['A cấp', 'B cấp'] },
          },
        ],
      },
    ],
    data: {
      'ban-do': {
        'ha-gioi': {
          entities: [
            { name: 'Danh sách A' },
            { name: 'Tây Châu' },
            { name: 'Đông Hải' },
          ],
        },
      },
    },
  };

  it('collectMapSubTabsForForceUi lists map collection sub-tab labels', () => {
    const tabs = collectMapSubTabsForForceUi(nov);
    expect(tabs.map((t) => t.label)).toContain('Hạ Giới Tinh Cầu / Tiểu Thế Giới');
    expect(tabs.find((t) => t.nhoId === 'ha-gioi')).toMatchObject({
      lonId: 'ban-do',
      nhoId: 'ha-gioi',
    });
  });

  it('matchMapSubTabByRealmInput matches exact and partial labels', () => {
    const tabs = collectMapSubTabsForForceUi(nov);
    expect(matchMapSubTabByRealmInput('Hạ Giới Tinh Cầu / Tiểu Thế Giới', tabs)?.nhoId).toBe('ha-gioi');
    expect(matchMapSubTabByRealmInput('ha gioi', tabs)?.nhoId).toBe('ha-gioi');
    expect(matchMapSubTabByRealmInput('Tiểu Thế Giới', tabs)?.nhoId).toBe('ha-gioi');
  });

  it('listMapTabEntityNames skips list-card names', () => {
    expect(listMapTabEntityNames(nov, 'ban-do', 'ha-gioi')).toEqual(['Tây Châu', 'Đông Hải']);
  });

  it('getMapSubTabForceRankSuggestions reads mapEntrySuggestions.forceRanks', () => {
    expect(getMapSubTabForceRankSuggestions(nov, 'ban-do', 'ha-gioi')).toEqual(['A cấp', 'B cấp']);
  });
});
