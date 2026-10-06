import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  DEFAULT_CONFIG,
  SCHEMA_URL,
  layoutFor,
  withDefaults,
  type Config,
  type DocsFolder,
  type Layout,
} from '../shared/config'

// ~/.config/planner/config.json. Installs from before the rename keep their
// file in ~/.config/plan-dashboard/, which is used while there is no new one.
export function defaultConfigPath() {
  const base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config')
  const file = path.join(base, 'planner', 'config.json')
  const legacy = path.join(base, 'plan-dashboard', 'config.json')
  return !fs.existsSync(file) && fs.existsSync(legacy) ? legacy : file
}

// A path as shown to people: under the home folder it starts with ~.
export function homeRelative(p: string) {
  const home = os.homedir()
  return p === home || p.startsWith(home + path.sep) ? `~${p.slice(home.length)}` : p
}

export const expandHome = (p: string) => (p === '~' || p.startsWith('~/') ? path.join(os.homedir(), p.slice(1)) : p)

// A folder from the config, ready to read: its layout and its real path. A
// watcher on a symlinked folder sees nothing, so we work with the real one.
export type ResolvedFolder = { folder: DocsFolder; layout: Layout; root: string | null }

export function resolveFolders(config: Config): ResolvedFolder[] {
  return config.folders.map((folder) => {
    let root: string | null = null
    try {
      root = fs.realpathSync(expandHome(folder.path))
    } catch {
      // Missing: shown as a problem on that folder's section.
    }
    return { folder, layout: layoutFor(config, folder), root }
  })
}

// Reads a config file. A missing file is the defaults; a broken one is an error.
export async function readConfigFile(file: string): Promise<{ config: Config } | { error: string }> {
  let raw: unknown = {}
  try {
    raw = JSON.parse(await fsp.readFile(file, 'utf8'))
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') return { error: `${file} is not valid JSON: ${err}` }
  }
  const parsed = withDefaults(raw)
  if (!parsed.success) return { error: formatIssues(parsed.error.issues) }
  return { config: parsed.data }
}

export const formatIssues = (issues: { path: PropertyKey[]; message: string }[]) =>
  issues.map((i) => `${i.path.map(String).join('.') || 'config'}: ${i.message}`).join('\n')

export async function writeConfigFile(file: string, config: Config) {
  await fsp.mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.tmp`
  await fsp.writeFile(tmp, `${JSON.stringify({ $schema: SCHEMA_URL, ...config }, null, 2)}\n`)
  await fsp.rename(tmp, file)
}

type Overrides = Partial<Pick<Config, 'folders' | 'port'>>

// The settings the server runs with. The file holds what the user saved;
// --root and --port only apply to this run and are never written back. When
// the file has an error, the last good settings stay in use and the error is
// shown in the dashboard.
export class ConfigStore {
  private saved: Config = DEFAULT_CONFIG
  private listeners = new Set<() => void>()
  problem: string | undefined

  constructor(
    readonly file: string,
    private overrides: Overrides,
  ) {}

  get current(): Config {
    return { ...this.saved, ...this.overrides }
  }

  // What the file says, without this run's flags. The settings page edits
  // this, so saving never writes a one-run flag into the file.
  get stored(): { config: Config; overrides: Overrides } {
    return { config: this.saved, overrides: this.overrides }
  }

  get folders(): ResolvedFolder[] {
    return resolveFolders(this.current)
  }

  async load() {
    const read = await readConfigFile(this.file)
    if ('error' in read) {
      this.problem = read.error
      console.warn(`${this.file} has an error, using the last good settings:\n${read.error}`)
      return
    }
    this.problem = undefined
    this.saved = read.config
  }

  async save(next: Config) {
    await writeConfigFile(this.file, next)
    this.saved = next
    this.problem = undefined
    this.listeners.forEach((fn) => fn())
  }

  // Hand edits to the file take effect without a restart.
  watch() {
    let timer: NodeJS.Timeout | undefined
    fs.watchFile(this.file, { interval: 1000 }, () => {
      clearTimeout(timer)
      timer = setTimeout(async () => {
        const before = JSON.stringify([this.saved, this.problem])
        await this.load()
        if (JSON.stringify([this.saved, this.problem]) !== before) this.listeners.forEach((fn) => fn())
      }, 200)
    })
  }

  onChange(fn: () => void) {
    this.listeners.add(fn)
  }
}
