import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const getCommitCount = () => {
  try {
    const repoRoot = path.resolve(__dirname, '..')
    const raw = execSync('git rev-list --count HEAD', { cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
    const count = Number.parseInt(raw, 10)
    return Number.isFinite(count) && count > 0 ? String(count) : '1'
  } catch {
    return '1'
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'import.meta.env.VITE_COMMIT_COUNT': JSON.stringify(getCommitCount()),
  },
  base: './', // Root-relative assets for Discord Activities
  server: {
    host: '0.0.0.0', // Allow any host for VM access
    port: 5173,
    strictPort: true,
  },
  envDir: '../', // Look for .env in the root bot directory
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
        manualChunks(id) {
          if (!id.includes('node_modules')) return null
          if (id.includes('@discord/embedded-app-sdk')) return 'discord-vendor'
          if (id.includes('lucide-react')) return 'icons-vendor'
          if (id.includes('framer-motion')) return 'motion-vendor'
          if (id.includes('axios')) return 'network-vendor'
          if (id.includes('react')) return 'react-vendor'
          return 'vendor'
        },
      },
    },
  },
})
