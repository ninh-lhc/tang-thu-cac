# Hướng dẫn cho người + AI (Tàng Thư Các)

## Stack

- **Vite 8**, **React 19**, **Tailwind 4** (`@tailwindcss/vite`)
- UI: `lucide-react`, component lớn trong `MasterComponents.jsx`, tiện ích `MasterUtils.jsx`, cấu hình `MasterEngines.js`

## Lệnh hay dùng

```bash
npm run dev      # dev server
npm run build    # production
npm run test     # Vitest (smoke)
npm run lint     # ESLint
```

Cài dependency: repo có **`.npmrc`** (`legacy-peer-deps=true`) vì peer Vite 8 / Tailwind.

**Mục tiêu UX:** ưu tiên **laptop / máy bàn** (bàn phím + chuột); design tokens `--tt-*` và class **`tt-kbd-focus`** trong `AppPhongChuVaTheme.jsx`.

## Bản đồ mã nguồn (đừng mở cả repo khi không cần)

| Khu vực | File / thư mục |
|--------|-----------------|
| Trục app, state toàn cục | `src/App.jsx` (đầu file có danh sách file đã tách) |
| Modal tách riêng | `src/AppModalMotCua.jsx`, `AppModalQuanLyTab.jsx`, `AppModalLenhNhanh.jsx`, `AppModalGoiYNoiTraCuu.jsx` |
| CSS/font/theme toàn cục | `src/AppPhongChuVaTheme.jsx` |
| Nhật ký / áp gợi ý AI vào novel | `src/appNhatKyVaGoiThe.js` |
| Logic thuần nhỏ | `src/lib/*.js` (vd. `stripWikiBrackets`, `computeRelatedEntities`, `entityCollectionQuery`, `readingProgress`) |
| TTC-Query (block ghi chép) | `docs/TTC_QUERY.md`, `src/lib/ttcQuery*.js(x)` |
| Tab Tổng quan (tiến độ/sao) | `src/AppOverviewSection.jsx`, `src/AppOverviewRatingStars.jsx` |
| Worker / tìm kiếm | `src/deepSearchCore.js`, `deepSearch.worker.js` |

## Quy ước khi sửa

1. **Đổi `src/lib/**` hoặc `appNhatKyVaGoiThe.js`** → chạy **`npm run test`** trước khi coi xong.
2. **Không** import icon **`Map`** từ `lucide-react` trong file còn dùng **`new Map()`** toàn cục (trùng tên → lỗi runtime). Dùng alias vd. `Map as MapIcon` hoặc đổi tên import.
3. Modal mới: ưu tiên file `AppModal*.jsx` + props từ `App.jsx`, tránh nhồi thêm nghìn dòng vào `App.jsx`.
4. Comment đầu file: 3–6 dòng (mục đích, ai import, lưu ý) — đủ cho AI định vị, không lặp lại tên biến.

## Hiệu năng (truyện lớn)

- Lộ trình P0–P2: **`PERFORMANCE_ROADMAP.md`** (timeline virtual list, regex/wiki, mạng nhân quả, lazy data, v.v.).

## Gợi ý prompt ngắn (tiết kiệm context)

- Ghi **file** + **hành vi mong đợi** + **bước tái hiện** (nếu bug).
- Giới hạn phạm vi: *“Chỉ sửa `AppModalMotCua.jsx` và prop ở `App.jsx`”*.
