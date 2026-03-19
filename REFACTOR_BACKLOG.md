# Backlog tái cấu trúc (13–16)

Các mục sau được lưu để làm sau khi hoàn thành các tối ưu 1–12.

---

## 13. Tách state: useAppState hook hoặc useReducer + context

**Mục tiêu:** Gom ~70+ `useState` trong `App.jsx` vào hook `useAppState` (hoặc `useReducer` + Context) để:
- Dễ debug, test
- Giảm surface state, tách logic khỏi UI

**Cách làm:** Tạo `src/hooks/useAppState.js` (hoặc `useAppReducer.js`), chuyển toàn bộ state + setters vào đó; `App.jsx` chỉ consume.

---

## 14. Chia App.jsx theo màn hình

**Mục tiêu:** Tách `App.jsx` (~3.700 dòng) thành các component theo section:
- `OverviewSection` — tab Tổng quan
- `CollectionSection` — danh sách thẻ / collection
- `EntityDetailSection` — chi tiết thực thể

**Cách làm:** Tạo thư mục `src/sections/`, mỗi section là component riêng; `App.jsx` chỉ compose và truyền props.

---

## 15. Extract shared hooks: useToast, useImageUpload, useAIAction

**Mục tiêu:** Gom logic trùng lặp:
- `useToast` — `showToast`, `toastMessage`, auto-dismiss, undo
- `useImageUpload` — pick local, base64, dirHandle, error handling
- `useAIAction` — kiểm tra API key, loading, `mapGeminiErrorToUserMessage`

**Cách làm:** Tạo `src/hooks/useToast.js`, `useImageUpload.js`, `useAIAction.js`; thay thế chỗ dùng trong `App.jsx` và modals.

---

## 16. React Error Boundary quanh các section chính

**Mục tiêu:** Khi một section lỗi (vd. crash khi render entity), phần còn lại app vẫn chạy; hiện fallback thay vì trắng màn hình.

**Cách làm:** Cài `react-error-boundary`, bọc `OverviewSection`, `CollectionSection`, `EntityDetailSection` (sau khi tách) bằng `<ErrorBoundary fallback={...} />`.

---

*Tạo: 2025-03-17*
