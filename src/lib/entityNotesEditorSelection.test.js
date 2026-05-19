import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { focusEntityNotesTextarea } from './entityNotesEditorSelection.js';

describe('focusEntityNotesTextarea', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb) => {
      cb();
      return 0;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('clamps selection to text length', () => {
    const textarea = document.createElement('textarea');
    textarea.value = 'abc';
    document.body.appendChild(textarea);
    const focusSpy = vi.spyOn(textarea, 'focus');
    const rangeSpy = vi.spyOn(textarea, 'setSelectionRange');

    focusEntityNotesTextarea(textarea, 99, 120, 3);

    expect(focusSpy).toHaveBeenCalled();
    expect(rangeSpy).toHaveBeenCalledWith(3, 3);
    textarea.remove();
  });
});
