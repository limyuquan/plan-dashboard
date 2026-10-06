import { useSyncExternalStore } from 'react'

// The dashboard's theme. Markdown follows it because we render that ourselves;
// HTML plans follow it through the Viewer (a ?theme= query on first load, then a
// {type: 'plan-theme'} postMessage on every change), and can push a change back
// the same way when the reader flips the switch inside a plan.
export type Theme = 'dark' | 'light'

const KEY = 'plan-dashboard.theme'
const listeners = new Set<() => void>()

const system = (): Theme => (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')

let theme: Theme = (localStorage.getItem(KEY) as Theme | null) ?? system()

function apply() {
  document.documentElement.dataset.theme = theme
}
apply()

export function setTheme(next: Theme) {
  if (next === theme) return
  theme = next
  localStorage.setItem(KEY, theme)
  apply()
  listeners.forEach((notify) => notify())
}

export function toggleTheme() {
  setTheme(theme === 'dark' ? 'light' : 'dark')
}

export const useTheme = (): Theme =>
  useSyncExternalStore(
    (notify) => {
      listeners.add(notify)
      return () => void listeners.delete(notify)
    },
    () => theme,
  )
