# Phase 3 — Configurable folder conventions (Recap)

Folder conventions moved out of the code and into `~/.config/planner/config.json`.

## What landed

| Area               | Change                                                                  |
| ------------------ | ----------------------------------------------------------------------- |
| `shared/config.ts` | one schema and the defaults, used by server and browser                 |
| `server/scan.ts`   | reads the folder through the config; every doc knows its task and phase |
| `web/settings/`    | the settings page, with a live preview of what the rules find           |

## Verification

- [x] `npm test` — 28 passed
- [x] Old links still open the same plans
- [x] Hand edits to the config file apply without a restart

## Follow-ups

- Hotkeys in the same config file
- Per-task icons
