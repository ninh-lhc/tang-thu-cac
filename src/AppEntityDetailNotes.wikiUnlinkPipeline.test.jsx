/**
 * Ctrl+G trên textarea thật, rồi click Lưu / ttc-save, rồi đọc payload, state và màn đọc.
 * Opt-out phải chặn chip wiki sau khi renderer cắt [[link]] kế bên.
 */
import React, { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppEntityDetailNotes } from './AppEntityDetailNotes.jsx';
import { buildWikiLinkMatcher } from './lib/wikiLinkMatcher.js';

const ENTITY_MAP = [
  { id: 'lam', name: 'Lâm Mặc Ngữ' },
  { id: 'kho', name: 'Khô Lâu' },
  { id: 'trieu', name: 'Triệu Hồi' },
  { id: 'chuyen', name: 'Chuyển Di Sát Thương' },
  { id: 'tu', name: 'Tử Linh Pháp Sư' },
  { id: 'duy', name: 'Duy Nhất Tử Linh Pháp Sư' },
];

let lastSave = null;

function Harness({ initialInfo }) {
  const [editing, setEditing] = useState(true);
  const [entity, setEntity] = useState({
    id: 'entity-1',
    name: 'Phiếu thử',
    info: initialInfo,
    wikiLinkOptOuts: [],
  });
  const matcher = buildWikiLinkMatcher(ENTITY_MAP);
  return (
    <AppEntityDetailNotes
      activeTabLon="nhan-vat"
      activeTabNho="default"
      currentTabConfig={{
        id: 'default',
        label: 'Nhân Vật',
        viewType: 'collection-track',
        _parentLabel: 'Nhân Vật',
      }}
      getTerms={() => ({ infoDesc: 'Ghi chu chi tiet' })}
      isEntityEditing={editing}
      setIsEntityEditing={setEditing}
      isExtractingAI={false}
      setIsExtractingAI={() => {}}
      geminiApiKeys={[]}
      showToast={() => {}}
      aiMode="standard"
      isSplitPreview={false}
      setLivePreviewText={() => {}}
      setDebouncedMarkdownPreview={() => {}}
      setIsSplitPreview={() => {}}
      selectedEntity={entity}
      handleUpdateEntityInfo={(text, opts) => {
        lastSave = { text, wikiLinkOptOuts: opts?.wikiLinkOptOuts || [] };
        setEntity((prev) => ({
          ...prev,
          info: text,
          wikiLinkOptOuts: Array.isArray(opts?.wikiLinkOptOuts) ? opts.wikiLinkOptOuts : prev.wikiLinkOptOuts,
        }));
      }}
      handleSetSelectedEntityAutoSyncState={() => {}}
      setImageForm={() => {}}
      setIsInsertImageModalOpen={() => {}}
      handlePickLocalImage={() => {}}
      imageFileStemParts={[]}
      debouncedMarkdownPreview=""
      currentContextDirHandle={null}
      entityMap={ENTITY_MAP}
      globalLinkRegex={matcher}
      onNavigate={() => {}}
      detailNotesMarkdown={entity.info}
      entityFilterFields={[]}
      notesTabFieldBuckets={[]}
      AdvancedFieldSelect={null}
      detailProfileMode="original"
      onChangeDetailProfileMode={() => {}}
      canViewTimelineCurrentProfile={false}
      timelineCurrentProfileLabel=""
      onOpenTimelineCurrentEdit={() => {}}
    />
  );
}

function chipTexts(container) {
  return [...container.querySelectorAll('[data-entity-wiki-link]')].map((node) =>
    node.textContent.replace(/\s+/g, ' ').trim()
  );
}

function pressCtrlG() {
  fireEvent.keyDown(document, { key: 'g', ctrlKey: true });
}

async function saveNotes(via) {
  if (via === 'shortcut') {
    const handleSave = () => {
      document.getElementById('save-entity-btn')?.click();
    };
    window.addEventListener('ttc-save', handleSave);
    window.dispatchEvent(new CustomEvent('ttc-save', { cancelable: true }));
    window.removeEventListener('ttc-save', handleSave);
    return;
  }
  await userEvent.click(document.getElementById('save-entity-btn'));
}

async function finishSave(container) {
  await screen.findByRole('button', { name: /Viết ghi chép/i }, { timeout: 4000 });
  const rendered = chipTexts(container);
  const saved = lastSave;
  await userEvent.click(screen.getByRole('button', { name: /Viết ghi chép/i }));
  const reopened = screen.getByRole('textbox').value;
  return { rendered, saved, reopened };
}

describe('Ghi Chép Chi Tiết wiki unlink pipeline', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    lastSave = null;
  });

  it('keeps a Ctrl+G unlink plain in the payload, state, read view, and reopened editor', async () => {
    const info = '1. Kỹ năng của [[Lâm Mặc Ngữ]] rất mạnh.\n1. [[Khô Lâu]] đứng cạnh.';
    const needle = '[[Lâm Mặc Ngữ]]';
    const { container } = render(<Harness initialInfo={info} />);
    const textbox = screen.getByRole('textbox');
    const at = info.indexOf(needle);
    textbox.focus();
    textbox.setSelectionRange(at, at + needle.length);

    expect({
      selectionStart: textbox.selectionStart,
      selectionEnd: textbox.selectionEnd,
      selectedText: textbox.value.slice(textbox.selectionStart, textbox.selectionEnd),
    }).toEqual({
      selectionStart: at,
      selectionEnd: at + needle.length,
      selectedText: needle,
    });

    pressCtrlG();
    expect(textbox.value).toBe('1. Kỹ năng của Lâm Mặc Ngữ rất mạnh.\n1. [[Khô Lâu]] đứng cạnh.');
    expect(textbox.value).not.toContain('[[Lâm Mặc Ngữ]]');

    await saveNotes('click');
    const { rendered, saved, reopened } = await finishSave(container);
    const expected = '1. Kỹ năng của Lâm Mặc Ngữ rất mạnh.\n2. [[Khô Lâu]] đứng cạnh.';

    expect(saved.text).toBe(expected);
    expect(saved.wikiLinkOptOuts).toEqual([expect.objectContaining({ anchor: 'Lâm Mặc Ngữ' })]);
    expect(reopened).toBe(expected);
    expect(rendered).toEqual(['Khô Lâu']);
    expect(container.textContent).toContain('Lâm Mặc Ngữ');
  });

  it('keeps the same plain text when Ctrl+S dispatches ttc-save', async () => {
    const info = '1. Kỹ năng của [[Lâm Mặc Ngữ]] rất mạnh.\n1. [[Khô Lâu]] đứng cạnh.';
    const { container } = render(<Harness initialInfo={info} />);
    const textbox = screen.getByRole('textbox');
    const needle = '[[Lâm Mặc Ngữ]]';
    const at = info.indexOf(needle);
    textbox.focus();
    textbox.setSelectionRange(at, at + needle.length);
    pressCtrlG();
    expect(textbox.value).toBe('1. Kỹ năng của Lâm Mặc Ngữ rất mạnh.\n1. [[Khô Lâu]] đứng cạnh.');

    await saveNotes('shortcut');
    const { rendered, saved, reopened } = await finishSave(container);
    const expected = '1. Kỹ năng của Lâm Mặc Ngữ rất mạnh.\n2. [[Khô Lâu]] đứng cạnh.';

    expect(saved.text).toBe(expected);
    expect(reopened).toBe(expected);
    expect(rendered).toEqual(['Khô Lâu']);
  });

  it('still auto-wraps brackets deleted by typing when auto-wrap is on', async () => {
    const info = '[[Lâm Mặc Ngữ]]';
    const { container } = render(<Harness initialInfo={info} />);
    const textbox = screen.getByRole('textbox');
    fireEvent.change(textbox, { target: { value: 'Lâm Mặc Ngữ' } });
    expect(textbox.value).toBe('Lâm Mặc Ngữ');

    await saveNotes('click');
    const { rendered, saved, reopened } = await finishSave(container);

    expect(saved.text).toBe('[[Lâm Mặc Ngữ]]');
    expect(saved.wikiLinkOptOuts).toEqual([]);
    expect(reopened).toBe('[[Lâm Mặc Ngữ]]');
    expect(rendered).toEqual(['Lâm Mặc Ngữ']);
  });

  it('keeps a link that was unlinked and then linked again with Ctrl+G', async () => {
    const info = '[[Lâm Mặc Ngữ]]';
    const { container } = render(<Harness initialInfo={info} />);
    const textbox = screen.getByRole('textbox');
    textbox.focus();
    textbox.setSelectionRange(0, info.length);
    pressCtrlG();
    expect(textbox.value).toBe('Lâm Mặc Ngữ');
    textbox.setSelectionRange(0, textbox.value.length);
    pressCtrlG();
    expect(textbox.value).toBe('[[Lâm Mặc Ngữ]]');

    await saveNotes('click');
    const { rendered, saved, reopened } = await finishSave(container);

    expect(saved.text).toBe('[[Lâm Mặc Ngữ]]');
    expect(saved.wikiLinkOptOuts).toEqual([]);
    expect(reopened).toBe('[[Lâm Mặc Ngữ]]');
    expect(rendered).toEqual(['Lâm Mặc Ngữ']);
  });

  it('unlinks only the wiki link that was selected when another link follows', async () => {
    const info = '[[Lâm Mặc Ngữ]] gặp [[Khô Lâu]].';
    const { container } = render(<Harness initialInfo={info} />);
    const textbox = screen.getByRole('textbox');
    const needle = '[[Lâm Mặc Ngữ]]';
    const at = info.indexOf(needle);
    textbox.focus();
    textbox.setSelectionRange(at, at + needle.length);
    pressCtrlG();
    expect(textbox.value).toBe('Lâm Mặc Ngữ gặp [[Khô Lâu]].');

    await saveNotes('click');
    const { rendered, saved, reopened } = await finishSave(container);
    const expected = 'Lâm Mặc Ngữ gặp [[Khô Lâu]].';

    expect(saved.text).toBe(expected);
    expect(saved.wikiLinkOptOuts).toEqual([expect.objectContaining({ anchor: 'Lâm Mặc Ngữ' })]);
    expect(reopened).toBe(expected);
    expect(rendered).toEqual(['Khô Lâu']);
  });

  it('keeps one unlinked name plain inside a pasted LM note with neighboring links', async () => {
    const info = [
      '1. Chức nghiệp sở hữu: Kỹ năng triệu hoán nền tảng ban đầu thuộc chức nghiệp ẩn Duy Nhất Tử Linh Pháp Sư của [[Lâm Mặc Ngữ]].',
      '',
      '2. Cơ chế sinh tồn quy tắc ([[Chuyển Di Sát Thương]]): Kết hợp với kỹ năng bị động [[Chuyển Di Sát Thương]], 100% sát thương giáng vào [[Lâm Mặc Ngữ]].',
      '',
      '3. [[Khô Lâu]] đứng cạnh [[Lâm Mặc Ngữ]].',
    ].join('\n');
    const { container } = render(<Harness initialInfo={info} />);
    const textbox = screen.getByRole('textbox');
    const needle = '[[Lâm Mặc Ngữ]]';
    const at = info.indexOf(needle);
    textbox.focus();
    textbox.setSelectionRange(at, at + needle.length);
    pressCtrlG();
    expect(textbox.value.slice(at, at + 'Lâm Mặc Ngữ'.length)).toBe('Lâm Mặc Ngữ');
    expect(textbox.value).not.toContain('của [[Lâm Mặc Ngữ]]');

    await saveNotes('click');
    const { rendered, saved, reopened } = await finishSave(container);

    expect(saved.text).toContain('của Lâm Mặc Ngữ.');
    expect(saved.text).not.toContain('của [[Lâm Mặc Ngữ]]');
    expect(saved.text.match(/\[\[Lâm Mặc Ngữ\]\]/g)).toHaveLength(2);
    expect(saved.text).toContain('[[Khô Lâu]]');
    expect(saved.text).toContain('[[Chuyển Di Sát Thương]]');
    expect(reopened).toBe(saved.text);
    expect(rendered.filter((name) => name === 'Lâm Mặc Ngữ')).toHaveLength(2);
    expect(rendered).toContain('Khô Lâu');
    expect(rendered).toContain('Chuyển Di Sát Thương');

    await saveNotes('click');
    const again = await finishSave(container);
    expect(again.saved.text).toBe(saved.text);
    expect(again.saved.text).not.toContain('của [[Lâm Mặc Ngữ]]');
    expect(again.rendered.filter((name) => name === 'Lâm Mặc Ngữ')).toHaveLength(2);
  });
});
