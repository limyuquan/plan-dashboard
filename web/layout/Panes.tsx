import { useLayoutEffect, useRef, useState } from 'react'
import { useStore } from '../state/store'
import { BLANK } from '../state/workspaces'
import { setAreaSize } from './area'
import { NodeView } from './NodeView'

export function Panes() {
  const layout = useStore((s) => s.layouts[s.current]) ?? BLANK
  const ref = useRef<HTMLElement>(null)
  // Kept in state as well, so the split buttons re-check their room on resize.
  const [, setSize] = useState({ width: 0, height: 0 })

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
