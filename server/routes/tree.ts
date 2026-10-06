import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { docPath } from '../../shared/keys'
import type { TreeResponse } from '../../shared/types'
import { fromDashboard, json, readJson } from '../http'
import type { ApiRoutes } from './context'

export const treeRoutes: ApiRoutes = {
  'GET /api/tree': async (_req, res, _url, { config, docs }) => {
    const result = await docs.current()
    const body: TreeResponse = {
      tree: config.current.folders.length ? result.tree : null,
      configProblem: config.problem,
    }
    json(res, 200, body)
  },

  // Settle / restore: the task folder really moves between its docs folder's
  // two status folders, which is what makes the change stick.
  'POST /api/move': async (req, res, _url, { config, docs }) => {
    if (!fromDashboard(req)) return json(res, 403, { error: 'not from the dashboard' })
    const { task, to } = ((await readJson(req)) ?? {}) as { task?: string; to?: string }
    const [folderName, name] = (task ?? '').split(':')
    const owner = config.folders.find((f) => f.folder.name === folderName)
    const status = owner?.layout.statusFolders
    if (!owner?.root || !status) return json(res, 400, { error: 'that folder has no status folders' })
    if (!name || /[/\\]/.test(name) || name.startsWith('.') || (to !== 'active' && to !== 'done')) {
      return json(res, 400, { error: 'bad task or destination' })
    }
    const from = to === 'done' ? 'active' : 'done'
    const src = path.join(owner.root, status[from], name)
    const dest = path.join(owner.root, status[to], name)
    if (!fs.existsSync(src)) return json(res, 404, { error: `${status[from]}/${name} not found` })
    if (fs.existsSync(dest)) return json(res, 409, { error: `${status[to]}/${name} already exists` })
    await fsp.mkdir(path.dirname(dest), { recursive: true })
    docs.muteMovesUnder(docPath(folderName, `${status[to]}/${name}`))
    await fsp.rename(src, dest)
    docs.invalidate()
    json(res, 200, {
      from: docPath(folderName, `${status[from]}/${name}`),
      to: docPath(folderName, `${status[to]}/${name}`),
    })
  },
}
