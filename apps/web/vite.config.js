import path from 'path'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')
const require = createRequire(import.meta.url)

/** Directory of the shell's copy of a package (workspace installs may hoist it to the repo root). */
function packageDir(name) {
  return path.dirname(require.resolve(`${name}/package.json`))
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const webinarApi =
    env.VITE_WEBINAR_API_URL?.trim() ||
    (mode === 'development' ? '/webinar-api' : 'https://s1m0ne.tec.br/api')

  return {
    plugins: [react()],
    resolve: {
      // Live FE has its own node_modules (React 18) — force one copy to avoid invalid hook calls.
      dedupe: ['react', 'react-dom', 'react-router-dom', 'zustand'],
      alias: {
        '@webinar-live': path.resolve(repoRoot, 'services/webinar/frontend/src'),
        react: packageDir('react'),
        'react-dom': packageDir('react-dom'),
        'react-router-dom': packageDir('react-router-dom'),
        zustand: packageDir('zustand'),
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
      fs: {
        allow: [repoRoot],
      },
      proxy: {
        '/platform-api': {
          target: env.VITE_PLATFORM_API_PROXY_TARGET || 'http://127.0.0.1:4000',
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p.replace(/^\/platform-api/, ''),
        },
        '/webinar-api': {
          target: env.VITE_WEBINAR_PROXY_TARGET || 'http://127.0.0.1:3001',
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p.replace(/^\/webinar-api/, '/api'),
        },
      },
    },
  }
})
