import { useEffect, useRef, useState } from 'react'
import { X } from '../icons'
import { CopyPath } from '../sidebar/CopyPath'
import { KindBadge, PhaseBadge } from '../sidebar/badges'
import { useStore } from '../state/store'
import { apply, currentLayout, setLayout } from '../state/workspaces'
import { drop, endDrag, startDrag } from './dnd'
import { activate, closeTab, type Pane } from './model'

// Where a dragged tab would land: before the tab at `index` in the strip.
type Marker = { index: number }

// The tabs of one pane. They scroll sideways once they overflow, can be
// dragged to reorder or into other panes, and middle-click closes one.
export function TabStrip({ pane }: { pane: Pane }) {
  const ref = useRef<HTMLDivElement>(null)
  const docs = useStore((s) => s.docs)
  const workspaces = useStore((s) => s.workspaces)
  const drag = useStore((s) => s.drag)
  const [marker, setMarker] = useState<Marker | null>(null)

  useEffect(() => {
    ref.current?.querySelector('.tab[data-active]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [pane.active])

  const dragged = drag?.path
  // Positions are counted without the dragged tab, which is where it ends up.
  const others = pane.tabs.filter((t) => t !== dragged)
  const indexAt = (path: string, after: boolean) => {
    const at = others.indexOf(path)
    return at < 0 ? others.length : at + (after ? 1 : 0)
  }
  // The insertion line sits before the tab at that position, or after the last.
  const markerOn = !marker
    ? null
    : marker.index < others.length
      ? { path: others[marker.index], side: 'before' }
      : { path: others.at(-1), side: 'after' }

  const close = (path: string) => apply(closeTab(currentLayout(), pane.id, path))

  return (
    <div
      className="tabs"
      ref={ref}
      onWheel={(e) => (e.currentTarget.scrollLeft += e.deltaY + e.deltaX)}
      onDragOver={(e) => {
        if (!drag) return
        e.preventDefault()
        if (e.target === e.currentTarget) setMarker({ index: indexAt('', false) })
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setMarker(null)
      }}
      onDrop={(e) => {
        e.preventDefault()
        drop(pane.id, 'center', marker?.index)
        setMarker(null)
      }}
    >
      {pane.tabs.map((path) => {
        const doc = docs.get(path)
        const num = doc && workspaces.get(doc.ws)?.num
        return (
          <div
            key={path}
            className="tab"
            data-active={path === pane.active || undefined}
            data-marker={markerOn?.path === path ? markerOn.side : undefined}
            title={path}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', path)
              e.dataTransfer.effectAllowed = 'move'
              startDrag({ kind: 'tab', from: pane.id, path })
            }}
            onDragEnd={() => {
              endDrag()
              setMarker(null)
            }}
            onDragOver={(e) => {
              if (!drag || path === dragged) return
              e.preventDefault()
              const box = e.currentTarget.getBoundingClientRect()
              setMarker({ index: indexAt(path, e.clientX > box.left + box.width / 2) })
            }}
            onClick={() => setLayout(activate(currentLayout(), pane.id, path), pane.id)}
            onAuxClick={(e) => e.button === 1 && close(path)}
          >
            {num && <PhaseBadge num={num} />}
            {doc && <KindBadge kind={doc.kind} />}
            <span className="tab-title">{doc?.title ?? path.split('/').pop()}</span>
            <CopyPath path={path} className="icon-btn sm tab-copy" title="Copy the file path" />
            <button
              type="button"
              className="icon-btn sm tab-close"
              title="Close"
              onClick={(e) => {
                e.stopPropagation()
                close(path)
              }}
            >
              <X />
            </button>
          </div>
        )
      })}
    </div>
  )
}
