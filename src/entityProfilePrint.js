/**
 * Printable entity profile template + popup writer.
 * Keeps App.jsx focused on orchestration, not long HTML-string construction.
 * Used by App export action in collection detail.
 */

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getEntityFieldValue(entity, fieldId) {
  if (entity?.dynamicData?.[fieldId]) return entity.dynamicData[fieldId];
  if (fieldId === 'f_status') return entity?.status || '';
  if (fieldId === 'f_title') return entity?.title || '';
  if (fieldId === 'f_desc') return entity?.description || '';
  return '';
}

function buildEntityProfilePrintHtml({ entity, fields, novelTitle, tabLabel }) {
  const fieldsHTML = (fields || [])
    .map((field) => {
      const val = getEntityFieldValue(entity, field.id);
      if (!val) return '';
      return `<div class="field-row"><div class="field-label">${escapeHtml(field.label)}</div><div class="field-value">${escapeHtml(val)}</div></div>`;
    })
    .filter(Boolean)
    .join('');

  const milestonesHTML = (entity?.milestones || [])
    .slice()
    .sort((a, b) => Number(a?.chapter || 0) - Number(b?.chapter || 0))
    .map((ms) => {
      const title = escapeHtml(ms?.title || '');
      const eventHtml = escapeHtml(ms?.event || '').replace(/\n/g, '<br/>');
      return `<div class="milestone"><div class="ms-chapter">Chương ${escapeHtml(ms?.chapter)}</div>${title ? `<div class="ms-title">${title}</div>` : ''}<div class="ms-event">${eventHtml}</div></div>`;
    })
    .join('');

  const infoHTML = escapeHtml(entity?.info || '').replace(/\n/g, '<br/>');
  const firstFieldVal = fields?.[0] ? getEntityFieldValue(entity, fields[0].id) : '';

  return '<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><meta name="language" content="vi-VN"><title>Hồ Sơ: '
    + escapeHtml(entity?.name || '')
    + '</title><style>'
    + '@import url(\'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&family=Playfair+Display:wght@700;800&family=Noto+Sans:wght@400;500;600;700&family=Noto+Serif:ital,wght@0,400;0,700;1,400;1,700&display=swap\');'
    + '* { box-sizing: border-box; margin: 0; padding: 0; }'
    + 'body { font-family: Lora, "Noto Serif", Georgia, "Times New Roman", serif; background: #fff; color: #1e293b; padding: 40px; max-width: 800px; margin: 0 auto; }'
    + '.header { border-bottom: 3px solid #b45309; padding-bottom: 20px; margin-bottom: 28px; }'
    + '.novel-name { font-size: 11px; text-transform: uppercase; letter-spacing: .2em; color: #92400e; font-weight: bold; margin-bottom: 6px; }'
    + '.entity-name { font-family: "Playfair Display", "Noto Serif", Georgia, serif; font-size: 36px; font-weight: 800; color: #0f172a; line-height: 1.1; }'
    + '.section { margin-bottom: 28px; }'
    + '.section-title { font-family: "Playfair Display", "Noto Serif", Georgia, serif; font-size: 14px; font-weight: 700; color: #b45309; text-transform: uppercase; letter-spacing: .15em; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #fde68a; }'
    + '.field-row { display: flex; margin-bottom: 10px; gap: 12px; }'
    + '.field-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .1em; min-width: 160px; padding-top: 2px; }'
    + '.field-value { font-size: 14px; color: #1e293b; flex: 1; line-height: 1.6; }'
    + '.info-text { font-size: 14px; line-height: 1.8; color: #334155; }'
     + '.milestone { padding: 12px 16px; border-left: 3px solid #fbbf24; margin-bottom: 10px; background: #fffbeb; border-radius: 0 6px 6px 0; }'
     + '.ms-chapter { font-size: 11px; font-weight: 700; color: #92400e; text-transform: uppercase; margin-bottom: 4px; }'
     + '.ms-title { font-family: "Playfair Display", "Noto Serif", Georgia, serif; font-size: 17px; font-weight: 700; color: #111827; margin-bottom: 6px; }'
     + '.ms-event { font-size: 13px; color: #374151; line-height: 1.6; }'
    + '.no-print { background:#1e293b; color:#f8fafc; padding:12px 20px; margin:-40px -40px 30px; display:flex; justify-content:space-between; align-items:center; }'
    + '.print-btn { background:#b45309;color:#fff;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-weight:bold; }'
    + '.footer { margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center; }'
    + '@media print { .no-print { display:none; } body { padding:20px; } }'
    + '</style></head><body>'
    + '<div class="no-print"><span>Xem trước — Nhấn In để lưu PDF</span>'
    + '<button class="print-btn" onclick="window.print()">In / Lưu PDF</button></div>'
    + '<div class="header">'
    + '<div class="novel-name">'
    + escapeHtml(novelTitle || '')
    + (tabLabel ? ` · ${escapeHtml(tabLabel)}` : '')
    + '</div>'
    + '<div class="entity-name">'
    + escapeHtml(entity?.name || 'Vô Danh')
    + '</div>'
    + (firstFieldVal ? `<div style="color:#64748b;font-size:12px;margin-top:6px;text-transform:uppercase;letter-spacing:.1em">${escapeHtml(firstFieldVal)}</div>` : '')
    + '</div>'
    + (fieldsHTML ? `<div class="section"><div class="section-title">Căn Cơ & Thuộc Tính</div>${fieldsHTML}</div>` : '')
    + (infoHTML ? `<div class="section"><div class="section-title">Ghi Chép Chi Tiết</div><div class="info-text">${infoHTML}</div></div>` : '')
    + (milestonesHTML ? `<div class="section"><div class="section-title">Dòng Thời Gian (${(entity?.milestones || []).length} mốc)</div>${milestonesHTML}</div>` : '')
    + `<div class="footer">Xuất từ Tàng Thư Các · ${new Date().toLocaleDateString('vi-VN')}</div>`
    + '</body></html>';
}

export function exportEntityProfilePdf({ entity, fields, novelTitle, tabLabel, onPopupBlocked }) {
  if (!entity) return false;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    if (typeof onPopupBlocked === 'function') onPopupBlocked();
    return false;
  }

  printWindow.document.write(buildEntityProfilePrintHtml({ entity, fields, novelTitle, tabLabel }));
  printWindow.document.close();
  return true;
}
