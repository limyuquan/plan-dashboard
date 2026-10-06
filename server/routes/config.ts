import { configSchema, type Config } from '../../shared/config'
import type { Preview } from '../../shared/types'
import { formatIssues, homeRelative, resolveFolders } from '../config'
import { fromDashboard, json, readJson } from '../http'
import { scanAll } from '../scan'
import type { ApiRoutes } from './context'

// Checks a config sent by the settings page. Every folder must exist, since a
// folder pointing nowhere would show up empty.
export function checkConfig(body: unknown): { config: Config } | { error: string } {
  const parsed = configSchema.safeParse(body)
  if (!parsed.success) return { error: formatIssues(parsed.error.issues) }
  if (!parsed.data.folders.length) return { error: 'folders: add the folder your docs are in' }
  const missing = resolveFolders(parsed.data).findIndex((f) => !f.root)
  if (missing >= 0) return { error: `folders.${missing}.path: ${parsed.data.folders[missing].path} does not exist` }
  return { config: parsed.data }
}

export const configRoutes: ApiRoutes = {
  'GET /api/config': (_req, res, _url, { config }) =>
    json(res, 200, { ...config.stored, file: homeRelative(config.file) }),

  'PUT /api/config': async (req, res, _url, { config }) => {
    if (!fromDashboard(req)) return json(res, 403, { error: 'not from the dashboard' })
    const checked = checkConfig(await readJson(req))
    if ('error' in checked) return json(res, 400, checked)
    await config.save(checked.config)
    json(res, 200, { ok: true })
  },

  // A dry run for the settings page: how a draft config would read its folders.
  'POST /api/config/preview': async (req, res) => {
    const checked = checkConfig(await readJson(req))
    const preview: Preview =
      'error' in checked
        ? { ok: false, error: checked.error, folders: [] }
        : { ok: true, folders: (await scanAll(checked.config)).folders }
    json(res, 200, preview)
  },
}
