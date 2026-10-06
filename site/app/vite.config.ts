import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const here = path.dirname(fileURLToPath(import.meta.url))

// Builds the real web app for the landing page, with web/api.ts and
// web/events.ts swapped for the in-memory versions next to this file.
function demoBackend(): Plugin {
  const swaps: Record<string, string> = {
    [path.resolve(here, '../../web/api.ts')]: path.resolve(here, 'api.ts'),
    [path.resolve(here, '../../web/events.ts')]: path.resolve(here, 'events.ts'),
  }
  return {
    name: 'demo-backend',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })
      return resolved && swaps[resolved.id] ? swaps[resolved.id] : resolved
    },
    // Every visit starts from the same layout, in the dark theme.
    transformIndexHtml: (html) =>
      html.replace(
        '<head>',
        `<head><script>Object.keys(localStorage).filter((k) => k.startsWith('plan-dashboard.')).forEach((k) => localStorage.removeItem(k)); localStorage.setItem('plan-dashboard.theme', 'dark')</script>`,
      ),
  }
}

export default defineConfig({
  root: path.resolve(here, '../../web'),
  base: './',
  plugins: [demoBackend(), react()],
  build: { outDir: path.resolve(here, '../demo'), emptyOutDir: true },
  logLevel: 'warn',
})
