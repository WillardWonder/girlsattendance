import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path matches your repo name
export default defineConfig({
  plugins: [react()],
  base: '/girls-wrestling/', 
})
