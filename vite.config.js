import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import process from 'node:process'

export default defineConfig({
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
