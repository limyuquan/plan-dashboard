import type { Task, Tree } from '../../shared/types'
import { roomIn } from '../layout/area'
import {
  allPaths,
  closePane,
  findPane,
  firstPane,
  newPane,
  openTab,
  reveal,
  addTab,
  seed,
  type Layout,
  type Result,
} from '../layout/model'
import { getState, setState } from './store'
import { pushToast } from './toasts'

// Shown for a workspace that has no layout yet. Shared, so its pane id is stable.
export const BLANK = newPane()

export const layoutOf = (key: string): Layout => getState().layouts[key] ?? BLANK
export const currentLayout = () => layoutOf(getState().current)

export function setLayout(layout: Layout, focus = getState().focus, key = getState().current) {
  setState((s) => ({ layouts: { ...s.layouts, [key]: layout }, focus }))
}

export const apply = (r: Result) => setLayout(r.layout, r.focus)

export const setFocus = (focus: string) => setState({ focus })

// A task's own workspace is its top-level plans. Without any, its latest phase
// with something to read is the useful place to land instead.
export function landingKey(task: Task): string {
  if (task.docs.length) return task.key
  const withDocs = task.phases.filter((p) => p.docs.length)
  return withDocs.at(-1)?.key ?? task.key
}

// Where to start when there is no workspace yet, or the current one is gone.
export function firstLanding(tree: Tree | null): string {
  const task = tree?.tasks.find((t) => t.status !== 'done') ?? tree?.tasks[0]
  return task ? landingKey(task) : ''
}

const seeded = (key: string) =>
  seed(
    getState()
      .workspaces.get(key)
      ?.docs.map((d) => d.path) ?? [],
  )

// Switching workspace brings back your arrangement there, or lays one out
// from its docs if it has none (or you closed everything in it).
export function enter(key: string) {
  const saved = getState().layouts[key]
  const layout = saved && allPaths(saved).length ? saved : seeded(key)
  setLayout(layout, firstPane(layout).id, key)
  setState({ current: key })
}

// Lays a workspace out again from its docs, which also picks up new ones.
// Your arrangement is one Undo away.
export function resetLayout(key = getState().current) {
  const before = layoutOf(key)
  const layout = seeded(key)
  setLayout(layout, firstPane(layout).id, key)
  setState({ current: key })
  pushToast({
    text: 'Layout reset',
    action: { label: 'Undo', run: () => setLayout(before, firstPane(before).id, key) },
  })
}

// Closing a pane throws its tabs away, so offer them back.
export function closePaneWithUndo(paneId: string) {
  const key = getState().current
  const before = layoutOf(key)
  apply(closePane(before, paneId))
  if (!findPane(before, paneId)?.tabs.length) return
  pushToast({ text: 'Pane closed', action: { label: 'Undo', run: () => setLayout(before, paneId, key) } })
}

function markSeen(path: string) {
  const task = getState().docs.get(path)?.ws.split('/')[0]
  if (!task || !getState().unseen.has(task)) return
  setState((s) => {
    const unseen = new Set(s.unseen)
    unseen.delete(task)
    return { unseen }
  })
}

// Opening a doc adds it to the workspace on screen, whichever folder it is
// from: switching workspace is the sidebar's job, not a side effect of a click.
export function openDoc(path: string, where: 'focused' | 'next' = 'focused') {
  const layout = currentLayout()
  apply(reveal(layout, path) ?? openTab(layout, getState().focus, path, where, roomIn(layout)))
  markSeen(path)
}

// Goes to the workspace a doc belongs to, with the doc open and in front.
export function openInWorkspace(path: string) {
  const ws = getState().docs.get(path)?.ws
  if (!ws) return openDoc(path)
  const saved = getState().layouts[ws]
  const base = saved && allPaths(saved).length ? saved : seeded(ws)
  const result = reveal(base, path) ?? { layout: addTab(base, firstPane(base).id, path), focus: firstPane(base).id }
  setLayout(result.layout, result.focus, ws)
  setState({ current: ws })
  markSeen(path)
}
