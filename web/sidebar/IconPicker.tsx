import { useEffect, useRef, useState } from 'react'

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

  useEffect(() => {
    const away = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onClose()
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('mousedown', away)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('mousedown', away)
      window.removeEventListener('keydown', esc)
    }
  }, [onClose])

  return (
    <div className="icon-picker" ref={ref} onClick={(e) => e.stopPropagation()}>
      <div className="icon-grid">
        {SUGGESTED.map((icon) => (
          <button
            key={icon}
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
          <button type="button" className="link-btn dim" onClick={() => onPick(null)}>
            remove
          </button>
        )}
      </form>
    </div>
  )
}
