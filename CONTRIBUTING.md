# Contributing

Issues and pull requests are welcome. Please keep changes small and focused, and run `npm run lint`, `npm run typecheck`,
`npm test` and `npm run e2e` (browser tests; `npx playwright install chromium` once first) before opening a pull request.

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
e2e/             browser tests (Playwright) against the built app
skills/          agent skills that write and show plans (not part of the app)
site/            the landing page; site/app builds the web app with an in-memory backend
                 for its live demo (npm run build:demo)
```

Two rules keep it this way:

- The server works out where every doc belongs (task, phase, workspace) and sends it. The web app never parses paths.
- Layout changes go through the pure functions in `web/layout/model.ts`, which are unit tested. Components only call
  them.
