# Working with agents

Planner is built to sit between you and your coding agents: they write plans as files, set Planner up, and show you
what they wrote. These docs are written for them as much as for you.

## Set Planner up with an agent

Give your agent the [`planner-setup`](skills.md#planner-setup) skill, then ask it to set Planner up. It finds the folders
your plans live in, works out how each one is organised, writes the config with `planner config add`, and runs
`planner config check` until every folder shows what is really there.

Without the skill, an agent can do the same from the [command line](command-line.md#config): every config change it
makes is checked, and `planner config check` exits non-zero until the config is right.

## Let agents show you their work

When an agent links you a plan, each link you click opens another browser tab. After a day of tasks that is one tab
per plan, and you lose track of which one is current. Instead, have agents run `planner open`:

```sh
planner open '?ws=my-task/phase-2-api&plan=plan'
```

The plan appears in the Planner tab you already have open, so tabs never pile up. If Planner is not running it starts,
and if no tab is open it opens one. The [`link-plan`](skills.md#link-plan) skill tells agents to do this every time,
how to build the link, and to put the same link in their message so you can reopen it later.

## Have agents write better plans

The [`visualise`](skills.md#visualise) skill has an agent write a plan, recap, codebase map, explainer, ELI5 page or
review as one self-contained HTML page in a consistent, readable style, saved where Planner picks it up.

## Docs for agents

- **Copy Markdown.** Every page of these docs has a **Copy Markdown** button that copies the page as Markdown, ready to paste into
  an agent. Agents can also fetch any page as Markdown by adding `.md` to its address, without the trailing slash.
- **llms.txt.** [`/llms.txt`](https://limyuquan.github.io/planner/llms.txt) is a short index of Planner for agents,
  and [`/llms-full.txt`](https://limyuquan.github.io/planner/llms-full.txt) is every page of these docs, every skill and
  the config schema in one file.
- **Schema.** The config's [JSON schema](https://raw.githubusercontent.com/limyuquan/planner/main/schema/config.schema.json)
  describes every key.
- **HTTP API.** A running Planner has a small [local API](http-api.md) for scripts and agents.
