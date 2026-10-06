import { useEffect, useState } from 'react'
import { FALLBACK_KIND, type Config, type DocsFolder } from '../../shared/config'
import type { FolderPreview, Preview } from '../../shared/types'
import { api } from '../api'
import { setState } from '../state/store'
import { pushToast } from '../state/toasts'
import { CollectionsSection, DocTypesSection, FoldersSection, GroupsSection, ServerSection } from './sections'

// What one folder's rules find.
function FolderFinds({ f, draft, many }: { f: FolderPreview; draft: Config; many: boolean }) {
  const skipped = Object.entries(f.skipped)
  return (
    <div className="preview-folder">
      {many && (
        <h4 className="preview-folder-name">
          {f.name} <span>{f.label}</span>
        </h4>
      )}
      {f.problem ? (
        <p className="preview-error">{f.problem}</p>
      ) : (
        <>
          <div className="preview-counts">
            <span>
              <b>{f.tasks}</b> tasks
            </span>
            <span>
              <b>{f.phases}</b> phases
            </span>
            <span>
              <b>{f.docs}</b> docs
            </span>
          </div>
          <ul className="preview-list">
            {Object.entries(f.byKind).map(([kind, n]) => {
              const type = draft.docTypes.find((t) => t.id === kind) ?? FALLBACK_KIND
              return (
                <li key={kind}>
                  {n} ×{' '}
                  <span className="badge" data-color={type.color}>
                    {type.label}
                  </span>
                </li>
              )
            })}
          </ul>
          {f.unnumbered.length > 0 && (
            <>
              <h4>Folders not matching the phase pattern</h4>
              <ul className="preview-list mono">
                {f.unnumbered.slice(0, 12).map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </>
          )}
          {skipped.length > 0 && (
            <>
              <h4>Files left out (type not listed)</h4>
              <ul className="preview-list mono">
                {skipped.map(([ext, n]) => (
                  <li key={ext}>
                    {n} × .{ext}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  )
}

// How the draft config reads its folders, refreshed as you type. This is what
// makes the folder rules debuggable: you see what they match right away.
function PreviewPanel({ preview, draft }: { preview: Preview | null; draft: Config }) {
  if (!preview) return <aside className="preview">Reading…</aside>
  if (!preview.ok) return <aside className="preview preview-error">{preview.error}</aside>
  return (
    <aside className="preview">
      <h3>What this finds</h3>
      {preview.folders.map((f) => (
        <FolderFinds key={f.name} f={f} draft={draft} many={preview.folders.length > 1} />
      ))}
    </aside>
  )
}

export function Settings() {
  const [saved, setSaved] = useState<Config | null>(null)
  const [file, setFile] = useState('')
  const [runFolders, setRunFolders] = useState<DocsFolder[] | undefined>()
  const [draft, setDraft] = useState<Config | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [error, setError] = useState('')
  const close = () => setState({ settingsOpen: false })

  useEffect(() => {
    api.config().then(({ config, overrides, file }) => {
      // Folders given with --root are the natural ones to save when the file has none.
      const start = { ...config, folders: config.folders.length ? config.folders : (overrides.folders ?? []) }
      setSaved(start)
      setDraft(start)
      setFile(file)
      setRunFolders(overrides.folders)
    })
  }, [])

  useEffect(() => {
    if (!draft) return
    const timer = setTimeout(() => api.preview(draft).then(setPreview), 300)
    return () => clearTimeout(timer)
  }, [draft])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!draft || !saved) return null
  const set = (patch: Partial<Config>) => setDraft({ ...draft, ...patch })
  const save = async () => {
    try {
      await api.saveConfig(draft)
      close()
      pushToast({ text: 'Settings saved' })
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="modal settings">
        <header className="modal-head">
          <h2>Settings</h2>
          <span className="modal-file" title="Where these are saved; you can edit it by hand too">
            {file}
          </span>
          <button className="icon-btn" title="Close" onClick={close}>
            ×
          </button>
        </header>
        <div className="settings-body">
          <div className="settings-form">
            <FoldersSection draft={draft} set={set} runFolders={runFolders} />
            <DocTypesSection draft={draft} set={set} />
            <GroupsSection draft={draft} set={set} />
            <CollectionsSection draft={draft} set={set} />
            <ServerSection draft={draft} set={set} savedPort={saved.port} />
          </div>
          <PreviewPanel preview={preview} draft={draft} />
        </div>
        <footer className="modal-foot">
          {error && <span className="form-error">{error}</span>}
          <button className="btn" onClick={close}>
            Cancel
          </button>
          <button className="btn primary" disabled={preview?.ok === false} onClick={save}>
            Save
          </button>
        </footer>
      </div>
    </div>
  )
}
