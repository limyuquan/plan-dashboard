import type { Color } from './config'
import type { Hotkeys } from './hotkeys'

export type Status = 'active' | 'done'

// One file the dashboard can show. `path` is "<folder>/<path inside it>" (see
// shared/keys.ts) and is also its id. `ws` is the workspace it belongs to
// ("" for loose files).
export type Doc = { path: string; file: string; kind: string; title: string; ws: string }

// A folder whose files open together as one workspace: a phase, a group like
// research/, or a task's own top-level plans.
export type Folder = { key: string; name: string; label: string; num: string; dir: string; docs: Doc[] }

export type Task = {
  // Also the workspace key of the task's own plans: "<folder>:<task>".
  key: string
  folder: string
  name: string
  label: string
  icon?: string
  status: Status | null
  dir: string
  docs: Doc[]
  phases: Folder[]
  groups: Folder[]
  mtime: number
}

export type Collection = { folder: string; label: string; docs: Doc[] }

export type Kind = { id: string; label: string; color: Color; icon?: string }

// One configured docs folder, as the browser sees it.
export type DocsFolderInfo = {
  name: string
  icon?: string
  // The real path, and the same as shown to people (~ for the home folder).
  root: string
  label: string
  // Whether its tasks can be settled, i.e. it has status folders.
  settle: boolean
  // Set when the folder cannot be read, e.g. it does not exist.
  problem?: string
}

export type Tree = {
  // In the order of the config. The first one's links leave out its name.
  folders: DocsFolderInfo[]
  tasks: Task[]
  collections: Collection[]
  kinds: Kind[]
  // Every action's combos, defaults filled in.
  hotkeys: Hotkeys
}

// Where a doc sits, as the "new plan" toast names it.
export type Place = { task: string; phase: string | null }

// Pushed from the server over /api/events.
export type ServerEvent =
  | { type: 'tree' }
  | { type: 'added'; doc: Doc; place: Place }
  | { type: 'changed'; path: string }
  | { type: 'open'; ws: string; plan: string; doc: string }

// What one folder's layout finds, for the settings page and `config check`.
export type FolderPreview = {
  name: string
  label: string
  problem?: string
  tasks: number
  phases: number
  docs: number
  byKind: Record<string, number>
  // Phase folders whose names the phase pattern does not match.
  unnumbered: string[]
  // Extensions found next to plans but not listed in fileTypes, with counts.
  skipped: Record<string, number>
}

// The settings page's dry run: how a draft config reads its folders.
export type Preview = { ok: boolean; error?: string; folders: FolderPreview[] }

// /api/tree. No tree means no folder is configured yet. configProblem is set
// when the config file has an error, and the last good settings are in use.
export type TreeResponse = { tree: Tree | null; configProblem?: string }
