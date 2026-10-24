import { describe, expect, it } from 'vitest';
import {
  buildPendingWikiLinkAriaLabel,
  buildPendingWikiLinkTitle,
  findQuickCreateEquivalentInTab,
} from './entityNotesWikiLinkUi.js';

describe('entityNotesWikiLinkUi', () => {
  it('builds pending wiki accessibility labels', () => {
    expect(buildPendingWikiLinkAriaLabel('Triệu Hoán Không Gian')).toBe(
      'Tạo ghi chú cho Triệu Hoán Không Gian'
    );
    expect(buildPendingWikiLinkTitle('Triệu Hoán Không Gian')).toContain('Triệu Hoán Không Gian');
    expect(buildPendingWikiLinkTitle('Triệu Hoán Không Gian')).not.toContain('+');
  });

  it('finds equivalent entity in tab without scanning notes', () => {
    const novel = {
      data: {
        lon1: {
          nho1: {
            entities: [{ id: 'e1', name: 'Triệu Hoán Không Gian', dynamicData: {} }],
          },
        },
      },
    };
    const hit = findQuickCreateEquivalentInTab(novel, 'lon1|nho1', 'Triệu Hoán Không Gian', (n) => n);
    expect(hit?.entityId).toBe('e1');
  });
});
