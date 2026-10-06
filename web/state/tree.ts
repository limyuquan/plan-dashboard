import type { Doc, ServerEvent, Tree, TreeResponse } from '../../shared/types'
import { api } from '../api'
import { retarget } from '../layout/model'
import { flagNewPlan } from '../toasts/tabAlert'
import { followLink, followPendingLink, hasPendingLink } from './links'
import { getState, setState, type Workspace } from './store'
import { pushToast } from './toasts'
import { enter, firstLanding, openDoc, openInWorkspace } from './workspaces'

// Non-zero while a settle/restore is renaming a folder. The tree is half
// renamed then, so a workspace can look gone when it is only moving.
let moving = 0

function indexTree(tree: Tree) {
  const docs = new Map<string, Doc>()
  const workspaces = new Map<string, Workspace>()
  const add = (key: string, task: string, num: string, list: Doc[]) => {
    workspaces.set(key, { key, task, num, docs: list })
    for (const d of list) docs.set(d.path, d)
  }
  for (const task of tree.tasks) {
    add(task.key, task.key, '', task.docs)
    for (const folder of [...task.phases, ...task.groups]) add(folder.key, task.key, folder.num, folder.docs)
  }
  for (const c of tree.collections) for (const d of c.docs) docs.set(d.path, d)
  return { docs, workspaces }
}

function setTree({ tree, problem }: TreeResponse) {
  if (!tree) return setState({ tree: null, problem, loaded: true })
  const { docs, workspaces } = indexTree(tree)
  // Keep loose docs opened by link; the tree never lists them.
  for (const [path, doc] of getState().docs) if (!docs.has(path) && !doc.ws) docs.set(path, doc)
  setState((s) => ({
    tree,
    problem: undefined,
    loaded: true,
    docs,
    workspaces,
    kinds: new Map(tree.kinds.map((k) => [k.id, k])),
    // Folders that are gone leave layouts behind; drop those.
    layouts: moving
      ? s.layouts
      : Object.fromEntries(Object.entries(s.layouts).filter(([key]) => workspaces.has(key) || key === '')),
  }))
  if (moving) return
  if (hasPendingLink()) return followPendingLink()
  if (!workspaces.has(getState().current)) enter(firstLanding(tree))
}

export const refresh = async () => setTree(await api.tree())

// Settle / restore. The folder really moves, so tabs follow it to its new path.
export async function moveTask(task: string, to: 'active' | 'done', announce = true) {
  moving++
  try {
    const moved = await api.move(task, to)
    setState((s) => ({
      layouts: Object.fromEntries(
        Object.entries(s.layouts).map(([k, l]) => [k, retarget(l, `${moved.from}/`, `${moved.to}/`)]),
      ),
    }))
  } catch (err) {
    pushToast({ text: `Could not move ${task}`, detail: (err as Error).message })
    return
  } finally {
    moving--
  }
  await refresh()
  if (announce) {
    pushToast({
      text: to === 'done' ? `Settled ${task}` : `Moved ${task} back to active`,
      action: { label: 'Undo', run: () => moveTask(task, to === 'done' ? 'active' : 'done', false) },
    })
  }
}

export function onServerEvent(event: ServerEvent) {
  if (event.type === 'open') return followLink(event)
  if (event.type === 'changed') {
    return setState((s) => ({ versions: { ...s.versions, [event.path]: (s.versions[event.path] ?? 0) + 1 } }))
  }
  void refresh()
  if (event.type !== 'added') return
  const { doc, place } = event
  const task = doc.ws.split('/')[0]
  setState((s) => ({ docs: new Map(s.docs).set(doc.path, doc), unseen: task ? new Set(s.unseen).add(task) : s.unseen }))
  flagNewPlan()
  // Task, then folder, then what the doc is: the order you need to decide
  // whether to go and look.
  pushToast({
    text: place.task,
    detail: place.phase ?? undefined,
    lasting: true,
    doc,
    action: doc.ws
      ? { label: 'Workspace', run: () => openInWorkspace(doc.path) }
      : { label: 'Open', run: () => openDoc(doc.path) },
  })
}
