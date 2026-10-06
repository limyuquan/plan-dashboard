import { expect, test } from '@playwright/test'
import { drag, layout, openPhase2 } from './helpers'

test.beforeEach(({ page }) => openPhase2(page))

test('a new phase opens one pane per plan', async ({ page }) => {
  expect(await layout(page)).toEqual({ row: ['plan.html', 'eli5.html', 'recap.html'], sizes: [33, 33, 33] })
})

test('dropping a tab on the bottom edge of a pane splits only that pane', async ({ page }) => {
  const target = (await page.locator('.pane').nth(1).boundingBox())!
  await drag(page, page.locator('.pane').nth(2).locator('.tab').first(), {
    x: target.x + target.width / 2,
    y: target.y + target.height - 30,
  })
  await expect
    .poll(() => layout(page))
    .toEqual({
      row: ['plan.html', { col: ['eli5.html', 'recap.html'], sizes: [50, 50] }],
      sizes: [33, 67],
    })
})

test('dragging a divider resizes the panes either side of it', async ({ page }) => {
  const divider = (await page.locator('.divider').first().boundingBox())!
  await page.mouse.move(divider.x + 2, divider.y + 300)
  await page.mouse.down()
  await page.mouse.move(divider.x + 200, divider.y + 300, { steps: 8 })
  await page.mouse.up()
  const sizes = ((await layout(page)) as { sizes: number[] }).sizes
  expect(sizes[0]).toBeGreaterThan(40)
  expect(sizes[2]).toBe(33)
})

test('Option + arrow sends the shown tab to the next pane', async ({ page }) => {
  await page.locator('.pane').nth(1).locator('.tab').first().click()
  await page.keyboard.press('Alt+ArrowRight')
  // The emptied pane's space goes to the pane before it.
  await expect.poll(() => layout(page)).toEqual({ row: ['plan.html', 'recap.html+eli5.html'], sizes: [67, 33] })
})

test('dragging a tab along its strip reorders it', async ({ page }) => {
  await page.keyboard.press('Alt+ArrowRight') // plan joins the eli5 pane: eli5+plan
  const strip = page.locator('.pane').first().locator('.tab')
  const first = (await strip.first().boundingBox())!
  await drag(page, strip.nth(1), { x: first.x + 4, y: first.y + first.height / 2 })
  await expect.poll(() => layout(page)).toEqual({ row: ['plan.html+eli5.html', 'recap.html'], sizes: [67, 33] })
})

test('closing a pane can be undone', async ({ page }) => {
  await page.locator('.pane').nth(1).locator('.pane-close').click()
  await expect(page.locator('.pane')).toHaveCount(2)
  await page.locator('.toast-action', { hasText: 'Undo' }).click()
  await expect(page.locator('.pane')).toHaveCount(3)
})
