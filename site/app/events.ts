// Stands in for web/events.ts in the landing page's demo: instead of a server
// watching files, a scripted agent "writes" one new plan a few seconds after
// the demo scrolls into view, so the notification is there to be seen.
import type { ServerEvent } from '../../shared/types'
import { addIncoming } from './api'

const DELAY_MS = 4000

export function subscribe(onEvent: (event: ServerEvent) => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  const announce = () => {
    const doc = addIncoming()
    onEvent({ type: 'tree' })
    onEvent({ type: 'added', doc, place: { task: 'Planner v1', phase: 'Phase 3 · settings' } })
  }
  // Inside the landing page's iframe this watches the visitor's screen.
  const seen = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return
    seen.disconnect()
    timer = setTimeout(announce, DELAY_MS)
  })
  seen.observe(document.body)
  return () => {
    seen.disconnect()
    clearTimeout(timer)
  }
}
