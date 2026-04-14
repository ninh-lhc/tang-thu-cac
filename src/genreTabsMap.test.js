import { describe, expect, it } from 'vitest';
import { mergeTabsByGenres, normalizeGenreSubTabId } from './genreTabsMap.js';

function getSubTab(tabsConfig, tabId, subId) {
  const tab = tabsConfig.find((item) => item.id === tabId);
  expect(tab, `Missing tab ${tabId}`).toBeTruthy();
  const subTab = tab.subTabs.find((item) => item.id === subId);
  expect(subTab, `Missing sub-tab ${tabId}::${subId}`).toBeTruthy();
  return subTab;
}

describe('mergeTabsByGenres', () => {
  it.each([
    ['Huyền Huyễn', 'the-he-luc-luong', 'ma-phap-chu-ngu', 'Hệ / trường phái'],
    ['Ngôn Tình', 'quan-chung-tuyen', 'nu-chu-nam-chu', 'Vai trò tình cảm'],
    ['Hệ Thống', 'ban-the-he-thong', 'nguon-goc-he-thong', 'Quyền hạn / cấp truy cập'],
    ['Trọng Sinh & Xuyên Không', 'kim-chi-nam', 'tien-tri', 'Loại cơ duyên'],
    ['Đô Thị', 'do-thi-nhan-vat', 'long-ngao-thien', 'Thân phận / nghề nghiệp'],
    ['Vô Hạn Lưu', 'the-gioi-nhiem-vu', 'kich-ban-the-gioi', 'Chân tướng / quy tắc'],
    ['Võng Du', 'so-lieu-nhan-vat', 'chuc-nghiep', 'Class / nghề'],
    ['Khoa Huyễn', 'hac-khoa-ky', 'co-giap', 'Tier / cấp công nghệ'],
    ['Mạt Thế', 'tinh-hach-vat-tu', 'giac-tinh-gia', 'Cấp thức tỉnh'],
    ['Đồng Nhân', 'nhom-nhan-vat-dong-nhan', 'canon-character', 'Vai trò canon / AU'],
    ['Lịch Sử', 'lich-su-quy-tich', 'sa-ban-tranh-ba', 'Loại sự kiện'],
    ['Linh Dị', 'boi-canh-kinh-di', 'dia-diem-ma-am', 'Quy tắc / cấm kỵ'],
  ])('gắn field template theo ngữ cảnh cho %s', (genre, tabId, subId, expectedLabel) => {
    const tabsConfig = mergeTabsByGenres([genre]);
    const subTab = getSubTab(tabsConfig, tabId, subId);
    const labels = subTab.fieldsTemplate.map((field) => field.label);
    expect(labels).toContain(expectedLabel);
    expect(labels).not.toEqual(['Trạng thái / Cấp', 'Tên / Danh xưng', 'Mô tả']);
  });

  it('không để sub-tab id trùng nhau ghi đè field khác ngữ cảnh', () => {
    const tabsConfig = mergeTabsByGenres(['Huyền Huyễn', 'Võng Du']);
    const fantasyCareer = getSubTab(tabsConfig, 'the-he-luc-luong', 'chuc-nghiep');
    const gameClass = getSubTab(tabsConfig, 'so-lieu-nhan-vat', 'chuc-nghiep');

    expect(fantasyCareer.fieldsTemplate.map((field) => field.label)).toContain('Hệ / trường phái');
    expect(gameClass.fieldsTemplate.map((field) => field.label)).toContain('Class / nghề');
  });

  it('hydrate sẵn main-character link cho genre ngoài tiên hiệp', () => {
    const tabsConfig = mergeTabsByGenres(['Ngôn Tình']);
    const mainLead = getSubTab(tabsConfig, 'quan-chung-tuyen', 'nu-chu-nam-chu');
    const moonlight = getSubTab(tabsConfig, 'quan-chung-tuyen', 'bach-nguyet-quang');

    expect(mainLead.autoSyncRole).toBe('nhan-vat-chinh');
    expect(mainLead.autoSyncTargetPaths).toEqual(expect.arrayContaining([
      'quan-chung-tuyen::bach-nguyet-quang',
      'quan-chung-tuyen::tra-xanh-bach-lien-hoa',
      'quan-chung-tuyen::co-chap-cuong-benh-kieu',
      'quan-chung-tuyen::tra-nam-tien-nu',
      'quan-chung-tuyen::hao-mon-the-gia',
    ]));
    expect(moonlight.autoSyncRole).toBe('nhan-vat-lien-quan');
  });

  it('gắn sẵn preset AUTO main-character cho Đô Thị khi tạo cây mới', () => {
    const tabsConfig = mergeTabsByGenres(['Đô Thị']);
    const mainLead = getSubTab(tabsConfig, 'do-thi-nhan-vat', 'long-ngao-thien');
    const related = getSubTab(tabsConfig, 'do-thi-nhan-vat', 'ba-dao-tong-tai');

    expect(mainLead.autoSyncRole).toBe('nhan-vat-chinh');
    expect(mainLead.autoSyncTargetPaths).toEqual(expect.arrayContaining([
      'do-thi-nhan-vat::o-re-cao-thu-xuong-nui',
      'do-thi-nhan-vat::ba-dao-tong-tai',
      'do-thi-nhan-vat::bang-son-my-nu-hoa-khoi',
    ]));
    expect(related.autoSyncRole).toBe('nhan-vat-lien-quan');
  });

  it('gắn sẵn preset AUTO main-character cho Đồng Nhân/Linh Dị khi tạo cây mới', () => {
    const fanficTabs = mergeTabsByGenres(['Đồng Nhân']);
    const canon = getSubTab(fanficTabs, 'nhom-nhan-vat-dong-nhan', 'canon-character');
    expect(canon.autoSyncRole).toBe('nhan-vat-chinh');
    expect(canon.autoSyncTargetPaths).toEqual(expect.arrayContaining([
      'nhom-nhan-vat-dong-nhan::original-character',
      'nhom-nhan-vat-dong-nhan::bang-hoai-kich-tinh',
    ]));

    const horrorTabs = mergeTabsByGenres(['Linh Dị']);
    const survivor = getSubTab(horrorTabs, 'linh-di-nhan-vat', 'nguoi-song');
    const villain = getSubTab(horrorTabs, 'linh-di-nhan-vat', 'phan-dien');
    expect(survivor.autoSyncRole).toBe('nhan-vat-chinh');
    expect(survivor.autoSyncTargetPaths).toEqual(expect.arrayContaining([
      'linh-di-nhan-vat::phan-dien',
      'linh-di-nhan-vat::phu-tro',
    ]));
    expect(villain.autoSyncRole).toBe('nhan-vat-lien-quan');
  });

  it('gắn sẵn preset AUTO thế lực ↔ bản đồ cho truyện mới theo thể loại', () => {
    const fantasyTabs = mergeTabsByGenres(['Huyền Huyễn']);
    const force = getSubTab(fantasyTabs, 'van-toc-quan-dao', 'de-quoc-vuong-quoc');
    const map = getSubTab(fantasyTabs, 'vi-dien-dai-luc', 'dai-luc');
    expect(force.autoSyncRole).toBe('the-luc');
    expect(force.autoSyncTargetPaths).toEqual(expect.arrayContaining([
      'vi-dien-dai-luc::dai-luc',
    ]));
    expect(map.autoSyncRole).toBe('ban-do');

    const urbanTabs = mergeTabsByGenres(['Đô Thị']);
    const urbanForce = getSubTab(urbanTabs, 'dinh-cap-vong-tron', 'tu-dai-co-toc');
    const urbanMap = getSubTab(urbanTabs, 'ban-do-su-nghiep', 'thuong-vi-khong-che-kinh-te');
    expect(urbanForce.autoSyncRole).toBe('the-luc');
    expect(urbanForce.autoSyncTargetPaths).toEqual(expect.arrayContaining([
      'ban-do-su-nghiep::thuong-vi-khong-che-kinh-te',
    ]));
    expect(urbanMap.autoSyncRole).toBe('ban-do');
  });

  it('normalize id legacy có dấu sang slug ASCII', () => {
    expect(normalizeGenreSubTabId('cung-dau-doạt-dich')).toBe('cung-dau-doat-dich');
    expect(normalizeGenreSubTabId('cung-bien-doạt-dich')).toBe('cung-bien-doat-dich');
    expect(normalizeGenreSubTabId('cung-bien-doat-dich')).toBe('cung-bien-doat-dich');
  });
});
