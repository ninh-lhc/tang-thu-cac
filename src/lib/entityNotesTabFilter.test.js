import { describe, expect, it } from 'vitest';
import {
  buildEntityNotesTabFieldBuckets,
  filterEntityNotesMarkdown,
  sortMarkdownSectionsAfterFilter,
} from './entityNotesTabFilter.js';

describe('buildEntityNotesTabFieldBuckets', () => {
  it('gom giá trị duy nhất theo id trường, bỏ template', () => {
    const entities = [
      { id: '1', isTemplate: true, dynamicData: { f_x: 'A' } },
      { id: '2', name: 'Thẻ 1', dynamicData: { f_x: 'B', f_y: 'C' } },
      { id: '3', name: 'Thẻ 2', dynamicData: { f_x: 'B', f_y: 'D' } },
    ];
    const fields = [
      { id: 'f_x', label: 'X' },
      { id: 'f_y', label: 'Y' },
    ];
    const buckets = buildEntityNotesTabFieldBuckets(entities, fields);
    expect(buckets.find((b) => b.id === 'f_x')?.values).toEqual(['B']);
    expect(buckets.find((b) => b.id === 'f_y')?.values).toEqual(['C', 'D']);
  });
});

describe('filterEntityNotesMarkdown', () => {
  it('không lọc khi không có điều kiện', () => {
    const md = '# A\n\nhello\n\n## B\n\nworld';
    const r = filterEntityNotesMarkdown(md, {});
    expect(r.didFilter).toBe(false);
    expect(r.text).toBe(md);
  });

  it('giữ mục có chứa từ khóa', () => {
    const md = '# Phần một\n\nKhông khớp.\n\n## Phần hai\n\nCó Kim Đan ở đây.';
    const r = filterEntityNotesMarkdown(md, { searchQuery: 'Kim Đan' });
    expect(r.emptyMatch).toBe(false);
    expect(r.text).toContain('Phần hai');
    expect(r.text).toContain('Kim Đan');
    expect(r.text).not.toContain('Phần một');
  });

  it('AND giữa ô tìm và giá trị trường', () => {
    const md = '# A\n\nalpha beta\n\n# B\n\nalpha gamma';
    const r = filterEntityNotesMarkdown(md, {
      searchQuery: 'alpha',
      fieldValueFilters: { f_1: 'gamma' },
    });
    expect(r.text).toContain('# B');
    expect(r.text).not.toContain('# A');
  });
});

describe('sortMarkdownSectionsAfterFilter', () => {
  it('giữ nguyên khi none hoặc một khối', () => {
    const md = '# A\n\ntext';
    expect(sortMarkdownSectionsAfterFilter(md, 'none')).toBe(md);
    expect(sortMarkdownSectionsAfterFilter(md, 'name_asc')).toBe(md);
  });

  it('sắp xếp mục theo tiêu đề A-Z', () => {
    const md = ['# Bbb', 'x', '', '# Aaa', 'y'].join('\n');
    const out = sortMarkdownSectionsAfterFilter(md, 'name_asc');
    expect(out.indexOf('# Aaa')).toBeLessThan(out.indexOf('# Bbb'));
  });
});
