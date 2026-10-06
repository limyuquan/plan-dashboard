# API overview

A running Planner has a small local HTTP API, the same one its web app and command line use. Scripts and agents can
read every plan, search them, watch for new ones, show one to the user, settle tasks and change settings.

## Base URL

```text
http://localhost:4173
```

Or your configured `port`. Planner only listens on `localhost`, and there is no authentication: anything that can reach
the port can use the API.

## Endpoints

| Endpoint                                                         | Does                                              | Page                                      |
| ---------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------- |
| `GET /api/tree`                                                  | Every folder, task, phase and doc                 | [Tree and docs](api-tree-and-docs.md)     |
| `GET /api/doc`                                                   | Describe one doc, by doc path or absolute path    | [Tree and docs](api-tree-and-docs.md)     |
| `GET /docs/<folder>/<path>`                                      | A doc's file, with Markdown rendered as HTML      | [Tree and docs](api-tree-and-docs.md)     |
| `GET /api/search`                                                | Docs whose title or text holds every word         | [Search](api-search.md)                   |
| `GET /api/open`                                                  | Show a link in the user's open Planner tab        | [Open and events](api-open-and-events.md) |
| `GET /api/events`                                                | A live stream of new docs, edits and tree changes | [Open and events](api-open-and-events.md) |
| `POST /api/move`                                                 | Settle or restore a task                          | [Tasks](api-tasks.md)                     |
| `GET /api/config`, `PUT /api/config`, `POST /api/config/preview` | Read, save and dry-run the settings               | [Config](api-config.md)                   |

## Names you will see

Everything is named by its folder, so several docs folders never clash. A **docs folder name** is the `name` in the
config, such as `plans`.

| Name          | Form                        | Example                                                       |
| ------------- | --------------------------- | ------------------------------------------------------------- |
| Doc path      | `<folder>/<path inside it>` | `plans/active/search-rewrite/plans/phase-2-query-api/plan.md` |
| Task key      | `<folder>:<task folder>`    | `plans:search-rewrite`                                        |
| Workspace key | `<task key>[/<sub-folder>]` | `plans:search-rewrite/phase-2-query-api`                      |

A workspace is a task's own top-level plans, a phase, or a group such as `research/`. Every doc's `ws` is the
workspace it belongs to, or `""` for docs outside any task. [Links](links.md) use the same names but leave out the
first folder's name.

## Requests and responses

- Replies are JSON (`Content-Type: application/json`), except `/docs/…` files and the `/api/events` stream.
- Request bodies are JSON.
- Errors reply with a `4xx` status and `{ "error": "<what is wrong>" }`.
- `POST` and `PUT` requests must not carry an `Origin` header from another site: a browser page elsewhere gets
  `403 { "error": "not from the dashboard" }`. Scripts, `curl` and agents send no `Origin`, so they are fine.

## Data shapes

The types below are Planner's own, from
[`shared/types.ts`](https://github.com/limyuquan/planner/blob/main/shared/types.ts), and every response is one of them.

<!-- include: shared/types.ts -->

`SearchHit`, from [`shared/search.ts`](https://github.com/limyuquan/planner/blob/main/shared/search.ts):

<!-- include: shared/search.ts#SearchHit -->
