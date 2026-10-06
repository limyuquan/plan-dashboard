import { getState, setState, type Toast } from './store'

let nextId = 0

export function pushToast(toast: Omit<Toast, 'id'>) {
  const id = ++nextId
  setState({ toasts: [...getState().toasts, { ...toast, id }] })
  setTimeout(() => dismissToast(id), toast.lasting ? 60_000 : 9000)
}

export const dismissToast = (id: number) => setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
