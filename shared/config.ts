import { z } from 'zod'

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
  id: z.string().regex(/^[a-z0-9-]+$/, 'lowercase letters, digits and dashes'),
  label: z.string().min(1).max(12),
  match: z.string().min(1),
  color: z.enum(COLORS),
})

// Extra folders inside a task that get their own section, like research/.
const group = z.object({
  label: z.string().min(1),
  folder: folderName,
  fileTypes: z.array(extension).optional(),
})

// Pages that live outside any task, found by a path pattern under the root.
const collection = z.object({
  label: z.string().min(1),
  path: z.string().min(1),
  newestFirst: z.boolean().default(true),
  notify: z.boolean().default(false),
})

export const configSchema = z
  .object({
    root: z.string().nullable(),
    port: z.number().int().min(1).max(65535),
    // null: tasks sit directly in the root and there is no settle/restore.
    statusFolders: z.object({ active: folderName, done: folderName }).nullable(),
    // "" means a task keeps its plans directly in its own folder.
    plansFolder: z.union([folderName, z.literal('')]),
    // Must capture `num` and may capture `slug`.
    phasePattern: regex.refine((s) => s.includes('(?<num>'), { message: 'needs a (?<num>...) group' }),
    fileTypes: z.array(extension).min(1),
    docTypes: z.array(docType),
    groups: z.array(group),
    collections: z.array(collection),
  })
  .strict()

export type Config = z.infer<typeof configSchema>
export type DocType = z.infer<typeof docType>
export type Color = (typeof COLORS)[number]

export const DEFAULT_CONFIG: Config = {
  root: null,
  port: 4173,
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

// A config file only needs the keys it changes; the rest come from the defaults.
export const withDefaults = (raw: unknown) =>
  configSchema.safeParse({ ...DEFAULT_CONFIG, ...(raw && typeof raw === 'object' ? raw : {}) })

// "eli5*.html" -> /^eli5.*\.html$/i. Only * and ? are special.
export function wildcard(pattern: string): RegExp {
  const body = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
  return new RegExp(`^${body}$`, 'i')
}
