import { isShortcut, isTyping } from '../keys'
import { getState, setState } from '../state/store'
import type { Theme } from '../theme'
import { rememberScroll, savedScroll } from './scroll'

// A pane is narrow, so the doc inside gets a thin scrollbar in colours we
// pick. Plain colours rather than color-scheme, so a light doc keeps its look.
const BAR = {
  dark: { track: '#17171c', thumb: '#3a3a42', hover: '#55555f' },
  light: { track: '#f0f0f3', thumb: '#c6c6ce', hover: '#a8a8b2' },
}

const scrollbarCss = (theme: Theme) => `
  html { scrollbar-width: thin; scrollbar-color: ${BAR[theme].thumb} ${BAR[theme].track}; }
  html::-webkit-scrollbar, body::-webkit-scrollbar { width: 7px; height: 7px; }
  html::-webkit-scrollbar-track, body::-webkit-scrollbar-track { background: ${BAR[theme].track}; }
  html::-webkit-scrollbar-thumb, body::-webkit-scrollbar-thumb { background: ${BAR[theme].thumb}; border-radius: 4px; }
  html::-webkit-scrollbar-thumb:hover, body::-webkit-scrollbar-thumb:hover { background: ${BAR[theme].hover}; }
  html::-webkit-scrollbar-corner, body::-webkit-scrollbar-corner { background: ${BAR[theme].track}; }
`

type Hooks = {
  path: string
  theme: Theme
  onLink: (href: string) => void
  onFocus: () => void
}

// Wires up a loaded doc. Docs are same-origin, so we can listen inside them:
//   - clicks on links         -> docs open as tabs, other sites in a browser tab
//   - mousedown               -> focuses the pane (it never reaches the app)
//   - dashboard shortcuts     -> passed back out, so they work while reading
//   - scrolling               -> remembered, and restored on the next load
// It also applies the scrollbar style and tells the doc the dashboard's theme
// ({type: 'plan-theme', theme} by postMessage; docs may listen and switch).
export function attachFrame(frame: HTMLIFrameElement, hooks: Hooks): () => void {
  const win = frame.contentWindow
  const doc = frame.contentDocument
  if (!win || !doc) return () => {}

  const onClick = (e: MouseEvent) => {
    const anchor = (e.target as HTMLElement | null)?.closest?.('a')
    const href = anchor?.getAttribute('href')
    if (!anchor || !href || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) return
    e.preventDefault()
    e.stopPropagation()
    const url = new URL(href, win.location.href)
    // Another site: a browser tab, never inside the pane.
    if (url.origin !== location.origin && url.protocol !== 'file:') return void window.open(url, '_blank', 'noopener')
    hooks.onLink(url.href)
  }
  const onDown = () => hooks.onFocus()
  const onKey = (e: KeyboardEvent) => {
    if (isTyping(e.target) || !isShortcut(e)) return
    e.preventDefault()
    window.dispatchEvent(new KeyboardEvent('keydown', e))
  }
  const onScroll = () => rememberScroll(hooks.path, win.scrollY)

  doc.addEventListener('click', onClick, true)
  doc.addEventListener('mousedown', onDown, true)
  doc.addEventListener('keydown', onKey, true)
  win.addEventListener('scroll', onScroll, { passive: true })

  const style = doc.getElementById('pane-scrollbar') ?? doc.createElement('style')
  style.id = 'pane-scrollbar'
  style.textContent = scrollbarCss(hooks.theme)
  if (!style.parentNode) doc.head?.append(style)
  win.postMessage({ type: 'plan-theme', theme: hooks.theme }, location.origin)

  return () => {
    doc.removeEventListener('click', onClick, true)
    doc.removeEventListener('mousedown', onDown, true)
    doc.removeEventListener('keydown', onKey, true)
    win.removeEventListener('scroll', onScroll)
  }
}

// Puts a freshly loaded doc back where the reader left it. Pages that build
// themselves with scripts may not be tall enough yet, so try again shortly.
export function restoreScroll(frame: HTMLIFrameElement, path: string) {
  const y = savedScroll(path)
  const win = frame.contentWindow
  if (!y || !win) return
  win.scrollTo(0, y)
  setTimeout(() => win.scrollY < y - 1 && win.scrollTo(0, y), 150)
}

// Shows the first match of a pending search in this doc, selected and in view.
export function findPending(frame: HTMLIFrameElement, path: string) {
  const want = getState().pendingFind
  const win = frame.contentWindow as (Window & { find?: (text: string) => boolean }) | null
  // A new frame is blank until the doc loads; the load handler calls again.
  if (want?.path !== path || !win || win.location.href === 'about:blank') return
  setState({ pendingFind: null })
  win.getSelection()?.removeAllRanges()
  win.find?.(want.term)
}
