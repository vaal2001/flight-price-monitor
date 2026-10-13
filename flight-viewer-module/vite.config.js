
import { defineConfig, searchForWorkspaceRoot } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  base: '/flight-price-monitor/',
  server: {
    fs: {
      allow: [
        searchForWorkspaceRoot(process.cwd()),
        resolve(process.cwd(), '..'),
      ],
    },
  },
})
