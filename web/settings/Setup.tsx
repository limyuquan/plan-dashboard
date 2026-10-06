import { useState } from 'react'
import { nameForPath } from '../../shared/config'
import { api } from '../api'
import { useStore } from '../state/store'
import { refresh } from '../state/tree'

// First run, or the docs folder has gone: ask where the docs are. Everything
// else starts from the defaults and can be changed in Settings later.
export function Setup() {
  const problem = useStore((s) => s.configProblem)
  const [root, setRoot] = useState('')
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { config } = await api.config()
      await api.saveConfig({ ...config, folders: [{ name: nameForPath(root.trim()), path: root.trim() }] })
      await refresh()
    } catch (err) {
      setError((err as Error).message.replace(/^folders[.\d]*path: /, ''))
    }
  }

  return (
    <div className="setup">
      <form className="setup-card" onSubmit={submit}>
        <h1>Where are your plans?</h1>
        <p>
          Pick the folder that holds your plan docs. By default the dashboard expects <code>active/</code> and{' '}
          <code>done/</code> folders of tasks, each with a <code>plans/</code> folder of <code>phase-1-…</code> folders;
          you can change all of that, and add more folders, in Settings afterwards.
        </p>
        {problem && <p className="form-error">{problem}</p>}
        <input
          className="input"
          data-mono
          autoFocus
          placeholder="~/notes/plans"
          value={root}
          onChange={(e) => setRoot(e.target.value)}
        />
        {error && <p className="form-error">{error}</p>}
        <button className="btn primary" disabled={!root.trim()}>
          Use this folder
        </button>
      </form>
    </div>
  )
}
