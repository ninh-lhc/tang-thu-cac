import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import process from 'node:process'

/** Gốc URL tài nguyên: `/` khi chạy root; vd. GitHub Pages `VITE_BASE=/ten-repo/` rồi `npm run build`. */
function vitePublicBase() {
  const raw = typeof process.env.VITE_BASE === 'string' ? process.env.VITE_BASE.trim() : ''
  if (!raw || raw === '/') return '/'
  const lead = raw.startsWith('/') ? raw : `/${raw}`
  return lead.endsWith('/') ? lead : `${lead}/`
}

export default defineConfig({
  base: vitePublicBase(),
  resolve: {
    preserveSymlinks: true,
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    emptyOutDir: process.platform !== 'win32',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react') || id.includes('scheduler')) return 'react-vendor';
          if (id.includes('lucide-react')) return 'icons-vendor';
          if (id.includes('@tanstack/react-virtual')) return 'virtual-vendor';
          return 'vendor';
        },
      },
    },
  },
})
