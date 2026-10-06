import type { Doc } from './types'

// Searching inside docs. A doc matches when every word of the query is in its
// title or text. Docs with more of the words in their title rank first, then
// those that mention the words most.

export type SearchHit = { doc: Doc; snippet: string; hits: number }

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

// The readable text of a doc: HTML without its tags, scripts and styles;
// markdown without its heaviest syntax.
export function textOf(source: string, file: string): string {
  const text = file.endsWith('.md')
    ? source.replace(/```[^\n]*\n/g, '').replace(/[#*_`>|]/g, ' ')
    : source
        .replace(/<(script|style|svg|head)\b[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
        .replace(/&(\w+);/g, (m, name) => ENTITIES[name] ?? m)
  return text.replace(/\s+/g, ' ').trim()
}

const words = (q: string) => q.toLowerCase().split(/\s+/).filter(Boolean)

function snippetAt(text: string, at: number, length: number): string {
  const start = Math.max(0, text.lastIndexOf(' ', Math.max(0, at - 50)) + 1)
  const end = Math.min(text.length, at + length + 90)
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`
}

export function searchDocs(entries: { doc: Doc; text: string }[], query: string, limit = 40): SearchHit[] {
  const want = words(query)
  if (!want.length) return []
  const found: (SearchHit & { inTitle: number })[] = []
  for (const { doc, text } of entries) {
    const title = doc.title.toLowerCase()
    const body = text.toLowerCase()
    if (!want.every((w) => title.includes(w) || body.includes(w))) continue
    const hits = want.reduce((n, w) => n + body.split(w).length - 1, 0)
    const at = body.indexOf(want[0])
    const snippet = at >= 0 ? snippetAt(text, at, want[0].length) : text.slice(0, 140)
    found.push({ doc, snippet, hits, inTitle: want.filter((w) => title.includes(w)).length })
  }
  return found
    .sort((a, b) => b.inTitle - a.inTitle || b.hits - a.hits)
    .slice(0, limit)
    .map(({ inTitle: _, ...hit }) => hit)
}
