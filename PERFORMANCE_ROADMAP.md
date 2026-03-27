# Lộ trình hiệu năng — truyện cực lớn

Thứ tự ưu tiên đã thống nhất; cập nhật trạng thái khi hoàn thành từng mục.

| Ưu tiên | Hạng mục | Trạng thái | Ghi chú ngắn |
|--------|-----------|------------|----------------|
| **P0** | Timeline: virtual list / phân trang mốc (`AppEntityTimelinePanel`) | **Xong** | `@tanstack/react-virtual` — cột trái, `estimateSize` + `measureElement` |
| **P1** | Wiki / `globalLinkRegex`: tránh một regex khổng lồ | **Xong** | Đổi sang matcher dạng bucket/longest-match thay regex alternation khổng lồ |
| **P1** | Cache hoặc incremental `computeRelatedEntities` | **Xong** | Dựng index theo novel + `WeakMap` cache, giảm tái duyệt dữ liệu thô mỗi lần đổi thẻ |
| **P2** | Lazy load `data` theo tab (RAM) | **Xong** | Pha 1-3: nạp shard theo `lon/nho`, hydrate tab thiếu dữ liệu, tự hydrate full khi vào `tong-quan` |
| **P2** | Ghi shard chỉ phần dirty | **Xong** | `writeShardTree` skip shard không đổi bằng cache hash theo thư mục |
| **P2** | Index tìm kiếm + Worker | **Xong** | Cache index theo novel + query batch trong Worker (`deepSearch.worker`) |

Chi tiết giải pháp từng mục: xem lịch sử trao đổi / backlog issue nội bộ.
