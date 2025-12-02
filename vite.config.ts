import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // CHANGE THIS: Use './' instead of a specific name.
  // This allows the app to work on ANY repository name automatically.
  base: './', 
})
