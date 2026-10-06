import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { cli: 'server/cli.ts' },
  format: 'esm',
  platform: 'node',
  target: 'node20',
  outDir: 'dist',
  clean: false,
  external: ['vite'],
})
