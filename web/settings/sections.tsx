import { COLORS, type Config, type DocType } from '../../shared/config'
import { Field, ListEditor, Text, listText, textList } from './fields'

type Props = { draft: Config; set: (patch: Partial<Config>) => void }

export function FolderSection({ draft, set, runRoot }: Props & { runRoot?: string }) {
  const status = draft.statusFolders
  const hint =
    runRoot && runRoot !== draft.root
      ? `Absolute path; ~ is your home folder. This run reads ${runRoot}, given with --root.`
      : 'Absolute path; ~ is your home folder.'
  return (
    <section className="settings-section">
      <h3>Docs folder</h3>
      <Field label="Folder" hint={hint}>
        <Text value={draft.root ?? ''} onChange={(root) => set({ root })} placeholder="~/notes/plans" mono />
      </Field>

      <h3>How it is organised</h3>
      <label className="check">
        <input
          type="checkbox"
          checked={!!status}
          onChange={(e) => set({ statusFolders: e.target.checked ? { active: 'active', done: 'done' } : null })}
        />
        Tasks live in an "active" and a "done" folder (enables settle / restore)
      </label>
      {status && (
        <div className="field-row">
          <Field label="Active folder">
            <Text value={status.active} onChange={(active) => set({ statusFolders: { ...status, active } })} mono />
          </Field>
          <Field label="Done folder">
            <Text value={status.done} onChange={(done) => set({ statusFolders: { ...status, done } })} mono />
          </Field>
        </div>
      )}
      <Field label="Plans folder inside each task" hint="Leave empty if a task keeps its plans in its own folder.">
        <Text
          value={draft.plansFolder}
          onChange={(plansFolder) => set({ plansFolder })}
          placeholder="(the task folder)"
          mono
        />
      </Field>
      <Field
        label="Phase folder pattern"
        hint={
          <>
            A regular expression. <code>(?&lt;num&gt;…)</code> captures the phase number, <code>(?&lt;slug&gt;…)</code>{' '}
            the name. Other folders still show, after the numbered ones, if they hold something to read.
          </>
        }
      >
        <Text value={draft.phasePattern} onChange={(phasePattern) => set({ phasePattern })} mono />
      </Field>
      <Field
        label="File types"
        hint="Extensions to show. html and md render specially; others open as the browser shows them (pdf, txt, png…)."
      >
        <Text value={listText(draft.fileTypes)} onChange={(t) => set({ fileTypes: textList(t) })} mono />
      </Field>
    </section>
  )
}

export function DocTypesSection({ draft, set }: Props) {
  return (
    <section className="settings-section">
      <h3>Doc types</h3>
      <p className="section-hint">
        A file takes the first type whose name pattern matches (<code>*</code> matches anything). The order here is also
        the order docs are listed and opened in. Files matching none show as <em>doc</em>.
      </p>
      <ListEditor<DocType>
        ordered
        items={draft.docTypes}
        onChange={(docTypes) => set({ docTypes })}
        blank={() => ({ id: `type-${Date.now().toString(36)}`, label: 'new', match: '*.html', color: 'blue' })}
        addLabel="Add a doc type"
        row={(t, update) => (
          <>
            <span className="badge" data-color={t.color}>
              {t.label || '?'}
            </span>
            <input
              className="input"
              value={t.label}
              placeholder="badge"
              onChange={(e) => update({ ...t, label: e.target.value })}
            />
            <input
              className="input"
              data-mono
              value={t.match}
              placeholder="plan.html"
              onChange={(e) => update({ ...t, match: e.target.value })}
            />
            <select
              className="input"
              value={t.color}
              onChange={(e) => update({ ...t, color: e.target.value as typeof t.color })}
            >
              {COLORS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </>
        )}
      />
    </section>
  )
}

export function GroupsSection({ draft, set }: Props) {
  return (
    <section className="settings-section">
      <h3>Extra folders in a task</h3>
      <p className="section-hint">
        Folders inside each task that get their own section after the phases, like research notes.
      </p>
      <ListEditor<Config['groups'][number]>
        items={draft.groups}
        onChange={(groups) => set({ groups })}
        blank={() => ({ label: 'Notes', folder: 'notes' })}
        addLabel="Add a folder"
        row={(g, update) => (
          <>
            <input
              className="input"
              value={g.label}
              placeholder="label"
              onChange={(e) => update({ ...g, label: e.target.value })}
            />
            <input
              className="input"
              data-mono
              value={g.folder}
              placeholder="folder"
              onChange={(e) => update({ ...g, folder: e.target.value })}
            />
            <input
              className="input"
              data-mono
              value={listText(g.fileTypes)}
              placeholder="all file types"
              onChange={(e) =>
                update({ ...g, fileTypes: textList(e.target.value).length ? textList(e.target.value) : undefined })
              }
            />
          </>
        )}
      />
    </section>
  )
}

export function CollectionsSection({ draft, set }: Props) {
  return (
    <section className="settings-section">
      <h3>Collections</h3>
      <p className="section-hint">
        Docs outside any task, found by a path pattern under the docs folder, e.g. <code>weekly/*/*.html</code>. Each
        gets a section at the bottom of the sidebar.
      </p>
      <ListEditor<Config['collections'][number]>
        items={draft.collections}
        onChange={(collections) => set({ collections })}
        blank={() => ({ label: 'Notes', path: 'notes/*.md', newestFirst: true, notify: false })}
        addLabel="Add a collection"
        row={(c, update) => (
          <>
            <input
              className="input"
              value={c.label}
              placeholder="label"
              onChange={(e) => update({ ...c, label: e.target.value })}
            />
            <input
              className="input"
              data-mono
              value={c.path}
              placeholder="weekly/*/*.html"
              onChange={(e) => update({ ...c, path: e.target.value })}
            />
            <label className="check small" title="Newest first, otherwise by name">
              <input
                type="checkbox"
                checked={c.newestFirst}
                onChange={(e) => update({ ...c, newestFirst: e.target.checked })}
              />
              newest first
            </label>
            <label className="check small" title="Show a toast when a new one appears">
              <input type="checkbox" checked={c.notify} onChange={(e) => update({ ...c, notify: e.target.checked })} />
              notify
            </label>
          </>
        )}
      />
    </section>
  )
}

export function ServerSection({ draft, set, savedPort }: Props & { savedPort: number }) {
  return (
    <section className="settings-section">
      <h3>Server</h3>
      <Field
        label="Port"
        hint={draft.port !== savedPort ? 'Takes effect the next time the dashboard starts.' : undefined}
      >
        <input
          className="input narrow"
          type="number"
          value={draft.port}
          onChange={(e) => set({ port: Number(e.target.value) })}
        />
      </Field>
    </section>
  )
}
