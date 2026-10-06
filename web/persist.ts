// Small wrappers over localStorage, where per-browser UI state lives (pane
// layouts, sidebar width, which tasks are open). Anything unreadable falls back.
const PREFIX = 'plan-dashboard.'

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export const save = (key: string, value: unknown) => localStorage.setItem(PREFIX + key, JSON.stringify(value))
