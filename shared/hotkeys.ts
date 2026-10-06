// Keyboard shortcuts. Each action takes a list of combos like "Alt+W" or
// "Ctrl+ArrowLeft"; openPhase takes modifiers only ("Ctrl"), followed by 1-9.
//
// Keys are matched by the physical key, not the character it types, so
// "Alt+W" works on macOS, where Option+W types "∑".

export const HOTKEY_ACTIONS = {
  moveTabLeft: 'Move the shown tab to the pane on the left, splitting one off if there is none',
  moveTabRight: 'Move the shown tab to the pane on the right, splitting one off if there is none',
  moveTabUp: 'Move the shown tab to the pane above, splitting one off if there is none',
  moveTabDown: 'Move the shown tab to the pane below, splitting one off if there is none',
  nextTab: 'Show the next tab in the focused pane',
  previousTab: 'Show the previous tab in the focused pane',
  closeTab: 'Close the shown tab',
  splitRight: 'Split the shown tab into a new pane on the right',
  splitDown: 'Split the shown tab into a new pane below',
  openPhase: 'Open phase 1-9 of the current task: modifiers only, e.g. "Ctrl" for Ctrl+1',
  toggleSidebar: 'Show or hide the sidebar',
  focusSearch: 'Jump to the search box',
} as const

export type HotkeyAction = keyof typeof HOTKEY_ACTIONS
export type Hotkeys = Record<HotkeyAction, string[]>

export const DEFAULT_HOTKEYS: Hotkeys = {
  moveTabLeft: ['Ctrl+ArrowLeft', 'Alt+ArrowLeft'],
  moveTabRight: ['Ctrl+ArrowRight', 'Alt+ArrowRight'],
  moveTabUp: ['Ctrl+ArrowUp', 'Alt+ArrowUp'],
  moveTabDown: ['Ctrl+ArrowDown', 'Alt+ArrowDown'],
  nextTab: ['Alt+Shift+ArrowRight'],
  previousTab: ['Alt+Shift+ArrowLeft'],
  closeTab: ['Alt+W'],
  splitRight: [],
  splitDown: [],
  openPhase: ['Ctrl'],
  toggleSidebar: ['Alt+B'],
  focusSearch: ['/'],
}

const MODIFIERS = ['Ctrl', 'Alt', 'Shift', 'Meta'] as const

// Physical keys whose code is not the name people write.
const NAMED: Record<string, string> = {
  Slash: '/',
  Backslash: '\\',
  BracketLeft: '[',
  BracketRight: ']',
  Comma: ',',
  Period: '.',
  Semicolon: ';',
  Quote: "'",
  Backquote: '`',
  Minus: '-',
  Equal: '=',
}

type KeyEvent = Pick<KeyboardEvent, 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey' | 'key' | 'code'>

// The name of the key pressed: "W", "5", "ArrowLeft", "/", "Escape"...
function keyName(e: KeyEvent): string {
  if (/^Key[A-Z]$/.test(e.code)) return e.code.slice(3)
  if (/^Digit\d$/.test(e.code)) return e.code.slice(5)
  if (NAMED[e.code]) return NAMED[e.code]
  return e.code || e.key
}

const isModifier = (e: KeyEvent) => ['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)

type Combo = { mods: Set<string>; key: string | null }

function parse(combo: string): Combo {
  // "Ctrl++" style is not needed; a lone "+" is not a binding we offer.
  const parts = combo.split('+').filter(Boolean)
  const mods = new Set(parts.filter((p) => (MODIFIERS as readonly string[]).includes(p)))
  const key = parts.find((p) => !(MODIFIERS as readonly string[]).includes(p)) ?? null
  return { mods, key }
}

const sameMods = (mods: Set<string>, e: KeyEvent) =>
  mods.has('Ctrl') === e.ctrlKey &&
  mods.has('Alt') === e.altKey &&
  mods.has('Shift') === e.shiftKey &&
  mods.has('Meta') === e.metaKey

// Which action a key press triggers, if any; openPhase also says which phase.
export function actionFor(hotkeys: Hotkeys, e: KeyEvent): { action: HotkeyAction; n?: number } | null {
  if (isModifier(e)) return null
  const name = keyName(e).toLowerCase()
  for (const action of Object.keys(hotkeys) as HotkeyAction[]) {
    for (const combo of hotkeys[action]) {
      const { mods, key } = parse(combo)
      if (!sameMods(mods, e)) continue
      if (action === 'openPhase') {
        if (!key && /^[1-9]$/.test(name)) return { action, n: Number(name) }
        continue
      }
      if (key && key.toLowerCase() === name) return { action }
    }
  }
  return null
}

// The combo a key press makes, as the settings page records it. Null while
// only modifiers are held.
export function comboOf(e: KeyEvent): string | null {
  if (isModifier(e)) return null
  const mods = MODIFIERS.filter((m) => e[`${m === 'Ctrl' ? 'ctrl' : m.toLowerCase()}Key` as 'ctrlKey'])
  return [...mods, keyName(e)].join('+')
}

// The modifiers of a combo, for openPhase: "Ctrl+1" -> "Ctrl".
export const modifiersOf = (combo: string) => [...parse(combo).mods].join('+')

export const hotkeysOf = (given: Partial<Hotkeys> | undefined): Hotkeys => ({ ...DEFAULT_HOTKEYS, ...given })
