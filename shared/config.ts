import { z } from 'zod'
import { HOTKEY_ACTIONS, type HotkeyAction } from './hotkeys'

// Colours a doc type badge can take. Each name maps to a pair of theme tokens
// in web/styles/tokens.css, so a badge reads well in light and dark.
export const COLORS = ['grey', 'violet', 'blue', 'teal', 'green', 'amber', 'orange', 'pink', 'red'] as const

const regex = z.string().refine(
  (source) => {
    try {
      new RegExp(source)
      return true
    } catch {
      return false
    }
  },
  { message: 'not a valid regular expression' },
)

const extension = z
  .string()
  .regex(/^[a-z0-9]+$/i, 'an extension without the dot, like "md"')
  .transform((s) => s.toLowerCase())

const folderName = z.string().regex(/^[^/\\]+$/, 'a single folder name, no slashes')

// What a file is, decided by its name. The first type whose pattern matches
// wins; a file matching none shows as "doc".
const docType = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'lowercase letters, digits and dashes')
    .describe('Stable id, never shown.'),
  label: z.string().min(1).max(12).describe('The badge text, e.g. "plan".'),
  match: z.string().min(1).describe('File name pattern; * matches anything, e.g. "eli5*.html".'),
  color: z.enum(COLORS).describe('Badge colour.'),
})

// Extra folders inside a task that get their own section, like research/.
const group = z.object({
  label: z.string().min(1).describe('Section name in the sidebar, e.g. "Research".'),
  folder: folderName.describe('Folder name inside each task, e.g. "research".'),
  fileTypes: z.array(extension).optional().describe('Extensions to list here; defaults to fileTypes.'),
})

// Pages that live outside any task, found by a path pattern under the folder.
const collection = z.object({
  label: z.string().min(1).describe('Section name in the sidebar, e.g. "Weekly".'),
  path: z.string().min(1).describe('Path pattern inside the docs folder; * matches one name, e.g. "weekly/*/*.html".'),
  newestFirst: z.boolean().default(true).describe('Newest first; otherwise sorted by path.'),
  notify: z.boolean().default(false).describe('Show a notification when a new one appears.'),
})

// How a docs folder is laid out. Set once for every folder, and any folder can
// override any of it.
const layoutShape = {
  // null: tasks sit directly in the folder and there is no settle/restore.
  statusFolders: z
    .object({ active: folderName, done: folderName })
    .nullable()
    .describe(
      'Folders that hold active and finished tasks, e.g. {"active":"active","done":"done"}; null if tasks sit directly in the docs folder.',
    ),
  // "" means a task keeps its plans directly in its own folder.
  plansFolder: z
    .union([folderName, z.literal('')])
    .describe('Folder inside each task that holds its plans, e.g. "plans"; "" if plans sit in the task folder.'),
  // Must capture `num` and may capture `slug`.
  phasePattern: regex
    .refine((s) => s.includes('(?<num>'), { message: 'needs a (?<num>...) group' })
    .describe('Regular expression for phase folder names; (?<num>...) captures the number, (?<slug>...) the name.'),
  fileTypes: z.array(extension).min(1).describe('Extensions to show, without the dot, e.g. ["html","md"].'),
  groups: z.array(group).describe('Extra folders inside each task that get their own sidebar section.'),
  collections: z.array(collection).describe('Docs outside any task, listed by a path pattern.'),
}

// One docs folder. Its name shows in the sidebar and in links to its docs.
const docsFolder = z
  .object({
    name: z
      .string()
      .regex(/^[a-z0-9][a-z0-9-]*$/, 'lowercase letters, digits and dashes, like "my-app"')
      .describe('Short name shown in the sidebar and in links, e.g. "my-app".'),
    path: z.string().min(1).describe('Absolute path to the docs folder; ~ means the home folder.'),
    ...z.object(layoutShape).partial().shape,
  })
  .strict()

// Each action may list its combos; a missing action keeps its default.
const hotkeysShape = Object.fromEntries(
  (Object.keys(HOTKEY_ACTIONS) as HotkeyAction[]).map((a) => [
    a,
    z.array(z.string().min(1)).optional().describe(HOTKEY_ACTIONS[a]),
  ]),
) as Record<HotkeyAction, z.ZodOptional<z.ZodArray<z.ZodString>>>

export const configSchema = z
  .object({
    // Lets editors and agents check the file against the published schema.
    $schema: z.string().optional(),
    folders: z
      .array(docsFolder)
      .refine((list) => new Set(list.map((f) => f.name)).size === list.length, { message: 'two folders share a name' })
      .describe('The docs folders to read. Each may override any layout key below for itself.'),
    port: z.number().int().min(1).max(65535).describe('Port Planner listens on (default 4173).'),
    ...layoutShape,
    hotkeys: z
      .object(hotkeysShape)
      .strict()
      .describe(
        'Keyboard shortcuts by action, each a list of combos like "Alt+W". Leave an action out to keep its default; [] turns it off.',
      ),
    docTypes: z
      .array(docType)
      .describe('Badges by file name. A file takes the first match; the order is also the reading order.'),
  })
  .strict()

export type Config = z.infer<typeof configSchema>
export type DocType = z.infer<typeof docType>
export type DocsFolder = z.infer<typeof docsFolder>
export type Layout = Pick<Config, keyof typeof layoutShape>
export type Color = (typeof COLORS)[number]

export const DEFAULT_CONFIG: Config = {
  folders: [],
  port: 4173,
  hotkeys: {},
  statusFolders: { active: 'active', done: 'done' },
  plansFolder: 'plans',
  phasePattern: '^phase-(?<num>\\d+[a-z]*)-(?<slug>.+)$',
  fileTypes: ['html', 'md'],
  docTypes: [
    { id: 'overview', label: 'overview', match: 'mother-plan.html', color: 'pink' },
    { id: 'plan', label: 'plan', match: 'plan.html', color: 'violet' },
    { id: 'eli5', label: 'eli5', match: 'eli5*.html', color: 'teal' },
    { id: 'explainer', label: 'note', match: 'explainer*.html', color: 'blue' },
    { id: 'recap', label: 'recap', match: 'recap.html', color: 'green' },
    { id: 'evidence', label: 'tests', match: 'evidence.html', color: 'amber' },
    { id: 'md', label: 'md', match: '*.md', color: 'grey' },
  ],
  groups: [{ label: 'Research', folder: 'research', fileTypes: ['html'] }],
  collections: [],
}

// The kind of a file no doc type matches.
export const FALLBACK_KIND: Pick<DocType, 'id' | 'label' | 'color'> = { id: 'doc', label: 'doc', color: 'grey' }

// Where the published schema lives, for the $schema key of a config file.
export const SCHEMA_URL = 'https://raw.githubusercontent.com/limyuquan/planner/main/schema/config.schema.json'

// A folder name made from its path: ~/work/app-a/docs -> "docs".
export function nameForPath(p: string): string {
  const base =
    p
      .replace(/[/\\]+$/, '')
      .split(/[/\\]/)
      .pop() ?? ''
  return (
    base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'docs'
  )
}

// A config file only needs the keys it changes; the rest come from the
// defaults. Files from before multiple folders have a single "root" instead.
export function withDefaults(raw: unknown) {
  const given = { ...(raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}) }
  if ('root' in given && !('folders' in given)) {
    const root = given.root
    given.folders = typeof root === 'string' && root ? [{ name: nameForPath(root), path: root }] : []
    delete given.root
  }
  return configSchema.safeParse({ ...DEFAULT_CONFIG, ...given })
}

// The layout one folder uses: its own settings over the shared ones.
export function layoutFor(config: Config, folder: DocsFolder): Layout {
  const pick = <K extends keyof Layout>(key: K): Layout[K] =>
    folder[key] !== undefined ? (folder[key] as Layout[K]) : config[key]
  return {
    statusFolders: pick('statusFolders'),
    plansFolder: pick('plansFolder'),
    phasePattern: pick('phasePattern'),
    fileTypes: pick('fileTypes'),
    groups: pick('groups'),
    collections: pick('collections'),
  }
}

// "eli5*.html" -> /^eli5.*\.html$/i. Only * and ? are special.
export function wildcard(pattern: string): RegExp {
  const body = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
  return new RegExp(`^${body}$`, 'i')
}
