import { expect, test } from '@playwright/test'
import { DEMO } from './helpers'

test('searching finds words inside plans and opens the plan at the match', async ({ page }) => {
  await page.goto(DEMO)
  await page.locator('.search').fill('tokenised')
  const hit = page.locator('.search-hit', { hasText: 'Phase 1 — Index schema' })
  await expect(hit.locator('mark')).toHaveText('tokenised')
  await hit.click()
  await expect(page.locator('.tab[data-active] .tab-title')).toHaveText('Phase 1 — Index schema')
  const frame = page.frameLocator('.pane iframe').first()
  await expect.poll(() => frame.locator('body').evaluate(() => getSelection()?.toString())).toBe('tokenised')
})
