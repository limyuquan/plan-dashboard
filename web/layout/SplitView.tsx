import { Fragment, useRef } from 'react'
import { trackMouse } from '../drag'
import { getState } from '../state/store'
import { currentLayout, setLayout } from '../state/workspaces'
import { resize, type Split } from './model'
import { NodeView } from './NodeView'

const GAP = 6 // px between children, which is also the divider's grab area
const MIN_PX = 140 // smallest a pane can be dragged to

// Children side by side ('row') or stacked ('col'), with a divider between
// each pair. Sizes are flex-grow weights, so they never need to add up exactly.
export function SplitView({ split }: { split: Split }) {
  const ref = useRef<HTMLDivElement>(null)
  const row = split.dir === 'row'

  // Dragging a divider re-splits only the two children either side of it.
  const startResize = (i: number) => (e: React.MouseEvent) => {
    const sizes = [...split.sizes]
    trackMouse(e, row ? 'col-resize' : 'row-resize', (ev) => {
      const box = ref.current?.getBoundingClientRect()
      if (!box) return
      const avail = (row ? box.width : box.height) - (sizes.length - 1) * GAP
      let start = 0
      for (let k = 0; k < i; k++) start += (sizes[k] / 100) * avail + GAP
      const pairPct = sizes[i] + sizes[i + 1]
      const pairPx = (pairPct / 100) * avail
      if (avail <= 0 || pairPx <= 0) return
      // A pair too small for two minimums splits into thirds instead.
      const min = Math.min(MIN_PX, pairPx / 3)
      const pos = (row ? ev.clientX - box.left : ev.clientY - box.top) - start
      const local = Math.max(min, Math.min(pairPx - min, pos))
      const next = [...sizes]
      next[i] = (local / pairPx) * pairPct
      next[i + 1] = pairPct - next[i]
      setLayout(resize(currentLayout(), split.id, next), getState().focus)
    })
  }

  return (
    <div ref={ref} className="split" data-dir={split.dir}>
      {split.children.map((child, i) => (
        <Fragment key={child.id}>
          {i > 0 && <div className="divider" data-dir={split.dir} onMouseDown={startResize(i - 1)} />}
          <div className="split-cell" style={{ flex: `${split.sizes[i]} 1 0` }}>
            <NodeView node={child} />
          </div>
        </Fragment>
      ))}
    </div>
  )
}
