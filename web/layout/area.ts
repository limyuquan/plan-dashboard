import { roomFor, type Layout, type Room } from './model'

// The pane area's size in pixels, kept current by the Panes component. Splits
// need it to know whether both halves would still be big enough.
let size = { width: 1200, height: 800 }

export const setAreaSize = (next: { width: number; height: number }) => (size = next)
export const roomIn = (l: Layout): Room => roomFor(l, size)
