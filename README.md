# plan-dashboard

Read a folder of HTML and Markdown plans side by side, in split panes, and see new ones the moment they are written.

Built for working with coding agents that write plans, recaps and explainers as files: point it at the folder they
write into and keep it open next to your editor.

**[Website](https://limyuquan.github.io/plan-dashboard/)** · [Install](#quick-start) · [Agent skills](#agent-skills)

![plan-dashboard showing three plans of one phase side by side](docs/screenshot.png)

- **Split panes** like an editor: split any pane right or down, drag tabs between panes and onto any edge, resize
  freely.
- **Workspaces**: each phase of a task is a workspace. Opening one lays out all its plans at once, and your
  arrangement is remembered per phase.
- **Live**: new plans raise a notification, edited plans reload in place, and scroll positions are kept.
- **Linkable**: the address bar always names the plan on screen, so a link can be pasted into a chat or written into
  another plan — and `plan-dashboard open <link>` shows it in the tab you already have open.
- **Your folder layout**: folder names, phase naming and file types are settings, not code.

## Why I built this

I built this at work, for myself. Once coding agents were writing most of the code, writing code stopped being the slow
part of my day. Reviewing their plans was. Every task produced a plan, then an explainer, then a recap, spread across
folders, and I was skimming them in an editor tab, or not reading them at all. That is how you stop knowing what your
own codebase is turning into.

I wanted reviewing to be fast enough that I would actually do it, every time. So the agents write each plan as a
readable HTML page ([the skill they use](#agent-skills) is in this repo), the dashboard shows it the moment it lands,
and I read a whole phase side by side instead of opening files one at a time. It keeps me in the loop without slowing
the agents down.

## Quick start

Needs Node.js 20.19 or newer.

```sh
git clone https://github.com/limyuquan/plan-dashboard
cd plan-dashboard
npm install
npm run build
node dist/cli.js --root examples/demo-docs    # try it on the demo folder
```

Run it without `--root` to choose your own docs folder in the browser. `npm link` puts a `plan-dashboard` command on
your path.

## How your docs are read

By default the dashboard expects this layout, all of which can be changed in **Settings** (⚙):

```text
<docs folder>/
├── active/                       # tasks in progress   ┐ "status folders": settle / restore
├── done/                         # finished tasks      ┘ moves a task between them
│   └── <task>/
│       ├── plans/
│       │   ├── mother-plan.html  # task-level docs: the task's own workspace
│       │   ├── phase-1-setup/    # a phase: its own workspace
│       │   │   ├── plan.html
│       │   │   └── recap.md
│       │   └── phase-2-api/
│       └── research/             # an extra folder with its own section
```

- A **doc** is any file with a listed extension (`html` and `md` by default). HTML is shown as written; Markdown is
  rendered in the dashboard's theme. Other types (`pdf`, `txt`, images) can be added and show as the browser shows
  them.
- A doc's label in the sidebar is its `<title>`, or the first `#` heading of a Markdown file.
- **Doc types** give a doc a coloured badge by file name (`plan.html` → _plan_, `eli5*.html` → _eli5_, …). Their order
  is the order docs are listed and laid out in.
- **Phases** are folders matching the phase pattern, a regular expression with a `num` group
  (`^phase-(?<num>\d+[a-z]*)-(?<slug>.+)$`). `phase-1a-…` sorts after `phase-1-…` and before `phase-2-…`.
- **Collections** list docs outside any task by a path pattern, e.g. `weekly/*/*.html`.

The settings page previews what a change would find before you save it, including folders the phase pattern misses and
files left out.

![The settings page with a live preview of what the folder rules find](site/media/settings.jpg)

## Using it

<p align="center"><img src="docs/split.gif" alt="Dragging a tab onto a pane's lower edge splits only that pane; dividers resize; Option + arrow moves a tab between panes" width="880" /></p>

- Click a doc to open it in the focused pane; shift-click (or `⇥`) opens it in the next pane, splitting one off if
  needed.
- `ws` beside a task or phase makes it your workspace. On the workspace you are in it becomes `↺`, which lays it out
  again from its docs (with Undo).
- Drag a tab onto a pane's edge to split it there, onto its middle to move it in, or along a tab strip to reorder.
  The highlight shows exactly the space the tab will take.
- Pane buttons: chevrons move the shown tab to the neighbouring pane, `⊞` `⊟` split it off right or below, `×` closes
  the pane (with Undo).
- `settle` / `restore` move a task's folder between the status folders; open tabs follow it.
- `⧉` copies the absolute path of a file or folder.

<p align="center"><img src="docs/live.gif" alt="An agent writes a recap; a notification appears and opens it in place; a finished task is settled with Undo" width="880" /></p>

### Keyboard

| Keys                    | Does                                                                 |
| ----------------------- | -------------------------------------------------------------------- |
| `Ctrl`/`Option` + arrow | Move the shown tab one pane that way, splitting a new pane if needed |
| `Ctrl` + `1`…`9`        | Open the nth phase of the current task                               |
| Middle click on a tab   | Close it                                                             |

Shortcuts also work while a plan has focus.

## Links

The address bar always names what is on screen:

```text
?ws=<task>[/<folder>]&plan=<file>   # a doc in a workspace, by file name ("plan" finds plan.html, then plan.md)
?ws=<task>[/<folder>]               # just the workspace
?doc=<path>                         # any other file: relative to the docs folder, or an absolute path
```

Workspace names leave out the status folder, so links keep working after a task is settled.

`plan-dashboard open '<link>'` sends a link to the dashboard tab that is already open instead of opening another one
(and starts the dashboard if it is not running). On macOS it also brings that Chrome tab to the front. Agents can use
it to show you what they wrote.

Links inside a plan open as tabs: relative links, links to `/docs/...`, absolute paths on your machine that point into
the docs folder, and dashboard links. Links to other sites open in a browser tab.

### Theme hand-off for HTML docs

A doc is loaded with `?theme=dark|light`, and receives `{ type: 'plan-theme', theme }` by `postMessage` when the
dashboard's theme changes. A doc can post the same message to its parent to switch the dashboard.

## Agent skills

[`skills/`](skills) holds the two agent skills I use with the dashboard. Use them as they are, or as a starting point
for your own:

- [`visualise`](skills/visualise) has an agent turn a plan, a diff or a codebase into one self-contained HTML page in a
  consistent style: a plan before implementation, a recap after it, a codebase map, an explainer, an ELI5 picture page,
  or a review with selectable findings. [`render/GUIDE.md`](skills/visualise/render/GUIDE.md) is the full brief the
  writing agent follows, and [`render/base.html`](skills/visualise/render/base.html) shows every component once (open
  it in a browser).
- [`link-plan`](skills/link-plan) tells the agent to show you what it wrote with `plan-dashboard open`, instead of
  pasting a file path.

<p><img src="site/media/page-plan.jpg" alt="A plan page written by the visualise skill" width="49%" /> <img src="site/media/page-eli5.jpg" alt="An ELI5 page written by the visualise skill" width="49%" /></p>

The demo folder's `plan-dashboard-v1` task was written this way, about this project's own build.

They use the `SKILL.md` format that Claude Code and Codex read: copy a folder into your agent's skills directory (for
example `~/.claude/skills/`). Pages made with `visualise` follow the dashboard's light/dark switch through the theme
hand-off above.

## Command line

```text
plan-dashboard [--root <folder>] [--port <number>] [--config <file>] [--no-open]
plan-dashboard open <link>
```

Settings live in `~/.config/plan-dashboard/config.json` (or `$XDG_CONFIG_HOME`). The settings page writes it; you can
also edit it by hand and the dashboard picks up the change. `--root` and `--port` apply to one run only.

The server listens on `localhost` only.

## Development

```sh
npm run dev -- --root examples/demo-docs   # server + hot reload on http://localhost:4173
npm test
npm run lint
npm run typecheck
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for how the code is laid out.

## License

[MIT](LICENSE)
