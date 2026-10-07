import { useState } from 'react'
import { splitDocPath } from '../../shared/keys'
import { Check, Copy } from '../icons'
import { useStore } from '../state/store'

// Copies the absolute path of a file or folder in a docs folder, ready to
// paste into a terminal or hand to an agent. `done` is true for a moment
// afterwards so the caller can show a tick.
export function useCopyPath(path: string) {
  const { folder, rel } = splitDocPath(path)
  const root = useStore((s) => s.tree?.folders.find((f) => f.name === folder)?.root)
  const [done, setDone] = useState(false)
  const copy = () => {
    void navigator.clipboard.writeText(root ? `${root}/${rel}` : path)
    setDone(true)
    setTimeout(() => setDone(false), 1200)
  }
  return { done, copy }
}

export function CopyPath({ path, className, title }: { path: string; className: string; title: string }) {
  const { done, copy } = useCopyPath(path)
  return (
    <button
      type="button"
      className={className}
      title={title}
      onClick={(e) => {
        e.stopPropagation()
        copy()
      }}
    >
      {done ? <Check /> : <Copy />}
    </button>
  )
}
