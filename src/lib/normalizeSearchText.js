// Muc dich: chuan hoa chuoi cho cac luong tim kiem tieng Viet trong app.
// Import boi: library search, deep search, collection query, network search.
// Luu y: chi dung cho so khop/index; khong dung de hien thi ra UI.

import { safeString } from './entityFieldValue.js';

export function normalizeSearchText(value) {
  return safeString(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}
