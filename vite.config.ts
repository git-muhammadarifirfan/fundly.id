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
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react'
            }
            if (id.includes('framer-motion') || id.includes('gsap')) {
              return 'vendor-motion'
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons'
            }
          }
        },
      },
    },
  },
})

