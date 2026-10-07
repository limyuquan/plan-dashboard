import { useState } from 'react'
import { splitDocPath } from '../../shared/keys'
import { Check, Copy } from '../icons'
import { useStore } from '../state/store'

// Copies the absolute path of a file or folder in a docs folder, ready to
// paste into a terminal or hand to an agent, and shows a tick for a moment.
export function CopyPath({ path, className, title }: { path: string; className: string; title: string }) {
  const { folder, rel } = splitDocPath(path)
  const root = useStore((s) => s.tree?.folders.find((f) => f.name === folder)?.root)
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className={className}
      title={title}
      onClick={(e) => {
        e.stopPropagation()
        void navigator.clipboard.writeText(root ? `${root}/${rel}` : path)
        setDone(true)
        setTimeout(() => setDone(false), 1200)
      }}
    >
      {done ? <Check /> : <Copy />}
    </button>
  )
}
