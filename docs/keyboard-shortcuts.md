# Keyboard shortcuts

The default shortcuts, and how to change them.

## Defaults

| Keys                           | Action                    | Does                                                                 |
| ------------------------------ | ------------------------- | -------------------------------------------------------------------- |
| `Ctrl`/`Option` + arrow        | `moveTab…`                | Move the shown tab one pane that way, splitting a new pane if needed |
| `Option` + `Shift` + `→` / `←` | `nextTab`, `previousTab`  | Next / previous tab in the focused pane                              |
| `Option` + `W`                 | `closeTab`                | Close the shown tab                                                  |
| `Ctrl` + `1`…`9`               | `openPhase`               | Open the nth phase of the current task                               |
| `Option` + `B`                 | `toggleSidebar`           | Show or hide the sidebar                                             |
| `/`                            | `focusSearch`             | Jump to the search box                                               |
| _(unbound)_                    | `splitRight`, `splitDown` | Split the shown tab into a new pane right / below                    |
| Middle click on a tab          |                           | Close it                                                             |

Shortcuts also work while a plan has focus, but never while you type in a field. `Option` is there because macOS keeps
`Ctrl` + arrows for Mission Control.

## Change a shortcut

In **Settings** (the gear in the sidebar) → **Keyboard shortcuts**, click **Record** next to an action and press the keys.
`×` removes a combo, and **Reset** brings back the default.

Or edit `hotkeys` in the [config file](configuration.md): each action takes a list of combos.

```json
{
  "hotkeys": {
    "closeTab": ["Alt+Q"],
    "splitRight": ["Alt+\\"],
    "focusSearch": []
  }
}
```

- An action you leave out keeps its default; `[]` turns it off.
- Combos are modifiers and a key joined by `+`: `Ctrl`, `Alt` (Option on a Mac), `Shift`, `Meta` (Command), then a
  letter, digit, arrow (`ArrowLeft`), or a symbol like `/`, `[`, `\`.
- `openPhase` takes modifiers only, such as `"Ctrl"`; the digit 1–9 picks the phase.
- Keys match the physical key, not the character it types, so `Alt+W` works on macOS even though Option+W types `∑`.

## Actions

| Action                                                    | Does                                                                             |
| --------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `moveTabLeft`, `moveTabRight`, `moveTabUp`, `moveTabDown` | Move the shown tab to the next pane that way, splitting one off if there is none |
| `nextTab`, `previousTab`                                  | Show the next or previous tab in the focused pane                                |
| `closeTab`                                                | Close the shown tab                                                              |
| `splitRight`, `splitDown`                                 | Split the shown tab into a new pane                                              |
| `openPhase`                                               | Open phase 1–9 of the current task                                               |
| `toggleSidebar`                                           | Show or hide the sidebar                                                         |
| `focusSearch`                                             | Jump to the search box                                                           |
