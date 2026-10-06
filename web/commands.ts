import { useEffect } from 'react'
import type { HotkeyAction } from '../shared/hotkeys'
import { roomIn } from './layout/area'
import { activate, closeTab, findPane, moveToNewPane, shift, type Dir, type Side } from './layout/model'
import { actionOf, isTyping } from './keys'
import { getState } from './state/store'
import { apply, currentLayout, enter, setLayout } from './state/workspaces'

const MOVES: Partial<Record<HotkeyAction, Dir>> = {
  moveTabLeft: 'left',
  moveTabRight: 'right',
  moveTabUp: 'up',
  moveTabDown: 'down',
}
const SPLITS: Partial<Record<HotkeyAction, Side>> = { splitRight: 'right', splitDown: 'bottom' }

// The sidebar owns its own open/shut state; these ask it to change.
export const SIDEBAR_TOGGLE = 'planner:toggle-sidebar'
export const SEARCH_FOCUS = 'planner:focus-search'

function run(action: HotkeyAction, n?: number) {
  const layout = currentLayout()
  const { focus, tree, current } = getState()
  const pane = findPane(layout, focus)
  const dir = MOVES[action]
  const side = SPLITS[action]
  if (dir) {
    const result = shift(layout, focus, dir, roomIn(layout))
    if (result) apply(result)
  } else if (side) {
    if (pane?.active && pane.tabs.length > 1 && roomIn(layout)(pane.id, side)) {
      apply(moveToNewPane(layout, pane.id, pane.active, pane.id, side))
    }
  } else if (action === 'nextTab' || action === 'previousTab') {
    if (!pane?.active || pane.tabs.length < 2) return
    const at = pane.tabs.indexOf(pane.active) + (action === 'nextTab' ? 1 : -1)
    setLayout(activate(layout, pane.id, pane.tabs[(at + pane.tabs.length) % pane.tabs.length]), pane.id)
  } else if (action === 'closeTab') {
    if (pane?.active) apply(closeTab(layout, pane.id, pane.active))
  } else if (action === 'openPhase') {
    // The nth phase with something to read, of the task you are in.
    const task = tree?.tasks.find((t) => t.key === current.split('/')[0])
    const phase = task?.phases.filter((p) => p.docs.length)[(n ?? 1) - 1]
    if (phase) enter(phase.key)
  } else if (action === 'toggleSidebar') {
    window.dispatchEvent(new Event(SIDEBAR_TOGGLE))
  } else if (action === 'focusSearch') {
    window.dispatchEvent(new Event(SEARCH_FOCUS))
  }
}

// Runs whichever action a key press is bound to (see shared/hotkeys.ts).
// Keys pressed inside a plan reach here too, through the iframe bridge.
export function useHotkeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Settings records shortcuts itself, and nothing should move behind it.
      if (isTyping(e.target) || getState().settingsOpen) return
      const hit = actionOf(e)
      if (!hit) return
      e.preventDefault()
      run(hit.action, hit.n)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
