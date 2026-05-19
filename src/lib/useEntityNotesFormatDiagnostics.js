// Hook: cảnh báo định dạng ghi chép — trì hoãn khi gõ nhanh, ẩn lỗi tạm trên dòng đang soạn.
import { useDeferredValue, useMemo } from 'react';
import { collectEntityNotesDiagnostics } from './entityNotesDiagnostics.js';

export function useEntityNotesFormatDiagnostics(text, caretIndex = null) {
  const live = useMemo(
    () =>
      collectEntityNotesDiagnostics(text, {
        caretIndex: Number.isFinite(caretIndex) ? caretIndex : null,
        suppressTransientWhileTyping: true,
      }),
    [text, caretIndex]
  );
  return useDeferredValue(live);
}
