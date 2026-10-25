# TTC-Query (MVP)

Block Markdown read-only trong ghi chép chi tiết — tương tự Dataview cơ bản.

## Cú pháp

````markdown
```ttc-query
VIEW TABLE | VIEW LIST
FROM entity
WHERE ...          (tùy chọn, nối bằng AND)
SELECT field, ...
SORT field ASC|DESC
LIMIT n            (mặc định 50, tối đa 500)
```
````

Keyword không phân biệt hoa thường. Query chỉ **render ở preview/read**; Markdown nguồn giữ nguyên.

Có thể chèn block bằng nút **Tạo bảng** khi đang sửa ghi chép. Builder lấy field từ template đã resolve của tab (nhãn theo tab con đang chọn), field kế thừa tab lớn, mọi key `dynamicData` trong phạm vi, và field ảo/hệ thống. Nhãn hiển thị không ghi vào Markdown; source vẫn dùng field ID và `folderPath` / `parentFolder`. Block **`ttc-data`** (xem dưới) chỉ phục vụ engine query khi chạy block — chưa liệt kê trong Builder.

## Block dữ liệu có cấu trúc (`ttc-data`)

Khi người dùng dán nội dung từ NotebookLM (bảng, wiki-link, văn bản dài), TTC-Query **không** tự đoán field từ Markdown tự do. Thay vào đó, đặt JSON trong fence:

````markdown
```ttc-data
{
  "f_level": 3,
  "f_status": "alive",
  "f_faction": "[[Tông Môn A]]",
  "f_skills": [
    "[[Hỏa Cầu]]",
    "[[Băng Phong]]"
  ]
}
```
````

- Block nằm trong **ghi chép entity** (`entity.info`), cùng file Markdown với `ttc-query`.
- Chỉ **JSON hợp lệ**, parse bằng `JSON.parse` — không eval, không JavaScript.
- Nhiều block trong một ghi chép: gộp phẳng; block **sau** ghi đè key trùng.
- **Ưu tiên đọc:** `dynamicData` trên thẻ → key trong `ttc-data` → `f_status` / `f_title` / `f_desc` legacy.
- Giá trị wiki (`[[Tên]]`) giữ nguyên chuỗi; preview bảng query vẫn xử lý wiki ở cột `entity`, các cột khác hiển thị text/JSON như dữ liệu thô.
- Query Builder nhóm các cột chỉ có trong ghi chép: **Cột từ block ttc-data (ghi chép)**.

## Field ảo

| Field | Ý nghĩa query (ổn định) | Hiển thị cột |
|--------|-------------------------|--------------|
| `entity` | Tên hiện tại (`entity.name`) | Wiki-link qua `entityMap` |
| `id` | `entity.id` | Chuỗi |
| `type` | **nhoId** — id tab con | Label tab con (`tabsConfig`, chỉ UI) |
| `nhoId` | Id tab con (cùng giá trị với `type`) | Slug |
| `lonId` | Id tab lớn | Slug |
| `parentFolder` | Alias của `lonId` | Slug tab lớn |
| `folderPath` | `` `${lonId}/${nhoId}` `` | Chuỗi |
| `folder` | Alias của `folderPath` | Chuỗi |

### Semantics lọc theo tab

- **`type` / `nhoId`**: WHERE chỉ so với **nhoId** (tab con). Ví dụ: `WHERE type = "long-ngao-thien"`.
- **`lonId` / `parentFolder`**: WHERE chỉ so với **lonId** (tab lớn). Ví dụ: `WHERE parentFolder = "do-thi-nhan-vat"`.
- Không dùng **label tiếng Việt** làm định danh query.

**Breaking change (MVP):** `WHERE type = "<lonId>"` **không** còn lọc tab lớn. Dùng `parentFolder` hoặc `lonId`.

Field còn lại: `dynamicData[f_*]`, key JSON trong block **`ttc-data`** của ghi chép, và `f_status` / `f_title` / `f_desc`.

## Lỗi vs không có kết quả

| Tình huống | Hành vi |
|------------|---------|
| Field **WHERE / SORT / SELECT** không tồn tại | Khối lỗi đỏ + gợi ý field gần giống (nếu có). **Không** render cột cho field sai. |
| Field SELECT **tồn tại**, mọi thẻ **rỗng** giá trị | Query hợp lệ; cột hiển thị ô trống (khác với field không tồn tại). |
| Field tồn tại, điều kiện hợp lệ, **0 dòng** | Khối xám *「Không có kết quả phù hợp」* (`data-ttc-query-status="no_match"`) |
| Field tồn tại nhưng mọi entity **rỗng** (WHERE) | Vẫn query hợp lệ; `IS EMPTY` / `=` khớp theo giá trị rỗng |

Field **tồn tại** nếu: field ảo, `f_status`/`f_title`/`f_desc`, có trong `fieldsTemplate` của novel, có key trên ít nhất một thẻ `dynamicData`, hoặc có key trong block `ttc-data` của ít nhất một ghi chép entity.

## Toán tử WHERE

`=`, `!=`, `>`, `<`, `>=`, `<=`, `CONTAINS`, `IS EMPTY`, `IS NOT EMPTY` — chỉ kết hợp `AND`.

## Giới hạn

- Chỉ novel đang mở (`activeNovelData`).
- Không eval / JavaScript / ghi dữ liệu.
- Chưa hỗ trợ: OR, ngoặc, backlink, timeline, DataviewJS, query đa novel.

## Ví dụ

```ttc-query
VIEW TABLE
FROM entity
WHERE type = "long-ngao-thien" AND f_status = "alive"
SELECT entity, f_alias, f_level
SORT f_level DESC
LIMIT 50
```

Lọc theo tab lớn:

```ttc-query
VIEW LIST
FROM entity
WHERE parentFolder = "do-thi-nhan-vat"
SELECT entity, folderPath
LIMIT 100
```
