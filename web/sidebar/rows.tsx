import { useState } from 'react'
import type { Doc, Folder, Task } from '../../shared/types'
import { endDrag, startDrag } from '../layout/dnd'
import { allPaths } from '../layout/model'
import { useStore } from '../state/store'
import { moveTask } from '../state/tree'
import { enter, landingKey, openDoc, resetLayout } from '../state/workspaces'
import { Check, Chevron, Columns2, Ellipsis, RotateCcw, SquareSplitHorizontal, Undo2 } from '../icons'
import { setTaskIcon } from '../state/icons'
import { KindBadge } from './badges'
import { IconPicker } from './IconPicker'
import { CopyPath } from './CopyPath'
import { TaskMenu } from './TaskMenu'

// Beside a phase: "Open" makes it your workspace. On the one you are already
// in it is a reset icon, which lays it out again from its docs.
function WsButton({ wsKey, current }: { wsKey: string; current: boolean }) {
  return current ? (
    <button
      type="button"
      className="icon-btn sm ws-btn"
      data-cur
      title="Lay this workspace out again (picks up new docs)"
      onClick={(e) => {
        e.stopPropagation()
        resetLayout(wsKey)
      }}
    >
      <RotateCcw />
    </button>
  ) : (
    <button
      type="button"
      className="link-btn ws-btn"
      title="Make this your workspace"
      onClick={(e) => {
        e.stopPropagation()
        enter(wsKey)
      }}
    >
      <Columns2 />
      Open
    </button>
  )
}

export function DocRow({ doc }: { doc: Doc }) {
  const open = useStore((s) => {
    const layout = s.layouts[s.current]
    return !!layout && allPaths(layout).includes(doc.path)
  })
  return (
    <div
      className="doc"
      data-open={open || undefined}
      title={doc.title}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'copy'
        e.dataTransfer.setData('text/plain', doc.path)
        startDrag({ kind: 'doc', path: doc.path })
      }}
      onDragEnd={endDrag}
      onClick={(e) => openDoc(doc.path, e.shiftKey ? 'next' : 'focused')}
    >
      <KindBadge kind={doc.kind} />
      <span className="doc-title">{doc.title}</span>
      <span className="row-acts">
        <button
          type="button"
          className="icon-btn sm split-btn"
          title="Open in the next pane (or shift-click)"
          onClick={(e) => {
            e.stopPropagation()
            openDoc(doc.path, 'next')
          }}
        >
          <SquareSplitHorizontal />
        </button>
      </span>
    </div>
  )
}

// A phase or a group like research/: shut until you open it.
export function FolderRow({ folder, open, onToggle }: { folder: Folder; open: boolean; onToggle: () => void }) {
  const cur = useStore((s) => s.current === folder.key)
  const empty = !folder.docs.length
  return (
    <div className="folder" data-empty={empty || undefined}>
      <div className="folder-row" data-cur={cur || undefined} onClick={() => !empty && onToggle()}>
        {empty ? <span className="chev" /> : <Chevron dir={open ? 'down' : 'right'} className="chev" />}
        <span className="folder-num">{folder.num ? `Phase ${folder.num}` : folder.label}</span>
        {folder.num && <span className="folder-label">{folder.label}</span>}
        {empty && <span className="badge">empty</span>}
        <span className="row-meta">{!empty && cur && <WsButton wsKey={folder.key} current />}</span>
        <span className="row-acts">
          <CopyPath path={folder.dir} className="icon-btn sm copy-btn" title="Copy the folder path" />
          {!empty && !cur && <WsButton wsKey={folder.key} current={false} />}
        </span>
      </div>
      {open && folder.docs.map((d) => <DocRow key={d.path} doc={d} />)}
    </div>
  )
}

type TaskRowProps = {
  task: Task
  open: boolean
  onToggle: () => void
  isOpen: (key: string) => boolean
  onToggleFolder: (key: string) => void
  // Drag-to-reorder within the section.
  dropping: boolean
  drag: {
    onStart: () => void
    onOver: (e: React.DragEvent) => void
    onDrop: () => void
    onEnd: () => void
  }
}

export function TaskRow({ task, open, onToggle, isOpen, onToggleFolder, dropping, drag }: TaskRowProps) {
  const here = useStore((s) => s.current === task.key || s.current.startsWith(`${task.key}/`))
  const wsKey = landingKey(task)
  const wsCur = useStore((s) => s.current === wsKey)
  const unseen = useStore((s) => s.unseen.has(task.key))
  const settle = useStore((s) => s.tree?.folders.find((f) => f.name === task.folder)?.settle)
  const empty = !task.docs.length && !task.phases.length && !task.groups.length
  const [picking, setPicking] = useState(false)
  const [menu, setMenu] = useState(false)
  return (
    <div className="task">
      {menu && (
        <TaskMenu
          dir={task.dir}
          onChangeIcon={() => {
            setMenu(false)
            setPicking(true)
          }}
          onClose={() => setMenu(false)}
        />
      )}
      {picking && (
        <IconPicker
          current={task.icon}
          onPick={(icon) => {
            setPicking(false)
            void setTaskIcon(task.key, icon)
          }}
          onClose={() => setPicking(false)}
        />
      )}
      <div
        className="task-row"
        data-cur={here || undefined}
        data-dropping={dropping || undefined}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', task.key)
          drag.onStart()
        }}
        onDragOver={drag.onOver}
        onDrop={(e) => {
          e.preventDefault()
          drag.onDrop()
        }}
        onDragEnd={drag.onEnd}
        onClick={onToggle}
      >
        <Chevron dir={open ? 'down' : 'right'} className="chev" />
        {task.icon && <span className="task-icon">{task.icon}</span>}
        <span className="task-name" title={task.label}>
          {task.label}
        </span>
        <span className="row-meta">
          {unseen && (
            <span className="pill-new" title="New plan since you last looked">
              New
            </span>
          )}
          {wsCur && <WsButton wsKey={wsKey} current />}
        </span>
        <span className="row-acts">
          {!wsCur && <WsButton wsKey={wsKey} current={false} />}
          {settle && task.status && (
            <button
              type="button"
              className="link-btn task-act"
              title={task.status === 'active' ? 'Move to the done folder' : 'Move back to the active folder'}
              onClick={(e) => {
                e.stopPropagation()
                void moveTask(task.key, task.status === 'active' ? 'done' : 'active')
              }}
            >
              {task.status === 'active' ? <Check /> : <Undo2 />}
              {task.status === 'active' ? 'settle' : 'restore'}
            </button>
          )}
          <button
            type="button"
            className="icon-btn sm"
            title="Task settings"
            onClick={(e) => {
              e.stopPropagation()
              setMenu((v) => !v)
            }}
          >
            <Ellipsis />
          </button>
        </span>
      </div>
      {open && (
        <div className="task-body">
          {task.docs.map((d) => (
            <DocRow key={d.path} doc={d} />
          ))}
          {[...task.phases, ...task.groups].map((f) => (
            <FolderRow key={f.key} folder={f} open={isOpen(f.key)} onToggle={() => onToggleFolder(f.key)} />
          ))}
          {empty && <div className="empty-note">Nothing to read yet</div>}
        </div>
      )}
    </div>
  )
}
