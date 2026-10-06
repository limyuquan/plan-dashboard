import { json } from '../http'
import type { ApiRoutes } from './context'

export const eventRoutes: ApiRoutes = {
  'GET /api/events': (_req, res, _url, { docs }) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
    res.write('retry: 1000\n\n')
    docs.listen(res)
  },

  // Shows a link in the dashboard tab that is already open instead of opening
  // another one. Replies with how many tabs heard it, so a caller with nobody
  // listening can open a tab instead.
  'GET /api/open': (_req, res, url, { docs }) => {
    const get = (name: string) => url.searchParams.get(name)?.trim() ?? ''
    const want = { ws: get('ws'), plan: get('plan'), doc: get('doc') }
    if (!want.ws && !want.doc) return json(res, 400, { error: 'need ws or doc' })
    json(res, 200, { ok: true, listeners: docs.broadcast({ type: 'open', ...want }) })
  },
}
