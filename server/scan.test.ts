import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, withDefaults, type Config } from '../shared/config'
import { scan } from './scan'

const demo = fs.realpathSync(path.join(import.meta.dirname, '..', 'examples', 'demo-docs'))

// Builds a docs folder from { 'relative/path': 'contents' }.
const temps: string[] = []
function folder(files: Record<string, string>): string {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'plan-dashboard-')))
  temps.push(root)
  for (const [rel, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true })
    fs.writeFileSync(path.join(root, rel), body)
  }
  return root
}
afterEach(() => temps.splice(0).forEach((dir) => fs.rmSync(dir, { recursive: true, force: true })))

const html = (title: string) => `<html><head><title>${title}</title></head></html>`
const config = (patch: Partial<Config>): Config => ({ ...DEFAULT_CONFIG, ...patch })

describe('default layout', () => {
  it('reads tasks, phases in number order, and docs in doc type order', async () => {
    const { tree } = await scan(demo, DEFAULT_CONFIG)
    const search = tree.tasks.find((t) => t.name === 'search-rewrite')!
    expect(search.status).toBe('active')
    expect(search.docs.map((d) => d.kind)).toEqual(['overview'])
    expect(search.phases.map((p) => [p.num, p.label])).toEqual([
      ['1', 'index schema'],
      ['2', 'query api'],
    ])
    expect(search.phases[0].docs.map((d) => d.kind)).toEqual(['plan', 'eli5', 'recap'])
    expect(search.groups.map((g) => [g.key, g.docs.length])).toEqual([['search-rewrite/research', 1]])
    expect(tree.tasks.find((t) => t.name === 'dark-mode')!.status).toBe('done')
  })

  it('titles HTML by <title> and markdown by its first heading', async () => {
    const { index } = await scan(demo, DEFAULT_CONFIG)
    expect(index.get('active/search-rewrite/plans/phase-1-index-schema/plan.html')?.doc.title).toBe(
      'Phase 1 — Index schema',
    )
    expect(index.get('active/search-rewrite/plans/phase-2-query-api/plan.md')?.doc.title).toBe('Phase 2 — Query API')
  })
})

it('reads tasks straight from the root when there are no status folders or plans folder', async () => {
  const root = folder({
    'auth/overview.html': html('Auth'),
    'auth/phase-1-tokens/plan.html': html('Tokens'),
    'auth/research/notes.html': html('Notes'),
    'weekly/2026-01-01.html': html('Week'),
  })
  const { tree } = await scan(
    root,
    config({
      statusFolders: null,
      plansFolder: '',
      collections: [{ label: 'Weekly', path: 'weekly/*.html', newestFirst: true, notify: false }],
    }),
  )
  expect(tree.tasks.map((t) => t.name)).toEqual(['auth'])
  const auth = tree.tasks[0]
  expect(auth.status).toBeNull()
  expect(auth.docs.map((d) => d.file)).toEqual(['overview.html'])
  expect(auth.phases.map((p) => p.name)).toEqual(['phase-1-tokens'])
  expect(auth.groups.map((g) => g.name)).toEqual(['research'])
  expect(tree.collections[0].docs.map((d) => d.file)).toEqual(['2026-01-01.html'])
  expect(tree.settle).toBe(false)
})

it('lists folders off the phase pattern last, and only when they hold docs', async () => {
  const root = folder({
    'active/t/plans/phase-10-late/plan.html': html('Ten'),
    'active/t/plans/phase-2-early/plan.html': html('Two'),
    'active/t/plans/scratch/plan.html': html('Scratch'),
    'active/t/plans/images/diagram.png': 'png',
  })
  const { tree, preview } = await scan(root, DEFAULT_CONFIG)
  expect(tree.tasks[0].phases.map((p) => p.name)).toEqual(['phase-2-early', 'phase-10-late', 'scratch'])
  expect(preview.unnumbered).toEqual(['active/t/scratch'])
})

it('counts the files it leaves out by extension', async () => {
  const root = folder({ 'active/t/plans/phase-1-a/plan.html': html('A'), 'active/t/plans/phase-1-a/data.json': '{}' })
  expect((await scan(root, DEFAULT_CONFIG)).preview.skipped).toEqual({ json: 1 })
})

it('keeps a doc in its task when a collection also matches it', async () => {
  const root = folder({ 'active/t/research/r.html': html('R') })
  const { index } = await scan(
    root,
    config({ collections: [{ label: 'All', path: 'active/*/research/*.html', newestFirst: true, notify: false }] }),
  )
  expect(index.get('active/t/research/r.html')?.doc.ws).toBe('t/research')
})

describe('config', () => {
  it('fills keys a config file leaves out from the defaults', () => {
    const parsed = withDefaults({ root: '~/plans' })
    expect(parsed.success && parsed.data.plansFolder).toBe('plans')
  })
  it('rejects a phase pattern without a num group, and unknown keys', () => {
    expect(withDefaults({ phasePattern: '^phase-(\\d+)' }).success).toBe(false)
    expect(withDefaults({ plansFolders: 'x' }).success).toBe(false)
  })
})
