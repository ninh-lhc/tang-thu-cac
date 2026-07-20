// Hộp chọn tab đích cho chuyển thẻ thật và nâng thẻ con thành thẻ thật.
// AppCollectionSection quản lý trạng thái mở; App.jsx thực hiện cập nhật dữ liệu.
// Chỉ liệt kê các tab collection-track có thể chứa thẻ thật.

import React, { useMemo, useState } from 'react';
import { ArrowRightLeft, X } from 'lucide-react';
import { safeString } from './MasterUtils.jsx';

function buildEntityTransferDestinations(tabsConfig) {
  const out = [];
  (Array.isArray(tabsConfig) ? tabsConfig : []).forEach((lon) => {
    (Array.isArray(lon?.subTabs) ? lon.subTabs : []).forEach((nho) => {
      if (nho?.viewType !== 'collection-track') return;
      out.push({
        lonId: safeString(lon.id),
        nhoId: safeString(nho.id) || 'default',
        label: `${safeString(lon.label) || safeString(lon.id)} › ${safeString(nho.label) || safeString(nho.id)}`,
      });
    });
  });
  return out;
}

export function AppModalEntityTransfer({ request, tabsConfig, source, onClose, onConfirm }) {
  const options = useMemo(() => buildEntityTransferDestinations(tabsConfig), [tabsConfig]);
  const allowed = useMemo(
    () => options.filter((option) => request?.mode === 'promote'
      || option.lonId !== source?.lonId
      || option.nhoId !== (source?.nhoId || 'default')),
    [options, request?.mode, source?.lonId, source?.nhoId]
  );
  const [destinationKey, setDestinationKey] = useState(() => {
    const first = allowed[0];
    return first ? `${first.lonId}::${first.nhoId}` : '';
  });
  if (!request) return null;
  const destination = allowed.find((item) => `${item.lonId}::${item.nhoId}` === destinationKey) || null;
  const isPromote = request.mode === 'promote';

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-cyan-800/50 bg-slate-950 p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-heading font-bold text-slate-100">
              <ArrowRightLeft size={18} className="text-cyan-300" />
              {isPromote ? 'Chuyển thành thẻ thật' : 'Di chuyển thẻ sang tab khác'}
            </h3>
            <p className="mt-1 font-serif text-sm text-slate-400">
              {safeString(request.itemName)}
              {isPromote ? ' — toàn bộ nhánh thẻ con bên dưới sẽ đi cùng.' : ' — giữ nguyên hồ sơ, ảnh, ghi chép và mốc.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="tt-kbd-focus rounded-lg p-2 text-slate-500 hover:bg-slate-900 hover:text-slate-200" aria-label="Đóng">
            <X size={17} />
          </button>
        </div>

        <label className="mt-5 block">
          <span className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-slate-500">Tab đích</span>
          <select
            value={destinationKey}
            onChange={(event) => setDestinationKey(event.target.value)}
            className="tt-kbd-focus h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100"
          >
            {allowed.map((item) => (
              <option key={`${item.lonId}:${item.nhoId}`} value={`${item.lonId}::${item.nhoId}`}>{item.label}</option>
            ))}
          </select>
        </label>

        {allowed.length === 0 && (
          <p className="mt-3 rounded-lg border border-amber-800/40 bg-amber-950/20 px-3 py-2 text-sm text-amber-200">
            Không có tab sưu tập phù hợp để chuyển đến.
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="tt-kbd-focus h-10 rounded-xl border border-slate-700 px-4 text-sm font-bold text-slate-300">Hủy</button>
          <button
            type="button"
            disabled={!destination}
            onClick={() => destination && onConfirm?.(request, destination)}
            className="tt-kbd-focus h-10 rounded-xl bg-cyan-700 px-4 text-sm font-bold text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPromote ? 'Tạo thẻ thật' : 'Di chuyển'}
          </button>
        </div>
      </div>
    </div>
  );
}
