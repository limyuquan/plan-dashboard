import { useRef } from 'react'
import { useDismiss } from './useDismiss'
import { Check, Copy, Smile } from '../icons'
import { useCopyPath } from './CopyPath'

type Props = {
  dir: string
  onChangeIcon: () => void
  onClose: () => void
}

// The menu under a task row's "Task settings" button: change its icon, copy
// its folder path.
export function TaskMenu({ dir, onChangeIcon, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const { done, copy } = useCopyPath(dir)

  useDismiss(ref, onClose)

  return (
    <div className="task-menu popover" role="menu" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button type="button" role="menuitem" className="menu-item" onClick={onChangeIcon}>
        <Smile />
        Change icon…
      </button>
      <button
        type="button"
        role="menuitem"
        className="menu-item"
        onClick={() => {
          copy()
          setTimeout(onClose, 1000)
        }}
      >
        {done ? <Check /> : <Copy />}
        {done ? 'Copied' : 'Copy folder path'}
      </button>
    </div>
  )
}
