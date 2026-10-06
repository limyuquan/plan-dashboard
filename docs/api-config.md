# Config

Read and change Planner's settings, and try a change out before saving it. The [command line](command-line.md#config)
does the same from a terminal; this is for scripts and agents that prefer HTTP.

## `GET /api/config`

The settings saved in the config file, which flags this run was started with, and where the file is.

```sh
curl -s http://localhost:4173/api/config
```

### Response

```ts
type ConfigResponse = {
  // The whole saved config, defaults filled in. See Configuration for every key.
  config: Config
  // --root / --port given to this run; they override `config` but are never saved.
  overrides: { folders?: DocsFolder[]; port?: number }
  // The config file, ~ for the home folder.
  file: string
}
```

### Example

Trimmed:

```json
{
  "config": {
    "folders": [{ "name": "plans", "path": "~/plans" }],
    "port": 4173,
    "statusFolders": { "active": "active", "done": "done" },
    "plansFolder": "plans",
    "phasePattern": "^phase-(?<num>\\d+[a-z]*)-(?<slug>.+)$",
    "fileTypes": ["html", "md"]
  },
  "overrides": {},
  "file": "~/.config/planner/config.json"
}
```

## `PUT /api/config`

Checks a config and, if it is valid, saves it to the config file. Planner then rescans and every open tab updates.

The body is the **whole** config, not just the keys you change: read it with `GET /api/config`, change it, and send it
back. Every key is described in [Configuration](configuration.md) and in the
[JSON schema](https://raw.githubusercontent.com/limyuquan/planner/main/schema/config.schema.json).

```sh
curl -s http://localhost:4173/api/config |
  jq '.config | .folders += [{"name": "side", "path": "~/code/side/plans", "statusFolders": null, "plansFolder": ""}]' |
  curl -s -X PUT http://localhost:4173/api/config -H 'Content-Type: application/json' -d @-
```

### Response

```json
{ "ok": true }
```

### Errors

| Status | When                                                              |
| ------ | ----------------------------------------------------------------- |
| `400`  | The config is invalid, has no folders, or a folder does not exist |
| `403`  | Sent by a web page on another site                                |

`error` lists every problem, one per line, each starting with the key it is about:

```json
{ "error": "phasePattern: needs a (?<num>...) group\nfolders.1.path: ~/code/side/plans does not exist" }
```

## `POST /api/config/preview`

What a config would find in each folder, without saving it: the same check as the settings page's preview and
`planner config check`. Use it to try a layout until it matches the folders, then `PUT` it.

The body is a whole config, as for `PUT /api/config`.

```sh
curl -s http://localhost:4173/api/config | jq '.config' |
  curl -s -X POST http://localhost:4173/api/config/preview -H 'Content-Type: application/json' -d @-
```

### Response

<!-- include: shared/types.ts#Preview -->

<!-- include: shared/types.ts#FolderPreview -->

An invalid config is not an error here: it replies `200` with `ok: false`, the problems in `error`, and no folders.

### Example

```json
{
  "ok": true,
  "folders": [
    {
      "name": "plans",
      "label": "~/plans",
      "tasks": 4,
      "phases": 9,
      "docs": 18,
      "byKind": { "plan": 6, "md": 4, "eli5": 2, "recap": 3, "overview": 2, "doc": 1 },
      "unnumbered": [],
      "skipped": {}
    }
  ]
}
```

A folder with `0` tasks almost always needs a different `statusFolders` or `plansFolder`; see
[Troubleshooting](troubleshooting.md#a-folder-shows-no-tasks).
