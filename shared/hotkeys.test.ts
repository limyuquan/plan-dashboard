import { describe, expect, it } from 'vitest'
import { DEFAULT_HOTKEYS, actionFor, comboOf, hotkeysOf } from './hotkeys'

const press = (code: string, mods: Partial<Record<'ctrl' | 'alt' | 'shift' | 'meta', boolean>> = {}, key = code) => ({
  code,
  key,
  ctrlKey: !!mods.ctrl,
  altKey: !!mods.alt,
  shiftKey: !!mods.shift,
  metaKey: !!mods.meta,
})

describe('matching key presses', () => {
  it('matches by physical key, so Option + a letter works on macOS', () => {
    expect(actionFor(DEFAULT_HOTKEYS, press('KeyW', { alt: true }, '∑'))).toEqual({ action: 'closeTab' })
  })
  it('needs exactly the modifiers given', () => {
    expect(actionFor(DEFAULT_HOTKEYS, press('ArrowLeft', { alt: true }))).toEqual({ action: 'moveTabLeft' })
    expect(actionFor(DEFAULT_HOTKEYS, press('ArrowLeft', { alt: true, shift: true }))).toEqual({
      action: 'previousTab',
    })
    expect(actionFor(DEFAULT_HOTKEYS, press('ArrowLeft'))).toBeNull()
  })
  it('opens a phase by number after the openPhase modifiers', () => {
    expect(actionFor(DEFAULT_HOTKEYS, press('Digit3', { ctrl: true }))).toEqual({ action: 'openPhase', n: 3 })
    expect(actionFor(DEFAULT_HOTKEYS, press('Digit0', { ctrl: true }))).toBeNull()
  })
  it('uses the given bindings over the defaults, and [] turns an action off', () => {
    const keys = hotkeysOf({ closeTab: [], splitRight: ['Alt+\\'] })
    expect(actionFor(keys, press('KeyW', { alt: true }))).toBeNull()
    expect(actionFor(keys, press('Backslash', { alt: true }, '«'))).toEqual({ action: 'splitRight' })
  })
})

it('records a combo from a key press, ignoring modifiers held alone', () => {
  expect(comboOf(press('KeyK', { ctrl: true, shift: true }, 'K'))).toBe('Ctrl+Shift+K')
  expect(comboOf(press('ShiftLeft', { shift: true }, 'Shift'))).toBeNull()
})
