# Planner

Read the plans your coding agents write, side by side in split panes, live as they are written.

**[Website](https://limyuquan.github.io/planner/)** · **[Docs](https://limyuquan.github.io/planner/docs/)** ·
[Install](#install) · [llms.txt](https://limyuquan.github.io/planner/llms.txt)

![Planner showing three plans of one phase side by side](docs/screenshot.png)

Coding agents write their plans, explainers and recaps as files. Planner is a free, open-source web app that runs on
your machine, reads the folders they write into, and turns them into something you can actually review:

- **Split panes like an editor**: split any pane right or down, drag tabs onto any edge, resize freely.
- **Workspaces**: each phase of a task opens all its plans at once, and remembers your arrangement.
- **Live**: new plans raise a notification, edited plans reload in place.
- **Linkable**: every view has a link, and `planner open <link>` shows it in the tab you already have open.
- **Search inside plans**, not just their names.
- **Your folders, your rules**: read one or many docs folders, each organised its own way; folder layout, badges,
  icons and shortcuts are settings.
- **Built for agents**: agents can set Planner up, show you what they wrote, and read the docs as Markdown.

<p align="center"><img src="docs/split.gif" alt="Dragging a tab onto a pane's lower edge splits only that pane; dividers resize; Option + arrow moves a tab between panes" width="880" /></p>

## Why I built this

I built this at work, for myself. Once coding agents were writing most of the code, writing code stopped being the slow
part of my day. Reviewing their plans was. Every task produced a plan, then an explainer, then a recap, spread across
folders, and I was skimming them in an editor tab, or not reading them at all. When an agent did link me a plan, every
link opened another browser tab, one per plan, until I had dozens open and could not tell which one was current. That is
how you stop knowing what your own codebase is turning into.

I wanted reviewing to be fast enough that I would actually do it, every time. So the agents write each plan as a
readable page, Planner shows it the moment it lands, and I read a whole phase side by side instead of opening files one
at a time. Agents show me what they wrote with `planner open`, which puts the plan in the tab I already have open
instead of opening a new one. It keeps me in the loop without slowing the agents down.

<p align="center"><img src="docs/live.gif" alt="An agent writes a recap; a notification appears and opens it in place; a finished task is settled with Undo" width="880" /></p>

## Install

Needs Node.js 20.19 or newer.

```sh
npm install -g https://github.com/limyuquan/planner/releases/latest/download/planner.tgz
planner
```

Planner opens in your browser and asks for your docs folder. Or let your agent set it up with the
[`planner-setup`](skills/planner-setup) skill. See [Installation](https://limyuquan.github.io/planner/docs/installation/)
for more.

## Documentation

The full docs are at **[limyuquan.github.io/planner/docs](https://limyuquan.github.io/planner/docs/)**, and in
[`docs/`](docs) as Markdown. Every page has a **Copy Markdown** button for handing it to an agent.

| Getting started                                                        | Using Planner                                                                      | Reference                                                                    |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [Introduction](https://limyuquan.github.io/planner/docs/introduction/) | [Reading plans](https://limyuquan.github.io/planner/docs/reading-plans/)           | [Configuration](https://limyuquan.github.io/planner/docs/configuration/)     |
| [Installation](https://limyuquan.github.io/planner/docs/installation/) | [Keyboard shortcuts](https://limyuquan.github.io/planner/docs/keyboard-shortcuts/) | [Command line](https://limyuquan.github.io/planner/docs/command-line/)       |
| [Quick tour](https://limyuquan.github.io/planner/docs/quick-tour/)     | [Links](https://limyuquan.github.io/planner/docs/links/)                           | [HTTP API](https://limyuquan.github.io/planner/docs/http-api/)               |
| [Docs folders](https://limyuquan.github.io/planner/docs/docs-folders/) | [Working with agents](https://limyuquan.github.io/planner/docs/agents/)            | [Troubleshooting](https://limyuquan.github.io/planner/docs/troubleshooting/) |

## Agent skills

[`skills/`](skills) holds the agent skills I use with Planner, for Claude Code, Codex and other agents that read
`SKILL.md` folders:

- [`planner-setup`](skills/planner-setup): set Planner up for you, folder by folder, and check the result.
- [`link-plan`](skills/link-plan): show you a plan with `planner open` instead of pasting a file path.
- [`visualise`](skills/visualise): write plans, recaps, explainers and ELI5 pages as readable HTML.

See [Agent skills](https://limyuquan.github.io/planner/docs/skills/).

## Contributing

Found a bug or want something? [Open an issue](https://github.com/limyuquan/planner/issues/new/choose); that is the
preferred way to contribute. [CONTRIBUTING.md](CONTRIBUTING.md) has more, and how the code is laid out.

## License

[MIT](LICENSE)
