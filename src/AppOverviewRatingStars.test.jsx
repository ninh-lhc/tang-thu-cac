import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppOverviewRatingStars } from './AppOverviewRatingStars.jsx';

afterEach(() => {
  cleanup();
});

describe('AppOverviewRatingStars', () => {
  it('keyboard ArrowRight increases half-step', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AppOverviewRatingStars rating={2} onChange={onChange} />);
    const row = screen.getByTestId('rating-star-row');
    row.focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith(2.5);
  });

  it('keyboard ArrowLeft decreases', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AppOverviewRatingStars rating={2} onChange={onChange} />);
    screen.getByTestId('rating-star-row').focus();
    await user.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenCalledWith(1.5);
  });

  it('click half star invokes onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AppOverviewRatingStars rating={0} onChange={onChange} />);
    const halves = screen.getAllByRole('button', { name: /0\.5 sao/ });
    await user.click(halves[0]);
    expect(onChange).toHaveBeenCalledWith(0.5);
  });
});
