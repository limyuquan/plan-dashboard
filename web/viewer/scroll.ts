// Where each doc was scrolled to. A pane only keeps the shown tab's iframe,
// so switching tabs, moving a tab to another pane, a theme change or a file
// change all reload the doc; this puts the reader back where they were.
const positions = new Map<string, number>()

export const rememberScroll = (path: string, y: number) => positions.set(path, y)
export const savedScroll = (path: string) => positions.get(path) ?? 0
