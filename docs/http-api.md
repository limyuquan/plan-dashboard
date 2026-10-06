# HTTP API

What the command line and the web app use, for scripts and agents.

Planner listens on `http://localhost:4173` (or your `port`). Doc paths in requests and replies are
`<folder name>/<path inside it>`. Requests that change something must come from the Planner page itself (same origin).

| Request                        | Does                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| `GET /api/open?ws=&plan=&doc=` | Shows a [link](links.md) in the open Planner tab; replies `{ listeners }` (0: no tab heard it) |
| `GET /api/tree`                | Every folder, task, phase and doc, plus `configProblem` when the config file has an error      |
| `GET /api/doc?path=`           | Describes one doc, by doc path or absolute path                                                |
| `GET /api/search?q=`           | Docs whose title or text holds every word of `q`, best first, each with a snippet              |
| `GET /docs/<folder>/<path>`    | The file itself; Markdown comes back rendered as HTML (`?theme=dark` or `light`)               |
| `GET /api/events`              | Server-sent events: `tree`, `added` (a new doc), `changed` (a doc was edited), `open`          |
| `POST /api/move`               | `{ "task": "<folder>:<task>", "to": "done" or "active" }` settles or restores a task           |
| `GET /api/config`              | The saved config and the file's location                                                       |
| `PUT /api/config`              | Saves a whole config after checking it; `400` with the problems if it is invalid               |
| `POST /api/config/preview`     | What a draft config would find in each folder, without saving it                               |

For example, to see whether any doc mentions a topic:

```sh
curl -s 'http://localhost:4173/api/search?q=rate%20limit' | jq '.[].doc.title'
```
