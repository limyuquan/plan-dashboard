import { getState, setState, type Drag } from '../state/store'
import { apply, currentLayout } from '../state/workspaces'
import { roomIn } from './area'
import { addTab, dropDoc, findPane, moveTab, moveToNewPane, type Side } from './model'

export type Zone = Side | 'center'

export const startDrag = (drag: Drag) => setState({ drag })
export const endDrag = () => setState({ drag: null })

// Edge zones offered on a pane while something is dragged over it. An edge
// only appears where a split has room, and never where dropping would leave
// the layout as it was (a pane's only tab onto its own edge).
export function zonesFor(paneId: string): Side[] {
  const drag = getState().drag
  const layout = currentLayout()
  if (drag?.kind === 'tab' && drag.from === paneId && findPane(layout, paneId)?.tabs.length === 1) return []
  const room = roomIn(layout)
  return (['left', 'right', 'top', 'bottom'] as const).filter((side) => room(paneId, side))
}

// Drops whatever is being dragged onto a pane: its centre, an edge, or a
// position in its tab strip.
export function drop(paneId: string, zone: Zone, index?: number) {
  const drag = getState().drag
  const layout = currentLayout()
  endDrag()
  if (!drag) return
  if (drag.kind === 'doc') {
    if (zone === 'center') return apply({ layout: addTab(layout, paneId, drag.path, index), focus: paneId })
    return apply(dropDoc(layout, drag.path, paneId, zone))
  }
  if (zone === 'center') return apply(moveTab(layout, drag.from, paneId, drag.path, index))
  apply(moveToNewPane(layout, drag.from, drag.path, paneId, zone))
}
