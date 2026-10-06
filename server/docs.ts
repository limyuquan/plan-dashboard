import path from 'node:path'
import type { ServerResponse } from 'node:http'
import chokidar, { type FSWatcher } from 'chokidar'
import { docPath } from '../shared/keys'
import type { ServerEvent } from '../shared/types'
import type { ConfigStore } from './config'
import { scanAll, type Scan } from './scan'

// The docs folders as the dashboard currently sees them. Rescans when files or
// the config change, and tells every open browser over /api/events.
export class Docs {
  private latest: Promise<Scan> | null = null
  private watcher: FSWatcher | null = null
  private clients = new Set<ServerResponse>()
  // Settling renames a task folder, which looks like every file in it being
  // added. Those are not new plans, so adds under a moved folder stay quiet.
  private movedUntil = new Map<string, number>()

  constructor(private config: ConfigStore) {
    config.onChange(() => this.restart())
  }

  current(): Promise<Scan> {
    this.latest ??= this.rescan()
    return this.latest
  }

  // For changes the server made itself, so the next read already sees them.
  invalidate() {
    this.latest = this.rescan()
  }

  private rescan(): Promise<Scan> {
    return scanAll(this.config.current)
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
    const folders = this.config.folders.filter((f) => f.root)
    // Within each folder, only the status folders (or the folder itself) and
    // the tops of collections hold anything we list.
    const watched = folders.flatMap(({ root, layout }) => {
      const homes = layout.statusFolders ? [layout.statusFolders.active, layout.statusFolders.done] : ['.']
      const tops = layout.collections.map((c) => c.path.split('/')[0])
      return [...new Set([...homes, ...tops])].map((dir) => path.join(root!, dir))
    })
    if (!watched.length) return
    // Turns a changed file back into its doc path.
    const docPathOf = (abs: string) => {
      const owner = folders.find((f) => abs === f.root || abs.startsWith(f.root + path.sep))
      return owner && docPath(owner.folder.name, path.relative(owner.root!, abs).split(path.sep).join('/'))
    }
    const added = new Set<string>()
    const changed = new Set<string>()
    let timer: NodeJS.Timeout | undefined

    const flush = async () => {
      this.latest = this.rescan()
      const result = await this.latest
      this.broadcast({ type: 'tree' })
      for (const rel of changed) if (result.index.has(rel)) this.broadcast({ type: 'changed', path: rel })
      for (const rel of added) {
        const hit = result.index.get(rel)
        if (hit?.notify && !this.isFromMove(rel)) this.broadcast({ type: 'added', doc: hit.doc, place: hit.place })
      }
      added.clear()
      changed.clear()
    }

    this.watcher = chokidar
      .watch(watched, {
        ignoreInitial: true,
        depth: 6,
        ignored: (p) => /(^|[/\\])(\.|node_modules)/.test(path.basename(p)),
      })
      .on('all', (event, abs) => {
        const rel = docPathOf(abs)
        if (rel && event === 'add') added.add(rel)
        if (rel && event === 'change') changed.add(rel)
        clearTimeout(timer)
        timer = setTimeout(flush, 400)
      })
  }
}
