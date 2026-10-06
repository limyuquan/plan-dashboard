import path from 'node:path'
import type { ServerResponse } from 'node:http'
import chokidar, { type FSWatcher } from 'chokidar'
import type { ServerEvent } from '../shared/types'
import type { ConfigStore } from './config'
import { scan, type Scan } from './scan'

// The docs folder as the dashboard currently sees it. Rescans when files or
// the config change, and tells every open browser over /api/events.
export class Docs {
  private latest: Promise<Scan | null> | null = null
  private watcher: FSWatcher | null = null
  private clients = new Set<ServerResponse>()
  // Settling renames a task folder, which looks like every file in it being
  // added. Those are not new plans, so adds under a moved folder stay quiet.
  private movedUntil = new Map<string, number>()

  constructor(private config: ConfigStore) {
    config.onChange(() => this.restart())
  }

  get root() {
    return this.config.root
  }

  current(): Promise<Scan | null> {
    this.latest ??= this.rescan()
    return this.latest
  }

  // For changes the server made itself, so the next read already sees them.
  invalidate() {
    this.latest = this.rescan()
  }

  private rescan(): Promise<Scan | null> {
    const root = this.root
    return root ? scan(root, this.config.current) : Promise.resolve(null)
  }

  listen(res: ServerResponse) {
    this.clients.add(res)
    res.on('close', () => this.clients.delete(res))
  }

  broadcast(event: ServerEvent): number {
    const payload = `data: ${JSON.stringify(event)}\n\n`
    for (const res of this.clients) res.write(payload)
    return this.clients.size
  }

  muteMovesUnder(dir: string) {
    this.movedUntil.set(`${dir}/`, Date.now() + 8000)
  }

  private isFromMove(rel: string) {
    const now = Date.now()
    for (const [prefix, until] of this.movedUntil) {
      if (now > until) this.movedUntil.delete(prefix)
      else if (rel.startsWith(prefix)) return true
    }
    return false
  }

  async restart() {
    this.latest = this.rescan()
    await this.watcher?.close()
    this.watcher = null
    await this.latest
    this.broadcast({ type: 'tree' })
    this.watch()
  }

  // Agents write a page in several chunks, so wait for writes to settle before
  // rescanning; otherwise we announce a half-written file.
  watch() {
    const root = this.root
    if (!root) return
    const config = this.config.current
    const homes = config.statusFolders ? [config.statusFolders.active, config.statusFolders.done] : ['.']
    const tops = config.collections.map((c) => c.path.split('/')[0])
    const added = new Set<string>()
    const changed = new Set<string>()
    let timer: NodeJS.Timeout | undefined

    const flush = async () => {
      this.latest = this.rescan()
      const result = await this.latest
      this.broadcast({ type: 'tree' })
      for (const rel of changed) if (result?.index.has(rel)) this.broadcast({ type: 'changed', path: rel })
      for (const rel of added) {
        const hit = result?.index.get(rel)
        if (hit?.notify && !this.isFromMove(rel)) this.broadcast({ type: 'added', doc: hit.doc, place: hit.place })
      }
      added.clear()
      changed.clear()
    }

    this.watcher = chokidar
      .watch(
        [...new Set([...homes, ...tops])].map((dir) => path.join(root, dir)),
        { ignoreInitial: true, depth: 6, ignored: (p) => /(^|[/\\])(\.|node_modules)/.test(path.relative(root, p)) },
      )
      .on('all', (event, abs) => {
        const rel = path.relative(root, abs).split(path.sep).join('/')
        if (event === 'add') added.add(rel)
        if (event === 'change') changed.add(rel)
        clearTimeout(timer)
        timer = setTimeout(flush, 400)
      })
  }
}
