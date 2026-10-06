import type { Locator, Page } from '@playwright/test'

export const DEMO = 'http://localhost:4310'
export const EMPTY = 'http://localhost:4311'
export const PHASE2 = 'plans:planner-v1/phase-2-split-tree-layout'

type Node = { type: 'pane'; tabs: string[] } | { type: 'split'; dir: string; children: Node[]; sizes: number[] }

// A workspace's saved layout, as file names and rounded sizes, e.g.
// { row: ['plan.html', { col: ['eli5.html', 'recap.html'] }], sizes: [33, 67] }.
export async function layout(page: Page, ws = PHASE2): Promise<unknown> {
  const node = await page.evaluate((key) => JSON.parse(localStorage.getItem('plan-dashboard.layouts') ?? '{}')[key], ws)
  const shape = (n: Node): unknown =>
    n.type === 'pane'
      ? n.tabs.map((t) => t.split('/').pop()).join('+')
      : { [n.dir]: n.children.map(shape), sizes: n.sizes.map(Math.round) }
  return node && shape(node)
}

// Drags with real mouse moves, the way the app's HTML5 drag and drop expects.
export async function drag(page: Page, from: Locator, to: { x: number; y: number }) {
  const box = (await from.boundingBox())!
  await page.mouse.move(box.x + 20, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 40, box.y + box.height / 2 + 10, { steps: 4 })
  await page.mouse.move(to.x, to.y, { steps: 12 })
  await page.waitForTimeout(150)
  await page.mouse.up()
}

export async function openPhase2(page: Page) {
  await page.goto(`${DEMO}/?ws=planner-v1/phase-2-split-tree-layout&plan=plan.html`)
  await page.locator('.pane').nth(2).waitFor()
}
