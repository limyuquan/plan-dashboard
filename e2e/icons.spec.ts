import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { e2eHome } from './paths.mjs'
import { openPhase2 } from './helpers'

const configFile = path.join(e2eHome('4310'), '.config/planner/config.json')

test('an icon picked for a task is saved and shown in the sidebar', async ({ page }) => {
  const before = fs.readFileSync(configFile, 'utf8')
  try {
    await openPhase2(page)
    const row = page.locator('.task-row', { hasText: 'Planner V1' })
    await row.hover()
    await row.locator('[title="Task settings"]').click()
    await page.getByRole('menuitem', { name: 'Change icon…' }).click()
    await page.locator('.icon-choice', { hasText: '🚀' }).click()
    await expect(row.locator('.task-icon')).toHaveText('🚀')
    expect(JSON.parse(fs.readFileSync(configFile, 'utf8')).taskIcons).toEqual({ 'plans:planner-v1': '🚀' })
  } finally {
    fs.writeFileSync(configFile, before)
  }
})
