import { describe, expect, it } from 'vitest';
import {
  compareOutlineStrings,
  outlineToSortTuple,
  resolveAutoListOutlineFieldId,
} from './outlineListOrder.js';

describe('outlineListOrder', () => {
  it('La Mã I trước II; trước số thuần', () => {
    expect(compareOutlineStrings('I', 'II')).toBeLessThan(0);
    expect(compareOutlineStrings('II', 'I')).toBeGreaterThan(0);
    expect(compareOutlineStrings('I', '1')).toBeLessThan(0);
  });

  it('số 1 trước 2; 1 trước 1.1', () => {
    expect(compareOutlineStrings('1', '2')).toBeLessThan(0);
    expect(compareOutlineStrings('1', '1.1')).toBeLessThan(0);
    expect(compareOutlineStrings('1.1', '1.2')).toBeLessThan(0);
    expect(compareOutlineStrings('2.1', '10.1')).toBeLessThan(0);
  });

  it('I.1 trước II', () => {
    expect(compareOutlineStrings('I.1', 'II')).toBeLessThan(0);
  });

  it('chuỗi rỗng / không hợp lệ xếp sau khi so với hợp lệ', () => {
    expect(compareOutlineStrings('', 'I')).toBeGreaterThan(0);
    expect(compareOutlineStrings('I', '')).toBeLessThan(0);
    expect(compareOutlineStrings('???', '1')).toBeGreaterThan(0);
  });

  it('resolveAutoListOutlineFieldId', () => {
    expect(resolveAutoListOutlineFieldId({})).toBe('f_muc_luc_danh_sach');
    expect(resolveAutoListOutlineFieldId({ autoListOutlineFieldId: '' })).toBe('f_muc_luc_danh_sach');
    expect(resolveAutoListOutlineFieldId({ autoListOutlineFieldId: 'f_custom' })).toBe('f_custom');
    expect(resolveAutoListOutlineFieldId({ autoListOutlineFieldId: '__off__' })).toBe('');
  });

  it('outlineToSortTuple trả null cho không parse được', () => {
    expect(outlineToSortTuple('')).toBe(null);
    expect(outlineToSortTuple('??')).toBe(null);
  });
});
