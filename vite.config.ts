import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Matches your repository name
  base: '/girlsattendance/', 
  
  // CRITICAL FIX: Force build target to ES2020 to support import.meta.env
  esbuild: {
    target: 'es2020',
  },
  build: {
    target: 'es2020',
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020',
    },
  },
})
