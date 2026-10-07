import { useRef, useState } from 'react'
import { useDismiss } from './useDismiss'

const SUGGESTED = [
  '📐',
  '🧭',
  '🚀',
  '🔎',
  '🧪',
  '🛠️',
  '📦',
  '🔒',
  '⚡',
  '🧹',
  '🐛',
  '📊',
  '🗺️',
  '🧩',
  '🌱',
  '🔥',
  '💡',
  '📝',
  '🎯',
  '🧱',
  '🔁',
  '🛰️',
  '🏗️',
  '🎨',
]

type Props = { current?: string; onPick: (icon: string | null) => void; onClose: () => void }

// A small panel of icons for a task: pick one, type any emoji, or remove it.
export function IconPicker({ current, onPick, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [typed, setTyped] = useState('')

  useDismiss(ref, onClose)

  return (
    <div className="icon-picker popover" ref={ref} onClick={(e) => e.stopPropagation()}>
      <div className="icon-grid">
        {SUGGESTED.map((icon) => (
          <button
            key={icon}
            type="button"
            className="icon-choice"
            data-cur={icon === current || undefined}
            onClick={() => onPick(icon)}
          >
            {icon}
          </button>
        ))}
      </div>
      <form
        className="icon-own"
        onSubmit={(e) => {
          e.preventDefault()
          if (typed.trim()) onPick(typed.trim())
        }}
      >
        <input
          className="input"
          placeholder="or any emoji"
          maxLength={8}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
        {current && (
          <button type="button" className="link-btn" onClick={() => onPick(null)}>
            Remove
          </button>
        )}
      </form>
    </div>
  )
}
