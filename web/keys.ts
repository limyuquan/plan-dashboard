import { DEFAULT_HOTKEYS, actionFor } from '../shared/hotkeys'
import { getState } from './state/store'

// The shortcut a key press triggers under the current config, if any. The
// iframe bridge uses isShortcut to pass exactly these keys out of a plan.
export const actionOf = (e: KeyboardEvent) => actionFor(getState().tree?.hotkeys ?? DEFAULT_HOTKEYS, e)

export const isShortcut = (e: KeyboardEvent) => actionOf(e) !== null

// Keys typed into a field belong to the field.
export const isTyping = (target: EventTarget | null) =>
  !!(target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable]')
