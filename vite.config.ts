import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { wheelApiDevPlugin } from './src/server/devPlugin.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), wheelApiDevPlugin()],
})
