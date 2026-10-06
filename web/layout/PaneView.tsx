import { useState } from 'react'
import { useStore } from '../state/store'
import { apply, closePaneWithUndo, currentLayout, setFocus } from '../state/workspaces'
import { Chevron } from '../icons'
import { Viewer } from '../viewer/Viewer'
import { roomIn } from './area'
import { drop, zonesFor, type Zone } from './dnd'
import { canShift, moveToNewPane, shift, type Dir, type Pane, type Side } from './model'
import { TabStrip } from './TabStrip'

const MOVES: [Dir, string][] = [
  ['left', 'to the pane on the left'],
  ['right', 'to the pane on the right'],
  ['up', 'to the pane above'],
  ['down', 'to the pane below'],
]
const SPLITS: [Side, string, string][] = [
  ['right', '⊞', 'on the right'],
  ['bottom', '⊟', 'below'],
]

// The buttons at the end of a pane's tab bar. Each only shows when it can do
// something: a move needs a pane that way, a split needs a tab to spare and room.
function PaneActions({ pane, only }: { pane: Pane; only: boolean }) {
  const layout = currentLayout()
  const room = roomIn(layout)
  const path = pane.active
  return (
    <div className="pane-acts">
      {path &&
        MOVES.filter(([dir]) => canShift(layout, pane.id, dir)).map(([dir, where]) => (
          <button
            key={`move-${dir}`}
            className="pane-act"
            title={`Move this tab ${where}`}
            onClick={() => apply(shift(layout, pane.id, dir, room)!)}
          >
            <Chevron dir={dir} />
          </button>
        ))}
      {path &&
        pane.tabs.length > 1 &&
        SPLITS.filter(([side]) => room(pane.id, side)).map(([side, glyph, where]) => (
          <button
            key={`split-${side}`}
            className="pane-act"
            title={`Split this tab into a new pane ${where}`}
            onClick={() => apply(moveToNewPane(layout, pane.id, path, pane.id, side))}
          >
            {glyph}
          </button>
        ))}
      {!only && (
        <button className="pane-act pane-close" title="Close this pane" onClick={() => closePaneWithUndo(pane.id)}>
          ×
        </button>
      )}
    </div>
  )
}

// Where the drop highlight is painted: the half of the pane a new pane would
// take, or all of it for "move here". It always matches what the drop does.
const PREVIEW: Record<Zone, React.CSSProperties> = {
  center: { inset: 0 },
  left: { top: 0, bottom: 0, left: 0, width: '50%' },
  right: { top: 0, bottom: 0, right: 0, width: '50%' },
  top: { left: 0, right: 0, top: 0, height: '50%' },
  bottom: { left: 0, right: 0, bottom: 0, height: '50%' },
}

// Targets laid over a pane while something is dragged: an edge band for each
// side with room to split, the middle for "put it in this pane". The bands
// also cover the iframe, which would otherwise swallow the drag.
function DropZones({ pane }: { pane: Pane }) {
  const [hover, setHover] = useState<Zone | null>(null)
  const sides = zonesFor(pane.id)
  const v = sides.includes('top') ? 22 : 0
  const h = sides.includes('left') ? 26 : 0
  const bands: [Zone, React.CSSProperties][] = [
    ...sides.map((side): [Zone, React.CSSProperties] => [
      side,
      side === 'top'
        ? { top: 0, left: 0, right: 0, height: `${v}%` }
        : side === 'bottom'
          ? { bottom: 0, left: 0, right: 0, height: `${v}%` }
          : side === 'left'
            ? { top: `${v}%`, bottom: `${v}%`, left: 0, width: `${h}%` }
            : { top: `${v}%`, bottom: `${v}%`, right: 0, width: `${h}%` },
    ]),
    ['center', { top: `${v}%`, bottom: `${v}%`, left: `${h}%`, right: `${h}%` }],
  ]
  return (
    <div
      className="drop-zones"
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setHover(null)}
    >
      {bands.map(([zone, style]) => (
        <div
          key={zone}
          className="dz"
          style={style}
          onDragOver={(e) => {
            e.preventDefault()
            setHover(zone)
          }}
          onDrop={(e) => {
            e.preventDefault()
            drop(pane.id, zone)
          }}
        />
      ))}
      {hover && (
        <div className="drop-preview" style={PREVIEW[hover]}>
          <span>{hover === 'center' ? 'open here' : 'split here'}</span>
        </div>
      )}
    </div>
  )
}

export function PaneView({ pane }: { pane: Pane }) {
  const focused = useStore((s) => s.focus === pane.id)
  const dragging = useStore((s) => !!s.drag)
  const only = useStore((s) => s.layouts[s.current]?.type !== 'split')
  // Re-render on any layout change, since which actions apply depends on it.
  useStore((s) => s.layouts[s.current])

  return (
    <section className="pane" data-focused={focused || undefined} onMouseDown={() => setFocus(pane.id)}>
      <div className="tabbar">
        <TabStrip pane={pane} />
        <PaneActions pane={pane} only={only} />
      </div>
      <div className="pane-body">
        {pane.active ? (
          <Viewer key={pane.active} path={pane.active} paneId={pane.id} />
        ) : (
          <div className="blank">
            <p>Pick a plan from the left.</p>
            <p className="blank-hint">Shift-click a plan, or drag one here, to read two side by side.</p>
          </div>
        )}
        {dragging && <DropZones pane={pane} />}
      </div>
    </section>
  )
}
