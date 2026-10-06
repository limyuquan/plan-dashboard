# Installation

Install Planner with one command, then point it at the folder your agents write plans into.

## Requirements

- Node.js 20.19 or newer
- macOS, Linux or Windows, and any modern browser

## Install

```sh
npm install -g https://github.com/limyuquan/planner/releases/latest/download/planner.tgz
```

This installs the `planner` command from the latest release. To update, run the same line again.

## Start it

```sh
planner
```

Planner starts on [http://localhost:4173](http://localhost:4173) and opens it in your browser. The first time, it asks
for your docs folder. You can also add folders from a terminal, or have your agent do it:

```sh
planner config add ~/code/my-app/docs/plans --name my-app
```

See [Docs folders](docs-folders.md) for how Planner reads a folder, and [Agents](agents.md) for letting an agent set it
up.

Planner only listens on `localhost`; nothing leaves your machine.

## Run from source

To try the demo folder, or to work on Planner itself:

```sh
git clone https://github.com/limyuquan/planner
cd planner
npm install
npm run build
node dist/cli.js --root examples/demo-docs
```

`npm run dev -- --root examples/demo-docs` runs it with hot reload instead.

## Uninstall

```sh
npm uninstall -g planner
```

Your settings stay in `~/.config/planner/` until you delete that folder.
