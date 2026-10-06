import type { Color } from './config'

export type Status = 'active' | 'done'

// One file the dashboard can show. `path` is relative to the docs root and is
// also its id. `ws` is the workspace it belongs to ("" for loose files).
export type Doc = { path: string; file: string; kind: string; title: string; ws: string }

// A folder whose files open together as one workspace: a phase, a group like
// research/, or a task's own top-level plans.
export type Folder = { key: string; name: string; label: string; num: string; dir: string; docs: Doc[] }

export type Task = {
  // Also the workspace key of the task's own plans.
  key: string
  name: string
  label: string
  status: Status | null
  dir: string
  docs: Doc[]
  phases: Folder[]
  groups: Folder[]
  mtime: number
}

export type Collection = { label: string; docs: Doc[] }

export type Kind = { id: string; label: string; color: Color }

export type Tree = {
  root: string
  // The root as shown to people: under the home folder it starts with ~.
  rootLabel: string
  tasks: Task[]
  collections: Collection[]
  kinds: Kind[]
  // Whether tasks can be settled, i.e. status folders are configured.
  settle: boolean
}

// Where a doc sits, as the "new plan" toast names it.
export type Place = { task: string; phase: string | null }

// Pushed from the server over /api/events.
export type ServerEvent =
  | { type: 'tree' }
  | { type: 'added'; doc: Doc; place: Place }
  | { type: 'changed'; path: string }
  | { type: 'open'; ws: string; plan: string; doc: string }

// The settings page's dry run: how a draft config reads the docs folder.
export type Preview = {
  ok: boolean
  error?: string
  tasks: number
  phases: number
  docs: number
  byKind: Record<string, number>
  // Phase folders whose names the phase pattern does not match.
  unnumbered: string[]
  // Extensions found next to plans but not listed in fileTypes, with counts.
  skipped: Record<string, number>
}

// /api/tree. No tree means there is no docs folder yet, or it has gone.
export type TreeResponse = { tree: Tree | null; problem?: string }
