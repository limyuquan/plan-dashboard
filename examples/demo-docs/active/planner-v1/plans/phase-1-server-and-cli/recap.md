# Phase 1 — Server and CLI (Recap)

The dashboard used to run only as a dev server inside its own repo. It now ships as a small Node server and a
`planner` command, with the same behaviour.

## What landed

| Area | Files | What it does |
|---|---|---|
| CLI | `server/cli.ts` | `planner` starts the server; `planner open <link>` shows a link in the tab you already have open |
| HTTP | `server/app.ts`, `server/http.ts` | plain `node:http`, one route table, the built web app or Vite in dev |
| Routes | `server/routes/*.ts` | tree, settle, docs, events, settings — one small file each |
| Live state | `server/docs.ts` | keeps the latest scan, watches files, pushes events |

## Decisions

- **No web framework.** Seven routes fit in a table; a framework would be most of the code.
- **One port in dev.** Vite runs in middleware mode on the same server, hot reload included.
- **`localhost` only**, and requests that change things must come from the dashboard's own origin.

## Verification

```sh
npm run build && node dist/cli.js --root examples/demo-docs
planner open '?ws=planner-v1/phase-2-split-tree-layout&plan=plan'
```

- [x] Production build serves the app and the docs
- [x] `open` reuses the open tab, and starts the server when it is down
- [x] Links from the old version keep working (`?ws=…&plan=…`, `?doc=…`)
