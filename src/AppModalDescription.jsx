/**
 * Modal nhập "Miêu Tả": 2 trường — số chương + nội dung miêu tả.
 * Chia nhẹ khỏi ModalMilestone vì không cần snapshot/AI/field; chỉ ghi vào entity.descriptions.
 * Ai import: AppModalLayer (mount cùng các modal khác của App).
 */
import React, { useEffect, useRef, useState } from 'react';
import { FileText, Save, X } from 'lucide-react';
import { safeString } from './MasterUtils.jsx';
import { useFocusTrap } from './lib/useFocusTrap.js';

export const ModalDescription = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultChapterWhenNew,
}) => {
  const trapRef = useFocusTrap(isOpen);
  const chapterInputRef = useRef(null);
  const [formData, setFormData] = useState({ id: null, chapter: '', content: '' });
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    /* eslint-disable react-hooks/set-state-in-effect -- dialog cần hydrate state khi mở */
    setErrorMsg('');
    if (initialData) {
      setFormData({
        id: initialData.id,
        chapter: safeString(initialData.chapter),
        content: safeString(initialData.content),
      });
    } else {
      const defaultChapter =
        defaultChapterWhenNew != null && defaultChapterWhenNew !== ''
          ? String(defaultChapterWhenNew)
          : '';
      setFormData({ id: null, chapter: defaultChapter, content: '' });
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isOpen, initialData, defaultChapterWhenNew]);

  useEffect(() => {
    if (!isOpen) return;
    const raf = window.requestAnimationFrame(() => {
      chapterInputRef.current?.focus?.();
    });
    return () => window.cancelAnimationFrame(raf);
  }, [isOpen]);

  if (!isOpen) return null;

  const patch = (next) => setFormData((prev) => ({ ...prev, ...next }));

  const validate = () => {
    const chapterNum = parseInt(formData.chapter, 10);
    if (!Number.isFinite(chapterNum) || chapterNum < 0) {
      setErrorMsg('Số chương phải là số không âm.');
      return null;
    }
    const content = safeString(formData.content).trim();
    if (!content) {
      setErrorMsg('Hãy nhập nội dung miêu tả.');
      return null;
    }
    return { id: formData.id, chapter: chapterNum, content };
  };

  const handleSubmit = (event) => {
    event?.preventDefault?.();
    const payload = validate();
    if (!payload) return;
    onSave?.(payload);
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-fast"
      role="dialog"
      aria-modal="true"
      aria-label="Khắc ghi miêu tả theo chương"
    >
      <form
        ref={trapRef}
        onSubmit={handleSubmit}
        className="bg-slate-900 border border-amber-700/40 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-lg font-heading text-amber-500 font-bold flex items-center gap-2">
            <FileText size={18} />
            {formData.id ? 'Tu Bổ Miêu Tả' : 'Khắc Ghi Miêu Tả Mới'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-200 transition-colors"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label
              htmlFor="description-chapter-input"
              className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5"
            >
              Số chương
            </label>
            <input
              id="description-chapter-input"
              ref={chapterInputRef}
              type="number"
              inputMode="numeric"
              min={0}
              value={formData.chapter}
              onChange={(e) => patch({ chapter: e.target.value })}
              placeholder="VD: 12"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 text-sm focus:border-amber-500/50 outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="description-content-input"
              className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5"
            >
              Miêu tả
            </label>
            <textarea
              id="description-content-input"
              value={formData.content}
              onChange={(e) => patch({ content: e.target.value })}
              placeholder="Mô tả nhân vật / vật phẩm tại thời điểm chương này (hỗ trợ Markdown, [[liên kết]])..."
              rows={10}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 text-sm font-serif leading-relaxed focus:border-amber-500/50 outline-none resize-y custom-scrollbar min-h-[180px]"
            />
          </div>

          {errorMsg && (
            <div className="text-[12px] text-rose-300 bg-rose-950/30 border border-rose-800/50 rounded-lg px-3 py-2">
              {errorMsg}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-slate-800 bg-slate-950/40 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors text-sm font-bold"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="px-5 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-lg shadow-lg transition-colors text-sm font-bold flex items-center gap-2"
          >
            <Save size={14} /> {formData.id ? 'Lưu thay đổi' : 'Khắc ghi'}
          </button>
        </div>
      </form>
    </div>
  );
};
