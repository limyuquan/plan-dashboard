import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import type { TreeResponse } from '../../shared/types'
import { fromDashboard, json, readJson } from '../http'
import type { ApiRoutes } from './context'

const TASK_NAME = /^[^/\\]+$/

export const treeRoutes: ApiRoutes = {
  'GET /api/tree': async (_req, res, _url, { config, docs }) => {
    const result = await docs.current()
    const body: TreeResponse = result
      ? { tree: result.tree }
      : { tree: null, problem: config.current.root ? `${config.current.root} is not a folder` : undefined }
    json(res, 200, body)
  },

  // Settle / restore: the task folder really moves between the two status
  // folders, which is what makes the change stick.
  'POST /api/move': async (req, res, _url, { config, docs }) => {
    if (!fromDashboard(req)) return json(res, 403, { error: 'not from the dashboard' })
    const root = docs.root
    const folders = config.current.statusFolders
    const { task, to } = ((await readJson(req)) ?? {}) as { task?: string; to?: string }
    if (!root || !folders) return json(res, 400, { error: 'status folders are not configured' })
    if (!task || !TASK_NAME.test(task) || task.startsWith('.') || (to !== 'active' && to !== 'done')) {
      return json(res, 400, { error: 'bad task or destination' })
    }
    const from = to === 'done' ? 'active' : 'done'
    const src = path.join(root, folders[from], task)
    const dest = path.join(root, folders[to], task)
    if (!fs.existsSync(src)) return json(res, 404, { error: `${folders[from]}/${task} not found` })
    if (fs.existsSync(dest)) return json(res, 409, { error: `${folders[to]}/${task} already exists` })
    await fsp.mkdir(path.dirname(dest), { recursive: true })
    docs.muteMovesUnder(`${folders[to]}/${task}`)
    await fsp.rename(src, dest)
    docs.invalidate()
    json(res, 200, { from: `${folders[from]}/${task}`, to: `${folders[to]}/${task}` })
  },
}
