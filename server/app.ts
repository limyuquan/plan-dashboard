import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ConfigStore } from './config'
import { Docs } from './docs'
import type { Req, Res } from './http'
import { configRoutes } from './routes/config'
import type { ApiRoutes, Ctx } from './routes/context'
import { eventRoutes } from './routes/events'
import { fileRoutes, serveDocs } from './routes/files'
import { treeRoutes } from './routes/tree'

const routes: ApiRoutes = { ...treeRoutes, ...fileRoutes, ...eventRoutes, ...configRoutes }

const here = path.dirname(fileURLToPath(import.meta.url))

type Next = () => void

// The web app: Vite with hot reload while developing, the built files otherwise.
async function webApp(dev: boolean, server: http.Server): Promise<(req: Req, res: Res, next: Next) => void> {
  if (dev) {
    const { createServer } = await import('vite')
    const vite = await createServer({
      configFile: path.join(here, '..', 'vite.config.ts'),
      // Hot reload rides on our own server, so it needs no port of its own.
      server: { middlewareMode: true, hmr: { server } },
      appType: 'spa',
    })
    return vite.middlewares
  }
  const dir = path.join(here, 'web')
  const index = fs.readFileSync(path.join(dir, 'index.html'))
  return (req, res) => {
    const file = path.join(dir, path.normalize(new URL(req.url, 'http://x').pathname))
    if (file.startsWith(dir + path.sep) && fs.statSync(file, { throwIfNoEntry: false })?.isFile()) {
      const type = { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[path.extname(file)]
      if (type) res.setHeader('Content-Type', type)
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      return fs.createReadStream(file).pipe(res)
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end(index)
  }
}

export async function startServer(config: ConfigStore, { dev }: { dev: boolean }) {
  const docs = new Docs(config)
  const ctx: Ctx = { config, docs }
  let web: Awaited<ReturnType<typeof webApp>> | null = null

  const server = http.createServer(async (req, res) => {
    const r = req as Req
    const url = new URL(r.url, 'http://localhost')
    try {
      const route = routes[`${r.method} ${url.pathname}`]
      if (route) return await route(r, res, url, ctx)
      if (url.pathname.startsWith('/docs/')) return await serveDocs(r, res, url, ctx)
      web?.(r, res, () => {
        res.statusCode = 404
        res.end()
      })
    } catch (err) {
      console.error(err)
      if (!res.headersSent) res.statusCode = 500
      res.end()
    }
  })

  web = await webApp(dev, server)
  config.watch()
  docs.watch()
  const port = config.current.port
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, 'localhost', resolve)
  })
  return { url: `http://localhost:${port}`, root: docs.root }
}
