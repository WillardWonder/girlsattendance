import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // HARDCODED BASE PATH: This matches your repo name "girlsattendance"
  base: '/girlsattendance/', 
})
