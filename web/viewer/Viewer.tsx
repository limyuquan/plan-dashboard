import { useEffect, useRef, useState } from 'react'
import { docUrl } from '../api'
import { followHref } from '../state/links'
import { useStore } from '../state/store'
import { setFocus } from '../state/workspaces'
import { setTheme, useTheme, type Theme } from '../theme'
import { attachFrame, findPending, restoreScroll } from './frame'

// One doc, in an iframe so its own styles and scripts stay its own.
//   - Markdown is rendered by the server in the dashboard's theme, so it
//     reloads when the theme changes.
//   - HTML keeps the theme it was first loaded with in its URL and is told
//     about changes by message instead, so it does not reload.
//   - Either reloads when its file changes on disk.
export function Viewer({ path, paneId }: { path: string; paneId: string }) {
  const ref = useRef<HTMLIFrameElement>(null)
  const theme = useTheme()
  const version = useStore((s) => s.versions[path] ?? 0)
  const [firstTheme] = useState(theme)
  const markdown = path.endsWith('.md')
  // The frame stays invisible until its page has loaded, so no blank flashes.
  const [loaded, setLoaded] = useState(false)

  // A doc's own light/dark switch reports back, and the dashboard follows.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow) return
      const data = e.data as { type?: string; theme?: Theme } | null
      if (data?.type === 'plan-theme' && (data.theme === 'dark' || data.theme === 'light')) setTheme(data.theme)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    const frame = ref.current
    if (!frame) return
    let detach = () => {}
    const wire = () => {
      setLoaded(true)
      detach()
      detach = attachFrame(frame, { path, theme, onLink: followHref, onFocus: () => setFocus(paneId) })
      restoreScroll(frame, path)
      findPending(frame, path)
    }
    frame.addEventListener('load', wire)
    if (frame.contentDocument?.readyState === 'complete' && frame.contentWindow?.location.href !== 'about:blank') wire()
    return () => {
      frame.removeEventListener('load', wire)
      detach()
    }
  }, [path, theme, paneId])

  // A search result for a doc that is already open: no reload, so look now.
  const finding = useStore((s) => s.pendingFind?.path === path)
  useEffect(() => {
    const frame = ref.current
    if (finding && frame?.contentDocument?.readyState === 'complete') findPending(frame, path)
  }, [finding, path])

  const src = `${docUrl(path)}?theme=${markdown ? theme : firstTheme}${version ? `&v=${version}` : ''}`
  return <iframe ref={ref} className="viewer" data-loaded={loaded || undefined} src={src} title={path} />
}
