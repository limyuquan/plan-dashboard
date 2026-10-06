// The pane layout is a tree, like VS Code's editor groups:
//   - a pane holds tabs (doc paths) and shows one of them
//   - a split lays its children side by side ('row') or stacked ('col'),
//     with sizes in percent that add up to 100
//
// Every function here is pure and returns a new tree. The rules that keep the
// tree tidy all live in prune(): empty panes disappear, their space goes to
// the neighbour, and a split left with one child is replaced by that child.

export type Pane = { type: 'pane'; id: string; tabs: string[]; active: string | null }
export type Split = { type: 'split'; id: string; dir: 'row' | 'col'; children: Node[]; sizes: number[] }
export type Node = Pane | Split
export type Layout = Node

export type Side = 'left' | 'right' | 'top' | 'bottom'
export type Dir = 'left' | 'right' | 'up' | 'down'
export type Rect = { x: number; y: number; w: number; h: number }
export type Result = { layout: Layout; focus: string }

// Smallest a pane may get from a split, in pixels.
export const MIN_W = 280
export const MIN_H = 180
// A workspace opened for the first time gets at most this many panes.
export const MAX_SEEDED = 6

const uid = () => Math.random().toString(36).slice(2, 10)
const equal = (n: number) => Array.from({ length: n }, () => 100 / n)
export const newPane = (tabs: string[] = []): Pane => ({ type: 'pane', id: uid(), tabs, active: tabs[0] ?? null })
const split = (dir: Split['dir'], children: Node[], sizes = equal(children.length)): Split => ({
  type: 'split',
  id: uid(),
  dir,
  children,
  sizes,
})

const axisOf = (side: Side): Split['dir'] => (side === 'left' || side === 'right' ? 'row' : 'col')
const SIDE_OF: Record<Dir, Side> = { left: 'left', right: 'right', up: 'top', down: 'bottom' }

export function panes(node: Node): Pane[] {
  return node.type === 'pane' ? [node] : node.children.flatMap(panes)
}

export const findPane = (l: Layout, id: string) => panes(l).find((p) => p.id === id) ?? null
export const firstPane = (l: Layout) => panes(l)[0]
export const allPaths = (l: Layout) => panes(l).flatMap((p) => p.tabs)
export const paneWith = (l: Layout, path: string) => panes(l).find((p) => p.tabs.includes(path)) ?? null

function mapPanes(node: Node, fn: (p: Pane) => Node): Node {
  return node.type === 'pane' ? fn(node) : { ...node, children: node.children.map((c) => mapPanes(c, fn)) }
}

const updatePane = (l: Layout, id: string, fn: (p: Pane) => Pane) => mapPanes(l, (p) => (p.id === id ? fn(p) : p))

function pruneNode(node: Node): Node | null {
  if (node.type === 'pane') return node.tabs.length ? node : null
  const kids = node.children.map(pruneNode)
  const sizes = [...node.sizes]
  // A removed child's space goes to the child before it, or else the one after.
  kids.forEach((kid, i) => {
    if (kid) return
    const before = kids.slice(0, i).findLastIndex(Boolean)
    const after = kids.findIndex((k, j) => j > i && k)
    const heir = before >= 0 ? before : after
    if (heir >= 0) sizes[heir] += sizes[i]
  })
  const children: Node[] = []
  const kept: number[] = []
  kids.forEach((kid, i) => {
    if (!kid) return
    // A child split running the same way as this one merges into it.
    if (kid.type === 'split' && kid.dir === node.dir) {
      children.push(...kid.children)
      kept.push(...kid.sizes.map((s) => (s * sizes[i]) / 100))
    } else {
      children.push(kid)
      kept.push(sizes[i])
    }
  })
  if (!children.length) return null
  if (children.length === 1) return children[0]
  const total = kept.reduce((a, b) => a + b, 0)
  return { ...node, children, sizes: kept.map((s) => (s / total) * 100) }
}

// Tidies the tree after any change. An empty layout keeps one empty pane,
// reusing the old first pane's id so React does not rebuild it.
export function prune(l: Layout): Layout {
  return pruneNode(l) ?? { type: 'pane', id: firstPane(l).id, tabs: [], active: null }
}

// Puts a pane next to another, halving the space the other one had.
function insertBeside(l: Layout, refId: string, side: Side, pane: Pane): Layout {
  const dir = axisOf(side)
  const after = side === 'right' || side === 'bottom'
  const visit = (node: Node): Node => {
    if (node.type === 'pane') {
      if (node.id !== refId) return node
      return split(dir, after ? [node, pane] : [pane, node])
    }
    const i = node.children.findIndex((c) => c.type === 'pane' && c.id === refId)
    if (i >= 0 && node.dir === dir) {
      const children = [...node.children]
      const sizes = [...node.sizes]
      const half = sizes[i] / 2
      sizes[i] = half
      children.splice(after ? i + 1 : i, 0, pane)
      sizes.splice(after ? i + 1 : i, 0, half)
      return { ...node, children, sizes }
    }
    return { ...node, children: node.children.map(visit) }
  }
  return visit(l)
}

function withTab(p: Pane, path: string, index?: number): Pane {
  const tabs = p.tabs.filter((t) => t !== path)
  tabs.splice(index ?? tabs.length, 0, path)
  return { ...p, tabs, active: path }
}

function withoutTab(p: Pane, path: string): Pane {
  const at = p.tabs.indexOf(path)
  if (at < 0) return p
  const tabs = p.tabs.filter((t) => t !== path)
  // Closing the tab you are on shows its right-hand neighbour, else the left.
  const active = p.active === path ? (tabs[at] ?? tabs[at - 1] ?? null) : p.active
  return { ...p, tabs, active }
}

const focusAfter = (l: Layout, wanted: string) => (findPane(l, wanted) ? wanted : firstPane(l).id)

export const activate = (l: Layout, paneId: string, path: string) =>
  updatePane(l, paneId, (p) => ({ ...p, active: path }))

export function addTab(l: Layout, paneId: string, path: string, index?: number): Layout {
  return updatePane(l, paneId, (p) => withTab(p, path, index))
}

export function closeTab(l: Layout, paneId: string, path: string): Result {
  const layout = prune(updatePane(l, paneId, (p) => withoutTab(p, path)))
  return { layout, focus: focusAfter(layout, paneId) }
}

// Focus goes to the pane before the closed one, so it stays nearby.
export function closePane(l: Layout, paneId: string): Result {
  const order = panes(l)
  const before = order[Math.max(0, order.findIndex((p) => p.id === paneId) - 1)]
  const layout = prune(updatePane(l, paneId, (p) => ({ ...p, tabs: [], active: null })))
  return { layout, focus: focusAfter(layout, before.id) }
}

// Moves a tab into another pane, or to a new position in its own pane.
export function moveTab(l: Layout, from: string, to: string, path: string, index?: number): Result {
  if (from === to) return { layout: addTab(l, to, path, index), focus: to }
  if (!findPane(l, to) || !findPane(l, from)?.tabs.includes(path)) return { layout: l, focus: from }
  const moved = updatePane(
    updatePane(l, from, (p) => withoutTab(p, path)),
    to,
    (p) => withTab(p, path, index),
  )
  return { layout: prune(moved), focus: to }
}

// Takes a tab out of its pane into a new pane beside `refId`.
export function moveToNewPane(l: Layout, from: string, path: string, refId: string, side: Side): Result {
  const source = findPane(l, from)
  if (!source?.tabs.includes(path)) return { layout: l, focus: from }
  // Splitting a pane's only tab off itself would just leave the same pane.
  if (from === refId && source.tabs.length === 1) return { layout: l, focus: from }
  const pane = newPane([path])
  const placed = insertBeside(
    updatePane(l, from, (p) => withoutTab(p, path)),
    refId,
    side,
    pane,
  )
  return { layout: prune(placed), focus: pane.id }
}

// A doc dragged in from the sidebar: into a pane, or into a new pane beside it.
export function dropDoc(l: Layout, path: string, refId: string, zone: Side | 'center'): Result {
  if (zone === 'center') return { layout: addTab(l, refId, path), focus: refId }
  const pane = newPane([path])
  return { layout: insertBeside(l, refId, zone, pane), focus: pane.id }
}

// Brings a doc that is already open to the front instead of opening it twice.
export function reveal(l: Layout, path: string): Result | null {
  const pane = paneWith(l, path)
  return pane ? { layout: activate(l, pane.id, path), focus: pane.id } : null
}

// Whether a pane has room to be split on that side. `size` is the whole
// layout's size in pixels.
export type Room = (paneId: string, side: Side) => boolean

export function roomFor(l: Layout, size: { width: number; height: number }): Room {
  const boxes = rects(l)
  return (paneId, side) => {
    const r = boxes.get(paneId)
    if (!r) return false
    return axisOf(side) === 'row' ? (r.w * size.width) / 2 >= MIN_W : (r.h * size.height) / 2 >= MIN_H
  }
}

// Opening from the sidebar. 'next' uses the pane after the focused one, or
// splits one off to the right (else below) when the focused pane is the last.
export function openTab(l: Layout, focus: string, path: string, where: 'focused' | 'next', room: Room): Result {
  const order = panes(l)
  const at = Math.max(
    0,
    order.findIndex((p) => p.id === focus),
  )
  const current = order[at]
  if (where === 'focused') return { layout: addTab(l, current.id, path), focus: current.id }
  const next = order[at + 1]
  if (next) return { layout: addTab(l, next.id, path), focus: next.id }
  if (!current.tabs.length) return { layout: addTab(l, current.id, path), focus: current.id }
  for (const side of ['right', 'bottom'] as const) {
    if (room(current.id, side)) return dropDoc(l, path, current.id, side)
  }
  return { layout: addTab(l, order[0].id, path), focus: order[0].id }
}

// Ctrl/Option + arrow: send the shown tab to the pane that way, or split a
// new pane off that way when there is none and the pane has tabs to spare.
export function shift(l: Layout, paneId: string, dir: Dir, room: Room): Result | null {
  const pane = findPane(l, paneId)
  if (!pane?.active) return null
  const target = neighbour(l, paneId, dir)
  if (target) return moveTab(l, paneId, target, pane.active)
  if (pane.tabs.length > 1 && room(paneId, SIDE_OF[dir])) {
    return moveToNewPane(l, paneId, pane.active, paneId, SIDE_OF[dir])
  }
  return null
}

export const canShift = (l: Layout, paneId: string, dir: Dir) => neighbour(l, paneId, dir) !== null

export function resize(l: Layout, splitId: string, sizes: number[]): Layout {
  if (l.type === 'pane') return l
  if (l.id === splitId) return { ...l, sizes }
  return { ...l, children: l.children.map((c) => resize(c, splitId, sizes)) }
}

// Where each pane sits, as fractions of the whole layout.
export function rects(l: Layout): Map<string, Rect> {
  const out = new Map<string, Rect>()
  const visit = (node: Node, r: Rect) => {
    if (node.type === 'pane') return void out.set(node.id, r)
    let offset = 0
    node.children.forEach((child, i) => {
      const share = node.sizes[i] / 100
      visit(
        child,
        node.dir === 'row'
          ? { x: r.x + offset * r.w, y: r.y, w: share * r.w, h: r.h }
          : { x: r.x, y: r.y + offset * r.h, w: r.w, h: share * r.h },
      )
      offset += share
    })
  }
  visit(l, { x: 0, y: 0, w: 1, h: 1 })
  return out
}

// The pane that is actually next to this one on screen in that direction: it
// must share the edge, and the one sharing most of it wins.
export function neighbour(l: Layout, paneId: string, dir: Dir): string | null {
  const boxes = rects(l)
  const me = boxes.get(paneId)
  if (!me) return null
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-6
  const overlap = (a0: number, a1: number, b0: number, b1: number) => Math.min(a1, b1) - Math.max(a0, b0)
  let best: string | null = null
  let bestOverlap = 1e-6
  for (const [id, r] of boxes) {
    if (id === paneId) continue
    const touches =
      dir === 'left'
        ? near(r.x + r.w, me.x)
        : dir === 'right'
          ? near(r.x, me.x + me.w)
          : dir === 'up'
            ? near(r.y + r.h, me.y)
            : near(r.y, me.y + me.h)
    if (!touches) continue
    const shared =
      dir === 'left' || dir === 'right'
        ? overlap(me.y, me.y + me.h, r.y, r.y + r.h)
        : overlap(me.x, me.x + me.w, r.x, r.x + r.w)
    if (shared > bestOverlap) {
      best = id
      bestOverlap = shared
    }
  }
  return best
}

// First visit to a workspace: one pane per doc. Three or fewer sit in a row;
// more split over two rows, so four is a square and five is three over two.
export function seed(paths: string[]): Layout {
  const docs = paths.slice(0, MAX_SEEDED)
  if (!docs.length) return newPane()
  const row = (list: string[]): Node =>
    list.length === 1
      ? newPane(list)
      : split(
          'row',
          list.map((p) => newPane([p])),
        )
  if (docs.length <= 3) return row(docs)
  const top = Math.ceil(docs.length / 2)
  return split('col', [row(docs.slice(0, top)), row(docs.slice(top))])
}

// Settling a task moves its folder, so every path under it changes.
export function retarget(l: Layout, oldPrefix: string, newPrefix: string): Layout {
  const swap = (p: string) => (p.startsWith(oldPrefix) ? newPrefix + p.slice(oldPrefix.length) : p)
  return mapPanes(l, (p) => ({ ...p, tabs: p.tabs.map(swap), active: p.active && swap(p.active) }))
}

// Saved layouts come back from localStorage; anything malformed is dropped.
export function isLayout(value: unknown): value is Layout {
  const v = value as Node | null
  if (!v || typeof v !== 'object' || typeof v.id !== 'string') return false
  if (v.type === 'pane') return Array.isArray(v.tabs) && v.tabs.every((t) => typeof t === 'string')
  return (
    v.type === 'split' &&
    (v.dir === 'row' || v.dir === 'col') &&
    Array.isArray(v.children) &&
    v.children.length === v.sizes?.length &&
    v.sizes.every((s) => Number.isFinite(s) && s > 0) &&
    v.children.every(isLayout)
  )
}
