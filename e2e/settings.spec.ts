import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { e2eHome } from './paths.mjs'
import { DEMO, EMPTY } from './helpers'

const home = e2eHome('4310')
const configFile = path.join(home, '.config/planner/config.json')

test('a second folder with its own layout gets its own section once saved', async ({ page }) => {
  const side = path.join(home, 'side')
  fs.mkdirSync(path.join(side, 'flat-task'), { recursive: true })
  fs.writeFileSync(path.join(side, 'flat-task/plan.md'), '# Flat plan')
  const before = fs.readFileSync(configFile, 'utf8')
  try {
    await page.goto(DEMO)
    await page.locator('button[title=Settings]').click()
    await page.locator('.link-btn', { hasText: 'Add a docs folder' }).click()
    const card = page.locator('.folder-card').last()
    await card.locator('.field', { hasText: 'Name' }).locator('input').fill('side')
    await card.locator('.field', { hasText: 'Path' }).locator('input').fill(side)
    await card.locator('.check', { hasText: 'Organised differently' }).locator('input').check()
    await card.locator('.check', { hasText: 'active' }).locator('input').uncheck()
    await card.locator('.field', { hasText: 'Plans folder' }).locator('input').fill('')
    await expect(page.locator('.preview-folder', { hasText: 'side' })).toContainText('1 tasks')
    await page.locator('.btn.primary', { hasText: 'Save' }).click()
    await expect(page.locator('.docs-folder-name')).toHaveText(['plans', 'side'])
    await expect(page.locator('.task-name', { hasText: 'Flat Task' })).toBeVisible()
  } finally {
    fs.writeFileSync(configFile, before)
  }
})

test('an invalid phase pattern is reported and cannot be saved', async ({ page }) => {
  await page.goto(DEMO)
  await page.locator('button[title=Settings]').click()
  await page.locator('.field', { hasText: 'Phase folder pattern' }).last().locator('input').fill('^phase-(\\d+)')
  await expect(page.locator('.preview')).toContainText('needs a (?<num>...) group')
  await expect(page.locator('.btn.primary', { hasText: 'Save' })).toBeDisabled()
})

test('the first run asks for a folder and refuses one that does not exist', async ({ page }) => {
  await page.goto(EMPTY)
  await page.locator('.setup input').fill('/no/such/folder')
  await page.locator('.setup button').click()
  await expect(page.locator('.setup .form-error')).toContainText('does not exist')
  const docs = path.join(e2eHome('4311'), 'plans')
  fs.cpSync(path.join(import.meta.dirname, '..', 'examples', 'demo-docs'), docs, { recursive: true })
  await page.locator('.setup input').fill(docs)
  await page.locator('.setup button').click()
  await expect(page.locator('.task-name', { hasText: 'Planner V1' })).toBeVisible()
})
