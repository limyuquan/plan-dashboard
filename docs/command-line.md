# Command line

Everything the `planner` command does.

## planner

```text
planner [--root <folder>]... [--port <number>] [--config <file>] [--no-open]
```

Starts Planner and opens it in your browser.

| Option            | Does                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------ |
| `--root <folder>` | Read this docs folder for this run only, instead of the config's; repeat for several |
| `--port <number>` | Listen on this port for this run only (default `4173`)                               |
| `--config <file>` | Use this config file (default `~/.config/planner/config.json`)                       |
| `--no-open`       | Do not open a browser tab                                                            |
| `-h`, `--help`    | Show help                                                                            |

## planner open

```text
planner open <link>
```

Shows a [link](links.md) in the Planner tab you already have open. Starts Planner if it is not running, and opens a tab
if none is open. `<link>` is a full URL or just its query, like `'?ws=my-task&plan=plan'`.

## config

```text
planner config path            where the config file is
planner config show            print it
planner config add <folder>    add a docs folder; --name <name> to name it
planner config remove <name>   remove a docs folder
planner config check           validate, then print what each folder holds
planner config schema          the JSON schema, with a description of every key
```

- `add` checks the folder exists, names it after its last path segment unless you give `--name`, saves, and prints what
  the folder holds.
- `check` exits non-zero if the file has an error or a folder is missing. For a folder that finds no tasks, it says
  which layout key to look at.
- A running Planner picks up every change by itself.
