import type { ServerEvent } from '../shared/types'

// Chrome allows six connections per origin across the whole browser, so one
// /api/events stream per dashboard tab would starve the plans themselves.
// Instead one tab holds the stream and passes what it hears to the others.
//
// A Web Lock picks that tab. It is released when the tab closes, so another
// one takes over on its own.
export function subscribe(onEvent: (event: ServerEvent) => void): () => void {
  const channel = new BroadcastChannel('plan-dashboard-events')
  channel.onmessage = (e) => onEvent(e.data)

  const stop = new AbortController()
  let source: EventSource | null = null
  navigator.locks
    .request(
      'plan-dashboard-events',
      { signal: stop.signal },
      () =>
        new Promise<void>((done) => {
          source = new EventSource('/api/events')
          source.onmessage = (e) => {
            const event = JSON.parse(e.data) as ServerEvent
            onEvent(event)
            channel.postMessage(event)
          }
          stop.signal.addEventListener('abort', () => done())
        }),
    )
    // Aborting while still waiting for the lock rejects; nothing to clean up.
    .catch(() => {})

  return () => {
    stop.abort()
    source?.close()
    channel.close()
  }
}
