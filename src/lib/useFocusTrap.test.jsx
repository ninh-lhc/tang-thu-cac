import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { useFocusTrap } from './useFocusTrap.js';

function TrapHarness({ isOpen }) {
  const trapRef = useFocusTrap(isOpen);
  return (
    <div>
      <button type="button" data-testid="trigger">trigger</button>
      {isOpen && (
        <div ref={trapRef} data-testid="trap-root">
          <button type="button" data-testid="first">first</button>
          <button type="button" data-testid="last">last</button>
        </div>
      )}
      <button type="button" data-testid="outside">outside</button>
    </div>
  );
}

afterEach(() => {
  cleanup();
});

describe('useFocusTrap', () => {
  it('keeps focus inside and cycles Tab/Shift+Tab', () => {
    const { getByTestId } = render(<TrapHarness isOpen={true} />);
    const first = getByTestId('first');
    const last = getByTestId('last');
    const outside = getByTestId('outside');

    expect(document.activeElement).toBe(first);

    outside.focus();
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true, bubbles: true });
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(last, { key: 'Tab', bubbles: true });
    expect(document.activeElement).toBe(first);
  });

  it('restores focus to previous element when modal closes', () => {
    const { getByTestId, rerender } = render(<TrapHarness isOpen={false} />);
    const trigger = getByTestId('trigger');
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    rerender(<TrapHarness isOpen={true} />);
    expect(document.activeElement).toBe(getByTestId('first'));

    rerender(<TrapHarness isOpen={false} />);
    expect(document.activeElement).toBe(trigger);
  });
});
