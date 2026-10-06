import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Doc } from '../../shared/types'
import { insideRoot, json, type Req, type Res } from '../http'
import { renderMarkdown } from '../markdown'
import { kindOf } from '../scan'
import { readTitle } from '../titles'
import type { ApiRoutes, Ctx } from './context'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

// A link can name a file relative to the docs root, or by an absolute path on
// this machine (plans often contain those). Absolute paths go through the real
// path, so a link through a symlink to the docs folder still lands inside it.
function toRelative(root: string, raw: string): string | null {
  let p = raw.trim()
  if (p.startsWith('file://')) p = fileURLToPath(p)
  if (p.startsWith('~/')) p = path.join(os.homedir(), p.slice(2))
  if (!path.isAbsolute(p)) return insideRoot(root, p.replace(/^\/+/, '')) ? p.replace(/^\/+/, '') : null
  let real: string
  try {
    real = fs.realpathSync(p)
  } catch {
    return null
  }
  return insideRoot(root, path.relative(root, real)) ? path.relative(root, real).split(path.sep).join('/') : null
}

// GET /docs/<path>: the files themselves, for the panes' iframes.
export async function serveDocs(_req: Req, res: Res, url: URL, { docs }: Ctx) {
  const root = docs.root
  const abs = root && insideRoot(root, decodeURIComponent(url.pathname.slice('/docs/'.length)))
  if (!abs || !fs.statSync(abs, { throwIfNoEntry: false })?.isFile()) {
    res.statusCode = 404
    return res.end('Not found in the docs folder')
  }
  res.setHeader('Cache-Control', 'no-store')
  // Markdown becomes a page here, so a pane shows it like any HTML page.
  if (abs.endsWith('.md')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    const theme = url.searchParams.get('theme') === 'light' ? 'light' : 'dark'
    const title = await readTitle(abs, path.basename(abs))
    return res.end(renderMarkdown(await fsp.readFile(abs, 'utf8'), title, theme))
  }
  res.setHeader('Content-Type', MIME[path.extname(abs).toLowerCase()] ?? 'application/octet-stream')
  fs.createReadStream(abs).pipe(res)
}

export const fileRoutes: ApiRoutes = {
  // Describes one file so a link can open it, including files the sidebar
  // never lists. ?path= is relative to the root, or an absolute path.
  'GET /api/doc': async (_req, res, url, { config, docs }) => {
    const root = docs.root
    const raw = url.searchParams.get('path') ?? ''
    const rel = root && toRelative(root, raw)
    const abs = rel && insideRoot(root, rel)
    const file = path.basename(rel || raw)
    const ext = path.extname(file).slice(1).toLowerCase()
    if (!abs || !config.current.fileTypes.includes(ext) || !fs.statSync(abs, { throwIfNoEntry: false })?.isFile()) {
      return json(res, 404, { error: `${raw} is not a document in the docs folder` })
    }
    const known = (await docs.current())?.index.get(rel)?.doc
    const doc: Doc = known ?? {
      path: rel,
      file,
      kind: kindOf(config.current, file),
      title: await readTitle(abs, file),
      ws: '',
    }
    json(res, 200, doc)
  },
}
