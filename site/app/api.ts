// The landing page's demo runs the real web app with no server. This module
// stands in for web/api.ts: the docs folder was read at build time
// (site/app/build.ts) and everything else happens in memory.
import { DEFAULT_CONFIG, type Config } from '../../shared/config'
import { docPath, splitDocPath } from '../../shared/keys'
import type { Doc, Preview, Task, TreeResponse } from '../../shared/types'
import data from './generated/demo.json'

type Data = { tree: NonNullable<TreeResponse['tree']>; preview: Preview; incoming: { doc: Doc; folder: string } }
const demo = data as unknown as Data

// Live copy of the tree. Settling a task and the scripted "new plan" change it.
const tree = structuredClone(demo.tree)

// Where each task's files really are, since settling only moves them in memory.
const homeOf = new Map(demo.tree.tasks.map((t) => [t.name, t.status]))

const allDocs = (): Doc[] =>
  tree.tasks.flatMap((t) => [...t.docs, ...t.phases.flatMap((p) => p.docs), ...t.groups.flatMap((g) => g.docs)])

// Called by the fake event stream when the scripted agent "writes" its recap.
export function addIncoming(): Doc {
  const { doc, folder } = demo.incoming
  const phase = tree.tasks.flatMap((t) => t.phases).find((p) => p.key === folder)
  if (phase && !phase.docs.some((d) => d.path === doc.path)) phase.docs.push(doc)
  return doc
}

function move(task: Task, to: 'active' | 'done') {
  const from = task.status!
  const swap = (p: string) => p.replace(`/${from}/`, `/${to}/`)
  task.status = to
  task.dir = swap(task.dir)
  for (const doc of [...task.docs, ...task.phases.flatMap((p) => p.docs), ...task.groups.flatMap((g) => g.docs)]) {
    doc.path = swap(doc.path)
  }
  for (const f of [...task.phases, ...task.groups]) f.dir = swap(f.dir)
}

export const api = {
  tree: async (): Promise<TreeResponse> => ({ tree: structuredClone(tree) }),

  // Links inside docs arrive as full URLs of this page's static files.
  doc: async (path: string): Promise<Doc> => {
    const local = path.includes('/docs/')
    const rel = path.replace(/^.*?\/docs\//, '').replace(/\.md\.html$/, '.md')
    const want = local ? docPath(tree.folders[0].name, rel) : rel
    const doc = allDocs().find((d) => d.path === want)
    if (!doc) throw new Error(`${rel} is not in the demo`)
    return doc
  },

  move: async (key: string, to: 'active' | 'done') => {
    const task = tree.tasks.find((t) => t.key === key)
    if (!task?.status) throw new Error('no such task')
    const from = task.dir
    move(task, to)
    return { from, to: task.dir }
  },

  config: async () => ({
    config: { ...DEFAULT_CONFIG, folders: [{ name: 'plans', path: '~/plans' }] } as Config,
    overrides: {},
    file: '~/.config/planner/config.json',
  }),
  saveConfig: async (_config: Config): Promise<{ ok: true }> => {
    throw new Error('This is a demo, so settings are not saved. Install it to use your own folder.')
  },
  preview: async (_config: Config) => demo.preview,
}

// Docs are static files next to this page. A settled task's files never really
// moved, and markdown was rendered to HTML at build time.
export function docUrl(path: string) {
  const [status, task, ...rest] = splitDocPath(path).rel.split('/')
  const real = [homeOf.get(task) ?? status, task, ...rest].join('/')
  const file = real.endsWith('.md') ? `${real}.html` : real
  return `docs/${file.split('/').map(encodeURIComponent).join('/')}`
}
