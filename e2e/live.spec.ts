import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { e2eHome } from './paths.mjs'
import { DEMO, layout, openPhase2 } from './helpers'

const phase3 = path.join(e2eHome('4310'), 'plans/active/planner-v1/plans/phase-3-settings')

test('a plan written while Planner is open raises a notification that opens it', async ({ page }) => {
  await page.goto(`${DEMO}/?ws=planner-v1/phase-3-settings&plan=plan.html`)
  await page.locator('.pane').first().waitFor()
  fs.writeFileSync(path.join(phase3, 'eli5.html'), '<html><head><title>Phase 3 (ELI5)</title></head></html>')
  try {
    const toast = page.locator('.toast', { hasText: 'New plan' })
    await expect(toast).toContainText('Phase 3 (ELI5)')
    await toast.locator('.toast-action').click()
    await expect(page.locator('.tab[data-active] .tab-title')).toHaveText('Phase 3 (ELI5)')
  } finally {
    fs.rmSync(path.join(phase3, 'eli5.html'), { force: true })
  }
})

test('settling a task keeps its open tabs, and Undo brings it back', async ({ page }) => {
  await openPhase2(page)
  const row = page.locator('.task-row', { hasText: 'Planner V1' })
  await row.hover()
  await row.locator('.task-act', { hasText: 'settle' }).click()
  await expect(page.locator('.toast-text', { hasText: 'Settled' })).toBeVisible()
  expect(JSON.stringify(await layout(page))).toContain('plan.html')
  await expect(page.locator('iframe').first()).toHaveAttribute('src', /\/docs\/plans\/done\//)
  await page.locator('.toast-action', { hasText: 'Undo' }).click()
  await expect(page.locator('iframe').first()).toHaveAttribute('src', /\/docs\/plans\/active\//)
})
