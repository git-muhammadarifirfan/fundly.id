import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// Service worker dibuat saat build: daftar file hasil build di-precache agar aplikasi bisa dibuka offline
const PUBLIC_PRECACHE = ['/index.html', '/site.webmanifest', '/favicon.svg', '/icon-192.png', '/apple-touch-icon.png', '/logo-mark.svg']
// Pustaka ekspor (Excel/PDF) besar & jarang dipakai: cukup di-cache saat pertama kali dipakai
const SKIP_PRECACHE = /(xlsx|jspdf|html2canvas|purify|index\.es)/i

const serviceWorker = (): Plugin => ({
  name: 'fundly-service-worker',
  apply: 'build',
  enforce: 'post',
  generateBundle(_options, bundle) {
    const files = Object.keys(bundle)
      .filter((f) => /\.(js|css|svg|png|webp|woff2?)$/.test(f) && !SKIP_PRECACHE.test(f))
      .map((f) => `/${f}`)
    const urls = Array.from(new Set([...PUBLIC_PRECACHE, ...files]))
    const version = Date.now().toString(36)
    const source = readFileSync(new URL('./sw/sw.template.js', import.meta.url), 'utf-8')
      .replace("'__VERSION__'", JSON.stringify(version))
      .replace('__PRECACHE_URLS__', JSON.stringify(urls))
    this.emitFile({ type: 'asset', fileName: 'sw.js', source })
  },
})

// Saat `npm run dev`, layani /api/gold-price memakai fungsi yang sama dengan Vercel Function
const devApi = (): Plugin => ({
  name: 'fundly-dev-api',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/api/gold-price', async (_req, res) => {
      try {
        const mod = (await server.ssrLoadModule('/api/gold-price.ts')) as { GET: () => Promise<Response> }
        const response = await mod.GET()
        res.statusCode = response.status
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(await response.text())
      } catch (err) {
        res.statusCode = 500
        res.end(JSON.stringify({ error: String(err) }))
      }
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), devApi(), serviceWorker()],
  // NEXT_PUBLIC_ ikut diekspos agar env dari integrasi Supabase di Vercel
  // (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY) langsung terbaca.
  // Variabel rahasia integrasi (SUPABASE_SERVICE_ROLE_KEY, POSTGRES_*) tidak berawalan ini sehingga tetap tidak terekspos.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Vendor dipisah per pustaka agar cache browser tetap terpakai antar-deploy
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          const path = id.replace(/\\/g, '/')
          if (/\/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(path)) return 'vendor-react'
          if (/\/node_modules\/(framer-motion|motion-dom|motion-utils|gsap)\//.test(path)) return 'vendor-motion'
          if (/\/node_modules\/lucide-react\//.test(path)) return 'vendor-icons'
          if (/\/node_modules\/@supabase\//.test(path)) return 'vendor-supabase'
          if (/\/node_modules\/date-fns\//.test(path)) return 'vendor-date'
          return undefined
        },
      },
    },
  },
})

