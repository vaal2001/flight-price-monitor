import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig, searchForWorkspaceRoot } from 'vite'

export default defineConfig({
  plugins: [react()],
  base: '/flight-price-monitor',
  server: {
    fs: {
      allow: [
        searchForWorkspaceRoot(process.cwd()),
        resolve(process.cwd(), '..'),
      ]
    }
  }
})
