import type { Config } from '../shared/config'
import type { Doc, Preview, TreeResponse } from '../shared/types'

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? `${res.status} ${res.statusText}`)
  return body as T
}

const send = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const api = {
  tree: () => call<TreeResponse>('/api/tree'),
  doc: (path: string) => call<Doc>(`/api/doc?path=${encodeURIComponent(path)}`),
  move: (task: string, to: 'active' | 'done') =>
    call<{ from: string; to: string }>('/api/move', send('POST', { task, to })),
  config: () =>
    call<{ config: Config; overrides: Partial<Pick<Config, 'root' | 'port'>>; file: string }>('/api/config'),
  saveConfig: (config: Config) => call<{ ok: true }>('/api/config', send('PUT', config)),
  preview: (config: Config) => call<Preview>('/api/config/preview', send('POST', config)),
}

// The URL a pane loads a doc from. Each path segment is encoded, so file names
// with spaces or # still load.
export const docUrl = (path: string) => `/docs/${path.split('/').map(encodeURIComponent).join('/')}`
