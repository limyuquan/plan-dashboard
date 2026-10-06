import fs from 'node:fs'
import { configSchema, type Config } from '../../shared/config'
import type { Preview } from '../../shared/types'
import { expandHome } from '../config'
import { fromDashboard, json, readJson } from '../http'
import { scan } from '../scan'
import type { ApiRoutes } from './context'

// Checks a config sent by the settings page. The folder must exist, since a
// config pointing nowhere would leave the dashboard empty.
function check(body: unknown): { config: Config; root: string } | { error: string } {
  const parsed = configSchema.safeParse(body)
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => `${i.path.join('.') || 'config'}: ${i.message}`).join('\n') }
  }
  const root = parsed.data.root && expandHome(parsed.data.root)
  if (!root) return { error: 'root: choose the folder your docs are in' }
  try {
    return { config: parsed.data, root: fs.realpathSync(root) }
  } catch {
    return { error: `root: ${parsed.data.root} does not exist` }
  }
}

export const configRoutes: ApiRoutes = {
  'GET /api/config': (_req, res, _url, { config }) => json(res, 200, { ...config.stored, file: config.file }),

  'PUT /api/config': async (req, res, _url, { config }) => {
    if (!fromDashboard(req)) return json(res, 403, { error: 'not from the dashboard' })
    const checked = check(await readJson(req))
    if ('error' in checked) return json(res, 400, checked)
    await config.save(checked.config)
    json(res, 200, { ok: true })
  },

  // A dry run for the settings page: how a draft config would read the folder.
  'POST /api/config/preview': async (req, res) => {
    const checked = check(await readJson(req))
    if ('error' in checked) {
      const empty: Preview = {
        ok: false,
        error: checked.error,
        tasks: 0,
        phases: 0,
        docs: 0,
        byKind: {},
        unnumbered: [],
        skipped: {},
      }
      return json(res, 200, empty)
    }
    json(res, 200, (await scan(checked.root, checked.config)).preview)
  },
}
