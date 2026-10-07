import { useEffect, useState } from 'react'
import type { SearchHit } from '../../shared/search'
import { api } from '../api'
import { setState } from '../state/store'
import { openDoc } from '../state/workspaces'
import { KindBadge } from './badges'

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// The snippet with the query's words marked.
function Marked({ text, q }: { text: string; q: string }) {
  const words = q.split(/\s+/).filter(Boolean).map(escape)
  const parts = text.split(new RegExp(`(${words.join('|')})`, 'gi'))
  return <>{parts.map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part))}</>
}

// Docs whose text holds the search words. Clicking one opens it at the match.
export function SearchResults({ q }: { q: string }) {
  // Results are kept with the query they answer, so stale ones never show.
  const [found, setFound] = useState<{ q: string; hits: SearchHit[] }>({ q: '', hits: [] })
  useEffect(() => {
    if (q.length < 3) return
    const timer = setTimeout(
      () =>
        api.search(q).then(
          (hits) => setFound({ q, hits }),
          () => setFound({ q, hits: [] }),
        ),
      250,
    )
    return () => clearTimeout(timer)
  }, [q])
  if (q.length > 0 && q.length < 3) return <div className="empty-note">Type 3+ characters to search inside plans</div>
  const hits = q.length >= 3 && found.q === q ? found.hits : []
  if (!hits.length) return null
  return (
    <div className="search-results">
      <div className="side-label">
        <span>Found in plans</span>
        <span>({hits.length})</span>
        <span className="rule" />
      </div>
      {hits.slice(0, 15).map(({ doc, snippet }) => (
        <div
          key={doc.path}
          className="doc search-hit"
          title={doc.path}
          onClick={(e) => {
            setState({ pendingFind: { path: doc.path, term: q.split(/\s+/)[0] } })
            openDoc(doc.path, e.shiftKey ? 'next' : 'focused')
          }}
        >
          <KindBadge kind={doc.kind} />
          <span className="doc-title">
            {doc.title}
            <span className="search-snippet">
              <Marked text={snippet} q={q} />
            </span>
          </span>
        </div>
      ))}
    </div>
  )
}
