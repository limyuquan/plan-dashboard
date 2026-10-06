import type { Dir } from './layout/model'

// The dashboard's keyboard shortcuts, in one place so the iframe bridge knows
// which keys to pass back out of a plan:
//   - Ctrl/Option + arrow  -> move the shown tab one pane that way
//   - Ctrl + 1..9          -> open that phase of the current task
//
// Option is there because macOS keeps Ctrl + arrows for Mission Control.
export function moveDirOf(e: KeyboardEvent): Dir | null {
  if (!(e.ctrlKey || e.altKey) || e.metaKey || e.shiftKey) return null
  const m = e.key.match(/^Arrow(Left|Right|Up|Down)$/)
  return m ? (m[1].toLowerCase() as Dir) : null
}

export function phaseNumberOf(e: KeyboardEvent): number | null {
  if (!e.ctrlKey || e.metaKey || e.altKey) return null
  return /^[1-9]$/.test(e.key) ? Number(e.key) : null
}

export const isShortcut = (e: KeyboardEvent) => moveDirOf(e) !== null || phaseNumberOf(e) !== null
