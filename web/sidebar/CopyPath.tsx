import { useState } from 'react'
import { useStore } from '../state/store'

// Copies the absolute path of a file or folder under the docs root, ready to
// paste into a terminal or hand to an agent, and says so for a moment.
export function CopyPath({ path, className, title }: { path: string; className: string; title: string }) {
  const root = useStore((s) => s.tree?.root ?? '')
  const [done, setDone] = useState(false)
  return (
    <span
      className={className}
      title={title}
      onClick={(e) => {
        e.stopPropagation()
        void navigator.clipboard.writeText(root ? `${root}/${path}` : path)
        setDone(true)
        setTimeout(() => setDone(false), 1200)
      }}
    >
      {done ? '✓' : '⧉'}
    </span>
  )
}
