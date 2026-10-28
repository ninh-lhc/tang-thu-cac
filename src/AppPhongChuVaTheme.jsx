/**
 * Font Google + animation + biến theme (override amber) + design tokens.
 * Tên: phông chữ + theme màu toàn app.
 *
 * Ai dùng: App.jsx (cuối cây JSX, một lần).
 * Không chứa logic — chỉnh class theme ở đây hoặc Tailwind config.
 *
 * DESIGN TOKENS (dùng trong toàn app, không phụ thuộc vào theme màu):
 *   --tt-surface-1   : bg panel ngoài (slate-900/25)
 *   --tt-surface-2   : bg panel trong / card nhỏ (slate-950/55)
 *   --tt-surface-3   : bg sâu nhất (slate-950/90)
 *   --tt-border      : viền chuẩn (rgba slate-800, 70%)
 *   --tt-border-muted: viền mờ (rgba slate-800, 40%)
 *   --tt-text-base   : chữ chính (slate-200)
 *   --tt-text-muted  : chữ phụ (slate-400)
 *   --tt-text-dim    : nhãn/meta nhỏ (slate-500)
 *   --tt-r-sm        : border-radius nhỏ (0.5rem)
 *   --tt-r-md        : border-radius vừa (0.75rem / rounded-xl)
 *   --tt-r-card      : border-radius card (1rem / rounded-2xl)
 *   --tt-r-panel     : border-radius panel lớn (1.75rem / rounded-[28px])
 *   --tt-shadow-card : shadow card chuẩn
 *   --tt-shadow-panel: shadow panel lớn
 *   --tt-prose-max   : chiều rộng tối đa khối văn bản dài (desktop, tránh dòng quá dài trên màn ultrawide)
 */
import React from 'react';

const APP_GLOBAL_CSS = `
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&family=Playfair+Display:wght@700&family=Noto+Sans:wght@400;500;600;700&family=Noto+Serif:ital,wght@0,400;0,700;1,400;1,700&display=swap');

        /* ============================================================
           DESIGN TOKENS — nguồn duy nhất cho màu/khoảng/bo góc/shadow
           Dùng: var(--tt-surface-1), var(--tt-r-card), ...
           Cập nhật tại đây để tác động toàn app.
           ============================================================ */
        :root {
          /* Surface */
          --tt-surface-1   : rgba(15, 23, 42, 0.25);
          --tt-surface-2   : rgba(2, 6, 23, 0.55);
          --tt-surface-3   : rgba(2, 6, 23, 0.90);
          /* Border */
          --tt-border      : rgba(30, 41, 59, 0.70);
          --tt-border-muted: rgba(30, 41, 59, 0.40);
          /* Text */
          --tt-text-base   : #e2e8f0;
          --tt-text-muted  : #94a3b8;
          --tt-text-dim    : #64748b;
          /* Border-radius */
          --tt-r-sm        : 0.5rem;
          --tt-r-md        : 0.75rem;
          --tt-r-card      : 1rem;
          --tt-r-panel     : 1.75rem;
          /* Shadow */
          --tt-shadow-card : 0 4px 20px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.03) inset;
          --tt-shadow-panel: 0 8px 40px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.04) inset;
          --tt-prose-max   : 65rem;
        }

        /* Desktop / laptop: vòng focus bàn phím thống nhất (gắn class tt-kbd-focus) */
        .theme-wrapper .tt-kbd-focus:focus-visible {
          outline: 2px solid rgba(217, 119, 6, 0.55);
          outline-offset: 2px;
        }

        /* Ghi chép chi tiết — Markdown table (preview only) */
        .theme-wrapper .entity-notes-md-table-wrap {
          box-sizing: border-box;
          min-width: 0;
          max-width: 100%;
          -webkit-overflow-scrolling: touch;
        }
        .theme-wrapper .entity-notes-md-table-scroll {
          box-sizing: border-box;
          min-width: 0;
          max-width: 100%;
        }
        .theme-wrapper .entity-notes-md-table {
          border-collapse: separate;
          border-spacing: 0;
        }
        .theme-wrapper .entity-notes-md-table-th {
          position: sticky;
          top: 0;
          z-index: 2;
          vertical-align: top;
          border: 1px solid rgba(51, 65, 85, 0.55);
          padding: 0.625rem 0.75rem;
          font-weight: 600;
          color: rgba(237, 233, 254, 0.95);
          background: rgba(30, 41, 59, 0.92);
          box-shadow: 0 1px 0 rgba(148, 163, 184, 0.12);
        }
        .theme-wrapper .entity-notes-md-table-td {
          vertical-align: top;
          border: 1px solid rgba(51, 65, 85, 0.45);
          padding: 0.5rem 0.75rem;
          color: rgba(226, 232, 240, 0.92);
        }
        .theme-wrapper .entity-notes-md-table-cell-inner {
          overflow-wrap: break-word;
          word-wrap: break-word;
          hyphens: auto;
          min-width: 4.5rem;
          max-width: 22rem;
        }
        .theme-wrapper .entity-notes-md-table[data-wide="true"] .entity-notes-md-table-cell-inner {
          max-width: none;
          min-width: 3.25rem;
        }
        .theme-wrapper .entity-notes-md-table .tt-kbd-focus:focus-visible {
          outline-color: rgba(167, 139, 250, 0.75);
        }
        .theme-wrapper .entity-notes-md-table-row:nth-child(even) {
          background: rgba(15, 23, 42, 0.35);
        }
        .theme-wrapper .entity-notes-md-table-row:hover {
          background: rgba(51, 65, 85, 0.32);
        }
        .theme-wrapper .entity-notes-md-table [data-entity-wiki-link] {
          max-width: 100%;
        }
        .theme-wrapper .wiki-link--missing:hover {
          filter: brightness(1.08);
        }
        .theme-wrapper .wiki-link--missing:focus-visible {
          outline: 2px solid rgba(251, 191, 36, 0.65);
          outline-offset: 2px;
        }
        .font-serif { font-family: 'Lora', 'Noto Serif', Georgia, 'Times New Roman', serif; }
        .font-heading { font-family: 'Playfair Display', 'Noto Serif', Georgia, serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(100, 116, 139, 0.3); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(100, 116, 139, 0.6); }
        /* MOTION: vẫn mượt nhưng “đẹp” hơn (độ rơi rõ ràng hơn) */
        @keyframes fadeIn { from { opacity: 0; transform: translateY(9px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.34s cubic-bezier(0.22, 1, 0.36, 1) forwards; will-change: opacity, transform; }
        @keyframes fadeFast { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-fast { animation: fadeFast 0.15s ease-out forwards; }
        @keyframes spinSlow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spinSlow 40s linear infinite; }

        /* THEME SYSTEM VARIABLES */
        .theme-huyen-huyen { --t-100: #f3e8ff; --t-300: #d8b4fe; --t-400: #c084fc; --t-500: #a855f7; --t-600: #9333ea; --t-700: #7e22ce; --t-800: #6b21a8; --t-500-rgb: 168, 85, 247; --t-600-rgb: 147, 51, 234; --t-800-rgb: 107, 33, 168; }
        .theme-ngon-tinh { --t-100: #ffe4e6; --t-300: #fda4af; --t-400: #fb7185; --t-500: #f43f5e; --t-600: #e11d48; --t-700: #be123c; --t-800: #9f1239; --t-500-rgb: 244, 63, 94; --t-600-rgb: 225, 29, 72; --t-800-rgb: 159, 18, 57; }
        .theme-he-thong { --t-100: #cffafe; --t-300: #67e8f9; --t-400: #22d3ee; --t-500: #06b6d4; --t-600: #0891b2; --t-700: #0e7490; --t-800: #155e75; --t-500-rgb: 6, 182, 212; --t-600-rgb: 8, 145, 178; --t-800-rgb: 21, 94, 117; }
        .theme-trong-sinh { --t-100: #d1fae5; --t-300: #6ee7b7; --t-400: #34d399; --t-500: #10b981; --t-600: #059669; --t-700: #047857; --t-800: #065f46; --t-500-rgb: 16, 185, 129; --t-600-rgb: 5, 150, 105; --t-800-rgb: 6, 95, 70; }
        .theme-do-thi { --t-100: #dbeafe; --t-300: #93c5fd; --t-400: #60a5fa; --t-500: #3b82f6; --t-600: #2563eb; --t-700: #1d4ed8; --t-800: #1e40af; --t-500-rgb: 59, 130, 246; --t-600-rgb: 37, 99, 235; --t-800-rgb: 30, 64, 175; }
        .theme-vo-han-luu { --t-100: #ffedd5; --t-300: #fdba74; --t-400: #fb923c; --t-500: #f97316; --t-600: #ea580c; --t-700: #c2410c; --t-800: #9a3412; --t-500-rgb: 249, 115, 22; --t-600-rgb: 234, 88, 12; --t-800-rgb: 154, 52, 18; }

        /* THEME OVERRIDES */
        .theme-wrapper:not(.theme-tien-hiep) .text-amber-100 { color: var(--t-100) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .text-amber-200 { color: var(--t-300) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .text-amber-300 { color: var(--t-300) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .text-amber-400 { color: var(--t-400) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .text-amber-500 { color: var(--t-500) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .text-amber-600 { color: var(--t-600) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .text-amber-600\\/80 { color: rgba(var(--t-600-rgb), 0.8) !important; }

        .theme-wrapper:not(.theme-tien-hiep) .bg-amber-400 { background-color: var(--t-400) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .bg-amber-500 { background-color: var(--t-500) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .bg-amber-600 { background-color: var(--t-600) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .bg-amber-700 { background-color: var(--t-700) !important; }
        
        .theme-wrapper:not(.theme-tien-hiep) .border-amber-400 { border-color: var(--t-400) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .border-amber-500 { border-color: var(--t-500) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .border-amber-900 { border-color: var(--t-800) !important; }

        .theme-wrapper:not(.theme-tien-hiep) .bg-amber-500\\/10 { background-color: rgba(var(--t-500-rgb), 0.1) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .bg-amber-600\\/5 { background-color: rgba(var(--t-600-rgb), 0.05) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .bg-amber-900\\/10 { background-color: rgba(var(--t-800-rgb), 0.1) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .bg-amber-900\\/20 { background-color: rgba(var(--t-800-rgb), 0.2) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .bg-amber-900\\/30 { background-color: rgba(var(--t-800-rgb), 0.3) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .bg-amber-900\\/40 { background-color: rgba(var(--t-800-rgb), 0.4) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .bg-amber-900\\/50 { background-color: rgba(var(--t-800-rgb), 0.5) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .bg-amber-950\\/50 { background-color: rgba(var(--t-800-rgb), 0.15) !important; }

        .theme-wrapper:not(.theme-tien-hiep) .border-amber-500\\/10 { border-color: rgba(var(--t-500-rgb), 0.1) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .border-amber-500\\/20 { border-color: rgba(var(--t-500-rgb), 0.2) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .border-amber-500\\/30 { border-color: rgba(var(--t-500-rgb), 0.3) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .border-amber-500\\/40 { border-color: rgba(var(--t-500-rgb), 0.4) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .border-amber-600\\/30 { border-color: rgba(var(--t-600-rgb), 0.3) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .border-amber-600\\/50 { border-color: rgba(var(--t-600-rgb), 0.5) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .border-amber-600\\/80 { border-color: rgba(var(--t-600-rgb), 0.8) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .border-amber-700\\/30 { border-color: rgba(var(--t-600-rgb), 0.4) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .border-amber-700\\/50 { border-color: rgba(var(--t-600-rgb), 0.6) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .border-amber-800\\/20 { border-color: rgba(var(--t-800-rgb), 0.2) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .border-amber-800\\/30 { border-color: rgba(var(--t-800-rgb), 0.3) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .border-amber-800\\/50 { border-color: rgba(var(--t-800-rgb), 0.5) !important; }

        .theme-wrapper:not(.theme-tien-hiep) .from-amber-200 { --tw-gradient-from: var(--t-300) !important; --tw-gradient-to: rgba(var(--t-500-rgb), 0) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .from-amber-800 { --tw-gradient-from: var(--t-800) !important; --tw-gradient-to: rgba(var(--t-800-rgb), 0) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .to-amber-600 { --tw-gradient-to: var(--t-600) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .from-amber-900\\/40 { --tw-gradient-from: rgba(var(--t-800-rgb), 0.4) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .from-amber-900 { --tw-gradient-from: var(--t-800) !important; }
        
        .theme-wrapper:not(.theme-tien-hiep) .shadow-\\[0_0_30px_rgba\\(245\\,158\\,11\\,0\\.15\\)\\] { box-shadow: 0 0 30px rgba(var(--t-500-rgb), 0.15) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .shadow-\\[0_0_15px_rgba\\(217\\,119\\,6\\,0\\.1\\)\\] { box-shadow: 0 0 15px rgba(var(--t-600-rgb), 0.1) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .shadow-\\[0_0_50px_rgba\\(217\\,119\\,6\\,0\\.05\\)\\] { box-shadow: 0 0 50px rgba(var(--t-600-rgb), 0.05) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .shadow-\\[0_0_50px_rgba\\(217\\,119\\,6\\,0\\.2\\)\\] { box-shadow: 0 0 50px rgba(var(--t-600-rgb), 0.2) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .shadow-\\[0_0_10px_var\\(--t-400\\)\\] { box-shadow: 0 0 10px var(--t-400) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .shadow-\\[0_0_10px_\\#fbbf24\\] { box-shadow: 0 0 10px var(--t-400) !important; }
        .theme-wrapper:not(.theme-tien-hiep) .shadow-\\[0_0_15px_rgba\\(217\\,119\\,6\\,0\\.5\\)\\] { box-shadow: 0 0 15px rgba(var(--t-600-rgb), 0.5) !important; }

        /* PERFORMANCE MODE: ưu tiên FPS hơn hiệu ứng */
        .theme-wrapper.performance-mode * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
        .theme-wrapper.performance-mode .backdrop-blur-md,
        .theme-wrapper.performance-mode .backdrop-blur-sm {
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }
        .theme-wrapper.performance-mode [class*="shadow-"] {
          box-shadow: none !important;
        }

        /* Hệ điều hành yêu cầu giảm chuyển động */
        @media (prefers-reduced-motion: reduce) {
          .theme-wrapper .animate-fade-in,
          .theme-wrapper .animate-fade-fast,
          .theme-wrapper .animate-spin-slow,
          .theme-wrapper .animate-spin {
            animation: none !important;
          }
          .theme-wrapper * {
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `;

export function AppPhongChuVaTheme() {
  return <style dangerouslySetInnerHTML={{ __html: APP_GLOBAL_CSS }} />;
}
