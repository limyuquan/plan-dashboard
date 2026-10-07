import { useRef } from 'react'
import { useDismiss } from './useDismiss'
import { Check, Columns2, Copy, RotateCcw, Smile } from '../icons'
import { enter, resetLayout } from '../state/workspaces'
import { useCopyPath } from './CopyPath'

type Props = {
  wsKey: string
  // True when this task is already the workspace you are in.
  current: boolean
  dir: string
  onChangeIcon: () => void
  onClose: () => void
}

// The menu under a task row's "Task settings" button: open it as your
// workspace (or lay it out again), change its icon, copy its folder path.
export function TaskMenu({ wsKey, current, dir, onChangeIcon, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const { done, copy } = useCopyPath(dir)

  useDismiss(ref, onClose)

  return (
    <div className="task-menu popover" role="menu" ref={ref} onClick={(e) => e.stopPropagation()}>
      {current ? (
        <button
          type="button"
          role="menuitem"
          className="menu-item"
          title="Picks up new docs"
          onClick={() => {
            onClose()
            resetLayout(wsKey)
          }}
        >
          <RotateCcw />
          Lay out again
        </button>
      ) : (
        <button
          type="button"
          role="menuitem"
          className="menu-item"
          onClick={() => {
            onClose()
            enter(wsKey)
          }}
        >
          <Columns2 />
          Open as workspace
        </button>
      )}
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
