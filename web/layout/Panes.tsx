import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { moveDirOf } from '../keys'
import { getState, useStore } from '../state/store'
import { apply, BLANK, currentLayout } from '../state/workspaces'
import { roomIn, setAreaSize } from './area'
import { shift } from './model'
import { NodeView } from './NodeView'

// Ctrl/Option + arrow sends the shown tab one pane that way, splitting a new
// pane off when there is none. Focus follows the tab, so pressing again walks
// it on across the layout.
function useMoveKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const dir = moveDirOf(e)
      const target = e.target as HTMLElement | null
      if (!dir || target?.closest('input, textarea, select, [contenteditable]')) return
      // Ours whatever happens next, so Option + down never scrolls instead.
      e.preventDefault()
      const layout = currentLayout()
      const result = shift(layout, getState().focus, dir, roomIn(layout))
      if (result) apply(result)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

export function Panes() {
  const layout = useStore((s) => s.layouts[s.current]) ?? BLANK
  const ref = useRef<HTMLElement>(null)
  // Kept in state as well, so the split buttons re-check their room on resize.
  const [, setSize] = useState({ width: 0, height: 0 })
  useMoveKeys()

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const size = { width: entry.contentRect.width, height: entry.contentRect.height }
      setAreaSize(size)
      setSize(size)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <main className="panes" ref={ref}>
      <NodeView node={layout} />
    </main>
  )
}
