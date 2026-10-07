import { useEffect, useState } from 'react'
import type { Config } from '../../shared/config'
import {
  DEFAULT_HOTKEYS,
  HOTKEY_ACTIONS,
  comboOf,
  hotkeysOf,
  modifiersOf,
  type HotkeyAction,
} from '../../shared/hotkeys'
import { Keyboard, Plus, X } from '../icons'

const LABELS: Record<HotkeyAction, string> = {
  moveTabLeft: 'Move tab left',
  moveTabRight: 'Move tab right',
  moveTabUp: 'Move tab up',
  moveTabDown: 'Move tab down',
  nextTab: 'Next tab',
  previousTab: 'Previous tab',
  closeTab: 'Close tab',
  splitRight: 'Split right',
  splitDown: 'Split down',
  openPhase: 'Open phase 1–9',
  toggleSidebar: 'Show / hide sidebar',
  focusSearch: 'Search',
}

const shown = (action: HotkeyAction, combo: string) =>
  (action === 'openPhase' ? `${combo}+1…9` : combo).split('+').join(' + ')

type Props = { draft: Config; set: (patch: Partial<Config>) => void }

// Shortcuts by action. "Record" takes the next key press; Escape cancels.
export function HotkeysSection({ draft, set }: Props) {
  const keys = hotkeysOf(draft.hotkeys)
  const [recording, setRecording] = useState<HotkeyAction | null>(null)
  const setAction = (action: HotkeyAction, combos: string[] | undefined) => {
    const next = { ...draft.hotkeys, [action]: combos }
    if (combos === undefined) delete next[action]
    set({ hotkeys: next })
  }

  useEffect(() => {
    if (!recording) return
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') return setRecording(null)
      const combo = comboOf(e)
      if (!combo) return
      // openPhase is modifiers only; the digit says which phase.
      const value = recording === 'openPhase' ? modifiersOf(combo) : combo
      if (!value) return
      if (!keys[recording].includes(value)) setAction(recording, [...keys[recording], value])
      setRecording(null)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

  return (
    <section className="settings-section" id="hotkeys">
      <h3>Keyboard shortcuts</h3>
      <p className="section-hint">They also work while a plan has the focus, but not while you type in a field.</p>
      <div className="hotkeys">
        {(Object.keys(HOTKEY_ACTIONS) as HotkeyAction[]).map((action) => {
          const changed = JSON.stringify(keys[action]) !== JSON.stringify(DEFAULT_HOTKEYS[action])
          return (
            <div className="hotkey-row" key={action} title={HOTKEY_ACTIONS[action]}>
              <span className="hotkey-label">{LABELS[action]}</span>
              <span className="hotkey-combos">
                {keys[action].map((combo) => (
                  <span className="hotkey" key={combo}>
                    <kbd>{shown(action, combo)}</kbd>
                    <button
                      type="button"
                      className="icon-btn sm"
                      title="Remove"
                      onClick={() =>
                        setAction(
                          action,
                          keys[action].filter((c) => c !== combo),
                        )
                      }
                    >
                      <X />
                    </button>
                  </span>
                ))}
                {!keys[action].length && <span className="hotkey-none">None</span>}
              </span>
              <span className="hotkey-acts">
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => setRecording(recording === action ? null : action)}
                >
                  {recording === action ? (
                    <>
                      <Keyboard />
                      Press keys… Esc cancels
                    </>
                  ) : (
                    <>
                      <Plus />
                      Record
                    </>
                  )}
                </button>
                {changed && (
                  <button type="button" className="link-btn" onClick={() => setAction(action, undefined)}>
                    Reset
                  </button>
                )}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
