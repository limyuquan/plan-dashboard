# Tree and docs

Read everything Planner sees: every folder, task, phase and doc, one doc's details, or a doc's file.

## `GET /api/tree`

Every configured docs folder with its tasks, phases, groups and docs, plus collections, doc types and shortcuts. This
is what the sidebar is drawn from. Tasks come newest first.

```sh
curl -s http://localhost:4173/api/tree
```

### Response

<!-- include: shared/types.ts#TreeResponse -->

`tree` is `null` when no docs folder is configured yet. `configProblem` is set when the config file has an error and the
last good settings are in use.

### Example

Trimmed to one task:

```json
{
  "tree": {
    "folders": [{ "name": "plans", "root": "/home/you/plans", "label": "~/plans", "settle": true }],
    "tasks": [
      {
        "key": "plans:search-rewrite",
        "folder": "plans",
        "name": "search-rewrite",
        "label": "search rewrite",
        "status": "active",
        "dir": "plans/active/search-rewrite",
        "docs": [
          {
            "path": "plans/active/search-rewrite/plans/mother-plan.html",
            "file": "mother-plan.html",
            "kind": "overview",
            "title": "Search rewrite — overview",
            "ws": "plans:search-rewrite"
          }
        ],
        "phases": [
          {
            "key": "plans:search-rewrite/phase-2-query-api",
            "name": "phase-2-query-api",
            "label": "query api",
            "num": "2",
            "dir": "plans/active/search-rewrite/plans/phase-2-query-api",
            "docs": [
              {
                "path": "plans/active/search-rewrite/plans/phase-2-query-api/plan.md",
                "file": "plan.md",
                "kind": "md",
                "title": "Phase 2 — Query API",
                "ws": "plans:search-rewrite/phase-2-query-api"
              }
            ]
          }
        ],
        "groups": [
          {
            "key": "plans:search-rewrite/research",
            "name": "research",
            "label": "Research",
            "num": "",
            "dir": "plans/active/search-rewrite/research",
            "docs": [
              {
                "path": "plans/active/search-rewrite/research/benchmarks.html",
                "file": "benchmarks.html",
                "kind": "doc",
                "title": "Index benchmarks",
                "ws": "plans:search-rewrite/research"
              }
            ]
          }
        ],
        "mtime": 1791279512041.3
      }
    ],
    "collections": [],
    "kinds": [{ "id": "overview", "label": "overview", "color": "pink" }],
    "hotkeys": { "moveTabLeft": ["Ctrl+ArrowLeft", "Alt+ArrowLeft"] }
  }
}
```

### Recipes

The newest plan of every active task, with `jq`:

```sh
curl -s http://localhost:4173/api/tree |
  jq -r '.tree.tasks[] | select(.status == "active") | "\(.label): \([.phases[].docs[]] | last | .title)"'
```

## `GET /api/doc`

Describes one doc, found by its doc path or by an absolute path on the machine (through symlinks too). Use it to turn a
path an agent wrote into a doc, for example before [showing it](api-open-and-events.md#get-apiopen).

### Query

| Parameter | Required | Meaning                                                                 |
| --------- | -------- | ----------------------------------------------------------------------- |
| `path`    | yes      | A doc path (`plans/active/…`), or an absolute path inside a docs folder |

```sh
curl -s 'http://localhost:4173/api/doc?path=/home/you/plans/active/search-rewrite/plans/mother-plan.html'
```

### Response

A [`Doc`](http-api.md#data-shapes). `ws` is `""` for a file outside any task.

```json
{
  "path": "plans/active/search-rewrite/plans/mother-plan.html",
  "file": "mother-plan.html",
  "kind": "overview",
  "title": "Search rewrite — overview",
  "ws": "plans:search-rewrite"
}
```

### Errors

| Status | When                                                                         |
| ------ | ---------------------------------------------------------------------------- |
| `404`  | Not a file in a docs folder, or its type is not in that folder's `fileTypes` |

```json
{ "error": "plans/nope.md is not a document in the docs folders" }
```

## `GET /docs/<folder>/<path>`

The doc's file itself, at its doc path: what Planner's panes load. Markdown comes back rendered as a full HTML page;
everything else is sent as it is, with its content type.

### Query

| Parameter | Required | Meaning                                                          |
| --------- | -------- | ---------------------------------------------------------------- |
| `theme`   | no       | `dark` (default) or `light`: the colours Markdown is rendered in |

```sh
curl -s 'http://localhost:4173/docs/plans/active/search-rewrite/plans/phase-2-query-api/plan.md?theme=light'
```

Replies `404` with the text `Not found in the docs folders` for a path outside every docs folder.
