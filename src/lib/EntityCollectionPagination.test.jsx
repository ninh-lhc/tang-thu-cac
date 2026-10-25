import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { EntityCollectionPagination, buildPageNumbers } from './EntityCollectionPagination.jsx';

afterEach(() => {
  cleanup();
});

describe('buildPageNumbers', () => {
  const max = 10;

  it('page=5, totalPages=15 — 10 phần tử, min ≥ 1, chứa 5', () => {
    const nums = buildPageNumbers(5, 15, max);
    expect(nums).toHaveLength(10);
    expect(Math.min(...nums)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...nums)).toBeLessThanOrEqual(15);
    expect(nums).toContain(5);
  });

  it('page=1, totalPages=20 — [1..10]', () => {
    expect(buildPageNumbers(1, 20, max)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('page=20, totalPages=20 — [11..20]', () => {
    expect(buildPageNumbers(20, 20, max)).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it('page=10, totalPages=20 — 10 phần tử, chứa 10, trong [1,20]', () => {
    const nums = buildPageNumbers(10, 20, max);
    expect(nums).toHaveLength(10);
    expect(nums).toContain(10);
    expect(Math.min(...nums)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...nums)).toBeLessThanOrEqual(20);
  });

  it('page=3, totalPages=5 — full range when total ≤ maxButtons', () => {
    expect(buildPageNumbers(3, 5, max)).toEqual([1, 2, 3, 4, 5]);
  });

  it('page=5, totalPages=15 — không có số 0', () => {
    expect(buildPageNumbers(5, 15, max).every((p) => p >= 1)).toBe(true);
  });
});

describe('EntityCollectionPagination', () => {
  it('hides when only one page', () => {
    const { container } = render(
      <EntityCollectionPagination page={1} pageCount={1} setPage={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  function nav() {
    return screen.getByRole('navigation', { name: 'Phân trang danh sách thẻ' });
  }

  it('disables prev on page 1 and next on last page', () => {
    render(<EntityCollectionPagination page={1} pageCount={3} setPage={() => {}} />);
    const n = within(nav());
    expect(n.getByRole('button', { name: 'Trang trước' }).disabled).toBe(true);
    expect(n.getByRole('button', { name: 'Trang sau' }).disabled).toBe(false);
  });

  it('disables next on last page', () => {
    render(<EntityCollectionPagination page={3} pageCount={3} setPage={() => {}} />);
    const n = within(nav());
    expect(n.getByRole('button', { name: 'Trang sau' }).disabled).toBe(true);
    expect(n.getByRole('button', { name: 'Trang trước' }).disabled).toBe(false);
  });

  it('calls setPage with page number', async () => {
    const user = userEvent.setup();
    const setPage = vi.fn();
    render(<EntityCollectionPagination page={1} pageCount={3} setPage={setPage} />);
    const n = within(nav());
    await user.click(n.getByRole('button', { name: 'Trang 2' }));
    expect(setPage).toHaveBeenCalledWith(2);
    await user.click(n.getByRole('button', { name: 'Trang sau' }));
    expect(setPage).toHaveBeenCalledWith(2);
  });
});
