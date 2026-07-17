/**
 * Menu chuẩn hoá ghi chép — tách bước local (nhanh) và AI (chậm) để tránh đơ UI.
 */
import React from 'react';
import { Sparkles, Wand2, Link2 } from 'lucide-react';
import { getNotesAiPipelineStepLabel } from './lib/entityNotesAiPipeline.js';

const TOOL_ITEMS = [
  {
    id: 'clean',
    steps: ['clean'],
    label: 'Tự làm sạch',
    hint: 'Gộp dòng trống, chỉnh list — không gọi AI',
    icon: Wand2,
  },
  {
    id: 'link',
    steps: ['link'],
    label: 'Bọc link wiki',
    hint: 'Bọc [[Tên thẻ]] local, có thể bổ sung AI khi có API Key',
    icon: Link2,
  },
  {
    id: 'format',
    steps: ['format'],
    label: 'Khung phân tích',
    hint: 'AI dàn khung theo bố cục phân tích',
    icon: Sparkles,
  },
];

export function EntityNotesAiToolsMenu({
  onRunPipeline,
  isRunning = false,
  runningStep = null,
  disabled = false,
  /** Slot nút bổ sung (vd. Tìm thay thế) — hiện ngay trước các bước AI. */
  leadingSlot = null,
}) {
  const progressLabel = runningStep ? getNotesAiPipelineStepLabel(runningStep) : '';

  const handlePick = (item) => {
    onRunPipeline?.(item.steps);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {leadingSlot}
      {TOOL_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handlePick(item)}
            disabled={disabled || isRunning}
            className="px-3 py-2.5 rounded-[40px] text-[11px] font-bold transition-all shadow-md flex items-center gap-1.5 bg-violet-950/50 text-violet-100 hover:bg-violet-900/45 border border-violet-700/50 disabled:opacity-50"
            title={item.hint}
          >
            {isRunning && runningStep === item.id ? (
              <div className="h-3.5 w-3.5 rounded-full border-2 border-violet-200 border-t-transparent animate-spin" />
            ) : (
              <Icon size={13} />
            )}
            {isRunning && runningStep === item.id ? `Đang ${progressLabel}...` : item.label}
          </button>
        );
      })}
    </div>
  );
}
