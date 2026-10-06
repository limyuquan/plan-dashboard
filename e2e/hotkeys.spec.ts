import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { e2eHome } from './paths.mjs'
import { openPhase2 } from './helpers'

const configFile = path.join(e2eHome('4310'), '.config/planner/config.json')

test('a shortcut recorded in settings replaces the default once saved', async ({ page }) => {
  const before = fs.readFileSync(configFile, 'utf8')
  try {
    await openPhase2(page)
    await page.locator('button[title=Settings]').click()
    const row = page.locator('.hotkey-row', { hasText: 'Close tab' })
    await row.locator('button[title=Remove]').click()
    await row.locator('.link-btn', { hasText: 'record' }).click()
    await page.keyboard.press('Alt+KeyQ')
    await expect(row.locator('kbd')).toHaveText(['Alt + Q'])
    await page.locator('.btn.primary', { hasText: 'Save' }).click()
    await expect(page.locator('.modal')).toHaveCount(0)

    await page.locator('.pane').first().locator('.tab').first().click()
    await page.keyboard.press('Alt+KeyW')
    await expect(page.locator('.pane')).toHaveCount(3)
    await page.keyboard.press('Alt+KeyQ')
    await expect(page.locator('.pane')).toHaveCount(2)
  } finally {
    fs.writeFileSync(configFile, before)
  }
})
