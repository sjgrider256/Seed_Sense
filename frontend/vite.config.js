import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Phase 1: plain static SPA. Data is served from public/data/.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
})
