// Builds the interactive demo on the landing page into site/demo/:
//   1. reads examples/demo-docs the way the server would, into generated/demo.json
//   2. builds the web app with the in-memory backend (vite.config.ts)
//   3. copies the docs next to it, rendering markdown to HTML
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { DEFAULT_CONFIG, FALLBACK_KIND, layoutFor } from '../../shared/config'
import { DEFAULT_HOTKEYS } from '../../shared/hotkeys'
import { docPath, taskKey } from '../../shared/keys'
import type { Doc } from '../../shared/types'
import { renderMarkdown } from '../../server/markdown'
import { scanFolder } from '../../server/scan'
import { titleIn } from '../../server/titles'

const here = path.dirname(fileURLToPath(import.meta.url))
const docsRoot = fs.realpathSync(path.resolve(here, '../../examples/demo-docs'))
const out = path.resolve(here, '../demo')

// The demo's one docs folder, as a visitor's config would name it.
const FOLDER = 'plans'

// The scripted "new plan" the demo announces a few seconds after it loads.
const INCOMING_FOLDER = `${taskKey(FOLDER, 'planner-v1')}/phase-3-settings`
const INCOMING_REL = 'active/planner-v1/plans/phase-3-settings/recap.md'
const incomingSource = fs.readFileSync(path.join(here, 'incoming-recap.md'), 'utf8')

const folder = { name: FOLDER, path: '~/plans' }
const layout = layoutFor(DEFAULT_CONFIG, folder)
const scanned = await scanFolder(FOLDER, docsRoot, layout, DEFAULT_CONFIG.docTypes)
const tree = {
  folders: [{ name: FOLDER, root: '~/plans', label: '~/plans', settle: true }],
  tasks: scanned.tasks,
  collections: scanned.collections,
  kinds: [...DEFAULT_CONFIG.docTypes.map(({ id, label, color }) => ({ id, label, color })), FALLBACK_KIND],
  hotkeys: DEFAULT_HOTKEYS,
}
const preview = { ok: true, folders: [{ ...scanned.preview, label: '~/plans' }] }
const incoming: Doc = {
  path: docPath(FOLDER, INCOMING_REL),
  file: 'recap.md',
  kind: 'md',
  title: titleIn(incomingSource, 'recap.md') ?? 'recap.md',
  ws: INCOMING_FOLDER,
}
fs.mkdirSync(path.join(here, 'generated'), { recursive: true })
fs.writeFileSync(
  path.join(here, 'generated/demo.json'),
  JSON.stringify({ tree, preview, incoming: { doc: incoming, folder: INCOMING_FOLDER } }),
)

await build({ configFile: path.join(here, 'vite.config.ts') })

const md = (source: string) => renderMarkdown(source, titleIn(source, 'x.md') ?? '', 'dark')
for (const rel of fs.readdirSync(docsRoot, { recursive: true }) as string[]) {
  const src = path.join(docsRoot, rel)
  if (!fs.statSync(src).isFile()) continue
  const dest = path.join(out, 'docs', rel)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  if (rel.endsWith('.md')) fs.writeFileSync(`${dest}.html`, md(fs.readFileSync(src, 'utf8')))
  else fs.copyFileSync(src, dest)
}
const incomingDest = path.join(out, 'docs', `${INCOMING_REL}.html`)
fs.writeFileSync(incomingDest, md(incomingSource))
console.log(`demo built in ${path.relative(process.cwd(), out)}`)
