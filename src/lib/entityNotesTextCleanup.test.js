import { describe, expect, it } from 'vitest';
import { cleanupEntityNotesText } from './entityNotesTextCleanup.js';

describe('cleanupEntityNotesText', () => {
  it('joins broken paragraphs and removes web whitespace noise', () => {
    const input = 'Day la doan dau.  \nbi xuong dong\u00a0khong hop ly.\n\n- y   mot\nvan cung y\n- y hai';

    expect(cleanupEntityNotesText(input)).toBe(
      'Day la doan dau. bi xuong dong khong hop ly.\n- y mot van cung y\n- y hai'
    );
  });

  it('keeps headings and ordered lists while cleaning spacing', () => {
    const input = '##   Muc lon \n\n1.  Y dau\nbo sung them\n2.   Y hai\n\n____';

    expect(cleanupEntityNotesText(input)).toBe(
      '## Muc lon\n1. Y dau bo sung them\n2. Y hai\n---'
    );
  });

  it('does not merge a heading or title line into the previous bullet', () => {
    const input = '- **Công dụng:** mô tả\n## 4. Sức mạnh\n\n«[[Vạn Mệnh]]»';

    expect(cleanupEntityNotesText(input)).toBe(
      '- **Công dụng:** mô tả\n## 4. Sức mạnh\n«[[Vạn Mệnh]]»'
    );
  });
});
