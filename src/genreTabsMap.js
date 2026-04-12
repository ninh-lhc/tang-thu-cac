// ==========================================
// CẤU TRÚC MỤC LỤC THEO THỂ LOẠI (từ cau-truc.txt)
// Dùng khi chọn thể loại + bấm "Tạo cấu trúc theo thể loại"
// ==========================================
import { hydrateTabsAutoSyncConfigs } from './lib/tabAutoSyncFieldMap.js';

const DEFAULT_FIELDS = [
  { id: 'f_status', label: 'Trạng thái / Cấp' },
  { id: 'f_title', label: 'Tên / Danh xưng' },
  { id: 'f_desc', label: 'Mô tả' }
];

const sub = (id, label, fields = DEFAULT_FIELDS) => ({
  id, label, viewType: 'collection-track', tabCon: [], fieldsTemplate: fields
});

const tab = (id, label, iconName, subTabs) => ({
  id, label, iconName, subTabs
});

// Map thể loại GENRES -> cấu trúc tabs (không gồm Tổng Quan)
export const GENRE_TABS_MAP = {
  "Tiên Hiệp": [
    tab('tu-si', 'Tu Sĩ (Nhân Vật)', 'User', [
      sub('thien-menh-chi-tu', 'Thiên Mệnh Chi Tử (NVC)'),
      sub('dao-lu', 'Đạo Lữ'),
      sub('hong-nhan-tri-ky', 'Hồng Nhan Tri Kỷ'),
      sub('sinh-tu-giao', 'Sinh Tử Giao (Huynh đệ)'),
      sub('dong-mon-su-de', 'Đồng Môn Sư Đệ/Sư Muội'),
      sub('tu-dich', 'Tử Địch (Kẻ thù)'),
      sub('phan-dien', 'Phản Diện / Pháo Khôi')
    ]),
    tab('dai-dao', 'Đại Đạo (Tu Luyện)', 'Flame', [
      sub('canh-gioi-tu-vi', 'Cảnh Giới Tu Vi'),
      sub('cong-phap', 'Công Pháp'),
      sub('vo-ky', 'Võ Kỹ'),
      sub('cam-thuat', 'Cấm Thuật'),
      sub('bi-phap', 'Bí Pháp'),
      sub('dac-thu-the-chat', 'Đặc Thù Thể Chất'),
      sub('thai-co-huyet-mach', 'Thái Cổ Huyết Mạch'),
      sub('linh-can', 'Linh Căn'),
      sub('ngo-tinh-thien-phu', 'Ngộ Tính Thiên Phú'),
      sub('thien-phu', 'Thiên Phú')
    ]),
    tab('chu-thien-van-gioi', 'Chư Thiên Vạn Giới (Thế Giới)', 'Globe', [
      sub('tu-tien-gioi', 'Tu Tiên Giới / Phàm Nhân Giới'),
      sub('vi-dien-tinh-vuc', 'Vị Diện / Tinh Vực'),
      sub('thuong-gioi-tien-gioi', 'Thượng Giới / Tiên Giới'),
      sub('cam-dia', 'Cấm Địa'),
      sub('thuong-co-di-tich', 'Thượng Cổ Di Tích')
    ]),
    tab('dinh-cap-the-luc', 'Đỉnh Cấp Thế Lực', 'Hexagon', [
      sub('tong-mon-thanh-dia', 'Tông Môn / Thánh Địa'),
      sub('truong-ton-the-gia', 'Trường Tồn Thế Gia'),
      sub('an-the-tong-mon', 'Ẩn Thế Tông Môn')
    ]),
    tab('ky-tran-di-bao', 'Kỳ Trân Dị Bảo (Vật Phẩm)', 'Swords', [
      sub('phap-bao-tien-khi', 'Pháp Bảo / Tiên Khí'),
      sub('than-binh-loi-khi', 'Thần Binh Lợi Khí'),
      sub('dan-duoc', 'Đan Dược'),
      sub('tien-thao-linh-duoc', 'Tiên Thảo / Linh Dược'),
      sub('thien-tai-dia-bao', 'Thiên Tài Địa Bảo'),
      sub('tran-phap', 'Trận Pháp'),
      sub('linh-phu-bua-chu', 'Linh Phù / Bùa Chú')
    ])
  ],
  "Huyền Huyễn": [
    tab('sinh-linh', 'Sinh Linh (Nhân Vật)', 'User', [
      sub('khi-van-chi-tu', 'Khí Vận Chi Tử (NVC)'),
      sub('dong-bon-khe-uoc-gia', 'Đồng Bọn / Khế Ước Giả'),
      sub('su-ma-tinh-linh', 'Sứ Ma / Tinh Linh'),
      sub('hac-am-cu-dau', 'Hắc Ám Cự Đầu (Phản diện)'),
      sub('ma-vuong-ta-than', 'Ma Vương / Tà Thần')
    ]),
    tab('the-he-luc-luong', 'Thể Hệ Lực Lượng (Sức Mạnh)', 'Flame', [
      sub('ma-phap-chu-ngu', 'Ma Pháp / Chú Ngữ'),
      sub('dau-khi-nguyen-luc', 'Đấu Khí / Nguyên Lực'),
      sub('chuc-nghiep', 'Chức Nghiệp (Pháp sư, Kỵ sĩ...)'),
      sub('than-cach-than-hoa', 'Thần Cách / Thần Hỏa')
    ]),
    tab('vi-dien-dai-luc', 'Vị Diện Đại Lục (Thế Giới)', 'Globe', [
      sub('dai-luc', 'Đại Lục'),
      sub('vuc-sau', 'Vực Sâu (Abyss)'),
      sub('than-quoc-tinh-gioi', 'Thần Quốc / Tinh Giới')
    ]),
    tab('van-toc-quan-dao', 'Vạn Tộc Quần Đảo (Thế Lực)', 'Hexagon', [
      sub('chung-toc', 'Chủng Tộc (Elf, Orc, Dragon...)'),
      sub('de-quoc-vuong-quoc', 'Đế Quốc / Vương Quốc'),
      sub('than-dien-giao-hoi', 'Thần Điện / Giáo Hội'),
      sub('cong-hoi-linh-danh-thue', 'Công Hội Lính Đánh Thuê')
    ]),
    tab('than-vat-ma-vat', 'Thần Vật & Ma Vật', 'Swords', [
      sub('than-khi-thanh-khi', 'Thần Khí / Thánh Khí'),
      sub('than-vat-truyen-thua', 'Thánh Vật Truyền Thừa'),
      sub('ma-thu-cu-long', 'Ma Thú / Cự Long'),
      sub('ma-hach-tinh-mach', 'Ma Hạch / Tinh Mạch'),
      sub('yeu-dan', 'Yêu Đan')
    ])
  ],
  "Ngôn Tình": [
    tab('quan-chung-tuyen', 'Quần Chúng Tuyến (Nhân Vật)', 'User', [
      sub('nu-chu-nam-chu', 'Nữ Chủ / Nam Chủ'),
      sub('bach-nguyet-quang', 'Bạch Nguyệt Quang (Tình đầu)'),
      sub('tra-xanh-bach-lien-hoa', 'Trà Xanh / Bạch Liên Hoa'),
      sub('co-chap-cuong-benh-kieu', 'Cố Chấp Cuồng / Bệnh Kiều'),
      sub('tra-nam-tien-nu', 'Tra Nam / Tiện Nữ'),
      sub('hao-mon-the-gia', 'Hào Môn Thế Gia')
    ]),
    tab('boi-canh-thiet-lap', 'Bối Cảnh Thiết Lập', 'Globe', [
      sub('co-dai-gia-khong', 'Cổ Đại / Giá Không'),
      sub('cung-dinh-hau-tuoc', 'Cung Đình Hầu Tước'),
      sub('do-thi-hao-mon-tong-tai', 'Đô Thị / Hào Môn Tổng Tài'),
      sub('thanh-xuan-vuon-truong', 'Thanh Xuân Vườn Trường')
    ]),
    tab('ai-tinh-tuyen', 'Ái Tình Tuyến (Tình Cảm)', 'BookOpen', [
      sub('ngot-sung-chua-lanh', 'Ngọt Sủng / Chữa Lành'),
      sub('nguoc-tam-nguoc-than', 'Ngược Tâm / Ngược Thân'),
      sub('cuoi-truoc-yeu-sau', 'Cưới Trước Yêu Sau'),
      sub('guong-vo-lai-lanh', 'Gương Vỡ Lại Lành'),
      sub('tu-la-trang', 'Tu La Tràng (Ghen tuông)')
    ]),
    tab('kich-ban-kich-tinh', 'Kịch Bản Kịch Tình (Sự Kiện)', 'ScrollText', [
      sub('trach-dau-gia-dau', 'Trạch Đấu / Gia Đấu'),
      sub('cung-dau-doạt-dich', 'Cung Đấu / Đoạt Đích'),
      sub('va-mat-sang-van', 'Vả Mặt / Sảng Văn (Báo thù)'),
      sub('gioi-giai-tri-showbiz', 'Giới Giải Trí / Showbiz'),
      sub('hac-dao-giao-phong', 'Hắc Đạo Giao Phong')
    ])
  ],
  "Hệ Thống": [
    tab('ban-the-he-thong', 'Bản Thể Hệ Thống', 'Hexagon', [
      sub('nguon-goc-he-thong', 'Nguồn Gốc Hệ Thống'),
      sub('ma-dinh-danh-phien-ban', 'Mã Định Danh / Phiên Bản'),
      sub('tri-nao-he-thong-tinh-linh', 'Trí Não / Hệ Thống Tinh Linh'),
      sub('quyen-han-cap-do', 'Quyền Hạn Cấp Độ')
    ]),
    tab('giao-dien-thuoc-tinh', 'Giao Diện Thuộc Tính', 'BookOpen', [
      sub('ca-nhan-mieu-ta', 'Cá Nhân Miêu Tả (Bảng Stats)'),
      sub('diem-kinh-nghiem', 'Điểm Kinh Nghiệm (EXP)'),
      sub('diem-tich-luy-tien-te', 'Điểm Tích Lũy / Tiền Tệ'),
      sub('dan-hieu', 'Danh Hiệu'),
      sub('do-thuan-thuc', 'Độ Thuần Thục (Kỹ năng)')
    ]),
    tab('chuc-nang-cot-loi', 'Chức Năng Cốt Lõi', 'Flame', [
      sub('he-thong-thuong-thanh', 'Hệ Thống Thương Thành'),
      sub('nhiem-vu-chu-tuyen', 'Nhiệm Vụ Chủ Tuyến'),
      sub('nhiem-vu-chi-nhanh', 'Nhiệm Vụ Chi Nhánh / Ẩn'),
      sub('che-tai-trung-phat', 'Chế Tài Trừng Phạt'),
      sub('gacha-vong-quay-may-man', 'Gacha / Vòng Quay May Mắn')
    ])
  ],
  "Trọng Sinh & Xuyên Không": [
    tab('dong-chay-luan-hoi', 'Dòng Chảy Luân Hồi', 'ScrollText', [
      sub('nguyen-nhan-trung-sinh', 'Nguyên Nhân Trùng Sinh'),
      sub('tien-the-ky-uc', 'Tiền Thế Ký Ức'),
      sub('bat-diem', 'Bát Điểm (Cột mốc trọng sinh)'),
      sub('hieu-ung-canh-buom', 'Hiệu Ứng Cánh Bướm')
    ]),
    tab('nhan-qua-nghiet-duyen', 'Nhân Quả Nghiệt Duyên', 'User', [
      sub('tu-dich-tien-the', 'Tử Địch Tiền Thế'),
      sub('an-nhan-kim-sinh', 'Ân Nhân Kim Sinh'),
      sub('tiec-nuoi-tien-the', 'Tiếc Nuối Tiền Thế'),
      sub('va-mat-phan-dien', 'Vả Mặt Phản Diện')
    ]),
    tab('kim-chi-nam', 'Kim Chỉ Nam (Bàn Tay Vàng)', 'Flame', [
      sub('tien-tri', 'Tiên Tri (Biết trước tương lai)'),
      sub('tien-co-cuop-co-duyen', 'Tiên Cơ / Cướp Cơ Duyên'),
      sub('tuy-than-khong-gian', 'Tùy Thân Không Gian'),
      sub('di-nang-thuc-tinh-som', 'Dị Năng Thức Tỉnh Sớm')
    ])
  ],
  "Đô Thị": [
    tab('do-thi-nhan-vat', 'Đô Thị Nhân Vật', 'User', [
      sub('long-ngao-thien', 'Long Ngạo Thiên (NVC bá đạo)'),
      sub('o-re-cao-thu-xuong-nui', 'Ở Rể / Cao Thủ Xuống Núi'),
      sub('ba-dao-tong-tai', 'Bá Đạo Tổng Tài'),
      sub('bang-son-my-nu-hoa-khoi', 'Băng Sơn Mỹ Nữ / Hoa Khôi'),
      sub('phu-nhi-dai-hoan-kho-di-tu', 'Phú Nhị Đại / Hoàn Khố Di Tử'),
      sub('the-gia-lao-hu', 'Thế Gia Lão Hủ')
    ]),
    tab('dinh-cap-vong-tron', 'Đỉnh Cấp Vòng Tròn (Thế Lực)', 'Hexagon', [
      sub('tu-dai-co-toc', 'Tứ Đại Cổ Tộc / Thế Gia'),
      sub('dinh-cap-tai-phiet', 'Đỉnh Cấp Tài Phiệt'),
      sub('hac-dao-cu-phach', 'Hắc Đạo Cự Phách'),
      sub('the-gioi-ngam-linh-danh-thue', 'Thế Giới Ngầm / Lính Đánh Thuê'),
      sub('cuc-di-nang-long-to', 'Cục Dị Năng / Long Tổ'),
      sub('co-vo-gia-an-mon', 'Cổ Võ Giả / Ẩn Môn')
    ]),
    tab('ban-do-su-nghiep', 'Bản Đồ Sự Nghiệp', 'Globe', [
      sub('thuong-vi-khong-che-kinh-te', 'Thương Vị / Khống Chế Kinh Tế'),
      sub('y-thuat-tien-thien', 'Y Thuật Tiên Thiên'),
      sub('phong-thuy-tuong-thuat', 'Phong Thủy / Tướng Thuật'),
      sub('giam-bao-do-thach', 'Giám Bảo / Đổ Thạch'),
      sub('dau-gia-hoi-cap-cao', 'Đấu Giá Hội Cấp Cao')
    ])
  ],
  "Vô Hạn Lưu": [
    tab('chu-than-khong-gian', 'Chủ Thần Không Gian', 'Hexagon', [
      sub('chu-than-he-thong-mau', 'Chủ Thần / Hệ Thống Mẫu'),
      sub('luan-hoi-dien-quang-truong', 'Luân Hồi Điện / Quảng Trường'),
      sub('khu-vuc-nghi-ngoi', 'Khu Vực Nghỉ Ngơi cá nhân'),
      sub('chu-than-quy-tac', 'Chủ Thần Quy Tắc')
    ]),
    tab('luan-hoi-tieu-doi', 'Luân Hồi Tiểu Đội', 'User', [
      sub('luan-hoi-gia', 'Luân Hồi Giả (Người chơi)'),
      sub('doi-truong', 'Đội Trưởng'),
      sub('tri-gia', 'Trí Giả (Đầu não phân tích)'),
      sub('hoa-luc-thu', 'Hỏa Lực Thủ (Chiến đấu)'),
      sub('nai-ma', 'Nãi Ma (Healer/Hỗ trợ)'),
      sub('tu-chien-tieu-doi', 'Tử Chiến Tiểu Đội (Kẻ thù)')
    ]),
    tab('the-gioi-nhiem-vu', 'Thế Giới Nhiệm Vụ (Phó Bản)', 'Globe', [
      sub('kich-ban-the-gioi', 'Kịch Bản Thế Giới'),
      sub('chan-tuong-nhiem-vu', 'Chân Tướng Nhiệm Vụ'),
      sub('nhiem-vu-sinh-ton', 'Nhiệm Vụ Sinh Tồn'),
      sub('cap-do-ac-mong', 'Cấp Độ Ác Mộng (S, A, B...)')
    ]),
    tab('hoi-doai-cuong-hoa', 'Hối Đoái & Cường Hóa (Đổi Điểm)', 'Flame', [
      sub('diem-sinh-ton-khen-thuong', 'Điểm Sinh Tồn / Khen Thưởng'),
      sub('tien-hoa-huyet-thong', 'Tiến Hóa Huyết Thống'),
      sub('cuong-hoa-the-chat', 'Cường Hóa Thể Chất'),
      sub('ky-nang-cay', 'Kỹ Năng Cây (Skill tree)'),
      sub('di-nang-thuc-tinh', 'Dị Năng Thức Tỉnh'),
      sub('dao-cu-bao-menh', 'Đạo Cụ Bảo Mệnh')
    ])
  ],
  "Võng Du": [
    tab('so-lieu-nhan-vat', 'Số Liệu Nhân Vật', 'User', [
      sub('id-tro-choi', 'ID Trò Chơi'),
      sub('bang-trang-thai', 'Bảng Trạng Thái (Stats)'),
      sub('chuc-nghiep', 'Chức Nghiệp / Chức Nghiệp Ẩn'),
      sub('thien-phu-ky-nang', 'Thiên Phú Kỹ Năng')
    ]),
    tab('trang-bi-than-vat', 'Trang Bị & Thần Vật', 'Swords', [
      sub('than-khi-truyen-thuyet-vu-khi', 'Thần Khí / Truyền Thuyết Vũ Khí'),
      sub('sao-trang', 'Sáo Trang (Set trang bị)'),
      sub('sung-vat-toa-ky', 'Sủng Vật / Tọa Kỵ'),
      sub('do-te-luyen', 'Đồ Tể Luyện (Nguyên liệu)')
    ]),
    tab('tran-doanh-the-luc', 'Trận Doanh Thế Lực', 'Hexagon', [
      sub('dai-cong-hoi', 'Đại Công Hội (Guild)'),
      sub('cau-lac-bo-esport', 'Câu Lạc Bộ Esport'),
      sub('lien-minh-tran-doanh', 'Liên Minh Trận Doanh'),
      sub('npc-the-luc', 'NPC Thế Lực')
    ]),
    tab('cot-truyen-gameplay', 'Cốt Truyện & Gameplay', 'ScrollText', [
      sub('main-quests', 'Main Quests (Nhiệm vụ chính)'),
      sub('chuoi-nhiem-vu-an', 'Chuỗi Nhiệm Vụ Ẩn'),
      sub('phu-ban-bi-canh', 'Phụ Bản (Dungeon) / Bí Cảnh'),
      sub('da-ngoai-boss', 'Dã Ngoại Boss / Thế Giới Boss'),
      sub('lich-su-pk-hong-danh', 'Lịch Sử PK / Hồng Danh'),
      sub('thi-dau-chuyen-nghiep', 'Thi Đấu Chuyên Nghiệp')
    ])
  ],
  "Khoa Huyễn": [
    tab('tinh-te-cuong-vuc', 'Tinh Tế Cương Vực (Thế Giới)', 'Globe', [
      sub('ngan-ha-vi-tinh-he', 'Ngân Hà / Vị Tinh Hệ'),
      sub('trai-dat-co-mau-tinh', 'Trái Đất Cổ / Mẫu Tinh'),
      sub('tinh-te-lien-bang', 'Tinh Tế Liên Bang / Đế Quốc'),
      sub('vuc-ngoai-chung-toc', 'Vực Ngoại Chủng Tộc (Trùng tộc)'),
      sub('co-so-hac-am', 'Cơ Sở Hắc Ám')
    ]),
    tab('hac-khoa-ky', 'Hắc Khoa Kỹ (Công Nghệ)', 'Swords', [
      sub('co-giap', 'Cơ Giáp (Mecha)'),
      sub('tinh-ham-phi-thuyen', 'Tinh Hạm / Phi Thuyền'),
      sub('quang-nao-sieu-ai', 'Quang Não / Siêu AI'),
      sub('vu-khi-phan-vat-chat', 'Vũ Khí Phản Vật Chất'),
      sub('buoc-nhay-khong-gian', 'Bước Nhảy Không Gian / Lỗ Giun')
    ]),
    tab('tien-hoa-lo-tuyen', 'Tiến Hóa Lộ Tuyến', 'Flame', [
      sub('tinh-than-luc', 'Tinh Thần Lực (S, A, B...)'),
      sub('the-thuat-khai-giap-thuat', 'Thể Thuật / Khải Giáp Thuật'),
      sub('gien-dot-bien', 'Gien Đột Biến'),
      sub('dung-hop-duoc-te', 'Dung Hợp Dược Tề'),
      sub('co-the-sinh-hoa', 'Cơ Thế Sinh Hóa (Cyborg)')
    ])
  ],
  "Mạt Thế": [
    tab('ky-nguyen-hac-am', 'Kỷ Nguyên Hắc Ám (Bối Cảnh)', 'Globe', [
      sub('bao-phat-nguy-co', 'Bạo Phát Nguy Cơ'),
      sub('tien-mat-the-hau-mat-the', 'Tiền Mạt Thế / Hậu Mạt Thế'),
      sub('bien-doi-khi-hau', 'Biến Đổi Khí Hậu'),
      sub('phe-tich-van-minh', 'Phế Tích Văn Minh')
    ]),
    tab('nguy-co-tu-phia', 'Nguy Cơ Tứ Phía (Kẻ Địch)', 'Swords', [
      sub('thi-toc-tang-thi-vi-quan', 'Thi Tộc / Tang Thi Vi Quân'),
      sub('di-thu-lanh-chua', 'Dị Thú Lãnh Chúa'),
      sub('ma-hoa-thuc-vat', 'Ma Hóa Thực Vật'),
      sub('ta-ac-nguoi-sinh-ton', 'Tà Ác Người Sinh Tồn')
    ]),
    tab('doanh-trai-sinh-ton', 'Doanh Trại Sinh Tồn (Thế Lực)', 'Hexagon', [
      sub('khu-an-toan-can-cu-dia', 'Khu An Toàn / Căn Cứ Địa'),
      sub('liep-sat-gia', 'Liệp Sát Giả / Lính Đánh Thuê'),
      sub('quan-bo-chinh-phu-tan-du', 'Quân Bộ / Chính Phủ Tàn Dư'),
      sub('the-luc-ton-giao-moi', 'Thế Lực Tôn Giáo Mới')
    ]),
    tab('tinh-hach-vat-tu', 'Tinh Hạch & Vật Tư (Tài Nguyên)', 'Flame', [
      sub('giac-tinh-gia', 'Giác Tỉnh Giả (Người dị năng)'),
      sub('di-nang-phan-he', 'Dị Năng Phân Hệ'),
      sub('tinh-hach-tinh-nguyen', 'Tinh Hạch / Tinh Nguyên'),
      sub('vat-tu-cuu-sinh', 'Vật Tư Cứu Sinh (Thức ăn, nước)'),
      sub('hoa-khi-khi-gioi-lanh', 'Hỏa Khí / Khí Giới Lạnh')
    ])
  ],
  "Đồng Nhân": [
    tab('nguyen-tac-vi-dien', 'Nguyên Tác Vị Diện', 'Globe', [
      sub('canon-world', 'Canon World (Thế giới gốc)'),
      sub('nguyen-tac-thiet-lap', 'Nguyên Tác Thiết Lập'),
      sub('quy-tac-the-gioi', 'Quy Tắc Thế Giới')
    ]),
    tab('nhom-nhan-vat-dong-nhan', 'Nhóm Nhân Vật Đồng Nhân', 'User', [
      sub('canon-character', 'Canon Character (Nhân vật gốc)'),
      sub('original-character', 'Original Character (OC)'),
      sub('bang-hoai-kich-tinh', 'Băng Hoại Kịch Tình (OOC)'),
      sub('ke-xuyen-thu-trong-sinh', 'Kẻ Xuyên Thư / Trọng Sinh')
    ]),
    tab('tuyen-truyen-ma-cai', 'Tuyến Truyện Ma Cải', 'ScrollText', [
      sub('diem-re-nhanh', 'Điểm Rẽ Nhánh'),
      sub('hieu-ung-canh-buom', 'Hiệu Ứng Cánh Bướm'),
      sub('cuu-roi-tuyen', 'Cứu Rỗi Tuyến'),
      sub('hac-hoa-tuyen', 'Hắc Hóa Tuyến'),
      sub('ket-cuc-moi', 'Kết Cục Mới (Alternative Universe)')
    ])
  ],
  "Lịch Sử": [
    tab('thien-ha-dai-the', 'Thiên Hạ Đại Thế (Bối Cảnh)', 'Globe', [
      sub('trieu-dai-ky-nguyen', 'Triều Đại Kỷ Nguyên'),
      sub('de-vuong-thong-tri', 'Đế Vương Thống Trị'),
      sub('loan-the-tranh-hung', 'Loạn Thế Tranh Hùng'),
      sub('phien-tran-cat-cu', 'Phiên Trấn Cát Cứ'),
      sub('quan-hung-truc-loc', 'Quần Hùng Trục Lộc')
    ]),
    tab('vuong-hau-tuong-linh', 'Vương Hầu Tướng Lĩnh (Nhân Vật)', 'User', [
      sub('chan-long-thien-tu', 'Chân Long Thiên Tử'),
      sub('hau-cung-phi-tan', 'Hậu Cung Phi Tần'),
      sub('muu-si-mon-khach', 'Mưu Sĩ / Môn Khách'),
      sub('van-than-vo-tuong', 'Văn Thần / Võ Tướng'),
      sub('man-di-phien-bang', 'Man Di / Phiên Bang'),
      sub('thao-menh-anh-hung', 'Thảo Mãnh Anh Hùng')
    ]),
    tab('lich-su-quy-tich', 'Lịch Sử Quỹ Tích (Sự Kiện)', 'ScrollText', [
      sub('sa-ban-tranh-ba', 'Sa Bàn Tranh Bá (Chiến dịch)'),
      sub('cung-bien-doạt-dich', 'Cung Biến / Đoạt Đích'),
      sub('bien-phap-cai-cach', 'Biến Pháp Cải Cách'),
      sub('khoa-cu-ky', 'Khoa Cử Ký')
    ]),
    tab('chung-dien-co-so', 'Chủng Điền Cơ Sở (Phát Triển)', 'Hexagon', [
      sub('luyen-binh-tri-quan', 'Luyện Binh Trị Quân'),
      sub('cong-trinh-binh-phap', 'Công Trình Binh Pháp'),
      sub('hac-khoa-ky-lich-su', 'Hắc Khoa Kỹ Lịch Sử'),
      sub('nong-thuong-chi-dao', 'Nông Thương Chi Đạo'),
      sub('kien-thiet-tri-sanh', 'Kiến Thiết Trì Sảnh')
    ])
  ],
  "Linh Dị": [
    tab('linh-di-nhan-vat', 'Nhân Vật Linh Dị', 'User', [
      sub('nguoi-song', 'Người Sống'),
      sub('linh-the-ma-quy', 'Linh Thể / Ma Quỷ'),
      sub('phan-dien', 'Phản Diện'),
      sub('phu-tro', 'Nhân Vật Phụ')
    ]),
    tab('boi-canh-kinh-di', 'Bối Cảnh Kinh Dị', 'Globe', [
      sub('dia-diem-ma-am', 'Địa Điểm Ma Ám'),
      sub('quy-tac-sinh-ton', 'Quy Tắc Sinh Tồn'),
      sub('bi-mat-the-gioi', 'Bí Mật Thế Giới')
    ]),
    tab('su-kien-truyen-thuyet', 'Sự Kiện & Truyền Thuyết', 'ScrollText', [
      sub('su-kien-bat-thuong', 'Sự Kiện Bất Thường'),
      sub('truyen-thuyet-urban', 'Truyền Thuyết Urban'),
      sub('loi-nguyen-linh-hon', 'Lời Nguyền / Linh Hồn')
    ])
  ]
};

const TONG_QUAN = { id: 'tong-quan', label: 'Tổng Quan', iconName: 'BookOpen', subTabs: [], isFixed: true };

/** Thứ tự hiển thị nhóm chức năng. */
export const TAB_GROUP_ORDER = ['Nhân Vật', 'Tu Luyện / Sức mạnh', 'Thế Giới', 'Thế Lực', 'Vật Phẩm / Kỹ thuật', 'Sự Kiện / Cốt truyện', 'Khác'];

/** Map tab id -> nhóm chức năng (để gộp Tu Sĩ + Sinh Linh vào "Nhân Vật", v.v.). */
export const TAB_GROUP_MAP = {
  'tu-si': 'Nhân Vật', 'sinh-linh': 'Nhân Vật', 'quan-chung-tuyen': 'Nhân Vật', 'nhan-qua-nghiet-duyen': 'Nhân Vật',
  'do-thi-nhan-vat': 'Nhân Vật', 'luan-hoi-tieu-doi': 'Nhân Vật', 'so-lieu-nhan-vat': 'Nhân Vật',
  'vuong-hau-tuong-linh': 'Nhân Vật', 'linh-di-nhan-vat': 'Nhân Vật', 'nhom-nhan-vat-dong-nhan': 'Nhân Vật',
  'dai-dao': 'Tu Luyện / Sức mạnh', 'the-he-luc-luong': 'Tu Luyện / Sức mạnh', 'chuc-nang-cot-loi': 'Tu Luyện / Sức mạnh',
  'kim-chi-nam': 'Tu Luyện / Sức mạnh', 'hoi-doai-cuong-hoa': 'Tu Luyện / Sức mạnh', 'tien-hoa-lo-tuyen': 'Tu Luyện / Sức mạnh',
  'tinh-hach-vat-tu': 'Tu Luyện / Sức mạnh',
  'chu-thien-van-gioi': 'Thế Giới', 'vi-dien-dai-luc': 'Thế Giới', 'boi-canh-thiet-lap': 'Thế Giới',
  'ban-do-su-nghiep': 'Thế Giới', 'the-gioi-nhiem-vu': 'Thế Giới', 'tinh-te-cuong-vuc': 'Thế Giới',
  'ky-nguyen-hac-am': 'Thế Giới', 'nguyen-tac-vi-dien': 'Thế Giới', 'thien-ha-dai-the': 'Thế Giới', 'boi-canh-kinh-di': 'Thế Giới',
  'dinh-cap-the-luc': 'Thế Lực', 'van-toc-quan-dao': 'Thế Lực', 'ban-the-he-thong': 'Thế Lực',
  'dinh-cap-vong-tron': 'Thế Lực', 'chu-than-khong-gian': 'Thế Lực', 'tran-doanh-the-luc': 'Thế Lực',
  'doanh-trai-sinh-ton': 'Thế Lực', 'chung-dien-co-so': 'Thế Lực',
  'ky-tran-di-bao': 'Vật Phẩm / Kỹ thuật', 'than-vat-ma-vat': 'Vật Phẩm / Kỹ thuật', 'trang-bi-than-vat': 'Vật Phẩm / Kỹ thuật',
  'hac-khoa-ky': 'Vật Phẩm / Kỹ thuật', 'nguy-co-tu-phia': 'Vật Phẩm / Kỹ thuật',
  'ai-tinh-tuyen': 'Sự Kiện / Cốt truyện', 'kich-ban-kich-tinh': 'Sự Kiện / Cốt truyện', 'dong-chay-luan-hoi': 'Sự Kiện / Cốt truyện',
  'cot-truyen-gameplay': 'Sự Kiện / Cốt truyện', 'lich-su-quy-tich': 'Sự Kiện / Cốt truyện', 'su-kien-truyen-thuyet': 'Sự Kiện / Cốt truyện',
  'tuyen-truyen-ma-cai': 'Sự Kiện / Cốt truyện',
  'giao-dien-thuoc-tinh': 'Khác',
  'nhan-vat': 'Nhân Vật', 'tu-luyen': 'Tu Luyện / Sức mạnh', 'the-gioi': 'Thế Giới',
  'the-luc': 'Thế Lực', 'vu-khi': 'Vật Phẩm / Kỹ thuật', 'tai-nguyen': 'Vật Phẩm / Kỹ thuật'
};

function mergeSubTabs(a, b) {
  const byId = new Map();
  for (const s of a) byId.set(s.id, { ...s });
  for (const s of b) {
    if (!byId.has(s.id)) byId.set(s.id, { ...s });
  }
  return Array.from(byId.values());
}

/** Gộp cấu trúc mục lục theo danh sách thể loại đã chọn. Thêm _group, _genre cho UI gom nhóm. */
export function mergeTabsByGenres(genres) {
  if (!Array.isArray(genres) || genres.length === 0) return null;
  const merged = new Map(); // id -> tab
  for (const genre of genres) {
    const tabs = GENRE_TABS_MAP[genre];
    if (!tabs) continue;
    for (const t of tabs) {
      const group = TAB_GROUP_MAP[t.id] || 'Khác';
      const existing = merged.get(t.id);
      if (existing) {
        existing.subTabs = mergeSubTabs(existing.subTabs, t.subTabs);
      } else {
        merged.set(t.id, { ...t, subTabs: t.subTabs.map(s => ({ ...s })), _group: group, _genre: genre });
      }
    }
  }
  const result = hydrateTabsAutoSyncConfigs([TONG_QUAN, ...Array.from(merged.values())]).tabsConfig;
  return result.length > 1 ? result : null;
}
