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
      // Live FE has its own node_modules (React 18) — force one copy to avoid invalid hook calls.
      dedupe: ['react', 'react-dom', 'react-router-dom', 'zustand'],
      alias: {
        '@webinar-live': path.resolve(__dirname, 'services/webinar/frontend/src'),
        react: path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        'react-router-dom': path.resolve(__dirname, 'node_modules/react-router-dom'),
        zustand: path.resolve(__dirname, 'node_modules/zustand'),
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'zustand', 'axios', 'lucide-react', 'hls.js'],
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
