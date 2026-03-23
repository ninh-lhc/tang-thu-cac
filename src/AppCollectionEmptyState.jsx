import React, { memo } from 'react';
import { Library } from 'lucide-react';

export const AppCollectionEmptyState = memo(function AppCollectionEmptyState({
  show,
  onBackToList,
}) {
  if (!show) return null;
  return (
    <div className="h-full flex flex-col items-center justify-center opacity-40">
      <Library size={64} className="mb-4 text-slate-600" />
      <p className="font-serif italic text-lg">Vui lòng chọn một đối tượng từ Danh Sách...</p>
      <button onClick={onBackToList} className="mt-4 px-4 py-2 bg-slate-800 rounded-lg text-sm hover:bg-slate-700">Quay lại danh sách</button>
    </div>
  );
});
