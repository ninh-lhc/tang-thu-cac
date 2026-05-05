import { describe, expect, it } from 'vitest';
import {
  composeMapTemplateDisplayLine,
  inferMapQuickSystemFromStoredStatus,
  mapQuickInferredTokenMatchesParentPath,
} from './composeMapTemplateDisplayLine.js';

describe('composeMapTemplateDisplayLine', () => {
  const tpl = [
    { id: 'f_title', label: 'Giới' },
    { id: 'f_he_gioi_ban_do', label: 'Quy mô' },
    { id: 'f_vi_tri', label: 'Trực thuộc' },
    { id: 'f_dia_ban', label: 'Địa bàn' },
    { id: 'f_status', label: 'Chuỗi hiển thị' },
  ];

  it('nối theo thứ tự mẫu và chèn đặc tính trước f_vi_tri', () => {
    const dyn = {
      f_title: 'Hạ Giới',
      f_he_gioi_ban_do: 'Vương giới',
      f_vi_tri: 'Băng Ma Tinh',
      f_dia_ban: 'Băng Thiên',
    };
    expect(composeMapTemplateDisplayLine(tpl, dyn, 'Tôn giới')).toBe(
      'Hạ Giới · Vương giới · Tôn giới · Băng Ma Tinh · Băng Thiên'
    );
  });

  it('dedupe đoạn trùng nội dung', () => {
    const dyn = { f_title: 'Hạ Giới', f_he_gioi_ban_do: 'Hạ Giới', f_vi_tri: 'X' };
    expect(composeMapTemplateDisplayLine(tpl, dyn, '')).toBe('Hạ Giới · X');
  });
});

describe('inferMapQuickSystemFromStoredStatus', () => {
  it('bỏ prefix trùng title và realm', () => {
    const dyn = {
      f_title: 'Hạ Giới',
      f_he_gioi_ban_do: 'Vương giới',
      f_status: 'Hạ Giới · Vương giới · Tôn giới · Băng Ma Tinh',
    };
    expect(inferMapQuickSystemFromStoredStatus(dyn)).toBe('Tôn giới');
  });

  it('legacy: không có title trong dữ liệu — lấy phần sau token đầu', () => {
    const dyn = { f_status: 'A · B · C' };
    expect(inferMapQuickSystemFromStoredStatus(dyn)).toBe('B · C');
  });

  it('để trống Đặc tính: không lấy nhầm chuỗi Trực thuộc trong f_status', () => {
    const parent = 'Việt Long Tinh Cầu > Băng Thiên Đại Lục';
    const dyn = {
      f_title: 'Hạ Giới',
      f_he_gioi_ban_do: 'Thành Trì',
      f_vi_tri: parent,
      f_status: `Hạ Giới · Thành Trì · ${parent}`,
    };
    expect(inferMapQuickSystemFromStoredStatus(dyn, parent)).toBe('');
  });

  it('để trống Đặc tính: token đầu chỉ là tiền tố Trực thuộc (f_status tách bằng /) vẫn không suy ra đặc tính', () => {
    const parent = 'Việt Long Tinh Cầu > Băng Thiên Đại Lục';
    const dyn = {
      f_title: 'Hạ Giới',
      f_he_gioi_ban_do: 'Thành Trì',
      f_vi_tri: parent,
      f_status: 'Hạ Giới · Thành Trì · Việt Long Tinh Cầu > Băng / Thiên Đại Lục',
    };
    expect(inferMapQuickSystemFromStoredStatus(dyn, parent)).toBe('');
  });
});

describe('mapQuickInferredTokenMatchesParentPath', () => {
  it('khớp toàn bộ chuỗi Trực thuộc', () => {
    expect(mapQuickInferredTokenMatchesParentPath('A > B', 'A > B')).toBe(true);
  });
  it('khớp tiền tố rồi nối tiếp bằng dấu phân tầng', () => {
    expect(
      mapQuickInferredTokenMatchesParentPath('Việt Long Tinh Cầu > Băng', 'Việt Long Tinh Cầu > Băng Thiên Đại Lục')
    ).toBe(true);
  });
  it('không khớp khi token là đặc tính độc lập', () => {
    expect(mapQuickInferredTokenMatchesParentPath('Tôn giới', 'Việt Long Tinh Cầu > Băng')).toBe(false);
  });
});
