// Mục đích: Đánh giá 0–5 (bước 0.5), xem trước khi hover, điều khiển bàn phím.
// Import bởi: AppOverviewSection.jsx
// Lưu ý: Không import icon Map từ lucide-react (trùng Map toàn cục ở file khác).

import React, { useState, useCallback } from 'react';

const STEP = 0.5;
const MAX = 5;

function clampRating(r) {
  const n = Number(r);
  if (Number.isNaN(n)) return 0;
  const steps = Math.round(n / STEP);
  return Math.max(0, Math.min(MAX, steps * STEP));
}

function stepRating(r, deltaHalfSteps) {
  const steps = Math.round(Number(r) / STEP);
  const next = steps + deltaHalfSteps;
  return clampRating(next * STEP);
}

export function AppOverviewRatingStars({
  rating,
  onChange,
  'data-testid': dataTestId = 'rating-star-row',
}) {
  const [hoverPreview, setHoverPreview] = useState(null);
  const displayRating = hoverPreview !== null ? hoverPreview : Number(rating || 0);

  const commit = useCallback(
    (r) => {
      const v = clampRating(r);
      onChange(v);
    },
    [onChange]
  );

  const onKeyDown = (e) => {
    const cur = Number(rating || 0);
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      commit(stepRating(cur, 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      commit(stepRating(cur, -1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      commit(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      commit(MAX);
    } else if (e.key === '0' || e.key === 'Delete' || e.key === 'Backspace') {
      if (e.key === 'Backspace' && e.target !== e.currentTarget) return;
      e.preventDefault();
      commit(0);
    }
  };

  return (
    <div
      data-testid={dataTestId}
      role="group"
      aria-label="Đánh giá sao, từ 0 đến 5 bước nửa sao"
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="flex items-center gap-1 flex-wrap outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 rounded-lg"
    >
      <div
        className="flex items-center gap-1"
        onPointerLeave={() => setHoverPreview(null)}
      >
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.max(0, Math.min(1, displayRating - (star - 1)));
        return (
          <div
            key={star}
            className="relative w-7 h-7 select-none"
            onPointerMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const rel = (e.clientX - rect.left) / rect.width;
              const half = rel < 0.5 ? star - 0.5 : star;
              setHoverPreview(half);
            }}
          >
            <span className="absolute inset-0 text-2xl leading-7 text-slate-700">★</span>
            <span
              className="absolute inset-0 text-2xl leading-7 text-amber-400 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              ★
            </span>
            <button
              type="button"
              onClick={() => commit(star - 0.5)}
              className="absolute left-0 top-0 h-full w-1/2"
              aria-label={`Đánh giá ${star - 0.5} sao`}
              title={`${star - 0.5} sao`}
            />
            <button
              type="button"
              onClick={() => commit(star)}
              className="absolute right-0 top-0 h-full w-1/2"
              aria-label={`Đánh giá ${star} sao`}
              title={`${star} sao`}
            />
          </div>
        );
      })}
      </div>
      <span className="ml-2 text-xs text-slate-400 font-serif">{Number(displayRating).toFixed(1)}/5</span>
    </div>
  );
}
