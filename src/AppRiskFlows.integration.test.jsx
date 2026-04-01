// ==========================================
// AppRiskFlows.integration.test.jsx
// Integration smoke for high-risk user flows (keyboard + modal save + auto relation).
// ==========================================

import React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import App from './App.jsx';
import { ModalEntity, ModalMilestone } from './MasterComponents.jsx';
import { applyAutoRelationNotesForEntity } from './lib/autoRelationDetailNote.js';

function pressKey(key, opts = {}) {
  window.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...opts,
    })
  );
}

function dispatchSaveShortcut() {
  window.dispatchEvent(new CustomEvent('ttc-save', { cancelable: true }));
}

function countSubstr(text, needle) {
  let count = 0;
  let idx = 0;
  while (idx < text.length) {
    const found = text.indexOf(needle, idx);
    if (found === -1) break;
    count += 1;
    idx = found + needle.length;
  }
  return count;
}

function entityProps(overrides = {}) {
  return {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
    initialData: {
      id: 'entity-1',
      name: 'Entity Focus',
      avatar: '',
      rawText: '',
      dynamicData: {},
    },
    tabConfig: {},
    onUpdateTemplate: vi.fn(),
    handleAvatarDrop: vi.fn(),
    handlePickLocalImage: vi.fn(),
    dirHandle: null,
    parentTabId: 'nhan-vat',
    parentLabel: 'Nhan vat',
    geminiApiKey: [],
    geminiMode: 'standard',
    ...overrides,
  };
}

function milestoneProps(overrides = {}) {
  return {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
    initialData: {
      id: 'ms-1',
      chapter: '77',
      event: 'Milestone Focus',
      snapshot: { avatar: '', dynamicData: {} },
    },
    defaultChapterWhenNew: undefined,
    tabConfig: {},
    onUpdateTemplate: vi.fn(),
    handleAvatarDrop: vi.fn(),
    handlePickLocalImage: vi.fn(),
    dirHandle: null,
    parentTabId: 'nhan-vat',
    parentLabel: 'Nhan vat',
    geminiApiKey: [],
    geminiMode: 'standard',
    entityMap: [],
    showToast: vi.fn(),
    autoLinkToastEnabled: true,
    ...overrides,
  };
}

beforeAll(() => {
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = () => {};
  }
});

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('risk flow integration', () => {
  it('App keyboard: Ctrl/Cmd+K opens command palette and Escape closes it', async () => {
    render(<App />);
    expect(screen.queryAllByRole('dialog').length).toBe(0);

    pressKey('k', { ctrlKey: true });
    await waitFor(() => {
      expect(screen.queryAllByRole('dialog').length).toBeGreaterThan(0);
    });

    pressKey('Escape');
    await waitFor(() => {
      expect(screen.queryAllByRole('dialog').length).toBe(0);
    });
  });

  it('stacked dialogs: only top trap modal consumes ttc-save', async () => {
    const onEntitySave = vi.fn();
    const onMilestoneSave = vi.fn();
    const { getByTestId } = render(
      <>
        <ModalEntity {...entityProps({ onSave: onEntitySave })} />
        <ModalMilestone {...milestoneProps({ onSave: onMilestoneSave })} />
      </>
    );

    const entityRoot = getByTestId('modal-entity-root');
    const milestoneRoot = getByTestId('modal-milestone-root');
    const entityNameInput = entityRoot.querySelector('input[placeholder]');
    const milestoneEventInput = milestoneRoot.querySelector('textarea');

    expect(entityNameInput).toBeTruthy();
    expect(milestoneEventInput).toBeTruthy();
    await waitFor(() => expect(entityNameInput.value).toBe('Entity Focus'));
    await waitFor(() => expect(milestoneEventInput.value).toBe('Milestone Focus'));

    milestoneEventInput.focus();
    dispatchSaveShortcut();
    expect(onMilestoneSave).toHaveBeenCalledTimes(1);
    expect(onEntitySave).not.toHaveBeenCalled();
  });

  it('auto relation rounds: keeps a single auto block and unique backlinks', () => {
    const source = { id: 'src-1', name: 'Lac Gia', info: '', dynamicData: {}, milestones: [] };
    const location = { id: 'loc-1', name: 'Thien Ha Chau', info: '', dynamicData: {}, milestones: [] };
    const novel = {
      data: {
        scope: {
          main: {
            entities: [source, location],
          },
        },
      },
    };

    for (let i = 0; i < 40; i += 1) {
      const rank = i % 2 === 0 ? 'Tam Cap the luc' : 'Cuu Cap the luc';
      const out = applyAutoRelationNotesForEntity(novel, {
        sourceEntity: source,
        sourceLonId: 'the-luc',
        sourceParentLabel: 'The Luc',
        statusLine: `Gia Toc - ${rank} - Thien Ha Chau`,
      });
      expect(out.applied).toBe(true);
    }

    expect(countSubstr(String(source.info || ''), '## Quan hệ bản đồ - thế lực (tự động)')).toBe(1);
    expect((String(location.info || '').match(/#{1,3}\s*Vị trí/g) || []).length).toBe(1);
    const lines = String(location.info || '')
      .split(/\r?\n/)
      .filter((line) => /^\s*-\s*\[\[[^\]]+\]\]\s*\(/.test(line));
    const names = lines.map((line) => line.match(/\[\[([^\]]+)\]\]/)?.[1] || '').filter(Boolean);
    expect(new Set(names).size).toBe(names.length);
  });
});

