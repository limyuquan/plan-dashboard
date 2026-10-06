import { describe, expect, it } from 'vitest'
import {
  closePane,
  closeTab,
  dropDoc,
  isLayout,
  moveTab,
  moveToNewPane,
  neighbour,
  newPane,
  openTab,
  panes,
  retarget,
  roomFor,
  seed,
  shift,
  type Layout,
  type Node,
  type Pane,
  type Split,
} from './model'

const p = (id: string, ...tabs: string[]): Pane => ({
  type: 'pane',
  id,
  tabs: tabs.length ? tabs : [id],
  active: tabs[0] ?? id,
})
const s = (dir: Split['dir'], children: Node[], sizes?: number[]): Split => ({
  type: 'split',
  id: `s-${children.map((c) => c.id).join('')}`,
  dir,
  children,
  sizes: sizes ?? children.map(() => 100 / children.length),
})

// The tree's shape with ids and sizes, rounded, for readable expectations.
const shape = (n: Node): unknown =>
  n.type === 'pane' ? n.tabs.join('+') : { [n.dir]: n.children.map(shape), sizes: n.sizes.map((x) => Math.round(x)) }

const big = { width: 3000, height: 2000 }
const tiny = { width: 400, height: 300 }

describe('seed', () => {
  it('puts three or fewer docs in one row', () => {
    expect(shape(seed(['a', 'b', 'c']))).toEqual({ row: ['a', 'b', 'c'], sizes: [33, 33, 33] })
  })
  it('splits more over two rows, top row first, and stops at six', () => {
    expect(shape(seed(['a', 'b', 'c', 'd', 'e', 'f', 'g']))).toEqual({
      col: [
        { row: ['a', 'b', 'c'], sizes: [33, 33, 33] },
        { row: ['d', 'e', 'f'], sizes: [33, 33, 33] },
      ],
      sizes: [50, 50],
    })
  })
})

describe('splitting', () => {
  it('splitting one pane below leaves its neighbours alone', () => {
    const l = s('row', [p('A'), p('B')], [70, 30])
    const { layout } = dropDoc(l, 'n', 'B', 'bottom')
    expect(shape(layout)).toEqual({ row: ['A', { col: ['B', 'n'], sizes: [50, 50] }], sizes: [70, 30] })
  })
  it('splitting along the parent direction halves only that pane', () => {
    const l = s('row', [p('A'), p('B')], [70, 30])
    expect(shape(dropDoc(l, 'n', 'B', 'right').layout)).toEqual({ row: ['A', 'B', 'n'], sizes: [70, 15, 15] })
  })
  it('will not split a pane off its own only tab', () => {
    const l = s('row', [p('A'), p('B')])
    expect(moveToNewPane(l, 'A', 'A', 'A', 'bottom').layout).toBe(l)
  })
  it('refuses a split that would leave a half under the minimum size', () => {
    const l = s('row', [p('A'), p('B')])
    expect(roomFor(l, big)('A', 'right')).toBe(true)
    expect(roomFor(l, tiny)('A', 'right')).toBe(false)
  })
})

describe('closing', () => {
  it('gives a closed pane its space to the pane before it', () => {
    const l = s('row', [p('A'), p('B'), p('C')], [20, 30, 50])
    expect(shape(closePane(l, 'B').layout)).toEqual({ row: ['A', 'C'], sizes: [50, 50] })
  })
  it('collapses a split left with one child and merges same-direction splits', () => {
    const l = s('row', [p('A'), s('col', [p('B'), s('row', [p('C'), p('D')])])])
    expect(shape(closeTab(l, 'B', 'B').layout)).toEqual({ row: ['A', 'C', 'D'], sizes: [50, 25, 25] })
  })
  it('shows the right-hand neighbour after closing the active tab', () => {
    const l = p('A', 'x', 'y', 'z')
    const { layout } = closeTab({ ...l, active: 'y' }, 'A', 'y')
    expect((layout as Pane).active).toBe('z')
  })
  it('keeps one empty pane when everything is closed', () => {
    const { layout } = closeTab(p('A'), 'A', 'A')
    expect(layout).toEqual({ type: 'pane', id: 'A', tabs: [], active: null })
  })
})

describe('moving tabs', () => {
  it('reorders a tab within its pane', () => {
    const { layout } = moveTab(p('A', 'x', 'y', 'z'), 'A', 'A', 'z', 0)
    expect((layout as Pane).tabs).toEqual(['z', 'x', 'y'])
  })
  it('removes the source pane when its last tab leaves', () => {
    const l = s('row', [p('A'), p('B')])
    expect(shape(moveTab(l, 'A', 'B', 'A').layout)).toBe('B+A')
  })
})

describe('neighbour', () => {
  // Top row A|B|C at 20/20/60, bottom row D|E at 50/50. B sits over D on screen.
  const l = s('col', [s('row', [p('A'), p('B'), p('C')], [20, 20, 60]), s('row', [p('D'), p('E')])])
  it('picks the pane actually below, not the one at the same index', () => {
    expect(neighbour(l, 'B', 'down')).toBe('D')
  })
  it('has none past the edge', () => {
    expect(neighbour(l, 'C', 'right')).toBeNull()
  })
})

describe('keyboard shift', () => {
  it('moves the shown tab to the neighbour that way', () => {
    const l = s('row', [{ ...p('A', 'x', 'y'), active: 'y' }, p('B')])
    expect(shape(shift(l, 'A', 'right', roomFor(l, big))!.layout)).toEqual({ row: ['x', 'B+y'], sizes: [50, 50] })
  })
  it('splits a new pane off when nothing is that way', () => {
    const l = { ...p('A', 'x', 'y'), active: 'y' }
    expect(shape(shift(l, 'A', 'down', roomFor(l, big))!.layout)).toEqual({ col: ['x', 'y'], sizes: [50, 50] })
  })
  it('does nothing for a lone tab with nowhere to go', () => {
    expect(shift(p('A'), 'A', 'left', roomFor(p('A'), big))).toBeNull()
  })
})

describe('openTab next', () => {
  it('splits right off the last pane when there is room, else uses the first pane', () => {
    const l = s('row', [p('A'), p('B')])
    expect(shape(openTab(l, 'B', 'n', 'next', roomFor(l, big)).layout)).toEqual({
      row: ['A', 'B', 'n'],
      sizes: [50, 25, 25],
    })
    expect(shape(openTab(l, 'B', 'n', 'next', roomFor(l, tiny)).layout)).toEqual({ row: ['A+n', 'B'], sizes: [50, 50] })
  })
})

it('retargets tab paths after a task folder moves', () => {
  const l = retarget(p('A', 'active/t/plan.html', 'active/other/x.md'), 'active/t/', 'done/t/')
  expect(panes(l)[0].tabs).toEqual(['done/t/plan.html', 'active/other/x.md'])
})

it('rejects saved layouts that are not a pane tree', () => {
  expect(isLayout(newPane(['a']))).toBe(true)
  expect(isLayout({ rows: [], heights: [] } as unknown as Layout)).toBe(false)
})
