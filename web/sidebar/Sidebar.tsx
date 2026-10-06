import { useEffect, useRef, useState } from 'react'
import type { Doc, DocsFolderInfo, Task } from '../../shared/types'
import { SEARCH_FOCUS, SIDEBAR_TOGGLE } from '../commands'
import { trackMouse } from '../drag'
import { useStore, setState } from '../state/store'
import { toggleTheme, useTheme } from '../theme'
import { Chevron } from '../icons'
import { usePersisted } from '../usePersisted'
import { DocRow, TaskRow } from './rows'
import { SearchResults } from './SearchResults'

const hit = (q: string, ...texts: string[]) => texts.some((t) => t.toLowerCase().includes(q))
const docHit = (q: string) => (d: Doc) => hit(q, d.title, d.file)

// Narrows a task to what matches the search, or null when nothing does.
function filterTask(task: Task, q: string): Task | null {
  if (!q || hit(q, task.name)) return task
  const narrow = (folders: Task['phases']) =>
    folders
      .map((f) => (hit(q, f.name, f.label) ? f : { ...f, docs: f.docs.filter(docHit(q)) }))
      .filter((f) => f.docs.length || hit(q, f.name, f.label))
  const docs = task.docs.filter(docHit(q))
  const phases = narrow(task.phases)
  const groups = narrow(task.groups)
  return docs.length || phases.length || groups.length ? { ...task, docs, phases, groups } : null
}

const toggled = (list: string[], item: string) =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item]

function Fold({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="side-label fold" onClick={onToggle}>
      {label}
      <span className="rule" />
      <Chevron dir={open ? 'down' : 'right'} className="chev" />
    </div>
  )
}

export function Sidebar() {
  const tree = useStore((s) => s.tree)
  const current = useStore((s) => s.current)
  const anyUnseen = useStore((s) => s.unseen.size > 0)
  const theme = useTheme()
  const [query, setQuery] = useState('')
  const [width, setWidth] = usePersisted('sidebar.width', 310)
  const [collapsed, setCollapsed] = usePersisted('sidebar.collapsed', false)
  const [expanded, setExpanded] = usePersisted<string[]>('sidebar.expanded', [])
  // Folders start shut, so opening a task shows its phases, not every doc.
  const [openFolders, setOpenFolders] = usePersisted<string[]>('sidebar.openFolders', [])
  const [openSections, setOpenSections] = usePersisted<string[]>('sidebar.openSections', [])
  const [order, setOrder] = usePersisted<string[]>('sidebar.taskOrder', [])
  // Docs folder sections start open; this holds the ones you shut.
  const [closedFolders, setClosedFolders] = usePersisted<string[]>('sidebar.closedFolders', [])
  const configProblem = useStore((s) => s.configProblem)
  const [dragTask, setDragTask] = useState<string | null>(null)
  const [overTask, setOverTask] = useState<string | null>(null)

  // The toggleSidebar and focusSearch shortcuts (see commands.ts).
  const searchRef = useRef<HTMLInputElement>(null)
  const [wantSearch, setWantSearch] = useState(0)
  useEffect(() => {
    const toggle = () => setCollapsed((c) => !c)
    const search = () => {
      setCollapsed(false)
      setWantSearch((n) => n + 1)
    }
    window.addEventListener(SIDEBAR_TOGGLE, toggle)
    window.addEventListener(SEARCH_FOCUS, search)
    return () => {
      window.removeEventListener(SIDEBAR_TOGGLE, toggle)
      window.removeEventListener(SEARCH_FOCUS, search)
    }
  }, [setCollapsed])
  useEffect(() => {
    if (wantSearch) searchRef.current?.focus()
  }, [wantSearch, collapsed])

  // Switching workspace opens its task and folder, so you can see where you are.
  useEffect(() => {
    if (!current) return
    const task = current.split('/')[0]
    setExpanded((list) => (list.includes(task) ? list : [...list, task]))
    if (current.includes('/')) setOpenFolders((list) => (list.includes(current) ? list : [...list, current]))
  }, [current, setExpanded, setOpenFolders])

  if (collapsed) {
    return (
      <div className="rail" onClick={() => setCollapsed(false)} title="Show the sidebar">
        <Chevron dir="right" className="rail-chev" />
        <span className="rail-text">plans</span>
        {anyUnseen && <span className="dot" />}
      </div>
    )
  }

  const q = query.trim().toLowerCase()
  const folders = tree?.folders ?? []
  const many = folders.length > 1
  const tasks = (tree?.tasks ?? []).map((t) => filterTask(t, q)).filter((t): t is Task => !!t)
  // Tasks you dragged into place keep that place; the rest follow, newest first.
  const rank = (key: string) => order.indexOf(key)
  const sorted = (list: Task[]) => [...list].sort((a, b) => rank(a.key) - rank(b.key))

  // Dropping task A on task B puts A where B was, within its own section.
  const reorder = (target: string, list: Task[]) => {
    if (!dragTask || dragTask === target) return
    const keys = list.map((t) => t.key)
    const from = keys.indexOf(dragTask)
    const to = keys.indexOf(target)
    if (from < 0 || to < 0) return
    keys.splice(to, 0, ...keys.splice(from, 1))
    setOrder([...keys, ...order.filter((k) => !keys.includes(k))])
  }

  // Collapsing a task shuts its folders too, so it reopens as a short list.
  const toggleTask = (key: string) => {
    if (expanded.includes(key)) setOpenFolders((list) => list.filter((f) => f.split('/')[0] !== key))
    setExpanded((list) => toggled(list, key))
  }

  const taskRows = (list: Task[]) =>
    list.map((task) => (
      <TaskRow
        key={task.key}
        task={task}
        open={!!q || expanded.includes(task.key)}
        onToggle={() => toggleTask(task.key)}
        isOpen={(key) => !!q || openFolders.includes(key)}
        onToggleFolder={(key) => setOpenFolders((l) => toggled(l, key))}
        dropping={overTask === task.key}
        drag={{
          onStart: () => setDragTask(task.key),
          onOver: (e) => {
            if (!dragTask || dragTask === task.key) return
            e.preventDefault()
            setOverTask(task.key)
          },
          onDrop: () => reorder(task.key, list),
          onEnd: () => {
            setDragTask(null)
            setOverTask(null)
          },
        }}
      />
    ))

  const section = (id: string) => ({
    open: openSections.includes(id),
    onToggle: () => setOpenSections((l) => toggled(l, id)),
  })

  // One docs folder: its active tasks, its settled ones, its collections.
  const folderBody = (folder: DocsFolderInfo) => {
    const own = tasks.filter((t) => t.folder === folder.name)
    const active = sorted(own.filter((t) => t.status !== 'done'))
    const done = sorted(own.filter((t) => t.status === 'done'))
    const settled = section(`settled:${folder.name}`)
    return (
      <>
        {folder.problem && <div className="side-problem">{folder.problem}</div>}
        <div className="side-label">{folder.settle ? 'Active' : 'Tasks'}</div>
        {taskRows(active)}
        {!active.length && !folder.problem && (
          <div className="empty-note">{q ? 'nothing matches' : 'no tasks yet'}</div>
        )}
        {folder.settle && (
          <>
            <Fold label="Settled" {...settled} />
            {(settled.open || q) && taskRows(done)}
          </>
        )}
        {tree?.collections
          .filter((c) => c.folder === folder.name)
          .map((c) => {
            const docs = c.docs.filter((d) => !q || docHit(q)(d))
            const s = section(`collection:${folder.name}:${c.label}`)
            return (
              docs.length > 0 && (
                <div key={c.label}>
                  <Fold label={c.label} {...s} />
                  {(s.open || q) && docs.map((d) => <DocRow key={d.path} doc={d} />)}
                </div>
              )
            )
          })}
      </>
    )
  }

  return (
    <aside className="sidebar" style={{ width }}>
      <div className="side-head">
        <input
          ref={searchRef}
          className="input search"
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && e.currentTarget.blur()}
        />
        <button
          className="icon-btn"
          title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        <button className="icon-btn" title="Settings" onClick={() => setState({ settingsOpen: true })}>
          ⚙
        </button>
        <button className="icon-btn" title="Hide the sidebar" onClick={() => setCollapsed(true)}>
          ‹
        </button>
      </div>
      <div className="side-scroll">
        <SearchResults q={q} />
        {configProblem && (
          <div className="side-problem" title={configProblem}>
            The config file has an error, so the last good settings are in use. Open settings, or run{' '}
            <code>planner config check</code>.
          </div>
        )}
        {many
          ? folders.map((folder) => {
              const shut = closedFolders.includes(folder.name)
              return (
                <div className="docs-folder" key={folder.name}>
                  <div
                    className="docs-folder-head"
                    title={folder.root}
                    onClick={() => setClosedFolders((l) => toggled(l, folder.name))}
                  >
                    <Chevron dir={shut && !q ? 'right' : 'down'} className="chev" />
                    {folder.icon && <span className="task-icon">{folder.icon}</span>}
                    <span className="docs-folder-name">{folder.name}</span>
                    <span className="docs-folder-path">{folder.label}</span>
                  </div>
                  {(!shut || q) && folderBody(folder)}
                </div>
              )
            })
          : folders[0] && folderBody(folders[0])}
      </div>
      <div className="side-foot" title={folders.map((f) => f.root).join('\n')}>
        {many ? `${folders.length} docs folders` : folders[0]?.label}
      </div>
      <div
        className="side-resize"
        onMouseDown={(e) => {
          const startX = e.clientX
          const startW = width
          trackMouse(e, 'col-resize', (ev) => setWidth(Math.min(620, Math.max(200, startW + ev.clientX - startX))))
        }}
      />
    </aside>
  )
}
