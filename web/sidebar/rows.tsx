import type { Doc, Folder, Task } from '../../shared/types'
import { endDrag, startDrag } from '../layout/dnd'
import { allPaths } from '../layout/model'
import { useStore } from '../state/store'
import { moveTask } from '../state/tree'
import { enter, landingKey, openDoc, resetLayout } from '../state/workspaces'
import { Chevron } from '../icons'
import { KindBadge } from './badges'
import { CopyPath } from './CopyPath'

// Beside a task or folder: "ws" makes it your workspace. On the one you are
// already in it becomes ↺, which lays it out again from its docs.
function WsButton({ wsKey }: { wsKey: string }) {
  const current = useStore((s) => s.current === wsKey)
  return (
    <span
      className="ws-btn"
      data-cur={current || undefined}
      title={current ? 'Lay this workspace out again (picks up new docs)' : 'Make this your workspace'}
      onClick={(e) => {
        e.stopPropagation()
        if (current) resetLayout(wsKey)
        else enter(wsKey)
      }}
    >
      {current ? '↺' : 'ws'}
    </span>
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
      <span
        className="split-btn"
        title="Open in the next pane (or shift-click)"
        onClick={(e) => {
          e.stopPropagation()
          openDoc(doc.path, 'next')
        }}
      >
        ⇥
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
        {!empty && <Chevron dir={open ? 'down' : 'right'} className="chev" />}
        <span className="folder-num">{folder.num ? `Phase ${folder.num}` : folder.label}</span>
        {folder.num && <span className="folder-label">{folder.label}</span>}
        {empty && <span className="tag">empty</span>}
        <span className="row-acts">
          <CopyPath path={folder.dir} className="ws-btn copy-btn" title="Copy the folder path" />
          {!empty && <WsButton wsKey={folder.key} />}
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
  const unseen = useStore((s) => s.unseen.has(task.key))
  const settle = useStore((s) => s.tree?.settle)
  const empty = !task.docs.length && !task.phases.length && !task.groups.length
  return (
    <div className="task">
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
        <span className="task-name">{task.label}</span>
        {unseen && <span className="dot" title="New plan since you last looked" />}
        {settle && task.status && (
          <span
            className="task-act"
            title={task.status === 'active' ? 'Move to the done folder' : 'Move back to the active folder'}
            onClick={(e) => {
              e.stopPropagation()
              void moveTask(task.name, task.status === 'active' ? 'done' : 'active')
            }}
          >
            {task.status === 'active' ? 'settle' : 'restore'}
          </span>
        )}
        <span className="row-acts">
          <CopyPath path={task.dir} className="ws-btn copy-btn" title="Copy the task folder path" />
          <WsButton wsKey={landingKey(task)} />
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
          {empty && <div className="empty-note">nothing to read yet</div>}
        </div>
      )}
    </div>
  )
}
