import { useEffect } from 'react'
import { subscribe } from './events'
import { phaseNumberOf } from './keys'
import { Panes } from './layout/Panes'
import { Settings } from './settings/Settings'
import { Setup } from './settings/Setup'
import { Sidebar } from './sidebar/Sidebar'
import { syncAddressBar } from './state/links'
import { getState, useStore } from './state/store'
import { onServerEvent, refresh } from './state/tree'
import { enter } from './state/workspaces'
import { Toasts } from './toasts/Toasts'

// Ctrl + 1..9 opens the nth phase (with something to read) of the task you are in.
function usePhaseKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = phaseNumberOf(e)
      if (!n) return
      const { tree, current } = getState()
      const task = tree?.tasks.find((t) => t.key === current.split('/')[0])
      const phase = task?.phases.filter((p) => p.docs.length)[n - 1]
      if (!phase) return
      e.preventDefault()
      enter(phase.key)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

export function App() {
  const loaded = useStore((s) => s.loaded)
  const hasTree = useStore((s) => !!s.tree)
  const settingsOpen = useStore((s) => s.settingsOpen)
  usePhaseKeys()

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
