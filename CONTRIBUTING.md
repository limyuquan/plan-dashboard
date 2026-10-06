# Contributing

The best way to help is to [open an issue](https://github.com/limyuquan/planner/issues/new/choose): a bug you hit, a
folder layout Planner gets wrong, or something you wish it did. Issues are where changes get decided, and I would rather
build things after we agree on them.

Pull requests are still welcome, but please open an issue first so we can agree on the change before you spend time on
it. If you do send one, keep it small and focused, and run `npm run lint`, `npm run typecheck`, `npm test` and
`npm run e2e` (browser tests; `npx playwright install chromium` once first) first.

## How the code is laid out

```text
shared/          types and the config schema, used by both sides
  config.ts      settings: schema, defaults, file-name wildcards
  types.ts       the tree the server sends, and server events
server/          a small Node HTTP server, no framework
  cli.ts         command line: start, open <link>
  app.ts         the HTTP server: API routes, /docs/ files, the web app
  config.ts      loads, saves and watches the config file
  scan.ts        reads the docs folder into a tree through the config
  docs.ts        keeps the latest scan, watches files, pushes events
  routes/        one file per group of API routes
web/             the React app
  state/         a zustand store, and the actions that change it
  layout/        the pane layout: model.ts is a pure split tree, the rest renders it
  sidebar/       tasks, phases and docs
  viewer/        one doc in an iframe, and the bridge into it
  settings/      the settings page and first-run screen
  styles/        one stylesheet per area, tokens.css for colours
examples/        a demo docs folder, also used by the tests
docs/            the documentation, one Markdown page each; nav.json orders them
e2e/             browser tests (Playwright) against the built app
skills/          agent skills that write and show plans (not part of the app)
site/            the landing page; site/app is the live demo (npm run build:demo), and
                 build-docs.ts turns docs/ into the docs site (npm run build:docs)
```

Two rules keep it this way:

- The server works out where every doc belongs (task, phase, workspace) and sends it. The web app never parses paths.
- Layout changes go through the pure functions in `web/layout/model.ts`, which are unit tested. Components only call
  them.
