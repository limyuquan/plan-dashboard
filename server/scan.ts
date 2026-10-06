import type { Dirent } from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { FALLBACK_KIND, wildcard, type Config } from '../shared/config'
import type { Collection, Doc, Folder, Kind, Place, Preview, Task, Tree } from '../shared/types'
import { homeRelative } from './config'
import { readTitle } from './titles'

// The docs folder read through a config, plus what the settings preview and
// the "new plan" toast need to know about it.
export type Scan = {
  tree: Tree
  // Every doc in the tree by path, with where it sits.
  index: Map<string, { doc: Doc; place: Place; notify: boolean }>
  preview: Preview
}

const pretty = (name: string) => name.replace(/-/g, ' ')
const extOf = (file: string) => path.extname(file).slice(1).toLowerCase()

async function list(abs: string): Promise<Dirent[]> {
  try {
    return (await fsp.readdir(abs, { withFileTypes: true })).filter((e) => !e.name.startsWith('.'))
  } catch {
    return []
  }
}

async function newestMtime(abs: string): Promise<number> {
  let newest = 0
  for (const entry of await list(abs)) {
    const child = path.join(abs, entry.name)
    if (entry.isDirectory()) newest = Math.max(newest, await newestMtime(child))
    else newest = Math.max(newest, (await fsp.stat(child).catch(() => null))?.mtimeMs ?? 0)
  }
  return newest
}

// "phase-1a-foo" sorts before "phase-2-bar"; unnumbered folders go last.
function byPhaseNumber(a: Folder, b: Folder) {
  const parse = (num: string) => {
    const m = num.match(/^(\d+)(.*)$/)
    return m ? ([Number(m[1]), m[2]] as const) : ([Infinity, ''] as const)
  }
  const [an, as] = parse(a.num)
  const [bn, bs] = parse(b.num)
  return an - bn || as.localeCompare(bs) || a.name.localeCompare(b.name)
}

// The doc type a file name matches first, or the fallback.
export const kindOf = (config: Config, file: string) =>
  config.docTypes.find((t) => wildcard(t.match).test(file))?.id ?? FALLBACK_KIND.id

export async function scan(root: string, config: Config): Promise<Scan> {
  const kinds: Kind[] = [...config.docTypes.map(({ id, label, color }) => ({ id, label, color })), FALLBACK_KIND]
  const rank = (kind: string) => kinds.findIndex((k) => k.id === kind)
  const phaseRe = new RegExp(config.phasePattern)
  const rel = (abs: string) => path.relative(root, abs).split(path.sep).join('/')

  const preview: Preview = { ok: true, tasks: 0, phases: 0, docs: 0, byKind: {}, unnumbered: [], skipped: {} }
  const index: Scan['index'] = new Map()

  // The files directly in a folder that the dashboard shows, in reading order.
  async function docsIn(dirAbs: string, ws: string, fileTypes: string[], countSkipped = true): Promise<Doc[]> {
    const docs: Doc[] = []
    for (const entry of await list(dirAbs)) {
      if (!entry.isFile()) continue
      const ext = extOf(entry.name)
      if (!fileTypes.includes(ext)) {
        if (countSkipped && ext) preview.skipped[ext] = (preview.skipped[ext] ?? 0) + 1
        continue
      }
      const abs = path.join(dirAbs, entry.name)
      const kind = kindOf(config, entry.name)
      docs.push({ path: rel(abs), file: entry.name, kind, title: await readTitle(abs, entry.name), ws })
      preview.docs++
      preview.byKind[kind] = (preview.byKind[kind] ?? 0) + 1
    }
    return docs.sort((a, b) => rank(a.kind) - rank(b.kind) || a.file.localeCompare(b.file))
  }

  const groupFolders = new Set(config.groups.map((g) => g.folder))

  async function buildTask(name: string, status: Task['status'], taskAbs: string): Promise<Task> {
    const key = name
    const plansAbs = config.plansFolder ? path.join(taskAbs, config.plansFolder) : taskAbs

    // A sub-folder is a phase when its name matches the pattern, or when it
    // holds something to read anyway (those sort last).
    const phases: Folder[] = []
    for (const entry of await list(plansAbs)) {
      if (!entry.isDirectory() || (!config.plansFolder && groupFolders.has(entry.name))) continue
      const m = entry.name.match(phaseRe)
      const fkey = `${key}/${entry.name}`
      const docs = await docsIn(path.join(plansAbs, entry.name), fkey, config.fileTypes, !!m)
      if (!m && !docs.length) continue
      if (!m) preview.unnumbered.push(`${rel(taskAbs)}/${entry.name}`)
      const slug = m?.groups?.slug
      phases.push({
        key: fkey,
        name: entry.name,
        label: slug ? pretty(slug) : pretty(entry.name),
        num: m?.groups?.num ?? '',
        dir: rel(path.join(plansAbs, entry.name)),
        docs,
      })
    }
    phases.sort(byPhaseNumber)

    const groups: Folder[] = []
    for (const g of config.groups) {
      const fkey = `${key}/${g.folder}`
      const docs = await docsIn(path.join(taskAbs, g.folder), fkey, g.fileTypes ?? config.fileTypes, false)
      if (docs.length)
        groups.push({
          key: fkey,
          name: g.folder,
          label: g.label,
          num: '',
          dir: rel(path.join(taskAbs, g.folder)),
          docs,
        })
    }

    const task: Task = {
      key,
      name,
      label: pretty(name),
      status,
      dir: rel(taskAbs),
      docs: await docsIn(plansAbs, key, config.fileTypes),
      phases,
      groups,
      mtime: await newestMtime(taskAbs),
    }
    for (const doc of task.docs) index.set(doc.path, { doc, place: { task: task.label, phase: null }, notify: true })
    for (const f of [...phases, ...groups]) {
      const phase = f.num ? `Phase ${f.num} · ${f.label}` : f.label
      for (const doc of f.docs) index.set(doc.path, { doc, place: { task: task.label, phase }, notify: true })
    }
    return task
  }

  // Folders that hold collections are not tasks, even when they sit next to them.
  const collectionTops = new Set(config.collections.map((c) => c.path.split('/')[0]))

  const tasks: Task[] = []
  const homes: [Task['status'], string][] = config.statusFolders
    ? [
        ['active', path.join(root, config.statusFolders.active)],
        ['done', path.join(root, config.statusFolders.done)],
      ]
    : [[null, root]]
  for (const [status, home] of homes) {
    for (const entry of await list(home)) {
      if (!entry.isDirectory() || (!status && collectionTops.has(entry.name))) continue
      tasks.push(await buildTask(entry.name, status, path.join(home, entry.name)))
    }
  }
  // Most recently touched first, which is how you think about tasks.
  tasks.sort((a, b) => b.mtime - a.mtime)

  const collections: Collection[] = []
  for (const c of config.collections) {
    const docs: (Doc & { mtime: number })[] = []
    for (const abs of await walkPattern(root, c.path.split('/').filter(Boolean))) {
      const file = path.basename(abs)
      if (!config.fileTypes.includes(extOf(file))) continue
      const mtime = (await fsp.stat(abs).catch(() => null))?.mtimeMs ?? 0
      docs.push({ path: rel(abs), file, kind: kindOf(config, file), title: await readTitle(abs, file), ws: '', mtime })
    }
    docs.sort((a, b) => (c.newestFirst ? b.mtime - a.mtime : a.path.localeCompare(b.path)))
    const plain = docs.map(({ mtime: _, ...doc }) => doc)
    // A doc that also sits in a task keeps its place there.
    for (const doc of plain) {
      if (!index.has(doc.path)) index.set(doc.path, { doc, place: { task: c.label, phase: null }, notify: c.notify })
    }
    collections.push({ label: c.label, docs: plain })
  }

  preview.tasks = tasks.length
  preview.phases = tasks.reduce((n, t) => n + t.phases.length, 0)
  return {
    tree: { root, rootLabel: homeRelative(root), tasks, collections, kinds, settle: !!config.statusFolders },
    index,
    preview,
  }
}

// Files matching a path pattern like "weekly/*/*.html", one segment at a time.
async function walkPattern(dir: string, segments: string[]): Promise<string[]> {
  if (!segments.length) return []
  const [head, ...rest] = segments
  const re = wildcard(head)
  const out: string[] = []
  for (const entry of await list(dir)) {
    if (!re.test(entry.name)) continue
    const abs = path.join(dir, entry.name)
    if (rest.length && entry.isDirectory()) out.push(...(await walkPattern(abs, rest)))
    if (!rest.length && entry.isFile()) out.push(abs)
  }
  return out
}
