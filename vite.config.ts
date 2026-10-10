import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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

