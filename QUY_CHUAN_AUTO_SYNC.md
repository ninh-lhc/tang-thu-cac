# Quy chuẩn Auto Sync & Ghi chép chi tiết

Tai lieu nay la "ban quy tac van hanh" cho luong:

`Tao moi the -> mo giao dien ghi chep chi tiet -> hien mau nhap san theo tab -> cap nhat auto dong bo`

Muc tieu:

- Khong bat nguoi dung viet tu dau.
- Khong de auto de len phan ghi chu tay.
- Moi tab co mau nhap phu hop voi cach phan loai cua no.
- Khi sua/xoa/doi ten, he thong chi dong bo phan AUTO co lien quan.

## 1. Luong dung chuan

### 1.1 Khi tao moi the

1. Mo modal `Khai tao / Khoi tao the`.
2. Nhap nhanh cac truong co ban:
   - `Danh xung / Ten goi`
   - `Pham cap` hoac `Trang thai` neu tab can
   - `Biet danh / Ten khac`
   - `Hinh anh` neu co
3. Bam `Luu`.
4. He thong tu dong:
   - tao the moi,
   - chuyen sang giao dien `Ghi Chep Chi Tiet`,
   - nap san mau nhap theo tab/subtab hien tai.

### 1.2 Trong giao dien ghi chep chi tiet

Mau duoc chia lam 2 khoi:

- `Phan thu cong`:
  - noi dung ban tu viet, tu dieu chinh.
  - co the xoa dong khong can, them dong moi neu thieu.
- `Phan AUTO`:
  - noi dung he thong sinh ra va cap nhat.
  - khong sua tay neu khong can thiet.

Nguyen tac:

- Phan thu cong la nguon ghep noi dung chinh.
- Phan AUTO chi chua du lieu da quy tac hoa.
- Neu auto va tay trung nhau, phan tay uu tien duoc giu nguyen.

## 2. Cach AUTO lam viec

### 2.1 Khi tao the moi

- Tu dong sinh template ghi chep theo tab hien tai.
- Neu the co field co san, template se dien san gia tri.
- Neu field chua co, template de trong de ban dien sau.

### 2.2 Khi sua the

- Doi ten the:
  - cap nhat cac lien ket auto co lien quan.
  - khong xoa ghi chép tay.
- Doi field:
  - field nao nam trong AUTO block thi cap nhat field do.
  - phan thu cong giu nguyen.

### 2.3 Khi xoa the

- Xoa the goc.
- Xoa cac dong AUTO da sinh ra tu the do.
- Khong xoa khung ghi chép tay neu trong boi canh chung van con the/chuong nay.

### 2.4 Khi gap du lieu mo hoac trung ten

- Khong auto gan bua.
- Dua vao nhom `Chua phan loai` hoac giu trang thai can xac nhan.
- Uu tien dung hon la doan sai.

## 3. Cau truc mau nhap

Mau nen co dang:

```text
## Mau nhap nhanh
> Xoa dong khong can, them dong neu thieu.

- Truong 1: ...
- Truong 2: ...
- Truong 3: ...

## Ghi chep chi tiet

Noi dung mo ta dai, tu do viet tay.

## AUTO

... khong sua tay neu khong can ...
```

Nguyen tac:

- Moi dong chi nen chua 1 y chinh.
- Truong nao khong dung thi xoa dong do.
- Truong nao thieu thi them dong moi.
- Khong nhat thiet phai giu dung so dong co dinh.

## 4. Quy tac nhap de AUTO chinh xac

### 4.1 Quyen tac chung

- `Ten chinh` phai la ten on dinh, co dau, dung ngu phap.
- `Biet danh` tach bang `,` hoac `/` hoac `|`.
- `Trang thai / Pham cap` chi nen la nhan ky thuat ngan gon.
- Khong nhat bo mot doan van dai vao field danh cho may doc.
- Field nao la field nao, dung dung vai tro field do.

### 4.2 Trinh tu uu tien khi nhap

1. Ten chinh.
2. Pham cap / trang thai ngan gon.
3. Danh sach phan loai / thuoc tinh.
4. Mo ta dai o phan ghi chep.

### 4.3 Khi nhap trong chuoi lien ket tu dong

Dung format ngan gon, ro rang:

- `Ten nhan vat (so chuong) ?`
- `Ten nhan vat (so chuong) !`
- `Ten nhan vat (so chuong) !!`

Y nghia:

- `?` = chua chac / muc do nhe
- `!` = quan trong
- `!!` = rat quan trong
- `...` = con tiep dien
- `x` = bo qua

## 5. Quy tac theo tung nhom tab

### 5.1 Nhan vat

Nen uu tien cac truong:

- `f_status`: canh gioi / trang thai.
- `f_title`: danh hieu / vai tro.
- `f_linh_can`: linh can / thien phu.
- `f_the_chat`: the chat.
- `f_cong_phap`: cong phap chinh.
- `f_vu_khi`: phap bao / vu khi.
- `f_to_chuc`: the luc / tong mon.
- `f_quan_he`: quan he voi nhan vat khac.
- `f_desc`: mo ta tinh cach / ghi chu.

### 5.2 Nhan vat lien quan

Nen nhap:

- `f_quan_he`: `Dao lu`, `Than nhan`, `Huynh de`, `De tu`, `Su do`, `Ban be`.

Chu y:

- Nếu tab co quan he ro, nen ghi ngan gon.
- Khong viet thanh doan van.

### 5.3 The luc

Nen uu tien cac truong:

- `f_status`: cap bac / hang.
- `f_title`: chinh / ta / the che.
- `f_cap`: quy mo.
- `f_dia_ban`: dia ban chinh.
- `f_desc`: dac trung.

Quy tac:

- Nguoi dung chi can nhap ngan gon trong `f_status`.
- Dia ban nen ghi thanh chuoi ro rang, theo thu tu `gan -> xa`.

### 5.4 Ban do / dia danh

Nen uu tien cac truong:

- `f_status`: muc nguy hiem / cap.
- `f_title`: loai dia danh.
- `f_vi_tri`: chuoi vi tri / chuoi cha con.
- `f_co_duyen`: kho bau / co duyen.
- `f_desc`: mo ta.

Quy tac:

- Vi tri nen viet theo chain ro rang.
- Neu co nhieu tang, viet tu trong ra ngoai hoac theo quy tac da dung chung cua tab do.

### 5.5 Cong phap / Vu ky

Nen uu tien cac truong:

- `f_status`: canh gioi yeu cau / pham cap.
- `f_title`: phan loai.
- `f_loai`: thuoc tinh / he.
- `f_cap`: pham giai.
- `f_desc`: cong nang.

Quy tac:

- Giữ mot bang cap bac on dinh.
- Vi du: `Linh -> Huyen -> Dia -> Thien` hoac thu tu nguoc lai, nhung phai thong nhat toan he thong.

### 5.6 Di thuoc tinh

Nen uu tien cac truong:

- `f_title`: ten thuoc tinh chinh.
- `f_status`: do hiem / cap.
- `f_desc`: dac diem / cong dung.

Quy tac sap xep:

- Nen co mot thu tu co dinh, vi du:
  - `Bang`
  - `Hoa`
  - `Phong`
  - `Loi`
  - `Moc`
  - `Thuy`
  - `Tho`
  - `Am`
  - `Duong`

### 5.7 He thong tu luyen / canh gioi

Nen uu tien cac truong:

- `f_status`: chuoi canh gioi ngan gon.
- `f_title`: ten he / ten cap.
- `f_dieu_kien`: dieu kien dot pha.
- `f_dac_quyen`: dac quyen / nang luc.
- `f_desc`: dac diem nhan dang.

Quy tac nhap:

- Viet `f_status` ngan gon, it chu thich.
- Nhanh nhat la dung mot format co dinh.

### 5.8 Phap bao / binh khi

Nen uu tien cac truong:

- `f_status`: pham cap.
- `f_title`: loai vat pham.
- `f_chu`: chu nhan / nguoi so huu.
- `f_linh_the`: linh the / tinh linh.
- `f_desc`: cong nang.

### 5.9 Cac tab he thong khac

Nen uu tien cac truong theo nghia chung:

- `f_status`: trang thai / cap / do kho.
- `f_title`: loai / nhan.
- `f_dieu_kien`: dieu kien.
- `f_desc`: mo ta.

## 6. Mau thuc hanh nhanh

### 6.1 Khi tao mot cong phap

```text
Ten: Huyen Thuy Quyet
f_status: Thien giai
f_title: Cong phap
f_loai: Thuy he
f_cap: Trung pham
f_desc: ...
```

### 6.2 Khi tao mot dia danh

```text
Ten: Huyet Hoang Dia
f_status: Tieu the gioi
f_title: Dia danh
f_vi_tri: Huyet Gioi - Huyet Hoang Dia
f_desc: ...
```

### 6.3 Khi tao mot the luc

```text
Ten: Huyet Linh Tong
f_status: Bat cap the luc
f_title: Tong mon
f_cap: Quy mo lon
f_dia_ban: Huyet Gioi - Huyet Hoang Dia
f_desc: ...
```

## 7. Nguyen tac quan trong nhat

1. Phan tay luon duoc uu tien giu nguyen.
2. AUTO chi cap nhat phan ma no quan ly.
3. Chuoi nhap cang ngan gon va on dinh thi AUTO cang chinh xac.
4. Khi khong chac thi de `Chua phan loai` hon la doan sai.
5. Moi tab co the co mot quy tac rieng, nhung cach nhap phai dong bo.

---

Tai lieu nay co the duoc coi la "spec" cho he thong auto sync hien tai. Neu can, co the bo sung them mot bang:

- tab nao
- field nao la chinh
- field nao AUTO se sinh
- field nao la manual

de dung nhu checklist khi them tab moi.
