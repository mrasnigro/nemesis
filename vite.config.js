import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const webinarApi =
    env.VITE_WEBINAR_API_URL?.trim() ||
    (mode === 'development' ? '/webinar-api' : 'https://s1m0ne.tec.br/api')

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@webinar-live': path.resolve(__dirname, 'services/webinar/frontend/src'),
      },
    },
    define: {
      // Live FE (api.ts) reads REACT_APP_API_URL (not a VITE_ * auto-inject)
      'import.meta.env.REACT_APP_API_URL': JSON.stringify(webinarApi),
    },
    server: {
      host: true,
      allowedHosts: ['rebel-uptown-economist.ngrok-free.dev'],
      proxy: {
        '/webinar-api': {
          target: process.env.VITE_WEBINAR_PROXY_TARGET || 'http://127.0.0.1:3001',
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p.replace(/^\/webinar-api/, '/api'),
        },
      },
    },
  }
})
