import { useEffect, useState } from 'react'
import { FALLBACK_KIND, type Config } from '../../shared/config'
import type { Preview } from '../../shared/types'
import { api } from '../api'
import { setState } from '../state/store'
import { pushToast } from '../state/toasts'
import { CollectionsSection, DocTypesSection, FolderSection, GroupsSection, ServerSection } from './sections'

// How the draft config reads the docs folder, refreshed as you type. This is
// what makes the folder rules debuggable: you see what they match right away.
function PreviewPanel({ preview, draft }: { preview: Preview | null; draft: Config }) {
  if (!preview) return <aside className="preview">Reading…</aside>
  if (!preview.ok) return <aside className="preview preview-error">{preview.error}</aside>
  const skipped = Object.entries(preview.skipped)
  return (
    <aside className="preview">
      <h3>What this finds</h3>
      <div className="preview-counts">
        <span>
          <b>{preview.tasks}</b> tasks
        </span>
        <span>
          <b>{preview.phases}</b> phases
        </span>
        <span>
          <b>{preview.docs}</b> docs
        </span>
      </div>
      <ul className="preview-list">
        {Object.entries(preview.byKind).map(([kind, n]) => {
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
      {preview.unnumbered.length > 0 && (
        <>
          <h4>Folders not matching the phase pattern</h4>
          <ul className="preview-list mono">
            {preview.unnumbered.slice(0, 12).map((f) => (
              <li key={f}>{f}</li>
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
    </aside>
  )
}

export function Settings() {
  const [saved, setSaved] = useState<Config | null>(null)
  const [file, setFile] = useState('')
  const [runRoot, setRunRoot] = useState<string | undefined>()
  const [draft, setDraft] = useState<Config | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [error, setError] = useState('')
  const close = () => setState({ settingsOpen: false })

  useEffect(() => {
    api.config().then(({ config, overrides, file }) => {
      // A folder given with --root is the natural one to save when the file has none.
      const start = { ...config, root: config.root ?? overrides.root ?? null }
      setSaved(start)
      setDraft(start)
      setFile(file)
      setRunRoot(overrides.root ?? undefined)
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
            <FolderSection draft={draft} set={set} runRoot={runRoot} />
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
