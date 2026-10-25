import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { EntityCollectionPagination } from './EntityCollectionPagination.jsx';

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
