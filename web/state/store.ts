import { create } from 'zustand'
import type { Doc, Kind, Tree } from '../../shared/types'
import { isLayout, type Layout } from '../layout/model'
import { load, save } from '../persist'

export type Toast = {
  id: number
  text: string
  detail?: string
  // A lasting toast stays a minute rather than a few seconds, long enough to
  // notice a new plan and act on it.
  lasting?: boolean
  // Set on a "new plan" toast: what the plan is.
  doc?: Doc
  action?: { label: string; run: () => void }
}

// Something on its way to a pane: a tab from another pane, or a doc from the sidebar.
export type Drag = { kind: 'tab'; from: string; path: string } | { kind: 'doc'; path: string }

// A workspace is a folder whose docs open together: a task's own plans, a
// phase, or a group like research/. Keyed the same way links name them.
// `num` is the phase number, shown on the tabs that came from it.
export type Workspace = { key: string; task: string; num: string; docs: Doc[] }

export type State = {
  tree: Tree | null
  // The config file's error, while the last good settings are in use.
  configProblem?: string
  loaded: boolean
  // Every doc we can name: the tree's, plus loose ones opened by link.
  docs: Map<string, Doc>
  workspaces: Map<string, Workspace>
  kinds: Map<string, Kind>
  // One saved pane layout per workspace.
  layouts: Record<string, Layout>
  current: string
  focus: string
  toasts: Toast[]
  // Tasks that got a new plan since you last opened something from them.
  unseen: Set<string>
  drag: Drag | null
  // Bumped when a file changes on disk, so panes showing it reload.
  versions: Record<string, number>
  settingsOpen: boolean
}

function loadLayouts(): Record<string, Layout> {
  const raw = load<Record<string, unknown>>('layouts', {})
  return Object.fromEntries(Object.entries(raw).filter((entry): entry is [string, Layout] => isLayout(entry[1])))
}

export const useStore = create<State>(() => ({
  tree: null,
  loaded: false,
  docs: new Map(),
  workspaces: new Map(),
  kinds: new Map(),
  layouts: loadLayouts(),
  current: load('current', ''),
  focus: '',
  toasts: [],
  unseen: new Set(),
  drag: null,
  versions: {},
  settingsOpen: false,
}))

export const getState = useStore.getState

// The first docs folder, whose name links leave out (see shared/keys.ts).
export const firstFolder = () => getState().tree?.folders[0]?.name ?? ''
export const setState = useStore.setState

useStore.subscribe((now, before) => {
  if (now.layouts !== before.layouts) save('layouts', now.layouts)
  if (now.current !== before.current) save('current', now.current)
})
