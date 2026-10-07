# Configuration

Every setting, where it lives, and how changes apply.

## The config file

Settings live in `~/.config/planner/config.json` (or `$XDG_CONFIG_HOME/planner/config.json`). The settings page,
`planner config` and you can all edit it.

- **Only the keys you change are needed.** Everything else is the default.
- **Changes apply by themselves.** A running Planner notices the file changed and rescans; never restart it.
- **Errors never wipe your setup.** A file with an error is not applied: Planner keeps the last good settings, shows a
  warning in the sidebar, and `planner config check` says what is wrong.
- **It has a schema.** The file names its [JSON schema](https://raw.githubusercontent.com/limyuquan/planner/main/schema/config.schema.json)
  in `$schema`, so editors and agents can check it as they write. `planner config schema` prints it.
- `--root` and `--port` on the command line apply to one run only and are never saved.

A typical file:

```json
{
  "$schema": "https://raw.githubusercontent.com/limyuquan/planner/main/schema/config.schema.json",
  "folders": [
    { "name": "work", "path": "~/code/work/.agents/docs", "icon": "🏢" },
    { "name": "side", "path": "~/code/side-project/plans", "statusFolders": null, "plansFolder": "" }
  ],
  "collections": [{ "label": "Weekly", "path": "weekly/*/*.html" }],
  "hotkeys": { "closeTab": ["Alt+Q"] },
  "taskIcons": { "work:search-rewrite": "🔎" }
}
```

## Reference

| Key             | Default                                         | Meaning                                                                                    |
| --------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `folders`       | `[]`                                            | Docs folders to read; see [below](#folders)                                                |
| `statusFolders` | `{"active":"active","done":"done"}`             | Folders holding active and finished tasks; `null` if tasks sit directly in the docs folder |
| `plansFolder`   | `"plans"`                                       | Folder inside each task holding its plans; `""` for the task folder itself                 |
| `phasePattern`  | `^phase-(?<num>\d+[a-z]*)-(?<slug>.+)$`         | Phase folder names; `(?<num>…)` is the phase number, `(?<slug>…)` its name                 |
| `fileTypes`     | `["html","md"]`                                 | Extensions to show, without the dot                                                        |
| `groups`        | Research → `research/`, HTML only               | Extra folders in each task with their own section; see [below](#groups)                    |
| `collections`   | `[]`                                            | Docs outside any task, by path pattern; see [below](#collections)                          |
| `docTypes`      | plan, eli5, recap, md, …                        | Badges by file name; see [below](#doc-types)                                               |
| `hotkeys`       | see [Keyboard shortcuts](keyboard-shortcuts.md) | Shortcuts by action; `[]` turns one off                                                    |
| `taskIcons`     | `{}`                                            | Icons for tasks, by `"<folder>:<task>"`                                                    |
| `port`          | `4173`                                          | Port to listen on                                                                          |

### folders

Each folder is `{ "name", "path" }`, with an optional `icon` and any layout key to override the shared one for that
folder only (`statusFolders`, `plansFolder`, `phasePattern`, `fileTypes`, `groups`, `collections`).

- `name`: lowercase letters, digits and dashes, unique. It shows in the sidebar and in links to the folder's docs.
- `path`: absolute, or starting with `~` for your home folder. It must exist.

### groups

Each group is `{ "label", "folder" }`, with an optional `fileTypes` list (default: `fileTypes`).

```json
{ "groups": [{ "label": "Research", "folder": "research", "fileTypes": ["html"] }] }
```

### collections

Each collection is `{ "label", "path" }`, where `path` is a pattern inside the docs folder (`*` matches one name). Also
`newestFirst` (default `true`; otherwise sorted by path) and `notify` (default `false`: no notification for new ones).

```json
{ "collections": [{ "label": "Weekly", "path": "weekly/*/*.html", "notify": false }] }
```

### doc types

Each type is `{ "id", "label", "match", "color" }`, with an optional `icon`. `match` is a file name pattern; `color` is
one of `grey`, `violet`, `blue`, `teal`, `green`, `amber`, `orange`, `pink`, `red`. The first match wins, and the order
is the reading order.

```json
{
  "docTypes": [
    { "id": "plan", "label": "plan", "match": "plan.html", "color": "violet", "icon": "📐" },
    { "id": "md", "label": "md", "match": "*.md", "color": "grey" }
  ]
}
```

Giving `docTypes` replaces the whole default list, so include every type you want.

### Icons

An icon is an emoji or a short symbol. Set them on doc types (shown in badges), on folders (shown in their sidebar
section), and on tasks with `taskIcons` or **Change icon…** in a task's **…** menu.

## Older config files

Config files from before Planner read several folders have a single `"root"`; it is read as one folder named after the
last part of its path, and links stay the same. Files in `~/.config/plan-dashboard/` are still used while there is no
`~/.config/planner/config.json`.
