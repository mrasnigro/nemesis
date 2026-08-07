import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: ['rebel-uptown-economist.ngrok-free.dev'],
    proxy: {
      // M1: in-app Webinar API (IMP → services/webinar backend)
      '/webinar-api': {
        target: process.env.VITE_WEBINAR_PROXY_TARGET || 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/webinar-api/, '/api'),
      },
    },
  },
})
