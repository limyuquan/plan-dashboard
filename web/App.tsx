import { useEffect } from 'react'
import { subscribe } from './events'
import { useHotkeys } from './commands'
import { Panes } from './layout/Panes'
import { Settings } from './settings/Settings'
import { Setup } from './settings/Setup'
import { Sidebar } from './sidebar/Sidebar'
import { syncAddressBar } from './state/links'
import { useStore } from './state/store'
import { onServerEvent, refresh } from './state/tree'
import { Toasts } from './toasts/Toasts'

export function App() {
  const loaded = useStore((s) => s.loaded)
  const hasTree = useStore((s) => !!s.tree)
  const settingsOpen = useStore((s) => s.settingsOpen)
  useHotkeys()

  useEffect(() => {
    void refresh()
    const unsubscribe = subscribe(onServerEvent)
    const unsync = syncAddressBar()
    return () => {
      unsubscribe()
      unsync()
    }
  }, [])

  if (!loaded) return null
  if (!hasTree) return <Setup />
  return (
    <div className="app">
      <Sidebar />
      <Panes />
      <Toasts />
      {settingsOpen && <Settings />}
    </div>
  )
}
