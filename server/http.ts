import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

export type Req = IncomingMessage & { url: string }
export type Res = ServerResponse

export function json(res: Res, code: number, body: unknown) {
  res.statusCode = code
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

export async function readBody(req: Req): Promise<string> {
  let data = ''
  for await (const chunk of req) data += chunk
  return data
}

export async function readJson(req: Req): Promise<unknown> {
  try {
    return JSON.parse((await readBody(req)) || 'null')
  } catch {
    return null
  }
}

// Any web page open in the browser can send requests to localhost. Requests
// that change something must come from the dashboard itself.
export function fromDashboard(req: Req): boolean {
  const origin = req.headers.origin
  return !origin || origin === `http://${req.headers.host}`
}

// Resolves a path under the docs root, refusing anything that climbs out of it.
export function insideRoot(root: string, rel: string): string | null {
  const abs = path.resolve(root, rel)
  return abs === root || abs.startsWith(root + path.sep) ? abs : null
}

// A route handler. Routes are matched on "METHOD /path".
export type Handler<Ctx> = (req: Req, res: Res, url: URL, ctx: Ctx) => unknown
export type Routes<Ctx> = Record<string, Handler<Ctx>>
