import type { ReactNode } from 'react'
import { ChevronDown, ChevronUp, Plus, X } from '../icons'

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function Text(props: { value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <input
      className="input"
      data-mono={props.mono || undefined}
      value={props.value}
      placeholder={props.placeholder}
      spellCheck={false}
      onChange={(e) => props.onChange(e.target.value)}
    />
  )
}

// "html, md" <-> ['html', 'md']
export const listText = (list: string[] | undefined) => (list ?? []).join(', ')
export const textList = (text: string) =>
  text
    .split(/[,\s]+/)
    .map((s) => s.replace(/^\./, '').trim())
    .filter(Boolean)

// An editable list of rows: each row renders its own inputs, and the list adds
// move up / move down / remove buttons and an "add" button.
export function ListEditor<T>(props: {
  items: T[]
  onChange: (items: T[]) => void
  row: (item: T, update: (next: T) => void) => ReactNode
  blank: () => T
  addLabel: string
  ordered?: boolean
}) {
  const { items, onChange } = props
  const set = (i: number, next: T) => onChange(items.map((x, j) => (j === i ? next : x)))
  const move = (i: number, by: number) => {
    const next = [...items]
    next.splice(i + by, 0, ...next.splice(i, 1))
    onChange(next)
  }
  return (
    <div className="list-editor">
      {items.map((item, i) => (
        <div className="list-row" key={i}>
          {props.row(item, (next) => set(i, next))}
          <span className="list-acts">
            {props.ordered && (
              <>
                <button
                  type="button"
                  className="icon-btn sm"
                  title="Move up"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ChevronUp />
                </button>
                <button
                  type="button"
                  className="icon-btn sm"
                  title="Move down"
                  disabled={i === items.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ChevronDown />
                </button>
              </>
            )}
            <button
              type="button"
              className="icon-btn sm danger"
              title="Remove"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              <X />
            </button>
          </span>
        </div>
      ))}
      <button type="button" className="link-btn" onClick={() => onChange([...items, props.blank()])}>
        <Plus />
        {props.addLabel}
      </button>
    </div>
  )
}
