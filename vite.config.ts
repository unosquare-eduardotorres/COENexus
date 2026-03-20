import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const frontendPort = Number(process.env.VITE_PORT || 5173)
const backendPort = Number(process.env.VITE_BACKEND_PORT || process.env.BACKEND_PORT || 5002)
const backendTarget = `http://localhost:${backendPort}`

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    port: frontendPort,
    strictPort: false,
    host: true,
    proxy: {
      '/api/claude': {
        target: 'http://localhost:3456',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/claude/, ''),
      },
      '/api/sync': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/api/processing': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/api/match': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/api/database': {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
})
