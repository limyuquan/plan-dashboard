import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { DEFAULT_CONFIG, withDefaults, type Config } from '../shared/config'

export const defaultConfigPath = () =>
  path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'plan-dashboard', 'config.json')

// A path as shown to people: under the home folder it starts with ~.
export function homeRelative(p: string) {
  const home = os.homedir()
  return p === home || p.startsWith(home + path.sep) ? `~${p.slice(home.length)}` : p
}

export const expandHome = (p: string) => (p === '~' || p.startsWith('~/') ? path.join(os.homedir(), p.slice(1)) : p)

// The settings the server runs with. The file holds what the user saved;
// --root and --port only apply to this run and are never written back.
export class ConfigStore {
  private saved: Config = DEFAULT_CONFIG
  private listeners = new Set<() => void>()

  constructor(
    readonly file: string,
    private overrides: Partial<Pick<Config, 'root' | 'port'>>,
  ) {}

  get current(): Config {
    return { ...this.saved, ...this.overrides }
  }

  // What the file says, without this run's --root / --port. The settings page
  // edits this, so saving never writes a one-run flag into the file.
  get stored(): { config: Config; overrides: Partial<Pick<Config, 'root' | 'port'>> } {
    return { config: this.saved, overrides: this.overrides }
  }

  // Where the docs are, resolved to a real path. A watcher on a symlinked
  // folder sees nothing, so we always work with the real one.
  get root(): string | null {
    const root = this.current.root
    if (!root) return null
    try {
      return fs.realpathSync(expandHome(root))
    } catch {
      return null
    }
  }

  async load() {
    let raw: unknown = {}
    try {
      raw = JSON.parse(await fsp.readFile(this.file, 'utf8'))
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') console.warn(`Ignoring ${this.file}: ${err}`)
    }
    const parsed = withDefaults(raw)
    if (!parsed.success) console.warn(`Ignoring invalid ${this.file}:\n${parsed.error.message}`)
    this.saved = parsed.success ? parsed.data : DEFAULT_CONFIG
  }

  async save(next: Config) {
    await fsp.mkdir(path.dirname(this.file), { recursive: true })
    const tmp = `${this.file}.tmp`
    await fsp.writeFile(tmp, `${JSON.stringify(next, null, 2)}\n`)
    await fsp.rename(tmp, this.file)
    this.saved = next
    this.listeners.forEach((fn) => fn())
  }

  // Hand edits to the file take effect without a restart.
  watch() {
    let timer: NodeJS.Timeout | undefined
    fs.watchFile(this.file, { interval: 1000 }, () => {
      clearTimeout(timer)
      timer = setTimeout(async () => {
        const before = JSON.stringify(this.saved)
        await this.load()
        if (JSON.stringify(this.saved) !== before) this.listeners.forEach((fn) => fn())
      }, 200)
    })
  }

  onChange(fn: () => void) {
    this.listeners.add(fn)
  }
}
