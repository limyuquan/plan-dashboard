import fsp from 'node:fs/promises'
import path from 'node:path'
import { splitDocPath } from '../../shared/keys'
import { searchDocs, textOf } from '../../shared/search'
import { json } from '../http'
import type { ApiRoutes } from './context'

// Each doc's text, re-read only when its size or mtime changes.
const texts = new Map<string, { key: string; text: string }>()

async function textAt(abs: string, file: string): Promise<string> {
  try {
    const stat = await fsp.stat(abs)
    const key = `${stat.mtimeMs}:${stat.size}`
    const hit = texts.get(abs)
    if (hit?.key === key) return hit.text
    const text = textOf(await fsp.readFile(abs, 'utf8'), file)
    texts.set(abs, { key, text })
    return text
  } catch {
    return ''
  }
}

export const searchRoutes: ApiRoutes = {
  // Every listed doc whose title or text holds all the words of ?q=.
  'GET /api/search': async (_req, res, url, { config, docs }) => {
    const q = url.searchParams.get('q')?.trim() ?? ''
    if (q.length < 2) return json(res, 200, [])
    const roots = new Map(config.folders.map((f) => [f.folder.name, f.root]))
    const entries = await Promise.all(
      [...(await docs.current()).index.values()].map(async ({ doc }) => {
        const { folder, rel } = splitDocPath(doc.path)
        const root = roots.get(folder)
        return { doc, text: root ? await textAt(path.join(root, rel), doc.file) : '' }
      }),
    )
    json(res, 200, searchDocs(entries, q))
  },
}
