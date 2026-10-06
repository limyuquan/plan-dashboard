# Tasks

Settle a finished task, or restore it.

## `POST /api/move`

Moves a task's folder between its docs folder's two status folders: `to: "done"` settles an active task, `to: "active"`
restores a settled one. The folder really moves on disk; open tabs follow it, and links keep working because they leave
the status folder out.

Only for docs folders with `statusFolders`; see [Docs folders](docs-folders.md).

### Body

| Field  | Required | Meaning                                |
| ------ | -------- | -------------------------------------- |
| `task` | yes      | The task key, `<folder>:<task folder>` |
| `to`   | yes      | `"done"` or `"active"`                 |

```sh
curl -s -X POST http://localhost:4173/api/move \
  -H 'Content-Type: application/json' \
  -d '{"task": "plans:onboarding-flow", "to": "done"}'
```

### Response

The task's folder before and after, as doc paths:

```json
{ "from": "plans/active/onboarding-flow", "to": "plans/done/onboarding-flow" }
```

### Errors

| Status | When                                                         | Example body                                         |
| ------ | ------------------------------------------------------------ | ---------------------------------------------------- |
| `400`  | `to` is not `done` or `active`, or the task key is malformed | `{ "error": "bad task or destination" }`             |
| `400`  | The folder has no status folders                             | `{ "error": "that folder has no status folders" }`   |
| `403`  | Sent by a web page on another site                           | `{ "error": "not from the dashboard" }`              |
| `404`  | The task is not in the status folder it moves from           | `{ "error": "active/onboarding-flow not found" }`    |
| `409`  | A task with that name is already where it would go           | `{ "error": "done/onboarding-flow already exists" }` |
