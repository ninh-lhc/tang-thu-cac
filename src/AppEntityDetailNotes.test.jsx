import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AppEntityDetailNotes } from './AppEntityDetailNotes.jsx';

function createProps(overrides = {}) {
  return {
    activeTabLon: 'thien-dia-ki-vat',
    getTerms: () => ({ infoDesc: 'Ghi chu chi tiet' }),
    isEntityEditing: true,
    isExtractingAI: false,
    setIsExtractingAI: vi.fn(),
    geminiApiKeys: [],
    showToast: vi.fn(),
    aiMode: 'standard',
    isSplitPreview: false,
    setLivePreviewText: vi.fn(),
    setDebouncedMarkdownPreview: vi.fn(),
    setIsSplitPreview: vi.fn(),
    selectedEntity: {
      id: 'entity-1',
      name: 'Linh Gioi Chau',
      info: 'Linh Gioi Chau xuat hien giua troi.',
    },
    handleUpdateEntityInfo: vi.fn(),
    setIsEntityEditing: vi.fn(),
    setImageForm: vi.fn(),
    setIsInsertImageModalOpen: vi.fn(),
    handlePickLocalImage: vi.fn(),
    imageFileStemParts: [],
    debouncedMarkdownPreview: '',
    currentContextDirHandle: null,
    entityMap: [{ id: 'entity-1', name: 'Linh Gioi Chau' }],
    globalLinkRegex: null,
    onNavigate: vi.fn(),
    memoizedEntityInfo: 'Linh Gioi Chau xuat hien giua troi.',
    onOpenAutoSyncGuide: null,
    ...overrides,
  };
}

describe('AppEntityDetailNotes', () => {
  afterEach(() => {
    cleanup();
  });

  it('prefers local wiki wrapping before calling AI', () => {
    const props = createProps();
    render(<AppEntityDetailNotes {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /AI/i }));

    expect(screen.getByRole('textbox').value).toBe('[[Linh Gioi Chau]] xuat hien giua troi.');
    expect(props.showToast).toHaveBeenCalledWith(
      'Da tu boc 1 [[lien ket]] theo the co san. Bam lai AI neu muon goi y them cho kho.'
    );
    expect(props.setIsExtractingAI).not.toHaveBeenCalled();
  });
});
