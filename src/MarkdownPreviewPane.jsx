import React, { memo } from 'react';
import { renderMarkdown } from './MasterUtils.jsx';

/** Giảm re-render khi state khác của App đổi nhưng nội dung preview giữ nguyên */
export const MarkdownPreviewPane = memo(function MarkdownPreviewPane({
  text,
  dirHandle,
  entityMap,
  linkRegex,
  onNavigate,
  className = '',
}) {
  return (
    <div className={className}>
      {renderMarkdown(text || '', dirHandle, entityMap, linkRegex, onNavigate)}
    </div>
  );
});
