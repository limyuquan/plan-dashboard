# Troubleshooting

Common problems and what to do about them.

## A folder shows no tasks

Planner is reading the folder with a layout that does not match it. Run `planner config check`: a folder with no tasks
says which key to look at.

- Tasks sit directly in the folder, not in `active/` and `done/`: set `"statusFolders": null` on that folder.
- A task keeps its plans in its own folder, not in `plans/`: set `"plansFolder": ""`.

The settings page shows the effect of each change before you save it. See [Docs folders](docs-folders.md).

## Phases show at the bottom, without numbers

Their folder names do not match the `phasePattern`. The settings preview and `planner config check` list them. Change
the pattern so `(?<num>…)` captures the number, for example `^(?<num>\d+)-(?<slug>.+)$` for `01-setup`.

## A file does not show up

Check its extension is in `fileTypes` (the preview lists the types it left out), and that its name does not start with
a dot. Files must sit directly in a phase folder, a task's plans folder, a group folder, or match a collection.

## "The config file has an error"

The config file has something Planner cannot use, so it keeps your last good settings. Run `planner config check` to see
what and where, fix it, and Planner applies it by itself.

## The port is in use

Another program, or another Planner, is on port 4173. Start this one with `--port 4174`, or set `"port"` in the
config.

## `planner open` opens a new tab every time

It reuses a tab only while one is open and connected. On macOS, bringing the tab to the front works for Google Chrome.

## Still stuck

[Open an issue](https://github.com/limyuquan/planner/issues/new/choose) with what you see and the output of
`planner config check`.
