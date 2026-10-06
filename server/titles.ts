import fsp from 'node:fs/promises'

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

const decodeEntities = (s: string) =>
  s.replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d))).replace(/&(\w+);/g, (m, name) => ENTITIES[name] ?? m)

// An HTML page names itself in its <title>; a markdown file in its first
// heading, where backticks and bold markers are noise in a label.
export function titleIn(text: string, file: string): string | null {
  if (file.endsWith('.md')) {
    const heading = text.match(/^#\s+(.+?)\s*#*\s*$/m)
    return heading ? heading[1].replace(/[`*]/g, '').trim() : null
  }
  if (!file.endsWith('.html')) return null
  const tag = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return tag ? decodeEntities(tag[1].trim().replace(/\s+/g, ' ')) || null : null
}

// Titles label everything in the UI and the tree is rebuilt on every change,
// so only re-read a file when its size or mtime changed.
const cache = new Map<string, { key: string; title: string }>()

export async function readTitle(abs: string, file: string): Promise<string> {
  try {
    const stat = await fsp.stat(abs)
    const key = `${stat.mtimeMs}:${stat.size}`
    const hit = cache.get(abs)
    if (hit?.key === key) return hit.title

    const fh = await fsp.open(abs, 'r')
    const buf = Buffer.alloc(8192)
    const { bytesRead } = await fh.read(buf, 0, buf.length, 0)
    await fh.close()
    const title = titleIn(buf.subarray(0, bytesRead).toString('utf8'), file) ?? file
    cache.set(abs, { key, title })
    return title
  } catch {
    // Vanished or mid-write; the next rebuild tries again.
    return file
  }
}
