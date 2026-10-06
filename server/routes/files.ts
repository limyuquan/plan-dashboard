import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { docPath, splitDocPath } from '../../shared/keys'
import type { Doc } from '../../shared/types'
import type { ResolvedFolder } from '../config'
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

type Found = { path: string; abs: string; owner: ResolvedFolder }

// Finds a file by doc path ("<folder>/<path inside it>") or by an absolute
// path on this machine (plans often contain those). Absolute paths go through
// the real path, so a link through a symlink still lands in its folder.
function locate(folders: ResolvedFolder[], raw: string): Found | null {
  let p = raw.trim()
  if (p.startsWith('file://')) p = fileURLToPath(p)
  if (p.startsWith('~/')) p = path.join(os.homedir(), p.slice(2))
  if (!path.isAbsolute(p)) {
    const { folder, rel } = splitDocPath(p)
    const owner = folders.find((f) => f.folder.name === folder)
    const abs = owner?.root && insideRoot(owner.root, rel)
    return owner && abs ? { path: docPath(folder, rel), abs, owner } : null
  }
  let real: string
  try {
    real = fs.realpathSync(p)
  } catch {
    return null
  }
  for (const owner of folders) {
    if (!owner.root || !insideRoot(owner.root, path.relative(owner.root, real))) continue
    const rel = path.relative(owner.root, real).split(path.sep).join('/')
    return { path: docPath(owner.folder.name, rel), abs: real, owner }
  }
  return null
}

const isFile = (abs: string) => !!fs.statSync(abs, { throwIfNoEntry: false })?.isFile()

// GET /docs/<folder>/<path>: the files themselves, for the panes' iframes.
export async function serveDocs(_req: Req, res: Res, url: URL, { config }: Ctx) {
  const found = locate(config.folders, decodeURIComponent(url.pathname.slice('/docs/'.length)))
  if (!found || !isFile(found.abs)) {
    res.statusCode = 404
    return res.end('Not found in the docs folders')
  }
  const { abs } = found
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
  // never lists. ?path= is a doc path or an absolute path.
  'GET /api/doc': async (_req, res, url, { config, docs }) => {
    const raw = url.searchParams.get('path') ?? ''
    const found = locate(config.folders, raw)
    const file = path.basename(found?.abs ?? raw)
    const ext = path.extname(file).slice(1).toLowerCase()
    if (!found || !found.owner.layout.fileTypes.includes(ext) || !isFile(found.abs)) {
      return json(res, 404, { error: `${raw} is not a document in the docs folders` })
    }
    const known = (await docs.current()).index.get(found.path)?.doc
    const doc: Doc = known ?? {
      path: found.path,
      file,
      kind: kindOf(config.current.docTypes, file),
      title: await readTitle(found.abs, file),
      ws: '',
    }
    json(res, 200, doc)
  },
}
