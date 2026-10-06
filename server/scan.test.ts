import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, layoutFor, withDefaults, type Config, type DocsFolder } from '../shared/config'
import { scanAll, scanFolder } from './scan'

const demo = fs.realpathSync(path.join(import.meta.dirname, '..', 'examples', 'demo-docs'))

// Builds a docs folder from { 'relative/path': 'contents' }.
const temps: string[] = []
function folder(files: Record<string, string>): string {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'planner-')))
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

// Reads one folder named "docs" with the given config's layout.
const read = (root: string, c: Config = DEFAULT_CONFIG, own: Partial<DocsFolder> = {}) =>
  scanFolder('docs', root, layoutFor(c, { name: 'docs', path: root, ...own }), c.docTypes)

describe('default layout', () => {
  it('reads tasks, phases in number order, and docs in doc type order', async () => {
    const { tasks } = await read(demo)
    const search = tasks.find((t) => t.name === 'search-rewrite')!
    expect(search.key).toBe('docs:search-rewrite')
    expect(search.status).toBe('active')
    expect(search.docs.map((d) => d.kind)).toEqual(['overview'])
    expect(search.phases.map((p) => [p.num, p.label])).toEqual([
      ['1', 'index schema'],
      ['2', 'query api'],
    ])
    expect(search.phases[0].docs.map((d) => d.kind)).toEqual(['plan', 'eli5', 'recap'])
    expect(search.groups.map((g) => [g.key, g.docs.length])).toEqual([['docs:search-rewrite/research', 1]])
    expect(tasks.find((t) => t.name === 'dark-mode')!.status).toBe('done')
  })

  it('titles HTML by <title> and markdown by its first heading', async () => {
    const { index } = await read(demo)
    expect(index.get('docs/active/search-rewrite/plans/phase-1-index-schema/plan.html')?.doc.title).toBe(
      'Phase 1 — Index schema',
    )
    expect(index.get('docs/active/search-rewrite/plans/phase-2-query-api/plan.md')?.doc.title).toBe(
      'Phase 2 — Query API',
    )
  })
})

it('reads tasks straight from the folder when there are no status folders or plans folder', async () => {
  const root = folder({
    'auth/overview.html': html('Auth'),
    'auth/phase-1-tokens/plan.html': html('Tokens'),
    'auth/research/notes.html': html('Notes'),
    'weekly/2026-01-01.html': html('Week'),
  })
  const c = config({
    statusFolders: null,
    plansFolder: '',
    collections: [{ label: 'Weekly', path: 'weekly/*.html', newestFirst: true, notify: false }],
  })
  const { tasks, collections } = await read(root, c)
  expect(tasks.map((t) => t.name)).toEqual(['auth'])
  const auth = tasks[0]
  expect(auth.status).toBeNull()
  expect(auth.docs.map((d) => d.file)).toEqual(['overview.html'])
  expect(auth.phases.map((p) => p.name)).toEqual(['phase-1-tokens'])
  expect(auth.groups.map((g) => g.name)).toEqual(['research'])
  expect(collections[0].docs.map((d) => d.file)).toEqual(['2026-01-01.html'])
})

it('lists folders off the phase pattern last, and only when they hold docs', async () => {
  const root = folder({
    'active/t/plans/phase-10-late/plan.html': html('Ten'),
    'active/t/plans/phase-2-early/plan.html': html('Two'),
    'active/t/plans/scratch/plan.html': html('Scratch'),
    'active/t/plans/images/diagram.png': 'png',
  })
  const { tasks, preview } = await read(root)
  expect(tasks[0].phases.map((p) => p.name)).toEqual(['phase-2-early', 'phase-10-late', 'scratch'])
  expect(preview.unnumbered).toEqual(['docs/active/t/scratch'])
})

it('counts the files it leaves out by extension', async () => {
  const root = folder({ 'active/t/plans/phase-1-a/plan.html': html('A'), 'active/t/plans/phase-1-a/data.json': '{}' })
  expect((await read(root)).preview.skipped).toEqual({ json: 1 })
})

it('keeps a doc in its task when a collection also matches it', async () => {
  const root = folder({ 'active/t/research/r.html': html('R') })
  const c = config({
    collections: [{ label: 'All', path: 'active/*/research/*.html', newestFirst: true, notify: false }],
  })
  expect((await read(root, c)).index.get('docs/active/t/research/r.html')?.doc.ws).toBe('docs:t/research')
})

it('follows symlinked task folders', async () => {
  const real = folder({ 'my-task/plans/phase-1-a/plan.html': html('A') })
  const root = folder({ 'done/.keep': '' })
  fs.mkdirSync(path.join(root, 'active'))
  fs.symlinkSync(path.join(real, 'my-task'), path.join(root, 'active', 'my-task'))
  expect((await read(root)).tasks.map((t) => t.name)).toEqual(['my-task'])
})

describe('several folders', () => {
  it('reads each folder with its own layout, and keeps a missing one with its problem', async () => {
    const a = folder({ 'active/x/plans/phase-1-a/plan.html': html('A') })
    const b = folder({ 'y/plan.md': '# Y' })
    const c = config({
      folders: [
        { name: 'a', path: a },
        { name: 'b', path: b, statusFolders: null, plansFolder: '' },
        { name: 'gone', path: path.join(b, 'nope') },
      ],
    })
    const { tree } = await scanAll(c)
    expect(tree.tasks.map((t) => [t.key, t.status])).toEqual([
      ['a:x', 'active'],
      ['b:y', null],
    ])
    expect(tree.folders.map((f) => [f.name, f.settle, !!f.problem])).toEqual([
      ['a', true, false],
      ['b', false, false],
      ['gone', false, true],
    ])
  })
})

it('hands out the icons the config gives tasks, folders and doc types', async () => {
  const root = folder({ 'active/x/plans/plan.html': html('X') })
  const c = config({
    folders: [{ name: 'a', path: root, icon: '📦' }],
    taskIcons: { 'a:x': '🚀' },
    docTypes: [{ id: 'plan', label: 'plan', match: 'plan.html', color: 'violet', icon: '📐' }],
  })
  const { tree } = await scanAll(c)
  expect([tree.folders[0].icon, tree.tasks[0].icon, tree.kinds[0].icon]).toEqual(['📦', '🚀', '📐'])
})

describe('config', () => {
  it('fills keys a config file leaves out from the defaults', () => {
    const parsed = withDefaults({ folders: [{ name: 'p', path: '~/plans' }] })
    expect(parsed.success && parsed.data.plansFolder).toBe('plans')
  })
  it('reads a config from before multiple folders as one folder', () => {
    const parsed = withDefaults({ root: '/home/me/notes/docs' })
    expect(parsed.success && parsed.data.folders).toEqual([{ name: 'docs', path: '/home/me/notes/docs' }])
  })
  it('rejects a phase pattern without a num group, unknown keys, and two folders with one name', () => {
    expect(withDefaults({ phasePattern: '^phase-(\\d+)' }).success).toBe(false)
    expect(withDefaults({ plansFolders: 'x' }).success).toBe(false)
    const twice = [
      { name: 'a', path: '/x' },
      { name: 'a', path: '/y' },
    ]
    expect(withDefaults({ folders: twice }).success).toBe(false)
  })
})
