import fsp from 'node:fs/promises'
import path from 'node:path'
import { FALLBACK_KIND, wildcard, type Config, type DocType, type Layout } from '../shared/config'
import { docPath, taskKey } from '../shared/keys'
import type { Collection, Doc, DocsFolderInfo, Folder, FolderPreview, Kind, Place, Task, Tree } from '../shared/types'
import { homeRelative, resolveFolders } from './config'
import { readTitle } from './titles'

// Every configured docs folder read through the config, plus what the
// settings preview and the "new plan" toast need to know about them.
export type Scan = {
  tree: Tree
  // Every doc by path, with where it sits.
  index: Map<string, { doc: Doc; place: Place; notify: boolean }>
  folders: FolderPreview[]
}

type Entry = { name: string; dir: boolean; file: boolean }

const pretty = (name: string) => name.replace(/-/g, ' ')
const extOf = (file: string) => path.extname(file).slice(1).toLowerCase()

// A folder's entries, hidden ones left out. Symlinks count as what they point to.
async function list(abs: string): Promise<Entry[]> {
  let entries
  try {
    entries = (await fsp.readdir(abs, { withFileTypes: true })).filter((e) => !e.name.startsWith('.'))
  } catch {
    return []
  }
  return Promise.all(
    entries.map(async (e) => {
      if (!e.isSymbolicLink()) return { name: e.name, dir: e.isDirectory(), file: e.isFile() }
      const target = await fsp.stat(path.join(abs, e.name)).catch(() => null)
      return { name: e.name, dir: !!target?.isDirectory(), file: !!target?.isFile() }
    }),
  )
}

async function newestMtime(abs: string): Promise<number> {
  let newest = 0
  for (const entry of await list(abs)) {
    const child = path.join(abs, entry.name)
    if (entry.dir) newest = Math.max(newest, await newestMtime(child))
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
export const kindOf = (docTypes: DocType[], file: string) =>
  docTypes.find((t) => wildcard(t.match).test(file))?.id ?? FALLBACK_KIND.id

const kindsOf = (docTypes: DocType[]): Kind[] => [
  ...docTypes.map(({ id, label, color }) => ({ id, label, color })),
  FALLBACK_KIND,
]

type FolderScan = { tasks: Task[]; collections: Collection[]; index: Scan['index']; preview: FolderPreview }

// One docs folder, read through its layout. Every path and key it hands out
// starts with the folder's name (see shared/keys.ts).
export async function scanFolder(name: string, root: string, layout: Layout, docTypes: DocType[]): Promise<FolderScan> {
  const kinds = kindsOf(docTypes)
  const rank = (kind: string) => kinds.findIndex((k) => k.id === kind)
  const phaseRe = new RegExp(layout.phasePattern)
  const rel = (abs: string) => docPath(name, path.relative(root, abs).split(path.sep).join('/'))

  const preview: FolderPreview = {
    name,
    label: homeRelative(root),
    tasks: 0,
    phases: 0,
    docs: 0,
    byKind: {},
    unnumbered: [],
    skipped: {},
  }
  const index: Scan['index'] = new Map()

  // The files directly in a folder that the dashboard shows, in reading order.
  async function docsIn(dirAbs: string, ws: string, fileTypes: string[], countSkipped = true): Promise<Doc[]> {
    const docs: Doc[] = []
    for (const entry of await list(dirAbs)) {
      if (!entry.file) continue
      const ext = extOf(entry.name)
      if (!fileTypes.includes(ext)) {
        if (countSkipped && ext) preview.skipped[ext] = (preview.skipped[ext] ?? 0) + 1
        continue
      }
      const abs = path.join(dirAbs, entry.name)
      const kind = kindOf(docTypes, entry.name)
      docs.push({ path: rel(abs), file: entry.name, kind, title: await readTitle(abs, entry.name), ws })
      preview.docs++
      preview.byKind[kind] = (preview.byKind[kind] ?? 0) + 1
    }
    return docs.sort((a, b) => rank(a.kind) - rank(b.kind) || a.file.localeCompare(b.file))
  }

  const groupFolders = new Set(layout.groups.map((g) => g.folder))

  async function buildTask(taskName: string, status: Task['status'], taskAbs: string): Promise<Task> {
    const key = taskKey(name, taskName)
    const plansAbs = layout.plansFolder ? path.join(taskAbs, layout.plansFolder) : taskAbs

    // A sub-folder is a phase when its name matches the pattern, or when it
    // holds something to read anyway (those sort last).
    const phases: Folder[] = []
    for (const entry of await list(plansAbs)) {
      if (!entry.dir || (!layout.plansFolder && groupFolders.has(entry.name))) continue
      const m = entry.name.match(phaseRe)
      const fkey = `${key}/${entry.name}`
      const docs = await docsIn(path.join(plansAbs, entry.name), fkey, layout.fileTypes, !!m)
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
    for (const g of layout.groups) {
      const fkey = `${key}/${g.folder}`
      const docs = await docsIn(path.join(taskAbs, g.folder), fkey, g.fileTypes ?? layout.fileTypes, false)
      if (!docs.length) continue
      groups.push({ key: fkey, name: g.folder, label: g.label, num: '', dir: rel(path.join(taskAbs, g.folder)), docs })
    }

    const task: Task = {
      key,
      folder: name,
      name: taskName,
      label: pretty(taskName),
      status,
      dir: rel(taskAbs),
      docs: await docsIn(plansAbs, key, layout.fileTypes),
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
  const collectionTops = new Set(layout.collections.map((c) => c.path.split('/')[0]))

  const tasks: Task[] = []
  const homes: [Task['status'], string][] = layout.statusFolders
    ? [
        ['active', path.join(root, layout.statusFolders.active)],
        ['done', path.join(root, layout.statusFolders.done)],
      ]
    : [[null, root]]
  for (const [status, home] of homes) {
    for (const entry of await list(home)) {
      if (!entry.dir || (!status && collectionTops.has(entry.name))) continue
      tasks.push(await buildTask(entry.name, status, path.join(home, entry.name)))
    }
  }
  // Most recently touched first, which is how you think about tasks.
  tasks.sort((a, b) => b.mtime - a.mtime)

  const collections: Collection[] = []
  for (const c of layout.collections) {
    const docs: (Doc & { mtime: number })[] = []
    for (const abs of await walkPattern(root, c.path.split('/').filter(Boolean))) {
      const file = path.basename(abs)
      if (!layout.fileTypes.includes(extOf(file))) continue
      const mtime = (await fsp.stat(abs).catch(() => null))?.mtimeMs ?? 0
      docs.push({
        path: rel(abs),
        file,
        kind: kindOf(docTypes, file),
        title: await readTitle(abs, file),
        ws: '',
        mtime,
      })
    }
    docs.sort((a, b) => (c.newestFirst ? b.mtime - a.mtime : a.path.localeCompare(b.path)))
    const plain = docs.map(({ mtime: _, ...doc }) => doc)
    // A doc that also sits in a task keeps its place there.
    for (const doc of plain) {
      if (!index.has(doc.path)) index.set(doc.path, { doc, place: { task: c.label, phase: null }, notify: c.notify })
    }
    collections.push({ folder: name, label: c.label, docs: plain })
  }

  preview.tasks = tasks.length
  preview.phases = tasks.reduce((n, t) => n + t.phases.length, 0)
  return { tasks, collections, index, preview }
}

// Every folder in the config. A folder that cannot be read still appears,
// carrying its problem, so the dashboard can say what is wrong with it.
export async function scanAll(config: Config): Promise<Scan> {
  const folders: DocsFolderInfo[] = []
  const previews: FolderPreview[] = []
  const tasks: Task[] = []
  const collections: Collection[] = []
  const index: Scan['index'] = new Map()
  for (const { folder, layout, root } of resolveFolders(config)) {
    const label = root ? homeRelative(root) : folder.path
    if (!root) {
      const problem = `${folder.path} does not exist`
      folders.push({ name: folder.name, root: folder.path, label, settle: false, problem })
      previews.push({
        name: folder.name,
        label,
        problem,
        tasks: 0,
        phases: 0,
        docs: 0,
        byKind: {},
        unnumbered: [],
        skipped: {},
      })
      continue
    }
    const scanned = await scanFolder(folder.name, root, layout, config.docTypes)
    folders.push({ name: folder.name, root, label, settle: !!layout.statusFolders })
    previews.push(scanned.preview)
    tasks.push(...scanned.tasks)
    collections.push(...scanned.collections)
    for (const [k, v] of scanned.index) index.set(k, v)
  }
  return { tree: { folders, tasks, collections, kinds: kindsOf(config.docTypes) }, index, folders: previews }
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
    if (rest.length && entry.dir) out.push(...(await walkPattern(abs, rest)))
    if (!rest.length && entry.file) out.push(abs)
  }
  return out
}
